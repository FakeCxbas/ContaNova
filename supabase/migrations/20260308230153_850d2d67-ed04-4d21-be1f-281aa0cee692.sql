
CREATE OR REPLACE FUNCTION public.get_next_document_number(
  _company_id uuid,
  _document_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _prefix text;
  _max_seq int;
  _next_seq int;
BEGIN
  -- Determine prefix based on document type
  _prefix := CASE _document_type
    WHEN 'factura' THEN 'FAC'
    WHEN 'nota_credito' THEN 'NC'
    WHEN 'nota_debito' THEN 'ND'
    WHEN 'retencion' THEN 'RET'
    WHEN 'guia_remision' THEN 'GR'
    ELSE 'DOC'
  END;

  -- Get the max sequence number for this company and document type
  SELECT COALESCE(MAX(
    CAST(
      CASE 
        WHEN number ~ '-[0-9]+$' THEN regexp_replace(number, '^.*-', '')
        ELSE '0'
      END AS int
    )
  ), 0)
  INTO _max_seq
  FROM public.invoices
  WHERE company_id = _company_id
    AND document_type = _document_type;

  _next_seq := _max_seq + 1;

  RETURN _prefix || '-001-' || lpad(_next_seq::text, 9, '0');
END;
$$;
