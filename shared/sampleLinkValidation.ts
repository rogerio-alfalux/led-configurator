export function getSampleLinkValidationError(input: {
  sourceQuoteId: number;
  targetQuoteId: number;
  existingLinkedQuoteIds: number[];
}): string | null {
  if (input.sourceQuoteId === input.targetQuoteId) {
    return "Não é possível vincular o pedido ao próprio orçamento que o originou.";
  }
  if (input.existingLinkedQuoteIds.includes(input.targetQuoteId)) {
    return "Este pedido já está vinculado ao orçamento informado.";
  }
  return null;
}
