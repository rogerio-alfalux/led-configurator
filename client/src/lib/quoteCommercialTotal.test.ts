import { describe, expect, it } from "vitest";
import { calculateCommercialQuoteTotal } from "@shared/quoteCommercialTotal";

describe("calculateCommercialQuoteTotal", () => {
  it("inclui subitens, RT, margem, desconto, frete e imposto uma única vez", () => {
    const totals = calculateCommercialQuoteTotal({
      rtPercent: 0.05,
      marginPercent: 0.06,
      discountPercent: 0.1,
      freteValue: 100,
      freteIncluded: false,
      difalEnabled: true,
      combinedTaxRate: 10,
    }, [{
      category: "Painéis",
      qty: 1,
      totalPrice: 1_000,
      accessories: [{ unitPrice: 50, qty: 1 }],
    }]);

    expect(totals.productsBeforeDiscount).toBe(1175.81);
    expect(totals.productsAfterDiscount).toBe(1058.23);
    expect(totals.totalFinal).toBe(1286.92);
  });

  it("mantém o corpo e o driver como partes do mesmo total sem duplicá-los", () => {
    const totals = calculateCommercialQuoteTotal({}, [{
      category: "Painéis",
      qty: 10,
      totalPrice: 1_540,
      priceWithoutDriver: 1_000,
      unitPriceLuminaria: 100,
      driverLines: [{ driverQty: 10, driverUnitPrice: 54, driverTotalPrice: 540 }],
    }]);

    expect(totals.totalFinal).toBe(1540);
  });

  it("multiplica o preço do driver pela quantidade de luminárias quando a linha legada traz uma unidade", () => {
    const totals = calculateCommercialQuoteTotal({}, [{
      category: "Painéis",
      qty: 3,
      totalPrice: 330,
      priceWithoutDriver: 300,
      unitPriceLuminaria: 100,
      driverLines: [{ driverQty: 1, driverUnitPrice: 10 }],
    }]);

    expect(totals.totalFinal).toBe(330);
  });

  it("zera receitas de amostra, mesmo com itens históricos preenchidos", () => {
    expect(calculateCommercialQuoteTotal({ status: "sample" }, [{ totalPrice: 50_000 }]).totalFinal).toBe(0);
  });
});
