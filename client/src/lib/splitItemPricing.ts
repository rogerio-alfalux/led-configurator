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

  return {
    unitPrice: normalizedBodyUnitPrice,
    unitPriceLuminaria: normalizedBodyUnitPrice,
    priceWithoutDriver: bodyTotal,
    totalPrice: bodyTotal,
    luminariaHasApiPrice: item.luminariaHasApiPrice,
  };
}

/** Cria uma cópia profunda para que a duplicata não compartilhe arrays ou objetos de preço. */
export function cloneCartItemData(item: CartItemData): CartItemData {
  return JSON.parse(JSON.stringify(item)) as CartItemData;
}
