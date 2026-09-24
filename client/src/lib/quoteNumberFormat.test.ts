import { describe, expect, it } from "vitest";
import {
  formatCommercialQuoteNumberInput,
  getCommercialQuoteSequence,
  getCommercialSellerPrefix,
  isCommercialQuoteNumber,
  isCommercialQuoteNumberForSeller,
} from "@shared/quoteNumberFormat";

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

  it("reconhece o prefixo de dois dígitos nos códigos explicativos dos vendedores", () => {
    expect(getCommercialSellerPrefix("33.0XXX-26")).toBe("33");
    expect(getCommercialSellerPrefix("35")).toBe("35");
    expect(getCommercialSellerPrefix("sem código")).toBeNull();
  });

  it("aceita a sugestão do vendedor pelo prefixo, não pelo texto explicativo completo", () => {
    expect(isCommercialQuoteNumberForSeller("33.0107-26", "33.0XXX-26")).toBe(true);
    expect(isCommercialQuoteNumberForSeller("04.0483-26", "04.0XXX-26")).toBe(true);
    expect(isCommercialQuoteNumberForSeller("04.0483-26", "33.0XXX-26")).toBe(false);
  });

  it("extrai somente a sequência válida do vendedor e ano selecionados", () => {
    expect(getCommercialQuoteSequence("33.0087-26", "33.0XXX-26", "26")).toBe(87);
    expect(getCommercialQuoteSequence("33.10000-26", "33.0XXX-26", "26")).toBeNull();
    expect(getCommercialQuoteSequence("04.0483-26", "33.0XXX-26", "26")).toBeNull();
    expect(getCommercialQuoteSequence("33.0087-25", "33.0XXX-26", "26")).toBeNull();
  });
});
