import { applyItemDiscount, applyQuoteDiscount } from "../client/src/lib/quoteTotals";
import { calculateDashboardProductCost, getManualUnitCost, selectApiProductForQuoteItem } from "./quoteCostUtils";

export type ProductAnalyticsCatalog = {
  products: Array<any>;
  components: Array<any>;
  accessories: Array<any>;
  revendas: Array<any>;
};

export type ProductAnalyticsQuote = {
  id: number;
  status: string;
  createdInPeriod: boolean;
  closedInPeriod: boolean;
  lostInPeriod: boolean;
  discountPercent?: unknown;
  marginPercent?: unknown;
  commissionPercent?: unknown;
  commissionPercent2?: unknown;
  rtPercent?: unknown;
  totalFinal?: unknown;
  freteValue?: unknown;
  freteIncluded?: unknown;
  difalValue?: unknown;
  fcpValue?: unknown;
  additionalCost?: unknown;
  items: Array<{ itemNumber: number; itemData: unknown }>;
};

export type ProductMetric = {
  key: string;
  sku: string;
  description: string;
  family: string;
  category: string;
  quotedAmount: number;
  quotedUnits: number;
  quotedQuoteCount: number;
  closedAmount: number;
  closedUnits: number;
  closedQuoteCount: number;
  lostAmount: number;
  lostUnits: number;
  lostQuoteCount: number;
  knownCostAmount: number;
  missingCostAmount: number;
  contributionAmount: number | null;
  contributionMarginPercent: number | null;
  financialSharePercent: number | null;
  grossMarginPercent: number | null;
};

export type FamilyMetric = Omit<ProductMetric, "key" | "sku" | "description" | "category"> & { family: string };
export type CategoryMetric = Omit<ProductMetric, "key" | "sku" | "description" | "family"> & { category: string };

type MutableMetric = Omit<ProductMetric, "contributionAmount" | "contributionMarginPercent" | "financialSharePercent" | "grossMarginPercent"> & {
  knownContributionAmount: number;
  grossProfitAmount: number;
};

const TAX_RATE = 0.12;

function amount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function getItemRevenue(data: any, discountPercent: unknown): number {
  const qty = Math.max(0, amount(data.qty) || 1);
  const base = Math.max(0, amount(data.totalPrice) || amount(data.unitPrice) * qty);
  return applyQuoteDiscount(applyItemDiscount(base, data.itemDiscountPercent), discountPercent);
}

function getDriverCost(product: any, driverCode: string): { body: number; driver: number } {
  const normalizedDriver = driverCode.toUpperCase();
  const match = (field: string, bodyField: string, driverField: string) =>
    normalizedDriver && product?.[field]?.code?.toUpperCase() === normalizedDriver
      ? { body: amount(product?.[bodyField] ?? product?.custoLuminaria), driver: amount(product?.[driverField]) }
      : null;

  return match("driver220", "custoCorpoOnoff220v", "custoDriver220")
    ?? match("driverBivolt", "custoCorpoOnoffBivolt", "custoDriverBivolt")
    ?? match("driverDim110v", "custoCorpoDim110v", "custoDriverDim110v")
    ?? match("driverDimDali", "custoCorpoDimDali", "custoDriverDimDali")
    ?? match("driverDimTriac110v", "custoCorpoDimTriac110v", "custoDriverDimTriac110v")
    ?? match("driverDimTriac220v", "custoCorpoDimTriac220v", "custoDriverDimTriac220v")
    ?? { body: amount(product?.custoCorpoOnoff220v ?? product?.custoLuminaria), driver: amount(product?.custoDriver220) };
}

