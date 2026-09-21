import ExcelJS from "exceljs";
import { CartItemData } from "./cartTypes";
import type { LinkedAccessory } from "./cartTypes";
import { formatProfileSkuLines } from "./profileSkuFormatter";
import { getManualApiComponentQuantity, getManualApiEquipmentQuantity } from "./apiComponentSlots";
import { toBrasiliaDate, toBrasiliaDateTime, toBrasiliaFileDate } from "./dateUtils";
import { formatLinkedAccessoryItemNumber, groupOrderItems, withDisplayMaterialSourceNumbers } from "./orderGrouping";
import { isEnhancedProductionSheetLayout, type ProductionSheetLayoutVersion } from "./productionSheetLayout";
import { ASSEMBLY_TYPE_LABELS, getShapeAssemblyDocumentEntries, SHAPE_LABELS } from "./shapeAssemblyGuideData";
import { buildMaterialRequisition, groupByTipo } from "./materialRequisition";
import type { MaterialTipo } from "./materialRequisition";
import {
  addStripflexQuantities,
  formatProductionEquipmentPrefix,
  formatStripflexQuantity,
  isStripflexDescription,
  multiplyStripflexQuantity,
} from "./ledStripUnits";

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
  /** Prazo acordado em dias úteis (padrão: 20). */
  deliveryDays?: number;
  /** Data de aprovação do orçamento (ISO string) para calcular prazo */
  approvedAt?: string;
  /**
   * Se fornecido, usa esta data diretamente em vez de calcular.
   * Formato: "DD/MM/YYYY"
   */
  precomputedDeliveryDate?: string;
  /** Número de dias úteis já calculado. Se fornecido, usa este valor em vez de calcular. */
  precomputedDisplayDays?: number;
  /** Observação geral persistida no pedido de fábrica. */
  notes?: string;
  /** Versão visual vinculada à data de criação do orçamento. */
  productionLayoutVersion?: ProductionSheetLayoutVersion;
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
export function addBusinessDays(start: Date, days: number, holidays: Set<string> = new Set()): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    const dateStr = toBrasiliaFileDate(result);
    if (dow !== 0 && dow !== 6 && !holidays.has(dateStr)) added++;
  }
  return result;
}

/**
 * Calcula a data de entrega para o pedido de fábrica.
 * - Aplica integralmente o prazo informado em dias úteis
 * - Desconta sábados, domingos e feriados nacionais via BrasilAPI
 */
export async function calcDeliveryDate(
  approvedAt: string | undefined,
  deliveryDays: number = 20
): Promise<{ displayDays: number; deliveryDate: Date; deliveryDateStr: string }> {
  const displayDays = Math.max(0, Math.trunc(deliveryDays));
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

function labelCell(cell: ExcelJS.Cell, value: string, fontSize = 10) {
  cell.value = value;
  cell.font = { bold: true, size: fontSize };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
  cell.alignment = { horizontal: "left", vertical: "middle" };
  applyBorder(cell);
}

function valueCell(cell: ExcelJS.Cell, value: string | number | null, fontSize = 10) {
  cell.value = value ?? "";
  cell.font = { size: fontSize };
  cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  applyBorder(cell);
}

/**
 * Formata quantidade sem zeros à esquerda (ex: 2 → "2", 3.4 → "3.4").
 */
function fmtQty(n: number): string {
  // Arredondar para cima com 1 decimal para módulos LED (podem ser fracionários)
  const rounded = Math.ceil(n * 10) / 10;
  return rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1);
}

/**
 * Gera o texto da coluna SKU para composições de perfis.
 * Exibe a quantidade por SKU da composição de uma luminária. A coluna QTD
 * representa a quantidade de luminárias solicitada e não deve ser aplicada aqui.
 */
export function buildProfileSkuText(item: Pick<CartItemData, "sku" | "profileSegments">): string {
  if (!item.profileSegments || item.profileSegments.length === 0) {
    return item.sku ?? "";
  }
  return formatProfileSkuLines(item.profileSegments).join("\n");
}

/**
 * Gera o texto da coluna FONTE DE LUZ para composições de perfis.
 *
 * Exibe a quantidade de módulos POR UNIDADE (seg.qty × seg.barsPerPiece),
 * agrupando por nome de módulo quando há múltiplos segmentos com o mesmo tipo.
 * A coluna QTD já indica quantas unidades do produto existem no pedido.
 * O SKU NÃO aparece nesta coluna — fica apenas na coluna SKU (E).
 *
 * Formato:
 *   "8 x Stripflex 562,5 x 10mm 36L 3000K"
 *   ou, se houver tipos diferentes:
 *   "4 x Stripflex 562,5 x 10mm 36L 3000K\n2 x Stripline 562,5 x 15mm 108L 3000K"
 */
