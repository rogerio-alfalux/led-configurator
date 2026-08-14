import { describe, expect, it } from "vitest";
import { buildLdDraftQuoteNumber, isLdDraftQuoteNumber } from "@shared/ldDraftQuoteNumber";

describe("numeração provisória de orçamento originado de LD", () => {
  it("cria apenas uma referência interna para a solicitação LD", () => {
    const draftNumber = buildLdDraftQuoteNumber("LD-0002-26", 7);
    expect(draftNumber).toBe("RASCUNHO-LD-LD-0002-26");
    expect(isLdDraftQuoteNumber(draftNumber)).toBe(true);
  });

  it("não confunde número comercial com a referência interna", () => {
    expect(isLdDraftQuoteNumber("33.0127-26")).toBe(false);
    expect(isLdDraftQuoteNumber(undefined)).toBe(false);
  });
});
