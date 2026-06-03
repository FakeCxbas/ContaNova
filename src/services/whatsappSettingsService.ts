import { supabase } from "@/integrations/supabase/client";

export const whatsappSettingsService = {
  async saveAccessToken(accessToken: string) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Tu sesion expiro. Vuelve a iniciar sesion.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-settings`, {
      method: "PUT",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessToken }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || data?.error) {
      throw new Error(data?.error || "No se pudo guardar el token de WhatsApp.");
    }

    return data;
  },
};
