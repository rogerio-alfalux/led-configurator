export type QuoteVersionSelection = {
  id: number | string;
  status?: string | null;
};

/**
 * Seleciona a revisão que pode ser usada comercialmente.
 *
 * Um rascunho é prioritário somente quando possui itens. Isso evita que uma
 * gravação interrompida de cabeçalho oculte o snapshot publicado anterior.
 */
export function getActiveQuoteVersionId(
  versions: QuoteVersionSelection[],
  itemVersionIds: Iterable<number | string>,
): number | string | undefined {
  const versionsWithItems = new Set(Array.from(itemVersionIds, (id) => String(id)));
  const latestUsable = versions.find((version) => versionsWithItems.has(String(version.id)));
  return latestUsable?.id ?? versions[0]?.id;
}
