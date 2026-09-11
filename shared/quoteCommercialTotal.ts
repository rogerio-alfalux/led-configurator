export type CommercialDriverLine = {
  driverTotalPrice?: unknown;
  driverUnitPrice?: unknown;
  driverQty?: unknown;
};

export type CommercialLinkedAccessory = {
  unitPrice?: unknown;
  qty?: unknown;
};

export type CommercialQuoteItem = {
  category?: unknown;
  qty?: unknown;
  totalPrice?: unknown;
  priceWithoutDriver?: unknown;
  unitPriceLuminaria?: unknown;
  driverLines?: CommercialDriverLine[];
  accessories?: CommercialLinkedAccessory[];
  itemMarginPercent?: unknown;
  itemDiscountPercent?: unknown;
  isCommercialSampleCharge?: unknown;
  sampleChargeFinalAmount?: unknown;
};

export type CommercialQuoteFields = {
  status?: unknown;
  rtPercent?: unknown;
  marginPercent?: unknown;
  discountPercent?: unknown;
  freteValue?: unknown;
  freteIncluded?: unknown;
  freteIsento?: unknown;
  diluicaoValor?: unknown;
  difalEnabled?: unknown;
  combinedTaxRate?: unknown;
};

const numberOrZero = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const rate = (value: unknown, divideBy = 1): number =>
  Math.min(Math.max(numberOrZero(value) / divideBy, 0), 0.99);

const applyItemMargin = (amount: number, itemMarginPercent: unknown): number => {
  const itemRate = rate(itemMarginPercent, 100);
  return itemRate > 0 ? amount / (1 - itemRate) : amount;
};

const applyItemDiscount = (amount: number, itemDiscountPercent: unknown): number =>
  amount * (1 - rate(itemDiscountPercent, 100));

const parseItem = (item: CommercialQuoteItem | string | null | undefined): CommercialQuoteItem | null => {
  if (!item) return null;
  if (typeof item !== "string") return item;
  try {
    return JSON.parse(item) as CommercialQuoteItem;
  } catch {
    return null;
  }
};

/**
 * Reconstitui o valor comercial efetivamente cobrado a partir da revisão atual.
 * A ordem é: subitens → margem/desconto por item → RT/margem global → desconto
 * global → frete/diluição → DIFAL/FCP. A fórmula é isomórfica e pode ser usada
 * pela interface e pelo servidor sem reprecificar nenhum item da API.
 */
export function calculateCommercialQuoteTotal(
  fields: CommercialQuoteFields,
  rawItems: Array<CommercialQuoteItem | string | null | undefined>,
) {
  if (fields.status === "sample") {
    return { productsBeforeDiscount: 0, productsAfterDiscount: 0, totalFinal: 0 };
  }

  const itemBase = rawItems.reduce((sum, rawItem) => {
    const item = parseItem(rawItem);
    if (!item || item.category === "Não Orçamos") return sum;

    if (item.isCommercialSampleCharge) {
      return sum + Math.max(0, numberOrZero(item.sampleChargeFinalAmount ?? item.totalPrice));
    }

    const qty = Math.max(0, numberOrZero(item.qty) || 1);
    const drivers = Array.isArray(item.driverLines) ? item.driverLines : [];
    const driversTotal = drivers.reduce((driverSum, driver) => {
      const storedTotal = numberOrZero(driver.driverTotalPrice);
      if (storedTotal > 0) return driverSum + storedTotal;
      const storedQty = numberOrZero(driver.driverQty);
      const driverQty = storedQty <= 1 ? qty : storedQty;
      return driverSum + numberOrZero(driver.driverUnitPrice) * driverQty;
    }, 0);
    const bodyTotal = drivers.length > 0
      ? (() => {
          const storedBody = numberOrZero(item.priceWithoutDriver);
          const bodyWasStoredPerUnit = numberOrZero(item.unitPriceLuminaria) > 0
            && Math.abs(storedBody - numberOrZero(item.unitPriceLuminaria)) < 0.02
            && qty > 1;
          if (storedBody > 0) return bodyWasStoredPerUnit ? storedBody * qty : storedBody;
          const unitBody = numberOrZero(item.unitPriceLuminaria);
          if (unitBody > 0) return unitBody * qty;
          return Math.max(0, numberOrZero(item.totalPrice) - driversTotal);
        })()
      : numberOrZero(item.totalPrice);
    const accessoriesTotal = (item.accessories ?? []).reduce(
      (accessorySum, accessory) => accessorySum
        + numberOrZero(accessory.unitPrice) * numberOrZero(accessory.qty) * qty,
      0,
    );
    return sum + applyItemDiscount(
      applyItemMargin(bodyTotal + driversTotal + accessoriesTotal, item.itemMarginPercent),
      item.itemDiscountPercent,
    );
  }, 0);

  const freight = fields.freteIncluded && !fields.freteIsento
    ? Math.max(0, numberOrZero(fields.freteValue))
    : 0;
  const dilution = Math.max(0, numberOrZero(fields.diluicaoValor));
  const withRt = itemBase + freight + dilution;
  const rtRate = rate(fields.rtPercent);
  const withGlobalRt = rtRate > 0 ? withRt / (1 - rtRate) : withRt;
  const marginRate = rate(fields.marginPercent);
  const productsBeforeDiscount = marginRate > 0 ? withGlobalRt / (1 - marginRate) : withGlobalRt;
  const productsAfterDiscount = productsBeforeDiscount * (1 - rate(fields.discountPercent));
  const separateFreight = !fields.freteIncluded && !fields.freteIsento
    ? Math.max(0, numberOrZero(fields.freteValue))
    : 0;
  const taxableBase = productsAfterDiscount + separateFreight;
  const taxRate = fields.difalEnabled ? rate(fields.combinedTaxRate, 100) : 0;
  const totalFinal = taxRate > 0 ? taxableBase / (1 - taxRate) : taxableBase;

  return {
    productsBeforeDiscount: Math.round(productsBeforeDiscount * 100) / 100,
    productsAfterDiscount: Math.round(productsAfterDiscount * 100) / 100,
    totalFinal: Math.round(totalFinal * 100) / 100,
  };
}
