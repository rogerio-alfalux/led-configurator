import type { CartItemData } from "./cartTypes";

export interface CartDriverDisplayDetail {
  quantity: number;
  model: string;
  code: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
}

function parseLegacyDriver(item: CartItemData): { model: string; code: string | null; quantityPerUnit: number } | null {
  const raw = item.drivers?.trim();
  if (!raw) return null;
  const quantityMatch = raw.match(/^(\d+(?:[.,]\d+)?)\s*[xX]\s+/);
  const quantityPerUnit = quantityMatch ? Number(quantityMatch[1].replace(",", ".")) : 1;
  const codeMatch = raw.match(/\(([A-Z]{2}\d+)\)/i);
  const model = raw
    .replace(/^(\d+(?:[.,]\d+)?)\s*[xX]\s+/i, "")
    .replace(/\s*\([A-Z]{2}\d+\)\s*$/i, "")
    .trim();
  return model ? { model, code: codeMatch?.[1]?.toUpperCase() ?? null, quantityPerUnit } : null;
}

/**
 * Resolve o resumo técnico de fontes mostrado no card do carrinho. Para os
 * lineares do fluxo LED BAR, cortes e quantidade de luminárias são a fonte de
 * verdade: cada corte exige uma fonte. Isso também cobre itens legados que
 * ainda não possuem driverLines estruturadas.
 */
export function getCartDriverDisplayDetails(
  item: CartItemData,
  officialPriceByCode: ReadonlyMap<string, number> = new Map(),
): CartDriverDisplayDetail[] {
  const itemQty = Math.max(1, Number(item.qty ?? 1));
  const isLedBar = item.category === "LED BAR";
  if (isLedBar && item.ledBarDriverCode && item.ledBarNCortes) {
    const legacy = parseLegacyDriver(item);
    const code = item.ledBarDriverCode.trim().toUpperCase();
    const quantity = Math.max(1, Number(item.ledBarNCortes)) * itemQty;
    const matchingLine = item.driverLines?.find(
      (driver) => driver.driverCode?.trim().toUpperCase() === code,
    );
    const unitPrice = matchingLine?.driverUnitPrice
      ?? item.unitPriceDriver
      ?? officialPriceByCode.get(code)
      ?? null;
    return [{
      quantity,
      model: item.ledBarDriverModel?.trim() || legacy?.model || "Driver",
      code,
      unitPrice,
      totalPrice: unitPrice != null ? Math.round(unitPrice * quantity * 100) / 100 : null,
    }];
  }

  if (item.driverLines && item.driverLines.length > 0) {
    return item.driverLines.map((driver) => {
      const quantity = Math.max(0, Number(driver.driverQty ?? 0));
      const code = driver.driverCode?.trim().toUpperCase() || null;
      const unitPrice = driver.driverUnitPrice ?? (code ? officialPriceByCode.get(code) ?? null : null);
      return {
        quantity,
        model: driver.driverModel || "Driver",
        code,
        unitPrice,
        totalPrice: unitPrice != null ? Math.round(unitPrice * quantity * 100) / 100 : null,
      };
    });
  }

  const legacy = parseLegacyDriver(item);
  if (!legacy) return [];
  const quantity = legacy.quantityPerUnit * itemQty;
  const unitPrice = item.unitPriceDriver
    ?? (legacy.code ? officialPriceByCode.get(legacy.code) ?? null : null);
  return [{
    quantity,
    model: legacy.model,
    code: legacy.code,
    unitPrice,
    totalPrice: unitPrice != null
      ? Math.round(unitPrice * quantity * 100) / 100
      : null,
  }];
}
