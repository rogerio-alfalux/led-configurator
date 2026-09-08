export const QUOTE_IPI_RATE = 0.0975;

/**
 * Calcula o preço unitário sem IPI dividindo o preço comercial com IPI por
 * 1,0975. O arredondamento fica para a camada de apresentação, evitando alterar
 * o total comercial persistido.
 */
export function getUnitPriceWithoutIpi(originalUnitPrice: number): number {
  if (!Number.isFinite(originalUnitPrice) || originalUnitPrice <= 0) return 0;
  return originalUnitPrice / (1 + QUOTE_IPI_RATE);
}
