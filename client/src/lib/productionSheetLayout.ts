/**
 * A ficha de produção ganhou uma diagramação ampliada em 18/09/2026.
 * Orçamentos anteriores mantêm o layout que receberam originalmente para que
 * consultas e reimpressões históricas não sejam alteradas.
 */
export const PRODUCTION_SHEET_ENHANCED_LAYOUT_FROM = Date.parse("2026-09-18T19:31:33.000Z");

export type ProductionSheetLayoutVersion = "legacy" | "enhanced";

export function resolveProductionSheetLayoutVersion(
  quoteCreatedAt: Date | string | number | null | undefined,
): ProductionSheetLayoutVersion {
  // Pedidos diretos que ainda não possuem orçamento são necessariamente novos.
  if (quoteCreatedAt == null) return "enhanced";

  const timestamp = quoteCreatedAt instanceof Date
    ? quoteCreatedAt.getTime()
    : new Date(quoteCreatedAt).getTime();

  return Number.isFinite(timestamp) && timestamp < PRODUCTION_SHEET_ENHANCED_LAYOUT_FROM
    ? "legacy"
    : "enhanced";
}

export function isEnhancedProductionSheetLayout(
  version: ProductionSheetLayoutVersion | null | undefined,
): boolean {
  return version !== "legacy";
}
