const ExcelJS = require("exceljs");
const path = require("path");

const scenarioGroups = {
  "Minimo funcional": [
    ["Dominio .com en Porkbun", 11.08, "Anual", 11.08, 0.92, "Te da un dominio propio para verificarlo en Resend y poder enviar facturas desde una marca real.", "No incluye buzon de correo, solo el dominio.", "https://porkbun.com/tld/com"],
    ["Resend Free", 0, "Mensual", 0, 0, "Es el servicio que envia los correos de facturas desde ContaNova.", "Incluye 1 dominio, 3000 emails al mes y 100 al dia.", "https://resend.com/pricing"],
    ["TOTAL", 11.08, "Mixto", 11.08, 0.92, "Es la opcion mas barata para empezar a enviar facturas por correo.", "No incluye buzon empresarial para responder correos.", ""],
  ],
  "Profesional basica": [
    ["Dominio .com en Porkbun", 11.08, "Anual", 11.08, 0.92, "Te da la direccion principal de la marca.", "Sirve para Resend y para correos tipo facturas@tudominio.com.", "https://porkbun.com/tld/com"],
    ["Resend Free", 0, "Mensual", 0, 0, "Envia automaticamente las facturas desde ContaNova.", "Suficiente para arrancar si no tienes gran volumen.", "https://resend.com/pricing"],
    ["Google Workspace Business Starter (1 usuario)", 84, "Mensual con compromiso anual", 84, 7, "Te crea un buzon real tipo facturas@tudominio.com para recibir respuestas de clientes.", "Muy util si quieres una imagen empresarial completa.", "https://workspace.google.com/pricing"],
    ["TOTAL", 95.08, "Mixto", 95.08, 7.92, "Es la opcion mas equilibrada entre precio y profesionalismo.", "Incluye dominio, envio y correo empresarial.", ""],
  ],
  "Barata con buzon": [
    ["Dominio .com en Porkbun", 11.08, "Anual", 11.08, 0.92, "Te da el dominio base del negocio.", "", "https://porkbun.com/tld/com"],
    ["Resend Free", 0, "Mensual", 0, 0, "Envia facturas desde ContaNova.", "", "https://resend.com/pricing"],
    ["Zoho Mail Free", 0, "Gratis", 0, 0, "Te da un correo empresarial sin pagar al inicio.", "Tiene limitaciones, pero sirve para arrancar.", "https://www.zoho.com/mail/zohomail-pricing.html"],
    ["TOTAL", 11.08, "Mixto", 11.08, 0.92, "Es la opcion con menor costo si quieres dominio y buzon.", "Ideal para probar sin gastar casi nada.", ""],
  ],
  "Mayor volumen": [
    ["Dominio .com en Porkbun", 11.08, "Anual", 11.08, 0.92, "Base del dominio y DNS.", "", "https://porkbun.com/tld/com"],
    ["Resend Pro", 240, "Mensual", 240, 20, "Permite enviar muchas mas facturas sin el limite diario del plan gratis.", "Incluye 50000 emails al mes.", "https://resend.com/pricing"],
    ["TOTAL", 251.08, "Mixto", 251.08, 20.92, "Opcion pensada para una operacion con mas clientes y mas correos enviados.", "", ""],
  ],
};

const scenarioSummary = [
  ["Minimo funcional", "Dominio .com + Resend Free", 11.08, 0.92, "La forma mas barata de empezar a enviar facturas por correo."],
  ["Profesional basica", "Dominio .com + Resend Free + Google Workspace", 95.08, 7.92, "La opcion mas equilibrada si quieres imagen empresarial seria."],
  ["Barata con buzon", "Dominio .com + Resend Free + Zoho Mail Free", 11.08, 0.92, "La opcion mas economica si tambien quieres un buzon."],
  ["Mayor volumen", "Dominio .com + Resend Pro", 251.08, 20.92, "Pensada para mas correos y mas clientes."],
];

const registrars = [
  ["Porkbun", ".com", 11.08, "Similar segun mercado", "Comprar el dominio de forma barata y simple.", "Empezar rapido y gastar poco", "https://porkbun.com/tld/com"],
  ["Namecheap", ".com", 11.28, 18.48, "Comprar dominio con promo inicial.", "Quien quiere promo inicial aunque renueve mas caro", "https://www.namecheap.com/promos/new-com-promo/"],
  ["Cloudflare Registrar", ".com", "Precio de costo", "Precio de costo", "Administrar y renovar dominios sin recargos.", "Quien prioriza costo real y buena gestion DNS", "https://www.cloudflare.com/products/registrar/"],
  ["NIC.ec", ".ec", "Desde 35 + IVA", "Variable", "Usar una identidad mas local para Ecuador.", "Marca local premium o enfoque Ecuador", "https://new.nic.ec/planes-de-precios"],
];

const glossary = [
  ["Dominio", "Es el nombre de tu marca en internet, por ejemplo contanova.com."],
  ["DNS", "Es donde apuntas tu dominio a servicios como Resend, Vercel o correo."],
  ["Resend", "Servicio que envia los correos transaccionales, como facturas y confirmaciones."],
  ["Google Workspace", "Te da un buzon empresarial real para leer y responder correos desde tu dominio."],
  ["Zoho Mail", "Alternativa de correo empresarial, con plan gratis para empezar."],
  ["Plan anual", "Pagas una vez al ano o con compromiso anual y normalmente sale mas barato."],
  ["Plan mensual", "Pagas cada mes; suele dar mas flexibilidad pero a veces sale mas caro."],
  ["Dominio verificado en Resend", "Permite enviar correos reales a clientes externos, no solo a tu propio email."],
];