function getItemCost(data: any, quoteMarginPercent: unknown, catalogs: ProductAnalyticsCatalog): { amount: number | null; estimated: boolean } {
  const qty = Math.max(0, amount(data.qty) || 1);
  const sku = String(data.sku ?? "").toUpperCase();
  const category = String(data.category ?? "").toUpperCase();
  const linearLengthMm = amount(data.ledBarComprimentoTotalMm);
  // Comprimentos de 1–99 mm em famílias lineares são registros legados com
  // unidade incorreta, não uma medida comercial utilizável. Sem uma base de
  // comprimento válida, o custo por metro não pode compor margem confiável.
  if ((category === "LED BAR" || category === "BAGEO") && linearLengthMm > 0 && linearLengthMm < 100) {
    return { amount: null, estimated: false };
  }
  const manual = getManualUnitCost(data.custoManual);
  if (manual > 0) return { amount: rounded(manual * qty), estimated: false };

  const estimatedSpecialCost = () => {
    const margin = Math.max(0, amount(quoteMarginPercent));
    const sale = Math.max(0, amount(data.totalPrice));
    return margin > 0 && sale > 0 ? { amount: rounded(sale / (1 + margin)), estimated: true } : { amount: null, estimated: false };
  };
  if (data.isSpecialItem || data.category === "Item Especial" || data.category === "especial") return estimatedSpecialCost();

  const componentByCode = new Map(catalogs.components.filter((item) => item?.codigo).map((item) => [String(item.codigo).toUpperCase(), item]));
  const accessoryByCode = new Map(catalogs.accessories.filter((item) => item?.codigo).map((item) => [String(item.codigo).toUpperCase(), item]));
  const accessoryBySku = new Map(catalogs.accessories.filter((item) => item?.sku).map((item) => [String(item.sku).toUpperCase(), item]));
  const revendaBySku = new Map(catalogs.revendas.filter((item) => item?.codigo).map((item) => [String(item.codigo).toUpperCase(), item]));

  let linkedAccessoriesCost = 0;
  let linkedAccessoriesCostConfirmed = true;
  if (Array.isArray(data.accessories)) {
    linkedAccessoriesCost = data.accessories.reduce((sum: number, accessory: any) => {
      const code = String(accessory?.codigo ?? "").toUpperCase();
      const source = accessoryByCode.get(code) ?? accessoryBySku.get(code) ?? componentByCode.get(code);
      const unitCost = amount(source?.custo ?? source?.custoDriver);
      if (unitCost <= 0) linkedAccessoriesCostConfirmed = false;
      return sum + unitCost * Math.max(0, amount(accessory?.qty) || 1) * qty;
    }, 0);
  }
  if (!linkedAccessoriesCostConfirmed) return { amount: null, estimated: false };

  if (Array.isArray(data.profileSegments) && data.profileSegments.length > 0) {
    let bodyPerUnit = 0;
    let allBodiesConfirmed = true;
    let driverQty = 0;
    const firstDriverCode = String(data.profileSegments[0]?.driverCode ?? "").toUpperCase();
    let driverUnitCost = 0;
    for (const segment of data.profileSegments) {
      const segmentProduct = selectApiProductForQuoteItem(catalogs.products, String(segment?.sku ?? ""), segment?.description ?? data.description);
      const segmentQty = Math.max(0, amount(segment?.qty) || 1);
      if (segmentProduct) {
        const costs = getDriverCost(segmentProduct, firstDriverCode);
        bodyPerUnit += costs.body * segmentQty;
        if (costs.body <= 0) allBodiesConfirmed = false;
        if (driverUnitCost === 0) driverUnitCost = costs.driver;
      } else allBodiesConfirmed = false;
      driverQty += Math.max(0, amount(segment?.driverQtyPerPiece)) * segmentQty;
    }
    if (Array.isArray(data.driverLines) && data.driverLines.length > 0) {
      driverQty = data.driverLines.reduce((sum: number, line: any) => sum + Math.max(0, amount(line?.driverQty)), 0);
      const driverCode = String(data.driverLines[0]?.driverCode ?? "").toUpperCase();
      const source = componentByCode.get(driverCode) ?? accessoryByCode.get(driverCode);
      if (source) driverUnitCost = amount(source.custoDriver ?? source.custo);
    } else {
      driverQty *= qty;
    }
    const needsDriverCost = driverQty > 0;
    return allBodiesConfirmed && bodyPerUnit > 0 && (!needsDriverCost || driverUnitCost > 0)
      ? { amount: rounded(bodyPerUnit * qty + driverUnitCost * driverQty + linkedAccessoriesCost), estimated: false }
      : { amount: null, estimated: false };
  }

  const revenda = revendaBySku.get(sku);
  if (amount(revenda?.custo) > 0) return { amount: rounded(amount(revenda.custo) * qty + linkedAccessoriesCost), estimated: false };
  const component = componentByCode.get(sku);
  if (amount(component?.custoDriver) > 0) return { amount: rounded(amount(component.custoDriver) * qty + linkedAccessoriesCost), estimated: false };
  const accessory = accessoryByCode.get(sku) ?? accessoryBySku.get(sku);
  if (amount(accessory?.custo) > 0) return { amount: rounded(amount(accessory.custo) * qty + linkedAccessoriesCost), estimated: false };

  const product = selectApiProductForQuoteItem(catalogs.products, sku, data.description);
  if (!product) return { amount: null, estimated: false };
  const driverCode = Array.isArray(data.driverLines) ? String(data.driverLines[0]?.driverCode ?? "").toUpperCase() : "";
  const costs = getDriverCost(product, driverCode);
  if (costs.body <= 0) return { amount: null, estimated: false };
  const driverQty = Array.isArray(data.driverLines)
    ? data.driverLines.reduce((sum: number, line: any) => sum + Math.max(0, amount(line?.driverQty)), 0)
    : Math.max(0, amount(data.driverQtyPerUnit) || amount(product.driverQtd220 ?? product.driverQtdBivolt ?? 1)) * qty;
  if (driverQty > 0 && costs.driver <= 0) return { amount: null, estimated: false };
  const result = calculateDashboardProductCost({
    category: data.category,
    bodyCost: costs.body,
    driverCost: costs.driver,
    qty,
    driverQty,
    lengthMm: amount(data.ledBarComprimentoTotalMm),
  });
  return { amount: rounded(result.subtotal + linkedAccessoriesCost), estimated: false };
}

function createMetric(key: string, sku: string, description: string, family: string, category: string): MutableMetric {
  return {
    key, sku, description, family, category,
    quotedAmount: 0, quotedUnits: 0, quotedQuoteCount: 0,
    closedAmount: 0, closedUnits: 0, closedQuoteCount: 0,
    lostAmount: 0, lostUnits: 0, lostQuoteCount: 0,
    knownCostAmount: 0, missingCostAmount: 0,
    knownContributionAmount: 0, grossProfitAmount: 0,
  };
}

function metricResult(metric: MutableMetric): ProductMetric {
  const hasMissingCost = metric.missingCostAmount > 0;
  return {
    key: metric.key,
    sku: metric.sku,
    description: metric.description,
    family: metric.family,
    category: metric.category,
    quotedAmount: rounded(metric.quotedAmount),
    quotedUnits: rounded(metric.quotedUnits),
    quotedQuoteCount: metric.quotedQuoteCount,
    closedAmount: rounded(metric.closedAmount),
    closedUnits: rounded(metric.closedUnits),
    closedQuoteCount: metric.closedQuoteCount,
    lostAmount: rounded(metric.lostAmount),
    lostUnits: rounded(metric.lostUnits),
    lostQuoteCount: metric.lostQuoteCount,
    knownCostAmount: rounded(metric.knownCostAmount),
    missingCostAmount: rounded(metric.missingCostAmount),
    contributionAmount: hasMissingCost ? null : rounded(metric.knownContributionAmount),
    contributionMarginPercent: hasMissingCost || metric.closedAmount <= 0 ? null : rounded(metric.knownContributionAmount / metric.closedAmount * 100),
    financialSharePercent: null,
    grossMarginPercent: hasMissingCost || metric.closedAmount <= 0 ? null : rounded(metric.grossProfitAmount / metric.closedAmount * 100),
  };
}

function getItemClassification(data: any, catalogs: ProductAnalyticsCatalog): { family: string; category: string } {
  const savedCategory = String(data?.category ?? "").trim();
  const savedFamily = String(data?.family ?? data?.familia ?? data?.productFamily ?? "").trim();
  if (data?.isSpecialItem || savedCategory.toLowerCase() === "item especial" || savedCategory.toLowerCase() === "especial") {
    return { family: savedFamily || "Itens especiais", category: "Itens especiais" };
  }

  const sku = String(data?.sku ?? "").trim();
  const description = String(data?.description ?? data?.specialDescription ?? "").trim();
  const product = selectApiProductForQuoteItem(catalogs.products, sku, description);
  const component = catalogs.components.find((item) => String(item?.codigo ?? "").trim().toUpperCase() === sku.toUpperCase());
  const accessory = catalogs.accessories.find((item) => String(item?.codigo ?? item?.sku ?? "").trim().toUpperCase() === sku.toUpperCase());
  const revenda = catalogs.revendas.find((item) => String(item?.codigo ?? item?.sku ?? "").trim().toUpperCase() === sku.toUpperCase());
  const source = product ?? component ?? accessory ?? revenda;
  const sourceCategory = source?.categoria ?? source?.category ?? savedCategory;
  const sourceFamily = source?.familia ?? source?.family ?? savedFamily ?? component?.tipo ?? savedCategory;
  const category = String(sourceCategory || "Sem categoria").trim() || "Sem categoria";
  const family = String(sourceFamily || "Sem família").trim() || "Sem família";
  return { family, category };
}

function increaseQuoteCount(metric: MutableMetric, type: "quoted" | "closed" | "lost", quoteId: number, seen: Map<string, Set<number>>) {
  const key = `${type}:${metric.key}`;
  const quoteIds = seen.get(key) ?? new Set<number>();
  if (!quoteIds.has(quoteId)) {
    quoteIds.add(quoteId);
    seen.set(key, quoteIds);
    if (type === "quoted") metric.quotedQuoteCount++;
    if (type === "closed") metric.closedQuoteCount++;
    if (type === "lost") metric.lostQuoteCount++;
  }
}

export function buildDashboardProductAnalytics(quotes: ProductAnalyticsQuote[], catalogs: ProductAnalyticsCatalog) {
  const products = new Map<string, MutableMetric>();
  const families = new Map<string, MutableMetric>();
  const categories = new Map<string, MutableMetric>();
  const seenQuoteCounts = new Map<string, Set<number>>();
  const getMetric = (map: Map<string, MutableMetric>, key: string, sku: string, description: string, family: string, category: string) => {
    const existing = map.get(key);
    if (existing) return existing;
    const metric = createMetric(key, sku, description, family, category);
    map.set(key, metric);
    return metric;
  };

  for (const quote of quotes) {
    const parsedItems = quote.items.flatMap((raw) => {
      try {
        const data = typeof raw.itemData === "string" ? JSON.parse(raw.itemData) : raw.itemData as any;
        const sku = String(data?.sku ?? "Sem SKU").trim() || "Sem SKU";
        const description = String(data?.description ?? data?.specialDescription ?? "Item sem descrição").trim() || "Item sem descrição";
        const { family, category } = getItemClassification(data, catalogs);
        const quantity = Math.max(0, amount(data?.qty) || 1);
        const revenue = getItemRevenue(data, quote.discountPercent);
        return [{ data, sku, description, family, category, quantity, revenue }];
      } catch {
        return [];
      }
    });

    const totalItemsRevenue = parsedItems.reduce((sum, item) => sum + item.revenue, 0);
    const variableDeductions = amount(quote.totalFinal) * (TAX_RATE + amount(quote.commissionPercent) + amount(quote.commissionPercent2))
      + totalItemsRevenue * amount(quote.rtPercent)
      + amount(quote.difalValue)
      + amount(quote.fcpValue)
      + (quote.freteIncluded ? 0 : amount(quote.freteValue))
      + amount(quote.additionalCost);

    for (const item of parsedItems) {
      const productKey = `${normalize(item.sku)}|${normalize(item.description)}`;
      const familyKey = normalize(item.family) || "SEM FAMILIA";
      const categoryKey = normalize(item.category) || "SEM CATEGORIA";
      const product = getMetric(products, productKey, item.sku, item.description, item.family, item.category);
      const family = getMetric(families, familyKey, "", item.family, item.family, item.category);
      const category = getMetric(categories, categoryKey, "", item.category, item.family, item.category);
      const targets = [product, family, category];

      if (quote.createdInPeriod) {
        for (const target of targets) {
          target.quotedAmount += item.revenue;
          target.quotedUnits += item.quantity;
          increaseQuoteCount(target, "quoted", quote.id, seenQuoteCounts);
        }
      }
      if (quote.lostInPeriod) {
        for (const target of targets) {
          target.lostAmount += item.revenue;
          target.lostUnits += item.quantity;
          increaseQuoteCount(target, "lost", quote.id, seenQuoteCounts);
        }
      }
      if (quote.closedInPeriod) {
        const cost = getItemCost(item.data, quote.marginPercent, catalogs);
        const allocatedDeductions = totalItemsRevenue > 0 ? variableDeductions * (item.revenue / totalItemsRevenue) : 0;
        for (const target of targets) {
          target.closedAmount += item.revenue;
          target.closedUnits += item.quantity;
          increaseQuoteCount(target, "closed", quote.id, seenQuoteCounts);
          if (cost.amount === null || cost.estimated) {
            target.missingCostAmount += item.revenue;
          } else {
            target.knownCostAmount += cost.amount;
            target.grossProfitAmount += item.revenue - cost.amount;
            target.knownContributionAmount += item.revenue - cost.amount - allocatedDeductions;
          }
        }
      }
    }
  }

  const productRows = Array.from(products.values()).map(metricResult);
  const familyRows = Array.from(families.values()).map(metricResult);
  const categoryRows = Array.from(categories.values()).map(metricResult);
  const byAmount = (field: keyof ProductMetric, direction: "asc" | "desc" = "desc") => (a: ProductMetric, b: ProductMetric) => {
    const delta = Number(a[field] ?? 0) - Number(b[field] ?? 0);
    return direction === "desc" ? -delta : delta;
  };
  const byContribution = (direction: "asc" | "desc") => (a: ProductMetric, b: ProductMetric) => {
    const aValue = a.contributionMarginPercent;
    const bValue = b.contributionMarginPercent;
    if (aValue === null) return 1;
    if (bValue === null) return -1;
    return direction === "desc" ? bValue - aValue : aValue - bValue;
  };
  const byGrossMargin = (direction: "asc" | "desc") => (a: ProductMetric, b: ProductMetric) => {
    const aValue = a.grossMarginPercent;
    const bValue = b.grossMarginPercent;
    if (aValue === null) return 1;
    if (bValue === null) return -1;
    return direction === "desc" ? bValue - aValue : aValue - bValue;
  };
  const createRankings = (rows: ProductMetric[]) => {
    const closedRows = rows.filter((item) => item.closedAmount > 0);
    return {
      quotedByValue: rows.filter((item) => item.quotedAmount > 0).sort(byAmount("quotedAmount")).slice(0, 10),
      quotedByQuantity: rows.filter((item) => item.quotedUnits > 0).sort(byAmount("quotedUnits")).slice(0, 10),
      quotedByRecurrence: rows.filter((item) => item.quotedQuoteCount > 0).sort(byAmount("quotedQuoteCount")).slice(0, 10),
      closedByValue: closedRows.slice().sort(byAmount("closedAmount")).slice(0, 10),
      closedByQuantity: closedRows.filter((item) => item.closedUnits > 0).sort(byAmount("closedUnits")).slice(0, 10),
      closedByRecurrence: closedRows.filter((item) => item.closedQuoteCount > 0).sort(byAmount("closedQuoteCount")).slice(0, 10),
      lostByValue: rows.filter((item) => item.lostAmount > 0).sort(byAmount("lostAmount")).slice(0, 10),
      lostByQuantity: rows.filter((item) => item.lostUnits > 0).sort(byAmount("lostUnits")).slice(0, 10),
      lostByRecurrence: rows.filter((item) => item.lostQuoteCount > 0).sort(byAmount("lostQuoteCount")).slice(0, 10),
      highestGrossMargin: closedRows.filter((item) => item.grossMarginPercent !== null).sort(byGrossMargin("desc")).slice(0, 10),
      lowestGrossMargin: closedRows.filter((item) => item.grossMarginPercent !== null).sort(byGrossMargin("asc")).slice(0, 10),
      highestContribution: closedRows.filter((item) => item.financialSharePercent !== null).sort(byFinancialShare("desc")).slice(0, 10),
      lowestContribution: closedRows.filter((item) => item.financialSharePercent !== null).sort(byFinancialShare("asc")).slice(0, 10),
      highestQuantity: closedRows.filter((item) => item.closedUnits > 0).sort(byAmount("closedUnits")).slice(0, 10),
      lowestQuantity: closedRows.filter((item) => item.closedUnits > 0).sort(byAmount("closedUnits", "asc")).slice(0, 10),
    };
  };

  const withFinancialShare = (rows: ProductMetric[]) => {
    const totalClosedAmount = rows.reduce((sum, item) => sum + item.closedAmount, 0);
    return rows.map((item) => ({
      ...item,
      financialSharePercent: item.closedAmount > 0 && totalClosedAmount > 0 ? rounded(item.closedAmount / totalClosedAmount * 100) : null,
    }));
  };
  const byFinancialShare = (direction: "asc" | "desc") => (a: ProductMetric, b: ProductMetric) => {
    const aValue = a.financialSharePercent;
    const bValue = b.financialSharePercent;
    if (aValue === null) return 1;
    if (bValue === null) return -1;
    return direction === "desc" ? bValue - aValue : aValue - bValue;
  };

  const productRowsWithShare = withFinancialShare(productRows);
  const familyRowsWithShare = withFinancialShare(familyRows);
  const categoryRowsWithShare = withFinancialShare(categoryRows);

  return {
    products: productRowsWithShare.sort(byAmount("closedAmount")),
    families: familyRowsWithShare.sort(byAmount("closedAmount")),
    categories: categoryRowsWithShare.sort(byAmount("closedAmount")),
    rankings: createRankings(productRowsWithShare),
    familyRankings: createRankings(familyRowsWithShare),
    categoryRankings: createRankings(categoryRowsWithShare),
  };
}
