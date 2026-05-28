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
    { key: "D", width: 22 },  // PRODUTO
    { key: "E", width: 22 },  // SKU
    { key: "F", width: 34 },  // FONTE DE LUZ
    { key: "G", width: 44 },  // EQUIPAMENTOS
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
    row.height = 60;

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

    // ETIQUETA (C) — SKU do produto
    fillRow(ws.getCell(`C${rowNum}`), item.sku ?? "");

    // PRODUTO (D) — nome/descrição curta
    const prodDesc = item.description?.split(" – ")[0] ?? item.description ?? "";
    fillRow(ws.getCell(`D${rowNum}`), prodDesc);
    ws.getCell(`D${rowNum}`).alignment = { horizontal: "left", vertical: "middle", wrapText: true };

    // SKU (E) — descrição completa / orderSummary
    fillRow(ws.getCell(`E${rowNum}`), item.orderSummary ?? item.description ?? "");
    ws.getCell(`E${rowNum}`).alignment = { horizontal: "left", vertical: "middle", wrapText: true };

    // FONTE DE LUZ (F) — módulo LED do produto
    const fonteInfo = item.moduloLed ?? [item.power, item.cct].filter(Boolean).join(" | ") ?? "";
    fillRow(ws.getCell(`F${rowNum}`), fonteInfo);
    ws.getCell(`F${rowNum}`).alignment = { horizontal: "left", vertical: "middle", wrapText: true };

    // EQUIPAMENTOS (G) — drivers do produto
    const equipInfo = item.drivers ?? "";
    fillRow(ws.getCell(`G${rowNum}`), equipInfo);
    ws.getCell(`G${rowNum}`).alignment = { horizontal: "left", vertical: "middle", wrapText: true };

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
