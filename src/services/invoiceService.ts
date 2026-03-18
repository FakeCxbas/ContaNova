import { supabase } from "@/integrations/supabase/client";

export type InvoiceItemInput = {
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  iva: number;
};

export type DocumentType = 'factura' | 'nota_credito' | 'nota_debito' | 'retencion' | 'guia_remision';

export const DOCUMENT_TYPES: Record<DocumentType, { label: string; prefix: string }> = {
  factura: { label: "Factura", prefix: "FAC" },
  nota_credito: { label: "Nota de Crédito", prefix: "NC" },
  nota_debito: { label: "Nota de Débito", prefix: "ND" },
  retencion: { label: "Retención", prefix: "RET" },
  guia_remision: { label: "Guía de Remisión", prefix: "GR" },
};

export type InvoiceInput = {
  client_id: string | null;
  client_name: string;
  number: string;
  date: string;
  subtotal: number;
  iva: number;
  total: number;
  status: string;
  document_type: DocumentType;
  items: InvoiceItemInput[];
};

export const invoiceService = {
  async getAll() {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase.from("invoices").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },

  async getItems(invoiceId: string) {
    const { data, error } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId);
    if (error) throw error;
    return data;
  },

  async getNextNumber(companyId: string, documentType: DocumentType): Promise<string> {
    const { data, error } = await supabase.rpc("get_next_document_number", {
      _company_id: companyId,
      _document_type: documentType,
    });
    if (error) throw error;
    return data as string;
  },

  async create(invoice: InvoiceInput, companyId: string) {
    const { items, ...invoiceData } = invoice;
    const { data: inv, error: invError } = await supabase
      .from("invoices")
      .insert({ ...invoiceData, company_id: companyId })
      .select()
      .single();
    if (invError) throw invError;

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(items.map((item) => ({ ...item, invoice_id: inv.id })));
      if (itemsError) throw itemsError;
    }
    return inv;
  },

  async update(id: string, updates: { status?: string }) {
    const { error } = await supabase.from("invoices").update(updates).eq("id", id);
    if (error) throw error;
  },
};
