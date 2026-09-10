import { describe, expect, it } from "vitest";
import { COST_DEPARTMENT_ROLE, isCostDepartmentEligibleForManualCost, isCostDepartmentRole, isSpecialItemWithoutRegisteredCost } from "@shared/costDepartmentAccess";

describe("acesso do Departamento de Custos", () => {
  it("identifica somente o novo perfil", () => {
    expect(isCostDepartmentRole(COST_DEPARTMENT_ROLE)).toBe(true);
    expect(isCostDepartmentRole("admin")).toBe(false);
  });

  it("autoriza qualquer item sem custo confirmado", () => {
    expect(isSpecialItemWithoutRegisteredCost({ isSpecialItem: true, unitPrice: 250 })).toBe(true);
    expect(isSpecialItemWithoutRegisteredCost({ isSpecialItem: true, custoManual: 20 })).toBe(false);
    expect(isSpecialItemWithoutRegisteredCost({ category: "Revenda" })).toBe(true);
    expect(isCostDepartmentEligibleForManualCost({ category: "Componentes", custoApiConfirmado: 20 })).toBe(false);
  });
});
