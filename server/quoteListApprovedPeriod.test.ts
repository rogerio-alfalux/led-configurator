import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("lista de orçamentos: filtro aprovado por período", () => {
  it("inclui faturados somente se aprovação e faturamento estiverem no intervalo", () => {
    const source = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

    expect(source).toContain('conditions.push(inArray(quotes.status, ["approved", "invoiced"]));');
    expect(source).toContain("const approvedDateField = sql`COALESCE(${quotes.approvedAt}, ${quotes.invoicedAt}, ${quotes.createdAt})`");
    expect(source).toContain("quotes.status} != 'invoiced' OR DATE(DATE_SUB(${quotes.invoicedAt}, INTERVAL 3 HOUR)) >= ${opts.dateFrom}");
    expect(source).toContain("quotes.status} != 'invoiced' OR DATE(DATE_SUB(${quotes.invoicedAt}, INTERVAL 3 HOUR)) <= ${opts.dateTo}");
  });
});
