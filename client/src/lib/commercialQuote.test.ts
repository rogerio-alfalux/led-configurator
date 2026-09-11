import { describe, expect, it } from "vitest";
import { getCommercialQuoteValue, isApprovedOrInvoicedStatus, isNonCommercialQuoteStatus, sumCommercialQuoteValues } from "@shared/commercialQuote";

describe("commercialQuote", () => {
  it("zera a receita exibida de amostra ou manutenção", () => {
    expect(isNonCommercialQuoteStatus("sample")).toBe(true);
    expect(getCommercialQuoteValue("sample", 12500)).toBe(0);
  });

  it("preserva a receita de orçamentos comerciais", () => {
    expect(isNonCommercialQuoteStatus("approved")).toBe(false);
    expect(getCommercialQuoteValue("approved", 12500)).toBe(12500);
  });

  it("exclui amostras e manutenções representadas por status sample de todos os totais", () => {
    expect(sumCommercialQuoteValues([
      { status: "approved", storedValue: 10000 },
      { status: "sample", storedValue: 2500 },
      { status: "invoiced", storedValue: 7000 },
    ])).toBe(17000);
  });

  it("trata faturado como subconjunto de aprovado sem retirar seu valor do orçado", () => {
    expect(isApprovedOrInvoicedStatus("approved")).toBe(true);
    expect(isApprovedOrInvoicedStatus("invoiced")).toBe(true);
    expect(isApprovedOrInvoicedStatus("open")).toBe(false);

    expect(sumCommercialQuoteValues([
      { status: "open", storedValue: 100 },
      { status: "approved", storedValue: 200 },
      { status: "invoiced", storedValue: 300 },
    ])).toBe(600);
  });
});
