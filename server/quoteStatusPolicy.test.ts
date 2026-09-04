import { describe, expect, it } from "vitest";
import { getQuoteStatusAuthorizationError } from "./quoteStatusPolicy";

describe("getQuoteStatusAuthorizationError", () => {
  it("permite apenas a responsável nominal faturar orçamento já aprovado", () => {
    expect(getQuoteStatusAuthorizationError({
      targetStatus: "invoiced", currentStatus: "approved", canEditStatus: false, canInvoiceAnyQuote: true,
    })).toBeNull();
  });

  it("não deixa a permissão de faturar alterar os demais status", () => {
    expect(getQuoteStatusAuthorizationError({
      targetStatus: "cancelled", currentStatus: "approved", canEditStatus: false, canInvoiceAnyQuote: true,
    })).toBe("Você não tem permissão para alterar o status deste orçamento.");
  });

  it("preserva a obrigatoriedade de aprovação antes do faturamento", () => {
    expect(getQuoteStatusAuthorizationError({
      targetStatus: "invoiced", currentStatus: "open", canEditStatus: true, canInvoiceAnyQuote: true,
    })).toBe("O status 'Faturado' só pode ser definido a partir de um pedido fechado (Aprovado).");
  });

  it("permite ao usuário autorizado corrigir a data mantendo o orçamento faturado", () => {
    expect(getQuoteStatusAuthorizationError({
      targetStatus: "invoiced", currentStatus: "invoiced", canEditStatus: false, canInvoiceAnyQuote: true,
    })).toBeNull();
  });
});
