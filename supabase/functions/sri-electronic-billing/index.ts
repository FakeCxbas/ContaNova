import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Environment = "pruebas" | "produccion";

type CompanyRow = {
  id: string;
  name: string;
  ruc: string;
  address: string;
  email: string;
  establecimiento: string;
  punto_emision: string;
  sri_environment?: Environment;
  sri_emission_enabled?: boolean;
  sri_certificate_path?: string | null;
  sri_certificate_password_ciphertext?: string | null;
  sri_certificate_password_iv?: string | null;
};

type InvoiceRow = {
  id: string;
  company_id: string;
  client_id: string | null;
  client_name: string;
  date: string;
  created_at?: string;
  document_type: string;
  number: string;
  subtotal: number;
  iva: number;
  total: number;
  sri_access_key?: string | null;
  sri_status?: string | null;
  sri_messages?: unknown;
};

type InvoiceItemRow = {
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  iva: number;
};

type ClientRow = {
  name: string;
  identification: string;
  address: string;
  email: string;
};

const SRI_ENDPOINTS: Record<Environment, { reception: string; authorization: string }> = {
  pruebas: {
    reception: "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
    authorization: "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
  },
  produccion: {
    reception: "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
    authorization: "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeXml = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const numericOnly = (value: string | null | undefined) => String(value ?? "").replace(/\D/g, "");

const money = (value: number) => Number(value || 0).toFixed(2);

const formatSriDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const formatAccessKeyDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}${month}${year}`;
};

const ecuadorDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
};

const compareDateOnly = (left: string, right: string) => left.localeCompare(right);

const sequentialFromNumber = (number: string) => {
  const match = number.match(/(\d{1,9})$/);
  return (match?.[1] || "1").padStart(9, "0");
};

const modulo11CheckDigit = (input: string) => {
  let factor = 2;
  let total = 0;
  for (let index = input.length - 1; index >= 0; index -= 1) {
    total += Number(input[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (total % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "1";
  return String(remainder);
};

const documentCode = (documentType: string) => {
  const codes: Record<string, string> = {
    factura: "01",
    nota_credito: "04",
    nota_debito: "05",
    guia_remision: "06",
    retencion: "07",
  };
  return codes[documentType] || "01";
};

const identificationType = (identification: string) => {
  const clean = numericOnly(identification);
  if (clean === "9999999999999") return "07";
  if (clean.length === 13) return "04";
  if (clean.length === 10) return "05";
  return "06";
};

const buildAccessKey = (params: {
  invoice: InvoiceRow;
  company: CompanyRow;
  environment: Environment;
}) => {
  const envCode = params.environment === "produccion" ? "2" : "1";
  const ruc = numericOnly(params.company.ruc).padStart(13, "0").slice(0, 13);
  const establishment = numericOnly(params.company.establecimiento || "001").padStart(3, "0").slice(0, 3);
  const emissionPoint = numericOnly(params.company.punto_emision || "001").padStart(3, "0").slice(0, 3);
  const sequential = sequentialFromNumber(params.invoice.number);
  const randomCode = numericOnly(`${Date.now()}`).slice(-8).padStart(8, "0");
  const core = [
    formatAccessKeyDate(params.invoice.date),
    documentCode(params.invoice.document_type),
    ruc,
    envCode,
    establishment,
    emissionPoint,
    sequential,
    randomCode,
    "1",
  ].join("");
  return `${core}${modulo11CheckDigit(core)}`;
};

const buildInvoiceXml = (params: {
  invoice: InvoiceRow;
  items: InvoiceItemRow[];
  company: CompanyRow;
  client: ClientRow | null;
  accessKey: string;
  environment: Environment;
}) => {
  const { invoice, items, company, client, accessKey, environment } = params;
  const establishment = numericOnly(company.establecimiento || "001").padStart(3, "0").slice(0, 3);
  const emissionPoint = numericOnly(company.punto_emision || "001").padStart(3, "0").slice(0, 3);
  const sequential = sequentialFromNumber(invoice.number);
  const buyerId = numericOnly(client?.identification || "9999999999999") || "9999999999999";
  const buyerName = client?.name || invoice.client_name || "Consumidor final";
  const envCode = environment === "produccion" ? "2" : "1";
  const taxSummary = items.reduce<Record<string, { rate: number; base: number; value: number }>>((summary, item) => {
    const rate = Number(item.iva || 0);
    const base = Number(item.quantity) * Number(item.price);
    const key = String(rate);
    if (!summary[key]) summary[key] = { rate, base: 0, value: 0 };
    summary[key].base += base;
    summary[key].value += base * (rate / 100);
    return summary;
  }, {});
  const totalTaxes = Object.values(taxSummary)
    .sort((a, b) => a.rate - b.rate)
    .map((tax) => [
      "      <totalImpuesto>",
      "        <codigo>2</codigo>",
      `        <codigoPorcentaje>${tax.rate > 0 ? "4" : "0"}</codigoPorcentaje>`,
      `        <baseImponible>${money(tax.base)}</baseImponible>`,
      `        <valor>${money(tax.value)}</valor>`,
      "      </totalImpuesto>",
    ].join("\n"))
    .join("\n");

  const details = items
    .map((item) => {
      const base = Number(item.quantity) * Number(item.price);
      const taxRate = Number(item.iva || 0);
      const taxValue = base * (taxRate / 100);
      return [
        "    <detalle>",
        `      <codigoPrincipal>${escapeXml(item.product_id || "SIN-CODIGO")}</codigoPrincipal>`,
        `      <descripcion>${escapeXml(item.product_name)}</descripcion>`,
        `      <cantidad>${money(Number(item.quantity))}</cantidad>`,
        `      <precioUnitario>${money(Number(item.price))}</precioUnitario>`,
        "      <descuento>0.00</descuento>",
        `      <precioTotalSinImpuesto>${money(base)}</precioTotalSinImpuesto>`,
        "      <impuestos>",
        "        <impuesto>",
        "          <codigo>2</codigo>",
        `          <codigoPorcentaje>${taxRate > 0 ? "4" : "0"}</codigoPorcentaje>`,
        `          <tarifa>${money(taxRate)}</tarifa>`,
        `          <baseImponible>${money(base)}</baseImponible>`,
        `          <valor>${money(taxValue)}</valor>`,
        "        </impuesto>",
        "      </impuestos>",
        "    </detalle>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<factura id="comprobante" version="1.1.0">',
    "  <infoTributaria>",
    `    <ambiente>${envCode}</ambiente>`,
    "    <tipoEmision>1</tipoEmision>",
    `    <razonSocial>${escapeXml(company.name)}</razonSocial>`,
    `    <nombreComercial>${escapeXml(company.name)}</nombreComercial>`,
    `    <ruc>${escapeXml(numericOnly(company.ruc))}</ruc>`,
    `    <claveAcceso>${accessKey}</claveAcceso>`,
    `    <codDoc>${documentCode(invoice.document_type)}</codDoc>`,
    `    <estab>${establishment}</estab>`,
    `    <ptoEmi>${emissionPoint}</ptoEmi>`,
    `    <secuencial>${sequential}</secuencial>`,
    `    <dirMatriz>${escapeXml(company.address)}</dirMatriz>`,
    "  </infoTributaria>",
    "  <infoFactura>",
    `    <fechaEmision>${formatSriDate(invoice.date)}</fechaEmision>`,
    `    <dirEstablecimiento>${escapeXml(company.address)}</dirEstablecimiento>`,
    "    <obligadoContabilidad>NO</obligadoContabilidad>",
    `    <tipoIdentificacionComprador>${identificationType(buyerId)}</tipoIdentificacionComprador>`,
    `    <razonSocialComprador>${escapeXml(buyerName)}</razonSocialComprador>`,
    `    <identificacionComprador>${escapeXml(buyerId)}</identificacionComprador>`,
    `    <totalSinImpuestos>${money(Number(invoice.subtotal))}</totalSinImpuestos>`,
    "    <totalDescuento>0.00</totalDescuento>",
    "    <totalConImpuestos>",
    totalTaxes,
    "    </totalConImpuestos>",
    "    <propina>0.00</propina>",
    `    <importeTotal>${money(Number(invoice.total))}</importeTotal>`,
    "    <moneda>DOLAR</moneda>",
    "    <pagos>",
    "      <pago>",
    "        <formaPago>20</formaPago>",
    `        <total>${money(Number(invoice.total))}</total>`,
    "      </pago>",
    "    </pagos>",
    "  </infoFactura>",
    "  <detalles>",
    details,
    "  </detalles>",
    "  <infoAdicional>",
    client?.email ? `    <campoAdicional nombre="Email">${escapeXml(client.email)}</campoAdicional>` : "",
    "  </infoAdicional>",
    "</factura>",
  ].filter(Boolean).join("\n");
};

const encodeBase64 = (value: string) => btoa(unescape(encodeURIComponent(value)));

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64ToBytes = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const extractTag = (xml: string, tag: string) => {
  const match = xml.match(new RegExp(`<[^:>]*:?${tag}[^>]*>([\\s\\S]*?)</[^:>]*:?${tag}>`, "i"));
  return match?.[1]?.trim() || "";
};

const extractMessages = (xml: string) => {
  const matches = [...xml.matchAll(/<mensaje>([\s\S]*?)<\/mensaje>/gi)];
  return matches.map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
};

async function decryptionKey() {
  const secret = Deno.env.get("SRI_CERTIFICATE_ENCRYPTION_KEY");
  if (!secret) {
    throw new Error("Falta configurar SRI_CERTIFICATE_ENCRYPTION_KEY para usar firmas electronicas cargadas por empresas.");
  }

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["decrypt"]);
}

async function decryptPassword(ciphertext: string, iv: string) {
  const key = await decryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}

async function getCompanyCertificate(
  supabase: ReturnType<typeof createClient>,
  company: CompanyRow,
) {
  if (!company.sri_certificate_path || !company.sri_certificate_password_ciphertext || !company.sri_certificate_password_iv) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from("sri-certificates")
    .download(company.sri_certificate_path);
  if (error || !data) {
    throw new Error(error?.message || "No se pudo leer la firma electronica de la empresa.");
  }

  const certificateBytes = new Uint8Array(await data.arrayBuffer());
  const password = await decryptPassword(
    company.sri_certificate_password_ciphertext,
    company.sri_certificate_password_iv,
  );

  return {
    certificateBase64: bytesToBase64(certificateBytes),
    certificatePassword: password,
  };
}

async function signXml(
  supabase: ReturnType<typeof createClient>,
  xml: string,
  company: CompanyRow,
  context: Record<string, unknown>,
) {
  const signerUrl = Deno.env.get("SRI_SIGNER_URL");
  if (!signerUrl) {
    return {
      signedXml: null,
      messages: [
        "XML generado y clave de acceso lista.",
        "Falta activar el servicio interno de firma electronica para firmar XAdES con el certificado del contribuyente.",
      ],
    };
  }

  const certificate = await getCompanyCertificate(supabase, company);
  if (!certificate) {
    return {
      signedXml: null,
      messages: [
        "XML generado y clave de acceso lista.",
        "Falta que la empresa suba su archivo de firma electronica .p12/.pfx y su clave desde Configuracion.",
      ],
    };
  }

  const response = await fetch(signerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(Deno.env.get("SRI_SIGNER_TOKEN") ? { Authorization: `Bearer ${Deno.env.get("SRI_SIGNER_TOKEN")}` } : {}),
    },
    body: JSON.stringify({ xml, ...certificate, ...context }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.signedXml) {
    throw new Error(data.error || data.message || "El servicio de firma no devolvio un XML firmado.");
  }
  return { signedXml: String(data.signedXml), messages: ["XML firmado correctamente."] };
}

async function receiveAtSri(signedXml: string, environment: Environment) {
  const soap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">',
    "  <soapenv:Header/>",
    "  <soapenv:Body>",
    "    <ec:validarComprobante>",
    `      <xml>${encodeBase64(signedXml)}</xml>`,
    "    </ec:validarComprobante>",
    "  </soapenv:Body>",
    "</soapenv:Envelope>",
  ].join("\n");

  const response = await fetch(SRI_ENDPOINTS[environment].reception, {
    method: "POST",
    headers: { "Content-Type": "text/xml;charset=UTF-8", SOAPAction: "" },
    body: soap,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Recepcion SRI fallo con HTTP ${response.status}.`);
  return { state: extractTag(text, "estado"), messages: extractMessages(text), raw: text };
}

