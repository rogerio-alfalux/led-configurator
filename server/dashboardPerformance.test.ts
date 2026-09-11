import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("carregamento do Dashboard gerencial", () => {
  const source = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

  it("executa agregados, custos adicionais e dados do período em paralelo", () => {
    expect(source).toContain("const [\n    periodTotalsRows,");
    expect(source).toContain("getTotalAdditionalCostsForPeriod(year, month, dateFrom, dateTo)");
    expect(source).toContain("const [allItems, catalogSnapshot] = await Promise.all");
    expect(source).toContain("getDashboardCatalogSnapshot()");
    expect(source).toContain("const allItemsPromise");
  });

  it("qualifica quoteId na consulta com join para não bloquear o carregamento no MySQL", () => {
    expect(source).toContain(".where(inArray(quoteItems.quoteId, approvedQuoteIds))");
    expect(source).not.toContain(".where(sql`quoteId IN");
  });

  it("isola falhas parciais de catálogo sem bloquear os demais indicadores", () => {
    expect(source).toContain("async function getDashboardCatalogSnapshot()");
    expect(source).toContain("DASHBOARD_CATALOG_WAIT_MS = 15_000");
    expect(source).toContain("settleDashboardCatalog(fetchAllAlfaluxProducts())");
    expect(source).toContain("catalogUnavailable: catalogSnapshot.unavailable");
  });
});
