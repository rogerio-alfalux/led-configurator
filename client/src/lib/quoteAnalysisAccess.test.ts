import { describe, expect, it } from "vitest";
import { canAccessQuoteAnalysis } from "./quoteAnalysisAccess";

describe("canAccessQuoteAnalysis", () => {
  it("autoriza somente o perfil administrativo", () => {
    expect(canAccessQuoteAnalysis({ role: "admin" })).toBe(true);
    expect(canAccessQuoteAnalysis({ role: "custos" })).toBe(false);
    expect(canAccessQuoteAnalysis({ role: "gerente" })).toBe(false);
    expect(canAccessQuoteAnalysis({ role: "vendedor" })).toBe(false);
    expect(canAccessQuoteAnalysis(null)).toBe(false);
  });
});
