-- Candados en viajes + calificaciones de conductor.
-- Requiere 013, 014 y 015.
--  * El conductor/pasajero no puede tocar el estado de pago del viaje (solo Mercado Pago / admin).
--  * Solo conductores con documentos aprobados pueden aceptar viajes.
--  * El pasajero califica al conductor (1-5) con rate_ride(); el promedio se guarda en profiles.rating.

-- 1) Perfil: mismo candado que 015 + bypass interno para funciones de confianza (rate_ride)
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  earned numeric;
  fee numeric;
begin
  if auth.uid() is null
     or public.is_admin()
     or coalesce(current_setting('inride.trusted', true), '') = 'on' then
    return new;
  end if;
  if not ('admin' = any (old.roles)) then
    new.roles := array_remove(new.roles, 'admin'::public.user_role);
    if coalesce(array_length(new.roles, 1), 0) = 0 then
      new.roles := old.roles;
    end if;
  end if;
  if not (new.active_role = any (new.roles)) then
    new.active_role := old.active_role;
  end if;
  new.rating := old.rating;
  new.total_trips := old.total_trips;

  if old.birthdate is not null then
    new.birthdate := old.birthdate;
  elsif new.birthdate is not null and new.birthdate > (current_date - interval '18 years')::date then
    raise exception 'Debes ser mayor de 18 años para usar inride.' using errcode = 'check_violation';
  end if;

  if new.block_fee_satisfied is distinct from old.block_fee_satisfied then
    select coalesce(sum(r.driver_net), 0) into earned
    from public.rides r
    where r.driver_id = old.id and r.status = 'completed';
    select coalesce(t.system_block_fee, 300) into fee
    from public.tariffs t
    where t.active
    limit 1;
    if not (new.block_fee_satisfied and earned >= coalesce(fee, 300)) then
      new.block_fee_satisfied := old.block_fee_satisfied;
      new.block_fee_satisfied_at := old.block_fee_satisfied_at;
    end if;
  elsif new.block_fee_satisfied_at is distinct from old.block_fee_satisfied_at then
    new.block_fee_satisfied_at := old.block_fee_satisfied_at;
  end if;

  return new;
end;
$$;

-- 2) Viajes
create or replace function public.guard_ride_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or public.is_admin()
     or coalesce(current_setting('inride.trusted', true), '') = 'on' then
    return new;
  end if;

  -- Pago: solo Mercado Pago (webhook con service_role) o un admin
  new.payment_method := old.payment_method;
  new.payment_status := old.payment_status;
  new.mp_preference_id := old.mp_preference_id;
  new.mp_payment_id := old.mp_payment_id;
  new.paid_at := old.paid_at;

  -- Calificación: solo con rate_ride()
  new.rating := old.rating;
  new.comment := old.comment;

  new.passenger_id := old.passenger_id;

  if new.driver_id is distinct from old.driver_id then
    if old.driver_id is not null or new.driver_id is distinct from auth.uid() or old.status <> 'searching' then
      raise exception 'No puedes cambiar el conductor de este viaje.' using errcode = 'insufficient_privilege';
    end if;
    if not exists (
      select 1 from public.driver_documents d
      where d.user_id = auth.uid() and d.review_status = 'approved'
    ) then
      raise exception 'Tu documentación está en revisión. Podrás aceptar viajes cuando sea aprobada.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Un viaje terminado o cancelado ya no cambia de estado
  if old.status in ('completed', 'cancelled') and new.status is distinct from old.status then
    new.status := old.status;
  end if;

  return new;
end;
$$;

drop trigger if exists rides_guard_changes on public.rides;
create trigger rides_guard_changes
  before update on public.rides
  for each row execute function public.guard_ride_changes();

-- 3) Pagos: el pasajero ya no puede editar sus registros de pago
drop policy if exists payments_update_service on public.payments;
create policy payments_update_service on public.payments
  for update using (public.is_admin());

-- 4) Calificar al conductor
create or replace function public.rate_ride(p_ride_id uuid, p_stars integer, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides%rowtype;
begin
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'La calificación debe ser de 1 a 5 estrellas.';
  end if;

  select * into v_ride from public.rides where id = p_ride_id;
  if not found or v_ride.passenger_id is distinct from auth.uid() then
    raise exception 'Viaje no encontrado.';
  end if;
  if v_ride.status <> 'completed' then
    raise exception 'Solo puedes calificar viajes terminados.';
  end if;
  if v_ride.rating is not null then
    raise exception 'Ya calificaste este viaje.';
  end if;

  perform set_config('inride.trusted', 'on', true);

  update public.rides
  set rating = p_stars,
      comment = nullif(left(trim(coalesce(p_comment, '')), 500), '')
  where id = p_ride_id;

  if v_ride.driver_id is not null then
    update public.profiles p
    set rating = coalesce((
      select round(avg(r.rating)::numeric, 2)
      from public.rides r
      where r.driver_id = v_ride.driver_id and r.rating is not null
    ), p.rating)
    where p.id = v_ride.driver_id;
  end if;

  perform set_config('inride.trusted', 'off', true);
end;
$$;

revoke all on function public.rate_ride(uuid, integer, text) from public;
grant execute on function public.rate_ride(uuid, integer, text) to authenticated;
