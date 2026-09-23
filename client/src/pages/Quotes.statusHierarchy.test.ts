import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Meus Orçamentos: hierarquia entre aprovados e faturados", () => {
  it("inclui faturados nos aprovados e apresenta quantidade com valor por status", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Quotes.tsx"), "utf8");

    expect(source).toContain("isApprovedOrInvoicedStatus(q.status)");
    expect(source).toContain('label: "Aprovados (incl. faturados)"');
    expect(source).toContain("const totalValue = commercialRows.reduce");
    expect(source).toContain("const openValue = commercialRows.filter");
    expect(source).toContain("const lostValue = commercialRows.filter");
    expect(source).toContain("quantity: stats.total, amount: formatBRL(stats.totalValue)");
    expect(source).toContain("quantity: stats.open, amount: formatBRL(stats.openValue)");
    expect(source).toContain("quantity: stats.approved, amount: formatBRL(stats.approvedValue)");
    expect(source).toContain("quantity: stats.lost, amount: formatBRL(stats.lostValue)");
    expect(source).toContain("quantity: stats.invoiced, amount: formatBRL(stats.invoicedValue)");
    expect(source).not.toContain('id: "listedValue"');
  });

  it("exige os dois marcos no período aprovado e os exibe separadamente em faturados", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Quotes.tsx"), "utf8");

    expect(source).toContain('status === "approved" && quote.status === "invoiced" && (dateFrom || dateTo)');
    expect(source).toContain("isDateWithinSelectedRange(quote.approvedAt) && isDateWithinSelectedRange(quote.invoicedAt)");
    expect(source).toContain("Aprovado em {q.approvedAt ? toBrasiliaDateTimeShort(q.approvedAt) : \"—\"}");
    expect(source).toContain("Faturado em {q.invoicedAt ? toBrasiliaDateTimeShort(q.invoicedAt) : \"—\"}");
  });
});
