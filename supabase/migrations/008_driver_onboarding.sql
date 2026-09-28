-- Onboarding conductor: revisión de docs + bloque $300 + rutas de archivos
alter table public.driver_documents
  add column if not exists review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected'));

alter table public.driver_documents
  add column if not exists review_note text;

alter table public.driver_documents
  add column if not exists ine_front_path text,
  add column if not exists ine_back_path text,
  add column if not exists license_path text,
  add column if not exists circulation_path text,
  add column if not exists insurance_path text;

alter table public.profiles
  add column if not exists block_fee_satisfied boolean not null default false;

alter table public.profiles
  add column if not exists block_fee_satisfied_at timestamptz;

-- Bloque de sistema = $300 (depósito / retención)
update public.tariffs
set system_block_fee = 300
where active = true;

-- Storage privado para documentos (crear bucket en dashboard si no existe)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'driver-docs',
  'driver-docs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880;

drop policy if exists driver_docs_select_own on storage.objects;
create policy driver_docs_select_own on storage.objects
  for select using (
    bucket_id = 'driver-docs'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

drop policy if exists driver_docs_insert_own on storage.objects;
create policy driver_docs_insert_own on storage.objects
  for insert with check (
    bucket_id = 'driver-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists driver_docs_update_own on storage.objects;
create policy driver_docs_update_own on storage.objects
  for update using (
    bucket_id = 'driver-docs'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

drop policy if exists driver_docs_delete_own on storage.objects;
create policy driver_docs_delete_own on storage.objects
  for delete using (
    bucket_id = 'driver-docs'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );
