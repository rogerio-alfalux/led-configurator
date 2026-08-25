/**
 * Chaves de preço para luminárias vindas da API.
 * O SKU é preferível, mas alguns cadastros comerciais, como LUMIGRID E,
 * não possuem SKU e precisam ser resolvidos com segurança pelo nome.
 */
export function getLumPriceMapKeys(
  sku: string | null | undefined,
  productName: string | null | undefined,
): string[] {
  const normalizedSku = sku?.trim() ?? "";
  const normalizedName = productName?.trim() ?? "";
  const compositeKey = normalizedName ? `${normalizedSku}||${normalizedName}` : normalizedSku;

  return [compositeKey, normalizedSku].filter(
    (key, index, keys) => Boolean(key) && keys.indexOf(key) === index,
  );
}

/** Resolve a entrada de preço API usando SKU ou, quando ausente, o nome do produto. */
export function resolveLumPriceMapEntry<T>(
  priceMap: Record<string, T>,
  sku: string | null | undefined,
  productName: string | null | undefined,
): T | null {
  for (const key of getLumPriceMapKeys(sku, productName)) {
    const entry = priceMap[key];
    if (entry != null) return entry;
  }
  return null;
}
