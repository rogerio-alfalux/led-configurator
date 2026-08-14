/**
 * Um orçamento criado a partir de uma solicitação LD precisa existir no banco
 * antes da definição comercial. Este identificador é apenas interno e nunca
 * representa um número de orçamento definitivo.
 */
export const LD_DRAFT_QUOTE_PREFIX = "RASCUNHO-LD-";

export function buildLdDraftQuoteNumber(requestNumber: string | null | undefined, requestId: number): string {
  const reference = (requestNumber ?? `SOLICITACAO-${requestId}`)
    .replace(/[^A-Za-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 20);
  return `${LD_DRAFT_QUOTE_PREFIX}${reference}`;
}

export function isLdDraftQuoteNumber(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(LD_DRAFT_QUOTE_PREFIX));
}
