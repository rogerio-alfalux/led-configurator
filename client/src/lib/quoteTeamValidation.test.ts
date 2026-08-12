import { describe, expect, it } from "vitest";
import { getQuoteTeamValidationError, isSellerRequiredForQuote } from "./quoteTeamValidation";

describe("validação da equipe comercial no salvamento", () => {
  it("permite assistente salvar com seu próprio cadastro, mesmo sem vendedor selecionado", () => {
    expect(getQuoteTeamValidationError({
      role: "assistente",
      sellerId: "",
      assistantId: "5",
    })).toBeNull();
    expect(isSellerRequiredForQuote("assistente")).toBe(false);
  });

  it("mantém o vendedor obrigatório para os demais perfis", () => {
    expect(getQuoteTeamValidationError({
      role: "user",
      sellerId: "",
      assistantId: "5",
    })).toBe("Selecione o Vendedor 1.");
    expect(isSellerRequiredForQuote("vendedor")).toBe(true);
  });

  it("mantém o assistente comercial obrigatório para todo perfil", () => {
    expect(getQuoteTeamValidationError({
      role: "assistente",
      sellerId: "",
      assistantId: "",
    })).toBe("Selecione o Assistente Comercial.");
  });
});