export function buildProfileFonteLuzText(item: CartItemData, descMap?: Map<string, string>): string {
  if (item.withoutEquipment) return "";
  if (item.productLightingMode === "NO_LED_MODULE") return "";
  if (item.productLightSource) {
    const source = item.productLightSource;
    const canonicalDescription = source.code ? descMap?.get(source.code) ?? source.description : source.description;
    const codeSuffix = source.code ? ` (${source.code})` : "";
    const manualQuantity = getManualApiComponentQuantity(item, source.code);
    return `${fmtQty(manualQuantity ?? source.quantity)} x ${canonicalDescription}${codeSuffix}`;
  }
  if (!item.profileSegments || item.profileSegments.length === 0) {
    // Fallback para produtos não-perfil — incluir EQ quando disponível
    const modName = item.moduloLed ?? [item.power, item.cct].filter(Boolean).join(" | ") ?? "";
    // Não duplicar EQ se já está embutido no moduloLed
    const alreadyHasEq = item.moduloLedCode && modName.includes(`(${item.moduloLedCode})`);
    const modEqSuffix = item.moduloLedCode && !alreadyHasEq ? ` (${item.moduloLedCode})` : "";
    return `${modName}${modEqSuffix}`;
  }

  // Agrupar por código EQ do módulo e somar quantidades POR UNIDADE
  const totals = new Map<string, { qty: number; eqCode: string | null; name: string }>();
  for (const seg of item.profileSegments) {
    const eqCode = (seg as any).ledModuleCode ?? null;
    // Preferência: descrição canônica da API pelo código EQ; fallback: item.moduloLed ou eqCode
    const apiDesc = eqCode ? descMap?.get(eqCode) : undefined;
    const barName = apiDesc ?? item.moduloLed ?? eqCode ?? "Módulo LED";
    const mapKey = eqCode ?? barName;
    const isStripflex = isStripflexDescription(barName);
    const totalBars = isStripflex
      ? multiplyStripflexQuantity(seg.barsPerPiece, seg.qty)
      : seg.qty * seg.barsPerPiece;
    const existing = totals.get(mapKey);
    if (existing) {
      totals.set(mapKey, {
        qty: isStripflex ? addStripflexQuantities(existing.qty, totalBars) : existing.qty + totalBars,
        eqCode,
        name: barName,
      });
    } else {
      totals.set(mapKey, { qty: totalBars, eqCode, name: barName });
    }
  }

  return Array.from(totals.values())
    .map(({ qty, eqCode, name }) => {
      const eqSuffix = eqCode ? ` (${eqCode})` : "";
      const manualQuantity = getManualApiComponentQuantity(item, eqCode);
      const effectiveQty = manualQuantity ?? qty;
      const displayQty = isStripflexDescription(name) ? formatStripflexQuantity(effectiveQty) : fmtQty(effectiveQty);
      return `${displayQty} x ${name}${eqSuffix}`;
    })
    .join("\n");
}

/**
 * Gera o texto da coluna EQUIPAMENTOS para luminárias (downlights, spots, etc.)
 * com driverLines — inclui a corrente de programação do driver logo após o nome.
 * Formato: "1x DRIVER PHILIPS CERTADRIVE 20W 500MA (EQ00353)\nPROGRAMAÇÃO: 500MA"
 */
export function buildLuminariaEquipamentosText(item: CartItemData): string {
  if (item.withoutEquipment) return "";
  const linhas: string[] = [];
  if (!item.driverLines || item.driverLines.length === 0) {
    if (item.drivers) linhas.push(item.drivers);
  } else {
    linhas.push(...item.driverLines.map(dl => {
      const codeSuffix = dl.driverCode ? ` (${dl.driverCode})` : "";
      const itemQty = item.qty ?? 1;
      const qtyPerUnit = item.driverLines!.length === 1 && item.driverQtyPerUnit != null && item.driverQtyPerUnit > 0
        ? item.driverQtyPerUnit
        : (itemQty > 0 ? dl.driverQty / itemQty : dl.driverQty);
      const displayQty = Number.isInteger(qtyPerUnit) ? String(qtyPerUnit) : qtyPerUnit.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
      const linha = `${displayQty}x ${dl.driverModel}${codeSuffix}`;
      if (dl.corrente) {
        return `${linha}\nPROGRAMAÇÃO: ${dl.corrente}`;
      }
      return linha;
    }));
  }
  for (const component of item.apiOtherEquipments ?? []) {
    const codeSuffix = component.code ? ` (${component.code})` : "";
    linhas.push(`${fmtQty(component.quantity)}x ${component.description}${codeSuffix}`);
  }
  return linhas.join("\n");
}

/**
 * Gera o texto da coluna EQUIPAMENTOS para composições de perfis.
 *
 * Exibe a quantidade de drivers POR UNIDADE (seg.qty × seg.driverQtyPerPiece),
 * agrupando por modelo+código quando há múltiplos segmentos com o mesmo driver.
 * A coluna QTD já indica quantas unidades do produto existem no pedido.
 * O SKU NÃO aparece nesta coluna — fica apenas na coluna SKU (E).
 *
 * Para drivers combo (ex: Stripline 3 barras = 44W + 65W), o driverModel
 * já foi formatado como "1 x MODEL1 (CODE1) + 1 x MODEL2 (CODE2)" no Home.tsx.
 *
 * Formato:
 *   "2 x PHILIPS XITANIUM 65W 350MA (EQ00393)"
 *   ou, se houver modelos diferentes:
 *   "2 x PHILIPS XITANIUM 44W 350MA (EQ00347)\n17 x PHILIPS XITANIUM 65W 350MA (EQ00393)"
 */
