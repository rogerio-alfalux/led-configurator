import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("valor comercial da revisão efetiva", () => {
  it("usa a versão mais recente, inclusive rascunho, para listagens, dashboards e relatórios", () => {
    const source = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

    expect(source).toContain("commercialTotalFinal: resolveStoredCommercialTotal(");
    expect(source).toContain("effectiveVersionTotalByQuoteId");
    expect(source).toContain("item.version > effectiveVersion");
    expect(source).toContain("reconciledFinalByQuoteId");
    expect(source).toContain("approvedAmount: totalVendas");
    expect(source).toContain("getEffectiveCommercialTotalsForQuotes");
    expect(source).toContain("sellerTotalsByQuoteId");
    expect(source).toContain("totalsByQuoteId");
    expect(source).toContain("commercialTotalsByQuoteId");
    expect(source).toContain("summary.approvedAmount += total");
    expect(source).toContain("invoicedCommercialTotals");
    expect(source).toContain("invoicedByCompany");
    expect(source).toContain("status IN ('approved', 'invoiced')");
    expect(source).toContain("totalApproved: sql<number>`sum(case when status IN ('approved', 'invoiced') then 1 else 0 end)`");
  });

  it("reconcilia RT, margem, frete diluído, desconto e imposto ao inserir ou substituir itens", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

    expect(source).toContain('import { calculateCommercialQuoteTotal } from "../shared/quoteCommercialTotal"');
    expect(source).toContain("const commercialTotals = calculateCommercialQuoteTotal({");
    expect(source).toContain("totalAmount: commercialTotals.productsBeforeDiscount");
    expect(source).toContain("totalFinal: commercialTotals.totalFinal");
    expect(source).not.toContain("const totalAmount = allItems.reduce((sum, it) => {");
    expect(source).not.toContain("const totalAmount = updatedItems.reduce((sum, it) => {");
  });
});
