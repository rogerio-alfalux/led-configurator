import { describe, expect, it } from "vitest";
import { canDuplicateAnyCommercialQuote, canEditOwnDuplicatedQuote, commercialQuoteAccess, shouldBindCommercialQuoteTeam } from "@shared/quoteOwnership";

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

  it("libera assistente com Gerenciar Orçamentos para editar qualquer orçamento", () => {
    expect(shouldBindCommercialQuoteTeam("assistente", true)).toBe(false);
    expect(shouldBindCommercialQuoteTeam("vendedor", true)).toBe(false);
    expect(shouldBindCommercialQuoteTeam("assistente", false)).toBe(true);
    expect(shouldBindCommercialQuoteTeam("vendedor", false)).toBe(true);
  });

  it("libera a duplicação ampla para a equipe comercial, preservando a edição independente somente da cópia", () => {
    expect(canDuplicateAnyCommercialQuote("vendedor")).toBe(true);
    expect(canDuplicateAnyCommercialQuote("assistente")).toBe(true);
    expect(canDuplicateAnyCommercialQuote("user")).toBe(false);
    expect(canEditOwnDuplicatedQuote(7, { createdByUserId: 7, duplicatedFromQuoteId: 42 })).toBe(true);
    expect(canEditOwnDuplicatedQuote(7, { createdByUserId: 7 })).toBe(false);
    expect(canEditOwnDuplicatedQuote(7, { createdByUserId: 8, duplicatedFromQuoteId: 42 })).toBe(false);
  });
});