export function buildProfileEquipamentosText(item: CartItemData): string {
  if (item.withoutEquipment) return "";
  if (!item.profileSegments || item.profileSegments.length === 0) {
    // Se tem driverLines (luminária com driver desmembrado), usar buildLuminariaEquipamentosText
    if (item.driverLines && item.driverLines.length > 0) {
      return buildLuminariaEquipamentosText(item);
    }
    return item.drivers ?? "";
  }

  // Agrupar por modelo+código e somar quantidades POR UNIDADE
  const totals = new Map<string, { model: string; code: string; rawCode: string; qty: number; corrente?: string | null }>();

  for (const seg of item.profileSegments) {
    // Driver combo: já formatado como "1 x MODEL1 (CODE1) + 1 x MODEL2 (CODE2)"
    if (seg.driverModel.includes(" + ")) {
      // Para combos, tratar como texto livre e acumular por segmento
      const comboKey = seg.driverModel;
      const totalQty = seg.qty;
      const existing = totals.get(comboKey);
      if (existing) {
        totals.set(comboKey, { ...existing, qty: existing.qty + totalQty });
      } else {
        totals.set(comboKey, { model: seg.driverModel, code: "", rawCode: "", qty: totalQty });
      }
      continue;
    }

    // Driver simples
    const codeSuffix = seg.driverCode && seg.driverCode !== "ERRO"
      ? ` (${seg.driverCode})`
      : "";
    const key = `${seg.driverModel}${codeSuffix}`;
    const totalQty = seg.qty * seg.driverQtyPerPiece;
    const corrente = seg.corrente ?? null;
    const existing = totals.get(key);
    if (existing) {
      totals.set(key, { ...existing, qty: existing.qty + totalQty });
    } else {
      totals.set(key, { model: seg.driverModel, code: codeSuffix, rawCode: seg.driverCode, qty: totalQty, corrente });
    }
  }

  const linhas = Array.from(totals.entries())
    .map(([_key, entry]) => {
      const qty = getManualApiEquipmentQuantity(item, entry.rawCode) ?? entry.qty;
      // Para combos (sem code separado), usar a key como texto
      const base = !entry.code
        ? `${fmtQty(qty)} x ${_key}`
        : `${fmtQty(qty)} x ${entry.model}${entry.code}`;
      // Adicionar PROGRAMAÇÃO sempre que a API informar a corrente.
      if (entry.corrente) {
        return `${base}\nPROGRAMAÇÃO: ${entry.corrente}`;
      }
      return base;
    });
  for (const component of item.apiOtherEquipments ?? []) {
    const codeSuffix = component.code ? ` (${component.code})` : "";
    linhas.push(`${fmtQty(component.quantity)} x ${component.description}${codeSuffix}`);
  }
  return linhas.join("\n");
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
  if (item.withoutEquipment) return "";
  const nCortes = item.ledBarNCortes ?? 1;
  const mm = item.ledBarComprimentoPorTrechoMm ?? item.ledBarComprimentoTotalMm ?? 0;
  const modulo = item.moduloLed ?? "";
  const moduloEqSuffix = item.moduloLedCode ? ` (${item.moduloLedCode})` : "";
  const linhas: string[] = [];
  if (modulo) linhas.push(`Módulo: ${modulo}${moduloEqSuffix}`);
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
export function buildLedBarEquipamentosText(item: CartItemData): string {
  if (item.withoutEquipment) return "";
  const nCortes = item.ledBarNCortes ?? 1;
  const model = item.ledBarDriverModel ?? "";
  const code = item.ledBarDriverCode ?? "";
  if (!model) return item.drivers ?? "";
  const codeSuffix = code ? ` (${code})` : "";
  const programacao = item.ledBarDriverCorrente ? `\nPROGRAMAÇÃO: ${item.ledBarDriverCorrente}` : "";
  return `${nCortes}x ${model}${codeSuffix}${programacao}`;
}

export async function generateOrderExcel(items: CartItemData[], form: OrderFormData, descMap?: Map<string, string>): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Configurador Alfalux";
  wb.created = new Date();
  const useEnhancedLayout = isEnhancedProductionSheetLayout(form.productionLayoutVersion);
  const contentFontSize = useEnhancedLayout ? 14 : 10;
  const accessoryFontSize = useEnhancedLayout ? 14 : 9;
  const headerFontSize = useEnhancedLayout ? 14 : 10;

  const ws = wb.addWorksheet("Pedido", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  // ─── Larguras das colunas (A-J) ──────────────────────────────────────────
  ws.columns = [
    { key: "A", width: 8 },   // ITEM
    { key: "B", width: 14 },  // PA
    { key: "C", width: 15 },  // ETIQUETA
    // A descrição de acessórios precisa permanecer legível sem o usuário
    // redimensionar manualmente a planilha.
    { key: "D", width: useEnhancedLayout ? 48 : 28 },  // PRODUTO
    { key: "E", width: useEnhancedLayout ? 28 : 26 },  // SKU
    { key: "F", width: useEnhancedLayout ? 44 : 38 },  // FONTE DE LUZ
    { key: "G", width: useEnhancedLayout ? 55 : 48 },  // EQUIPAMENTOS
    { key: "H", width: 8 },   // QTD
    { key: "I", width: useEnhancedLayout ? 20 : 18 },  // COR DA PEÇA
    { key: "J", width: useEnhancedLayout ? 55 : 48 },  // OBSERVAÇÕES
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
  ws.getRow(3).height = useEnhancedLayout ? 42 : 28;
  ws.getRow(4).height = useEnhancedLayout ? 42 : 28;

  // Col A: label CLIENTE (merge A3:A4)
  ws.mergeCells("A3:A4");
  labelCell(ws.getCell("A3"), "CLIENTE", contentFontSize);
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  // Col B-E: valor cliente/obra (merge B3:E4)
  ws.mergeCells("B3:E4");
  const clientCell = ws.getCell("B3");
  clientCell.value = `${form.clientName}${form.projectName ? " / " + form.projectName : ""}`;
  clientCell.font = { bold: true, size: useEnhancedLayout ? 14 : 11 };
  clientCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  applyBorder(clientCell);

  // Col F: label PEDIDO (F3) e VENDEDOR (F4)
  labelCell(ws.getCell("F3"), "PEDIDO:", contentFontSize);
  labelCell(ws.getCell("F4"), "VENDEDOR:", contentFontSize);

  // Col G: valor pedido (G3) e valor vendedor (G4)
  valueCell(ws.getCell("G3"), form.orderNumber?.trim() || "NÃO INFORMADO", contentFontSize);
  ws.getCell("G3").font = { bold: true, size: useEnhancedLayout ? 14 : 11 };
  valueCell(ws.getCell("G4"), form.vendorName, contentFontSize);

  // Col H-I: label PRAZO (merge H3:I3) e ALFALUX/LUMINEW (merge H4:J4)
  ws.mergeCells("H3:I3");
  labelCell(ws.getCell("H3"), "PRAZO DE PRODUÇÃO:", contentFontSize);
  ws.getCell("H3").alignment = { horizontal: "left", vertical: "middle" };
  // Calcular e exibir data de entrega prevista
  {
    // Sempre usar a data pré-calculada pelos dias úteis. No fallback, calcular
    // da mesma forma, incluindo fins de semana e feriados nacionais.
    const hasPrecomputedDeadline = form.precomputedDisplayDays != null && !!form.precomputedDeliveryDate;
    const fallbackDelivery = hasPrecomputedDeadline
      ? null
      : await calcDeliveryDate(form.approvedAt, form.deliveryDays ?? 20);
    const displayDays = form.precomputedDisplayDays ?? fallbackDelivery!.displayDays;
    const dateStr = form.precomputedDeliveryDate ?? fallbackDelivery!.deliveryDateStr;
    const prazoStr = `${displayDays} dias úteis → ${dateStr}`;
    const prazoCell = ws.getCell("J3");
    prazoCell.value = prazoStr;
    prazoCell.font = { bold: true, size: contentFontSize, color: { argb: "FFCC0000" } };
    prazoCell.alignment = { horizontal: "left", vertical: "middle" };
  }

  ws.mergeCells("H4:J4");
  const brandCell = ws.getCell("H4");
  const isLuminew = form.empresa === "LUMINEW";
  brandCell.value = isLuminew
    ? "1 - ALFALUX     (    )                    2 - LUMINEW     (  X  )"
    : "1 - ALFALUX     (  X  )                    2 - LUMINEW     (    )";
  brandCell.font = { bold: true, size: contentFontSize };
  brandCell.alignment = { horizontal: "left", vertical: "middle" };
  applyBorder(brandCell);

  // ─── Linha 5: Espaço ─────────────────────────────────────────────────────
  ws.getRow(5).height = 6;

  // ─── Linha 6: Cabeçalho da tabela ────────────────────────────────────────
  ws.getRow(6).height = useEnhancedLayout ? 58 : 36;
  const headers = ["ITEM", "PA", "ETIQUETA", "PRODUTO", "SKU", "FONTE DE LUZ", "EQUIPAMENTOS", "QTD", "COR DA PEÇA", "OBSERVAÇÕES"];
  const colLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  headers.forEach((h, i) => {
    headerCell(ws.getCell(`${colLetters[i]}6`), h, headerFontSize);
  });

  // ─── Linhas de dados ─────────────────────────────────────────────────────
  const DATA_START = 7;
  const imagePromises: Promise<void>[] = [];

  // Filtrar itens de "Não Orçamos" pois são apenas indicativos e não devem aparecer na ficha de produção
  // Agrupar itens idênticos (mesmo produto, CCT, cor, drivers) somando quantidades e concatenando etiquetas com pavimento
  const orderItems = groupOrderItems(items.filter(item => item.category !== 'Não Orçamos'));

  // Cursor de linha: as sublinhas de acessórios ocupam linhas próprias e não
  // podem ser sobrescritas pelo próximo item do loop.
  let rowNum = DATA_START;
  for (let i = 0; i < orderItems.length; i++) {
    const item = orderItems[i];
    const row = ws.getRow(rowNum);

    // Altura dinâmica: perfis com múltiplos segmentos precisam de mais espaço
    const segCount = item.profileSegments?.length ?? 1;
    row.height = useEnhancedLayout ? Math.max(92, segCount * 35) : Math.max(60, segCount * 22);

    const isOdd = i % 2 === 0;
    const rowBg = isOdd ? ROW_BG_ODD : ROW_BG_EVEN;

    const fillRow = (cell: ExcelJS.Cell, value: string | number | null, bold = false) => {
      cell.value = value ?? "";
      cell.font = { size: contentFontSize, bold };
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
    dCell.font = { size: contentFontSize };
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
    eCell.font = { size: contentFontSize };
    eCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    eCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    applyBorder(eCell);

    // FONTE DE LUZ (F) — LED BAR: módulo + trechos; perfis: multi-segmento
    // Para Item Especial: coluna F (FONTE DE LUZ) = Módulos LED + Ópticas + Holders + Dissipadores
    // Para outros: dim + potência + DIM + tensão
    // Classifica equipamento como driver ou fonte de luz, usando familia como fallback para itens antigos sem tipo
    const isDriverTipo = (tipo?: string, familia?: string) => {
      if (tipo) return tipo.startsWith("DRIVER_");
      if (familia) { const f = familia.toUpperCase(); return f.includes("DRIVER") || f.includes("FONTE"); }
      return true;
    };
    const isFonteLuzTipo = (tipo?: string, familia?: string) => {
      if (tipo) return tipo === "MODULO_LED" || tipo === "OTICA" || tipo === "HOLDER" || tipo === "DISSIPADOR";
      if (familia) { const f = familia.toUpperCase(); return f.includes("MÓDULO") || f.includes("MODULO") || f.includes("ÓPTICA") || f.includes("OPTICA") || f.includes("HOLDER") || f.includes("DISSIPADOR"); }
      return false;
    };
    const manualEquipments = (item.category === "Item Especial" || item.isSpecialItem)
      ? item.specialEquipments
      : item.productionEquipments;
    const buildManualFonteLuzText = () => {
      const equips = manualEquipments as Array<{ codigo?: string; descricao: string; qty: number; familia?: string; tipo?: string }> | undefined;
      if (equips && equips.length > 0) {
        const fonteLuzEquips = equips.filter(e => isFonteLuzTipo(e.tipo, e.familia));
        if (fonteLuzEquips.length > 0) {
          return fonteLuzEquips.map(e => `${formatProductionEquipmentPrefix(e)} ${e.descricao}${e.codigo ? ` (${e.codigo})` : ''}`).join('\n');
        }
      }
      // Fallback: potência + dim + tensão
      return [item.specialPower, item.specialDim, item.specialVoltage].filter(Boolean).join(" | ") || "-";
    };
    const baseFonteText = item.category === "Item Especial"
      ? buildManualFonteLuzText()
      : isLedBar(item)
        ? buildLedBarFonteLuzText(item)
        : buildProfileFonteLuzText(item, descMap);
    const manualFonteText = item.category === "Item Especial" ? "" : buildManualFonteLuzText();
    const fonteText = manualFonteText && manualFonteText !== "-"
      ? [baseFonteText, manualFonteText].filter(Boolean).join("\n")
      : baseFonteText;
    const fCell = ws.getCell(`F${rowNum}`);
    fCell.value = fonteText;
    fCell.font = { size: contentFontSize };
    fCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    fCell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    applyBorder(fCell);

    // EQUIPAMENTOS (G) — Para Item Especial: apenas Drivers
    // Para outros: LED BAR: QTY x driver; perfis: multi-segmento
    const buildManualEquipText = () => {
      const equips = manualEquipments as Array<{ codigo?: string; descricao: string; qty: number; familia?: string; tipo?: string }> | undefined;
      if (equips && equips.length > 0) {
        // Apenas drivers vão para a coluna EQUIPAMENTOS
        const driverEquips = equips.filter(e => isDriverTipo(e.tipo, e.familia));
        if (driverEquips.length > 0) {
          return driverEquips.map(e => `${e.qty}x ${e.descricao}${e.codigo ? ` (${e.codigo})` : ''}`).join('\n');
        }
        return "A DEFINIR";
      }
      return "A DEFINIR";
    };
    const baseEquipText = item.category === "Item Especial"
      ? buildManualEquipText()
      : isLedBar(item)
        ? buildLedBarEquipamentosText(item)
        : buildProfileEquipamentosText(item);
    const manualEquipText = item.category === "Item Especial" ? "" : buildManualEquipText();
    const equipText = manualEquipText && manualEquipText !== "A DEFINIR"
      ? [baseEquipText, manualEquipText].filter(Boolean).join("\n")
      : baseEquipText;
    const gCell = ws.getCell(`G${rowNum}`);
    gCell.value = equipText;
    gCell.font = { size: contentFontSize };
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

    // OBSERVAÇÕES (J) — observação operacional preenchida no pedido, com fallback legado do item especial
    const obsValue = item.productionObservation?.trim()
      || (item.category === "Item Especial" ? (item.specialInternalNotes || "") : "");
    fillRow(ws.getCell(`J${rowNum}`), obsValue);
    // ── Sub-linhas de acessórios vinculados ──────────────────────────────
    if (item.accessories && item.accessories.length > 0) {
      (item.accessories as LinkedAccessory[]).forEach((acc, accessoryIndex) => {
        rowNum += 1;
        const accRowNum = rowNum;
        const accessoryLabel = `↳ Acessório: ${acc.descricao}`;
        // Excel calcula a quebra com base na largura da coluna em caracteres.
        // Reservamos uma linha por bloco de aproximadamente 44 caracteres e
        // deixamos margem vertical para a fonte ampliada de 14 pt.
        const accessoryLines = Math.max(1, Math.ceil(accessoryLabel.length / (useEnhancedLayout ? 44 : 30)));
        ws.getRow(accRowNum).height = useEnhancedLayout
          ? Math.max(48, accessoryLines * 24 + 8)
          : Math.max(20, accessoryLines * 12 + 4);
        const ACC_BG = "FFE0F7FA";
        const fillAcc = (cell: ExcelJS.Cell, value: string | number | null, bold = false) => {
          cell.value = value ?? "";
          cell.font = { size: accessoryFontSize, bold, italic: true, color: { argb: "FF006064" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACC_BG } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          applyBorder(cell);
        };
        fillAcc(ws.getCell(`A${accRowNum}`), formatLinkedAccessoryItemNumber(i + 1, accessoryIndex), true);
        fillAcc(ws.getCell(`B${accRowNum}`), "");
        fillAcc(ws.getCell(`C${accRowNum}`), "");
        const accDCell = ws.getCell(`D${accRowNum}`);
        accDCell.value = accessoryLabel;
        accDCell.font = { size: accessoryFontSize, italic: true, color: { argb: "FF006064" } };
        accDCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACC_BG } };
        accDCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        applyBorder(accDCell);
        fillAcc(ws.getCell(`E${accRowNum}`), acc.codigo ?? "");
        const accessoryLightText = acc.productLightSource
          ? `${acc.productLightSource.quantity}x ${acc.productLightSource.description}${acc.productLightSource.code ? ` (${acc.productLightSource.code})` : ""}`
          : "";
        const accessoryEquipmentText = [
          ...(acc.technicalDrivers ?? []),
          ...(acc.apiOtherEquipments ?? []),
        ].map(component => `${component.quantity}x ${component.description}${component.code ? ` (${component.code})` : ""}`).join("\n");
        fillAcc(ws.getCell(`F${accRowNum}`), accessoryLightText);
        fillAcc(ws.getCell(`G${accRowNum}`), accessoryEquipmentText);
        fillAcc(ws.getCell(`H${accRowNum}`), acc.qty, true);
        fillAcc(ws.getCell(`I${accRowNum}`), "");
        fillAcc(ws.getCell(`J${accRowNum}`), "");
      });
    }
    rowNum += 1;
  }
  // Aguardar todas as imagenss
  await Promise.allSettled(imagePromises);

  // ─── Linha de observações gerais ─────────────────────────────────────────
  const obsRow = rowNum + 1;
  ws.getRow(obsRow).height = useEnhancedLayout ? 40 : 22;
  ws.mergeCells(`A${obsRow}:C${obsRow}`);
  labelCell(ws.getCell(`A${obsRow}`), "OBSERVAÇÕES GERAIS", contentFontSize);
  ws.mergeCells(`D${obsRow}:J${obsRow}`);
  valueCell(ws.getCell(`D${obsRow}`), form.notes?.trim() || "", contentFontSize);

  // ─── Rodapé com data/hora/revisão em todas as páginas ──────────────────────────────────────────────────────────────
  const emitidoEm = toBrasiliaDateTime(Date.now());
  const pedidoFooter = form.orderNumber?.trim() || "NÃO INFORMADO";
  ws.headerFooter = {
    oddFooter: `&L&8Ficha T\u00e9cnica de Produ\u00e7\u00e3o \u2014 ${pedidoFooter}&R&8Emitido em: ${emitidoEm} (Hor\u00e1rio de Bras\u00edlia) | ${form.quoteNumber}`,
    evenFooter: `&L&8Ficha T\u00e9cnica de Produ\u00e7\u00e3o \u2014 ${pedidoFooter}&R&8Emitido em: ${emitidoEm} (Hor\u00e1rio de Bras\u00edlia) | ${form.quoteNumber}`,
  };

  // ─── Requisição de Materiais (mesma aba, após observações gerais) ──────────────────────────────────────────────────────────────────────────────────────────
  {
    const allItemsForReq = withDisplayMaterialSourceNumbers(items);
    const matEntries = buildMaterialRequisition(allItemsForReq, descMap);
    if (matEntries.length > 0) {
      const TIPO_COLORS: Record<MaterialTipo, string> = {
        "PERFIS": "FFD9E1F2",
        "FITAS LED": "FFE2EFDA",
        "MÓDULOS LED": "FFD6EAD0",
        "LÂMPADAS": "FFEAF2F8",
        "DRIVERS": "FFDCE6F1",
        "FONTES DE TENSÃO": "FFFFF2CC",
        "LENTES": "FFFCE4D6",
        "REFLETORES": "FFEDEDED",
        "DISSIPADORES": "FFF2F2F2",
        "SUPORTES": "FFF2F2F2",
        "ACESSÓRIOS": "FFFEF9E7",
        "OUTROS": "FFFFFFFF",
      };
      const TIPO_ORDER_LOCAL: MaterialTipo[] = [
        "PERFIS", "FITAS LED", "MÓDULOS LED", "LÂMPADAS", "DRIVERS", "FONTES DE TENSÃO",
        "LENTES", "REFLETORES", "DISSIPADORES", "SUPORTES", "ACESSÓRIOS", "OUTROS",
      ];
      const byTipo = groupByTipo(matEntries);

      // Linha em branco de separação
      let reqRow = obsRow + 2;

      // Título da seção
      ws.getRow(reqRow).height = useEnhancedLayout ? 34 : 28;
      ws.mergeCells(`A${reqRow}:J${reqRow}`);
      const reqTitleCell = ws.getCell(`A${reqRow}`);
      reqTitleCell.value = "REQUISIÇÃO DE MATERIAIS";
      reqTitleCell.font = { bold: true, size: 16, color: { argb: HEADER_FONT_COLOR } };
      reqTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
      reqTitleCell.alignment = { horizontal: "center", vertical: "middle" };
      reqRow++;

      // Cabeçalho: A=TIPO, B=CÓDIGO, C-G=DESCRIÇÃO (mesclado), H=ITENS, I=UN, J=QTD
      ws.getRow(reqRow).height = useEnhancedLayout ? 42 : 18;
      headerCell(ws.getCell(`A${reqRow}`), "TIPO", headerFontSize);
      headerCell(ws.getCell(`B${reqRow}`), "CÓDIGO", headerFontSize);
      ws.mergeCells(`C${reqRow}:G${reqRow}`);
      headerCell(ws.getCell(`C${reqRow}`), "DESCRIÇÃO", headerFontSize);
      headerCell(ws.getCell(`H${reqRow}`), "ITENS", headerFontSize);
      headerCell(ws.getCell(`I${reqRow}`), "UN", headerFontSize);
      headerCell(ws.getCell(`J${reqRow}`), "QTD", headerFontSize);
      reqRow++;

      for (const tipo of TIPO_ORDER_LOCAL) {
        const entries = byTipo.get(tipo);
        if (!entries || entries.length === 0) continue;
        const bgColor = TIPO_COLORS[tipo] ?? "FFFFFFFF";
        for (const entry of entries) {
          ws.getRow(reqRow).height = useEnhancedLayout ? 30 : 16;
          ws.mergeCells(`C${reqRow}:G${reqRow}`);
          const applyReqCell = (col: string, value: string | number, bold = false) => {
            const cell = ws.getCell(`${col}${reqRow}`);
            cell.value = value;
            cell.font = { size: contentFontSize, bold };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
            cell.alignment = { horizontal: (col === "H" || col === "I" || col === "J") ? "center" : "left", vertical: "middle", wrapText: col === "C" };
            applyBorder(cell);
          };
          applyReqCell("A", entry.tipo);
          applyReqCell("B", entry.codigo, true);
          applyReqCell("C", entry.descricao);
          applyReqCell("H", entry.sourceItems.length > 0 ? entry.sourceItems.join(", ") : "");
          applyReqCell("I", entry.unidade.toUpperCase());
          applyReqCell("J", entry.qty, true);
          reqRow++;
        }
      }
    }
  }

  // ─── Guia de Montagem (aba própria para a produção) ─────────────────────
  // Somente itens novos que já persistiram o mapa físico recebem a guia.
  // Nenhum orçamento histórico é recalculado ou enriquecido artificialmente.
  const assemblyEntries = getShapeAssemblyDocumentEntries(items);
  if (assemblyEntries.length > 0) {
    const guideWs = wb.addWorksheet("Guia de Montagem", {
      pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    guideWs.columns = [
      { key: "A", width: 7 }, { key: "B", width: 22 }, { key: "C", width: 35 },
      { key: "D", width: 27 }, { key: "E", width: 16 }, { key: "F", width: 14 },
    ];

    guideWs.mergeCells("A1:F1");
    const guideTitle = guideWs.getCell("A1");
    guideTitle.value = "GUIA DE MONTAGEM — PRODUÇÃO";
    guideTitle.font = { bold: true, size: 16, color: { argb: HEADER_FONT_COLOR } };
    guideTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    guideTitle.alignment = { horizontal: "center", vertical: "middle" };
    guideWs.getRow(1).height = 30;

    guideWs.mergeCells("A2:F2");
    const guideIntro = guideWs.getCell("A2");
    guideIntro.value = `Pedido: ${form.orderNumber?.trim() || form.quoteNumber} — ${form.clientName}${form.projectName ? ` / ${form.projectName}` : ""}`;
    guideIntro.font = { bold: true, size: contentFontSize };
    guideIntro.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
    guideIntro.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    applyBorder(guideIntro);
    guideWs.getRow(2).height = useEnhancedLayout ? 34 : 24;

    let guideRow = 4;
    for (const entry of assemblyEntries) {
      guideWs.mergeCells(`A${guideRow}:F${guideRow}`);
      const itemTitle = guideWs.getCell(`A${guideRow}`);
      itemTitle.value = `ITEM ${entry.itemNumber}${entry.item.itemEmPlanta ? ` — ${entry.item.itemEmPlanta}` : ""} · ${SHAPE_LABELS[entry.shape]}`;
      itemTitle.font = { bold: true, size: useEnhancedLayout ? 15 : 12, color: { argb: HEADER_FONT_COLOR } };
      itemTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
      itemTitle.alignment = { horizontal: "left", vertical: "middle" };
      applyBorder(itemTitle, "medium");
      guideWs.getRow(guideRow).height = useEnhancedLayout ? 32 : 24;
      guideRow += 1;

      guideWs.mergeCells(`A${guideRow}:F${guideRow}`);
      const productCell = guideWs.getCell(`A${guideRow}`);
      productCell.value = entry.title;
      productCell.font = { bold: true, size: contentFontSize };
      productCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F6FA" } };
      productCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      applyBorder(productCell);
      guideWs.getRow(guideRow).height = useEnhancedLayout ? 38 : 26;
      guideRow += 1;

      ["ORDEM", "TIPO", "SKU", "COMPRIMENTO", "BARRAS", "ARESTA"].forEach((label, colIndex) => {
        headerCell(guideWs.getCell(guideRow, colIndex + 1), label, headerFontSize);
      });
      guideWs.getRow(guideRow).height = useEnhancedLayout ? 30 : 22;
      guideRow += 1;

      for (const edge of entry.edges) {
        guideWs.mergeCells(`A${guideRow}:F${guideRow}`);
        const edgeCell = guideWs.getCell(`A${guideRow}`);
        edgeCell.value = `${edge.label.toUpperCase()} — Meta: ${edge.requestedLength} mm · Atingido: ${edge.achievedLength} mm`;
        edgeCell.font = { bold: true, size: contentFontSize, color: { argb: "FF1F3864" } };
        edgeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDF2F7" } };
        edgeCell.alignment = { horizontal: "left", vertical: "middle" };
        applyBorder(edgeCell);
        guideWs.getRow(guideRow).height = useEnhancedLayout ? 28 : 20;
        guideRow += 1;

        edge.modules.forEach((module, moduleIndex) => {
          const colors = module.type === "CORNER" ? "FFFAF7FF" : module.type === "IF" ? "FFF0F9FF" : "FFF0FDF4";
          const values = [moduleIndex + 1, ASSEMBLY_TYPE_LABELS[module.type], module.sku, `${module.length} mm`, module.bars, edge.label];
          values.forEach((value, colIndex) => {
            const cell = guideWs.getCell(guideRow, colIndex + 1);
            cell.value = value;
            cell.font = { size: contentFontSize, bold: colIndex === 0 || colIndex === 2 };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors } };
            cell.alignment = { horizontal: colIndex === 0 || colIndex === 4 ? "center" : "left", vertical: "middle", wrapText: true };
            applyBorder(cell);
          });
          guideWs.getRow(guideRow).height = useEnhancedLayout ? 30 : 22;
          guideRow += 1;
        });
      }
      guideWs.mergeCells(`A${guideRow}:F${guideRow}`);
      const noteCell = guideWs.getCell(`A${guideRow}`);
      noteCell.value = "Instrução: monte cada aresta na sequência numerada. A quantidade comercial consolidada de cantos, módulos ML e acabamentos IF permanece na ficha técnica e na requisição de materiais.";
      noteCell.font = { italic: true, size: useEnhancedLayout ? 12 : 10, color: { argb: "FF506176" } };
      noteCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      noteCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      applyBorder(noteCell);
      guideWs.getRow(guideRow).height = useEnhancedLayout ? 42 : 30;
      guideRow += 2;
    }
    guideWs.headerFooter = {
      oddFooter: `&L&8Guia de Montagem — ${form.orderNumber?.trim() || form.quoteNumber}&R&8Emitido em: ${toBrasiliaDateTime(Date.now())} (Horário de Brasília)`,
    };
  }
  // ─── Gerar, baixar e retornar buffer ──────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  if (typeof document !== "undefined") {
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
  }
  return buffer as ArrayBuffer;
}
