/**
 * O dashboard de custo deve considerar os mesmos itens exibidos na revisão
 * ativa da tela de orçamento. Revisões históricas não podem ser somadas.
 */
export function selectActiveQuoteItems<
  Version extends { id: number; status?: string | null },
  Item extends { quoteVersionId: number }
>(versions: Version[], items: Item[]): Item[] {
  // A revisão em rascunho é a que a tela apresenta como ativa. Sem rascunho,
  // as versões chegam ordenadas da mais recente para a mais antiga.
  const activeVersion = versions.find((version) => version.status === "draft") ?? versions[0];
  if (!activeVersion) return [];
  return items.filter((item) => item.quoteVersionId === activeVersion.id);
}
