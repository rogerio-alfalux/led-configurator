import { describe, expect, it } from "vitest";
import { hasNegativeCommercialPrice, markIntentionalNegativeCommercialPrices } from "@shared/signedCommercialPrice";

describe("signedCommercialPrice", () => {
  it("considera somente campos comerciais, não custo, quantidade, frete ou taxa", () => {
    expect(hasNegativeCommercialPrice({ custoManual: -100, qty: -1, freteValue: -50 })).toBe(false);
    expect(hasNegativeCommercialPrice({ unitPrice: -100 })).toBe(true);
    expect(hasNegativeCommercialPrice({ driverLines: [{ driverTotalPrice: -20 }] })).toBe(true);
    expect(hasNegativeCommercialPrice({ accessories: [{ unitPrice: -5 }] })).toBe(true);
  });

  it("marca o item e seus subitens negativos recebidos em fluxo autorizado", () => {
    const marked = markIntentionalNegativeCommercialPrices({
      unitPrice: -100,
      driverLines: [{ driverUnitPrice: -20 }],
      accessories: [{ unitPrice: -5 }],
    });

    expect(marked.negativePriceManual).toBe(true);
    expect((marked.driverLines as Array<Record<string, unknown>>)[0]).toMatchObject({
      negativePriceManual: true,
      driverPriceManual: true,
    });
    expect((marked.accessories as Array<Record<string, unknown>>)[0]).toMatchObject({ negativePriceManual: true });
  });
});