const recommendations = [
  ["Hoy", "Dominio .com + Resend Free", 11.08, "Es lo minimo para empezar a enviar facturas desde ContaNova con marca propia."],
  ["Ordenado y profesional", "Dominio .com + Resend Free + Google Workspace", 95.08, "Ya tienes envio automatico y un buzon empresarial para responder clientes."],
  ["Escala", "Dominio .com + Resend Pro", 251.08, "Sirve si empiezas a mandar muchas facturas cada mes y el plan gratis se queda corto."],
];

const workbook = new ExcelJS.Workbook();
workbook.creator = "Codex";
workbook.created = new Date();
workbook.modified = new Date();

const colors = {
  blueDark: "1E3A8A",
  blue: "2563EB",
  blueSoft: "DBEAFE",
  slateDark: "0F172A",
  slate: "334155",
  slateSoft: "E2E8F0",
  white: "FFFFFF",
  greenSoft: "DCFCE7",
  amberSoft: "FEF3C7",
};

function styleTitleRow(worksheet, title, subtitle, colCount) {
  worksheet.mergeCells(1, 1, 1, colCount);
  worksheet.getCell("A1").value = title;
  worksheet.getCell("A1").font = { size: 18, bold: true, color: { argb: colors.white } };
  worksheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colors.blueDark },
  };
  worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

  worksheet.mergeCells(2, 1, 2, colCount);
  worksheet.getCell("A2").value = subtitle;
  worksheet.getCell("A2").font = { size: 11, color: { argb: colors.slate } };
  worksheet.getCell("A2").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colors.blueSoft },
  };
  worksheet.getCell("A2").alignment = { vertical: "middle", horizontal: "left", wrapText: true };
}

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: colors.white } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.blue },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: colors.slateSoft } },
      left: { style: "thin", color: { argb: colors.slateSoft } },
      bottom: { style: "thin", color: { argb: colors.slateSoft } },
      right: { style: "thin", color: { argb: colors.slateSoft } },
    };
  });
}

function styleBodyRows(worksheet, startRow, moneyColumns = []) {
  for (let i = startRow; i <= worksheet.rowCount; i += 1) {
    const row = worksheet.getRow(i);
    const firstCell = String(row.getCell(1).value || "");
    const isTotal = firstCell === "Total" || firstCell === "TOTAL";

    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        vertical: "top",
        horizontal: moneyColumns.includes(colNumber) ? "right" : "left",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: colors.slateSoft } },
        left: { style: "thin", color: { argb: colors.slateSoft } },
        bottom: { style: "thin", color: { argb: colors.slateSoft } },
        right: { style: "thin", color: { argb: colors.slateSoft } },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isTotal ? colors.greenSoft : colors.white },
      };

      if (moneyColumns.includes(colNumber) && typeof cell.value === "number") {
        cell.numFmt = '$#,##0.00';
      }
    });

    if (isTotal) {
      row.font = { bold: true, color: { argb: colors.slateDark } };
    }
  }
}

function setupSheet(name, title, subtitle, headers, rows, widths, moneyColumns = []) {
  const worksheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  styleTitleRow(worksheet, title, subtitle, headers.length);
  const headerRow = worksheet.addRow(headers);
  styleHeaderRow(headerRow);

  rows.forEach((data) => worksheet.addRow(data));
  styleBodyRows(worksheet, 4, moneyColumns);

  worksheet.columns = widths.map((width) => ({ width }));
  worksheet.getRow(1).height = 26;
  worksheet.getRow(2).height = 34;
  worksheet.getRow(3).height = 22;

  return worksheet;
}

setupSheet(
  "Escenarios",
  "Costos ContaNova 2026",
  "Resumen general de escenarios. Cada escenario tambien tiene su propia hoja separada.",
  ["Escenario", "Combinacion", "Total anual USD", "Mensual USD", "Resumen"],
  scenarioSummary,
  [24, 42, 18, 16, 70],
  [3, 4],
);

setupSheet(
  "Registradores",
  "Comparacion de dominios",
  "Comparativa de proveedores para comprar el dominio que luego conectaras con Resend.",
  ["Registrador", "TLD", "Registro USD", "Renovacion USD", "Para que sirve", "Recomendado para", "Fuente"],
  registrars,
  [24, 10, 16, 18, 46, 34, 34],
  [3, 4],
);

setupSheet(
  "Conceptos",
  "Glosario rapido",
  "Explicacion simple de cada concepto tecnico para que entiendas que estas pagando.",
  ["Concepto", "Para que sirve"],
  glossary,
  [28, 90],
);

setupSheet(
  "Recomendacion",
  "Ruta recomendada",
  "Que conviene comprar segun la etapa en la que este ContaNova.",
  ["Etapa", "Recomendacion", "Costo anual USD", "Por que"],
  recommendations,
  [28, 42, 18, 70],
  [3],
);

const recommendationSheet = workbook.getWorksheet("Recomendacion");
recommendationSheet.getRow(4).fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: colors.greenSoft },
};
recommendationSheet.getRow(5).fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: colors.amberSoft },
};

Object.entries(scenarioGroups).forEach(([name, rows]) => {
  setupSheet(
    name.slice(0, 31),
    name,
    `Desglose completo del escenario "${name}" con precios, periodicidad y para que sirve cada servicio.`,
    ["Concepto", "Precio USD", "Forma de cobro", "Total anual USD", "Mensual USD", "Para que sirve", "Notas", "Fuente"],
    rows,
    [36, 14, 24, 16, 14, 58, 42, 34],
    [2, 4, 5],
  );
});

const outputPath = path.join(process.cwd(), "docs", "costos_contanova_2026.xlsx");
workbook.xlsx.writeFile(outputPath).then(() => {
  console.log(`Archivo generado en ${outputPath}`);
});
