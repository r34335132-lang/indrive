-- Mensajes entre pasajero y conductor de un viaje activo.
create table if not exists public.ride_messages (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null check (char_length(trim(body)) between 1 and 400),
  created_at timestamptz not null default now()
);

create index if not exists ride_messages_ride_idx
  on public.ride_messages (ride_id, created_at);

alter table public.ride_messages enable row level security;

create policy "ride_messages_select"
  on public.ride_messages for select
  using (
    exists (
      select 1 from public.rides r
      where r.id = ride_id
        and (
          public.is_admin()
          or r.passenger_id = auth.uid()
          or r.driver_id = auth.uid()
        )
    )
  );

create policy "ride_messages_insert"
  on public.ride_messages for insert
  with check (
    sender_id = auth.uid()
    and char_length(trim(body)) between 1 and 400
    and exists (
      select 1 from public.rides r
      where r.id = ride_id
        and r.status in ('accepted', 'en_route_pickup', 'arrived_pickup', 'in_progress')
        and (r.passenger_id = auth.uid() or r.driver_id = auth.uid())
    )
  );

alter table public.ride_messages replica identity full;

alter publication supabase_realtime add table public.ride_messages;
