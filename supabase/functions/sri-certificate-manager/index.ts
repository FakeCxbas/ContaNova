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
  const secret = Deno.env.get("SRI_CERTIFICATE_ENCRYPTION_KEY");
  if (!secret) {
    throw new Error("Falta configurar SRI_CERTIFICATE_ENCRYPTION_KEY para proteger las claves de firma.");
  }

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt"]);
}

async function encryptPassword(password: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(password),
  );
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    if (!profile?.company_id) return json({ error: "No se encontro empresa del usuario" }, 403);

    if (req.method === "DELETE") {
      const { data: company } = await supabase
        .from("companies")
        .select("sri_certificate_path")
        .eq("id", profile.company_id)
        .single();

      if (company?.sri_certificate_path) {
        await supabase.storage.from("sri-certificates").remove([company.sri_certificate_path]);
      }

      const { error } = await supabase
        .from("companies")
        .update({
          sri_certificate_path: null,
          sri_certificate_filename: null,
          sri_certificate_uploaded_at: null,
          sri_certificate_password_ciphertext: null,
          sri_certificate_password_iv: null,
        })
        .eq("id", profile.company_id);
      if (error) return json({ error: error.message }, 400);

      return json({ success: true });
    }

    const formData = await req.formData();
    const file = formData.get("certificate");
    const password = String(formData.get("password") || "");

    if (!(file instanceof File)) return json({ error: "Sube un archivo de firma electronica." }, 400);
    if (!password.trim()) return json({ error: "Ingresa la clave de la firma electronica." }, 400);

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".p12") && !lowerName.endsWith(".pfx")) {
      return json({ error: "La firma debe ser un archivo .p12 o .pfx." }, 400);
    }
    if (file.size > 5 * 1024 * 1024) {
      return json({ error: "La firma no debe superar 5MB." }, 400);
    }

    const encryptedPassword = await encryptPassword(password);
    const ext = lowerName.endsWith(".pfx") ? "pfx" : "p12";
    const path = `${profile.company_id}/firma-electronica.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("sri-certificates")
      .upload(path, file, {
        upsert: true,
        contentType: file.type || "application/x-pkcs12",
      });
    if (uploadError) return json({ error: uploadError.message }, 400);

    const uploadedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("companies")
      .update({
        sri_certificate_path: path,
        sri_certificate_filename: file.name,
        sri_certificate_uploaded_at: uploadedAt,
        sri_certificate_password_ciphertext: encryptedPassword.ciphertext,
        sri_certificate_password_iv: encryptedPassword.iv,
      })
      .eq("id", profile.company_id);
    if (updateError) return json({ error: updateError.message }, 400);

    return json({
      success: true,
      certificate: {
        filename: file.name,
        uploadedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la firma electronica.";
    return json({ error: message }, 500);
  }
});
