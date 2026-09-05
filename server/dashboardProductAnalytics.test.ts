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
    expect(productA?.financialSharePercent).toBeCloseTo(66.67, 2);
    expect(productB?.financialSharePercent).toBeCloseTo(33.33, 2);
    expect(analytics.rankings.quotedByValue[0]?.sku).toBe("A");
    expect(analytics.rankings.quotedByQuantity[0]?.sku).toBe("A");
    expect(analytics.rankings.quotedByRecurrence[0]).toMatchObject({ sku: "A", quotedQuoteCount: 2 });
    expect(analytics.rankings.lostByQuantity[0]?.sku).toBe("A");
    expect(analytics.rankings.lostByRecurrence[0]).toMatchObject({ sku: "A", lostQuoteCount: 1 });
    expect(analytics.rankings.highestGrossMargin[0]?.sku).toBe("B");
    expect(analytics.familyRankings.quotedByValue[0]?.family).toBe("Linha A");
    expect(analytics.categoryRankings.closedByValue[0]?.category).toBe("PERFIS");
    expect(analytics.categoryRankings.highestQuantity[0]?.category).toBe("PERFIS");
    expect(analytics.rankings.highestContribution[0]).toMatchObject({ sku: "A", financialSharePercent: 66.67 });
  });

  it("mantém a contribuição indisponível quando o custo do produto fechado não é conhecido", () => {
    const analytics = buildDashboardProductAnalytics([{
      id: 3, status: "approved", createdInPeriod: true, closedInPeriod: true, lostInPeriod: false,
      totalFinal: 100,
      items: [{ itemNumber: 1, itemData: JSON.stringify({ sku: "SEM-CUSTO", description: "Sem custo", category: "Especial", qty: 1, unitPrice: 100, totalPrice: 100 }) }],
    }], { products: [], components: [], accessories: [], revendas: [] });

    expect(analytics.products[0]).toMatchObject({ missingCostAmount: 100, contributionAmount: null, contributionMarginPercent: null });
    expect(analytics.rankings.highestGrossMargin).toHaveLength(0);
    expect(analytics.rankings.highestContribution[0]).toMatchObject({ sku: "SEM-CUSTO", financialSharePercent: 100 });
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

  it("mantém recorrência coerente entre produto e categoria sem recontar o mesmo orçamento", () => {
    const analytics = buildDashboardProductAnalytics([
      { id: 11, status: "lost", createdInPeriod: false, closedInPeriod: false, lostInPeriod: true, items: [{ itemNumber: 1, itemData: JSON.stringify({ sku: "LUNA", description: "LUNA G LED", category: "Downlights", qty: 1, totalPrice: 100 }) }] },
      { id: 12, status: "lost", createdInPeriod: false, closedInPeriod: false, lostInPeriod: true, items: [{ itemNumber: 1, itemData: JSON.stringify({ sku: "PERFIL-A", description: "PERFIL A", category: "Perfis", qty: 1, totalPrice: 100 }) }, { itemNumber: 2, itemData: JSON.stringify({ sku: "PERFIL-B", description: "PERFIL B", category: "Perfis", qty: 1, totalPrice: 100 }) }] },
      { id: 13, status: "lost", createdInPeriod: false, closedInPeriod: false, lostInPeriod: true, items: [{ itemNumber: 1, itemData: JSON.stringify({ sku: "PERFIL-A", description: "PERFIL A", category: "Perfis", qty: 1, totalPrice: 100 }) }] },
    ], { products: [], components: [], accessories: [], revendas: [] });

    expect(analytics.rankings.lostByRecurrence[0]).toMatchObject({ sku: "PERFIL-A", lostQuoteCount: 2 });
    expect(analytics.categoryRankings.lostByRecurrence[0]).toMatchObject({ category: "Perfis", lostQuoteCount: 2, productVariantCount: 2 });
    expect(analytics.categoryRankings.lostByRecurrence.find((row) => row.category === "Downlights")).toMatchObject({ lostQuoteCount: 1, productVariantCount: 1 });
  });

  it("exclui margem de perfil linear com comprimento legado inválido", () => {
    const analytics = buildDashboardProductAnalytics([{
      id: 6, status: "approved", createdInPeriod: true, closedInPeriod: true, lostInPeriod: false,
      totalFinal: 1_000,
      items: [{ itemNumber: 1, itemData: JSON.stringify({ sku: "LED BAR 45 DA", description: "LED BAR U DA 10W/M 3000K ON/OFF Bivolt 2MM", category: "LED BAR", qty: 1, unitPrice: 1_000, totalPrice: 1_000, ledBarComprimentoTotalMm: 2 }) }],
    }], {
      products: [{ sku: "LED BAR 45 DA", name: "LED BAR 45 DA 10W/M", familia: "LED BAR 45", categoria: "PERFIS", custoCorpoOnoffBivolt: 64.79 }],
      components: [], accessories: [], revendas: [],
    });

    expect(analytics.products[0]).toMatchObject({ missingCostAmount: 1_000, grossMarginPercent: null });
    expect(analytics.rankings.highestGrossMargin).toHaveLength(0);
  });
});
