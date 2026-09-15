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
  setProperties?: (properties: { title?: string; subject?: string; author?: string; keywords?: string; creator?: string }) => void;
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
    sriStatus?: string | null;
    sriAccessKey?: string | null;
    sriAuthorizationNumber?: string | null;
    sriAuthorizedAt?: string | null;
    sriMessages?: string[] | null;
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
  const file = blob instanceof File ? blob : new File([blob], filename, { type: blob.type || "application/octet-stream" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, 40_000);
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
  const status = (payload.invoice.sriStatus || "").toLowerCase();
  if (status === "devuelta") return "Devuelta por SRI";
  if (status === "no_autorizada") return "No autorizada";
  if (status === "pendiente_firma") return "Pendiente de firma";
  if (status === "error") return "Error SRI";
  if (payload.invoice.sriAccessKey) return "Pendiente SRI";
  return "Sin emitir";
}

function sriPendingText(payload: InvoicePdfPayload) {
  const label = sriStatusLabel(payload);
  return label === "Sin emitir" ? "PENDIENTE" : label.toUpperCase();
}

function isFinalConsumer(payload: InvoicePdfPayload) {
  const clientName = payload.client.name.trim().toLowerCase();
  const clientIdentification = (payload.client.identification || "").replace(/\D/g, "");

  return clientName === "consumidor final" || clientIdentification === "9999999999999";
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

  const docTitle = `${payload.invoice.type || "Factura"} ${payload.invoice.number || ""}`.trim();
  doc.setProperties?.({
    title: docTitle || "Factura",
    subject: docTitle || "Factura",
    author: payload.company.name || "ContaNova",
    creator: "ContaNova",
  });

  const primaryBlue = [37, 99, 235] as const;
  const darkText = [15, 23, 42] as const;
  const softText = [100, 116, 139] as const;
  const borderGrey = [203, 213, 225] as const;

  const accessKey = payload.invoice.sriAccessKey || "";
  const authorizationNumber = payload.invoice.sriAuthorizationNumber || accessKey || "";
  const groupedAccessKey = groupLongCode(accessKey);
  const groupedAuthorizationNumber = groupLongCode(authorizationNumber);
  const pendingLabel = sriPendingText(payload);
  const formattedAuthorizationDate = formatAuthorizationDate(payload.invoice.sriAuthorizedAt);
  const documentNumber = sriSequence(payload.invoice.number);
  const environment = (payload.invoice.sriEnvironment || "").toLowerCase().includes("prod") ? "PRODUCCION" : "PRUEBAS";

  const drawAccessKeyBars = (value: string, x: number, y: number, width: number, height: number) => {
    if (!value) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...softText);
      doc.text("Pendiente de autorizacion SRI", x + width / 2, y + height / 2, { align: "center" } as never);
      return;
    }

    const bars = value.split("").map((char, index) => {
      const numeric = Number(char);
      return {
        bar: 0.42 + ((Number.isNaN(numeric) ? char.charCodeAt(0) : numeric) % 3) * 0.16,
        space: index % 4 === 0 ? 0.28 : 0.18,
      };
    });
    const naturalWidth = bars.reduce((total, item) => total + item.bar + item.space, 0);
    const scale = naturalWidth > 0 ? width / naturalWidth : 1;
    let cursor = x + Math.max(0, width - naturalWidth * scale) / 2;

    doc.setFillColor(0, 0, 0);
    bars.forEach(({ bar, space }) => {
      const scaledBar = bar * scale;
      const scaledSpace = space * scale;
      if (cursor + scaledBar > x + width) return;
      doc.rect(cursor, y, scaledBar, height, "F");
      cursor += scaledBar + scaledSpace;
    });
  };

  const logo = await loadImageForPdf(payload.company.logoUrl);

  // -------------------------------------------------------------
  // 1. CUADRANTE SUPERIOR IZQUIERDO: EMISOR (x: 14, y: 14, w: 90, h: 76)
  // -------------------------------------------------------------
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.25);
  doc.roundedRect(14, 14, 90, 76, 2.5, 2.5, "FD");

  let emisorContentY = 43;
  if (logo) {
    const maxLogoW = 58;
    const maxLogoH = 22;
    const ratio = Math.min(maxLogoW / logo.width, maxLogoH / logo.height);
    const logoW = logo.width * ratio;
    const logoH = logo.height * ratio;
    const logoX = 14 + (90 - logoW) / 2;
    const logoY = 17 + (22 - logoH) / 2;
    doc.addImage(logo.dataUrl, logo.format, logoX, logoY, logoW, logoH);
    emisorContentY = 43;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryBlue);
    const companyTitleLines = doc.splitTextToSize(payload.company.name || "EMPRESA EMISORA", 82);
    companyTitleLines.slice(0, 2).forEach((line: string, idx: number) => {
      doc.text(line, 59, 24 + idx * 5, { align: "center" } as never);
    });
    emisorContentY = 38;
  }

  // Nombre y datos fiscales del emisor
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const emisorName = (doc.splitTextToSize(payload.company.name || "Empresa", 82) as string[])[0] || "";
  doc.text(emisorName, 59, emisorContentY, { align: "center" } as never);

  doc.setDrawColor(226, 232, 240);
  doc.line(18, emisorContentY + 3, 100, emisorContentY + 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...softText);

  let cursorY = emisorContentY + 8;
  const emisorAddress = payload.company.address || "Matriz: Ecuador";
  doc.setFont("helvetica", "bold");
  doc.text("Direccion Matriz:", 18, cursorY);
  doc.setFont("helvetica", "normal");
  const addressLines = (doc.splitTextToSize(emisorAddress, 54) as string[]).slice(0, 2);
  addressLines.forEach((line: string, idx: number) => {
    doc.text(line, 44, cursorY + idx * 3.5);
  });
  cursorY += Math.max(7, addressLines.length * 3.5 + 3);

  const establishment = payload.company.establishment
    ? `Establ. ${payload.company.establishment}${payload.company.emissionPoint ? " - Pto. " + payload.company.emissionPoint : ""}`
    : null;
  if (establishment) {
    doc.setFont("helvetica", "bold");
    doc.text("Direccion Sucursal:", 18, cursorY);
    doc.setFont("helvetica", "normal");
    doc.text(establishment, 44, cursorY);
    cursorY += 4;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Obligado a llevar contabilidad:", 18, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(payload.company.accountingRequired ? "SI" : "NO", 62, cursorY);
  cursorY += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Regimen:", 18, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text("CONTRIBUYENTE REGIMEN RIMPE", 34, cursorY);
  cursorY += 4;

  const contactText = [
    payload.company.phone ? `Telf: ${payload.company.phone}` : null,
    payload.company.email ? payload.company.email : null,
  ].filter(Boolean).join(" · ");
  if (contactText) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.text((doc.splitTextToSize(contactText, 82) as string[])[0] || "", 59, cursorY, { align: "center" } as never);
  }

  // -------------------------------------------------------------
  // 2. CUADRANTE SUPERIOR DERECHO: SRI RIDE (x: 106, y: 14, w: 90, h: 76)
  // -------------------------------------------------------------
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.25);
  doc.roundedRect(106, 14, 90, 76, 2.5, 2.5, "FD");

  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(`R.U.C.: ${payload.company.ruc || "-"}`, 110, 21);

  doc.setFontSize(12);
  doc.setTextColor(...primaryBlue);
  doc.text((payload.invoice.type || "FACTURA").toUpperCase(), 110, 27.5);

  doc.setFontSize(9.5);
  doc.setTextColor(...darkText);
  doc.text(`No. ${documentNumber}`, 110, 33);

  doc.setDrawColor(226, 232, 240);
  doc.line(110, 36, 192, 36);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.text("NUMERO DE AUTORIZACION:", 110, 41);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  const authNumberLines = (doc.splitTextToSize(authorizationNumber || pendingLabel, 82) as string[]).slice(0, 2);
  authNumberLines.forEach((line: string, idx: number) => {
    doc.text(line, 110, 45 + idx * 3.2);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.text("FECHA Y HORA DE AUTORIZACION:", 110, 53);
  doc.setFont("helvetica", "normal");
  doc.text(formattedAuthorizationDate || pendingLabel, 110, 57);

  doc.setFont("helvetica", "bold");
  doc.text(`AMBIENTE: ${environment}`, 110, 62);
  doc.text("EMISION: NORMAL", 154, 62);

  doc.setFont("helvetica", "bold");
  doc.text("CLAVE DE ACCESO", 151, 67, { align: "center" } as never);

  // Codigo de barras a ancho completo
  drawAccessKeyBars(accessKey, 110, 68.5, 82, 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.3);
  doc.text(groupedAccessKey || "PENDIENTE", 151, 80, { align: "center" } as never);

  // -------------------------------------------------------------
  // 3. RECUADRO DE DATOS DEL CLIENTE / RECEPTOR (x: 14, y: 92, w: 182, h: 26)
  // -------------------------------------------------------------
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.25);
  doc.roundedRect(14, 92, 182, 26, 2.5, 2.5, "FD");

  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Razon Social / Nombres y Apellidos:", 18, 98);
  doc.setFontSize(8.5);
  const clientNameTrunc = (doc.splitTextToSize(payload.client.name || "Consumidor Final", 92) as string[])[0] || "";
  doc.text(clientNameTrunc, 68, 98);

  doc.setFontSize(7.5);
  doc.text("Identificacion:", 140, 98);
  doc.setFont("helvetica", "normal");
  doc.text(payload.client.identification || "9999999999999", 162, 98);

  doc.setFont("helvetica", "bold");
  doc.text("Fecha Emision:", 18, 105);
  doc.setFont("helvetica", "normal");
  doc.text(payload.invoice.date, 44, 105);

  doc.setFont("helvetica", "bold");
  doc.text("Guia Remision:", 140, 105);
  doc.setFont("helvetica", "normal");
  doc.text("-", 162, 105);

  doc.setFont("helvetica", "bold");
  doc.text("Direccion:", 18, 112);
  doc.setFont("helvetica", "normal");
  const clientAddressTrunc = (doc.splitTextToSize(payload.client.address || "-", 75) as string[])[0] || "";
  doc.text(clientAddressTrunc, 38, 112);

  const contactClient = [
    payload.client.phone ? `Telf: ${payload.client.phone}` : null,
    payload.client.email ? payload.client.email : null,
  ].filter(Boolean).join(" · ");
  if (contactClient) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text((doc.splitTextToSize(contactClient, 65) as string[])[0] || "", 120, 112);
  }

  // -------------------------------------------------------------
  // 4. TABLA DE ITEMS / PRODUCTOS
  // -------------------------------------------------------------
  const tableStartY = 121;

  autoTable(doc as never, {
    head: [["Cod.", "Cant.", "Descripcion", "P. Unitario", "Descuento", "Precio Total"]],
    body: payload.items.map((item, index) => [
      String(index + 1).padStart(3, "0"),
      String(item.quantity),
      item.name,
      formatCurrency(item.price),
      "$0.00",
      formatCurrency(item.subtotal),
    ]),
    startY: tableStartY,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: darkText[0],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      lineWidth: 0.2,
      lineColor: [203, 213, 225],
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: 16, halign: "center" },
      2: { cellWidth: 86 },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 18, halign: "right" },
      5: { cellWidth: 26, halign: "right" },
    },
    tableWidth: 182,
    margin: { left: 14, right: 14 },
  });

  // -------------------------------------------------------------
  // 5. BLOQUE INFERIOR: FORMA DE PAGO + TOTALES OFICIALES SRI
  // -------------------------------------------------------------
  const summaryStartY = (doc.lastAutoTable?.finalY || 121) + 5;

  // Calculo de subtotales desglosados
  const itemsWithIva = payload.items.filter((item) => Number(item.iva) > 0);
  const subtotalWithIva = itemsWithIva.reduce((sum, item) => sum + item.subtotal, 0);
  const subtotalZeroIva = payload.items.filter((item) => Number(item.iva) === 0).reduce((sum, item) => sum + item.subtotal, 0);
  const ivaPercentage = itemsWithIva.length > 0 ? itemsWithIva[0]?.iva || 15 : 15;

  // Izquierda: Informacion Adicional (x: 14, w: 96)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.25);
  doc.roundedRect(14, summaryStartY, 96, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...darkText);
  doc.text("Informacion Adicional:", 18, summaryStartY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...softText);
  doc.text(`Email Cliente: ${payload.client.email || "-"}`, 18, summaryStartY + 10);
  doc.text(`Telefono: ${payload.client.phone || "-"}`, 18, summaryStartY + 14);
  doc.text(`Direccion: ${(doc.splitTextToSize(payload.client.address || "-", 88) as string[])[0] || "-"}`, 18, summaryStartY + 18);
  doc.text(`Estado Pago: ${payload.invoice.paymentStatus || "Pendiente"}`, 18, summaryStartY + 22);

  // Izquierda abajo: Forma de Pago Oficial SRI (x: 14, w: 96, h: 22)
  const pagoStartY = summaryStartY + 27;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGrey);
  doc.roundedRect(14, pagoStartY, 96, 21, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(...darkText);
  doc.text("Forma de Pago", 18, pagoStartY + 5);
  doc.text("Total", 72, pagoStartY + 5);
  doc.text("Plazo", 84, pagoStartY + 5);

  doc.setDrawColor(226, 232, 240);
  doc.line(16, pagoStartY + 7, 108, pagoStartY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(...softText);
  const paymentMethodLabel = payload.invoice.paymentStatus?.toLowerCase().includes("transfer")
    ? "20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO"
    : "01 - SIN UTILIZACION DEL SISTEMA FINANCIERO";
  doc.text((doc.splitTextToSize(paymentMethodLabel, 52) as string[])[0] || "", 18, pagoStartY + 12);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(payload.invoice.total), 72, pagoStartY + 12);
  doc.setFont("helvetica", "normal");
  doc.text("0 Dias", 84, pagoStartY + 12);

  // Derecha: Cuadro Oficial de Totales SRI (x: 114, w: 82, h: 48)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.25);
  doc.roundedRect(114, summaryStartY, 82, 48, 2, 2, "FD");

  const totalLines = [
    [`SUBTOTAL ${ivaPercentage}%:`, formatCurrency(subtotalWithIva)],
    ["SUBTOTAL 0%:", formatCurrency(subtotalZeroIva)],
    ["SUBTOTAL NO OBJETO DE IVA:", "$0.00"],
    ["SUBTOTAL EXENTO DE IVA:", "$0.00"],
    ["SUBTOTAL SIN IMPUESTOS:", formatCurrency(payload.invoice.subtotal)],
    ["TOTAL DESCUENTO:", "$0.00"],
    [`IVA ${ivaPercentage}%:`, formatCurrency(payload.invoice.iva)],
  ];

  totalLines.forEach(([label, val], idx) => {
    const yPos = summaryStartY + 5 + idx * 4.6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...darkText);
    doc.text(label, 118, yPos);
    doc.text(val, 192, yPos, { align: "right" } as never);
    if (idx < totalLines.length - 1) {
      doc.setDrawColor(241, 245, 249);
      doc.line(116, yPos + 1.5, 194, yPos + 1.5);
    }
  });

  // Fila destacada de VALOR TOTAL
  const finalTotalY = summaryStartY + 38;
  doc.setFillColor(241, 245, 249);
  doc.rect(114.5, finalTotalY, 81, 9.5, "F");
  doc.setDrawColor(203, 213, 225);
  doc.line(114, finalTotalY, 196, finalTotalY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkText);
  doc.text("VALOR TOTAL:", 118, finalTotalY + 6.2);
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryBlue);
  doc.text(formatCurrency(payload.invoice.total), 192, finalTotalY + 6.2, { align: "right" } as never);

  // -------------------------------------------------------------
  // 6. PIE DE PAGINA OFICIAL
  // -------------------------------------------------------------
  const footerStartY = Math.max(summaryStartY + 52, doc.internal.pageSize.height - 14);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerStartY - 2, 196, footerStartY - 2);

  doc.setTextColor(...softText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.text(
    "Representacion impresa de comprobante electronico (RIDE) autorizado por el SRI.",
    14,
    footerStartY + 2,
  );

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Pagina ${page} de ${pageCount} - ContaNova`,
      196,
      doc.internal.pageSize.height - 8,
      { align: "right" } as never,
    );
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

  doc.setProperties?.({
    title,
    subject: title,
    author: "ContaNova",
    creator: "ContaNova",
  });

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
  const doc = await buildInvoicePdfDocument(payload);
  const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  try {
    doc.save(cleanFilename);
  } catch {
    const blob = doc.output("blob");
    downloadBlob(blob, cleanFilename);
  }
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
