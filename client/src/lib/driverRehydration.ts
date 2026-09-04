/** Calcula a quantidade de drivers por luminária a partir das linhas já totalizadas. */
export function deriveDriverQuantityPerUnit(
  driverLines: Array<{ driverQty?: number | null }> | null | undefined,
  itemQuantity: number | null | undefined,
): number | null {
  const quantity = Number(itemQuantity ?? 0);
  if (!Array.isArray(driverLines) || driverLines.length === 0 || !Number.isFinite(quantity) || quantity <= 0) return null;

  const totalDrivers = driverLines.reduce((sum, line) => {
    const lineQuantity = Number(line.driverQty ?? 0);
    return sum + (Number.isFinite(lineQuantity) && lineQuantity > 0 ? lineQuantity : 0);
  }, 0);
  return totalDrivers > 0 ? totalDrivers / quantity : null;
}

/** Seleciona, entre SKUs repetidos da API, a variante compatível com a descrição salva. */
export function selectDriverVariantByDescription<Product extends { name?: string | null }>(
  variants: Product[],
  description?: string | null,
): Product | undefined {
  const normalizedDescription = description?.trim().toUpperCase() ?? "";
  return variants.find((variant) => {
    const name = variant.name?.trim().toUpperCase();
    return Boolean(name && normalizedDescription.includes(name));
  }) ?? variants[0];
}
