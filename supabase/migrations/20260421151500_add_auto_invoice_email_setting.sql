alter table public.companies
  add column if not exists auto_send_invoice_email boolean not null default false;
