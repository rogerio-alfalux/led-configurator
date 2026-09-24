import type { CartItemData } from "./cartTypes";
import { getEffectiveDriverLineQuantity, getLinkedAccessoryTotalPrice } from "./cartTypes";
import { getCommercialBodyTotal } from "./splitItemPricing";
import { getUnitPriceWithoutIpi } from "./quoteIpi";

export interface UnifiedPdfPrices {
  unitWithIpi: number;
  unitWithoutIpi: number;
  total: number;
}

/**
 * Soma somente os componentes comerciais vinculados ao item.
 * O resultado é transitório e serve exclusivamente à apresentação unificada no PDF.
 */
export function getUnifiedPdfRawItemTotal(item: CartItemData): number {
  const bodyTotal = getCommercialBodyTotal(item);
  const driverTotal = (item.driverLines ?? []).reduce((sum, line) => {
    const storedTotal = Number(line.driverTotalPrice);
    if (Number.isFinite(storedTotal) && storedTotal > 0) return sum + storedTotal;
    const unitPrice = Number(line.driverUnitPrice ?? 0);
    return sum + unitPrice * getEffectiveDriverLineQuantity(item, line);
  }, 0);
  const accessoryTotal = (item.accessories ?? []).reduce(
    (sum, accessory) => sum + getLinkedAccessoryTotalPrice(item, accessory),
    0,
  );

  return bodyTotal + driverTotal + accessoryTotal;
}

export function hasUnifiedPdfComponents(item: CartItemData): boolean {
  return (item.driverLines?.length ?? 0) > 0 || (item.accessories?.length ?? 0) > 0;
}

/**
 * Converte o montante comercial final do item em preço unitário unificado.
 * IPI é retirado somente depois que luminária, drivers e acessórios já foram somados.
 */
export function getUnifiedPdfPrices(
  finalItemTotalWithIpi: number,
  itemQuantity: number,
): UnifiedPdfPrices {
  const qty = Math.max(1, Number(itemQuantity) || 1);
  const total = Math.max(0, Number(finalItemTotalWithIpi) || 0);
  const unitWithIpi = total / qty;

  return {
    unitWithIpi,
    unitWithoutIpi: getUnitPriceWithoutIpi(unitWithIpi),
    total,
  };
}
