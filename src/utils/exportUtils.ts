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

  // Paleta de color premium ContaNova
  const primaryBlue = [37, 99, 235] as const;      // Azul royal corporativo
  const darkText = [15, 23, 42] as const;          // Slate 900
  const softText = [100, 116, 139] as const;       // Slate 500
  const lightFill = [248, 250, 252] as const;      // Slate 50
  const borderGrey = [218, 226, 235] as const;     // Borde sutil
  const greenText = [16, 149, 106] as const;       // Verde esmeralda para estados autorizados/pagados
  const amberText = [217, 119, 6] as const;        // Ambar para estados pendientes

  const accessKey = payload.invoice.sriAccessKey || "";
  const authorizationNumber = payload.invoice.sriAuthorizationNumber || accessKey || "";
  const groupedAccessKey = groupLongCode(accessKey);
  const groupedAuthorizationNumber = groupLongCode(authorizationNumber);
  const pendingLabel = sriPendingText(payload);
  const formattedAuthorizationDate = formatAuthorizationDate(payload.invoice.sriAuthorizedAt);
  const documentNumber = sriSequence(payload.invoice.number);
  const environment = (payload.invoice.sriEnvironment || "").toLowerCase().includes("prod") ? "PRODUCCION" : "PRUEBAS";
  const authorizedLabel = sriStatusLabel(payload);

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
        bar: 0.40 + ((Number.isNaN(numeric) ? char.charCodeAt(0) : numeric) % 3) * 0.16,
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

  // =============================================================
  // 1. TARJETA SUPERIOR IZQUIERDA: EMISOR (x: 14, y: 14, w: 88, h: 74)
  // =============================================================
  doc.setFillColor(...lightFill);
  doc.roundedRect(14, 14, 88, 74, 3.5, 3.5, "F");
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 14, 88, 74, 3.5, 3.5, "S");

  // Banner superior azul EMISOR con esquinas superiores redondeadas
  doc.setFillColor(...primaryBlue);
  doc.roundedRect(14, 14, 88, 13, 3.5, 3.5, "F");
  doc.rect(14, 22, 88, 5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("EMISOR", 19, 23);

  // Contenedor para logotipo o avatar de empresa
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(26, 29, 64, 25, 2.5, 2.5, "F");
  doc.setDrawColor(235, 240, 246);
  doc.setLineWidth(0.2);
  doc.roundedRect(26, 29, 64, 25, 2.5, 2.5, "S");

  if (logo) {
    const logoBox = { x: 28, y: 30, width: 60, height: 23 };
    const maxW = logoBox.width - 4;
    const maxH = logoBox.height - 4;
    const ratio = Math.min(maxW / logo.width, maxH / logo.height);
    const logoW = logo.width * ratio;
    const logoH = logo.height * ratio;
    const logoX = logoBox.x + (logoBox.width - logoW) / 2;
    const logoY = logoBox.y + (logoBox.height - logoH) / 2;
    doc.addImage(logo.dataUrl, logo.format, logoX, logoY, logoW, logoH);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...primaryBlue);
    const compLines = doc.splitTextToSize(payload.company.name || "ContaNova", 56) as string[];
    compLines.slice(0, 2).forEach((line, idx) => {
      doc.text(line, 58, 40 + idx * 4.5, { align: "center" } as never);
    });
  }

  // Nombre comercial / Razón social
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkText);
  const emisorDisplayName = (doc.splitTextToSize(payload.company.name || "Empresa", 80) as string[])[0] || "";
  doc.text(emisorDisplayName, 58, 58, { align: "center" } as never);

  doc.setDrawColor(...borderGrey);
  doc.line(19, 61, 97, 61);

  // Datos fiscales del emisor
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...softText);
  doc.text("RUC", 19, 66);
  doc.text("TELF", 58, 66);

  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text(payload.company.ruc || "-", 27, 66);
  doc.text(payload.company.phone || "-", 67, 66);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...softText);
  const emisorAddressStr = payload.company.address || "Matriz: Ecuador";
  const emisorLines = [
    (doc.splitTextToSize(`Matriz: ${emisorAddressStr}`, 78) as string[])[0] || "",
    payload.company.email ? `Email: ${payload.company.email}` : "",
  ].filter(Boolean);

  emisorLines.forEach((line, index) => {
    doc.text(line, 19, 72 + index * 4.2);
  });

  doc.setFontSize(6.2);
  doc.text(`Obligado a Contabilidad: ${payload.company.accountingRequired ? "SI" : "NO"}  ·  RIMPE`, 19, 81.5);

  // =============================================================
  // 2. TARJETA SUPERIOR DERECHA: FACTURA / SRI (x: 108, y: 14, w: 88, h: 74)
  // =============================================================
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(108, 14, 88, 74, 3.5, 3.5, "F");
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.roundedRect(108, 14, 88, 74, 3.5, 3.5, "S");

  // Banner superior azul FACTURA
  doc.setFillColor(...primaryBlue);
  doc.roundedRect(108, 14, 88, 13, 3.5, 3.5, "F");
  doc.rect(108, 22, 88, 5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text((payload.invoice.type || "FACTURA").toUpperCase(), 113, 23);
  doc.setFontSize(6.8);
  doc.text("COMPROBANTE ELECTRONICO", 191, 23, { align: "right" } as never);

  // Secuencial oficial
  doc.setTextColor(...darkText);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(`No. ${documentNumber}`, 113, 33);

  // Numero de Autorizacion
  doc.setFontSize(6.5);
  doc.setTextColor(...softText);
  doc.text("NUMERO DE AUTORIZACION", 113, 39);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(...darkText);
  const authLines = (doc.splitTextToSize(groupedAuthorizationNumber || pendingLabel, 80) as string[]).slice(0, 2);
  authLines.forEach((line, index) => {
    doc.text(line, 113, 43.5 + index * 3.5);
  });

  // Ambiente y Emision
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text(`AMBIENTE: ${environment}`, 113, 53);
  doc.text("EMISION: NORMAL", 154, 53);

  // Fecha y hora
  doc.text("FECHA Y HORA DE AUTORIZACION:", 113, 58.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.text(formattedAuthorizationDate || pendingLabel, 113, 63);

  // Clave de acceso y codigo de barras
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...softText);
  doc.text("CLAVE DE ACCESO", 152, 68, { align: "center" } as never);

  drawAccessKeyBars(accessKey, 113, 69.5, 78, 6.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);
  doc.setTextColor(...darkText);
  doc.text(groupedAccessKey || "PENDIENTE", 152, 79.5, { align: "center" } as never);

  // =============================================================
  // 3. TARJETA CLIENTE (x: 14, y: 91, w: 182, h: 29)
  // =============================================================
  doc.setFillColor(...lightFill);
  doc.roundedRect(14, 91, 182, 29, 3, 3, "F");
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 91, 182, 29, 3, 3, "S");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryBlue);
  doc.text("CLIENTE", 19, 98);

  doc.setDrawColor(226, 232, 240);
  doc.line(19, 100, 191, 100);

  // Columna Izquierda Cliente (x: 19)
  const clientLeftRows = [
    ["Cliente", payload.client.name || "-"],
    [identificationLabel(payload.client.identification), payload.client.identification || "-"],
    ["Direccion", payload.client.address || "-"],
  ] as const;

  clientLeftRows.forEach(([label, value], index) => {
    const y = 106 + index * 5;
    doc.setTextColor(...softText);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(label, 19, y);

    doc.setTextColor(...darkText);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text((doc.splitTextToSize(value, 75) as string[])[0] || "", 40, y);
  });

  // Columna Derecha Cliente (x: 118)
  const clientRightRows = [
    ["Email", payload.client.email || "-"],
    ["Telefono", payload.client.phone || "-"],
    ["Fecha Emision", payload.invoice.date || "-"],
  ] as const;

  clientRightRows.forEach(([label, value], index) => {
    const y = 106 + index * 5;
    doc.setTextColor(...softText);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(label, 118, y);

    doc.setTextColor(...darkText);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text((doc.splitTextToSize(value, 52) as string[])[0] || "", 140, y);
  });

  // =============================================================
  // 4. BARRA DE SEGUIMIENTO Y ESTADO (x: 14, y: 123, w: 182, h: 23)
  // =============================================================
  doc.setFillColor(...lightFill);
  doc.roundedRect(14, 123, 182, 23, 3, 3, "F");
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 123, 182, 23, 3, 3, "S");

  const statusCols = [
    { label: "Fecha", value: payload.invoice.date, color: darkText, x: 20 },
    { label: "Factura", value: payload.invoice.status || "Emitida", color: primaryBlue, x: 55 },
    {
      label: "Cobro",
      value: payload.invoice.paymentStatus || "Pendiente",
      color: (payload.invoice.paymentStatus || "").toLowerCase().includes("cobr") || (payload.invoice.paymentStatus || "").toLowerCase().includes("pag")
        ? greenText
        : amberText,
      x: 93,
    },
    { label: "Entrega", value: payload.invoice.deliveryStatus || "Correo pendiente", color: darkText, x: 126 },
    {
      label: "SRI",
      value: authorizedLabel,
      color: authorizedLabel.toLowerCase().includes("autoriz") ? greenText : amberText,
      x: 163,
    },
  ];

  statusCols.forEach((col, idx) => {
    doc.setTextColor(...softText);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(col.label, col.x, 131);

    doc.setTextColor(col.color[0], col.color[1], col.color[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text((doc.splitTextToSize(col.value, 32) as string[])[0] || "", col.x, 138);

    // Divisores verticales sutiles
    if (idx < statusCols.length - 1) {
      const divX = col.x + 31;
      doc.setDrawColor(226, 232, 240);
      doc.line(divX, 127, divX, 142);
    }
  });

  // =============================================================
  // 5. TABLA DE ITEMS / PRODUCTOS
  // =============================================================
  const tableStartY = 152;

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
      fontSize: 8.5,
      cellPadding: 3,
      textColor: darkText[0],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 88, halign: "left" },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 26, halign: "right" },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 32, halign: "right" },
    },
    tableWidth: 182,
    margin: { left: 14, right: 14 },
  });

  // =============================================================
  // 6. BLOQUE INFERIOR: INFORMACION / PAGO + TOTALES
  // =============================================================
  const summaryStartY = (doc.lastAutoTable?.finalY || 160) + 7;

  // Izquierda: Forma de pago e informacion adicional
  doc.setFillColor(...lightFill);
  doc.roundedRect(14, summaryStartY, 98, 36, 3, 3, "F");
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, summaryStartY, 98, 36, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryBlue);
  doc.text("FORMA DE PAGO E INFORMACION ADICIONAL", 19, summaryStartY + 7);

  doc.setDrawColor(226, 232, 240);
  doc.line(19, summaryStartY + 9, 107, summaryStartY + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...softText);
  const paymentMethodText = payload.invoice.paymentStatus?.toLowerCase().includes("transfer")
    ? "20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO"
    : "01 - SIN UTILIZACION DEL SISTEMA FINANCIERO";
  doc.text("Metodo de Pago:", 19, summaryStartY + 15);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text((doc.splitTextToSize(paymentMethodText, 60) as string[])[0] || "", 44, summaryStartY + 15);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...softText);
  doc.text("Plazo:", 19, summaryStartY + 21);
  doc.setTextColor(...darkText);
  doc.text("0 Dias", 44, summaryStartY + 21);

  doc.setTextColor(...softText);
  doc.text("Email envio:", 19, summaryStartY + 27);
  doc.setTextColor(...darkText);
  doc.text((doc.splitTextToSize(payload.client.email || "-", 60) as string[])[0] || "-", 44, summaryStartY + 27);

  // Derecha: Cuadro de Totales
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(118, summaryStartY, 78, 36, 3, 3, "F");
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.roundedRect(118, summaryStartY, 78, 36, 3, 3, "S");

  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Subtotal", 124, summaryStartY + 8);
  doc.text(formatCurrency(payload.invoice.subtotal), 189, summaryStartY + 8, { align: "right" } as never);

  doc.text("IVA", 124, summaryStartY + 15);
  doc.text(formatCurrency(payload.invoice.iva), 189, summaryStartY + 15, { align: "right" } as never);

  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.line(124, summaryStartY + 18.5, 190, summaryStartY + 18.5);

  // Fila destacada Total con fondo sutil
  doc.setFillColor(...lightFill);
  doc.roundedRect(119, summaryStartY + 20.5, 76, 13.5, 2, 2, "F");
  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(0.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...darkText);
  doc.text("Total", 124, summaryStartY + 29);

  doc.setFontSize(12.5);
  doc.setTextColor(...primaryBlue);
  doc.text(formatCurrency(payload.invoice.total), 189, summaryStartY + 29, { align: "right" } as never);

  // =============================================================
  // 7. PIE DE PAGINA OFICIAL
  // =============================================================
  const footerStartY = Math.max(summaryStartY + 42, doc.internal.pageSize.height - 12);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerStartY - 2, 196, footerStartY - 2);

  doc.setTextColor(...softText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const footerLines = doc.splitTextToSize(
    payload.invoice.sriAuthorizationNumber || payload.invoice.sriAccessKey
      ? "Representacion impresa de comprobante electronico (RIDE) autorizado por el SRI."
      : "Este documento es un comprobante comercial generado en ContaNova.",
    140,
  );
  footerLines.forEach((line: string, index: number) => doc.text(line, 14, footerStartY + index * 4));

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `ContaNova - Pagina ${page} de ${pageCount}`,
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
