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

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

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
    if (userError || !user) {
      return json({ error: "No autorizado" }, 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();
    if (!profile?.company_id) {
      return json({ error: "No se encontro empresa del usuario." }, 403);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("INVOICE_FROM_EMAIL");
    const fromName = Deno.env.get("INVOICE_FROM_NAME") || "ContaNova";

    const payload = await req.json();
    const recipientEmail = String(payload.recipientEmail || "").trim();
    const recipientName = String(payload.recipientName || "").trim();
    const subject = String(payload.subject || "").trim();
    const message = String(payload.message || "").trim();
    const documentLabel = String(payload.documentLabel || "factura").trim() || "factura";
    const documentLabelTitle = documentLabel.charAt(0).toUpperCase() + documentLabel.slice(1);
    const invoiceNumber = String(payload.invoiceNumber || "").trim();
    const companyName = String(payload.companyName || "").trim();
    const pdfBase64 = String(payload.pdfBase64 || "").trim();
    const filename = String(payload.filename || "").trim();

    if (!recipientEmail || !subject || !invoiceNumber || !companyName || !pdfBase64 || !filename) {
      return json({ error: `Faltan datos para enviar la ${documentLabel}.` }, 400);
    }

    if (!isValidEmail(recipientEmail)) {
      return json({ error: "El correo del destinatario no es valido." }, 400);
    }

    if (!resendApiKey || !fromEmail) {
      return json({
        success: true,
        simulated: true,
        id: `demo-${crypto.randomUUID()}`,
        message:
          "Correo simulado: el PDF se genero correctamente, pero no se envio un email real porque falta configurar RESEND_API_KEY e INVOICE_FROM_EMAIL.",
      });
    }

    const safeRecipientName = recipientName || recipientEmail;
    const safeMessage = message
      ? `<p style="margin:0 0 16px;color:#334155;line-height:1.7;">${escapeHtml(message)}</p>`
      : "";

    const html = `
      <!doctype html>
      <html>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#f8fafc;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
                  <tr>
                    <td style="padding:28px;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;">
                      <div style="font-size:28px;font-weight:800;">ContaNova</div>
                      <div style="margin-top:8px;font-size:15px;opacity:0.92;">${escapeHtml(documentLabelTitle)} adjunta lista para consulta</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px;">
                      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#0f172a;">${escapeHtml(documentLabelTitle)} ${escapeHtml(invoiceNumber)}</h1>
                      <p style="margin:0 0 16px;color:#334155;line-height:1.7;">
                        Hola ${escapeHtml(safeRecipientName)}, te compartimos tu ${escapeHtml(documentLabel)} emitida por <strong>${escapeHtml(companyName)}</strong>.
                      </p>
                      ${safeMessage}
                      <div style="padding:16px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;">
                        <p style="margin:0;color:#1e3a8a;font-size:14px;line-height:1.7;">
                          Encontraras el PDF adjunto en este correo para descargarlo o archivarlo.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;">
                      Enviado desde ContaNova. Este comprobante es comercial y no corresponde a una autorizacion tributaria del SRI.
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
      `Hola ${safeRecipientName},`,
      "",
      `Te compartimos la ${documentLabel} ${invoiceNumber} emitida por ${companyName}.`,
      message || "",
      "",
      "El PDF va adjunto en este correo.",
      "",
      "Enviado desde ContaNova.",
    ]
      .filter(Boolean)
      .join("\n");

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [recipientEmail],
        subject,
        html,
        text,
        attachments: [
          {
            filename,
            content: pdfBase64,
          },
        ],
      }),
    });

    const resendData = await resendResponse.json();
    if (!resendResponse.ok) {
      const providerError = String(resendData?.message || resendData?.error || "");
      const friendlyError = providerError.includes("You can only send testing emails")
        ? "Resend esta en modo prueba: con onboarding@resend.dev solo puedes enviar al correo dueño de la cuenta. Para enviar a clientes, verifica un dominio en Resend y configura INVOICE_FROM_EMAIL con ese dominio."
        : providerError;

      return json(
        {
          error: friendlyError || "El proveedor de correo rechazo el envio.",
        },
        resendResponse.status,
      );
    }

    return json({ success: true, id: resendData?.id || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el correo.";
    return json({ error: message }, 500);
  }
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
