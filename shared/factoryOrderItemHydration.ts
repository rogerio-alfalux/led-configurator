/**
 * Copia a observação comercial por item para a ficha de produção sem substituir
 * uma observação técnica já escrita na própria ficha.
 */
export function hydrateFactoryOrderItemData(itemData: string): string {
  try {
    const parsed = JSON.parse(itemData) as Record<string, unknown>;
    const itemObservation = typeof parsed.itemObs === "string" ? parsed.itemObs.trim() : "";
    const productionObservation = typeof parsed.productionObservation === "string"
      ? parsed.productionObservation.trim()
      : "";

    if (itemObservation && !productionObservation) {
      parsed.productionObservation = itemObservation;
    }

    return JSON.stringify(parsed);
  } catch {
    return itemData;
  }
}
