export type ProfileSkuSegment = {
  sku?: string | null;
  qty?: number | null;
};

function formatQuantity(quantity: number): string {
  const rounded = Math.ceil(quantity * 10) / 10;
  return rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1);
}

/**
 * Consolida a composição de perfis por SKU e é compatível com itens históricos
 * que não tenham o campo qty: cada segmento antigo equivale a uma unidade.
 */
export function formatProfileSkuLines(segments?: ProfileSkuSegment[] | null): string[] {
  const quantitiesBySku = new Map<string, number>();
  for (const segment of segments ?? []) {
    const sku = segment.sku?.trim();
    if (!sku) continue;
    const quantity = Number(segment.qty);
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    quantitiesBySku.set(sku, (quantitiesBySku.get(sku) ?? 0) + safeQuantity);
  }
  return Array.from(quantitiesBySku.entries())
    .map(([sku, quantity]) => `${formatQuantity(quantity)} x ${sku}`);
}
