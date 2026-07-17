import ExcelJS from "exceljs";
import { CartItemData } from "./cartTypes";
import type { LinkedAccessory } from "./cartTypes";
import { toBrasiliaDate, toBrasiliaDateTime } from "./dateUtils";
import { groupOrderItems } from "./orderGrouping";

export interface OrderFormData {
  clientName: string;
  projectName: string;
  quoteNumber: string;
  /** Número do pedido de fábrica (digitado manualmente). Se informado, aparece no Excel em vez do quoteNumber. */
  orderNumber?: string;
  vendorName: string;
  date: string;
  /** Empresa fabricante: "ALFALUX" (padrão) ou "LUMINEW" */
  empresa?: "ALFALUX" | "LUMINEW";
  /** Prazo acordado em dias úteis (padrão: 20). O Excel exibe prazo - 1 (logística). */
  deliveryDays?: number;
  /** Data de aprovação do orçamento (ISO string) para calcular prazo */
  approvedAt?: string;
  /**
   * Se fornecido, usa esta data diretamente em vez de calcular.
   * Formato: "DD/MM/YYYY"
   */
  precomputedDeliveryDate?: string;
  /**
   * Número de dias úteis já calculado (prazo - 1).
   * Se fornecido, usa este valor em vez de calcular.
   */
  precomputedDisplayDays?: number;
}

/** Cache de feriados nacionais por ano */
const _holidayCache: Record<number, Set<string>> = {};

async function fetchHolidays(year: number): Promise<Set<string>> {
  if (_holidayCache[year]) return _holidayCache[year];
  try {
    const resp = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
    if (!resp.ok) throw new Error(`BrasilAPI status ${resp.status}`);
    const data = await resp.json() as Array<{ date: string }>;
    const set = new Set(data.map((h: { date: string }) => h.date.slice(0, 10)));
    _holidayCache[year] = set;
    return set;
  } catch {
    return new Set<string>();
  }
}

/**
 * Calcula data de entrega adicionando dias úteis (seg-sex) a partir de uma data base,
 * descontando feriados nacionais.
 */
function addBusinessDays(start: Date, days: number, holidays: Set<string> = new Set()): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    const dateStr = result.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !holidays.has(dateStr)) added++;
  }
  return result;
}

/**
 * Calcula a data de entrega para o pedido de fábrica.
 * - Prazo exibido = deliveryDays - 1 (1 dia reservado para logística)
 * - Desconta feriados nacionais via BrasilAPI
 */
