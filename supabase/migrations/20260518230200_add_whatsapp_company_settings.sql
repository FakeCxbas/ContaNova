alter table public.companies
  add column if not exists whatsapp_enabled boolean not null default false,
  add column if not exists auto_send_invoice_whatsapp boolean not null default false,
  add column if not exists whatsapp_simulation_mode boolean not null default true,
  add column if not exists whatsapp_phone_number_id text,
  add column if not exists whatsapp_business_account_id text,
  add column if not exists whatsapp_template_name text,
  add column if not exists whatsapp_template_language text not null default 'es',
  add column if not exists whatsapp_token_configured boolean not null default false;

create table if not exists public.company_whatsapp_credentials (
  company_id uuid primary key references public.companies(id) on delete cascade,
  access_token_ciphertext text not null,
  access_token_iv text not null,
  updated_at timestamptz not null default now()
);

alter table public.company_whatsapp_credentials enable row level security;
