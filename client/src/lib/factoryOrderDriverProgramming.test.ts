import { describe, expect, it } from "vitest";
import {
  updateDriverLineProgramming,
  updateSegmentDriverProgramming,
} from "./factoryOrderDriverProgramming";

describe("programação editável de drivers no pedido de fábrica", () => {
  it("edita um grupo de segmentos mesmo quando a corrente inicial está ausente", () => {
    const result = updateSegmentDriverProgramming([
      { corrente: null, sku: "LLP-1" },
      { corrente: "350mA", sku: "LLP-2" },
      { corrente: null, sku: "LLP-3" },
    ], [0, 2], "500mA");

    expect(result).toEqual([
      { corrente: "500mA", programacaoManual: true, sku: "LLP-1" },
      { corrente: "350mA", sku: "LLP-2" },
      { corrente: "500mA", programacaoManual: true, sku: "LLP-3" },
    ]);
  });

  it("edita somente a linha de driver selecionada, inclusive quando vazia", () => {
    const result = updateDriverLineProgramming([
      { corrente: null, driverCode: "EQ001" },
      { corrente: "700mA", driverCode: "EQ002" },
    ], 0, "350mA");

    expect(result).toEqual([
      { corrente: "350mA", programacaoManual: true, driverCode: "EQ001" },
      { corrente: "700mA", driverCode: "EQ002" },
    ]);
  });
});
