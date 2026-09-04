import { describe, expect, it } from "vitest";
import { buildQuoteAnalysis, getQuoteParticipationPercent } from "./quoteAnalysis";

describe("buildQuoteAnalysis", () => {
  it("calcula a participação de um orçamento dentro do total filtrado sem dividir por zero", () => {
    expect(getQuoteParticipationPercent(1_000_000, 4_000_000)).toBe(25);
    expect(getQuoteParticipationPercent(0, 4_000_000)).toBeNull();
    expect(getQuoteParticipationPercent(1_000_000, 0)).toBeNull();
  });

  it("calcula participação, custos e margens por item com os descontos já aplicados", () => {
    const analysis = buildQuoteAnalysis({
      quote: {
        totalFinal: 1_200,
        totalAmount: 1_200,
        discountPercent: 0,
        commissionPercent: 0,
        commissionPercent2: 0,
        rtPercent: 0,
      },
      items: [
        { itemNumber: 1, itemData: { sku: "A", description: "Item A", qty: 2, unitPrice: 400, totalPrice: 800, photoUrl: null } },
        { itemNumber: 2, itemData: { sku: "B", description: "Item B", qty: 1, unitPrice: 400, totalPrice: 400, photoUrl: null } },
      ],
      costItems: [
        { itemNumber: 1, subtotal: 400, source: "api" },
        { itemNumber: 2, subtotal: 100, source: "api" },
      ],
      additionalCosts: [{ valor: 50 }],
    });

    expect(analysis.items).toHaveLength(2);
    expect(analysis.items[0]).toMatchObject({ itemNumber: 1, revenue: 800, cost: 400, grossProfit: 400 });
    expect(analysis.items[0]?.quoteSharePercent).toBeCloseTo(66.666, 2);
    expect(analysis.highestValueItem?.itemNumber).toBe(1);
    expect(analysis.lowestValueItem?.itemNumber).toBe(2);
    expect(analysis.highestMarginItem?.itemNumber).toBe(2);
    expect(analysis.lowestMarginItem?.itemNumber).toBe(1);
    expect(analysis.productCost).toBe(500);
    expect(analysis.additionalCost).toBe(50);
    expect(analysis.grossProfit).toBe(700);
    expect(analysis.deductions.standardTaxes).toBe(144);
    expect(analysis.netProfit).toBe(506);
  });

  it("deixa lucro consolidado indisponível quando qualquer item está sem custo confirmado", () => {
    const analysis = buildQuoteAnalysis({
      quote: { totalFinal: 100, totalAmount: 100 },
      items: [{ itemNumber: 1, itemData: { sku: "ESP", description: "Especial", qty: 1, unitPrice: 100, totalPrice: 100, photoUrl: null } }],
      costItems: [{ itemNumber: 1, subtotal: 0, source: "especial_sem_preco" }],
    });

    expect(analysis.missingCostItemCount).toBe(1);
    expect(analysis.grossProfit).toBeNull();
    expect(analysis.netProfit).toBeNull();
  });
});
