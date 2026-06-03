import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Payment = Tables<"payments">;
export type PaymentInput = Omit<TablesInsert<"payments">, "company_id" | "id" | "created_at">;

export const paymentService = {
  async getAll(invoiceId?: string) {
    let q = supabase.from("payments").select("*").order("date", { ascending: false });
    if (invoiceId) q = q.eq("invoice_id", invoiceId);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  async create(payment: PaymentInput, companyId: string) {
    const { data, error } = await supabase
      .from("payments")
      .insert({ ...payment, company_id: companyId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async uploadEvidence(companyId: string, file: File) {
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeBaseName = file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "comprobante";
    const path = `${companyId}/payments/${Date.now()}-${safeBaseName}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("company-logos")
      .upload(path, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("company-logos").getPublicUrl(path);
    return data.publicUrl;
  },
};
