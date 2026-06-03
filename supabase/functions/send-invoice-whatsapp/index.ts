import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

async function decryptionKey() {
  const secret = Deno.env.get("WHATSAPP_CREDENTIALS_ENCRYPTION_KEY") || Deno.env.get("SRI_CERTIFICATE_ENCRYPTION_KEY");
  if (!secret) {
    throw new Error("Falta configurar WHATSAPP_CREDENTIALS_ENCRYPTION_KEY para usar WhatsApp.");
  }

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["decrypt"]);
}

async function decryptSecret(ciphertext: string, iv: string) {
  const key = await decryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}

const normalizePhone = (value: string | null | undefined) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("593")) return digits;
  if (digits.startsWith("0") && digits.length >= 10) return `593${digits.slice(1)}`;
  if (digits.length === 9) return `593${digits}`;
  return digits;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo no permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: "No autorizado" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();
    if (!profile?.company_id) return json({ error: "No se encontro empresa del usuario." }, 403);

    const { invoiceId } = await req.json();
    if (!invoiceId) return json({ error: "La factura es requerida." }, 400);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, company_id, client_id, client_name, number, total")
      .eq("id", invoiceId)
      .single();
    if (invoiceError || !invoice) return json({ error: invoiceError?.message || "No se encontro la factura." }, 404);
    if (invoice.company_id !== profile.company_id) return json({ error: "No autorizado para esta factura." }, 403);

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name, whatsapp_enabled, whatsapp_simulation_mode, whatsapp_phone_number_id, whatsapp_template_name, whatsapp_template_language, whatsapp_token_configured")
      .eq("id", invoice.company_id)
      .single();
    if (companyError || !company) return json({ error: companyError?.message || "No se encontro la empresa." }, 404);
    if (!company.whatsapp_enabled) return json({ error: "WhatsApp no esta activo para esta empresa." }, 400);

    const { data: client } = invoice.client_id
      ? await supabase
        .from("clients")
        .select("name, phone")
        .eq("id", invoice.client_id)
        .single()
      : { data: null };

    const to = normalizePhone(client?.phone);
    if (!to) return json({ error: "El cliente no tiene telefono para WhatsApp." }, 400);

    const templateName = String(company.whatsapp_template_name || "").trim();
    const language = String(company.whatsapp_template_language || "es").trim() || "es";

    if (company.whatsapp_simulation_mode) {
      return json({
        success: true,
        simulated: true,
        to,
        message: `Simulacion WhatsApp para ${invoice.number}.`,
      });
    }

    if (!company.whatsapp_phone_number_id) return json({ error: "Falta Phone Number ID de WhatsApp." }, 400);
    if (!templateName) return json({ error: "Falta configurar la plantilla de WhatsApp." }, 400);
    if (!company.whatsapp_token_configured) return json({ error: "Falta guardar el token de WhatsApp." }, 400);

    const { data: credentials, error: credentialsError } = await supabase
      .from("company_whatsapp_credentials")
      .select("access_token_ciphertext, access_token_iv")
      .eq("company_id", invoice.company_id)
      .single();
    if (credentialsError || !credentials) {
      return json({ error: credentialsError?.message || "No se encontro token de WhatsApp." }, 400);
    }

    const accessToken = await decryptSecret(credentials.access_token_ciphertext, credentials.access_token_iv);
    const response = await fetch(`https://graph.facebook.com/v21.0/${company.whatsapp_phone_number_id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: language },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: client?.name || invoice.client_name || "Cliente" },
                { type: "text", text: invoice.number },
                { type: "text", text: Number(invoice.total || 0).toFixed(2) },
                { type: "text", text: company.name || "ContaNova" },
              ],
            },
          ],
        },
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.error) {
      return json({ error: result?.error?.message || "Meta rechazo el envio de WhatsApp." }, 400);
    }

    return json({
      success: true,
      simulated: false,
      to,
      messageId: result?.messages?.[0]?.id || null,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "No se pudo enviar WhatsApp." }, 500);
  }
});
