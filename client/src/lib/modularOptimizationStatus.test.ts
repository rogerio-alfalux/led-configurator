import { describe, expect, it } from "vitest";
import { getModularOptimizationStatus } from "./modularOptimizationStatus";

describe("getModularOptimizationStatus", () => {
  it("informa a lógica padrão por comprimento mais próximo", () => {
    expect(getModularOptimizationStatus({ optimizeModuleCount: false, allowLongModules: false, allowFractional: false, allowMixedIF: false })).toEqual([
      "Otimizar pelo comprimento mais próximo", "até 5 barras",
    ]);
  });

  it("combina a preferência por quantidade com as demais opções", () => {
    expect(getModularOptimizationStatus({ optimizeModuleCount: true, allowLongModules: true, allowFractional: true, allowMixedIF: true })).toEqual([
      "Otimizar quantidade de módulos", "módulos longos permitidos", "medidas quebradas", "IFs diferentes",
    ]);
  });
});
