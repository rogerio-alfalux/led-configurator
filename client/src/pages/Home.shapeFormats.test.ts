import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const homeSource = readFileSync(fileURLToPath(new URL("./Home.tsx", import.meta.url)), "utf8");
const quoteDetailSource = readFileSync(fileURLToPath(new URL("./QuoteDetail.tsx", import.meta.url)), "utf8");
const factorySource = readFileSync(fileURLToPath(new URL("./FactoryOrderDetail.tsx", import.meta.url)), "utf8");
const cartSource = readFileSync(fileURLToPath(new URL("./Cart.tsx", import.meta.url)), "utf8");
const ldGuestCardsSource = readFileSync(fileURLToPath(new URL("../components/LdGuestCards.tsx", import.meta.url)), "utf8");
const guideSource = readFileSync(fileURLToPath(new URL("../components/ShapeAssemblyGuide.tsx", import.meta.url)), "utf8");

describe("formatos especiais na interface", () => {
  it("repassa os controles de otimização ao motor especial", () => {
    expect(homeSource).toContain("optimizeModuleCount,");
    expect(homeSource).toContain("adjustToLarger,");
    expect(homeSource).toContain("allowMixedIF: profileShape === \"L_SHAPE\" || profileShape === \"U_SHAPE\"");
    expect(homeSource).toContain("onOptimizeModuleCountChange={(value) => { setOptimizeModuleCount(value); setShapeResult(null); }}");
  });

  it("persiste o mapa físico somente nos novos itens calculados", () => {
    expect(homeSource).toContain("profileShape: shapeResult.shape");
    expect(homeSource).toContain("shapeAssemblyEdges: shapeResult.assemblyEdges");
  });

  it("oferece o guia na configuração, no orçamento salvo e na fábrica", () => {
    expect(homeSource).toContain("<ShapeAssemblyGuide result={shapeResult} />");
    expect(quoteDetailSource).toContain("d.shapeAssemblyEdges");
    expect(factorySource).toContain("parsed.shapeAssemblyEdges");
  });

  it("oferece o guia também nos carrinhos interno e de solicitação LD", () => {
    expect(cartSource).toContain("entry.data.shapeAssemblyEdges");
    expect(ldGuestCardsSource).toContain("item.shapeAssemblyEdges");
  });

  it("mantém o guia rolável sem sobreposição e organiza os módulos em duas colunas", () => {
    expect(guideSource).toContain("overflow-x-hidden overflow-y-auto");
    expect(guideSource).not.toContain('DialogHeader className="sticky top-0');
    expect(guideSource).toContain("grid grid-cols-2 list-none");
  });

  it("dispara a impressão mesmo quando about:blank não emite load", () => {
    expect(guideSource).toContain("window.setTimeout(print, 250)");
    expect(guideSource).toContain("printWindow.focus()");
  });
});
