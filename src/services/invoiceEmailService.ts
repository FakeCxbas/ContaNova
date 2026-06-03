import { supabase } from "@/integrations/supabase/client";

export type SendInvoiceEmailPayload = {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  message?: string;
  documentLabel?: string;
  invoiceNumber: string;
  companyName: string;
  pdfBase64: string;
  filename: string;
};

export const invoiceEmailService = {
  async send(payload: SendInvoiceEmailPayload) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Tu sesion expiro. Vuelve a iniciar sesion.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-invoice-email`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || data?.message || "No se pudo enviar el correo.");
    }

    if (data?.error) {
      throw new Error(String(data.error));
    }

    return data;
  },
};
