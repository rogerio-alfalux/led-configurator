import type { CartItemData } from "./cartTypes";

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

/**
 * Para itens com driver desmembrado, o campo editável representa somente a peça.
 * unitPriceLuminaria é a fonte canônica; unitPrice é usado apenas como fallback legado.
 */
export function getEditableBodyUnitPrice(item: CartItemData): number | null {
  if (item.driverLines && item.driverLines.length > 0) {
    return item.unitPriceLuminaria ?? item.unitPrice ?? null;
  }
  return item.unitPrice ?? null;
}

/**
 * Atualiza somente o preço da peça. O driver permanece exclusivamente em driverLines,
 * impedindo que cada edição ou duplicação some novamente o seu valor ao unitPrice.
 */
export function buildSplitBodyPricePatch(
  item: CartItemData,
  bodyUnitPrice: number,
  qty: number,
): Partial<CartItemData> {
  const normalizedQty = Math.max(1, qty);
  const normalizedBodyUnitPrice = roundMoney(Math.max(0, bodyUnitPrice));
  const bodyTotal = roundMoney(normalizedBodyUnitPrice * normalizedQty);
  const driversTotal = (item.driverLines ?? []).reduce((sum, line) => {
    const lineTotal = line.driverTotalPrice
      ?? ((line.driverUnitPrice ?? 0) * (line.driverQty ?? 0));
    return sum + lineTotal;
  }, 0);

  return {
    unitPrice: normalizedBodyUnitPrice,
    unitPriceLuminaria: normalizedBodyUnitPrice,
    priceWithoutDriver: bodyTotal,
    totalPrice: roundMoney(bodyTotal + driversTotal),
    luminariaHasApiPrice: item.luminariaHasApiPrice,
  };
}

/**
 * Atualiza somente uma linha de driver e recompõe o total comercial a partir
 * da luminária já persistida. Nunca recalcula o preço da peça pelo driver.
 */
export function buildSplitDriverPricePatch(
  item: CartItemData,
  driverIndex: number,
  driverUnitPrice: number | null,
): Partial<CartItemData> {
  const driverLines = (item.driverLines ?? []).map((line, index) => {
    if (index !== driverIndex) return line;
    const normalizedPrice = driverUnitPrice == null ? null : roundMoney(Math.max(0, driverUnitPrice));
    return {
      ...line,
      driverUnitPrice: normalizedPrice,
      driverTotalPrice: normalizedPrice == null
        ? null
        : roundMoney(normalizedPrice * (line.driverQty ?? 0)),
      // Uma edição comercial deliberada deve sobreviver a toda reidratação da API.
      driverPriceManual: true,
    };
  });
  const qty = Math.max(1, item.qty ?? 1);
  const bodyUnitPrice = getEditableBodyUnitPrice(item);
  const bodyTotal = bodyUnitPrice != null
    ? roundMoney(bodyUnitPrice * qty)
    : Math.max(0, item.priceWithoutDriver ?? item.totalPrice ?? 0);
  const driversTotal = driverLines.reduce((sum, line) => {
    const lineTotal = line.driverTotalPrice
      ?? ((line.driverUnitPrice ?? 0) * (line.driverQty ?? 0));
    return sum + lineTotal;
  }, 0);

  return {
    driverLines,
    unitPriceDriver: driverUnitPrice,
    priceWithoutDriver: bodyTotal,
    totalPrice: roundMoney(bodyTotal + driversTotal),
  };
}

/** Cria uma cópia profunda para que a duplicata não compartilhe arrays ou objetos de preço. */
export function cloneCartItemData(item: CartItemData): CartItemData {
  return JSON.parse(JSON.stringify(item)) as CartItemData;
}
