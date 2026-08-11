import { describe, expect, it } from "vitest";
import { isMainReportCurrencyColumn, isMainReportPercentColumn } from "./salesReportGenerator";

describe("formatos numéricos do Relatório Mensal de Vendas", () => {
  it("mantém valores em reais nas colunas Valor Final, Comissão e RT", () => {
    expect([7, 9, 11].every(isMainReportCurrencyColumn)).toBe(true);
    expect([6, 8, 10].some(isMainReportCurrencyColumn)).toBe(false);
  });

  it("mantém percentuais somente nas colunas % Comissão e % RT", () => {
    expect([8, 10].every(isMainReportPercentColumn)).toBe(true);
    expect([7, 9, 11].some(isMainReportPercentColumn)).toBe(false);
  });
});
