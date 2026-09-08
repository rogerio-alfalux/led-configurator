import { describe, expect, it } from "vitest";
import { formatCommercialQuoteNumberInput, isCommercialQuoteNumber } from "@shared/quoteNumberFormat";

describe("formato comercial do número de orçamento", () => {
  it("aceita exclusivamente o padrão xx.xxxx-xx", () => {
    expect(isCommercialQuoteNumber("04.0432-26")).toBe(true);
    expect(isCommercialQuoteNumber("4.0432-26")).toBe(false);
    expect(isCommercialQuoteNumber("04-0432-26")).toBe(false);
    expect(isCommercialQuoteNumber("04043226")).toBe(false);
    expect(isCommercialQuoteNumber("ORC-04.0432-26")).toBe(false);
  });

  it("insere ponto e hífen enquanto o usuário digita", () => {
    expect(formatCommercialQuoteNumberInput("04043226")).toBe("04.0432-26");
    expect(formatCommercialQuoteNumberInput("04.0432-26abc")).toBe("04.0432-26");
    expect(formatCommercialQuoteNumberInput("0404")).toBe("04.04");
  });
});
