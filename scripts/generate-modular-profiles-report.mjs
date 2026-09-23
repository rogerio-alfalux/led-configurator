import mysql from "mysql2/promise";
import ExcelJS from "exceljs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const OUTPUT_DIR = "/home/ubuntu/led-configurator/reports";
const REPORT_DATE = new Date();
const COMMERCIAL_STATUSES = new Set(["open", "approved", "invoiced", "lost"]);
const SOLD_STATUS = "invoiced";

const COLORS = {
  navy: "17365D",
  blue: "1F4E78",
  paleBlue: "EAF2F8",
  paleBlueAlt: "F7FBFF",
  paleGreen: "E2F0D9",
  paleGold: "FFF2CC",
  gray: "666666",
  white: "FFFFFF",
  border: "D9E2F3",
};

const normaliseText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function classifyInstallation(description, productSku) {
  const text = normaliseText(description).toUpperCase();
  if (/\bEMBUTIR\b/.test(text)) return "EMBUTIR";
  if (/\bSOBREPOR\b/.test(text)) return "SOBREPOR";
  if (/\bPENDENTE\b/.test(text)) return "PENDENTE";
  if (/\bARANDELA\b/.test(text)) return "ARANDELA";
  if (String(productSku).startsWith("LLE")) return "EMBUTIR";
  if (String(productSku).startsWith("LLS")) return "SOBREPOR";
  if (String(productSku).startsWith("LLP")) return "PENDENTE";
  if (String(productSku).startsWith("LLA")) return "ARANDELA";
  return "NÃO INFORMADA";
}

function classifyFamily(description) {
  let base = normaliseText(description).split("—")[0];
  const powerPosition = base.search(/\s+\d+(?:[.,]\d+)?\s*W\b/i);
  if (powerPosition >= 0) base = base.slice(0, powerPosition);
  return base
    .replace(/\b(EMBUTIR|SOBREPOR|PENDENTE|ARANDELA)\b/gi, " ")
    .replace(/\bD1\s*\+\s*D2\b|\bD1\b|\bD2\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase() || "NÃO INFORMADA";
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(value);
}

function createMetrics() {
  return { quotes: new Set(), modulesQuoted: 0, modulesSold: 0 };
}

function addMetrics(target, quoteNumber, status, modules) {
  if (!COMMERCIAL_STATUSES.has(status)) return;
  target.quotes.add(quoteNumber);
  target.modulesQuoted += modules;
  if (status === SOLD_STATUS) {
    target.modulesSold += modules;
  }
}

function finaliseMetrics(entries) {
  return [...entries.values()]
    .map((entry) => ({
      ...entry,
      quoteCount: entry.quotes.size,
      modulesQuoted: round(entry.modulesQuoted),
      modulesSold: round(entry.modulesSold),
    }))
    .sort((a, b) => b.modulesSold - a.modulesSold || b.modulesQuoted - a.modulesQuoted || a.moduleSku.localeCompare(b.moduleSku));
}

function title(sheet, name, subtitle, totalColumns) {
  const lastColumn = String.fromCharCode(64 + totalColumns);
  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.getCell("A1").value = name;
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: COLORS.white } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 28;
  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.getCell("A2").value = subtitle;
  sheet.getCell("A2").font = { italic: true, size: 10, color: { argb: COLORS.gray } };
  sheet.getRow(2).height = 20;
}

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.white }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue } };
    cell.alignment = { horizontal: "center", vertical: "center", wrapText: true };
    cell.border = { top: { style: "thin", color: { argb: COLORS.border } }, left: { style: "thin", color: { argb: COLORS.border } }, bottom: { style: "thin", color: { argb: COLORS.border } }, right: { style: "thin", color: { argb: COLORS.border } } };
  });
  row.height = 32;
}

