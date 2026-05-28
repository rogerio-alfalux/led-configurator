import ExcelJS from "exceljs";
import { CartItemData } from "./cartTypes";

export interface OrderFormData {
  clientName: string;
  projectName: string;
  quoteNumber: string;
  vendorName: string;
  date: string;
}

const HEADER_BG = "FF1F3864"; // Azul escuro (similar ao template)
const HEADER_FONT_COLOR = "FFFFFFFF";
const ROW_BG_ODD = "FFDCE6F1";  // Azul claro alternado
const ROW_BG_EVEN = "FFFFFFFF"; // Branco
const BORDER_COLOR = "FF8EA9C1";

function applyBorder(cell: ExcelJS.Cell, style: ExcelJS.BorderStyle = "thin") {
  cell.border = {
    top: { style, color: { argb: BORDER_COLOR } },
    bottom: { style, color: { argb: BORDER_COLOR } },
    left: { style, color: { argb: BORDER_COLOR } },
    right: { style, color: { argb: BORDER_COLOR } },
  };
}

function headerCell(cell: ExcelJS.Cell, value: string, fontSize = 10) {
  cell.value = value;
  cell.font = { bold: true, size: fontSize, color: { argb: HEADER_FONT_COLOR } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  applyBorder(cell, "medium");
}

function labelCell(cell: ExcelJS.Cell, value: string) {
  cell.value = value;
  cell.font = { bold: true, size: 10 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
  cell.alignment = { horizontal: "left", vertical: "middle" };
  applyBorder(cell);
}

function valueCell(cell: ExcelJS.Cell, value: string | number | null) {
  cell.value = value ?? "";
  cell.font = { size: 10 };
  cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  applyBorder(cell);
}

/**
 * Formata quantidade com zero à esquerda para 2 dígitos (ex: 2 → "02", 19 → "19").
 */
function fmtQty(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Gera o texto da coluna SKU para composições de perfis.
 * Formato: "02 x LLE-2810.3IF.18F - 1710mm" por segmento, um por linha.
 */
function buildProfileSkuText(item: CartItemData): string {
  if (!item.profileSegments || item.profileSegments.length === 0) {
    return item.sku ?? "";
  }
  return item.profileSegments
    .map((seg) => `${fmtQty(seg.qty)} x ${seg.sku} - ${seg.lengthMm}mm`)
    .join("\n");
}

/**
 * Gera o texto da coluna FONTE DE LUZ para composições de perfis.
 *
 * Regras:
 * - 18W ou 26W: cada barra = 1 Stripflex → qty de barras = barsPerPiece
 * - 36W Stripflex (barra dupla): barsPerPiece já é 2 → qty de barras = barsPerPiece
 * - 36W Stripline: usa nome Stripline 562,5 x 15mm 108L [CCT]
 *
 * Formato por segmento:
 *   "LLE-2810.3IF.18F - 03 x Stripflex 562,5 x 10mm 36L 3000K"
 */
function buildProfileFonteLuzText(item: CartItemData): string {
  if (!item.profileSegments || item.profileSegments.length === 0) {
    // Fallback para produtos não-perfil
    return item.moduloLed ?? [item.power, item.cct].filter(Boolean).join(" | ") ?? "";
  }

  const cct = item.cct ?? "";
  const isStripline = item.stripMethod === "STRIPLINE";

  return item.profileSegments
    .map((seg) => {
      const barName = isStripline
        ? `Stripline 562,5 x 15mm 108L ${cct}`
        : `Stripflex 562,5 x 10mm 36L ${cct}`;
      const barQty = seg.barsPerPiece; // já inclui duplicação para 36W Stripflex
      return `${seg.sku} - ${fmtQty(barQty)} x ${barName}`;
    })
    .join("\n");
}

/**
 * Gera o texto da coluna EQUIPAMENTOS para composições de perfis.
 *
 * Formato por segmento:
 *   "LLE-2810.3IF.18F - 02 x PHILIPS XITANIUM 44W 350MA (EQ00347)"
 *
 * Para drivers combo (ex: Stripline 3 barras = 44W + 65W), o driverModel
 * já foi formatado como "1 x MODEL1 (CODE1) + 1 x MODEL2 (CODE2)" no Home.tsx.
 */
function buildProfileEquipamentosText(item: CartItemData): string {
  if (!item.profileSegments || item.profileSegments.length === 0) {
    return item.drivers ?? "";
  }

  return item.profileSegments
    .map((seg) => {
      // Se driverModel já contém formatação de combo (tem " + "), usar direto
      if (seg.driverModel.includes(" + ")) {
        return `${seg.sku} - ${seg.driverModel}`;
      }
      // Driver simples: "SKU - QTY x MODEL (CODE)"
      const codeSuffix = seg.driverCode && seg.driverCode !== "ERRO"
        ? ` (${seg.driverCode})`
        : "";
      return `${seg.sku} - ${fmtQty(seg.driverQtyPerPiece)} x ${seg.driverModel}${codeSuffix}`;
    })
    .join("\n");
}

/**
 * Gera o texto da coluna PRODUTO para a Ficha Técnica de Produção.
 * Para perfis: usa orderSummary (resumo técnico completo).
 * Para outros produtos: usa description.
 * ETIQUETA (coluna C) fica em branco.
 */
function buildProdutoText(item: CartItemData): string {
  // Para perfis, o orderSummary contém o resumo técnico completo (gerado por generateOrderSummary)
  if (item.category === "Perfis" && item.orderSummary) {
    return item.orderSummary;
  }
  // Para outros produtos, usar description
  return item.description || "";
}

export async function generateOrderExcel(items: CartItemData[], form: OrderFormData): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Alfalux LED Configurator";
  wb.created = new Date();

  const ws = wb.addWorksheet("Pedido", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  // ─── Larguras das colunas (A-J) ──────────────────────────────────────────
  ws.columns = [
    { key: "A", width: 8 },   // ITEM
    { key: "B", width: 14 },  // PA
    { key: "C", width: 15 },  // ETIQUETA
    { key: "D", width: 28 },  // PRODUTO
    { key: "E", width: 26 },  // SKU
    { key: "F", width: 38 },  // FONTE DE LUZ
    { key: "G", width: 48 },  // EQUIPAMENTOS
    { key: "H", width: 8 },   // QTD
    { key: "I", width: 18 },  // COR DA PEÇA
    { key: "J", width: 48 },  // OBSERVAÇÕES
  ];

  // ─── Linha 1: Título ─────────────────────────────────────────────────────
  ws.mergeCells("A1:J1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "FICHA TÉCNICA DE PRODUÇÃO";
  titleCell.font = { bold: true, size: 16, color: { argb: HEADER_FONT_COLOR } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  // ─── Linha 2: Espaço ─────────────────────────────────────────────────────
  ws.getRow(2).height = 6;

  // ─── Linhas 3-4: Cabeçalho com dados ─────────────────────────────────────
  ws.getRow(3).height = 28;
  ws.getRow(4).height = 28;

  // Col A: label CLIENTE (merge A3:A4)
  ws.mergeCells("A3:A4");
  labelCell(ws.getCell("A3"), "CLIENTE");
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  // Col B-E: valor cliente/obra (merge B3:E4)
  ws.mergeCells("B3:E4");
  const clientCell = ws.getCell("B3");
  clientCell.value = `${form.clientName}${form.projectName ? " / " + form.projectName : ""}`;
  clientCell.font = { bold: true, size: 11 };
  clientCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  applyBorder(clientCell);

  // Col F: label PEDIDO (F3) e VENDEDOR (F4)
  labelCell(ws.getCell("F3"), "PEDIDO:");
  labelCell(ws.getCell("F4"), "VENDEDOR:");

  // Col G: valor pedido (G3) e valor vendedor (G4)
  valueCell(ws.getCell("G3"), form.quoteNumber);
  ws.getCell("G3").font = { bold: true, size: 11 };
  valueCell(ws.getCell("G4"), form.vendorName);

  // Col H-I: label PRAZO (merge H3:I3) e ALFALUX/LUMINEW (merge H4:J4)
  ws.mergeCells("H3:I3");
  labelCell(ws.getCell("H3"), "PRAZO DE PRODUÇÃO:");
  ws.getCell("H3").alignment = { horizontal: "left", vertical: "middle" };

  ws.mergeCells("H4:J4");
  const brandCell = ws.getCell("H4");
  brandCell.value = "1 - ALFALUX     (  X  )                    2 - LUMINEW     (    )";
  brandCell.font = { bold: true, size: 10 };
  brandCell.alignment = { horizontal: "left", vertical: "middle" };
  applyBorder(brandCell);

  // Col J3: data
  valueCell(ws.getCell("J3"), form.date);

  // ─── Linha 5: Espaço ─────────────────────────────────────────────────────
  ws.getRow(5).height = 6;

  // ─── Linha 6: Cabeçalho da tabela ────────────────────────────────────────
  ws.getRow(6).height = 36;
  const headers = ["ITEM", "PA", "ETIQUETA", "PRODUTO", "SKU", "FONTE DE LUZ", "EQUIPAMENTOS", "QTD", "COR DA PEÇA", "OBSERVAÇÕES"];
  const colLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  headers.forEach((h, i) => {
    headerCell(ws.getCell(`${colLetters[i]}6`), h, 10);
  });

  // ─── Linhas de dados ─────────────────────────────────────────────────────
  const DATA_START = 7;
  const imagePromises: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = DATA_START + i;
    const row = ws.getRow(rowNum);

    // Altura dinâmica: perfis com múltiplos segmentos precisam de mais espaço
    const segCount = item.profileSegments?.length ?? 1;
    row.height = Math.max(60, segCount * 22);

    const isOdd = i % 2 === 0;
    const rowBg = isOdd ? ROW_BG_ODD : ROW_BG_EVEN;

    const fillRow = (cell: ExcelJS.Cell, value: string | number | null, bold = false) => {
      cell.value = value ?? "";
      cell.font = { size: 10, bold };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      applyBorder(cell);
    };

    // ITEM (A)
    fillRow(ws.getCell(`A${rowNum}`), i + 1, true);

    // PA (B) — deixar em branco para preenchimento manual
    fillRow(ws.getCell(`B${rowNum}`), "");

    // ETIQUETA (C) — deixar em BRANCO (conforme requisito)
    fillRow(ws.getCell(`C${rowNum}`), "");

    // PRODUTO (D) — apenas a descrição do produto (orderSummary para perfis, description para outros)
    const prodDesc = buildProdutoText(item);
    const dCell = ws.getCell(`D${rowNum}`);
    dCell.value = prodDesc;
    dCell.font = { size: 10 };
    dCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    dCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    applyBorder(dCell);

    // SKU (E) — para perfis: multi-segmento "QTY x SKU - LENGTHmm" por linha
    const skuText = buildProfileSkuText(item);
    const eCell = ws.getCell(`E${rowNum}`);
    eCell.value = skuText;
    eCell.font = { size: 10 };
    eCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    eCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    applyBorder(eCell);

    // FONTE DE LUZ (F) — para perfis: multi-segmento "SKU - QTY x Stripflex/Stripline [CCT]"
    const fonteText = buildProfileFonteLuzText(item);
    const fCell = ws.getCell(`F${rowNum}`);
    fCell.value = fonteText;
    fCell.font = { size: 10 };
    fCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    fCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    applyBorder(fCell);

    // EQUIPAMENTOS (G) — para perfis: multi-segmento "SKU - QTY x DRIVER (CODE)"
    const equipText = buildProfileEquipamentosText(item);
    const gCell = ws.getCell(`G${rowNum}`);
    gCell.value = equipText;
    gCell.font = { size: 10 };
    gCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    gCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    applyBorder(gCell);

    // QTD (H)
    fillRow(ws.getCell(`H${rowNum}`), item.qty, true);

    // COR DA PEÇA (I) — cor escolhida pelo usuário ou "A Definir"
    fillRow(ws.getCell(`I${rowNum}`), item.corPeca ?? "A Definir");

    // OBSERVAÇÕES (J) — deixar em branco
    fillRow(ws.getCell(`J${rowNum}`), "");
  }

  // Aguardar todas as imagens
  await Promise.allSettled(imagePromises);

  // ─── Linha de observações gerais ─────────────────────────────────────────
  const obsRow = DATA_START + items.length + 1;
  ws.getRow(obsRow).height = 22;
  ws.mergeCells(`A${obsRow}:C${obsRow}`);
  labelCell(ws.getCell(`A${obsRow}`), "OBSERVAÇÕES GERAIS");
  ws.mergeCells(`D${obsRow}:J${obsRow}`);
  valueCell(ws.getCell(`D${obsRow}`), "");

  // ─── Gerar e baixar ──────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PEDIDO-FABRICA-${form.quoteNumber}-${form.clientName.replace(/\s+/g, "_")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
