-- Precio inicial del pasajero. El bloque de sistema sigue en system_block_fee y es cargo del conductor.
alter table public.tariffs
  add column if not exists base_fare numeric(10,2) not null default 30;

update public.tariffs
set
  base_fare = 30,
  min_fare = 30
where active = true;
