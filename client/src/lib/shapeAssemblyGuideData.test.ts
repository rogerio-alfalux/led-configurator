import { describe, expect, it } from "vitest";
import { buildShapeAssemblyGuideHtml, getShapeAssemblyDocumentEntries } from "./shapeAssemblyGuideData";
import { buildShapeAssemblyPrintDocument } from "@/components/ShapeAssemblyGuide";

describe("guia de montagem da produção", () => {
  const specialShapeItem = {
    category: "Perfis",
    sku: "LLP-6060",
    description: "BLAZE H RETANGULAR 4500 X 3500MM",
    itemEmPlanta: "L1",
    qty: 1,
    profileShape: "RECTANGLE" as const,
    shapeAssemblyEdges: [
      {
        id: "top", label: "Superior", requestedLength: 4500, achievedLength: 4500,
        modules: [
          { type: "CORNER" as const, sku: "LLP-6060.1L1.48F", length: 600, bars: 2 },
          { type: "ML" as const, sku: "LLP-6060.5ML.48F", length: 3300, bars: 11 },
          { type: "CORNER" as const, sku: "LLP-6060.1L1.48F", length: 600, bars: 2 },
        ],
      },
    ],
  };

  it("cria somente guias para snapshots que já possuem mapa físico salvo", () => {
    expect(getShapeAssemblyDocumentEntries([specialShapeItem as any, { category: "Perfis", sku: "RETO" } as any])).toHaveLength(1);
  });

  it("gera página vertical com aresta, sequência, SKU e instrução de montagem", () => {
    const html = buildShapeAssemblyGuideHtml([specialShapeItem as any]);
    expect(html).toContain("INSTRUÇÃO DE MONTAGEM");
    expect(html).toContain("Superior");
    expect(html).toContain("LLP-6060.5ML.48F");
    expect(html).toContain("Monte as peças na ordem numerada");
    expect(html).toContain("assembly-sheet");
  });

  it("mantém a folha de impressão compacta em A4, sem rolagem horizontal", () => {
    const html = buildShapeAssemblyPrintDocument({
      shape: specialShapeItem.profileShape,
      assemblyEdges: specialShapeItem.shapeAssemblyEdges,
      profileName: specialShapeItem.description,
      profileCode: specialShapeItem.sku,
    });
    expect(html).toContain("@page{size:A4 portrait;margin:6mm}");
    expect(html).toContain("grid-template-columns:repeat(2,minmax(0,1fr))");
    expect(html).toContain(".assembly-sheet:last-child{page-break-after:auto}");
  });
});