function styleBody(row, index, numericColumns = []) {
  row.eachCell((cell, column) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 === 0 ? COLORS.paleBlueAlt : COLORS.white } };
    cell.font = { size: 10, color: { argb: "1F1F1F" } };
    cell.alignment = { vertical: "center", horizontal: numericColumns.includes(column) ? "right" : "left" };
    cell.border = { bottom: { style: "hair", color: { argb: COLORS.border } } };
  });
  row.height = 18;
}

function configurePrint(sheet, area, repeatHeader) {
  sheet.pageSetup = {
    orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
    margins: { left: 0.2, right: 0.2, top: 0.35, bottom: 0.35, header: 0.1, footer: 0.1 },
  };
  sheet.pageSetup.printArea = area;
  if (repeatHeader) sheet.pageSetup.printTitlesRow = repeatHeader;
}

function addKpi(sheet, startColumn, label, value, fill, format = "#,##0.00") {
  const start = String.fromCharCode(64 + startColumn);
  const end = String.fromCharCode(64 + startColumn + 1);
  sheet.mergeCells(`${start}4:${end}4`);
  sheet.mergeCells(`${start}5:${end}5`);
  const labelCell = sheet.getCell(`${start}4`);
  const valueCell = sheet.getCell(`${start}5`);
  labelCell.value = label;
  valueCell.value = value;
  for (const cell of [labelCell, valueCell]) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    cell.alignment = { horizontal: "center", vertical: "center" };
    cell.border = { top: { style: "thin", color: { argb: COLORS.border } }, left: { style: "thin", color: { argb: COLORS.border } }, bottom: { style: "thin", color: { argb: COLORS.border } }, right: { style: "thin", color: { argb: COLORS.border } } };
  }
  labelCell.font = { bold: true, size: 9, color: { argb: COLORS.gray } };
  valueCell.font = { bold: true, size: 15, color: { argb: COLORS.navy } };
  valueCell.numFmt = format;
}

function buildRankingSheet(workbook, rows, subtitle) {
  const sheet = workbook.addWorksheet("Ranking por Módulo", { views: [{ state: "frozen", ySplit: 6 }] });
  const columns = ["Posição", "Família", "Instalação", "SKU Completo do Módulo", "CCT", "Cor da Peça", "Módulos Orçados", "Módulos Vendidos"];
  title(sheet, "RANKING GERENCIAL — MÓDULOS DE PERFIL", subtitle, columns.length);
  sheet.getRow(6).values = columns;
  styleHeader(sheet.getRow(6));
  rows.forEach((entry, index) => {
    const row = sheet.addRow([index + 1, entry.family, entry.installation, entry.moduleSku, entry.cct, entry.color, entry.modulesQuoted, entry.modulesSold]);
    styleBody(row, index, [1, 7, 8]);
    row.getCell(1).font = { bold: true, color: { argb: COLORS.navy } };
    if (index < 10) row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleGold } };
    [7, 8].forEach((column) => { row.getCell(column).numFmt = "#,##0.00"; });
  });
  sheet.autoFilter = { from: "A6", to: `H${Math.max(6, 6 + rows.length)}` };
  sheet.columns = [{ width: 10 }, { width: 23 }, { width: 15 }, { width: 29 }, { width: 14 }, { width: 24 }, { width: 18 }, { width: 18 }];
  sheet.getColumn(7).eachCell({ includeEmpty: false }, (cell, row) => { if (row > 6) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleBlue } }; });
  sheet.getColumn(8).eachCell({ includeEmpty: false }, (cell, row) => { if (row > 6) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleGreen } }; });
  configurePrint(sheet, `A1:H${Math.max(6, 6 + rows.length)}`, "6:6");
  return sheet;
}

