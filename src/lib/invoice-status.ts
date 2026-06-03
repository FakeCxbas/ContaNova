export type CommercialInvoiceStatus =
  | "borrador"
  | "emitida"
  | "enviada"
  | "pagada"
  | "anulada"
  | "observada";

export type InvoiceDeliveryStatus = "pendiente" | "preparada" | "enviada";

export const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-muted text-muted-foreground border-muted" },
  emitida: { label: "Emitida", className: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800" },
  enviada: { label: "Correo enviado", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  pendiente_sri: { label: "Emitida", className: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800" },
  autorizada_sri: { label: "Emitida", className: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800" },
  rechazada_sri: { label: "Observada", className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800" },
  observada: { label: "Observada", className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800" },
  pagada: { label: "Pagada", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
  anulada: { label: "Anulada", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
};

export const invoiceDeliveryStatusConfig: Record<InvoiceDeliveryStatus, { label: string; className: string }> = {
  pendiente: { label: "Correo pendiente", className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800" },
  preparada: { label: "Correo preparado", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
  enviada: { label: "Correo enviado", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
};

export function normalizeInvoiceStatus(status: string | null | undefined): CommercialInvoiceStatus {
  switch (status) {
    case "pendiente_sri":
      return "emitida";
    case "autorizada_sri":
      return "emitida";
    case "rechazada_sri":
      return "observada";
    case "enviada":
      return "emitida";
    case "borrador":
    case "emitida":
    case "pagada":
    case "anulada":
    case "observada":
      return status;
    default:
      return "borrador";
  }
}

export function getInvoiceStatusMeta(status: string | null | undefined) {
  const normalized = normalizeInvoiceStatus(status);
  return invoiceStatusConfig[normalized];
}

export function getInvoiceDeliveryStatusMeta(status: string | null | undefined) {
  const normalized = status === "preparada" || status === "enviada" ? status : "pendiente";
  return invoiceDeliveryStatusConfig[normalized];
}

export function isPendingCollection(status: string | null | undefined) {
  const normalized = normalizeInvoiceStatus(status);
  return normalized === "emitida" || normalized === "borrador";
}
