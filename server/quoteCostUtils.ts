/**
 * O dashboard de custo deve considerar os mesmos itens exibidos na revisão
 * ativa da tela de orçamento. Revisões históricas não podem ser somadas.
 */
export function selectActiveQuoteItems<
  Version extends { id: number; status?: string | null },
  Item extends { quoteVersionId: number }
>(versions: Version[], items: Item[]): Item[] {
  const activeVersionId = getActiveQuoteVersionId(versions);
  if (activeVersionId == null) return [];
  return items.filter((item) => item.quoteVersionId === activeVersionId);
}

/** A revisão em rascunho é a exibida; sem rascunho, a primeira é a mais recente. */
export function getActiveQuoteVersionId<Version extends { id: number; status?: string | null }>(versions: Version[]): number | undefined {
  return (versions.find((version) => version.status === "draft") ?? versions[0])?.id;
}

/**
 * Produtos BAGEO podem compartilhar o mesmo SKU entre potências distintas.
 * Para evitar usar, por exemplo, o custo da versão 40W/M em um item 20W/M,
 * a descrição gravada no orçamento tem precedência sobre o SKU genérico.
 */
export function selectApiProductForQuoteItem<
  Product extends { sku: string; name?: string | null }
>(products: Product[], sku: string, description?: string | null): Product | undefined {
  const normalizedSku = sku.trim().toUpperCase();
  const normalizedDescription = (description ?? "").trim().toUpperCase();
  const skuMatches = products.filter((product) => product.sku.trim().toUpperCase() === normalizedSku);

  return skuMatches.find((product) => {
    const name = product.name?.trim().toUpperCase();
    return Boolean(name && normalizedDescription.includes(name));
  }) ?? skuMatches[0];
}

export function calculateDashboardProductCost(input: {
  category?: string | null;
  bodyCost: number;
  driverCost: number;
  qty: number;
  driverQty: number;
  lengthMm?: number | null;
}): { custoCorpo: number; custoDriver: number; subtotal: number } {
  const isPerMeter = Number(input.lengthMm ?? 0) > 0
    && (input.category === "BAGEO" || input.category === "LED BAR");
  const custoCorpo = isPerMeter
    ? Math.round(input.bodyCost * (Number(input.lengthMm) / 1000) * 100) / 100
    : input.bodyCost;
  // O card "Custo Produtos" da BAGEO exibe exclusivamente o custo do corpo.
  const custoDriver = input.category === "BAGEO" ? 0 : input.driverCost;
  return {
    custoCorpo,
    custoDriver,
    subtotal: custoCorpo * input.qty + custoDriver * input.driverQty,
  };
}

/** Um custo manual é uma substituição comercial explícita, não uma estimativa. */
export function getManualUnitCost(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
