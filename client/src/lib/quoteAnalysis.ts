import type { CartItemData } from "./cartTypes";
import { applyItemDiscount, applyQuoteDiscount, calculateQuoteTotalWithDiscountAndTax, getDisplayedCustomerTotal } from "./quoteTotals";
import { getStateInfo } from "./difalTable";

export type QuoteAnalysisCostItem = {
  itemNumber: number;
  subtotal: number;
  source: string;
};

export type QuoteAnalysisRawItem = {
  itemNumber: number;
  itemData: string | CartItemData;
};

export type QuoteAnalysisItem = {
  itemNumber: number;
  sku: string;
  description: string;
  photoUrl: string | null;
  quantity: number;
  unitRevenue: number;
  revenue: number;
  cost: number | null;
  grossProfit: number | null;
  grossMarginPercent: number | null;
  quoteSharePercent: number;
  costSource?: string;
};

export const MONTHLY_FIXED_COST_REFERENCE = 1_500_000;

export const quoteAnalysisSortOptions = [
  { value: "valueDesc", label: "Maior valor" },
  { value: "valueAsc", label: "Menor valor" },
  { value: "quantityDesc", label: "Maior quantidade" },
  { value: "quantityAsc", label: "Menor quantidade" },
  { value: "marginDesc", label: "Maior margem" },
  { value: "marginAsc", label: "Menor margem" },
] as const;

export type QuoteAnalysisSort = (typeof quoteAnalysisSortOptions)[number]["value"];

export type QuoteAnalysisSummary = {
  quoteTotal: number;
  itemsRevenue: number;
  nonItemAmount: number;
  productCost: number;
  additionalCost: number;
  totalCost: number;
  grossProfit: number | null;
  grossMarginPercent: number | null;
  netProfit: number | null;
  netMarginPercent: number | null;
  contributionMargin: number | null;
  contributionMarginPercent: number | null;
  monthlyFixedCostReference: number;
  fixedCostCoveragePercent: number | null;
  fixedCostAmountRemaining: number | null;
  itemCount: number;
  unitCount: number;
  knownCostItemCount: number;
  missingCostItemCount: number;
  topThreeSharePercent: number;
  highestValueItem: QuoteAnalysisItem | null;
  lowestValueItem: QuoteAnalysisItem | null;
  highestMarginItem: QuoteAnalysisItem | null;
  lowestMarginItem: QuoteAnalysisItem | null;
  highestCostItem: QuoteAnalysisItem | null;
  deductions: {
    standardTaxes: number;
    commissions: number;
    rt: number;
    difalFcp: number;
    freight: number;
  };
  items: QuoteAnalysisItem[];
};

type QuoteAnalysisQuote = {
  totalFinal?: unknown;
  totalAmount?: unknown;
  discountPercent?: unknown;
  freteValue?: unknown;
  freteIncluded?: unknown;
  destState?: unknown;
  difalEnabled?: unknown;
  difalValue?: unknown;
  fcpValue?: unknown;
  commissionPercent?: unknown;
  commissionPercent2?: unknown;
  rtPercent?: unknown;
};

export type QuoteAnalysisInput = {
  quote: QuoteAnalysisQuote;
  items: QuoteAnalysisRawItem[];
  costItems?: QuoteAnalysisCostItem[];
  additionalCosts?: Array<{ valor?: unknown }>;
};

function amount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseItem(itemData: string | CartItemData): CartItemData | null {
  if (typeof itemData !== "string") return itemData;
  try {
    return JSON.parse(itemData) as CartItemData;
  } catch {
    return null;
  }
}

function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

/** Retorna a participação de um orçamento comercial no valor total dos filtros vigentes. */
export function getQuoteParticipationPercent(quoteValue: unknown, filteredTotal: unknown): number | null {
  const value = amount(quoteValue);
  const total = amount(filteredTotal);
  return value > 0 && total > 0 ? (value / total) * 100 : null;
}

function compareAscending(a: QuoteAnalysisItem, b: QuoteAnalysisItem, field: "revenue" | "grossMarginPercent" | "cost") {
  return amount(a[field]) - amount(b[field]) || a.itemNumber - b.itemNumber;
}

