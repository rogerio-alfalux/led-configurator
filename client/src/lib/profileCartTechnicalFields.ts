export function profileCartTechnicalFields(quantity: number | undefined, itemEmPlanta: string | undefined) {
  return {
    qty: Math.max(1, quantity ?? 1),
    itemEmPlanta: itemEmPlanta?.trim() ?? "",
  };
}
