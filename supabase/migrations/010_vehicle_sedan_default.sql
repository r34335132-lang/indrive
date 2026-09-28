-- Requiere que 009 ya se haya aplicado (enum Sedan/SUV committed).
alter table public.rides
  alter column vehicle set default 'Sedan';
