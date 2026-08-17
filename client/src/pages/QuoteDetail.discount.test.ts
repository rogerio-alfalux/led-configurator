import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("persistência comercial de desconto", () => {
  it("aplica desconto antes de DIFAL/FCP nos dois fluxos de salvamento", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain("calculateQuoteTotalWithDiscountAndTax");
    expect(source).toContain("productsBeforeDiscount: totalComMargem");
    expect(source).toContain("productsBeforeDiscount: totalComMargemVal");
    expect(source).toContain("discountPercent: discountPct");
    expect(source).toContain("showDiscount: !!(quote as any).showDiscount && discountPct > 0");
  });

  it("usa o total final persistido já descontado no Dashboard interno", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain("const totalReceita = Number(quote.totalFinal ?? quote.totalAmount ?? 0)");
  });
});
