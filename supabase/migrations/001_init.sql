-- INRIDE schema: profiles, documents, tariffs, rides, ride_locations + RLS + realtime

create extension if not exists "pgcrypto";

create type public.user_role as enum ('passenger', 'driver', 'admin');

create type public.ride_status as enum (
  'searching',
  'offered',
  'accepted',
  'en_route_pickup',
  'arrived_pickup',
  'in_progress',
  'completed',
  'cancelled'
);

create type public.vehicle_type as enum ('Económico', 'Comfort', 'Premium', 'Van');

-- Profiles -------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  first_name text not null,
  phone text not null default '',
  city text not null default 'Durango, Dgo.',
  initials text not null default '',
  rating numeric(3,2) not null default 5.00,
  total_trips integer not null default 0,
  member_since text not null default to_char(now(), 'YYYY'),
  bio text,
  roles public.user_role[] not null default array['passenger']::public.user_role[],
  active_role public.user_role not null default 'passenger',
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  vehicle_plate text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.driver_documents (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  ine_front boolean not null default false,
  ine_back boolean not null default false,
  license boolean not null default false,
  circulation boolean not null default false,
  insurance boolean not null default false,
  complete boolean generated always as (
    ine_front and ine_back and license and circulation and insurance
  ) stored,
  updated_at timestamptz not null default now()
);

create table public.tariffs (
  id uuid primary key default gen_random_uuid(),
  active boolean not null default true,
  per_km_total numeric(10,2) not null default 10,
  per_km_driver numeric(10,2) not null default 7,
  per_km_app numeric(10,2) not null default 3,
  min_distance_km numeric(10,2) not null default 2,
  min_fare numeric(10,2) not null default 35,
  airport_toll_total numeric(10,2) not null default 30,
  airport_toll_driver numeric(10,2) not null default 22,
  airport_toll_app numeric(10,2) not null default 8,
  high_demand_active boolean not null default true,
  surge_multiplier numeric(4,2) not null default 1.40,
  updated_at timestamptz not null default now()
);

create unique index tariffs_one_active on public.tariffs (active) where active = true;

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles (id),
  driver_id uuid references public.profiles (id),
  status public.ride_status not null default 'searching',
  origin text not null,
  destination text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  vehicle public.vehicle_type not null default 'Comfort',
  price numeric(10,2) not null default 0,
  driver_net numeric(10,2) not null default 0,
  app_net numeric(10,2) not null default 0,
  airport_toll numeric(10,2) not null default 0,
  distance_km numeric(10,2) not null default 0,
  duration_label text not null default '12 min',
  passenger_name text not null default '',
  passenger_rating numeric(3,2) not null default 5,
  driver_name text,
  driver_rating numeric(3,2),
  driver_car text,
  driver_plate text,
  rating integer,
  comment text,
  scheduled_date text,
  scheduled_time text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
);

create index rides_status_idx on public.rides (status);
create index rides_passenger_idx on public.rides (passenger_id);
create index rides_driver_idx on public.rides (driver_id);

create table public.ride_locations (
  ride_id uuid primary key references public.rides (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision not null default 0,
  updated_at timestamptz not null default now()
);

-- Helpers --------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger rides_updated_at before update on public.rides
for each row execute function public.set_updated_at();

create trigger tariffs_updated_at before update on public.tariffs
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and ('admin' = any (p.roles) or p.active_role = 'admin')
  );
$$;

create or replace function public.has_role(role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and role = any (p.roles)
  );
$$;

-- Auto profile on signup (optional metadata from client)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_roles public.user_role[];
  meta_active public.user_role;
