import type { Tables } from "@/integrations/supabase/types";
import type { DocumentType, Invoice, InvoiceItem } from "./invoiceService";

type Company = Tables<"companies">;
type Client = Tables<"clients">;

export type ReadinessItem = {
  key: string;
  label: string;
  ready: boolean;
};

export type ElectronicValidation = {
  ok: boolean;
  items: ReadinessItem[];
  errors: string[];
};

export type StoredElectronicDocument = {
  invoiceId: string;
  environment: "PRUEBAS";
  status: "pendiente_sri" | "autorizada_sri" | "rechazada_sri";
  accessKey: string;
  authorizationNumber?: string;
  processedAt: string;
  xml: string;
  messages: string[];
};

const STORAGE_PREFIX = "contanova:e-doc:";

const DOC_CODES: Record<DocumentType, string> = {
  factura: "01",
  nota_credito: "04",
  nota_debito: "05",
  guia_remision: "06",
  retencion: "07",
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const numericOnly = (value: string) => value.replace(/\D/g, "");

const formatDateForAccessKey = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}${month}${year}`;
};

const getSequentialFromNumber = (number: string) => {
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

export const electronicBillingService = {
  getCompanyReadiness(company: Company | null | undefined): ElectronicValidation {
    const items: ReadinessItem[] = [
      { key: "name", label: "Razon social configurada", ready: !!company?.name?.trim() },
      { key: "ruc", label: "RUC de 13 digitos", ready: /^\d{13}$/.test(company?.ruc || "") },
      { key: "address", label: "Direccion del establecimiento", ready: !!company?.address?.trim() },
      { key: "email", label: "Correo de emision", ready: !!company?.email?.trim() },
      { key: "establishment", label: "Codigo de establecimiento", ready: /^\d{3}$/.test((company?.establecimiento || "").padStart(3, "0")) },
      { key: "emissionPoint", label: "Punto de emision", ready: /^\d{3}$/.test((company?.punto_emision || "").padStart(3, "0")) },
    ];

    const errors = items.filter((item) => !item.ready).map((item) => item.label);
    return { ok: errors.length === 0, items, errors };
  },

  validateEmission(company: Company | null | undefined, client: Client | null | undefined, documentType: DocumentType, items: InvoiceItem[]): ElectronicValidation {
    const readiness = this.getCompanyReadiness(company);
    const extraItems: ReadinessItem[] = [
      { key: "client_name", label: "Cliente con nombre o razon social", ready: !!client?.name?.trim() || documentType !== "factura" },
      { key: "client_identification", label: "Cliente con identificacion", ready: !!numericOnly(client?.identification || "") || documentType !== "factura" },
      { key: "items", label: "Comprobante con al menos una linea", ready: items.length > 0 || documentType === "retencion" || documentType === "guia_remision" },
    ];

    const mergedItems = [...readiness.items, ...extraItems];
    const errors = mergedItems.filter((item) => !item.ready).map((item) => item.label);
    return {
      ok: errors.length === 0,
      items: mergedItems,
      errors,
    };
  },

  buildAccessKey(params: {
    date: string;
    documentType: DocumentType;
    ruc: string;
    environment?: "1" | "2";
    establishment: string;
    emissionPoint: string;
    sequential: string;
    randomCode?: string;
    emissionType?: "1";
  }) {
    const date = formatDateForAccessKey(params.date);
    const docCode = DOC_CODES[params.documentType];
    const ruc = numericOnly(params.ruc).padStart(13, "0").slice(0, 13);
    const environment = params.environment || "1";
    const establishment = numericOnly(params.establishment).padStart(3, "0").slice(0, 3);
    const emissionPoint = numericOnly(params.emissionPoint).padStart(3, "0").slice(0, 3);
    const sequential = numericOnly(params.sequential).padStart(9, "0").slice(0, 9);
    const randomCode = numericOnly(params.randomCode || `${Date.now()}`).slice(-8).padStart(8, "0");
    const emissionType = params.emissionType || "1";
    const core = `${date}${docCode}${ruc}${environment}${establishment}${emissionPoint}${sequential}${randomCode}${emissionType}`;
    return `${core}${modulo11CheckDigit(core)}`;
  },

  generateInvoiceXml(params: {
    invoice: Invoice;
    items: InvoiceItem[];
    company: Company;
    client?: Client | null;
    accessKey: string;
    environment?: "PRUEBAS";
  }) {
    const { invoice, items, company, client, accessKey } = params;
    const details = items
      .map((item) => {
        const subtotal = (item.quantity * Number(item.price)).toFixed(2);
        return [
          "    <detalle>",
          `      <codigoPrincipal>${escapeXml(item.product_id || "SIN-CODIGO")}</codigoPrincipal>`,
          `      <descripcion>${escapeXml(item.product_name)}</descripcion>`,
          `      <cantidad>${item.quantity}</cantidad>`,
          `      <precioUnitario>${Number(item.price).toFixed(2)}</precioUnitario>`,
          `      <descuento>0.00</descuento>`,
          `      <precioTotalSinImpuesto>${subtotal}</precioTotalSinImpuesto>`,
          "    </detalle>",
        ].join("\n");
      })
      .join("\n");

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<comprobante ambiente="1" tipo="${DOC_CODES[invoice.document_type as DocumentType] || "01"}">`,
      "  <infoTributaria>",
      `    <razonSocial>${escapeXml(company.name)}</razonSocial>`,
      `    <ruc>${escapeXml(company.ruc)}</ruc>`,
      `    <claveAcceso>${accessKey}</claveAcceso>`,
      `    <estab>${escapeXml((company.establecimiento || "001").padStart(3, "0"))}</estab>`,
      `    <ptoEmi>${escapeXml((company.punto_emision || "001").padStart(3, "0"))}</ptoEmi>`,
      `    <secuencial>${escapeXml(getSequentialFromNumber(invoice.number))}</secuencial>`,
      "  </infoTributaria>",
      "  <infoComprobante>",
      `    <fechaEmision>${escapeXml(invoice.date)}</fechaEmision>`,
      `    <dirEstablecimiento>${escapeXml(company.address || "")}</dirEstablecimiento>`,
      `    <razonSocialComprador>${escapeXml(client?.name || invoice.client_name)}</razonSocialComprador>`,
      `    <identificacionComprador>${escapeXml(client?.identification || "9999999999999")}</identificacionComprador>`,
      `    <totalSinImpuestos>${Number(invoice.subtotal).toFixed(2)}</totalSinImpuestos>`,
      `    <importeTotal>${Number(invoice.total).toFixed(2)}</importeTotal>`,
      "  </infoComprobante>",
      "  <detalles>",
      details,
      "  </detalles>",
      "</comprobante>",
    ].join("\n");
  },

  processMockEmission(params: {
    invoice: Invoice;
    items: InvoiceItem[];
    company: Company;
    client?: Client | null;
  }): StoredElectronicDocument {
    const { invoice, items, company, client } = params;
    const validation = this.validateEmission(company, client, invoice.document_type as DocumentType, items);
    const sequential = getSequentialFromNumber(invoice.number);
    const accessKey = this.buildAccessKey({
      date: invoice.date,
      documentType: invoice.document_type as DocumentType,
      ruc: company.ruc || "",
      establishment: company.establecimiento || "001",
      emissionPoint: company.punto_emision || "001",
      sequential,
    });
    const xml = this.generateInvoiceXml({ invoice, items, company, client, accessKey });

    const document: StoredElectronicDocument = {
      invoiceId: invoice.id,
      environment: "PRUEBAS",
      status: validation.ok ? "autorizada_sri" : "rechazada_sri",
      accessKey,
      authorizationNumber: validation.ok ? accessKey : undefined,
      processedAt: new Date().toISOString(),
      xml,
      messages: validation.ok
        ? [
            "Documento estructurado correctamente.",
            "Firma electronica pendiente de integracion real.",
            "Autorizacion simulada en ambiente de pruebas.",
          ]
        : validation.errors.map((error) => `Falta: ${error}`),
    };

    this.saveDocument(document);
    return document;
  },

  saveDocument(document: StoredElectronicDocument) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`${STORAGE_PREFIX}${document.invoiceId}`, JSON.stringify(document));
  },

  getDocument(invoiceId: string) {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${invoiceId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredElectronicDocument;
    } catch {
      return null;
    }
  },
};
