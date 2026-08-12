/** LD Convidado configura itens e recebe apenas o PDF validado, sem navegar por orçamentos comerciais. */
export function canAccessCommercialQuotes(role: string | null | undefined): boolean {
  return role !== "convidado";
}
