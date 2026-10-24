-- Evita escalada de privilegios desde la app (la anon key es pública):
--  * nadie puede darse el rol 'admin' (ni al registrarse ni editando su perfil)
--  * nadie puede auto-aprobar sus documentos de conductor
-- Sin sesión (SQL Editor / service_role en Edge Functions) auth.uid() es null y se permite todo.

-- 1) Registro: no confiar en roles/admin ni en docs_complete enviados por el cliente
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
    5,
    0,
    to_char(now(), 'YYYY'),
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
    values (new.id, false, false, false, false, false)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- 2) Perfil: un usuario normal no puede agregarse 'admin' ni cambiar su calificación/viajes
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
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- 3) Documentos: solo admin aprueba o rechaza; el conductor solo puede dejarlos en 'pending'
create or replace function public.guard_driver_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.review_status := 'pending';
    new.review_note := null;
  else
    if new.review_status is distinct from old.review_status and new.review_status <> 'pending' then
      new.review_status := old.review_status;
    end if;
    new.review_note := old.review_note;
  end if;
  return new;
end;
$$;

drop trigger if exists driver_documents_guard_review on public.driver_documents;
create trigger driver_documents_guard_review
  before insert or update on public.driver_documents
  for each row execute function public.guard_driver_review();
