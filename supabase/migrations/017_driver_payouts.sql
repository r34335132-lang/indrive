-- Cuenta CLABE del conductor + transferencias que le hace inride por viajes pagados con tarjeta.
-- Solo el propio conductor y los admins pueden ver la cuenta.

create or replace function public.is_valid_clabe(p text)
returns boolean
language plpgsql
immutable
as $$
declare
  weights int[] := array[3, 7, 1];
  total int := 0;
  i int;
begin
  if p is null or p !~ '^[0-9]{18}$' then
    return false;
  end if;
  for i in 1..17 loop
    total := total + ((substr(p, i, 1)::int * weights[((i - 1) % 3) + 1]) % 10);
  end loop;
  return ((10 - (total % 10)) % 10) = substr(p, 18, 1)::int;
end;
$$;

create table if not exists public.driver_payout_accounts (
  driver_id uuid primary key references public.profiles (id) on delete cascade,
  holder_name text not null check (length(trim(holder_name)) >= 3),
  bank_name text not null check (length(trim(bank_name)) >= 2),
  clabe text not null check (public.is_valid_clabe(clabe)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists driver_payout_accounts_updated_at on public.driver_payout_accounts;
create trigger driver_payout_accounts_updated_at before update on public.driver_payout_accounts
for each row execute function public.set_updated_at();

alter table public.driver_payout_accounts enable row level security;

drop policy if exists payout_accounts_select on public.driver_payout_accounts;
create policy payout_accounts_select on public.driver_payout_accounts
  for select using (driver_id = auth.uid() or public.is_admin());

drop policy if exists payout_accounts_insert on public.driver_payout_accounts;
create policy payout_accounts_insert on public.driver_payout_accounts
  for insert with check (driver_id = auth.uid() and public.has_role('driver'));

drop policy if exists payout_accounts_update on public.driver_payout_accounts;
create policy payout_accounts_update on public.driver_payout_accounts
  for update using (driver_id = auth.uid() or public.is_admin())
  with check (driver_id = auth.uid() or public.is_admin());

-- Transferencias registradas por el admin
create table if not exists public.driver_payouts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  clabe text,
  reference text,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists driver_payouts_driver_idx on public.driver_payouts (driver_id, created_at desc);

alter table public.driver_payouts enable row level security;

drop policy if exists payouts_select on public.driver_payouts;
create policy payouts_select on public.driver_payouts
  for select using (driver_id = auth.uid() or public.is_admin());

drop policy if exists payouts_admin_insert on public.driver_payouts;
create policy payouts_admin_insert on public.driver_payouts
  for insert with check (public.is_admin());

drop policy if exists payouts_admin_delete on public.driver_payouts;
create policy payouts_admin_delete on public.driver_payouts
  for delete using (public.is_admin());

-- Saldo por cobrar = ganancia del conductor en viajes con tarjeta aprobados − transferencias hechas
create or replace function public.my_payout_balance()
returns table (card_earned numeric, card_trips bigint, paid_out numeric, balance numeric)
language sql
stable
security definer
set search_path = public
as $$
  with e as (
    select coalesce(sum(r.driver_net), 0) as v, count(*) as n
    from public.rides r
    where r.driver_id = auth.uid()
      and r.status = 'completed'
      and r.payment_method = 'card'
      and r.payment_status = 'approved'
  ),
  p as (
    select coalesce(sum(dp.amount), 0) as v
    from public.driver_payouts dp
    where dp.driver_id = auth.uid()
  )
  select e.v, e.n, p.v, e.v - p.v from e, p;
$$;

create or replace function public.admin_payout_balances()
returns table (
  driver_id uuid,
  card_earned numeric,
  card_trips bigint,
  paid_out numeric,
  balance numeric,
  last_payout_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo administradores';
  end if;
  return query
  with e as (
    select r.driver_id as d, sum(r.driver_net) as v, count(*) as n
    from public.rides r
    where r.status = 'completed'
      and r.payment_method = 'card'
      and r.payment_status = 'approved'
      and r.driver_id is not null
    group by r.driver_id
  ),
  p as (
    select dp.driver_id as d, sum(dp.amount) as v, max(dp.created_at) as last
    from public.driver_payouts dp
    group by dp.driver_id
  )
  select coalesce(e.d, p.d), coalesce(e.v, 0), coalesce(e.n, 0)::bigint, coalesce(p.v, 0),
         coalesce(e.v, 0) - coalesce(p.v, 0), p.last
  from e full outer join p on p.d = e.d;
end;
$$;

revoke all on function public.my_payout_balance() from public;
grant execute on function public.my_payout_balance() to authenticated;
revoke all on function public.admin_payout_balances() from public;
grant execute on function public.admin_payout_balances() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'driver_payouts'
  ) then
    alter publication supabase_realtime add table public.driver_payouts;
  end if;
end $$;
