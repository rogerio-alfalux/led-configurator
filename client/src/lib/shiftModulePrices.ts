import { getLinkedAccessoryTotalPrice, type CartItemData } from "./cartTypes";

/** Converte um preço digitado no padrão brasileiro ou decimal para número. */
export function parseShiftModuleManualPrice(rawValue: string): number | null {
  const raw = rawValue.trim();
  if (!raw) return null;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Total bruto de subitens vinculados para a quantidade configurada do produto pai. */
export function calculateLinkedAccessoriesTotal(item: Pick<CartItemData, "accessories" | "qty">): number {
  return (item.accessories ?? []).reduce(
    (sum, accessory) => sum + getLinkedAccessoryTotalPrice(item, accessory),
    0,
  );
}
