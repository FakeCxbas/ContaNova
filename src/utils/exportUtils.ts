import { getEcuadorDateString } from "@/lib/date";

type JsPdfWithAutoTable = {
  setFontSize: (size: number) => void;
  setFont: (fontName: string, fontStyle: string) => void;
  text: (text: string, x: number, y: number, options?: unknown) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setFillColor: (r: number, g?: number, b?: number) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  setLineWidth: (width: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  rect: (x: number, y: number, width: number, height: number, style?: string) => void;
  roundedRect: (x: number, y: number, width: number, height: number, rx: number, ry: number, style?: string) => void;
  addImage: (imageData: string, format: string, x: number, y: number, width: number, height: number) => void;
  splitTextToSize: (text: string, maxWidth: number) => string[];
  output: (type: "blob") => Blob;
  save: (filename: string) => void;
  getNumberOfPages: () => number;
  setPage: (pageNumber: number) => void;
  internal: {
    pageSize: {
      height: number;
      width: number;
    };
  };
  lastAutoTable?: {
    finalY: number;
  };
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

type ClientExport = {
  name: string;
  identification: string;
  email: string;
  phone: string;
  address: string;
};

type ReportData = {
  monthlySales: { month: string; ventas: number; iva: number }[];
  monthlyInvoices: { month: string; facturas: number }[];
  paymentsByMonth: { month: string; pagos: number }[];
  topClients: { cliente: string; total: number }[];
};

export type InvoicePdfPayload = {
  company: {
    name: string;
    ruc?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    establishment?: string | null;
    emissionPoint?: string | null;
    accountingRequired?: boolean | null;
    logoUrl?: string | null;
  };
  client: {
    name: string;
    identification?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  invoice: {
    number: string;
    date: string;
    type: string;
    status: string;
    subtotal: number;
    iva: number;
    total: number;
    paymentStatus?: string;
    deliveryStatus?: string;
    totalPaid?: number;
    balance?: number;
    sriEnvironment?: string | null;
    sriAccessKey?: string | null;
    sriAuthorizationNumber?: string | null;
    sriAuthorizedAt?: string | null;
  };
  items: {
    name: string;
    quantity: number;
    price: number;
    iva: number;
    subtotal: number;
  }[];
};

const INVOICE_HEADERS: Record<string, string> = {
  fecha: "Fecha",
  tipo: "Tipo",
  numero: "Numero",
  cliente: "Cliente",
  subtotal: "Subtotal",
  iva: "IVA",
  total: "Total",
  estado: "Estado",
};

const CLIENT_HEADERS: Record<string, string> = {
  nombre: "Nombre",
  identificacion: "Identificacion",
  email: "Email",
  telefono: "Telefono",
  direccion: "Direccion",
};

async function loadXLSX() {
  return import("xlsx");
}

async function loadPdfTools() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  return { jsPDF, autoTable };
}

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
  return getEcuadorDateString();
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

async function loadImageForPdf(url?: string | null) {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("No se pudo cargar el logo."));
      };
      reader.onerror = () => reject(new Error("No se pudo cargar el logo."));
      reader.readAsDataURL(blob);
    });
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("No se pudo leer el logo."));
      element.src = dataUrl;
    });
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = width;
    canvas.height = height;

    if (!context) {
      const format = dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg") ? "JPEG" : "PNG";
      return { dataUrl, format, width, height };
    }

    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const red = pixels[offset];
        const green = pixels[offset + 1];
        const blue = pixels[offset + 2];
        const alpha = pixels[offset + 3];
        const isVisible = alpha > 16 && (red < 245 || green < 245 || blue < 245);

        if (isVisible) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (minX <= maxX && minY <= maxY) {
      const cropPadding = 8;
      const cropX = Math.max(0, minX - cropPadding);
      const cropY = Math.max(0, minY - cropPadding);
      const cropWidth = Math.min(width - cropX, maxX - minX + cropPadding * 2);
      const cropHeight = Math.min(height - cropY, maxY - minY + cropPadding * 2);
      const croppedCanvas = document.createElement("canvas");
      const croppedContext = croppedCanvas.getContext("2d");
      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;
      croppedContext?.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

      return { dataUrl: croppedCanvas.toDataURL("image/png"), format: "PNG", width: cropWidth, height: cropHeight };
    }

    const format = dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg") ? "JPEG" : "PNG";
    return { dataUrl, format, width, height };
  } catch {
    return null;
  }
}

function formatAuthorizationDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function sriSequence(number: string) {
  const match = number.match(/(\d{3})-(\d{3})-(\d{9})$/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const fallback = number.match(/(\d{1,9})$/)?.[1] || "1";
  return fallback.padStart(9, "0");
}

function sriStatusLabel(payload: InvoicePdfPayload) {
  if (payload.invoice.sriAuthorizationNumber) return "Autorizado";
  if (payload.invoice.sriAccessKey) return "Pendiente SRI";
  return "Sin emitir";
}

function groupLongCode(value: string, groupSize = 4) {
  return value.replace(/\s+/g, "").replace(new RegExp(`(.{${groupSize}})`, "g"), "$1 ").trim();
}

function identificationLabel(value?: string | null) {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length === 13) return "RUC";
  if (digits.length === 10) return "Cedula";
  return "ID";
}

async function buildInvoicePdfDocument(payload: InvoicePdfPayload) {
  const { jsPDF, autoTable } = await loadPdfTools();
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  }) as JsPdfWithAutoTable;

  if (payload.invoice.number === "__legacy_contanova_layout__") {
    const left = 14;
    const right = 196;
    const top = 14;
    const gap = 3;
    const contentWidth = right - left;
    const leftCol = 100;
    const rightCol = contentWidth - leftCol - gap;
    const rightX = left + leftCol + gap;
    const accessKey = payload.invoice.sriAccessKey || "";
    const authorizationNumber = payload.invoice.sriAuthorizationNumber || accessKey || "";
    const documentNumber = sriSequence(payload.invoice.number);
    const environment = (payload.invoice.sriEnvironment || "").toLowerCase().includes("prod") ? "PRODUCCION" : "PRUEBAS";

    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);
    doc.setLineWidth(0.25);

    const box = (x: number, y: number, width: number, height: number) => doc.rect(x, y, width, height);
    const labelValue = (label: string, value: string, x: number, y: number, labelW = 24) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(label, x, y);
      doc.setFont("helvetica", "normal");
      doc.text(value || "-", x + labelW, y);
    };
    const wrappedLabelValue = (label: string, value: string, x: number, y: number, labelW = 25, width = 65) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(label, x, y);
      doc.setFont("helvetica", "normal");
      doc.splitTextToSize(value || "-", width).slice(0, 2).forEach((line, index) => {
        doc.text(line, x + labelW, y + index * 4);
      });
    };
    const drawAccessKeyBars = (value: string, x: number, y: number, width: number, height: number) => {
      if (!value) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text("Pendiente de autorizacion", x + width / 2, y + height / 2, { align: "center" } as never);
        return;
      }
      let cursor = x;
      value.split("").forEach((char, index) => {
        const numeric = Number(char);
        const bar = 0.35 + ((Number.isNaN(numeric) ? char.charCodeAt(0) : numeric) % 3) * 0.18;
        const space = index % 4 === 0 ? 0.28 : 0.18;
        if (cursor + bar > x + width) return;
        doc.setFillColor(0, 0, 0);
        doc.rect(cursor, y, bar, height, "F");
        cursor += bar + space;
      });
    };

    doc.setFillColor(250, 250, 250);
    box(left, top, leftCol, 32);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(payload.company.name || "ContaNova", left + 6, top + 16);
    doc.setFontSize(8);
    doc.text("DOCUMENTO ELECTRONICO", left + 6, top + 24);

    box(left, top + 35, leftCol, 63);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(payload.company.name || "Empresa", left + 2, top + 42);
    wrappedLabelValue("DIRECCION\nMATRIZ", payload.company.address || "", left + 2, top + 54, 25, 70);
    wrappedLabelValue("DIRECCION\nSUCURSAL", payload.company.address || "", left + 2, top + 67, 25, 70);
    labelValue("TELEFONO", payload.company.phone || "", left + 2, top + 82, 24);
    labelValue("EMAIL", payload.company.email || "", left + 2, top + 90, 24);
    labelValue("OBLIGADO A LLEVAR CONTABILIDAD", payload.company.accountingRequired ? "SI" : "NO", left + 2, top + 97, 62);

    box(rightX, top, rightCol, 98);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.splitTextToSize(payload.company.name || "Empresa", rightCol - 5).slice(0, 3).forEach((line, index) => {
      doc.text(line, rightX + 2, top + 5 + index * 4);
    });
    doc.setFontSize(7);
    doc.text(`RUC: ${payload.company.ruc || ""}`, rightX + 2, top + 22);
    doc.setFontSize(10);
    doc.text(payload.invoice.type.toUpperCase(), rightX + 2, top + 31);
    doc.setFontSize(7);
    doc.text(`No. ${documentNumber}`, rightX + 2, top + 39);
    doc.text("NUMERO DE AUTORIZACION", rightX + 2, top + 49);
    doc.setFont("helvetica", "normal");
    doc.text(authorizationNumber || "PENDIENTE", rightX + 2, top + 57);
    labelValue("AMBIENTE :", environment, rightX + 2, top + 68, 20);
    labelValue("EMISION :", "NORMAL", rightX + 2, top + 76, 20);
    doc.setFont("helvetica", "bold");
    doc.text("FECHA Y HORA DE", rightX + 2, top + 84);
    doc.text("AUTORIZACION:", rightX + 2, top + 88);
    doc.setFont("helvetica", "normal");
    doc.text(formatAuthorizationDate(payload.invoice.sriAuthorizedAt) || "PENDIENTE", rightX + 32, top + 86);
    doc.setFont("helvetica", "bold");
    doc.text("CLAVE DE ACCESO", rightX + rightCol / 2, top + 82, { align: "center" } as never);
    drawAccessKeyBars(accessKey, rightX + 4, top + 86, rightCol - 8, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(accessKey || "PENDIENTE", rightX + rightCol / 2, top + 99, { align: "center" } as never);

    const clientY = 116;
    box(left, clientY, contentWidth, 27);
    labelValue("Razon Social / Nombre Apellidos :", payload.client.name, left + 2, clientY + 6, 50);
    labelValue("Fecha Emision :", payload.invoice.date, left + 2, clientY + 14, 35);
    labelValue("Identificacion :", payload.client.identification || "", left + 88, clientY + 14, 30);
    labelValue("Telefono :", payload.client.phone || "", left + 2, clientY + 22, 22);
    labelValue("Celular :", payload.client.phone || "", left + 54, clientY + 22, 22);
    labelValue("Email :", payload.client.email || "", left + 105, clientY + 22, 16);
    labelValue("Direccion :", payload.client.address || "", left + 2, clientY + 30, 22);

    autoTable(doc as never, {
      head: [["Codigo", "Cantidad", "Descripcion", "Precio", "Descuento", "Precio Total"]],
      body: payload.items.map((item, index) => [
        String(index + 1).padStart(3, "0"),
        String(item.quantity),
        item.name,
        formatCurrency(item.price),
        "$ 0.00",
        formatCurrency(item.subtotal),
      ]),
      startY: 147,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.6, textColor: 0, lineColor: 0, lineWidth: 0.15 },
      headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { halign: "center", cellWidth: 20 },
        1: { halign: "center", cellWidth: 18 },
        2: { cellWidth: 86 },
        3: { halign: "right", cellWidth: 20 },
        4: { halign: "right", cellWidth: 20 },
        5: { halign: "right", cellWidth: 18 },
      },
      margin: { left, right: 14 },
    });

    const tableEndY = Math.max(doc.lastAutoTable?.finalY || 158, 166) + 2;
    const paymentW = 102;
    const totalW = 80;
    box(left, tableEndY, paymentW, 11);
    doc.line(left, tableEndY + 5, left + paymentW, tableEndY + 5);
    doc.line(left + paymentW - 22, tableEndY, left + paymentW - 22, tableEndY + 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Formas de pago", left + paymentW / 2 - 8, tableEndY + 3.5, { align: "center" } as never);
    doc.text("Valor", left + paymentW - 5, tableEndY + 3.5, { align: "right" } as never);
    doc.setFont("helvetica", "normal");
    doc.text("20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO", left + 2, tableEndY + 9);
    doc.text(formatCurrency(payload.invoice.total), left + paymentW - 5, tableEndY + 9, { align: "right" } as never);

    const taxable15Subtotal = payload.items
      .filter((item) => Number(item.iva) > 0)
      .reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const zeroSubtotal = payload.items
      .filter((item) => Number(item.iva) === 0)
      .reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const ivaLabel = payload.items.some((item) => Number(item.iva) > 0 && Number(item.iva) !== 15)
      ? "IVA"
      : "IVA 15%";
    const subtotalIvaLabel = payload.items.some((item) => Number(item.iva) > 0 && Number(item.iva) !== 15)
      ? "SUBTOTAL IVA"
      : "SUBTOTAL IVA 15%";

    const totalsX = right - totalW;
    const totalRows = [
      [subtotalIvaLabel, formatCurrency(taxable15Subtotal)],
      ["SUBTOTAL 0%", formatCurrency(zeroSubtotal)],
      ["SUBTOTAL NO OBJ DE IVA", "$ 0.00"],
      ["SUBTOTAL EXENTO DE IVA", "$ 0.00"],
      ["SUBTOTAL SIN IMPUESTO", formatCurrency(payload.invoice.subtotal)],
      ["DESCUENTO", "$ 0.00"],
      ["ICE", "$ 0.00"],
      [ivaLabel, formatCurrency(payload.invoice.iva)],
      ["IRBPNR", "$ 0.00"],
      ["PROPINA", "$ 0.00"],
      ["VALOR TOTAL", formatCurrency(payload.invoice.total)],
    ];
    box(totalsX, tableEndY, totalW, totalRows.length * 5);
    totalRows.forEach(([label, value], index) => {
      const y = tableEndY + index * 5;
      if (index > 0) doc.line(totalsX, y, right, y);
      doc.line(totalsX + 47, y, totalsX + 47, y + 5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text(label, totalsX + 2, y + 3.4);
      doc.setFont("helvetica", "normal");
      doc.text(value, right - 3, y + 3.4, { align: "right" } as never);
    });

    const footerStartY = Math.max(tableEndY + totalRows.length * 5 + 8, 240);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const footerLines = doc.splitTextToSize(
      accessKey
        ? "Representacion impresa de comprobante electronico autorizado por el SRI. Verifique la clave de acceso en los servicios oficiales del SRI."
        : "Representacion preliminar. Este documento no tendra validez tributaria hasta contar con firma electronica y autorizacion del SRI.",
      182,
    );
    footerLines.forEach((line, index) => doc.text(line, 14, footerStartY + index * 4.5));

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`${payload.company.name || "Empresa"} - Generado ${today()} - Pag. ${page}/${pageCount}`, 14, doc.internal.pageSize.height - 8);
    }

    return doc;
  }

  const primaryBlue = [37, 99, 235] as const;
  const darkText = [15, 23, 42] as const;
  const softText = [100, 116, 139] as const;
  const lightFill = [248, 250, 252] as const;
  const accessKey = payload.invoice.sriAccessKey || "";
  const authorizationNumber = payload.invoice.sriAuthorizationNumber || "";
  const groupedAccessKey = groupLongCode(accessKey);
  const groupedAuthorizationNumber = groupLongCode(authorizationNumber);
  const authorizedLabel = sriStatusLabel(payload);
  const formattedAuthorizationDate = formatAuthorizationDate(payload.invoice.sriAuthorizedAt);
  const documentNumber = sriSequence(payload.invoice.number);
  const environment = (payload.invoice.sriEnvironment || "").toLowerCase().includes("prod") ? "PRODUCCION" : "PRUEBAS";
  const drawAccessKeyBars = (value: string, x: number, y: number, width: number, height: number) => {
    if (!value) return;

    const bars = value.split("").map((char, index) => {
      const numeric = Number(char);
      return {
        bar: 0.45 + ((Number.isNaN(numeric) ? char.charCodeAt(0) : numeric) % 3) * 0.16,
        space: index % 4 === 0 ? 0.28 : 0.2,
      };
    });
    const naturalWidth = bars.reduce((total, item) => total + item.bar + item.space, 0);
    const scale = naturalWidth > 0 ? width / naturalWidth : 1;
    let cursor = x + Math.max(0, width - naturalWidth * scale) / 2;

    bars.forEach(({ bar, space }) => {
      const scaledBar = bar * scale;
      const scaledSpace = space * scale;
      if (cursor + scaledBar > x + width) return;
      doc.setFillColor(0, 0, 0);
      doc.rect(cursor, y, scaledBar, height, "F");
      cursor += scaledBar + scaledSpace;
    });
  };

  doc.setTextColor(...darkText);
  const logo = await loadImageForPdf(payload.company.logoUrl);
  doc.setFillColor(...lightFill);
  doc.roundedRect(14, 14, 88, 72, 4, 4, "F");
  doc.setDrawColor(218, 226, 235);
  doc.setLineWidth(0.35);
  doc.roundedRect(14, 14, 88, 72, 4, 4, "S");
  doc.setFillColor(...primaryBlue);
  doc.roundedRect(14, 14, 88, 13, 4, 4, "F");
  doc.rect(14, 22, 88, 5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("EMISOR", 19, 23);
  doc.setTextColor(...darkText);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(28, 29, 60, 27, 3, 3, "F");
  if (logo) {
    const logoBox = { x: 31, y: 31, width: 54, height: 23 };
    const logoPadding = 2;
    const maxLogoWidth = logoBox.width - logoPadding * 2;
    const maxLogoHeight = logoBox.height - logoPadding * 2;
    const ratio = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height);
    const logoWidth = logo.width * ratio;
    const logoHeight = logo.height * ratio;
    const logoX = logoBox.x + (logoBox.width - logoWidth) / 2;
    const logoY = logoBox.y + (logoBox.height - logoHeight) / 2;
    doc.addImage(logo.dataUrl, logo.format, logoX, logoY, logoWidth, logoHeight);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(payload.company.name || "Empresa", 50), 58, 41, { align: "center" } as never);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(payload.company.name || "Empresa", 76).slice(0, 1), 58, 62, { align: "center" } as never);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...softText);
  doc.text("RUC", 19, 69);
  doc.text("TELEFONO", 60, 69);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text(payload.company.ruc || "-", 31, 69);
  doc.text(payload.company.phone || "-", 78, 69);
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(226, 232, 240);
  doc.line(19, 72, 97, 72);
  doc.setFontSize(7);
  const companyLines = [
    payload.company.address || "",
    payload.company.email || "",
  ].filter(Boolean);
  companyLines.forEach((line, index) => {
    doc.text(doc.splitTextToSize(line, 76).slice(0, 1), 19, 78 + index * 5);
  });

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(108, 14, 88, 72, 4, 4, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.roundedRect(108, 14, 88, 72, 4, 4, "S");
  doc.setFillColor(...primaryBlue);
  doc.roundedRect(108, 14, 88, 13, 4, 4, "F");
  doc.rect(108, 22, 88, 5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(payload.invoice.type.toUpperCase(), 112, 23);
  doc.setTextColor(...darkText);
  doc.setFontSize(8);
  doc.text(`No. ${documentNumber}`, 112, 34);
  doc.text("NUMERO DE AUTORIZACION", 112, 43);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.text(doc.splitTextToSize(groupedAuthorizationNumber || "PENDIENTE", 79), 112, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(`AMBIENTE: ${environment}`, 112, 58);
  doc.text("EMISION: NORMAL", 153, 58);
  doc.text("FECHA Y HORA DE AUTORIZACION:", 112, 64);
  doc.setFont("helvetica", "normal");
  doc.text(formattedAuthorizationDate || "PENDIENTE", 112, 69);
  doc.setFont("helvetica", "bold");
  doc.text("CLAVE DE ACCESO", 152, 75, { align: "center" } as never);
  drawAccessKeyBars(accessKey, 112, 77, 80, 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);
  doc.text(groupedAccessKey || "PENDIENTE", 152, 85, { align: "center" } as never);

  doc.setTextColor(...softText);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 92, 182, 30, 3, 3, "F");
  doc.setDrawColor(218, 226, 235);
  doc.setLineWidth(0.35);
  doc.roundedRect(14, 92, 182, 30, 3, 3, "S");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkText);
  doc.text("CLIENTE", 18, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const clientRows = [
    ["Cliente", payload.client.name || "-"],
    [identificationLabel(payload.client.identification), payload.client.identification || "-"],
    ["Direccion", payload.client.address || "-"],
  ] as const;
  clientRows.forEach(([label, value], index) => {
    const y = 107 + index * 5;
    doc.setTextColor(...softText);
    doc.setFont("helvetica", "normal");
    doc.text(label, 18, y);
    doc.setTextColor(...darkText);
    doc.setFont("helvetica", "bold");
    doc.text(doc.splitTextToSize(value, 86).slice(0, 1), 42, y);
  });
  const contactRows = [
    ["Email", payload.client.email || "-"],
    ["Telefono", payload.client.phone || "-"],
  ] as const;
  contactRows.forEach(([label, value], index) => {
    const y = 107 + index * 5;
    doc.setTextColor(...softText);
    doc.setFont("helvetica", "normal");
    doc.text(label, 118, y);
    doc.setTextColor(...darkText);
    doc.setFont("helvetica", "bold");
    doc.text(doc.splitTextToSize(value, 54).slice(0, 1), 138, y);
  });

  doc.setTextColor(...softText);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 128, 182, 24, 3, 3, "F");
  doc.setDrawColor(218, 226, 235);
  doc.setLineWidth(0.35);
  doc.roundedRect(14, 128, 182, 24, 3, 3, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Fecha", 20, 136);
  doc.text("Factura", 54, 136);
  doc.text("Cobro", 92, 136);
  doc.text("Entrega", 124, 136);
  doc.text("SRI", 162, 136);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(payload.invoice.date, 20, 142);
  doc.text(payload.invoice.status, 54, 142);
  doc.text(payload.invoice.paymentStatus || "Pendiente", 92, 142);
  doc.text(payload.invoice.deliveryStatus || "Correo pendiente", 124, 142);
  doc.text(authorizedLabel, 162, 142);

  const tableStartY = 160;

  autoTable(doc as never, {
    head: [["Producto", "Cant.", "P. Unit.", "IVA", "Subtotal"]],
    body: payload.items.map((item) => [
      item.name,
      String(item.quantity),
      formatCurrency(item.price),
      `${item.iva}%`,
      formatCurrency(item.subtotal),
    ]),
    startY: tableStartY,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: darkText[0],
      lineColor: [226, 232, 240],
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "right", cellWidth: 28 },
      3: { halign: "center", cellWidth: 18 },
      4: { halign: "right", cellWidth: 28 },
    },
    tableWidth: 182,
    margin: { left: 14, right: 14 },
  });

  const summaryStartY = (doc.lastAutoTable?.finalY || 110) + 10;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(118, summaryStartY, 78, 34, 4, 4, "F");
  doc.setDrawColor(218, 226, 235);
  doc.setLineWidth(0.35);
  doc.roundedRect(118, summaryStartY, 78, 34, 4, 4, "S");
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Subtotal", 124, summaryStartY + 8);
  doc.text(formatCurrency(payload.invoice.subtotal), 189, summaryStartY + 8, { align: "right" } as never);
  doc.text("IVA", 124, summaryStartY + 15);
  doc.text(formatCurrency(payload.invoice.iva), 189, summaryStartY + 15, { align: "right" } as never);
  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.line(124, summaryStartY + 19, 190, summaryStartY + 19);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", 124, summaryStartY + 27);
  doc.text(formatCurrency(payload.invoice.total), 189, summaryStartY + 27, { align: "right" } as never);

  const footerStartY = summaryStartY + 44;
  doc.setTextColor(...softText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const footerLines = doc.splitTextToSize(
    payload.invoice.sriAuthorizationNumber || payload.invoice.sriAccessKey
      ? "Representacion impresa de comprobante electronico autorizado por el SRI."
      : "Este documento es un comprobante comercial. No corresponde a una autorizacion tributaria del SRI.",
    182,
  );
  footerLines.forEach((line, index) => doc.text(line, 14, footerStartY + index * 4.5));

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${payload.company.name || "Empresa"} - Generado ${today()} - Pag. ${page}/${pageCount}`, 14, doc.internal.pageSize.height - 8);
  }

  return doc;
}

export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers?: Record<string, string>,
) {
  if (data.length === 0) return;

  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerRow = headers ? Object.values(headers) : keys;

  const rows = data.map((row) =>
    keys
      .map((key) => {
        const value = row[key];
        const stringValue = value === null || value === undefined ? "" : String(value);
        return stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      })
      .join(","),
  );

  const csv = [headerRow.join(","), ...rows].join("\n");
  downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

export async function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  headers?: Record<string, string>,
  sheetName = "Datos",
) {
  if (data.length === 0) return;
  const XLSX = await loadXLSX();
  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerLabels = headers ? Object.values(headers) : keys;
  const rows = data.map((row) => keys.map((key) => row[key] ?? ""));
  const worksheet = XLSX.utils.aoa_to_sheet([headerLabels, ...rows]);
  worksheet["!cols"] = headerLabels.map((header) => ({ wch: Math.max(header.length + 2, 14) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function exportMultiSheetExcel(
  sheets: { name: string; headers: string[]; rows: (string | number)[][] }[],
  filename: string,
) {
  const XLSX = await loadXLSX();
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    worksheet["!cols"] = sheet.headers.map((header) => ({ wch: Math.max(header.length + 2, 14) }));
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function exportToPDF(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  options?: { orientation?: "portrait" | "landscape"; subtitle?: string },
) {
  const { jsPDF, autoTable } = await loadPdfTools();
  const doc = new jsPDF({
    orientation: options?.orientation || "portrait",
    unit: "mm",
    format: "a4",
  }) as JsPdfWithAutoTable;

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

  autoTable(doc as never, {
    head: [headers],
    body: rows,
    startY: options?.subtitle ? 33 : 28,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 10, left: 14, right: 14 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`ContaNova - Generado: ${today()} - Pag. ${page}/${pageCount}`, 14, doc.internal.pageSize.height - 10);
  }

  doc.save(`${filename}.pdf`);
}

export async function generateInvoicePdfBlob(payload: InvoicePdfPayload) {
  const doc = await buildInvoicePdfDocument(payload);
  return doc.output("blob");
}

export async function downloadInvoicePdf(payload: InvoicePdfPayload, filename: string) {
  const blob = await generateInvoicePdfBlob(payload);
  downloadBlob(blob, filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

function mapInvoices(invoices: InvoiceExport[]) {
  return invoices.map((invoice) => ({
    fecha: invoice.date,
    tipo: invoice.type || "Factura",
    numero: invoice.number,
    cliente: invoice.client,
    subtotal: invoice.subtotal.toFixed(2),
    iva: invoice.iva.toFixed(2),
    total: invoice.total.toFixed(2),
    estado: invoice.status,
  }));
}

function mapClients(clients: ClientExport[]) {
  return clients.map((client) => ({
    nombre: client.name,
    identificacion: client.identification,
    email: client.email,
    telefono: client.phone,
    direccion: client.address,
  }));
}

export function exportInvoicesToCSV(invoices: InvoiceExport[]) {
  exportToCSV(mapInvoices(invoices), `facturas_${today()}`, INVOICE_HEADERS);
}

export async function exportInvoicesToExcel(invoices: InvoiceExport[]) {
  await exportToExcel(mapInvoices(invoices), `facturas_${today()}`, INVOICE_HEADERS, "Facturas");
}

export async function exportInvoicesToPDF(invoices: InvoiceExport[]) {
  const headers = Object.values(INVOICE_HEADERS);
  const rows = mapInvoices(invoices).map((row) => Object.values(row));
  await exportToPDF("Reporte de Facturas", headers, rows, `facturas_${today()}`, {
    orientation: "landscape",
    subtitle: `${invoices.length} comprobantes - Generado el ${today()}`,
  });
}

export function exportClientsToCSV(clients: ClientExport[]) {
  exportToCSV(mapClients(clients), `clientes_${today()}`, CLIENT_HEADERS);
}

export async function exportClientsToExcel(clients: ClientExport[]) {
  await exportToExcel(mapClients(clients), `clientes_${today()}`, CLIENT_HEADERS, "Clientes");
}

export async function exportClientsToPDF(clients: ClientExport[]) {
  const headers = Object.values(CLIENT_HEADERS);
  const rows = mapClients(clients).map((row) => Object.values(row));
  await exportToPDF("Directorio de Clientes", headers, rows, `clientes_${today()}`, {
    subtitle: `${clients.length} clientes - Generado el ${today()}`,
  });
}

export async function exportReportsToExcel(data: ReportData) {
  await exportMultiSheetExcel(
    [
      {
        name: "Ventas por Mes",
        headers: ["Mes", "Ventas", "IVA"],
        rows: data.monthlySales.map((row) => [row.month, row.ventas, row.iva]),
      },
      {
        name: "Facturas por Mes",
        headers: ["Mes", "Facturas"],
        rows: data.monthlyInvoices.map((row) => [row.month, row.facturas]),
      },
      {
        name: "Pagos por Mes",
        headers: ["Mes", "Pagos"],
        rows: data.paymentsByMonth.map((row) => [row.month, row.pagos]),
      },
      {
        name: "Top Clientes",
        headers: ["Cliente", "Total"],
        rows: data.topClients.map((row) => [row.cliente, row.total]),
      },
    ],
    `reportes_${today()}`,
  );
}

export function exportReportsToCSV(data: ReportData) {
  exportToCSV(
    data.monthlySales.map((row) => ({
      mes: row.month,
      ventas: row.ventas.toFixed(2),
      iva: row.iva.toFixed(2),
    })),
    `ventas_${today()}`,
    { mes: "Mes", ventas: "Ventas", iva: "IVA" },
  );
}

export async function exportReportsToPDF(data: ReportData) {
  const { jsPDF, autoTable } = await loadPdfTools();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as JsPdfWithAutoTable;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte Financiero", 14, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Generado el ${today()}`, 14, 27);
  doc.setTextColor(0);

  autoTable(doc as never, {
    head: [["Mes", "Ventas ($)", "IVA ($)"]],
    body: data.monthlySales.map((row) => [row.month, row.ventas.toFixed(2), row.iva.toFixed(2)]),
    startY: 35,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  autoTable(doc as never, {
    head: [["Cliente", "Total ($)"]],
    body: data.topClients.map((row) => [row.cliente, row.total.toFixed(2)]),
    startY: (doc.lastAutoTable?.finalY || 35) + 10,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [99, 70, 207], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`ContaNova - Pag. ${page}/${pageCount}`, 14, doc.internal.pageSize.height - 10);
  }

  doc.save(`reporte_financiero_${today()}.pdf`);
}


