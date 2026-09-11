import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Meus Orçamentos: hierarquia entre aprovados e faturados", () => {
  it("inclui faturados nos aprovados e mantém a base total de valor orçado", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Quotes.tsx"), "utf8");

    expect(source).toContain("isApprovedOrInvoicedStatus(q.status)");
    expect(source).toContain('label: "Aprovados (incl. faturados)"');
    expect(source).toContain('label: "Valor Orçado"');
    expect(source).toContain("const totalValue = commercialRows.reduce");
  });
});