async function main() {
  const db = await mysql.createConnection(process.env.DATABASE_URL);
  const [sourceRows] = await db.query(`
    SELECT q.quoteNumber, q.status, q.createdAt AS quoteCreatedAt, q.approvedAt, q.invoicedAt, qi.itemNumber, qi.itemData
    FROM quote_items qi
    INNER JOIN quote_versions qv ON qv.id = qi.quoteVersionId
    INNER JOIN quotes q ON q.id = qi.quoteId AND qv.version = q.currentVersion
    WHERE JSON_EXTRACT(qi.itemData, '$.profileSegments') IS NOT NULL
    ORDER BY q.createdAt, q.quoteNumber, qi.itemNumber
  `);
  await db.end();

  const moduleGroups = new Map();
  const detailRows = [];
  const overall = createMetrics();
  const commercialQuotes = new Set();

  for (const source of sourceRows) {
    let item;
    try { item = JSON.parse(source.itemData); } catch { continue; }
    const status = String(source.status ?? "");
    const itemQty = Number(item.qty ?? 0);
    if (!Number.isFinite(itemQty) || itemQty <= 0) continue;
    const productSku = normaliseText(item.sku);
    const description = normaliseText(item.description || item.quoteSummary || item.orderSummary);
    const family = classifyFamily(description);
    const installation = classifyInstallation(description, productSku);
    const cct = normaliseText(item.cct) || "NÃO INFORMADO";
    const color = normaliseText(item.corPeca) || "NÃO INFORMADA";

    for (const segment of Array.isArray(item.profileSegments) ? item.profileSegments : []) {
      const moduleSku = normaliseText(segment?.sku) || "NÃO INFORMADO";
      const modules = Number(segment?.qty ?? 0) * itemQty;
      if (!Number.isFinite(modules) || modules <= 0) continue;

      const key = [family, installation, moduleSku, cct, color].join("¦");
      if (!moduleGroups.has(key)) moduleGroups.set(key, { family, installation, moduleSku, cct, color, ...createMetrics() });
      addMetrics(moduleGroups.get(key), source.quoteNumber, status, modules);
      addMetrics(overall, source.quoteNumber, status, modules);
      if (COMMERCIAL_STATUSES.has(status)) commercialQuotes.add(source.quoteNumber);
      detailRows.push({
        quoteNumber: source.quoteNumber,
        status,
        quoteDate: formatDate(source.quoteCreatedAt),
        itemNumber: source.itemNumber,
        family,
        installation,
        moduleSku,
        cct,
        color,
        modules: round(modules),
      });
    }
  }

  const moduleRows = finaliseMetrics(moduleGroups);
  const uniqueModuleSkus = new Set(moduleRows.map((entry) => entry.moduleSku)).size;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Luna — Alfalux Iluminação";
  workbook.created = REPORT_DATE;
  workbook.modified = REPORT_DATE;
  workbook.properties.title = "Relatório Gerencial — Módulos de Perfil";
  workbook.properties.subject = "SKUs completos de módulos orçados e vendidos";
  const subtitle = `Período: início do sistema até ${formatDateTime(REPORT_DATE)} • Fonte: revisão vigente de cada orçamento`;

  const overview = workbook.addWorksheet("Visão Geral", { views: [{ state: "frozen", ySplit: 7 }] });
  title(overview, "RELATÓRIO GERENCIAL — MÓDULOS DE PERFIL", subtitle, 8);
  addKpi(overview, 1, "ORÇAMENTOS COM MÓDULOS", commercialQuotes.size, COLORS.paleBlue, "#,##0");
  addKpi(overview, 3, "SKUs COMPLETOS ÚNICOS", uniqueModuleSkus, COLORS.paleGold, "#,##0");
  addKpi(overview, 5, "MÓDULOS ORÇADOS", round(overall.modulesQuoted), COLORS.paleBlue, "#,##0.00");
  addKpi(overview, 7, "MÓDULOS VENDIDOS", round(overall.modulesSold), COLORS.paleGreen, "#,##0.00");
  overview.mergeCells("A7:H7");
  overview.getCell("A7").value = "COMO LER O RELATÓRIO";
  overview.getCell("A7").font = { bold: true, color: { argb: COLORS.white } };
  overview.getCell("A7").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue } };
  const notes = [
    ["SKU completo", "Cada linha usa o SKU técnico integral do módulo, por exemplo LLP-6060.2IF.48F. Não há agrupamento apenas pelo SKU-base da família."],
    ["CCT", "Temperatura de cor selecionada na configuração do perfil. O mesmo SKU é separado quando tiver CCTs diferentes."],
    ["Módulos orçados", "Quantidade do módulo registrada em orçamentos abertos, aprovados, faturados ou perdidos; cada orçamento entra somente pela sua revisão vigente."],
    ["Módulos vendidos", "Quantidade do módulo em orçamentos faturados."],
  ];
  overview.mergeCells("A8:B8"); overview.mergeCells("C8:H8");
  overview.getCell("A8").value = "Conceito"; overview.getCell("C8").value = "Critério";
  [overview.getCell("A8"), overview.getCell("C8")].forEach((cell) => { cell.font = { bold: true, color: { argb: COLORS.white }, size: 10 }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue } }; cell.alignment = { horizontal: "center" }; });
  notes.forEach((entry, index) => {
    const row = 9 + index;
    overview.mergeCells(`A${row}:B${row}`); overview.mergeCells(`C${row}:H${row}`);
    const concept = overview.getCell(`A${row}`); const criterion = overview.getCell(`C${row}`);
    concept.value = entry[0]; criterion.value = entry[1];
    [concept, criterion].forEach((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 === 0 ? COLORS.paleBlueAlt : COLORS.white } }; cell.border = { bottom: { style: "hair", color: { argb: COLORS.border } } }; cell.alignment = { wrapText: true, vertical: "top" }; cell.font = { size: 10, color: { argb: "1F1F1F" } }; });
    concept.font = { bold: true, size: 10, color: { argb: COLORS.navy } };
    overview.getRow(row).height = 34;
  });
  overview.columns = Array.from({ length: 8 }, () => ({ width: 15 }));
  configurePrint(overview, "A1:H12");

  buildRankingSheet(workbook, moduleRows, subtitle);

  const detail = workbook.addWorksheet("Base Auditável", { views: [{ state: "frozen", ySplit: 6 }] });
  const detailColumns = ["Nº Orçamento", "Status", "Data", "Item", "Família", "Instalação", "SKU Completo do Módulo", "CCT", "Cor", "Qtd. Módulos"];
  title(detail, "BASE AUDITÁVEL — MÓDULOS DE PERFIL", subtitle, detailColumns.length);
  detail.getRow(6).values = detailColumns;
  styleHeader(detail.getRow(6));
  detailRows.forEach((entry, index) => {
    const row = detail.addRow([entry.quoteNumber, entry.status, entry.quoteDate, entry.itemNumber, entry.family, entry.installation, entry.moduleSku, entry.cct, entry.color, entry.modules]);
    styleBody(row, index, [4, 10]);
    row.getCell(10).numFmt = "#,##0.00";
  });
  detail.autoFilter = { from: "A6", to: `J${Math.max(6, 6 + detailRows.length)}` };
  detail.columns = [{ width: 15 }, { width: 12 }, { width: 14 }, { width: 8 }, { width: 22 }, { width: 15 }, { width: 29 }, { width: 14 }, { width: 24 }, { width: 16 }];
  configurePrint(detail, `A1:J${Math.max(6, 6 + detailRows.length)}`, "6:6");

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = resolve(OUTPUT_DIR, "Relatorio_Gerencial_Modulos_Perfis_2026-09-23.xlsx");
  await writeFile(outputPath, await workbook.xlsx.writeBuffer());
  console.log(JSON.stringify({
    outputPath,
    sourceItemSnapshots: sourceRows.length,
    commercialQuotes: commercialQuotes.size,
    fullModuleSkuCombinations: moduleRows.length,
    uniqueFullModuleSkus: uniqueModuleSkus,
    detailRows: detailRows.length,
    modulesQuoted: round(overall.modulesQuoted),
    modulesSold: round(overall.modulesSold),
    topSold: moduleRows.slice(0, 5).map(({ family, installation, moduleSku, cct, color, modulesQuoted, modulesSold }) => ({ family, installation, moduleSku, cct, color, modulesQuoted, modulesSold })),
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
