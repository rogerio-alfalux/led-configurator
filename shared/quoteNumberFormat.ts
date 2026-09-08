/** Formato comercial obrigatório: dois dígitos, ponto, quatro dígitos, hífen e ano. */
export const COMMERCIAL_QUOTE_NUMBER_PATTERN = /^\d{2}\.\d{4}-\d{2}$/;

export function isCommercialQuoteNumber(value: string | null | undefined): boolean {
  return COMMERCIAL_QUOTE_NUMBER_PATTERN.test((value ?? "").trim());
}

/**
 * Mantém somente dígitos e insere os separadores do formato XX.NNNN-AA durante
 * a digitação. Não altera números já armazenados: é uma ajuda de entrada.
 */
export function formatCommercialQuoteNumberInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 6)}-${digits.slice(6)}`;
}
