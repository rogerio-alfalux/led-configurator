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
