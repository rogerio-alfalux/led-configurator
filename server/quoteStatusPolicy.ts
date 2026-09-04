export type QuoteStatus = "open" | "approved" | "lost" | "cancelled" | "invoiced";

export type QuoteStatusAuthorization = {
  targetStatus: QuoteStatus;
  currentStatus: QuoteStatus;
  canEditStatus: boolean;
  canInvoiceAnyQuote: boolean;
};

/**
 * Mantém a alteração de status comercial separada da atribuição exclusiva de
 * faturamento. A permissão de faturar não concede edição de orçamento.
 */
export function getQuoteStatusAuthorizationError({
  targetStatus,
  currentStatus,
  canEditStatus,
  canInvoiceAnyQuote,
}: QuoteStatusAuthorization): string | null {
  if (targetStatus === "invoiced") {
    if (!canInvoiceAnyQuote) {
      return "Você não tem permissão exclusiva para faturar orçamentos.";
    }
    // A primeira transição para faturado continua exigindo aprovação. Uma vez
    // faturado, o mesmo fluxo pode persistir uma correção de data sem mudar
    // o status comercial do orçamento.
    if (currentStatus !== "approved" && currentStatus !== "invoiced") {
      return "O status 'Faturado' só pode ser definido a partir de um pedido fechado (Aprovado).";
    }
    return null;
  }

  return canEditStatus ? null : "Você não tem permissão para alterar o status deste orçamento.";
}
