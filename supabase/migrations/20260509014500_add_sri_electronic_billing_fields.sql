alter table public.companies
  add column if not exists sri_environment text not null default 'pruebas'
    check (sri_environment in ('pruebas', 'produccion')),
  add column if not exists sri_emission_enabled boolean not null default false;

alter table public.invoices
  add column if not exists sri_environment text
    check (sri_environment in ('pruebas', 'produccion')),
  add column if not exists sri_status text
    check (sri_status in ('pendiente_firma', 'firmada', 'recibida', 'devuelta', 'autorizada', 'no_autorizada', 'error')),
  add column if not exists sri_access_key text,
  add column if not exists sri_authorization_number text,
  add column if not exists sri_authorized_at timestamptz,
  add column if not exists sri_xml text,
  add column if not exists sri_messages jsonb not null default '[]'::jsonb;
