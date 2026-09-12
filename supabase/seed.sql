-- Run AFTER creating the three demo users in Supabase Auth (Dashboard → Authentication → Users)
-- OR sign them up once from the app demo buttons (recommended).
--
-- Demo accounts (create with these emails / password InrideDemo1!):
--   sofia@inride.app     roles: passenger, admin
--   mauricio@inride.app  roles: driver (docs complete)
--   admin@inride.app     roles: admin
--
-- If you create users from the Dashboard without metadata, run this to patch profiles:

update public.profiles
set
  name = 'Sofía García',
  first_name = 'Sofía',
  phone = '+52 618 123 4567',
  initials = 'SG',
  rating = 4.92,
  total_trips = 48,
  member_since = '2024',
  bio = 'Pasajera frecuente en Durango',
  roles = array['passenger', 'admin']::public.user_role[],
  active_role = 'passenger'
where email = 'sofia@inride.app';

update public.profiles
set
  name = 'Mauricio Hernández',
  first_name = 'Mauricio',
  phone = '+52 618 987 6543',
  initials = 'MH',
  rating = 4.98,
  total_trips = 312,
  member_since = '2023',
  bio = 'Toyota Corolla · NRA-218',
  roles = array['driver']::public.user_role[],
  active_role = 'driver',
  vehicle_make = 'Toyota',
  vehicle_model = 'Corolla',
  vehicle_color = 'verde',
  vehicle_plate = 'NRA-218'
where email = 'mauricio@inride.app';

insert into public.driver_documents (user_id, ine_front, ine_back, license, circulation, insurance)
select id, true, true, true, true, true
from public.profiles
where email = 'mauricio@inride.app'
on conflict (user_id) do update set
  ine_front = true,
  ine_back = true,
  license = true,
  circulation = true,
  insurance = true;

update public.profiles
set
  name = 'Admin INRIDE',
  first_name = 'Admin',
  phone = '+52 618 000 0000',
  initials = 'AD',
  rating = 5,
  total_trips = 0,
  member_since = '2024',
  bio = 'Panel de control y tarifario',
  roles = array['admin']::public.user_role[],
  active_role = 'admin'
where email = 'admin@inride.app';
