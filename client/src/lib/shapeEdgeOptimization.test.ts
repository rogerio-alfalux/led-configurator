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
    expect(result.dimensions).toEqual([1175, 2300]);
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
    expect(result.dimensions).toEqual([2335, 1200]);
  });

  it("otimiza base e profundidade do U separadamente", () => {
    const result = calculateUShape("LLP-6060", 2800, 1175, params)!;
    expect(result.requestedDimensions).toEqual([1175, 2800]);
    expect(result.dimensions).toEqual([1200, 2300]);
    expect(result.summary).toContain("profundidade");
    expect(result.summary).toContain("base");
  });
});
