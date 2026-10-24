-- Solo mayores de 18: fecha de nacimiento en el perfil y validación en el servidor.
-- Requiere 013_privilege_guards.sql (redefine sus funciones agregando la fecha de nacimiento).

alter table public.profiles
  add column if not exists birthdate date;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_roles public.user_role[];
  meta_active public.user_role;
  meta_birth date;
begin
  begin
    meta_birth := nullif(new.raw_user_meta_data->>'birthdate', '')::date;
  exception when others then
    meta_birth := null;
  end;
  if meta_birth is not null and meta_birth > (current_date - interval '18 years')::date then
    raise exception 'Debes ser mayor de 18 años para usar inride.' using errcode = 'check_violation';
  end if;

  begin
    meta_roles := coalesce(
      (select array_agg(value::public.user_role)
       from jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'roles', '["passenger"]'::jsonb)) as t(value)),
      array['passenger']::public.user_role[]
    );
  exception when others then
    meta_roles := array['passenger']::public.user_role[];
  end;
  meta_roles := array_remove(meta_roles, 'admin'::public.user_role);
  if coalesce(array_length(meta_roles, 1), 0) = 0 then
    meta_roles := array['passenger']::public.user_role[];
  end if;

  begin
    meta_active := coalesce((new.raw_user_meta_data->>'active_role')::public.user_role, meta_roles[1]);
  exception when others then
    meta_active := meta_roles[1];
  end;
  if not (meta_active = any (meta_roles)) then
    meta_active := meta_roles[1];
  end if;

  insert into public.profiles (
    id, email, name, first_name, phone, city, initials, rating, total_trips,
    member_since, bio, roles, active_role, birthdate,
    vehicle_make, vehicle_model, vehicle_color, vehicle_plate
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(new.raw_user_meta_data->>'first_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'city', 'Durango, Dgo.'),
    coalesce(new.raw_user_meta_data->>'initials', upper(left(coalesce(new.email, 'U'), 2))),
    5,
    0,
    to_char(now(), 'YYYY'),
    new.raw_user_meta_data->>'bio',
    meta_roles,
    meta_active,
    meta_birth,
    new.raw_user_meta_data->>'vehicle_make',
    new.raw_user_meta_data->>'vehicle_model',
    new.raw_user_meta_data->>'vehicle_color',
    new.raw_user_meta_data->>'vehicle_plate'
  );

  if 'driver' = any (meta_roles) then
    insert into public.driver_documents (user_id, ine_front, ine_back, license, circulation, insurance)
    values (new.id, false, false, false, false, false)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if not ('admin' = any (old.roles)) then
    new.roles := array_remove(new.roles, 'admin'::public.user_role);
    if coalesce(array_length(new.roles, 1), 0) = 0 then
      new.roles := old.roles;
    end if;
  end if;
  if not (new.active_role = any (new.roles)) then
    new.active_role := old.active_role;
  end if;
  new.rating := old.rating;
  new.total_trips := old.total_trips;
  -- La fecha de nacimiento solo se captura una vez y debe ser de un adulto
  if old.birthdate is not null then
    new.birthdate := old.birthdate;
  elsif new.birthdate is not null and new.birthdate > (current_date - interval '18 years')::date then
    raise exception 'Debes ser mayor de 18 años para usar inride.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
