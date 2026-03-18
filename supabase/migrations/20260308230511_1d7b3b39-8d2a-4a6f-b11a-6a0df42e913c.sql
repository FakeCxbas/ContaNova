
-- Add tax configuration columns to companies
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS establecimiento text NOT NULL DEFAULT '001',
ADD COLUMN IF NOT EXISTS punto_emision text NOT NULL DEFAULT '001';

COMMENT ON COLUMN public.companies.establecimiento IS 'Código de establecimiento SRI (3 dígitos)';
COMMENT ON COLUMN public.companies.punto_emision IS 'Código de punto de emisión SRI (3 dígitos)';

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone can view logos (public bucket)
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- RLS: authenticated users can upload logos for their company
CREATE POLICY "Users can upload company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-logos');

-- RLS: authenticated users can update their logos
CREATE POLICY "Users can update company logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-logos');

-- RLS: authenticated users can delete their logos
CREATE POLICY "Users can delete company logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-logos');

-- Update the document number function to use establecimiento and punto_emision
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
  _establecimiento text;
  _punto_emision text;
BEGIN
  _prefix := CASE _document_type
    WHEN 'factura' THEN 'FAC'
    WHEN 'nota_credito' THEN 'NC'
    WHEN 'nota_debito' THEN 'ND'
    WHEN 'retencion' THEN 'RET'
    WHEN 'guia_remision' THEN 'GR'
    ELSE 'DOC'
  END;

  SELECT establecimiento, punto_emision
  INTO _establecimiento, _punto_emision
  FROM public.companies
  WHERE id = _company_id;

  _establecimiento := COALESCE(_establecimiento, '001');
  _punto_emision := COALESCE(_punto_emision, '001');

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

  RETURN _prefix || '-' || _establecimiento || '-' || _punto_emision || '-' || lpad(_next_seq::text, 9, '0');
END;
$$;
