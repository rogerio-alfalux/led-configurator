import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Meus Orçamentos: valor comercial reconciliado", () => {
  it("prefere o total da revisão vigente nos cartões, totais e exportação", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Quotes.tsx"), "utf8");

    expect(source).toContain("commercialTotalFinal");
    expect(source).toContain("const getQuoteCustomerTotal");
    expect(source).toContain("totalFinal: getQuoteCustomerTotal(quote)");
    expect(source).toContain("formatBRL(getQuoteCustomerTotal(q))");
  });
});
