
-- Add document_type column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN document_type text NOT NULL DEFAULT 'factura';

-- Add comment for clarity
COMMENT ON COLUMN public.invoices.document_type IS 'Type of document: factura, nota_credito, nota_debito, retencion, guia_remision';
