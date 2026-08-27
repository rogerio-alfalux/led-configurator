export type ProductionEquipmentUnit = "un" | "mm";

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
  const total = equipment.qty * itemQty;
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
  const formatted = Number.isInteger(equipment.qty)
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
    : `${equipment.qty}x`;
}
