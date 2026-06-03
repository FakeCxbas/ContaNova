create or replace function public.get_next_document_number(
  _company_id uuid,
  _document_type text
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _prefix text;
  _max_seq int;
  _next_seq int;
  _establecimiento text;
  _punto_emision text;
begin
  _prefix := case _document_type
    when 'proforma' then 'PRO'
    when 'factura' then 'FAC'
    when 'nota_credito' then 'NC'
    when 'nota_debito' then 'ND'
    when 'retencion' then 'RET'
    when 'guia_remision' then 'GR'
    else 'DOC'
  end;

  select establecimiento, punto_emision
  into _establecimiento, _punto_emision
  from public.companies
  where id = _company_id;

  _establecimiento := coalesce(_establecimiento, '001');
  _punto_emision := coalesce(_punto_emision, '001');

  select coalesce(max(
    cast(
      case
        when number ~ '-[0-9]+$' then regexp_replace(number, '^.*-', '')
        else '0'
      end as int
    )
  ), 0)
  into _max_seq
  from public.invoices
  where company_id = _company_id
    and document_type = _document_type;

  _next_seq := _max_seq + 1;

  return _prefix || '-' || _establecimiento || '-' || _punto_emision || '-' || lpad(_next_seq::text, 9, '0');
end;
$$;

comment on column public.invoices.document_type is
  'Type of document: proforma, factura, nota_credito, nota_debito, retencion, guia_remision';
