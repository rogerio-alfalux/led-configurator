import { describe, expect, it } from "vitest";
import { hasQuoteListFilters, DEFAULT_QUOTE_LIST_FILTER_STATE } from "./quoteListFilterState";

describe("estado de filtros de Meus Orçamentos", () => {
  it("não persiste a visualização sem filtros", () => {
    expect(hasQuoteListFilters(DEFAULT_QUOTE_LIST_FILTER_STATE)).toBe(false);
  });

  it("mantém filtros de lista ativos durante a navegação ao detalhe", () => {
    expect(hasQuoteListFilters({
      ...DEFAULT_QUOTE_LIST_FILTER_STATE,
      status: "approved",
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
      datePreset: "month:2026:9",
      page: 2,
    })).toBe(true);
  });
});
