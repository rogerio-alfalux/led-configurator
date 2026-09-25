export type CommercialDriverLine = {
  driverTotalPrice?: unknown;
  driverUnitPrice?: unknown;
  driverQty?: unknown;
};

export type CommercialLinkedAccessory = {
  unitPrice?: unknown;
  qty?: unknown;
  /** Quantidade manual do pedido: não deve ser multiplicada pela quantidade da luminária. */
  quantityScope?: unknown;
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

/**
 * A margem individual é uma condição comercial da luminária. Drivers e
 * acessórios mantêm seus próprios preços e recebem apenas os encargos globais
 * do orçamento, nunca o percentual individual do corpo.
 */
export const applyItemMarginToLuminaire = (amount: number, itemMarginPercent: unknown): number => {
  const itemRate = rate(itemMarginPercent, 100);
  return itemRate > 0 ? amount / (1 - itemRate) : amount;
};

export const applyItemDiscount = (amount: number, itemDiscountPercent: unknown): number =>
  amount * (1 - rate(itemDiscountPercent, 100));

/** Aplica margem individual somente ao corpo e desconto individual ao conjunto comercial. */
export const calculateItemCommercialBase = (
  luminaireTotal: number,
  nonLuminaireTotal: number,
  itemMarginPercent: unknown,
  itemDiscountPercent: unknown,
): number => applyItemDiscount(
  applyItemMarginToLuminaire(Math.max(0, luminaireTotal), itemMarginPercent)
    + Math.max(0, nonLuminaireTotal),
  itemDiscountPercent,
);

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
 * Aplica os adicionais globais que integram o preço dos produtos antes de um
 * eventual desconto. Frete diluído e diluição interna entram na base antes de
 * RT e margem, pois são distribuídos nos itens comercializados.
 */
export function calculateCommercialProductsBeforeDiscount(
  fields: CommercialQuoteFields,
  itemBase: unknown,
): number {
  if (fields.status === "sample") return 0;

  const freight = fields.freteIncluded && !fields.freteIsento
    ? Math.max(0, numberOrZero(fields.freteValue))
    : 0;
  const dilution = Math.max(0, numberOrZero(fields.diluicaoValor));
  const withIncludedCharges = Math.max(0, numberOrZero(itemBase)) + freight + dilution;
  const rtRate = rate(fields.rtPercent);
  const withGlobalRt = rtRate > 0 ? withIncludedCharges / (1 - rtRate) : withIncludedCharges;
  const marginRate = rate(fields.marginPercent);
  const productsBeforeDiscount = marginRate > 0 ? withGlobalRt / (1 - marginRate) : withGlobalRt;
  return Math.round(productsBeforeDiscount * 100) / 100;
}

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
    const accessoriesTotal = (item.accessories ?? []).reduce((accessorySum, accessory) => {
      const accessoryQty = Math.max(0, numberOrZero(accessory.qty));
      const totalAccessoryQty = accessory.quantityScope === "order_total"
        ? accessoryQty
        : accessoryQty * qty;
      return accessorySum + numberOrZero(accessory.unitPrice) * totalAccessoryQty;
    }, 0);
    return sum + calculateItemCommercialBase(
      bodyTotal,
      driversTotal + accessoriesTotal,
      item.itemMarginPercent,
      item.itemDiscountPercent,
    );
  }, 0);

  const productsBeforeDiscount = calculateCommercialProductsBeforeDiscount(fields, itemBase);
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

/**
 * Mantém como soberano o total final já persistido na revisão efetiva.
 * A recomposição pelos itens é apenas fallback para registros sem total salvo.
 */
export function resolveStoredCommercialTotal(
  storedTotal: unknown,
  recalculatedTotal: unknown,
): number {
  const stored = Number(storedTotal);
  if (Number.isFinite(stored) && stored > 0) return stored;

  const recalculated = Number(recalculatedTotal);
  return Number.isFinite(recalculated) && recalculated >= 0 ? recalculated : 0;
}

/**
 * Recupera a base comercial original de itens a partir do total final já salvo.
 * É a operação inversa de `calculateCommercialQuoteTotal` para os percentuais e
 * adicionais globais. Assim, abrir o editor de um orçamento histórico não usa o
 * catálogo atual nem reaplica RT/margem que já estejam embutidos no valor entregue.
 */
export function deriveCommercialItemBaseFromStoredTotal(
  fields: CommercialQuoteFields,
  storedTotal: unknown,
): number | null {
  const finalTotal = Number(storedTotal);
  if (!Number.isFinite(finalTotal) || finalTotal <= 0) return null;

  const taxRate = fields.difalEnabled ? rate(fields.combinedTaxRate, 100) : 0;
  const taxableBase = taxRate > 0 ? finalTotal * (1 - taxRate) : finalTotal;
  const separateFreight = !fields.freteIncluded && !fields.freteIsento
    ? Math.max(0, numberOrZero(fields.freteValue))
    : 0;
  const productsAfterDiscount = Math.max(0, taxableBase - separateFreight);
  const discountRate = rate(fields.discountPercent);
  const productsBeforeDiscount = discountRate > 0
    ? productsAfterDiscount / (1 - discountRate)
    : productsAfterDiscount;
  const marginRate = rate(fields.marginPercent);
  const withGlobalRt = marginRate > 0
    ? productsBeforeDiscount * (1 - marginRate)
    : productsBeforeDiscount;
  const rtRate = rate(fields.rtPercent);
  const withIncludedCharges = rtRate > 0
    ? withGlobalRt * (1 - rtRate)
    : withGlobalRt;
  const includedFreight = fields.freteIncluded && !fields.freteIsento
    ? Math.max(0, numberOrZero(fields.freteValue))
    : 0;
  const dilution = Math.max(0, numberOrZero(fields.diluicaoValor));
  const itemBase = Math.max(0, withIncludedCharges - includedFreight - dilution);
  return Math.round(itemBase * 100) / 100;
}