function compareNullableNumber(a: number | null, b: number | null, direction: "asc" | "desc") {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}

/**
 * Reordena somente uma cópia dos dados de leitura da análise. A lista persistida,
 * a revisão, o preview e os documentos do orçamento não são alterados.
 */
export function sortQuoteAnalysisItems(items: QuoteAnalysisItem[], sort: QuoteAnalysisSort): QuoteAnalysisItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "valueAsc":
        return a.revenue - b.revenue || a.itemNumber - b.itemNumber;
      case "valueDesc":
        return b.revenue - a.revenue || a.itemNumber - b.itemNumber;
      case "quantityAsc":
        return a.quantity - b.quantity || a.itemNumber - b.itemNumber;
      case "quantityDesc":
        return b.quantity - a.quantity || a.itemNumber - b.itemNumber;
      case "marginAsc":
        return compareNullableNumber(a.grossMarginPercent, b.grossMarginPercent, "asc") || a.itemNumber - b.itemNumber;
      case "marginDesc":
        return compareNullableNumber(a.grossMarginPercent, b.grossMarginPercent, "desc") || a.itemNumber - b.itemNumber;
    }
  });
}

/**
 * Compõe uma leitura analítica da revisão ativa sem alterar valores persistidos.
 * A receita de cada item usa os descontos individual e global; frete e DIFAL/FCP
 * permanecem discriminados no residual do total quando não foram diluídos nos itens.
 */
