import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveStoredCommercialTotal } from "../shared/quoteCommercialTotal";

describe("relatório mensal de vendas: total final salvo", () => {
  it("mantém o total já entregue mesmo quando uma recomposição posterior diverge", () => {
    expect(resolveStoredCommercialTotal("125446.54", 126655.76)).toBe(125446.54);
  });

  it("usa o total final da revisão vigente no relatório e recalcula apenas em contingência", () => {
    const source = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

    expect(source).toContain("const effectiveVersionTotalByQuoteId = new Map<number, unknown>();");
    expect(source).toContain("effectiveVersionTotalByQuoteId.get(r.id) ?? r.totalFinal");
    expect(source).toContain("const totalFinal = resolveStoredCommercialTotal(");
    expect(source).toContain("totalsByQuoteId.get(r.id)");
  });
});
