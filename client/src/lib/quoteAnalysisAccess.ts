export type QuoteAnalysisAccessUser = { role?: string | null } | null | undefined;

/** As visualizações financeiras aprofundadas são confidenciais e exclusivas de administradores. */
export function canAccessQuoteAnalysis(user: QuoteAnalysisAccessUser): boolean {
  return user?.role === "admin";
}
