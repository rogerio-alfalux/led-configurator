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
 * Soma apenas desembolsos rastreáveis: amostras e manutenções ainda não
 * recuperadas, custos adicionais cadastrados e fretes com custo cotado que foram
 * isentados. Pedidos cobrados ou diluídos em outro orçamento já possuem
 * financialTransferred e não entram novamente nesta apuração.
 * Não estima despesas e não inclui custos ordinários dos produtos vendidos.
 */
export function buildQuoteGeneralExpenses(input: {
  samples: GeneralExpenseSample[];
  additionalCosts: GeneralExpenseAdditionalCost[];
  freights: GeneralExpenseFreight[];
}) {
  const unrecoveredOrders = input.samples.filter((sample) =>
    (sample.kind === "sample" || sample.kind === "maintenance")
    && sample.status !== "cancelled"
    && !sample.financiallyTransferred,
  );
  const unrecoveredSamples = unrecoveredOrders.filter((order) => order.kind === "sample");
  const unrecoveredMaintenances = unrecoveredOrders.filter((order) => order.kind === "maintenance");
  const sampleCosts = unrecoveredSamples.reduce((total, sample) => total + toPositiveAmount(sample.costAmount), 0);
  const maintenanceCosts = unrecoveredMaintenances.reduce((total, maintenance) => total + toPositiveAmount(maintenance.costAmount), 0);
  const additionalCosts = input.additionalCosts.reduce((total, cost) => total + toPositiveAmount(cost.value), 0);
  const waivedFreights = input.freights
    .filter((freight) => freight.isWaived)
    .reduce((total, freight) => total + toPositiveAmount(freight.value), 0);

  return {
    sampleCosts: roundCurrency(sampleCosts),
    maintenanceCosts: roundCurrency(maintenanceCosts),
    additionalCosts: roundCurrency(additionalCosts),
    waivedFreights: roundCurrency(waivedFreights),
    total: roundCurrency(sampleCosts + maintenanceCosts + additionalCosts + waivedFreights),
    counts: {
      unrecoveredSamples: unrecoveredSamples.length,
      unrecoveredMaintenances: unrecoveredMaintenances.length,
      additionalCosts: input.additionalCosts.filter((cost) => toPositiveAmount(cost.value) > 0).length,
      waivedFreights: input.freights.filter((freight) => freight.isWaived && toPositiveAmount(freight.value) > 0).length,
    },
  };
}
