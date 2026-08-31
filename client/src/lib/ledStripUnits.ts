export type ProductionEquipmentUnit = "un" | "mm";

export const STRIPFLEX_SECTIONS_PER_BAR = 9;

function normalizeTechnicalText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * FITA LED é um módulo linear medido em comprimento. Stripflex, Stripline e
 * Striplux continuam sendo módulos discretos, medidos em unidades.
 */
export function isLedStripDescription(
  descricao: string | null | undefined,
  familia?: string | null,
  tipo?: string | null,
): boolean {
  const text = normalizeTechnicalText([descricao, familia, tipo].filter(Boolean).join(" "));
  const explicitlyLedStrip = /\bFITA(?:\s+DE)?\s+LED\b/.test(text) || /\bFITAS\s+LED\b/.test(text);
  const discreteModule = text.includes("STRIPFLEX") || text.includes("STRIPLINE") || text.includes("STRIPLUX");
  return explicitlyLedStrip && !discreteModule;
}

export function isStripflexDescription(descricao: string | null | undefined): boolean {
  return normalizeTechnicalText(descricao).includes("STRIPFLEX");
}

/**
 * A quantidade STRIPFLEX usa notação técnica em nonos: 4,4 significa
 * 4 barras inteiras + 4 trechos de uma barra dividida em 9 partes.
 * Consequentemente, 1,9 equivale a 2 barras completas.
 */
export function stripflexQuantityToNinths(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  const encodedTenths = Math.round((quantity + Number.EPSILON) * 10);
  const wholeBars = Math.floor(encodedTenths / 10);
  const sections = encodedTenths % 10;
  return wholeBars * STRIPFLEX_SECTIONS_PER_BAR + sections;
}

export function stripflexNinthsToQuantity(ninths: number): number {
  if (!Number.isFinite(ninths) || ninths <= 0) return 0;
  const normalizedNinths = Math.round(ninths);
  const wholeBars = Math.floor(normalizedNinths / STRIPFLEX_SECTIONS_PER_BAR);
  const sections = normalizedNinths % STRIPFLEX_SECTIONS_PER_BAR;
  return wholeBars + sections / 10;
}

export function normalizeStripflexQuantity(quantity: number): number {
  return stripflexNinthsToQuantity(stripflexQuantityToNinths(quantity));
}

export function stripflexQuantityToPhysicalBars(quantity: number): number {
  return stripflexQuantityToNinths(quantity) / STRIPFLEX_SECTIONS_PER_BAR;
}

export function addStripflexQuantities(...quantities: number[]): number {
  return stripflexNinthsToQuantity(
    quantities.reduce((total, quantity) => total + stripflexQuantityToNinths(quantity), 0),
  );
}

export function multiplyStripflexQuantity(quantity: number, multiplier: number): number {
  if (!Number.isFinite(multiplier) || multiplier <= 0) return 0;
  return stripflexNinthsToQuantity(stripflexQuantityToNinths(quantity) * multiplier);
}

export function formatStripflexQuantity(quantity: number): string {
  const normalized = normalizeStripflexQuantity(quantity);
  return Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function getProductionEquipmentUnit(equipment: {
  descricao?: string | null;
  familia?: string | null;
  tipo?: string | null;
}): ProductionEquipmentUnit {
  return isLedStripDescription(equipment.descricao, equipment.familia, equipment.tipo) ? "mm" : "un";
}

export function convertProductionEquipmentToMaterial(
  equipment: {
    descricao?: string | null;
    familia?: string | null;
    tipo?: string | null;
    qty: number;
  },
  itemQty: number,
): { qty: number; unidade: "un" | "m" } {
  const total = isStripflexDescription(equipment.descricao)
    ? stripflexQuantityToPhysicalBars(equipment.qty) * itemQty
    : equipment.qty * itemQty;
  return getProductionEquipmentUnit(equipment) === "mm"
    ? { qty: total / 1000, unidade: "m" }
    : { qty: total, unidade: "un" };
}

export function formatProductionEquipmentQuantity(equipment: {
  descricao?: string | null;
  familia?: string | null;
  tipo?: string | null;
  qty: number;
}): string {
  const formatted = isStripflexDescription(equipment.descricao)
    ? formatStripflexQuantity(equipment.qty)
    : Number.isInteger(equipment.qty)
    ? String(equipment.qty)
    : equipment.qty.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  return `${formatted} ${getProductionEquipmentUnit(equipment)}`;
}

/** Prefixo usado na ficha: FITA LED explicita mm; demais componentes preservam "x". */
export function formatProductionEquipmentPrefix(equipment: {
  descricao?: string | null;
  familia?: string | null;
  tipo?: string | null;
  qty: number;
}): string {
  return getProductionEquipmentUnit(equipment) === "mm"
    ? formatProductionEquipmentQuantity(equipment)
    : `${isStripflexDescription(equipment.descricao) ? formatStripflexQuantity(equipment.qty) : equipment.qty}x`;
}
