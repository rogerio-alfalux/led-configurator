export type CommercialTotals = {
  totalAmount: number;
  totalFinal: number;
};

export type NonCommercialQuoteKind = 'sample' | 'maintenance';
export type NonCommercialLinkType = 'cobrar' | 'diluir' | 'associar';

/** Cobrar e diluir transferem financeiramente o pedido original; associar preserva seu custo. */
export function transfersNonCommercialFinance(linkType: NonCommercialLinkType): boolean {
  return linkType === 'cobrar' || linkType === 'diluir';
}

/** Ambos os tipos usam o mesmo status comercial para exclusão de receita e comissão. */
export function getNonCommercialQuoteStatus(kind: NonCommercialQuoteKind): 'sample' {
  void kind;
  return 'sample';
}

type QuoteTotalsInput = {
  totalAmount?: number | string | null;
  totalFinal?: number | string | null;
};

type StoredOriginalTotals = {
  originalTotalAmount?: number | string | null;
  originalTotalFinal?: number | string | null;
};

function asAmount(value: number | string | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

/** Reutiliza o primeiro valor comercial salvo quando amostra e manutenção coexistem. */
export function resolveOriginalCommercialTotals(
  quote: QuoteTotalsInput,
  existing?: StoredOriginalTotals | null,
): CommercialTotals {
  return {
    totalAmount: asAmount(existing?.originalTotalAmount ?? quote.totalAmount),
    totalFinal: asAmount(existing?.originalTotalFinal ?? quote.totalFinal ?? quote.totalAmount),
  };
}

/** Só restaura a venda quando o último pedido sem cobrança é cancelado. */
export function getCommercialTotalsToRestore(
  original: StoredOriginalTotals | null | undefined,
  hasRemainingNonCommercialOrders: boolean,
): CommercialTotals | null {
  if (hasRemainingNonCommercialOrders || !original) return null;
  return {
    totalAmount: asAmount(original.originalTotalAmount),
    totalFinal: asAmount(original.originalTotalFinal),
  };
}
