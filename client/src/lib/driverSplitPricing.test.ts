import { describe, expect, it } from "vitest";
import { getEditableBodyUnitPrice, resolveDriverSplitCartPricing } from "./driverSplitPricing";

describe("preço de luminária com driver separado", () => {
  it("prioriza o corpo calculado pela API em vez de preço estático zerado", () => {
    expect(resolveDriverSplitCartPricing({
      fallbackUnitPrice: 0,
      unitPriceLuminaria: 480,
      priceWithoutDriver: 960,
      quantity: 2,
      hasDriverLines: true,
    })).toEqual({ unitPrice: 480, totalPrice: 960, priceFromApi: true });
  });

  it("preenche o modal com o valor do corpo quando há driver separado", () => {
    expect(getEditableBodyUnitPrice({ fallbackUnitPrice: 0, unitPriceLuminaria: 480, hasDriverLines: true })).toBe(480);
  });
});