async function authorizeAtSri(accessKey: string, environment: Environment) {
  const soap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">',
    "  <soapenv:Header/>",
    "  <soapenv:Body>",
    "    <ec:autorizacionComprobante>",
    `      <claveAccesoComprobante>${accessKey}</claveAccesoComprobante>`,
    "    </ec:autorizacionComprobante>",
    "  </soapenv:Body>",
    "</soapenv:Envelope>",
  ].join("\n");

  const response = await fetch(SRI_ENDPOINTS[environment].authorization, {
    method: "POST",
    headers: { "Content-Type": "text/xml;charset=UTF-8", SOAPAction: "" },
    body: soap,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Autorizacion SRI fallo con HTTP ${response.status}.`);
  return {
    state: extractTag(text, "estado"),
    authorizationNumber: extractTag(text, "numeroAutorizacion"),
    authorizedAt: extractTag(text, "fechaAutorizacion"),
    messages: extractMessages(text),
    raw: text,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, messages: ["No autorizado."] }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ ok: false, messages: ["No autorizado."] }, 401);

    const { action = "emit", invoiceId } = await req.json();
    if (!invoiceId) return json({ ok: false, messages: ["Falta invoiceId."] }, 400);

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userData.user.id)
      .single();
    if (!profile?.company_id) return json({ ok: false, messages: ["No se encontro empresa del usuario."] }, 403);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();
    if (invoiceError || !invoice) return json({ ok: false, messages: ["Factura no encontrada."] }, 404);
    if (invoice.company_id !== profile.company_id) return json({ ok: false, messages: ["No tienes permiso sobre esta factura."] }, 403);

    const { data: company } = await supabase.from("companies").select("*").eq("id", invoice.company_id).single();
    const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id);
    const { data: client } = invoice.client_id
      ? await supabase.from("clients").select("*").eq("id", invoice.client_id).single()
      : { data: null };

    if (!company) return json({ ok: false, messages: ["Empresa no encontrada."] }, 400);
    if (!items?.length) return json({ ok: false, messages: ["La factura no tiene lineas para emitir."] }, 400);

    const todayEcuador = ecuadorDateString();
    if (compareDateOnly(invoice.date, todayEcuador) > 0) {
      return json({
        ok: false,
        status: "error",
        messages: [
          `La fecha de emision ${invoice.date} esta por delante de la fecha actual en Ecuador (${todayEcuador}). Corrige la fecha y vuelve a enviar al SRI.`,
        ],
      }, 400);
    }

    const environment = ((company.sri_environment || "pruebas") as Environment);
    if (environment === "produccion" && !company.sri_emission_enabled) {
      return json({
        ok: false,
        status: "error",
        environment,
        messages: ["La emision en PRODUCCION esta desactivada para esta empresa."],
      }, 400);
    }

    const previousMessages = JSON.stringify(invoice.sri_messages || []).toUpperCase();
    const accessKeyDateMismatch = !!invoice.sri_access_key
      && invoice.sri_access_key.slice(0, 8) !== formatAccessKeyDate(invoice.date);
    const mustRegenerateAccessKey =
      accessKeyDateMismatch
      || (invoice.sri_status === "no_autorizada" && previousMessages.includes("FIRMA INVALIDA"))
      || (invoice.sri_status === "devuelta" && previousMessages.includes("FECHA EMISION EXTEMPORANEA"));
    const accessKey = !mustRegenerateAccessKey && invoice.sri_access_key
      ? invoice.sri_access_key
      : buildAccessKey({ invoice, company, environment });

    if (action === "check_authorization") {
      const authorization = await authorizeAtSri(accessKey, environment);
      const sriStatus = authorization.state === "AUTORIZADO" ? "autorizada" : "no_autorizada";
      await supabase.from("invoices").update({
        sri_environment: environment,
        sri_status: sriStatus,
        sri_access_key: accessKey,
        sri_authorization_number: authorization.authorizationNumber || null,
        sri_authorized_at: authorization.authorizedAt || null,
        sri_messages: authorization.messages,
        status: sriStatus === "autorizada" ? "emitida" : invoice.status,
      }).eq("id", invoice.id);

      return json({
        ok: sriStatus === "autorizada",
        status: sriStatus,
        accessKey,
        authorizationNumber: authorization.authorizationNumber || null,
        authorizedAt: authorization.authorizedAt || null,
        environment,
        messages: authorization.messages.length ? authorization.messages : [`Estado SRI: ${authorization.state || "SIN RESPUESTA"}`],
      });
    }

    const xml = buildInvoiceXml({
      invoice,
      items,
      company,
      client,
      accessKey,
      environment,
    });

    const signature = await signXml(supabase, xml, company, {
      accessKey,
      invoiceId: invoice.id,
      companyId: company.id,
      ruc: company.ruc,
      documentType: invoice.document_type,
    });
    if (!signature.signedXml) {
      await supabase.from("invoices").update({
        sri_environment: environment,
        sri_status: "pendiente_firma",
        sri_access_key: accessKey,
        sri_xml: xml,
        sri_messages: signature.messages,
      }).eq("id", invoice.id);

      return json({
        ok: false,
        status: "pendiente_firma",
        accessKey,
        environment,
        messages: signature.messages,
        requiresConfiguration: true,
      });
    }

    const reception = await receiveAtSri(signature.signedXml, environment);
    if (reception.state !== "RECIBIDA") {
      await supabase.from("invoices").update({
        sri_environment: environment,
        sri_status: "devuelta",
        sri_access_key: accessKey,
        sri_xml: signature.signedXml,
        sri_messages: reception.messages,
      }).eq("id", invoice.id);

      return json({
        ok: false,
        status: "devuelta",
        accessKey,
        environment,
        messages: reception.messages.length ? reception.messages : [`Recepcion SRI: ${reception.state || "SIN RESPUESTA"}`],
      });
    }

    const authorization = await authorizeAtSri(accessKey, environment);
    const sriStatus = authorization.state === "AUTORIZADO" ? "autorizada" : "no_autorizada";
    const messages = [
      ...signature.messages,
      ...(reception.messages.length ? reception.messages : ["Comprobante recibido por el SRI."]),
      ...(authorization.messages.length ? authorization.messages : [`Autorizacion SRI: ${authorization.state || "SIN RESPUESTA"}`]),
    ];

    await supabase.from("invoices").update({
      sri_environment: environment,
      sri_status: sriStatus,
      sri_access_key: accessKey,
      sri_authorization_number: authorization.authorizationNumber || null,
      sri_authorized_at: authorization.authorizedAt || null,
      sri_xml: signature.signedXml,
      sri_messages: messages,
      status: sriStatus === "autorizada" ? "emitida" : invoice.status,
    }).eq("id", invoice.id);

    return json({
      ok: sriStatus === "autorizada",
      status: sriStatus,
      accessKey,
      authorizationNumber: authorization.authorizationNumber || null,
      authorizedAt: authorization.authorizedAt || null,
      environment,
      messages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo emitir el comprobante.";
    return json({ ok: false, status: "error", messages: [message] }, 500);
  }
});
