import { describe, expect, it } from "vitest";
import {
  getCommercialTotalsToRestore,
  getNonCommercialQuoteStatus,
  resolveOriginalCommercialTotals,
} from "@shared/nonCommercialQuoteFinancial";

describe("nonCommercialQuoteFinancial", () => {
  it("preserva os totais originais ao criar a primeira amostra", () => {
    expect(resolveOriginalCommercialTotals({ totalAmount: 1000, totalFinal: 920 })).toEqual({
      totalAmount: 1000,
      totalFinal: 920,
    });
  });

  it("reutiliza os totais originais ao criar manutenção em orçamento já zerado", () => {
    expect(resolveOriginalCommercialTotals(
      { totalAmount: 0, totalFinal: 0 },
      { originalTotalAmount: "1000.00", originalTotalFinal: "920.00" },
    )).toEqual({ totalAmount: 1000, totalFinal: 920 });
  });

  it("restaura valores somente ao cancelar o último pedido sem cobrança", () => {
    const original = { originalTotalAmount: "1000.00", originalTotalFinal: "920.00" };
    expect(getCommercialTotalsToRestore(original, true)).toBeNull();
    expect(getCommercialTotalsToRestore(original, false)).toEqual({ totalAmount: 1000, totalFinal: 920 });
  });

  it("aplica o mesmo regime sem cobrança a amostra e manutenção", () => {
    expect(getNonCommercialQuoteStatus("sample")).toBe("sample");
    expect(getNonCommercialQuoteStatus("maintenance")).toBe("sample");
  });
});
