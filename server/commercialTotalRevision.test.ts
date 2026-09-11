import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("valor comercial da revisão efetiva", () => {
  it("usa a versão mais recente, inclusive rascunho, para listagens, dashboards e relatórios", () => {
    const source = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

    expect(source).toContain("commercialTotalFinal: recalculated.totalFinal");
    expect(source).toContain("item.version > effectiveVersion");
    expect(source).toContain("reconciledFinalByQuoteId");
    expect(source).toContain("approvedAmount: totalVendas");
    expect(source).toContain("getEffectiveCommercialTotalsForQuotes");
    expect(source).toContain("sellerTotalsByQuoteId");
    expect(source).toContain("totalsByQuoteId");
    expect(source).toContain("commercialTotalsByQuoteId");
    expect(source).toContain("summary.approvedAmount += total");
  });
});
