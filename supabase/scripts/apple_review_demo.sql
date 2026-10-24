-- Cuentas demo para App Review (Apple / Google).
--
-- PASO 1 (Dashboard de Supabase → Authentication → Users → Add user → Create new user,
--         marcar "Auto Confirm User"):
--   demo.conductor@inride.app   contraseña: InrideDemo2026!
--   demo.pasajero@inride.app    contraseña: InrideDemo2026!
--
-- PASO 2: correr este script en SQL Editor (se puede volver a correr sin problema).

-- Conductor demo: documentos aprobados y depósito cubierto → recibe viajes de inmediato
update public.profiles set
  name = 'Conductor Demo',
  first_name = 'Conductor',
  initials = 'CD',
  phone = '8710000001',
  city = 'Torreón, Coah.',
  roles = array['passenger', 'driver']::public.user_role[],
  active_role = 'driver',
  vehicle_make = 'Nissan',
  vehicle_model = 'Versa',
  vehicle_color = 'Blanco',
  vehicle_plate = 'DEMO-123',
  bio = 'Nissan Versa · DEMO-123',
  driver_tier = 'go',
  block_fee_satisfied = true,
  block_fee_satisfied_at = now()
where email = 'demo.conductor@inride.app';

insert into public.driver_documents
  (user_id, ine_front, ine_back, license, circulation, insurance, review_status, review_note)
select id, true, true, true, true, true, 'approved', 'Cuenta demo para App Review'
from public.profiles
where email = 'demo.conductor@inride.app'
on conflict (user_id) do update set
  ine_front = true,
  ine_back = true,
  license = true,
  circulation = true,
  insurance = true,
  review_status = 'approved',
  review_note = 'Cuenta demo para App Review';

-- Pasajero demo
update public.profiles set
  name = 'Pasajero Demo',
  first_name = 'Pasajero',
  initials = 'PD',
  phone = '8710000002',
  city = 'Torreón, Coah.',
  roles = array['passenger']::public.user_role[],
  active_role = 'passenger'
where email = 'demo.pasajero@inride.app';

-- Verificación: deben salir 2 filas, el conductor con approved / true
select p.email, p.roles, p.active_role, p.block_fee_satisfied, d.complete, d.review_status
from public.profiles p
left join public.driver_documents d on d.user_id = p.id
where p.email in ('demo.conductor@inride.app', 'demo.pasajero@inride.app');
