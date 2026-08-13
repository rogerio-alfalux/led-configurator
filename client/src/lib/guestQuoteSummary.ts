/** Remove linhas comerciais de um resumo antes de entregá-lo ao LD Convidado. */
export function redactGuestQuoteSummary(summary: string): string {
  return summary
    .split("\n")
    .filter((line) => !/\bR\$\s*\d|^\s*(LUMINÁRIAS|DRIVERS|TOTAL|PREÇO|CUSTO|VALOR)\s*:/i.test(line))
    .join("\n")
    .trim();
}
