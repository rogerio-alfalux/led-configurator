import { getManualUnitCost } from "./quoteCostUtils";

type PersistedQuoteItem = {
  itemNumber: number | string;
  itemData: unknown;
};

export type ConfirmedNonCommercialCost = {
  amount: number;
  isComplete: boolean;
  missingItemNumbers: number[];
};

function parseItemData(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function toPositiveNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Apura o custo do pedido sem cobrança a partir dos valores técnicos gravados no
 * item. Nunca estima custo a partir da venda ou da margem: se qualquer item não
 * possuir custo confirmado, o resultado não pode ser transferido como despesa.
 */
export function getConfirmedNonCommercialOrderCost(items: PersistedQuoteItem[]): ConfirmedNonCommercialCost {
  let amount = 0;
  const missingItemNumbers: number[] = [];

  for (const item of items) {
    const data = parseItemData(item.itemData);
    const itemNumber = Number(item.itemNumber);
    if (!data) {
      missingItemNumbers.push(itemNumber);
      continue;
    }

    const qty = toPositiveNumber(data.qty) || 1;
    const manualUnitCost = getManualUnitCost(data.custoManual);
    if (manualUnitCost > 0) {
      amount += manualUnitCost * qty;
      continue;
    }

    const bodyUnitCost = toPositiveNumber(data.custoCorpoBase);
    if (bodyUnitCost <= 0) {
      missingItemNumbers.push(itemNumber);
      continue;
    }

    let itemCost = bodyUnitCost * qty;
    const driverLines = Array.isArray(data.driverLines) ? data.driverLines : [];
    if (driverLines.length > 0) {
      const driverUnitCost = toPositiveNumber(data.custoDriverBase);
      if (driverUnitCost <= 0) {
        missingItemNumbers.push(itemNumber);
        continue;
      }
      itemCost += driverUnitCost * driverLines.reduce((total, line) => {
        const driverQty = line && typeof line === "object"
          ? toPositiveNumber((line as Record<string, unknown>).driverQty)
          : 0;
        return total + driverQty;
      }, 0);
    }
    amount += itemCost;
  }

  return {
    amount: Math.round(amount * 100) / 100,
    isComplete: missingItemNumbers.length === 0 && amount > 0,
    missingItemNumbers,
  };
}
