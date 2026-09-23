import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("relatório mensal de vendas: período de aprovados", () => {
  it("mantém faturados somente quando aprovação e faturamento ocorreram no mês exportado", () => {
    const source = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

    expect(source).toContain("Faturados são incluídos somente quando aprovação e faturamento pertencem ao");
    expect(source).toContain("status IN ('approved', 'invoiced')");
    expect(source).toContain("status != 'invoiced'");
    expect(source).toContain("YEAR(DATE_SUB(invoicedAt, INTERVAL 3 HOUR)) = ${year}");
    expect(source).toContain("MONTH(DATE_SUB(invoicedAt, INTERVAL 3 HOUR)) = ${month}");
  });
});
