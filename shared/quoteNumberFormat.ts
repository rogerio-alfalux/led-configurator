/** Formato comercial obrigatório: dois dígitos, ponto, quatro dígitos, hífen e ano. */
export const COMMERCIAL_QUOTE_NUMBER_PATTERN = /^\d{2}\.\d{4}-\d{2}$/;

export function isCommercialQuoteNumber(value: string | null | undefined): boolean {
  return COMMERCIAL_QUOTE_NUMBER_PATTERN.test((value ?? "").trim());
}

/**
 * Extrai o código comercial de dois dígitos do cadastro do vendedor.
 * Cadastros legados usam formatos explicativos como "33.0XXX-26"; apenas
 * os dois primeiros dígitos são o prefixo que compõe o número do orçamento.
 */
export function getCommercialSellerPrefix(sellerCode: string | null | undefined): string | null {
  const match = (sellerCode ?? "").trim().match(/^(\d{2})/);
  return match?.[1] ?? null;
}

/** Confirma que uma sugestão comercial pertence ao código do vendedor escolhido. */
export function isCommercialQuoteNumberForSeller(
  quoteNumber: string | null | undefined,
  sellerCode: string | null | undefined,
): boolean {
  const prefix = getCommercialSellerPrefix(sellerCode);
  const normalizedNumber = (quoteNumber ?? "").trim();
  return Boolean(prefix)
    && isCommercialQuoteNumber(normalizedNumber)
    && normalizedNumber.startsWith(`${prefix}.`);
}

/** Retorna a sequência de quatro dígitos quando o número pertence ao vendedor e ano informados. */
export function getCommercialQuoteSequence(
  quoteNumber: string | null | undefined,
  sellerCode: string | null | undefined,
  year: string,
): number | null {
  const prefix = getCommercialSellerPrefix(sellerCode);
  const normalizedNumber = (quoteNumber ?? "").trim();
  if (!prefix || !isCommercialQuoteNumber(normalizedNumber)) return null;

  const start = `${prefix}.`;
  const end = `-${year}`;
  if (!normalizedNumber.startsWith(start) || !normalizedNumber.endsWith(end)) return null;

  const sequenceText = normalizedNumber.slice(start.length, -end.length);
  return /^\d{4}$/.test(sequenceText) ? Number(sequenceText) : null;
}

/** Mantém os quatro dígitos centrais editáveis no número comercial. */
export function formatCommercialQuoteSequenceInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  // Se um número completo for colado, conserva apenas seus quatro dígitos
  // centrais; o prefixo exibido continuará sendo o do Vendedor 1 selecionado.
  return (digits.length > 4 ? digits.slice(2, 6) : digits).slice(0, 4);
}

/** Monta o número exibido mantendo o prefixo e o ano fora da edição manual. */
export function buildCommercialQuoteNumber(
  sellerCode: string | null | undefined,
  sequence: string,
  year: string,
): string {
  const prefix = getCommercialSellerPrefix(sellerCode);
  const normalizedSequence = formatCommercialQuoteSequenceInput(sequence);
  if (!prefix) return "";
  if (normalizedSequence.length === 0) return "";
  return normalizedSequence.length === 4
    ? `${prefix}.${normalizedSequence}-${year}`
    : `${prefix}.${normalizedSequence}`;
}

/** Lê a sequência parcial do campo que já possui prefixo e ano controlados pela interface. */
export function getCommercialQuoteSequenceDraft(
  quoteNumber: string | null | undefined,
  sellerCode: string | null | undefined,
  year: string,
): string {
  const prefix = getCommercialSellerPrefix(sellerCode);
  const normalizedNumber = (quoteNumber ?? "").trim();
  if (!prefix || !normalizedNumber.startsWith(`${prefix}.`)) return "";

  const rest = normalizedNumber.slice(prefix.length + 1);
  const suffix = `-${year}`;
  const sequence = rest.endsWith(suffix) ? rest.slice(0, -suffix.length) : rest;
  return /^\d{0,4}$/.test(sequence) ? sequence : "";
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