begin
  begin
    meta_roles := coalesce(
      (select array_agg(value::public.user_role)
       from jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'roles', '["passenger"]'::jsonb)) as t(value)),
      array['passenger']::public.user_role[]
    );
  exception when others then
    meta_roles := array['passenger']::public.user_role[];
  end;

  begin
    meta_active := coalesce((new.raw_user_meta_data->>'active_role')::public.user_role, meta_roles[1]);
  exception when others then
    meta_active := 'passenger';
  end;

  insert into public.profiles (
    id, email, name, first_name, phone, city, initials, rating, total_trips,
    member_since, bio, roles, active_role,
    vehicle_make, vehicle_model, vehicle_color, vehicle_plate
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(new.raw_user_meta_data->>'first_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'city', 'Durango, Dgo.'),
    coalesce(new.raw_user_meta_data->>'initials', upper(left(coalesce(new.email, 'U'), 2))),
    coalesce((new.raw_user_meta_data->>'rating')::numeric, 5),
    coalesce((new.raw_user_meta_data->>'total_trips')::integer, 0),
    coalesce(new.raw_user_meta_data->>'member_since', to_char(now(), 'YYYY')),
    new.raw_user_meta_data->>'bio',
    meta_roles,
    meta_active,
    new.raw_user_meta_data->>'vehicle_make',
    new.raw_user_meta_data->>'vehicle_model',
    new.raw_user_meta_data->>'vehicle_color',
    new.raw_user_meta_data->>'vehicle_plate'
  );

  if 'driver' = any (meta_roles) then
    insert into public.driver_documents (user_id, ine_front, ine_back, license, circulation, insurance)
    values (
      new.id,
      coalesce((new.raw_user_meta_data->>'docs_complete')::boolean, false),
      coalesce((new.raw_user_meta_data->>'docs_complete')::boolean, false),
      coalesce((new.raw_user_meta_data->>'docs_complete')::boolean, false),
      coalesce((new.raw_user_meta_data->>'docs_complete')::boolean, false),
      coalesce((new.raw_user_meta_data->>'docs_complete')::boolean, false)
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Default tariff
insert into public.tariffs (active) values (true);

-- RLS ------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.driver_documents enable row level security;
alter table public.tariffs enable row level security;
alter table public.rides enable row level security;
alter table public.ride_locations enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_select_for_rides"
  on public.profiles for select
  using (
    exists (
      select 1 from public.rides r
      where (r.passenger_id = auth.uid() or r.driver_id = auth.uid())
        and (r.passenger_id = profiles.id or r.driver_id = profiles.id)
    )
  );

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "docs_select_own_or_admin"
  on public.driver_documents for select
  using (user_id = auth.uid() or public.is_admin());

create policy "docs_upsert_own"
  on public.driver_documents for insert
  with check (user_id = auth.uid() or public.is_admin());

create policy "docs_update_own"
  on public.driver_documents for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "tariffs_read_all_auth"
  on public.tariffs for select
  to authenticated
  using (true);

create policy "tariffs_admin_update"
  on public.tariffs for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "rides_select_relevant"
  on public.rides for select
  using (
    public.is_admin()
    or passenger_id = auth.uid()
    or driver_id = auth.uid()
    or (status = 'searching' and public.has_role('driver'))
  );

create policy "rides_insert_passenger"
  on public.rides for insert
  with check (passenger_id = auth.uid());

create policy "rides_update_participants"
  on public.rides for update
  using (
    public.is_admin()
    or passenger_id = auth.uid()
    or driver_id = auth.uid()
    or (status = 'searching' and public.has_role('driver'))
  )
  with check (
    public.is_admin()
    or passenger_id = auth.uid()
    or driver_id = auth.uid()
    or (driver_id = auth.uid())
  );

create policy "ride_locations_select"
  on public.ride_locations for select
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

create policy "ride_locations_upsert_driver"
  on public.ride_locations for insert
  with check (
    exists (
      select 1 from public.rides r
      where r.id = ride_id and r.driver_id = auth.uid()
    )
  );

create policy "ride_locations_update_driver"
  on public.ride_locations for update
  using (
    exists (
      select 1 from public.rides r
      where r.id = ride_id and r.driver_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rides r
      where r.id = ride_id and r.driver_id = auth.uid()
    )
  );

-- Realtime -------------------------------------------------------------------
alter publication supabase_realtime add table public.rides;
alter publication supabase_realtime add table public.ride_locations;
