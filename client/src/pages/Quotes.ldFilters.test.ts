import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("filtros administrativos de origem LD", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/pages/Quotes.tsx"), "utf8");

  it("permite filtrar orçamentos por origem LD e status de envio do PDF", () => {
    expect(source).toContain('const [ldOriginFilter, setLdOriginFilter]');
    expect(source).toContain('const [ldResponseFilter, setLdResponseFilter]');
    expect(source).toContain('ldRequest?.status !== "in_review"');
    expect(source).toContain('ldRequest?.status !== "quote_ready"');
    expect(source).toContain("Somente solicitações LD");
  });

  it("exporta todos os resultados filtrados somente para administradores", () => {
    expect(source).toContain("const exportRows = (filteredAllData?.rows ?? []).filter(matchesClientFilters)");
    expect(source).toContain("if (user.role !== \"admin\") return;");
    expect(source).toContain("generateFilteredQuotesExcel");
    expect(source).toContain("user.role === \"admin\"");
    expect(source).toContain("Exportar Excel");
  });

  it("usa o valor total final persistido como única referência de valor exibido e exportado", () => {
    expect(source).toContain("totalFinal: getStoredCustomerTotal(quote)");
    expect(source).toContain("formatBRL(getStoredCustomerTotal(q))");
  });
});
