-- Pagos Mercado Pago + método de cobro en viajes
do $$ begin
  create type public.payment_method as enum ('cash', 'card');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum (
    'none',
    'pending',
    'approved',
    'rejected',
    'refunded',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

alter table public.rides
  add column if not exists payment_method public.payment_method not null default 'cash';

alter table public.rides
  add column if not exists payment_status public.payment_status not null default 'none';

alter table public.rides
  add column if not exists mp_preference_id text;

alter table public.rides
  add column if not exists mp_payment_id text;

alter table public.rides
  add column if not exists paid_at timestamptz;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  passenger_id uuid not null references public.profiles (id),
  amount numeric(10,2) not null,
  currency text not null default 'MXN',
  status public.payment_status not null default 'pending',
  mp_preference_id text,
  mp_payment_id text,
  mp_status_detail text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_ride_idx on public.payments (ride_id);
create index if not exists payments_mp_payment_idx on public.payments (mp_payment_id);

create trigger payments_updated_at before update on public.payments
for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select using (
    auth.uid() = passenger_id
    or public.is_admin()
    or exists (
      select 1 from public.rides r
      where r.id = ride_id and r.driver_id = auth.uid()
    )
  );

drop policy if exists payments_insert_own on public.payments;
create policy payments_insert_own on public.payments
  for insert with check (auth.uid() = passenger_id or public.is_admin());

drop policy if exists payments_update_service on public.payments;
create policy payments_update_service on public.payments
  for update using (public.is_admin() or auth.uid() = passenger_id);
