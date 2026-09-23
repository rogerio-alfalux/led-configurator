import mysql from "mysql2/promise";
import ExcelJS from "exceljs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const OUTPUT_DIR = "/home/ubuntu/led-configurator/reports";
const REPORT_DATE = new Date();
const COMMERCIAL_STATUSES = new Set(["open", "approved", "invoiced", "lost"]);
const CLOSED_STATUSES = new Set(["approved", "invoiced"]);
const SOLD_STATUS = "invoiced";

const COLORS = {
  navy: "17365D",
  blue: "1F4E78",
  mediumBlue: "5B9BD5",
  paleBlue: "EAF2F8",
  paleBlueAlt: "F7FBFF",
  paleGreen: "E2F0D9",
  green: "548235",
  paleGold: "FFF2CC",
  gold: "BF9000",
  paleGray: "F2F2F2",
  gray: "666666",
  white: "FFFFFF",
  border: "D9E2F3",
};

function normaliseText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyInstallation(description, sku) {
  const text = normaliseText(description).toUpperCase();
  if (/\bEMBUTIR\b/.test(text)) return "EMBUTIR";
  if (/\bSOBREPOR\b/.test(text)) return "SOBREPOR";
  if (/\bPENDENTE\b/.test(text)) return "PENDENTE";
  if (/\bARANDELA\b/.test(text)) return "ARANDELA";
  if (String(sku).startsWith("LLE")) return "EMBUTIR";
  if (String(sku).startsWith("LLS")) return "SOBREPOR";
  if (String(sku).startsWith("LLP")) return "PENDENTE";
  if (String(sku).startsWith("LLA")) return "ARANDELA";
  return "NÃO INFORMADA";
}

function classifyFamily(description) {
  let base = normaliseText(description).split("—")[0];
  const powerPosition = base.search(/\s+\d+(?:[.,]\d+)?\s*W\b/i);
  if (powerPosition >= 0) base = base.slice(0, powerPosition);
  base = base
    .replace(/\b(EMBUTIR|SOBREPOR|PENDENTE|ARANDELA)\b/gi, " ")
    .replace(/\bD1\s*\+\s*D2\b|\bD1\b|\bD2\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base.toUpperCase() || "NÃO INFORMADA";
}

function sumSegments(segments, itemQty) {
  let pieces = 0;
  let bars = 0;
  const modules = [];
  for (const segment of Array.isArray(segments) ? segments : []) {
    const quantity = Number(segment?.qty ?? 0) * itemQty;
    const barsPerPiece = Number(segment?.barsPerPiece ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    pieces += quantity;
    bars += quantity * (Number.isFinite(barsPerPiece) ? barsPerPiece : 0);
    modules.push({
      sku: normaliseText(segment?.sku) || "NÃO INFORMADO",
      pieces: quantity,
      bars: quantity * (Number.isFinite(barsPerPiece) ? barsPerPiece : 0),
      barsPerPiece: Number.isFinite(barsPerPiece) ? barsPerPiece : 0,
    });
  }
  return { pieces, bars, modules };
}

function createMetrics() {
  return {
    quoteCount: new Set(),
    itemCount: 0,
    modulesQuoted: 0,
    barsQuoted: 0,
    modulesClosed: 0,
    barsClosed: 0,
    modulesSold: 0,
    barsSold: 0,
  };
}

function addMetrics(target, { quoteNumber, status, pieces, bars }) {
  if (!COMMERCIAL_STATUSES.has(status)) return;
  target.quoteCount.add(quoteNumber);
  target.itemCount += 1;
  target.modulesQuoted += pieces;
  target.barsQuoted += bars;
  if (CLOSED_STATUSES.has(status)) {
    target.modulesClosed += pieces;
    target.barsClosed += bars;
  }
  if (status === SOLD_STATUS) {
    target.modulesSold += pieces;
    target.barsSold += bars;
  }
}

function round(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function toRows(map, rowKind) {
  return [...map.values()]
    .map((entry) => ({
      ...entry,
      quoteCount: entry.quoteCount.size,
      modulesQuoted: round(entry.modulesQuoted),
      barsQuoted: round(entry.barsQuoted),
      modulesClosed: round(entry.modulesClosed),
      barsClosed: round(entry.barsClosed),
      modulesSold: round(entry.modulesSold),
      barsSold: round(entry.barsSold),
      rowKind,
    }))
    .sort((a, b) => b.barsQuoted - a.barsQuoted || b.modulesQuoted - a.modulesQuoted || String(a.sku ?? a.moduleSku).localeCompare(String(b.sku ?? b.moduleSku)));
}

function brDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(date);
}

function brDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function applySheetTitle(sheet, title, subtitle, totalColumns) {
  const lastColumn = String.fromCharCode(64 + totalColumns);
  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: COLORS.white } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.getCell("A2").value = subtitle;
  sheet.getCell("A2").font = { italic: true, size: 10, color: { argb: COLORS.gray } };
  sheet.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(2).height = 20;
}

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.white }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue } };
    cell.alignment = { horizontal: "center", vertical: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
    };
  });
  row.height = 32;
}

