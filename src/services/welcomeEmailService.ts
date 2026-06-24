import { supabase } from "@/integrations/supabase/client";

export const welcomeEmailService = {
  async send() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("No se encontro una sesion activa para enviar la bienvenida.");
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "No se pudo enviar el correo de bienvenida.");
    }

    return data as { success: boolean; simulated?: boolean; skipped?: boolean; id?: string | null };
  },
};
