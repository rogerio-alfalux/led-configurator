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
    ], {
      products: [{ sku: "A", name: "Produto A", familia: "Linha A", categoria: "PERFIS" }],
      components: [], accessories: [], revendas: [],
    });

    const productA = analytics.products.find((item) => item.sku === "A");
    const productB = analytics.products.find((item) => item.sku === "B");
    expect(productA).toMatchObject({ quotedAmount: 300, quotedUnits: 3, closedAmount: 200, closedUnits: 2, lostAmount: 100, lostUnits: 1, contributionAmount: 76 });
    expect(productB).toMatchObject({ quotedAmount: 100, closedAmount: 100, contributionAmount: 48 });
    expect(analytics.rankings.quotedByValue[0]?.sku).toBe("A");
    expect(analytics.rankings.quotedByQuantity[0]?.sku).toBe("A");
    expect(analytics.rankings.quotedByRecurrence[0]).toMatchObject({ sku: "A", quotedQuoteCount: 2 });
    expect(analytics.rankings.lostByQuantity[0]?.sku).toBe("A");
    expect(analytics.rankings.lostByRecurrence[0]).toMatchObject({ sku: "A", lostQuoteCount: 1 });
    expect(analytics.rankings.highestGrossMargin[0]?.sku).toBe("B");
    expect(analytics.familyRankings.quotedByValue[0]?.family).toBe("Linha A");
    expect(analytics.categoryRankings.closedByValue[0]?.category).toBe("PERFIS");
    expect(analytics.categoryRankings.highestQuantity[0]?.category).toBe("PERFIS");
  });

  it("mantém a contribuição indisponível quando o custo do produto fechado não é conhecido", () => {
    const analytics = buildDashboardProductAnalytics([{
      id: 3, status: "approved", createdInPeriod: true, closedInPeriod: true, lostInPeriod: false,
      totalFinal: 100,
      items: [{ itemNumber: 1, itemData: JSON.stringify({ sku: "SEM-CUSTO", description: "Sem custo", category: "Especial", qty: 1, unitPrice: 100, totalPrice: 100 }) }],
    }], { products: [], components: [], accessories: [], revendas: [] });

    expect(analytics.products[0]).toMatchObject({ missingCostAmount: 100, contributionAmount: null, contributionMarginPercent: null });
  });

  it("trata margem negativa como perda somente quando o custo é confirmado", () => {
    const analytics = buildDashboardProductAnalytics([{
      id: 4, status: "approved", createdInPeriod: true, closedInPeriod: true, lostInPeriod: false,
      totalFinal: 100,
      items: [{ itemNumber: 1, itemData: JSON.stringify({ sku: "C", description: "Produto C", category: "Painéis", qty: 1, unitPrice: 100, totalPrice: 100, custoManual: 150 }) }],
    }], { products: [], components: [], accessories: [], revendas: [] });

    expect(analytics.rankings.lowestGrossMargin[0]).toMatchObject({ sku: "C", knownCostAmount: 150, grossMarginPercent: -50 });
  });

  it("separa família e categoria usando a variante oficial da API", () => {
    const analytics = buildDashboardProductAnalytics([{
      id: 5, status: "approved", createdInPeriod: true, closedInPeriod: true, lostInPeriod: false,
      totalFinal: 100,
      items: [{ itemNumber: 1, itemData: JSON.stringify({ sku: "LDP-4910", description: "BAGEO SINUOSA P D1 20W/M 3000K", category: "BAGEO", qty: 1, unitPrice: 100, totalPrice: 100, custoManual: 50 }) }],
    }], {
      products: [{ sku: "LDP-4910", name: "BAGEO SINUOSA P D1 20W/M", familia: "BAGEO", categoria: "PERFIS" }],
      components: [], accessories: [], revendas: [],
    });

    expect(analytics.familyRankings.closedByValue[0]).toMatchObject({ family: "BAGEO" });
    expect(analytics.categoryRankings.closedByValue[0]).toMatchObject({ category: "PERFIS" });
  });
});
