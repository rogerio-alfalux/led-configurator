export type GeneralExpenseSample = {
  costAmount?: unknown;
  kind?: string | null;
  status?: string | null;
  financiallyTransferred?: boolean;
};

export type GeneralExpenseAdditionalCost = { value?: unknown };
export type GeneralExpenseFreight = { value?: unknown; isWaived?: boolean };

function toPositiveAmount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Soma apenas desembolsos rastreáveis: amostras comerciais ainda não recuperadas,
 * custos adicionais cadastrados e fretes com custo cotado que foram isentados.
 * Não estima despesas e não inclui custos ordinários dos produtos vendidos.
 */
export function buildQuoteGeneralExpenses(input: {
  samples: GeneralExpenseSample[];
  additionalCosts: GeneralExpenseAdditionalCost[];
  freights: GeneralExpenseFreight[];
}) {
  const unrecoveredSamples = input.samples.filter((sample) =>
    sample.kind === "sample"
    && sample.status !== "cancelled"
    && !sample.financiallyTransferred,
  );
  const sampleCosts = unrecoveredSamples.reduce((total, sample) => total + toPositiveAmount(sample.costAmount), 0);
  const additionalCosts = input.additionalCosts.reduce((total, cost) => total + toPositiveAmount(cost.value), 0);
  const waivedFreights = input.freights
    .filter((freight) => freight.isWaived)
    .reduce((total, freight) => total + toPositiveAmount(freight.value), 0);

  return {
    sampleCosts: roundCurrency(sampleCosts),
    additionalCosts: roundCurrency(additionalCosts),
    waivedFreights: roundCurrency(waivedFreights),
    total: roundCurrency(sampleCosts + additionalCosts + waivedFreights),
    counts: {
      unrecoveredSamples: unrecoveredSamples.length,
      additionalCosts: input.additionalCosts.filter((cost) => toPositiveAmount(cost.value) > 0).length,
      waivedFreights: input.freights.filter((freight) => freight.isWaived && toPositiveAmount(freight.value) > 0).length,
    },
  };
}
