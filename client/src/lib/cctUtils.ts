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
