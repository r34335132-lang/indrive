-- Depósito del conductor (bloque de sistema) pagado con Mercado Pago.
-- Requiere 013 y 014 (redefine guard_profile_privileges agregando el candado del depósito).

create table if not exists public.driver_deposits (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'MXN',
  status public.payment_status not null default 'pending',
  mp_preference_id text,
  mp_payment_id text,
  mp_status_detail text,
  raw jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists driver_deposits_driver_idx on public.driver_deposits (driver_id);
create index if not exists driver_deposits_mp_payment_idx on public.driver_deposits (mp_payment_id);

drop trigger if exists driver_deposits_updated_at on public.driver_deposits;
create trigger driver_deposits_updated_at before update on public.driver_deposits
for each row execute function public.set_updated_at();

-- Solo lectura desde la app; las Edge Functions (service_role) escriben.
alter table public.driver_deposits enable row level security;

drop policy if exists driver_deposits_select_own on public.driver_deposits;
create policy driver_deposits_select_own on public.driver_deposits
  for select using (driver_id = auth.uid() or public.is_admin());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'driver_deposits'
  ) then
    alter publication supabase_realtime add table public.driver_deposits;
  end if;
end $$;

-- El conductor ya no puede marcarse el depósito como pagado por su cuenta:
-- solo Mercado Pago (webhook), un admin, o si sus ganancias ya cubren el bloque.
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
  if auth.uid() is null or public.is_admin() then
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
