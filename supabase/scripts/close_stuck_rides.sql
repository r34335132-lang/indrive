-- Viajes que se quedaron "en curso" porque no se cerraron bien (más de 4 h sin cambios).
-- Correr en el SQL Editor de Supabase.

-- 1) Ver cuáles son
select id, status, driver_name, passenger_name, origin, destination, created_at, updated_at
from public.rides
where status in ('accepted', 'en_route_pickup', 'arrived_pickup', 'in_progress')
  and updated_at < now() - interval '4 hours'
order by updated_at desc;

-- 2) Cerrarlos: los que ya iban en viaje se marcan completados (cuentan como ganancia del
--    conductor); los que no habían iniciado se cancelan.
update public.rides
set status = 'completed',
    completed_at = coalesce(completed_at, updated_at)
where status = 'in_progress'
  and updated_at < now() - interval '4 hours';

update public.rides
set status = 'cancelled'
where status in ('accepted', 'en_route_pickup', 'arrived_pickup')
  and updated_at < now() - interval '4 hours';
