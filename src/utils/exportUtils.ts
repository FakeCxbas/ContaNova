import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Core helpers ───

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── CSV ───

export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers?: Record<string, string>
) {
  if (data.length === 0) return;
  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerRow = headers ? Object.values(headers) : keys;

  const rows = data.map((row) =>
    keys
      .map((key) => {
        const val = row[key];
        const str = val === null || val === undefined ? "" : String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(",")
  );

  const csv = [headerRow.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

// ─── Excel (XLSX) ───

export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  headers?: Record<string, string>,
  sheetName = "Datos"
) {
  if (data.length === 0) return;
  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerLabels = headers ? Object.values(headers) : keys;

  const rows = data.map((row) => keys.map((k) => row[k] ?? ""));
  const ws = XLSX.utils.aoa_to_sheet([headerLabels, ...rows]);

  // Auto-size columns
  ws["!cols"] = headerLabels.map((h) => ({ wch: Math.max(h.length + 2, 14) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportMultiSheetExcel(
  sheets: { name: string; headers: string[]; rows: (string | number)[][] }[],
  filename: string
) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    ws["!cols"] = sheet.headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── PDF ───

export function exportToPDF(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  options?: { orientation?: "portrait" | "landscape"; subtitle?: string }
) {
  const doc = new jsPDF({
    orientation: options?.orientation || "portrait",
    unit: "mm",
    format: "a4",
  });

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 20);

  if (options?.subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(options.subtitle, 14, 27);
    doc.setTextColor(0);
  }

  const startY = options?.subtitle ? 33 : 28;

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [41, 98, 255],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 10, left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `ContaNova — Generado: ${today()} — Pág. ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${filename}.pdf`);
}

// ─── Shortcut functions for modules ───

const INVOICE_HEADERS: Record<string, string> = {
  fecha: "Fecha",
  tipo: "Tipo",
  numero: "Número",
  cliente: "Cliente",
  subtotal: "Subtotal",
  iva: "IVA",
  total: "Total",
  estado: "Estado",
};

type InvoiceExport = {
  date: string;
  client: string;
  number: string;
  type?: string;
  subtotal: number;
  iva: number;
  total: number;
  status: string;
};

function mapInvoices(invoices: InvoiceExport[]) {
  return invoices.map((inv) => ({
    fecha: inv.date,
    tipo: inv.type || "Factura",
    numero: inv.number,
    cliente: inv.client,
    subtotal: inv.subtotal.toFixed(2),
    iva: inv.iva.toFixed(2),
    total: inv.total.toFixed(2),
    estado: inv.status,
  }));
}

export function exportInvoicesToCSV(invoices: InvoiceExport[]) {
  exportToCSV(mapInvoices(invoices), `facturas_${today()}`, INVOICE_HEADERS);
}

export function exportInvoicesToExcel(invoices: InvoiceExport[]) {
  exportToExcel(mapInvoices(invoices), `facturas_${today()}`, INVOICE_HEADERS, "Facturas");
}

export function exportInvoicesToPDF(invoices: InvoiceExport[]) {
  const headers = Object.values(INVOICE_HEADERS);
  const rows = mapInvoices(invoices).map((r) => Object.values(r));
  exportToPDF("Reporte de Facturas", headers, rows, `facturas_${today()}`, {
    orientation: "landscape",
    subtitle: `${invoices.length} comprobantes — Generado el ${today()}`,
  });
}

const CLIENT_HEADERS: Record<string, string> = {
  nombre: "Nombre",
  identificacion: "Identificación",
  email: "Email",
  telefono: "Teléfono",
  direccion: "Dirección",
};

type ClientExport = {
  name: string;
  identification: string;
  email: string;
  phone: string;
  address: string;
};

function mapClients(clients: ClientExport[]) {
  return clients.map((c) => ({
    nombre: c.name,
    identificacion: c.identification,
    email: c.email,
    telefono: c.phone,
    direccion: c.address,
  }));
}

export function exportClientsToCSV(clients: ClientExport[]) {
  exportToCSV(mapClients(clients), `clientes_${today()}`, CLIENT_HEADERS);
}

export function exportClientsToExcel(clients: ClientExport[]) {
  exportToExcel(mapClients(clients), `clientes_${today()}`, CLIENT_HEADERS, "Clientes");
}

export function exportClientsToPDF(clients: ClientExport[]) {
  const headers = Object.values(CLIENT_HEADERS);
  const rows = mapClients(clients).map((r) => Object.values(r));
  exportToPDF("Directorio de Clientes", headers, rows, `clientes_${today()}`, {
    subtitle: `${clients.length} clientes — Generado el ${today()}`,
  });
}

type ReportData = {
  monthlySales: { month: string; ventas: number; iva: number }[];
  monthlyInvoices: { month: string; facturas: number }[];
  paymentsByMonth: { month: string; pagos: number }[];
  topClients: { cliente: string; total: number }[];
};

export function exportReportsToExcel(data: ReportData) {
  exportMultiSheetExcel(
    [
      {
        name: "Ventas por Mes",
        headers: ["Mes", "Ventas", "IVA"],
        rows: data.monthlySales.map((r) => [r.month, r.ventas, r.iva]),
      },
      {
        name: "Facturas por Mes",
        headers: ["Mes", "Facturas"],
        rows: data.monthlyInvoices.map((r) => [r.month, r.facturas]),
      },
      {
        name: "Pagos por Mes",
        headers: ["Mes", "Pagos"],
        rows: data.paymentsByMonth.map((r) => [r.month, r.pagos]),
      },
      {
        name: "Top Clientes",
        headers: ["Cliente", "Total"],
        rows: data.topClients.map((r) => [r.cliente, r.total]),
      },
    ],
    `reportes_${today()}`
  );
}

export function exportReportsToCSV(data: ReportData) {
  const rows = data.monthlySales.map((r) => ({
    mes: r.month,
    ventas: r.ventas.toFixed(2),
    iva: r.iva.toFixed(2),
  }));
  exportToCSV(rows, `ventas_${today()}`, { mes: "Mes", ventas: "Ventas", iva: "IVA" });
}

export function exportReportsToPDF(data: ReportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte Financiero", 14, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Generado el ${today()}`, 14, 27);
  doc.setTextColor(0);

  let y = 35;

  // Sales
  autoTable(doc, {
    head: [["Mes", "Ventas ($)", "IVA ($)"]],
    body: data.monthlySales.map((r) => [r.month, r.ventas.toFixed(2), r.iva.toFixed(2)]),
    startY: y,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {},
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Top clients
  autoTable(doc, {
    head: [["Cliente", "Total ($)"]],
    body: data.topClients.map((r) => [r.cliente, r.total.toFixed(2)]),
    startY: y,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [99, 70, 207], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `ContaNova — Pág. ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`reporte_financiero_${today()}.pdf`);
}
