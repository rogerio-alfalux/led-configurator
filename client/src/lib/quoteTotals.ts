/**
 * Retorna o valor final já persistido para o orçamento. `totalFinal` é o
 * total cobrado do cliente; DIFAL/FCP, frete e diluição não devem ser somados
 * novamente por consumidores como a lista de orçamentos e seus indicadores.
 */
export function getStoredCustomerTotal(input: { totalFinal?: unknown; totalAmount?: unknown }): number {
  const totalFinal = Number(input.totalFinal);
  return Number.isFinite(totalFinal) && totalFinal > 0
    ? totalFinal
    : (Number(input.totalAmount) || 0);
}

/** Aplica o desconto comercial ao subtotal de produtos antes de frete e DIFAL/FCP. */
export function applyQuoteDiscount(subtotal: number, discountPercent?: unknown): number {
  const amount = Number.isFinite(Number(subtotal)) ? Math.max(0, Number(subtotal)) : 0;
  const rawPercent = Number(discountPercent);
  const rate = Number.isFinite(rawPercent) ? Math.min(Math.max(rawPercent, 0), 0.99) : 0;
  return Math.round(amount * (1 - rate) * 100) / 100;
}

/**
 * Regra comercial única: desconto sobre produtos, depois frete dedicado e, por último,
 * DIFAL/FCP calculados sobre essa base já descontada.
 */
export function calculateQuoteTotalWithDiscountAndTax(input: {
  productsBeforeDiscount: number;
  discountPercent?: unknown;
  freteValue?: number;
  difalEnabled?: boolean;
  combinedTaxRate?: number;
}) {
  const productsAfterDiscount = applyQuoteDiscount(input.productsBeforeDiscount, input.discountPercent);
  const freteValue = Number.isFinite(Number(input.freteValue)) ? Math.max(0, Number(input.freteValue)) : 0;
  const baseForTax = productsAfterDiscount + freteValue;
  const rate = input.difalEnabled
    ? Math.min(Math.max(Number(input.combinedTaxRate) || 0, 0), 99)
    : 0;
  const totalFinal = rate > 0 ? baseForTax / (1 - rate / 100) : baseForTax;
  const taxAmount = totalFinal - baseForTax;
  return {
    productsAfterDiscount,
    baseForTax,
    taxAmount,
    totalFinal: Math.round(totalFinal * 100) / 100,
  };
}
