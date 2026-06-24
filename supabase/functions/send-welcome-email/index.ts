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

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    if (userError || !user?.email) {
      return json({ error: "No autorizado" }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, welcome_shown_at")
      .eq("id", user.id)
      .single();
    if (profileError) return json({ error: profileError.message }, 400);

    if (profile?.welcome_shown_at) {
      return json({ success: true, skipped: true, message: "La bienvenida ya fue enviada." });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("INVOICE_FROM_EMAIL");
    const fromName = Deno.env.get("INVOICE_FROM_NAME") || "ContaNova";
    const recipientName = String(profile?.full_name || user.user_metadata?.full_name || user.email.split("@")[0] || "Usuario").trim();

    if (!resendApiKey || !fromEmail) {
      return json({
        success: true,
        simulated: true,
        id: `welcome-demo-${crypto.randomUUID()}`,
        message:
          "Correo de bienvenida simulado: falta configurar RESEND_API_KEY e INVOICE_FROM_EMAIL.",
      });
    }

    const safeName = escapeHtml(recipientName);
    const logoUrl = "https://contanova.org/brand/contanova-icon.png";
    const html = `
      <!doctype html>
      <html>
        <body style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:20px 12px;background:#f6f8fb;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe4f0;border-radius:18px;overflow:hidden;">
                  <tr>
                    <td style="padding:30px 28px 28px;background:#2563eb;color:#ffffff;">
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
                        <tr>
                          <td style="vertical-align:middle;padding:0 12px 0 0;">
                            <img src="${logoUrl}" width="48" height="48" alt="ContaNova" style="display:block;width:48px;height:48px;border-radius:13px;" />
                          </td>
                          <td style="vertical-align:middle;font-size:28px;line-height:1;font-weight:900;letter-spacing:-0.4px;color:#ffffff;">
                            ContaNova
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0;color:#eff6ff;font-size:17px;line-height:1.55;font-weight:700;">
                        Tu cuenta ya esta activa.
                      </p>
                      <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;line-height:1.7;">
                        Empieza a organizar facturas, clientes y reportes desde un solo lugar.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:30px 28px 22px;">
                      <h1 style="margin:0 0 14px;font-size:28px;line-height:1.22;color:#111827;">Bienvenido a ContaNova</h1>
                      <p style="margin:0 0 18px;color:#334155;font-size:14px;line-height:1.8;">
                        Hola ${safeName}, tu cuenta fue activada correctamente. Desde ahora puedes ingresar para gestionar clientes, productos, facturas y reportes desde un solo lugar.
                      </p>
                      <div style="padding:16px 18px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;">
                        <p style="margin:0;color:#1e3a8a;font-size:14px;line-height:1.75;">
                          Si activaste tu cuenta con una clave temporal, recuerda guardar tu nueva contrasena en un lugar seguro.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.65;background:#fbfdff;">
                      Enviado desde ContaNova.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const text = [
      `Hola ${recipientName},`,
      "",
      "Bienvenido a ContaNova. Tu cuenta fue activada correctamente.",
      "Desde ahora puedes gestionar clientes, productos, facturas y reportes.",
      "",
      "Enviado desde ContaNova.",
    ].join("\n");

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [user.email],
        subject: "Bienvenido a ContaNova",
        html,
        text,
      }),
    });

    const resendData = await resendResponse.json();
    if (!resendResponse.ok) {
      const providerError = String(resendData?.message || resendData?.error || "");
      const friendlyError = providerError.includes("You can only send testing emails")
        ? "Resend esta en modo prueba: con onboarding@resend.dev solo puedes enviar al correo dueño de la cuenta. Para enviar a usuarios, verifica un dominio en Resend y configura INVOICE_FROM_EMAIL con ese dominio."
        : providerError;

      return json({ error: friendlyError || "El proveedor de correo rechazo el envio." }, resendResponse.status);
    }

    return json({ success: true, id: resendData?.id || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el correo de bienvenida.";
    return json({ error: message }, 500);
  }
});
