export type CommercialQuoteOwner = {
  seller1Email?: string | null;
  assistantEmail?: string | null;
};

/**
 * Vendedores só operam orçamentos cadastrados em seu próprio nome, enquanto
 * assistentes só operam orçamentos que carregam sua própria identificação.
 * Retorna null quando o role não é comercial para que as demais permissões
 * (admin, gerente e permissões granulares) sejam avaliadas pelo servidor.
 */
export function commercialQuoteAccess(
  role: string | null | undefined,
  email: string | null | undefined,
  quote: CommercialQuoteOwner,
): boolean | null {
  const normalizedEmail = email?.toLowerCase().trim();
  if (!normalizedEmail) return role === "vendedor" || role === "assistente" ? false : null;
  if (role === "vendedor") return quote.seller1Email?.toLowerCase().trim() === normalizedEmail;
  if (role === "assistente") return quote.assistantEmail?.toLowerCase().trim() === normalizedEmail;
  return null;
}
