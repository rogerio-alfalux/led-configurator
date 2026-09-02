export const COST_DEPARTMENT_ROLE = "custos";

export function isCostDepartmentRole(role?: string | null): boolean {
  return role === COST_DEPARTMENT_ROLE;
}

/**
 * O Departamento de Custos só pode informar custo manual quando o item é
 * especial e ainda não possui custo efetivo registrado.
 */
export function isSpecialItemWithoutRegisteredCost(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const data = item as Record<string, unknown>;
  const category = String(data.category ?? "").trim().toLowerCase();
  const isSpecial = data.isSpecialItem === true || category === "item especial" || category === "especial";
  if (!isSpecial) return false;

  const costFields = [
    data.custoManual,
    data.specialCustoUnitario,
    data.custoCorpoBase,
    data.custoLuminaria,
    data.unitCost,
  ];
  return !costFields.some((value) => Number(value) > 0);
}
