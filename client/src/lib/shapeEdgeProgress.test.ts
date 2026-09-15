import { describe, expect, it } from "vitest";
import { getShapeEdgeProgress } from "./shapeEdgeProgress";

describe("atingimento independente por aresta", () => {
  it("não transforma 1175mm × 2800mm em um alvo linear de 3975mm", () => {
    expect(getShapeEdgeProgress("L_SHAPE", [1175, 2800], [1175, 2800])).toEqual([
      { label: "Horizontal", requestedMm: 1175, achievedMm: 1175, percentage: 100, withinTolerance: true },
      { label: "Vertical", requestedMm: 2800, achievedMm: 2800, percentage: 100, withinTolerance: true },
    ]);
  });

  it("expõe separadamente largura e altura do retângulo", () => {
    const rows = getShapeEdgeProgress("RECTANGLE", [2800, 1175], [3000, 1200]);
    expect(rows.map((row) => row.label)).toEqual(["Largura", "Altura"]);
    expect(rows.map((row) => row.percentage)).toEqual([93, 98]);
  });

  it("usa uma única meta por lado no quadrado", () => {
    expect(getShapeEdgeProgress("SQUARE", [2335, 2335], [2800, 2800])).toEqual([
      { label: "Cada lado", requestedMm: 2800, achievedMm: 2335, percentage: 83, withinTolerance: false },
    ]);
  });

  it("separa base e profundidade no formato U", () => {
    expect(getShapeEdgeProgress("U_SHAPE", [1200, 2300], [1175, 2800]).map((row) => row.label)).toEqual([
      "Base",
      "Profundidade",
    ]);
  });
});
