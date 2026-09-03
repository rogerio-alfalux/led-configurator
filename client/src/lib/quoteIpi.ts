export const QUOTE_IPI_RATE = 0.0975;

/**
 * Remove efetivamente 9,75% do preço comercial original. O arredondamento fica
 * para a camada de apresentação, evitando alterar o total comercial persistido.
 */
export function getUnitPriceWithoutIpi(originalUnitPrice: number): number {
  if (!Number.isFinite(originalUnitPrice) || originalUnitPrice <= 0) return 0;
  return originalUnitPrice * (1 - QUOTE_IPI_RATE);
}