export async function calcDeliveryDate(
  approvedAt: string | undefined,
  deliveryDays: number = 20
): Promise<{ displayDays: number; deliveryDate: Date; deliveryDateStr: string }> {
  const displayDays = deliveryDays - 1;
  const base = approvedAt ? new Date(approvedAt) : new Date();
  const startYear = base.getFullYear();
  const [h1, h2] = await Promise.all([
    fetchHolidays(startYear),
    fetchHolidays(startYear + 1),
  ]);
  const holidays = new Set([...Array.from(h1), ...Array.from(h2)]);
  const deliveryDate = addBusinessDays(base, displayDays, holidays);
  const deliveryDateStr = toBrasiliaDate(deliveryDate);
  return { displayDays, deliveryDate, deliveryDateStr };
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
 * Gera o texto da coluna EQUIPAMENTOS para luminárias (downlights, spots, etc.)
 * com driverLines — inclui a corrente de programação do driver logo após o nome.
 * Formato: "1x DRIVER PHILIPS CERTADRIVE 20W 500MA (EQ00353)\nPROGRAMAÇÃO: 500MA"
 */
function buildLuminariaEquipamentosText(item: CartItemData): string {
  if (!item.driverLines || item.driverLines.length === 0) {
    return item.drivers ?? "";
  }
  return item.driverLines.map(dl => {
    const codeSuffix = dl.driverCode ? ` (${dl.driverCode})` : "";
    const linha = `${dl.driverQty}x ${dl.driverModel}${codeSuffix}`;
    if (dl.corrente && !dl.driverModel.toUpperCase().includes("FONTE 24V")) {
      return `${linha}\nPROGRAMAÇÃO: ${dl.corrente}`;
    }
    return linha;
  }).join("\n");
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
    // Se tem driverLines (luminária com driver desmembrado), usar buildLuminariaEquipamentosText
    if (item.driverLines && item.driverLines.length > 0) {
      return buildLuminariaEquipamentosText(item);
    }
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
 * Usa sempre a description curta do produto (ex: "BLAZE EMBUTIR 18W 3000K DIM DALI 220Vac 55875mm").
 * ETIQUETA (coluna C) fica em branco.
 */
function buildProdutoText(item: CartItemData): string {
  return item.description || "";
}

/**
 * Retorna true se o item é um LED BAR U (tem dados específicos de cortes).
 */
function isLedBar(item: CartItemData): boolean {
  return item.category === "LED BAR" && item.ledBarNCortes !== undefined;
}

/**
 * Gera o texto da coluna FONTE DE LUZ para o LED BAR U.
 * Formato:
 *   "Módulo: FITA LED HOPELUMI 24V 10W/M 3000K"
 *   "Trechos: 2x de 1500mm"
 */
function buildLedBarFonteLuzText(item: CartItemData): string {
  const nCortes = item.ledBarNCortes ?? 1;
  const mm = item.ledBarComprimentoPorTrechoMm ?? item.ledBarComprimentoTotalMm ?? 0;
  const modulo = item.moduloLed ?? "";
  const linhas: string[] = [];
  if (modulo) linhas.push(`Módulo: ${modulo}`);
  if (nCortes > 1) {
    linhas.push(`Trechos: ${nCortes}x de ${mm}mm`);
  } else {
    linhas.push(`Comprimento: ${mm}mm`);
  }
  return linhas.join("\n");
}

/**
 * Gera o texto da coluna EQUIPAMENTOS para o LED BAR U.
 * Formato: "2x FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM (EQ00112)"
 */
function buildLedBarEquipamentosText(item: CartItemData): string {
  const nCortes = item.ledBarNCortes ?? 1;
  const model = item.ledBarDriverModel ?? "";
  const code = item.ledBarDriverCode ?? "";
  if (!model) return item.drivers ?? "";
  const codeSuffix = code ? ` (${code})` : "";
  return `${nCortes}x ${model}${codeSuffix}`;
}

export async function generateOrderExcel(items: CartItemData[], form: OrderFormData): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Configurador Alfalux";
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
  valueCell(ws.getCell("G3"), form.orderNumber || form.quoteNumber);
  ws.getCell("G3").font = { bold: true, size: 11 };
  valueCell(ws.getCell("G4"), form.vendorName);

  // Col H-I: label PRAZO (merge H3:I3) e ALFALUX/LUMINEW (merge H4:J4)
  ws.mergeCells("H3:I3");
  labelCell(ws.getCell("H3"), "PRAZO DE PRODUÇÃO:");
  ws.getCell("H3").alignment = { horizontal: "left", vertical: "middle" };
  // Calcular e exibir data de entrega prevista
  {
    // Se já foi pré-calculado (com feriados), usar diretamente
    const displayDays = form.precomputedDisplayDays ?? (form.deliveryDays ?? 20) - 1;
    const dateStr = form.precomputedDeliveryDate
      ?? (() => {
        const base = form.approvedAt ? new Date(form.approvedAt) : new Date();
        return toBrasiliaDate(addBusinessDays(base, displayDays));
      })();
    const prazoStr = `${displayDays} dias úteis → ${dateStr}`;
    ws.mergeCells("J3:K3");
    const prazoCell = ws.getCell("J3");
    prazoCell.value = prazoStr;
    prazoCell.font = { bold: true, size: 10, color: { argb: "FFCC0000" } };
    prazoCell.alignment = { horizontal: "left", vertical: "middle" };
  }

  ws.mergeCells("H4:J4");
  const brandCell = ws.getCell("H4");
  const isLuminew = form.empresa === "LUMINEW";
  brandCell.value = isLuminew
    ? "1 - ALFALUX     (    )                    2 - LUMINEW     (  X  )"
    : "1 - ALFALUX     (  X  )                    2 - LUMINEW     (    )";
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

  // Filtrar itens de "Não Orçamos" pois são apenas indicativos e não devem aparecer na ficha de produção
  // Agrupar itens idênticos (mesmo produto, CCT, cor, drivers) somando quantidades e concatenando etiquetas com pavimento
  const orderItems = groupOrderItems(items.filter(item => item.category !== 'Não Orçamos'));

  for (let i = 0; i < orderItems.length; i++) {
    const item = orderItems[i];
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

    // ETIQUETA (C) — usar itemEmPlanta do orçamento ("ITEM NO PROJETO")
    fillRow(ws.getCell(`C${rowNum}`), item.itemEmPlanta ?? "");

    // PRODUTO (D) — apenas a descrição do produto (orderSummary para perfis, description para outros)
    // Para Item Especial: usa description + dimensões/potência se disponíveis
    const prodDesc = item.category === "Item Especial"
      ? [item.description, item.specialDimensions, item.specialPower].filter(Boolean).join(" | ")
      : buildProdutoText(item);
    const dCell = ws.getCell(`D${rowNum}`);
    dCell.value = prodDesc;
    dCell.font = { size: 10 };
    dCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    dCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    applyBorder(dCell);

    // SKU (E) — para perfis: multi-segmento "QTY x SKU - LENGTHmm" por linha
    // Para Item Especial: SKU vazio ou "ITEM ESPECIAL"
    const skuText = item.category === "Item Especial"
      ? (item.sku || "ITEM ESPECIAL")
      : buildProfileSkuText(item);
    const eCell = ws.getCell(`E${rowNum}`);
    eCell.value = skuText;
    eCell.font = { size: 10 };
    eCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    eCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    applyBorder(eCell);

    // FONTE DE LUZ (F) — LED BAR: módulo + trechos; perfis: multi-segmento
    // Para Item Especial: dim + potência + DIM + tensão
    const fonteText = item.category === "Item Especial"
      ? [item.specialPower, item.specialDim, item.specialVoltage].filter(Boolean).join(" | ") || "-"
      : isLedBar(item)
        ? buildLedBarFonteLuzText(item)
        : buildProfileFonteLuzText(item);
    const fCell = ws.getCell(`F${rowNum}`);
    fCell.value = fonteText;
    fCell.font = { size: 10 };
    fCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    fCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    applyBorder(fCell);

    // EQUIPAMENTOS (G) — LED BAR: QTY x driver; perfis: multi-segmento
    // Para Item Especial: lista de equipamentos definidos (drivers, módulos LED, etc.)
    const buildSpecialEquipText = () => {
      const equips = (item as any).specialEquipments as Array<{ codigo?: string; descricao: string; qty: number; familia?: string }> | undefined;
      if (equips && equips.length > 0) {
        return equips.map(e => `${e.qty}x ${e.descricao}${e.codigo ? ` (${e.codigo})` : ''}`).join('\n');
      }
      return "A DEFINIR";
    };
    const equipText = item.category === "Item Especial"
      ? buildSpecialEquipText()
      : isLedBar(item)
        ? buildLedBarEquipamentosText(item)
        : buildProfileEquipamentosText(item);
    const gCell = ws.getCell(`G${rowNum}`);
    gCell.value = equipText;
    gCell.font = { size: 10 };
    gCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    gCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    applyBorder(gCell);

    // QTD (H)
    fillRow(ws.getCell(`H${rowNum}`), item.qty, true);

    // COR DA PEÇA (I) — cor escolhida pelo usuário ou "A Definir"
    // Para Item Especial: usa specialColor se disponível, depois corPeca
    const corPecaValue = item.category === "Item Especial"
      ? (item.specialColor || item.corPeca || "A Definir")
      : (item.corPeca ?? "A Definir");
    fillRow(ws.getCell(`I${rowNum}`), corPecaValue);

    // OBSERVAÇÕES (J) — para Item Especial: observações internas; para outros: deixar em branco
    const obsValue = item.category === "Item Especial" ? (item.specialInternalNotes || "") : "";
    fillRow(ws.getCell(`J${rowNum}`), obsValue);
    // ── Sub-linhas de acessórios vinculados ──────────────────────────────
    if (item.accessories && item.accessories.length > 0) {
      (item.accessories as LinkedAccessory[]).forEach((acc) => {
        ws.spliceRows(rowNum + 1, 0, []);
        const accRowNum = rowNum + 1;
        ws.getRow(accRowNum).height = 20;
        const ACC_BG = "FFE0F7FA";
        const fillAcc = (cell: ExcelJS.Cell, value: string | number | null, bold = false) => {
          cell.value = value ?? "";
          cell.font = { size: 9, bold, italic: true, color: { argb: "FF006064" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACC_BG } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          applyBorder(cell);
        };
        fillAcc(ws.getCell(`A${accRowNum}`), "");
        fillAcc(ws.getCell(`B${accRowNum}`), "");
        fillAcc(ws.getCell(`C${accRowNum}`), "");
        const accDCell = ws.getCell(`D${accRowNum}`);
        accDCell.value = `↳ Acessório: ${acc.descricao}`;
        accDCell.font = { size: 9, italic: true, color: { argb: "FF006064" } };
        accDCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACC_BG } };
        accDCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        applyBorder(accDCell);
        fillAcc(ws.getCell(`E${accRowNum}`), acc.codigo ?? "");
        fillAcc(ws.getCell(`F${accRowNum}`), "");
        fillAcc(ws.getCell(`G${accRowNum}`), "");
        fillAcc(ws.getCell(`H${accRowNum}`), acc.qty, true);
        fillAcc(ws.getCell(`I${accRowNum}`), "");
        fillAcc(ws.getCell(`J${accRowNum}`), "");
      });
    }
  }
  // Aguardar todas as imagenss
  await Promise.allSettled(imagePromises);

  // ─── Linha de observações gerais ─────────────────────────────────────────
  const obsRow = DATA_START + orderItems.length + 1;
  ws.getRow(obsRow).height = 22;
  ws.mergeCells(`A${obsRow}:C${obsRow}`);
  labelCell(ws.getCell(`A${obsRow}`), "OBSERVAÇÕES GERAIS");
  ws.mergeCells(`D${obsRow}:J${obsRow}`);
  valueCell(ws.getCell(`D${obsRow}`), "");

  // ─── Rodapé com data/hora/revisão em todas as páginas ──────────────────────────────────────────────────────────────
  const emitidoEm = toBrasiliaDateTime(Date.now());
  const pedidoFooter = form.orderNumber || form.quoteNumber;
  ws.headerFooter = {
    oddFooter: `&L&8Ficha T\u00e9cnica de Produ\u00e7\u00e3o \u2014 ${pedidoFooter}&R&8Emitido em: ${emitidoEm} (Hor\u00e1rio de Bras\u00edlia) | ${form.quoteNumber}`,
    evenFooter: `&L&8Ficha T\u00e9cnica de Produ\u00e7\u00e3o \u2014 ${pedidoFooter}&R&8Emitido em: ${emitidoEm} (Hor\u00e1rio de Bras\u00edlia) | ${form.quoteNumber}`,
  };

  // ─── Gerar, baixar e retornar buffer ──────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PEDIDO-FABRICA-${form.orderNumber || form.quoteNumber}-${form.clientName.replace(/\s+/g, "_")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return buffer as ArrayBuffer;
}