function styleBodyRow(row, index, numericColumns = []) {
  row.eachCell((cell, columnNumber) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: index % 2 === 0 ? COLORS.paleBlueAlt : COLORS.white },
    };
    cell.font = { size: 10, color: { argb: "1F1F1F" } };
    cell.alignment = { vertical: "center", horizontal: numericColumns.includes(columnNumber) ? "right" : "left", wrapText: false };
    cell.border = { bottom: { style: "hair", color: { argb: COLORS.border } } };
  });
  row.height = 18;
}

function addKpi(sheet, startColumn, label, value, fillColor, numberFormat = "#,##0.00") {
  const column = String.fromCharCode(64 + startColumn);
  const endColumn = String.fromCharCode(64 + startColumn + 1);
  sheet.mergeCells(`${column}4:${endColumn}4`);
  sheet.mergeCells(`${column}5:${endColumn}5`);
  sheet.getCell(`${column}4`).value = label;
  sheet.getCell(`${column}4`).font = { bold: true, size: 9, color: { argb: COLORS.gray } };
  sheet.getCell(`${column}4`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
  sheet.getCell(`${column}4`).alignment = { horizontal: "center" };
  sheet.getCell(`${column}5`).value = value;
  sheet.getCell(`${column}5`).font = { bold: true, size: 15, color: { argb: COLORS.navy } };
  sheet.getCell(`${column}5`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
  sheet.getCell(`${column}5`).alignment = { horizontal: "center" };
  sheet.getCell(`${column}5`).numFmt = numberFormat;
  for (const cell of [sheet.getCell(`${column}4`), sheet.getCell(`${column}5`)]) {
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
    };
  }
}

function configurePrint(sheet, area, repeatHeaderRow) {
  sheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.2, right: 0.2, top: 0.35, bottom: 0.35, header: 0.1, footer: 0.1 },
  };
  sheet.pageSetup.printArea = area;
  if (repeatHeaderRow) sheet.pageSetup.printTitlesRow = repeatHeaderRow;
}

function buildRankingSheet(workbook, title, subtitle, rows, sortField) {
  const sheet = workbook.addWorksheet(title, { views: [{ state: "frozen", ySplit: 6 }] });
  const columns = [
    "Posição", "Família", "Instalação", "SKU do Produto", "Cor da Peça", "Orçamentos", "Itens", "Módulos Orçados", "Barras Orçadas", "Módulos Fechados", "Barras Fechadas", "Módulos Faturados", "Barras Faturadas",
  ];
  applySheetTitle(sheet, title, subtitle, columns.length);
  sheet.getRow(6).values = columns;
  styleHeader(sheet.getRow(6));

  const sorted = [...rows].sort((a, b) => b[sortField] - a[sortField] || b.barsQuoted - a.barsQuoted || a.sku.localeCompare(b.sku));
  sorted.forEach((entry, index) => {
    const row = sheet.addRow([
      index + 1,
      entry.family,
      entry.installation,
      entry.sku,
      entry.color,
      entry.quoteCount,
      entry.itemCount,
      entry.modulesQuoted,
      entry.barsQuoted,
      entry.modulesClosed,
      entry.barsClosed,
      entry.modulesSold,
      entry.barsSold,
    ]);
    styleBodyRow(row, index, [1, 6, 7, 8, 9, 10, 11, 12, 13]);
    row.getCell(1).font = { bold: true, color: { argb: COLORS.navy } };
    if (index < 10) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleGold } };
    }
    [8, 9, 10, 11, 12, 13].forEach((column) => { row.getCell(column).numFmt = "#,##0.00"; });
  });

  sheet.autoFilter = { from: "A6", to: `M${Math.max(6, 6 + sorted.length)}` };
  sheet.columns = [
    { width: 10 }, { width: 23 }, { width: 15 }, { width: 18 }, { width: 24 }, { width: 13 }, { width: 10 }, { width: 18 }, { width: 17 }, { width: 18 }, { width: 17 }, { width: 19 }, { width: 18 },
  ];
  sheet.getColumn(9).eachCell({ includeEmpty: false }, (cell, row) => { if (row > 6) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleBlue } }; });
  if (sortField === "barsSold") {
    sheet.getColumn(13).eachCell({ includeEmpty: false }, (cell, row) => { if (row > 6) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleGreen } }; });
  }
  configurePrint(sheet, `A1:M${Math.max(6, 6 + sorted.length)}`, "6:6");
  return sheet;
}

