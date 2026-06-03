alter table public.companies
  add column if not exists sri_certificate_path text,
  add column if not exists sri_certificate_filename text,
  add column if not exists sri_certificate_uploaded_at timestamptz,
  add column if not exists sri_certificate_password_ciphertext text,
  add column if not exists sri_certificate_password_iv text;

insert into storage.buckets (id, name, public)
values ('sri-certificates', 'sri-certificates', false)
on conflict (id) do nothing;

create policy "Users can view own sri certificates"
on storage.objects for select
to authenticated
using (
  bucket_id = 'sri-certificates'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id::text = split_part(name, '/', 1)
  )
);

create policy "Users can upload own sri certificates"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'sri-certificates'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id::text = split_part(name, '/', 1)
  )
);

create policy "Users can update own sri certificates"
on storage.objects for update
to authenticated
using (
  bucket_id = 'sri-certificates'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id::text = split_part(name, '/', 1)
  )
);

create policy "Users can delete own sri certificates"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'sri-certificates'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id::text = split_part(name, '/', 1)
  )
);
