import { describe, expect, it } from "vitest";
import { calculateLShape, calculateRectangle, calculateSquare, calculateUShape } from "./lEngine";

const params = {
  power: 18 as const,
  voltage: "220V" as const,
  stripMethod: "STRIPFLEX" as const,
  allowLongModules: false,
  allowFractionalBars: false,
};

describe("seleção de módulos por aresta nos formatos geométricos", () => {
  it("mantém metas horizontal e vertical independentes no BLAZE H em L", () => {
    const result = calculateLShape("LLP-6060", 1175, 2800, params)!;

    expect(result.requestedDimensions).toEqual([1175, 2800]);
    expect(result.dimensions).toEqual([1175, 2305]);
    expect(result.summary).toContain("extremidade horizontal");
    expect(result.summary).toContain("extremidade vertical");
    expect(result.totalLengthMm).toBe(result.dimensions[0] + result.dimensions[1]);
  });

  it("registra a meta individual repetida do quadrado", () => {
    const result = calculateSquare("LLP-6060", 2800, params)!;
    expect(result.requestedDimensions).toEqual([2800, 2800]);
    expect(result.dimensions[0]).toBe(result.dimensions[1]);
  });

  it("otimiza largura e altura do retângulo em segmentos separados", () => {
    const result = calculateRectangle("LLP-6060", 2800, 1175, params)!;
    expect(result.requestedDimensions).toEqual([2800, 1175]);
    expect(result.summary).toContain("— largos");
    expect(result.dimensions).toEqual([2330, 1200]);
  });

  it("otimiza base e profundidade do U separadamente", () => {
    const result = calculateUShape("LLP-6060", 2800, 1175, params)!;
    expect(result.requestedDimensions).toEqual([1175, 2800]);
    expect(result.dimensions).toEqual([1200, 2300]);
    expect(result.summary).toContain("profundidade");
    expect(result.summary).toContain("base");
  });

  it("quadrado e retângulo nunca usam IF; somente cantos 1L1 e ML", () => {
    const square = calculateSquare("LLP-6060", 3000, params)!;
    const rectangle = calculateRectangle("LLP-6060", 4000, 2000, params)!;
    for (const result of [square, rectangle]) {
      expect(result.pieces.some(piece => piece.type === "STRAIGHT_IF")).toBe(false);
      expect(result.pieces.filter(piece => piece.type !== "CORNER").every(piece => piece.type === "STRAIGHT_ML")).toBe(true);
      expect(result.assemblyEdges?.flatMap(edge => edge.modules).some(module => module.type === "IF")).toBe(false);
    }
  });

  it("L usa exatamente dois IFs iguais por padrão e permite IFs diferentes só quando habilitado", () => {
    const fixed = calculateLShape("LLP-6060", 1175, 2800, { ...params, allowMixedIF: false })!;
    const mixed = calculateLShape("LLP-6060", 1175, 2800, { ...params, allowMixedIF: true })!;
    const fixedIfs = fixed.assemblyEdges!.flatMap(edge => edge.modules.filter(module => module.type === "IF"));
    const mixedIfs = mixed.assemblyEdges!.flatMap(edge => edge.modules.filter(module => module.type === "IF"));
    expect(fixedIfs).toHaveLength(2);
    expect(new Set(fixedIfs.map(module => module.sku)).size).toBe(1);
    expect(mixedIfs).toHaveLength(2);
    expect(new Set(mixedIfs.map(module => module.sku)).size).toBe(2);
  });

  it("U usa exatamente dois IFs nas aberturas e nenhum IF na base", () => {
    const result = calculateUShape("LLP-6060", 3000, 4000, params)!;
    const totalIfQty = result.pieces.filter(piece => piece.type === "STRAIGHT_IF").reduce((sum, piece) => sum + piece.quantity, 0);
    const base = result.assemblyEdges!.find(edge => edge.id === "base")!;
    expect(totalIfQty).toBe(2);
    expect(base.modules.some(module => module.type === "IF")).toBe(false);
    expect(result.assemblyEdges!.filter(edge => edge.id !== "base").every(edge => edge.modules.filter(module => module.type === "IF").length === 1)).toBe(true);
  });

  it("otimizar quantidade reduz peças sem misturar IF em formato fechado", () => {
    const closest = calculateSquare("LLP-6060", 8000, { ...params, allowLongModules: true, optimizeModuleCount: false })!;
    const fewer = calculateSquare("LLP-6060", 8000, { ...params, allowLongModules: true, optimizeModuleCount: true })!;
    const count = (result: typeof closest) => result.pieces.reduce((sum, piece) => sum + piece.quantity, 0);
    expect(count(fewer)).toBeLessThan(count(closest));
    expect(fewer.pieces.some(piece => piece.type === "STRAIGHT_IF")).toBe(false);
  });

  it("ajustar para medida maior também funciona por aresta nos formatos", () => {
    const result = calculateSquare("LLP-6060", 2800, { ...params, allowLongModules: true, adjustToLarger: true })!;
    expect(result.dimensions[0]).toBeGreaterThanOrEqual(2800);
    expect(result.dimensions[1]).toBeGreaterThanOrEqual(2800);
  });
});