async function main() {
  const db = await mysql.createConnection(process.env.DATABASE_URL);
  const [sourceRows] = await db.query(`
    SELECT
      q.id AS quoteId,
      q.quoteNumber,
      q.status,
      q.createdAt AS quoteCreatedAt,
      q.approvedAt,
      q.invoicedAt,
      qi.itemNumber,
      qi.itemData
    FROM quote_items qi
    INNER JOIN quote_versions qv ON qv.id = qi.quoteVersionId
    INNER JOIN quotes q ON q.id = qi.quoteId AND qv.version = q.currentVersion
    WHERE JSON_EXTRACT(qi.itemData, '$.profileSegments') IS NOT NULL
    ORDER BY q.createdAt, q.quoteNumber, qi.itemNumber
  `);
  await db.end();

  const productGroups = new Map();
  const moduleGroups = new Map();
  const detailedRows = [];
  const overall = createMetrics();
  const commercialQuoteNumbers = new Set();

  for (const row of sourceRows) {
    let item;
    try { item = JSON.parse(row.itemData); } catch { continue; }
    const status = String(row.status ?? "");
    const itemQty = Number(item.qty ?? 0);
    if (!Number.isFinite(itemQty) || itemQty <= 0) continue;

    const sku = normaliseText(item.sku) || "NÃO INFORMADO";
    const description = normaliseText(item.description || item.quoteSummary || item.orderSummary);
    const family = classifyFamily(description);
    const installation = classifyInstallation(description, sku);
    const color = normaliseText(item.corPeca) || "NÃO INFORMADA";
    const breakdown = sumSegments(item.profileSegments, itemQty);
    if (breakdown.pieces <= 0 && breakdown.bars <= 0) continue;

    const key = [family, installation, sku, color].join("¦");
    if (!productGroups.has(key)) productGroups.set(key, { family, installation, sku, color, ...createMetrics() });
    const group = productGroups.get(key);
    addMetrics(group, { quoteNumber: row.quoteNumber, status, pieces: breakdown.pieces, bars: breakdown.bars });
    addMetrics(overall, { quoteNumber: row.quoteNumber, status, pieces: breakdown.pieces, bars: breakdown.bars });
    if (COMMERCIAL_STATUSES.has(status)) commercialQuoteNumbers.add(row.quoteNumber);

    for (const module of breakdown.modules) {
      const moduleKey = [family, installation, sku, color, module.sku, module.barsPerPiece].join("¦");
      if (!moduleGroups.has(moduleKey)) moduleGroups.set(moduleKey, { family, installation, productSku: sku, color, moduleSku: module.sku, barsPerPiece: module.barsPerPiece, ...createMetrics() });
      addMetrics(moduleGroups.get(moduleKey), { quoteNumber: row.quoteNumber, status, pieces: module.pieces, bars: module.bars });
    }

    detailedRows.push({
      quoteNumber: row.quoteNumber,
      status,
      quoteDate: brDate(row.quoteCreatedAt),
      approvalDate: brDate(row.approvedAt),
      invoiceDate: brDate(row.invoicedAt),
      itemNumber: row.itemNumber,
      family,
      installation,
      sku,
      color,
      description,
      productQty: itemQty,
      modules: round(breakdown.pieces),
      bars: round(breakdown.bars),
    });
  }

  const productRows = toRows(productGroups, "produto");
  const moduleRows = toRows(moduleGroups, "módulo").sort((a, b) => b.barsQuoted - a.barsQuoted || a.moduleSku.localeCompare(b.moduleSku));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Luna — Alfalux Iluminação";
  workbook.created = REPORT_DATE;
  workbook.modified = REPORT_DATE;
  workbook.properties.title = "Relatório Gerencial — Perfis Modulares";
  workbook.properties.subject = "SKUs mais orçados e faturados";
  workbook.properties.keywords = "perfis modulares, SKUs, barras, orçado, faturado";

  const subtitle = `Período: início do sistema até ${brDateTime(REPORT_DATE)} • Fonte: snapshots da revisão vigente de cada orçamento`;
  const totalMetrics = {
    quoteCount: overall.quoteCount.size,
    productRows: productRows.length,
    barsQuoted: round(overall.barsQuoted),
    barsSold: round(overall.barsSold),
  };

  const overview = workbook.addWorksheet("Visão Geral", { views: [{ state: "frozen", ySplit: 7 }] });
  applySheetTitle(overview, "RELATÓRIO GERENCIAL — PERFIS MODULARES", subtitle, 8);
  addKpi(overview, 1, "ORÇAMENTOS COM PERFIS", totalMetrics.quoteCount, COLORS.paleBlue, "#,##0");
  addKpi(overview, 3, "COMBINAÇÕES DE SKU", totalMetrics.productRows, COLORS.paleGold, "#,##0");
  addKpi(overview, 5, "BARRAS ORÇADAS", totalMetrics.barsQuoted, COLORS.paleBlue, "#,##0.00");
  addKpi(overview, 7, "BARRAS FATURADAS", totalMetrics.barsSold, COLORS.paleGreen, "#,##0.00");
  overview.mergeCells("A7:H7");
  overview.getCell("A7").value = "LEITURA DAS MÉTRICAS";
  overview.getCell("A7").font = { bold: true, color: { argb: COLORS.white } };
  overview.getCell("A7").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue } };
  overview.getCell("A7").alignment = { horizontal: "left" };
  const notes = [
    ["Orçado", "Soma de módulos e barras em orçamentos comerciais abertos, aprovados, faturados ou perdidos; cada orçamento entra somente pela sua revisão vigente."],
    ["Fechado", "Itens de orçamentos aprovados ou faturados."],
    ["Vendido", "Itens de orçamentos faturados. A aba “Ranking Faturado” apresenta o ranking comercial de vendas."],
    ["SKU do Produto", "SKU-base configurado no orçamento. A aba “Módulos por SKU” detalha os módulos ML, IF e cantos usados nas composições."],
    ["Cor", "Cor da peça registrada no snapshot técnico do item. “Não informada” identifica registros históricos sem esse preenchimento."],
  ];
  overview.mergeCells("A8:B8");
  overview.mergeCells("C8:H8");
  overview.getCell("A8").value = "Conceito";
  overview.getCell("C8").value = "Critério";
  [overview.getCell("A8"), overview.getCell("C8")].forEach((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.white }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.blue } };
    cell.alignment = { horizontal: "center", vertical: "center" };
  });
  overview.getRow(8).height = 24;
  notes.forEach((entry, index) => {
    const rowNumber = 9 + index;
    overview.mergeCells(`A${rowNumber}:B${rowNumber}`);
    overview.mergeCells(`C${rowNumber}:H${rowNumber}`);
    const concept = overview.getCell(`A${rowNumber}`);
    const criterion = overview.getCell(`C${rowNumber}`);
    concept.value = entry[0];
    criterion.value = entry[1];
    [concept, criterion].forEach((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 === 0 ? COLORS.paleBlueAlt : COLORS.white } };
      cell.border = { bottom: { style: "hair", color: { argb: COLORS.border } } };
      cell.alignment = { wrapText: true, vertical: "top" };
      cell.font = { size: 10, color: { argb: "1F1F1F" } };
    });
    concept.font = { bold: true, size: 10, color: { argb: COLORS.navy } };
    overview.getRow(rowNumber).height = 34;
  });
  overview.columns = Array.from({ length: 8 }, () => ({ width: 15 }));
  configurePrint(overview, "A1:H13");

  buildRankingSheet(workbook, "Ranking Orçado", subtitle, productRows, "barsQuoted");
  buildRankingSheet(workbook, "Ranking Faturado", subtitle, productRows.filter((entry) => entry.barsSold > 0), "barsSold");

  const moduleSheet = workbook.addWorksheet("Módulos por SKU", { views: [{ state: "frozen", ySplit: 6 }] });
  const moduleColumns = ["Família", "Instalação", "SKU do Produto", "Cor da Peça", "SKU do Módulo", "Barras por Peça", "Orçamentos", "Módulos Orçados", "Barras Orçadas", "Módulos Fechados", "Barras Fechadas", "Módulos Faturados", "Barras Faturadas"];
  applySheetTitle(moduleSheet, "MÓDULOS DA COMPOSIÇÃO — DETALHAMENTO POR SKU", subtitle, moduleColumns.length);
  moduleSheet.getRow(6).values = moduleColumns;
  styleHeader(moduleSheet.getRow(6));
  moduleRows.forEach((entry, index) => {
    const row = moduleSheet.addRow([
      entry.family, entry.installation, entry.productSku, entry.color, entry.moduleSku, entry.barsPerPiece,
      entry.quoteCount, entry.modulesQuoted, entry.barsQuoted, entry.modulesClosed, entry.barsClosed, entry.modulesSold, entry.barsSold,
    ]);
    styleBodyRow(row, index, [6, 7, 8, 9, 10, 11, 12, 13]);
    [6, 8, 9, 10, 11, 12, 13].forEach((column) => { row.getCell(column).numFmt = "#,##0.00"; });
  });
  moduleSheet.autoFilter = { from: "A6", to: `M${Math.max(6, 6 + moduleRows.length)}` };
  moduleSheet.columns = [{ width: 22 }, { width: 15 }, { width: 18 }, { width: 24 }, { width: 23 }, { width: 16 }, { width: 13 }, { width: 18 }, { width: 17 }, { width: 18 }, { width: 17 }, { width: 19 }, { width: 18 }];
  configurePrint(moduleSheet, `A1:M${Math.max(6, 6 + moduleRows.length)}`, "6:6");

  const detailSheet = workbook.addWorksheet("Base Detalhada", { views: [{ state: "frozen", ySplit: 6 }] });
  const detailColumns = ["Nº Orçamento", "Status", "Data do Orçamento", "Aprovado em", "Faturado em", "Item", "Família", "Instalação", "SKU do Produto", "Cor da Peça", "Descrição", "Qtd. Produtos", "Qtd. Módulos", "Qtd. Barras"];
  applySheetTitle(detailSheet, "BASE DETALHADA — PERFIS MODULARES", subtitle, detailColumns.length);
  detailSheet.getRow(6).values = detailColumns;
  styleHeader(detailSheet.getRow(6));
  detailedRows.forEach((entry, index) => {
    const row = detailSheet.addRow([
      entry.quoteNumber, entry.status, entry.quoteDate, entry.approvalDate, entry.invoiceDate, entry.itemNumber,
      entry.family, entry.installation, entry.sku, entry.color, entry.description, entry.productQty, entry.modules, entry.bars,
    ]);
    styleBodyRow(row, index, [6, 12, 13, 14]);
    [12, 13, 14].forEach((column) => { row.getCell(column).numFmt = "#,##0.00"; });
  });
  detailSheet.autoFilter = { from: "A6", to: `N${Math.max(6, 6 + detailedRows.length)}` };
  detailSheet.columns = [{ width: 15 }, { width: 12 }, { width: 17 }, { width: 15 }, { width: 15 }, { width: 8 }, { width: 22 }, { width: 15 }, { width: 18 }, { width: 24 }, { width: 55 }, { width: 15 }, { width: 15 }, { width: 14 }];
  detailSheet.getColumn(11).alignment = { wrapText: true, vertical: "top" };
  configurePrint(detailSheet, `A1:N${Math.max(6, 6 + detailedRows.length)}`, "6:6");

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = resolve(OUTPUT_DIR, "Relatorio_Gerencial_Perfis_Modulares_2026-09-23.xlsx");
  await writeFile(outputPath, await workbook.xlsx.writeBuffer());

  console.log(JSON.stringify({
    outputPath,
    sourceItemSnapshots: sourceRows.length,
    commercialQuotes: commercialQuoteNumbers.size,
    productSkuColorCombinations: productRows.length,
    moduleSkuCombinations: moduleRows.length,
    detailedRows: detailedRows.length,
    metrics: totalMetrics,
    topQuoted: productRows.slice(0, 5).map(({ family, installation, sku, color, barsQuoted, modulesQuoted }) => ({ family, installation, sku, color, barsQuoted, modulesQuoted })),
    topSold: [...productRows].filter((entry) => entry.barsSold > 0).sort((a, b) => b.barsSold - a.barsSold).slice(0, 5).map(({ family, installation, sku, color, barsSold, modulesSold }) => ({ family, installation, sku, color, barsSold, modulesSold })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
