/** Status que representa pedido sem cobrança comercial (amostra ou manutenção). */
export function isNonCommercialQuoteStatus(status?: string | null): boolean {
  return status === "sample";
}

/**
 * Valor que pode compor indicadores comerciais. A venda histórica é preservada
 * no registro original, mas amostras/manutenções têm receita exibida como zero.
 */
export function getCommercialQuoteValue(
  status: string | null | undefined,
  storedValue: number,
): number {
  return isNonCommercialQuoteStatus(status) ? 0 : storedValue;
}

/** Soma valores sem cobrar amostras ou manutenções no indicador comercial. */
export function sumCommercialQuoteValues(
  quotes: Array<{ status?: string | null; storedValue: number }>,
): number {
  return quotes.reduce(
    (sum, quote) => sum + getCommercialQuoteValue(quote.status, quote.storedValue),
    0,
  );
}
