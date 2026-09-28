-- Permite borrar la cuenta (auth.users → profiles cascade) conservando historial anonimizado.
-- Apple App Store: Guideline 5.1.1(v) Account Deletion

alter table public.rides
  alter column passenger_id drop not null;

alter table public.rides drop constraint if exists rides_passenger_id_fkey;
alter table public.rides drop constraint if exists rides_driver_id_fkey;

alter table public.rides
  add constraint rides_passenger_id_fkey
    foreign key (passenger_id) references public.profiles (id) on delete set null;

alter table public.rides
  add constraint rides_driver_id_fkey
    foreign key (driver_id) references public.profiles (id) on delete set null;

alter table public.payments
  alter column passenger_id drop not null;

alter table public.payments drop constraint if exists payments_passenger_id_fkey;
alter table public.payments
  add constraint payments_passenger_id_fkey
    foreign key (passenger_id) references public.profiles (id) on delete set null;

alter table public.ride_messages
  alter column sender_id drop not null;

alter table public.ride_messages drop constraint if exists ride_messages_sender_id_fkey;
alter table public.ride_messages
  add constraint ride_messages_sender_id_fkey
    foreign key (sender_id) references public.profiles (id) on delete set null;
