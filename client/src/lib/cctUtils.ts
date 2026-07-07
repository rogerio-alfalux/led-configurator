/**
 * Utilitário para atualizar todos os campos dependentes do CCT em um CartItemData.
 *
 * Quando o usuário altera a temperatura de cor (CCT) de um item já no carrinho ou
 * no editor de orçamento, os seguintes campos precisam ser atualizados:
 *   - cct: novo valor
 *   - description: substituir CCT antigo pelo novo
 *   - moduloLed: substituir CCT antigo pelo novo (ex: "Stripflex 562,5 x 10mm 36L 3000K" → "...4000K")
 *   - orderSummary: substituir CCT antigo pelo novo
 *   - quoteSummary: substituir CCT antigo pelo novo
 *
 * Para perfis (profileSegments), o CCT não afeta os SKUs dos módulos — apenas o nome
 * da barra Stripflex/Stripline que é exibido na ficha de produção. Esse nome é
 * reconstruído a partir do padrão "Stripflex 562,5 x 10mm 36L {CCT}" ou
 * "Stripline 562,5 x 15mm 105L {CCT}".
 */

import type { CartItemData } from "./cartTypes";

const CCT_PATTERN = /\b(2700K|3000K|4000K|5000K|A definir)\b/gi;

/**
 * Substitui todas as ocorrências de qualquer CCT padrão por `newCCT` em uma string.
 */
function replaceCCT(text: string, newCCT: string): string {
  return text.replace(CCT_PATTERN, newCCT);
}

/**
 * Aplica a troca de CCT em todos os campos relevantes de um CartItemData.
 * Retorna um novo objeto com os campos atualizados (não muta o original).
 */
export function applyCCTChange(
  item: CartItemData,
  newCCT: string
): Partial<CartItemData> {
  const patch: Partial<CartItemData> = { cct: newCCT };

  // Atualizar description
  if (item.description) {
    patch.description = replaceCCT(item.description, newCCT);
  }

  // Atualizar moduloLed (ex: "Stripflex 562,5 x 10mm 36L 3000K" → "...4000K")
  if (item.moduloLed) {
    patch.moduloLed = replaceCCT(item.moduloLed, newCCT);
  }

  // Atualizar orderSummary
  if (item.orderSummary) {
    patch.orderSummary = replaceCCT(item.orderSummary, newCCT);
  }

  // Atualizar quoteSummary
  if (item.quoteSummary) {
    patch.quoteSummary = replaceCCT(item.quoteSummary, newCCT);
  }

  return patch;
}

/**
 * Aplica a troca de preço unitário em todos os campos relevantes de um CartItemData.
 *
 * Quando o usuário edita o preço unitário manualmente, os seguintes campos precisam
 * ser atualizados:
 *   - unitPrice: novo valor
 *   - totalPrice: unitPrice × qty
 *   - unitPriceLuminaria: igual ao unitPrice (para itens com driverLines)
 *   - priceWithoutDriver: unitPrice × qty (para itens com driverLines)
 *   - luminariaHasApiPrice: false (o preço agora é manual, não da API)
 *
 * Para itens sem driverLines, apenas unitPrice e totalPrice são atualizados.
 */
export function applyUnitPriceChange(
  item: CartItemData,
  newUnitPrice: number | null,
  newQty?: number
): Partial<CartItemData> {
  const qty = newQty ?? item.qty ?? 1;
  const patch: Partial<CartItemData> = {
    unitPrice: newUnitPrice,
    totalPrice: newUnitPrice != null ? newUnitPrice * qty : null,
  };

  // Para itens com driverLines: sincronizar unitPriceLuminaria e priceWithoutDriver
  if (item.driverLines && item.driverLines.length > 0) {
    patch.unitPriceLuminaria = newUnitPrice;
    patch.priceWithoutDriver = newUnitPrice != null ? newUnitPrice * qty : null;
    // Marcar que o preço não é mais da API (foi sobrescrito manualmente)
    patch.luminariaHasApiPrice = false;
  }

  return patch;
}

/**
 * Recalcula priceWithoutDriver e driverLines quando qty muda em item com driverLines.
 * Mantém unitPriceLuminaria inalterado, apenas recalcula os totais.
 *
 * REGRA INEGOCIÁVEL: driverQty = driverQtyPerUnit × newQty
 * O driverQtyPerUnit é a quantidade de drivers por luminária (ex: 17 para BLAZE 45700mm).
 * Quando qty muda de 1 para 12, driverQty deve ser 17 × 12 = 204.
 */
export function applyQtyChange(
  item: CartItemData,
  newQty: number
): Partial<CartItemData> {
  const patch: Partial<CartItemData> = { qty: newQty };

  // Recalcular totalPrice
  const up = item.unitPrice;
  if (up != null) {
    patch.totalPrice = up * newQty;
  }

  // Para itens com driverLines: recalcular driverQty, driverTotalPrice e priceWithoutDriver
  if (item.driverLines && item.driverLines.length > 0) {
    // driverQtyPerUnit: quantidade de drivers por luminária (salvo quando o item foi adicionado)
    // Fallback: derivar do driverQty atual dividido pela qty atual
    const oldQty = item.qty && item.qty > 0 ? item.qty : 1;
    const newDriverLines = item.driverLines.map(dl => {
      const drvPerUnit = item.driverQtyPerUnit != null && item.driverQtyPerUnit > 0
        ? item.driverQtyPerUnit
        : Math.round((dl.driverQty ?? 1) / oldQty);
      const newDrvQty = drvPerUnit * newQty;
      const newDrvTotal = dl.driverUnitPrice != null
        ? Math.round(dl.driverUnitPrice * newDrvQty * 100) / 100
        : null;
      return { ...dl, driverQty: newDrvQty, driverTotalPrice: newDrvTotal };
    });
    patch.driverLines = newDriverLines;

    if (item.unitPriceLuminaria != null) {
      patch.priceWithoutDriver = item.unitPriceLuminaria * newQty;
    }

    // Recalcular totalPrice com luminária + driver
    if (item.unitPriceLuminaria != null) {
      const drvSum = newDriverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
      const lumTotal = item.unitPriceLuminaria * newQty;
      patch.totalPrice = Math.round((lumTotal + drvSum) * 100) / 100;
    }
  }

  return patch;
}