export function buildQuoteAnalysis(input: QuoteAnalysisInput): QuoteAnalysisSummary {
  const costByItem = new Map<number, { subtotal: number; source: string }>();
  for (const costItem of input.costItems ?? []) {
    const current = costByItem.get(costItem.itemNumber);
    costByItem.set(costItem.itemNumber, {
      subtotal: roundMoney((current?.subtotal ?? 0) + amount(costItem.subtotal)),
      source: current?.source ?? costItem.source,
    });
  }

  const discountPercent = amount(input.quote.discountPercent);
  const quoteTotal = roundMoney(getDisplayedCustomerTotal(input.quote));
  const analysisItems = input.items
    .reduce<QuoteAnalysisItem[]>((entries, rawItem) => {
      const item = parseItem(rawItem.itemData);
      if (!item) return entries;
      const originalRevenue = item.isCommercialSampleCharge
        ? amount(item.sampleChargeFinalAmount)
        : amount(item.totalPrice);
      const revenue = roundMoney(applyQuoteDiscount(
        applyItemDiscount(originalRevenue, item.itemDiscountPercent),
        discountPercent,
      ));
      const costDetail = costByItem.get(rawItem.itemNumber);
      const cost = costDetail?.source === "especial_sem_preco" ? null : costDetail?.subtotal ?? null;
      const grossProfit = cost === null ? null : roundMoney(revenue - cost);
      const quantity = amount(item.qty) || 1;
      entries.push({
        itemNumber: rawItem.itemNumber,
        sku: item.sku || "Sem SKU",
        description: item.description || item.specialDescription || "Item sem descrição",
        photoUrl: item.specialPhotoUrl ?? item.photoUrl ?? null,
        quantity,
        unitRevenue: roundMoney(revenue / quantity),
        revenue,
        cost,
        grossProfit,
        grossMarginPercent: grossProfit === null || revenue <= 0 ? null : (grossProfit / revenue) * 100,
        quoteSharePercent: quoteTotal > 0 ? (revenue / quoteTotal) * 100 : 0,
        costSource: costDetail?.source,
      });
      return entries;
    }, [])
    .sort((a, b) => b.revenue - a.revenue || a.itemNumber - b.itemNumber);

  const itemsRevenue = roundMoney(analysisItems.reduce((total, item) => total + item.revenue, 0));
  const knownCostItems = analysisItems.filter((item) => item.cost !== null);
  const productCost = roundMoney(knownCostItems.reduce((total, item) => total + (item.cost ?? 0), 0));
  const additionalCost = roundMoney((input.additionalCosts ?? []).reduce((total, cost) => total + amount(cost.valor), 0));
  const totalCost = roundMoney(productCost + additionalCost);
  const hasFullCostCoverage = analysisItems.length > 0 && knownCostItems.length === analysisItems.length;
  const grossProfit = hasFullCostCoverage ? roundMoney(quoteTotal - productCost) : null;
  const grossMarginPercent = grossProfit === null || quoteTotal <= 0 ? null : (grossProfit / quoteTotal) * 100;

  const stateInfo = typeof input.quote.destState === "string" ? getStateInfo(input.quote.destState) : undefined;
  const freight = input.quote.freteIncluded ? 0 : Math.max(0, amount(input.quote.freteValue));
  const dashboardTotals = calculateQuoteTotalWithDiscountAndTax({
    productsBeforeDiscount: amount(input.quote.totalAmount),
    discountPercent,
    freteValue: freight,
    difalEnabled: Boolean(input.quote.difalEnabled) && !!stateInfo && stateInfo.combined > 0,
    combinedTaxRate: stateInfo?.combined,
  });
  const difalFcp = discountPercent > 0
    ? dashboardTotals.taxAmount
    : Math.max(0, amount(input.quote.difalValue) + amount(input.quote.fcpValue));
  const standardTaxes = roundMoney(quoteTotal * 0.12);
  const commissions = roundMoney(quoteTotal * (amount(input.quote.commissionPercent) + amount(input.quote.commissionPercent2)));
  const rt = roundMoney((discountPercent > 0 ? dashboardTotals.productsAfterDiscount : amount(input.quote.totalAmount)) * amount(input.quote.rtPercent));
  const netProfit = hasFullCostCoverage
    ? roundMoney(quoteTotal - totalCost - standardTaxes - commissions - rt - difalFcp - freight)
    : null;
  const netMarginPercent = netProfit === null || quoteTotal <= 0 ? null : (netProfit / quoteTotal) * 100;
  // Nesta análise, a margem de contribuição considera todos os custos variáveis
  // já subtraídos no resultado líquido e mostra o valor disponível para custos fixos.
  const contributionMargin = netProfit;
  const contributionMarginPercent = netMarginPercent;
  const fixedCostCoveragePercent = contributionMargin === null
    ? null
    : (contributionMargin / MONTHLY_FIXED_COST_REFERENCE) * 100;
  const fixedCostAmountRemaining = contributionMargin === null
    ? null
    : roundMoney(MONTHLY_FIXED_COST_REFERENCE - contributionMargin);
  const margins = knownCostItems.filter((item) => item.grossMarginPercent !== null && item.revenue > 0);
  const byRevenueAscending = [...analysisItems].filter((item) => item.revenue > 0).sort((a, b) => compareAscending(a, b, "revenue"));
  const topThreeSharePercent = analysisItems.slice(0, 3).reduce((total, item) => total + item.quoteSharePercent, 0);

  return {
    quoteTotal,
    itemsRevenue,
    nonItemAmount: roundMoney(quoteTotal - itemsRevenue),
    productCost,
    additionalCost,
    totalCost,
    grossProfit,
    grossMarginPercent,
    netProfit,
    netMarginPercent,
    contributionMargin,
    contributionMarginPercent,
    monthlyFixedCostReference: MONTHLY_FIXED_COST_REFERENCE,
    fixedCostCoveragePercent,
    fixedCostAmountRemaining,
    itemCount: analysisItems.length,
    unitCount: analysisItems.reduce((total, item) => total + item.quantity, 0),
    knownCostItemCount: knownCostItems.length,
    missingCostItemCount: analysisItems.length - knownCostItems.length,
    topThreeSharePercent,
    highestValueItem: analysisItems[0] ?? null,
    lowestValueItem: byRevenueAscending[0] ?? null,
    highestMarginItem: [...margins].sort((a, b) => compareAscending(b, a, "grossMarginPercent"))[0] ?? null,
    lowestMarginItem: [...margins].sort((a, b) => compareAscending(a, b, "grossMarginPercent"))[0] ?? null,
    highestCostItem: [...knownCostItems].sort((a, b) => compareAscending(b, a, "cost"))[0] ?? null,
    deductions: { standardTaxes, commissions, rt, difalFcp, freight },
    items: analysisItems,
  };
}
