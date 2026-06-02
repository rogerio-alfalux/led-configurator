import { describe, it, expect } from "vitest";
import { buildComposition } from "./ledEngine";

describe("LLP-6060 BLAZE H — regra de 1 barra IF", () => {
  it("55860mm STRIPLINE 36W — diagnóstico completo", () => {
    const r = buildComposition("LLP-6060", 55860, 36, "220Vac", false, "STRIPLINE");
    console.log("compositionMode:", r.compositionMode);
    console.log("realizedLength:", r.realizedLength);
    r.composition.forEach(c => {
      console.log(`  ${c.quantity}x ${c.sku} ${c.moduleType} ${c.barras}b ${c.length}mm barsPerModule=${c.barsPerModule}`);
    });
    // Apenas para diagnóstico — não falha
    expect(r.compositionMode).toBeDefined();
  });

  it("55860mm STRIPLINE 36W — não deve usar IF de 1 barra (575mm)", () => {
    const r = buildComposition("LLP-6060", 55860, 36, "220Vac", false, "STRIPLINE");
    console.log("compositionMode:", r.compositionMode);
    console.log("composition:", r.composition.map(c => `${c.quantity}x ${c.sku} ${c.moduleType} ${c.barras}b ${c.length}mm`));
    const oneBarIF = r.composition.find(c => c.moduleType === "IF" && c.barras < 2);
    expect(oneBarIF).toBeUndefined();
  });

  it("55860mm STRIPFLEX 36W — não deve usar IF de 1 barra (575mm)", () => {
    const r = buildComposition("LLP-6060", 55860, 36, "220Vac", false, "STRIPFLEX");
    console.log("compositionMode:", r.compositionMode);
    console.log("composition:", r.composition.map(c => `${c.quantity}x ${c.sku} ${c.moduleType} ${c.barras}b ${c.length}mm`));
    const oneBarIF = r.composition.find(c => c.moduleType === "IF" && c.barras < 2);
    expect(oneBarIF).toBeUndefined();
  });

  it("1150mm STRIPLINE 36W — deve usar IN_SINGLE (curto demais para 2x IF de 2 barras)", () => {
    const r = buildComposition("LLP-6060", 1150, 36, "220Vac", false, "STRIPLINE");
    console.log("1150mm compositionMode:", r.compositionMode);
    console.log("1150mm composition:", r.composition.map(c => `${c.quantity}x ${c.sku} ${c.moduleType} ${c.barras}b ${c.length}mm`));
    expect(r.compositionMode).toBe("IN_SINGLE");
  });

  it("2300mm STRIPLINE 36W — deve usar IN_SINGLE pois cabe em 1× IN de 5 barras (2825mm)", () => {
    // Nova regra v1.8: peça única IN é preferível a 2× IF quando cabe no limite de barras
    const r = buildComposition("LLP-6060", 2300, 36, "220Vac", false, "STRIPLINE");
    console.log("2300mm compositionMode:", r.compositionMode);
    console.log("2300mm composition:", r.composition.map(c => `${c.quantity}x ${c.sku} ${c.moduleType} ${c.barras}b ${c.length}mm`));
    expect(r.compositionMode).toBe("IN_SINGLE");
    expect(r.composition.every(c => c.moduleType === "IN")).toBe(true);
  });
});
