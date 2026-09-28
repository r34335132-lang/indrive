-- Timestamp de llegada al pickup (espera del pasajero).
alter table public.rides
  add column if not exists arrived_at timestamptz;
