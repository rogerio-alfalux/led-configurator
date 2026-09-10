import { describe, expect, it } from "vitest";
import { isCostDepartmentEligibleForManualCost, isSpecialItemWithoutRegisteredCost } from "../shared/costDepartmentAccess";

describe("acesso do Departamento de Custos", () => {
  it("permite corrigir um custo manual já informado em item sem custo oficial", () => {
    const item = { isSpecialItem: true, custoManual: 340 };
    expect(isCostDepartmentEligibleForManualCost(item)).toBe(true);
    expect(isSpecialItemWithoutRegisteredCost(item)).toBe(false);
  });

  it("permite revenda, equipamentos e componentes quando a API não confirmou custo", () => {
    expect(isCostDepartmentEligibleForManualCost({ category: "Revenda" })).toBe(true);
    expect(isCostDepartmentEligibleForManualCost({ category: "Equipamentos", custoDriver: 0 })).toBe(true);
    expect(isCostDepartmentEligibleForManualCost({ category: "Componentes", unitCost: 0 })).toBe(true);
  });

  it("continua bloqueando qualquer item com custo confirmado pela API", () => {
    expect(isCostDepartmentEligibleForManualCost({ category: "Revenda", custoApiConfirmado: 340 })).toBe(false);
    expect(isCostDepartmentEligibleForManualCost({ category: "Downlights", custoCorpoBase: 340 })).toBe(false);
  });
});
