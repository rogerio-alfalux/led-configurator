export const COST_DEPARTMENT_ROLE = "custos";

export function isCostDepartmentRole(role?: string | null): boolean {
  return role === COST_DEPARTMENT_ROLE;
}

/**
 * O Departamento de Custos pode informar ou corrigir um custo quando o item
 * ainda não possui custo confirmado. Isso inclui Especial, revenda,
 * equipamentos, módulos e componentes que vieram sem custo ou dependem de
 * estimativa. `custoManual` é deliberadamente ignorado para permitir revisão.
 */
export function isCostDepartmentEligibleForManualCost(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const data = item as Record<string, unknown>;
  const confirmedCostFields = [
    data.custoApiConfirmado,
    data.custoCorpoBase,
    data.custoLuminaria,
    data.specialCustoUnitario,
    data.unitCost,
  ];
  return !confirmedCostFields.some((value) => Number(value) > 0);
}

/** @deprecated Use isCostDepartmentEligibleForManualCost. */
export function isSpecialItemEligibleForManualCost(item: unknown): boolean {
  return isCostDepartmentEligibleForManualCost(item);
}

/** Indica item sem custo confirmado e sem confirmação manual ainda informada. */
export function isSpecialItemWithoutRegisteredCost(item: unknown): boolean {
  if (!isCostDepartmentEligibleForManualCost(item)) return false;
  return !(Number((item as Record<string, unknown>).custoManual) > 0);
}
