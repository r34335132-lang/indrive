-- Bloque de sistema DIARIO. Requiere 015, 016 y 017.
--  * Cada día (hora de La Laguna / Durango) el conductor trabaja libre.
--  * Cuando sus ganancias del día llegan al bloque (tariffs.system_block_fee) se genera el
--    bloque de ese día como pendiente y en la app le aparece el botón para pagarlo.
--  * Se cubre con Mercado Pago, con su saldo de viajes con tarjeta o un admin lo marca pagado.
--  * Si un bloque de un día anterior sigue pendiente, no puede aceptar viajes nuevos.
--  * profiles.block_fee_satisfied (pago único) ya no se usa.

create or replace function public.inride_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Monterrey')::date;
$$;

create table if not exists public.driver_daily_blocks (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  amount numeric(10,2) not null check (amount > 0),
  earned numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'waived')),
  method text check (method in ('mercadopago', 'balance', 'admin')),
  deposit_id uuid references public.driver_deposits (id) on delete set null,
  payout_id uuid references public.driver_payouts (id) on delete set null,
  note text,
  paid_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (driver_id, day)
);

create index if not exists driver_daily_blocks_pending_idx
  on public.driver_daily_blocks (driver_id, day)
  where status = 'pending';

drop trigger if exists driver_daily_blocks_updated_at on public.driver_daily_blocks;
create trigger driver_daily_blocks_updated_at before update on public.driver_daily_blocks
for each row execute function public.set_updated_at();

alter table public.driver_daily_blocks enable row level security;

drop policy if exists daily_blocks_select on public.driver_daily_blocks;
create policy daily_blocks_select on public.driver_daily_blocks
  for select using (driver_id = auth.uid() or public.is_admin());

drop policy if exists daily_blocks_admin_update on public.driver_daily_blocks;
create policy daily_blocks_admin_update on public.driver_daily_blocks
  for update using (public.is_admin()) with check (public.is_admin());

alter table public.driver_deposits
  add column if not exists block_id uuid references public.driver_daily_blocks (id) on delete set null;

alter table public.driver_payouts
  add column if not exists kind text not null default 'transfer';
alter table public.driver_payouts drop constraint if exists driver_payouts_kind_check;
alter table public.driver_payouts
  add constraint driver_payouts_kind_check check (kind in ('transfer', 'block_fee'));

-- Genera el bloque del día cuando las ganancias del conductor llegan al monto del bloque.
create or replace function public.ensure_daily_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date;
  v_fee numeric;
  v_earned numeric;
begin
  if new.status <> 'completed' or new.driver_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'completed' then
    return new;
  end if;

  -- Viajes de días pasados cerrados a mano (scripts/admin) no generan bloques atrasados.
  v_day := (coalesce(new.completed_at, now()) at time zone 'America/Monterrey')::date;
  if v_day <> public.inride_today() then
    return new;
  end if;

  select t.system_block_fee into v_fee from public.tariffs t where t.active limit 1;
  v_fee := coalesce(v_fee, 300);
  if v_fee <= 0 then
    return new;
  end if;

  select coalesce(sum(r.driver_net), 0) into v_earned
  from public.rides r
  where r.driver_id = new.driver_id
    and r.status = 'completed'
    and (coalesce(r.completed_at, r.updated_at) at time zone 'America/Monterrey')::date = v_day;

  if v_earned >= v_fee then
    insert into public.driver_daily_blocks (driver_id, day, amount, earned)
    values (new.driver_id, v_day, v_fee, v_earned)
    on conflict (driver_id, day) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists rides_daily_block on public.rides;
create trigger rides_daily_block
  after insert or update of status on public.rides
  for each row execute function public.ensure_daily_block();

-- Mismo candado que 016 + no aceptar viajes con bloques de días anteriores sin pagar.
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

  new.payment_method := old.payment_method;
  new.payment_status := old.payment_status;
  new.mp_preference_id := old.mp_preference_id;
  new.mp_payment_id := old.mp_payment_id;
  new.paid_at := old.paid_at;

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
    if exists (
      select 1 from public.driver_daily_blocks b
      where b.driver_id = auth.uid() and b.status = 'pending' and b.day < public.inride_today()
    ) then
      raise exception 'Tienes un bloque de sistema pendiente. Págalo para seguir recibiendo viajes.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if old.status in ('completed', 'cancelled') and new.status is distinct from old.status then
    new.status := old.status;
  end if;

  return new;
end;
$$;

-- Pagar el bloque con el saldo de viajes con tarjeta (se registra como descuento en driver_payouts).
create or replace function public.pay_daily_block_with_balance(p_block_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_block public.driver_daily_blocks%rowtype;
  v_balance numeric;
  v_payout uuid;
begin
  -- Serializa pagos del mismo conductor para que no gaste el mismo saldo dos veces.
  perform 1 from public.profiles where id = auth.uid() for update;

  select * into v_block from public.driver_daily_blocks where id = p_block_id for update;
  if not found or v_block.driver_id is distinct from auth.uid() then
    raise exception 'Bloque no encontrado.';
  end if;
  if v_block.status <> 'pending' then
    raise exception 'Este bloque ya está cubierto.';
  end if;

  select b.balance into v_balance from public.my_payout_balance() b;
  if coalesce(v_balance, 0) + 0.001 < v_block.amount then
    raise exception 'Tu saldo de viajes con tarjeta no alcanza para cubrir el bloque.';
  end if;

  insert into public.driver_payouts (driver_id, amount, kind, note, created_by)
  values (
    auth.uid(),
    v_block.amount,
    'block_fee',
    'Bloque de sistema del ' || to_char(v_block.day, 'DD/MM/YYYY'),
    auth.uid()
  )
  returning id into v_payout;

  update public.driver_daily_blocks
  set status = 'paid', method = 'balance', payout_id = v_payout, paid_at = now()
  where id = p_block_id;
end;
$$;

revoke all on function public.pay_daily_block_with_balance(uuid) from public;
grant execute on function public.pay_daily_block_with_balance(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'driver_daily_blocks'
  ) then
    alter publication supabase_realtime add table public.driver_daily_blocks;
  end if;
end $$;
