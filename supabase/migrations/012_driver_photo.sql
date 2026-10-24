-- Foto de perfil del conductor (visible para el pasajero durante el viaje)
alter table public.profiles
  add column if not exists avatar_url text;

alter table public.rides
  add column if not exists driver_photo_url text;

-- Bucket público solo para fotos de perfil (los documentos siguen en driver-docs privado)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists avatars_select_all on storage.objects;
create policy avatars_select_all on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );
