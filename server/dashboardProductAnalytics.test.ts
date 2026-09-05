import { describe, expect, it } from "vitest";
import { buildDashboardProductAnalytics } from "./dashboardProductAnalytics";

describe("buildDashboardProductAnalytics", () => {
  it("separa orçado, fechado e perdido e calcula contribuição somente para vendas com custo", () => {
    const analytics = buildDashboardProductAnalytics([
      {
        id: 1, status: "approved", createdInPeriod: true, closedInPeriod: true, lostInPeriod: false,
        totalFinal: 300, commissionPercent: 0, commissionPercent2: 0, rtPercent: 0,
        items: [
          { itemNumber: 1, itemData: JSON.stringify({ sku: "A", description: "Produto A", category: "Perfis", qty: 2, unitPrice: 100, totalPrice: 200, custoManual: 50 }) },
          { itemNumber: 2, itemData: JSON.stringify({ sku: "B", description: "Produto B", category: "Painéis", qty: 1, unitPrice: 100, totalPrice: 100, custoManual: 40 }) },
        ],
      },
      {
        id: 2, status: "lost", createdInPeriod: true, closedInPeriod: false, lostInPeriod: true,
        totalFinal: 100,
        items: [{ itemNumber: 1, itemData: JSON.stringify({ sku: "A", description: "Produto A", category: "Perfis", qty: 1, unitPrice: 100, totalPrice: 100 }) }],
      },
    ], { products: [], components: [], accessories: [], revendas: [] });

    const productA = analytics.products.find((item) => item.sku === "A");
    const productB = analytics.products.find((item) => item.sku === "B");
    expect(productA).toMatchObject({ quotedAmount: 300, quotedUnits: 3, closedAmount: 200, closedUnits: 2, lostAmount: 100, lostUnits: 1, contributionAmount: 76 });
    expect(productB).toMatchObject({ quotedAmount: 100, closedAmount: 100, contributionAmount: 48 });
    expect(analytics.rankings.mostQuoted[0]?.sku).toBe("A");
    expect(analytics.rankings.highestGrossMargin[0]?.sku).toBe("B");
    expect(analytics.categoryRankings.mostClosed[0]?.category).toBe("Perfis");
  });

  it("mantém a contribuição indisponível quando o custo do produto fechado não é conhecido", () => {
    const analytics = buildDashboardProductAnalytics([{
      id: 3, status: "approved", createdInPeriod: true, closedInPeriod: true, lostInPeriod: false,
      totalFinal: 100,
      items: [{ itemNumber: 1, itemData: JSON.stringify({ sku: "SEM-CUSTO", description: "Sem custo", category: "Especial", qty: 1, unitPrice: 100, totalPrice: 100 }) }],
    }], { products: [], components: [], accessories: [], revendas: [] });

    expect(analytics.products[0]).toMatchObject({ missingCostAmount: 100, contributionAmount: null, contributionMarginPercent: null });
  });
});
