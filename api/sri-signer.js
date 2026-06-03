import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  signInvoiceXml,
  signCreditNoteXml,
  signDebitNoteXml,
  signDeliveryGuideXml,
  signWithholdingCertificateXml,
} = require("ec-sri-invoice-signer");

const MAX_BODY_BYTES = 7 * 1024 * 1024;

const signersByDocumentType = {
  factura: signInvoiceXml,
  nota_credito: signCreditNoteXml,
  nota_debito: signDebitNoteXml,
  guia_remision: signDeliveryGuideXml,
  retencion: signWithholdingCertificateXml,
};

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const readBody = async (req) => {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      throw new Error("Solicitud demasiado grande.");
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
};

export default async function handler(req, res) {
  if (req.method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      service: "contanova-sri-signer",
      engine: "ec-sri-invoice-signer",
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Metodo no permitido." });
  }

  const expectedToken = process.env.SRI_SIGNER_TOKEN;
  if (expectedToken && req.headers.authorization !== `Bearer ${expectedToken}`) {
    return sendJson(res, 401, { error: "No autorizado." });
  }

  try {
    const rawBody = typeof req.body === "string" ? req.body : await readBody(req);
    const payload = typeof req.body === "object" && req.body !== null ? req.body : JSON.parse(rawBody);
    const xml = String(payload.xml || "");
    const certificateBase64 = String(payload.certificateBase64 || "");
    const certificatePassword = String(payload.certificatePassword || "");
    const documentType = String(payload.documentType || "factura");
    const signDocument = signersByDocumentType[documentType] || signInvoiceXml;

    if (!xml || !certificateBase64 || !certificatePassword) {
      return sendJson(res, 400, { error: "Faltan xml, certificateBase64 o certificatePassword." });
    }

    const certificate = Buffer.from(certificateBase64, "base64");
    const signedXml = signDocument(xml, certificate, { pkcs12Password: certificatePassword });
    return sendJson(res, 200, { signedXml });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo firmar el XML.";
    return sendJson(res, 500, { error: `No se pudo firmar el XML: ${message}` });
  }
}
