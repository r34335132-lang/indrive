-- Solo agregar valores al enum. Deben quedar committed antes de usarlos (DEFAULT, etc.).
alter type public.vehicle_type add value if not exists 'Sedan';
alter type public.vehicle_type add value if not exists 'SUV';
