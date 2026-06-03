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

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

async function encryptionKey() {
  const secret = Deno.env.get("WHATSAPP_CREDENTIALS_ENCRYPTION_KEY") || Deno.env.get("SRI_CERTIFICATE_ENCRYPTION_KEY");
  if (!secret) {
    throw new Error("Falta configurar WHATSAPP_CREDENTIALS_ENCRYPTION_KEY para proteger el token de WhatsApp.");
  }

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt"]);
}

async function encryptSecret(secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(secret),
  );
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "PUT") return json({ error: "Metodo no permitido" }, 405);

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

    const { data: role } = await supabase.rpc("get_user_role", { _user_id: user.id });
    if (role !== "admin" && role !== "superadmin") {
      return json({ error: "Solo un administrador puede configurar WhatsApp." }, 403);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();
    if (!profile?.company_id) return json({ error: "No se encontro empresa del usuario" }, 403);

    const payload = await req.json();
    const accessToken = String(payload.accessToken || "").trim();
    if (!accessToken) return json({ error: "El token de WhatsApp es requerido." }, 400);
    if (accessToken.length < 20) return json({ error: "El token de WhatsApp parece incompleto." }, 400);

    const encrypted = await encryptSecret(accessToken);
    const { error: upsertError } = await supabase.from("company_whatsapp_credentials").upsert({
      company_id: profile.company_id,
      access_token_ciphertext: encrypted.ciphertext,
      access_token_iv: encrypted.iv,
      updated_at: new Date().toISOString(),
    });
    if (upsertError) return json({ error: upsertError.message }, 400);

    const { error: companyError } = await supabase
      .from("companies")
      .update({ whatsapp_token_configured: true })
      .eq("id", profile.company_id);
    if (companyError) return json({ error: companyError.message }, 400);

    return json({ success: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "No se pudo guardar WhatsApp." }, 500);
  }
});
