-- Extend tariffs with time, wait, system block, app flat fee and driver-tier bonuses
alter table public.tariffs
  add column if not exists per_minute numeric(10,2) not null default 3,
  add column if not exists app_flat_fee numeric(10,2) not null default 13.2,
  add column if not exists wait_per_minute numeric(10,2) not null default 1,
  add column if not exists system_block_fee numeric(10,2) not null default 300,
  add column if not exists bonus_go numeric(10,2) not null default 1000,
  add column if not exists bonus_plus numeric(10,2) not null default 2000,
  add column if not exists bonus_master numeric(10,2) not null default 3000;

-- Optional driver tier on profiles (ready for future bonus payouts)
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'driver_tier'
  ) then
    create type public.driver_tier as enum ('go', 'plus', 'master');
  end if;
end$$;

alter table public.profiles
  add column if not exists driver_tier public.driver_tier;

update public.tariffs
set
  per_minute = coalesce(per_minute, 3),
  app_flat_fee = coalesce(app_flat_fee, 13.2),
  wait_per_minute = coalesce(wait_per_minute, 1),
  system_block_fee = coalesce(system_block_fee, 300),
  bonus_go = coalesce(bonus_go, 1000),
  bonus_plus = coalesce(bonus_plus, 2000),
  bonus_master = coalesce(bonus_master, 3000),
  airport_toll_driver = 22,
  airport_toll_app = 8,
  airport_toll_total = 30
where active = true;
