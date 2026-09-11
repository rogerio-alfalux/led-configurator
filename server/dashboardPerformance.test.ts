import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("carregamento do Dashboard gerencial", () => {
  const source = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

  it("executa agregados, custos adicionais e dados do período em paralelo", () => {
    expect(source).toContain("const [\n    periodTotalsRows,");
    expect(source).toContain("getTotalAdditionalCostsForPeriod(year, month, dateFrom, dateTo)");
    expect(source).toContain("const [allItems, [apiProducts, apiCompResult, apiAcessorios, apiRevendas]] = await Promise.all");
    expect(source).toContain("const allItemsPromise");
  });
});
