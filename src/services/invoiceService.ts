import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Invoice = Tables<"invoices">;
export type InvoiceItem = Tables<"invoice_items">;
export type InvoiceItemInput = Omit<TablesInsert<"invoice_items">, "id" | "created_at" | "invoice_id">;

export type DocumentType = "proforma" | "factura" | "nota_credito" | "nota_debito" | "retencion" | "guia_remision";

export const DOCUMENT_TYPES: Record<DocumentType, { label: string; prefix: string }> = {
  proforma: { label: "Proforma", prefix: "PRO" },
  factura: { label: "Factura", prefix: "FAC" },
  nota_credito: { label: "Nota de Credito", prefix: "NC" },
  nota_debito: { label: "Nota de Debito", prefix: "ND" },
  retencion: { label: "Retencion", prefix: "RET" },
  guia_remision: { label: "Guia de Remision", prefix: "GR" },
};

export type InvoiceInput = Omit<TablesInsert<"invoices">, "company_id" | "id" | "created_at"> & {
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
    const { data, error } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId);
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

  async update(id: string, updates: TablesUpdate<"invoices">) {
    const { error } = await supabase.from("invoices").update(updates).eq("id", id);
    if (error) throw error;
  },
};
