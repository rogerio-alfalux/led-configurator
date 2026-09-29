/**
 * Retém uma única referência por grupo de duplicidade automática e exclui
 * registros marcados manualmente como duplicados. A ordem de entrada é
 * preservada, para que a primeira referência continue sendo a que a listagem
 * já prioriza comercialmente.
 */
export interface DuplicateAwareQuote {
  isDuplicate?: boolean | null;
  isManuallyDuplicate?: boolean | null;
  duplicateKey?: string | null;
}

export function selectQuotesWithoutDuplicates<T extends DuplicateAwareQuote>(
  quotes: T[],
  isManuallyDuplicate: (quote: T) => boolean = (quote) => Boolean(quote.isManuallyDuplicate),
): T[] {
  const seenAutomaticGroups = new Set<string>();

  return quotes.filter((quote) => {
    if (isManuallyDuplicate(quote)) return false;

    const duplicateKey = quote.duplicateKey?.trim();
    if (!quote.isDuplicate || !duplicateKey) return true;
    if (seenAutomaticGroups.has(duplicateKey)) return false;

    seenAutomaticGroups.add(duplicateKey);
    return true;
  });
}
