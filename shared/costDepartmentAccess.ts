export const COST_DEPARTMENT_ROLE = "custos";

export function isCostDepartmentRole(role?: string | null): boolean {
  return role === COST_DEPARTMENT_ROLE;
}

/**
 * O Departamento de Custos só pode informar ou corrigir custo manual quando o
 * item é especial e não possui custo oficial registrado. `custoManual` não é
 * custo oficial: ele é justamente o valor que esse departamento pode revisar.
 */
export function isSpecialItemEligibleForManualCost(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const data = item as Record<string, unknown>;
  const category = String(data.category ?? "").trim().toLowerCase();
  const isSpecial = data.isSpecialItem === true || category === "item especial" || category === "especial";
  if (!isSpecial) return false;

  const costFields = [
    data.specialCustoUnitario,
    data.custoCorpoBase,
    data.custoLuminaria,
    data.unitCost,
  ];
  return !costFields.some((value) => Number(value) > 0);
}

/** Indica item especial sem custo manual ainda informado, para os fluxos iniciais. */
export function isSpecialItemWithoutRegisteredCost(item: unknown): boolean {
  if (!isSpecialItemEligibleForManualCost(item)) return false;
  return !(Number((item as Record<string, unknown>).custoManual) > 0);
}
