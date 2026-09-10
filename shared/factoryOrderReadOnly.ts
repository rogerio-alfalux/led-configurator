/**
 * Pedidos de fábrica são preservados para consulta após o faturamento.
 * O bloqueio está restrito ao status comercial faturado: outros status
 * continuam seguindo o fluxo normal de produção.
 */
export function isFactoryOrderReadOnlyForQuoteStatus(status: string | null | undefined): boolean {
  return status === "invoiced";
}
