import { describe, expect, it } from "vitest";
import { calculateCommercialProductsBeforeDiscount, calculateCommercialQuoteTotal, deriveCommercialItemBaseFromStoredTotal, resolveStoredCommercialTotal } from "@shared/quoteCommercialTotal";

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

  it("preserva preço e quantidade editados de acessórios como total do pedido", () => {
    const totals = calculateCommercialQuoteTotal({}, [{
      category: "Perfis",
      qty: 12,
      totalPrice: 1_200,
      accessories: [{ unitPrice: 37.5, qty: 3, quantityScope: "order_total" }],
    }]);

    // O acessório foi editado para três unidades no pedido inteiro, não por luminária.
    expect(totals.totalFinal).toBe(1_312.5);
  });

  it("mantém a multiplicação por luminária para acessórios legados por unidade", () => {
    const totals = calculateCommercialQuoteTotal({}, [{
      category: "Perfis",
      qty: 3,
      totalPrice: 300,
      accessories: [{ unitPrice: 20, qty: 2, quantityScope: "per_unit" }],
    }]);

    expect(totals.totalFinal).toBe(420);
  });

  it("aplica RT e margem globais ao conjunto de luminária e driver", () => {
    const totals = calculateCommercialQuoteTotal({
      rtPercent: 0.10,
      marginPercent: 0.05,
    }, [{
      category: "Perfis",
      qty: 2,
      totalPrice: 765.10,
      priceWithoutDriver: 657.10,
      unitPriceLuminaria: 328.55,
      driverLines: [{ driverQty: 2, driverUnitPrice: 54, driverTotalPrice: 108 }],
    }]);

    // R$ 765,10 ÷ (1 − 10%) ÷ (1 − 5%) = R$ 894,85; R$ 447,43 por conjunto.
    expect(totals.totalFinal).toBe(894.85);
    expect(totals.totalFinal / 2).toBeCloseTo(447.43, 2);
  });

  it("inclui frete diluído antes de RT e margem, também ao salvar itens", () => {
    const productsBeforeDiscount = calculateCommercialProductsBeforeDiscount({
      rtPercent: 0,
      marginPercent: 0.07,
      freteValue: 3857,
      freteIncluded: true,
    }, 103_773.55);

    expect(productsBeforeDiscount).toBe(115_731.77);
    expect(calculateCommercialQuoteTotal({
      marginPercent: 0.07,
      freteValue: 3857,
      freteIncluded: true,
    }, [{ totalPrice: 103_773.55 }]).totalFinal).toBe(productsBeforeDiscount);
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

describe("deriveCommercialItemBaseFromStoredTotal", () => {
  it("mantém o total histórico ao reabrir um orçamento com margem já embutida", () => {
    const base = deriveCommercialItemBaseFromStoredTotal({ marginPercent: 0.05 }, 151_482.24);
    expect(base).toBe(143_908.13);
    expect(calculateCommercialQuoteTotal({ marginPercent: 0.05 }, [{ totalPrice: base }]).totalFinal).toBe(151_482.24);
  });

  it("reverte RT, margem, desconto, frete e imposto na ordem inversa", () => {
    const fields = {
      rtPercent: 0.05,
      marginPercent: 0.1,
      discountPercent: 0.08,
      freteValue: 500,
      freteIncluded: false,
      difalEnabled: true,
      combinedTaxRate: 12,
    };
    const final = calculateCommercialQuoteTotal(fields, [{ totalPrice: 10_000 }]).totalFinal;
    expect(deriveCommercialItemBaseFromStoredTotal(fields, final)).toBeCloseTo(10_000, 2);
  });
});

describe("resolveStoredCommercialTotal", () => {
  it("preserva o total soberano da revisão efetiva do DIGICON", () => {
    expect(resolveStoredCommercialTotal(67_855.23, 72_171.38)).toBe(67_855.23);
  });

  it("usa a recomposição apenas quando não há total persistido utilizável", () => {
    expect(resolveStoredCommercialTotal(null, 72_171.38)).toBe(72_171.38);
    expect(resolveStoredCommercialTotal(0, 72_171.38)).toBe(72_171.38);
  });
});
