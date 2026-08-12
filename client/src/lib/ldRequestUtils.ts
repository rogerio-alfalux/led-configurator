export type LdRequestLink = { adminQuoteId?: number | null };

/** Indica se a solicitação LD corresponde ao orçamento atualmente aberto. */
export function isLdRequestLinkedToQuote(request: LdRequestLink, quoteId: number): boolean {
  return Number.isInteger(quoteId) && quoteId > 0 && request.adminQuoteId === quoteId;
}

/** Um PDF só é exposto ao convidado depois de validado e armazenado. */
export function isValidatedLdPdfAvailable(status: string, pdfUrl?: string | null): boolean {
  return status === "quote_ready" && Boolean(pdfUrl?.trim());
}
