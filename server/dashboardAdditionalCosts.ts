/**
 * A execução SQL pode retornar linhas diretamente ou uma tupla de
 * [linhas, metadados], conforme o driver do banco. Extrai o agregado de modo
 * seguro para que custos adicionais não sejam silenciosamente desconsiderados.
 */
export function readAdditionalCostsAggregate(rawResult: unknown): { total: number; count: number } {
  const firstLevel = Array.isArray(rawResult) ? rawResult[0] : rawResult;
  const row = Array.isArray(firstLevel) ? firstLevel[0] : firstLevel;
  const aggregate = row && typeof row === "object" ? row as { total?: unknown; count?: unknown } : {};

  return {
    total: Number(aggregate.total ?? 0),
    count: Number(aggregate.count ?? 0),
  };
}
