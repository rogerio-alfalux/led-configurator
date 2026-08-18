import { describe, expect, it } from "vitest";
import { canOpenQuotesFromHome, QUOTES_ROUTE } from "./quotesNavigation";

describe("navegação de orçamentos", () => {
  it("mantém a rota direta de Meus Orçamentos", () => {
    expect(QUOTES_ROUTE).toBe("/orcamentos");
  });

  it("exibe o acesso no cabeçalho somente para usuários autenticados que não são LD convidados", () => {
    expect(canOpenQuotesFromHome(true, false)).toBe(true);
    expect(canOpenQuotesFromHome(false, false)).toBe(false);
    expect(canOpenQuotesFromHome(true, true)).toBe(false);
  });
});
