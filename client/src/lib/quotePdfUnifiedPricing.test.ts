import { describe, expect, it } from "vitest";
import type { CartItemData } from "./cartTypes";
import { getUnifiedPdfPrices, getUnifiedPdfRawItemTotal, hasUnifiedPdfComponents } from "./quotePdfUnifiedPricing";

function makeItem(overrides: Partial<CartItemData> = {}): CartItemData {
  return {
    category: "Downlight",
    sku: "TEST-UNIFIED-PDF",
    description: "Produto para PDF unificado",
    qty: 1,
    unitPrice: 306.48,
    unitPriceLuminaria: 306.48,
    priceWithoutDriver: 306.48,
    totalPrice: 360.48,
    photoUrl: null,
    driverLines: [{
      driverCode: "EQ00347",
      driverModel: "Driver 44W",
      driverQty: 1,
      driverUnitPrice: 54,
      driverTotalPrice: 54,
    }],
    ...overrides,
  };
}

describe("valores unificados opcionais no PDF", () => {
  it("reproduz o exemplo de R$ 306,48 + R$ 54,00 = R$ 360,48", () => {
    const item = makeItem();
    expect(hasUnifiedPdfComponents(item)).toBe(true);
    expect(getUnifiedPdfRawItemTotal(item)).toBeCloseTo(360.48, 8);
    expect(getUnifiedPdfPrices(360.48, 1).unitWithIpi).toBeCloseTo(360.48, 8);
  });

  it("soma todos os drivers e acessórios antes de dividir pela quantidade do produto", () => {
    const item = makeItem({
      qty: 2,
      unitPrice: 100,
      unitPriceLuminaria: 100,
      priceWithoutDriver: 200,
      totalPrice: 350,
      driverLines: [
        { driverCode: "EQ-A", driverModel: "Driver A", driverQty: 2, driverUnitPrice: 50, driverTotalPrice: 100 },
        { driverCode: "EQ-B", driverModel: "Driver B", driverQty: 2, driverUnitPrice: 25, driverTotalPrice: 50 },
      ],
      accessories: [
        { codigo: "AC-A", descricao: "Acessório A", qty: 1, unitPrice: 20 },
        { codigo: "AC-B", descricao: "Acessório B", qty: 2, unitPrice: 5 },
      ],
    });

    // Corpo 200 + drivers 150 + acessórios (20 + 10) × 2 = 410.
    const rawTotal = getUnifiedPdfRawItemTotal(item);
    expect(rawTotal).toBeCloseTo(410, 8);
    expect(getUnifiedPdfPrices(rawTotal, item.qty).unitWithIpi).toBeCloseTo(205, 8);
  });

  it("retira o IPI somente depois de somar o montante unificado", () => {
    const prices = getUnifiedPdfPrices(360.48, 1);
    expect(prices.unitWithIpi).toBeCloseTo(360.48, 8);
    expect(prices.unitWithoutIpi).toBeCloseTo(360.48 / 1.0975, 8);
    expect(prices.total).toBeCloseTo(360.48, 8);
  });

  it("mantém itens sem drivers nem acessórios fora do modo de unificação", () => {
    const item = makeItem({ driverLines: undefined, accessories: undefined, totalPrice: 306.48 });
    expect(hasUnifiedPdfComponents(item)).toBe(false);
  });
});
