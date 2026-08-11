export type DuplicateQuoteCandidate = {
  id: number;
  projectName: string | null;
  totalFinal: unknown;
};

/**
 * Uma duplicidade comercial existe somente quando obra e total final coincidem.
 * Campos vazios e valores zerados não formam grupos para evitar falsos positivos.
 */
export function getDuplicateQuoteKey(projectName: string | null, totalFinal: unknown): string | null {
  const normalizedProject = (projectName ?? '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
  const value = Math.round(Number(totalFinal ?? 0) * 100) / 100;
  return normalizedProject && value > 0 ? `${normalizedProject}::${value.toFixed(2)}` : null;
}

export function getDuplicateQuoteGroupSizes(candidates: DuplicateQuoteCandidate[]): Map<string, number> {
  const groups = new Map<string, number>();
  for (const candidate of candidates) {
    const key = getDuplicateQuoteKey(candidate.projectName, candidate.totalFinal);
    if (key) groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return groups;
}
