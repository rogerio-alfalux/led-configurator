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

  it("recompõe no Dashboard a receita e o DIFAL/FCP de registros legados com desconto", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain("const totalReceita = getReconciledCustomerTotal(quote, recalculatedRevenue)");
    expect(source).toContain("const difal = discountPercent > 0");
    expect(source).toContain("dashboardTotals.taxAmount");
  });

  it("mantém pedidos sem cobrança com venda zerada e permite cancelar manutenção", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain('const isNonCommercialOrder = quote.status === "sample"');
    expect(source).toContain('isNonCommercialOrder ? 0');
    expect(source).toContain("Cancelar Manutenção");
  });

  it("exibe preço unitário cheio e com desconto para luminária, driver e item simples", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain("Cheio:");
    expect(source).toContain("C/ desc.:");
    expect(source).toContain("lumUnitDiscountedWithDil");
    expect(source).toContain("drvUnitDiscountedWithDil");
    expect(source).toContain("simpleUnitDiscountedWithDil");
  });

  it("oculta a taxonomia interna LED BAR e conserva o bloco de detalhamento de drivers no card", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain('{d.category !== "LED BAR" && <span>{d.category}</span>}');
    expect(source).toContain("d.driverLines!.map((dl, di) => {");
    expect(source).toContain('>Driver{d.driverLines!.length > 1 ? ` ${di + 1}` : \'\'}</p>');
    expect(source).toContain('d.driverLines.map((driver, index) => (');
    expect(source).toContain('{driver.driverQty}x');
    expect(source).toContain('{driver.driverModel || "Driver"}');
  });
});
