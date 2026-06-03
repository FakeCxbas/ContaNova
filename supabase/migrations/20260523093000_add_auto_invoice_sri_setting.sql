alter table public.companies
  add column if not exists auto_send_invoice_email boolean not null default false;

alter table public.companies
  add column if not exists auto_send_invoice_sri boolean not null default false;

comment on column public.companies.auto_send_invoice_email is
  'Cuando esta activo, las facturas se envian automaticamente por correo al crearlas.';

comment on column public.companies.auto_send_invoice_sri is
  'Cuando esta activo, las facturas se envian automaticamente al SRI al crearlas.';
