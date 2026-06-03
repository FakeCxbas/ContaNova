alter table public.invoices
  add column if not exists delivery_status text not null default 'pendiente'
    check (delivery_status in ('pendiente', 'preparada', 'enviada')),
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_recipient text;

update public.invoices
set
  delivery_status = 'enviada',
  status = 'emitida'
where status = 'enviada';

comment on column public.invoices.status is
  'Estado comercial/tributario del comprobante: borrador, emitida, pagada, anulada u observada.';

comment on column public.invoices.delivery_status is
  'Estado de entrega al cliente por correo: pendiente, preparada o enviada.';
