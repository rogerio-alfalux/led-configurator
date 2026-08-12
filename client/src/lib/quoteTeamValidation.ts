/**
 * Define os campos comerciais obrigatórios conforme o papel autenticado.
 * Assistentes são a autoria do orçamento e podem salvar sem vendedor vinculado.
 */
export function getQuoteTeamValidationError(input: {
  role: string | null | undefined;
  sellerId: string | null | undefined;
  assistantId: string | null | undefined;
}): string | null {
  if (input.role !== "assistente" && !input.sellerId) {
    return "Selecione o Vendedor 1.";
  }

  if (!input.assistantId) {
    return "Selecione o Assistente Comercial.";
  }

  return null;
}

export function isSellerRequiredForQuote(role: string | null | undefined): boolean {
  return role !== "assistente";
}
