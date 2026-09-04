import { describe, expect, it } from "vitest";
import { isSpecialItemEligibleForManualCost, isSpecialItemWithoutRegisteredCost } from "../shared/costDepartmentAccess";

describe("acesso do Departamento de Custos", () => {
  it("permite corrigir um custo manual já informado em item especial sem custo oficial", () => {
    const item = { isSpecialItem: true, custoManual: 340 };
    expect(isSpecialItemEligibleForManualCost(item)).toBe(true);
    expect(isSpecialItemWithoutRegisteredCost(item)).toBe(false);
  });

  it("continua bloqueando item especial com custo oficial registrado", () => {
    expect(isSpecialItemEligibleForManualCost({ isSpecialItem: true, custoCorpoBase: 340 })).toBe(false);
  });

  it("continua bloqueando itens que não são especiais", () => {
    expect(isSpecialItemEligibleForManualCost({ category: "Downlights", custoManual: 340 })).toBe(false);
  });
});
