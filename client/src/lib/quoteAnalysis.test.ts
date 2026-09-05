import { describe, expect, it } from "vitest";
import {
  buildQuoteAnalysis,
  getQuoteParticipationPercent,
  sortQuoteAnalysisItems,
} from "./quoteAnalysis";

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
    expect(analysis.items[0]).toMatchObject({ itemNumber: 1, quantity: 2, unitRevenue: 400, revenue: 800, cost: 400, grossProfit: 400 });
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
    expect(analysis.contributionMargin).toBe(506);
    expect(analysis.contributionMarginPercent).toBeCloseTo(42.166, 2);
    expect(analysis.fixedCostCoveragePercent).toBeCloseTo(0.0337, 3);
    expect(analysis.fixedCostAmountRemaining).toBe(1_499_494);
  });

  it("prioriza fotos manuais e recupera a foto vigente do catálogo quando o item salvo não contém imagem", () => {
    const analysis = buildQuoteAnalysis({
      quote: { totalFinal: 300, totalAmount: 300 },
      items: [
        { itemNumber: 1, itemData: { sku: "LDP-4910.120.70P", description: "BAGEO P D1 Ø1200MM 86W 3000K", qty: 1, unitPrice: 100, totalPrice: 100, photoUrl: null } },
        { itemNumber: 2, itemData: { sku: "ESP", description: "Item Especial", qty: 1, unitPrice: 200, totalPrice: 200, photoUrl: "https://manual.example/foto.jpg", specialPhotoUrl: "https://manual.example/foto.jpg" } },
      ],
      photoCandidates: [{ sku: "LDP-4910.120.70P", name: "BAGEO P D1 Ø1200MM 86W 3000K", fotoUrl: "https://api.example/bageo.jpg" }],
    });

    expect(analysis.items.find((item) => item.itemNumber === 1)?.photoUrl).toBe("https://api.example/bageo.jpg");
    expect(analysis.items.find((item) => item.itemNumber === 2)?.photoUrl).toBe("https://manual.example/foto.jpg");
  });

  it("substitui a foto histórica de componente pela foto vigente do catálogo", () => {
    const analysis = buildQuoteAnalysis({
      quote: { totalFinal: 462, totalAmount: 462 },
      items: [{
        itemNumber: 2,
        itemData: {
          sku: "EQ00346",
          description: "LED DRIVER XITANIUM 19W 200-350MA 30-54VDC DS 230V",
          qty: 3,
          unitPrice: 154,
          totalPrice: 462,
          photoUrl: "https://d36hbw14aib5lz.cloudfront.net/foto-expirada.jpg?Expires=1",
        },
      }],
      photoCandidates: [{
        sku: "EQ00346",
        name: "LED DRIVER XITANIUM 19W 200-350MA 30-54VDC DS 230V",
        fotoUrl: "https://d36hbw14aib5lz.cloudfront.net/foto-vigente.jpg?Expires=9999999999",
      }],
    });

    expect(analysis.items[0]?.photoUrl).toBe("https://d36hbw14aib5lz.cloudfront.net/foto-vigente.jpg?Expires=9999999999");
  });

  it("reordena somente a visualização por valor, quantidade e margem sem modificar a ordem-base", () => {
    const analysis = buildQuoteAnalysis({
      quote: { totalFinal: 1_800, totalAmount: 1_800 },
      items: [
        { itemNumber: 1, itemData: { sku: "A", description: "Item A", qty: 2, unitPrice: 400, totalPrice: 800, photoUrl: null } },
        { itemNumber: 2, itemData: { sku: "B", description: "Item B", qty: 1, unitPrice: 400, totalPrice: 400, photoUrl: null } },
        { itemNumber: 3, itemData: { sku: "C", description: "Item C", qty: 4, unitPrice: 150, totalPrice: 600, photoUrl: null } },
      ],
      costItems: [
        { itemNumber: 1, subtotal: 400, source: "api" },
        { itemNumber: 2, subtotal: 100, source: "api" },
        { itemNumber: 3, subtotal: 300, source: "especial_sem_preco" },
      ],
    });

    expect(sortQuoteAnalysisItems(analysis.items, "valueAsc").map((item) => item.itemNumber)).toEqual([2, 3, 1]);
    expect(sortQuoteAnalysisItems(analysis.items, "quantityDesc").map((item) => item.itemNumber)).toEqual([3, 1, 2]);
    expect(sortQuoteAnalysisItems(analysis.items, "marginDesc").map((item) => item.itemNumber)).toEqual([2, 1, 3]);
    expect(sortQuoteAnalysisItems(analysis.items, "marginAsc").map((item) => item.itemNumber)).toEqual([1, 2, 3]);
    expect(analysis.items.map((item) => item.itemNumber)).toEqual([1, 3, 2]);
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
    expect(analysis.contributionMargin).toBeNull();
    expect(analysis.fixedCostCoveragePercent).toBeNull();
  });
});
