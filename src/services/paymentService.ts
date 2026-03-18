import { supabase } from "@/integrations/supabase/client";

export type PaymentInput = {
  invoice_id: string;
  date: string;
  method: string;
  amount: number;
  note: string;
};

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
};
