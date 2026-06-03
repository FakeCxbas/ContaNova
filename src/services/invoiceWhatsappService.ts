import { supabase } from "@/integrations/supabase/client";

export type SendInvoiceWhatsappPayload = {
  invoiceId: string;
};

export type SendInvoiceWhatsappResult = {
  success: boolean;
  simulated?: boolean;
  messageId?: string;
  to?: string;
  error?: string;
};

export const invoiceWhatsappService = {
  async send(payload: SendInvoiceWhatsappPayload) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Tu sesion expiro. Vuelve a iniciar sesion.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-invoice-whatsapp`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as SendInvoiceWhatsappResult | null;
    if (!response.ok || data?.error) {
      throw new Error(data?.error || "No se pudo enviar el WhatsApp.");
    }

    return data;
  },
};
