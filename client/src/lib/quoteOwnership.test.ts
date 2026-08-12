import { describe, expect, it } from "vitest";
import { commercialQuoteAccess } from "@shared/quoteOwnership";

describe("commercialQuoteAccess", () => {
  const quote = { seller1Email: "vendedor@grupoalfalux.com.br", assistantEmail: "camille@grupoalfalux.com.br" };

  it("permite vendedor apenas no orçamento em seu próprio nome", () => {
    expect(commercialQuoteAccess("vendedor", "vendedor@grupoalfalux.com.br", quote)).toBe(true);
    expect(commercialQuoteAccess("vendedor", "outro@grupoalfalux.com.br", quote)).toBe(false);
  });

  it("permite assistente apenas no orçamento registrado em seu próprio nome", () => {
    expect(commercialQuoteAccess("assistente", "camille@grupoalfalux.com.br", quote)).toBe(true);
    expect(commercialQuoteAccess("assistente", "beatriz@grupoalfalux.com.br", quote)).toBe(false);
  });

  it("deixa roles não comerciais seguirem para as demais regras do servidor", () => {
    expect(commercialQuoteAccess("admin", "admin@grupoalfalux.com.br", quote)).toBeNull();
  });
});
