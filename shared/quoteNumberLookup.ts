/** Normaliza números de orçamento para busca, aceitando prefixo ORC, espaços e separadores. */
export function normalizeQuoteNumberForLookup(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/^ORC\s*[-.:]?\s*/, "")
    .replace(/[^A-Z0-9]/g, "");
}
