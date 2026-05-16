/**
 * quoteSummary.ts
 * Gera o texto resumo para orçamento (voltado ao cliente).
 *
 * Formato:
 *   BLAZE H P 18W - Medida Total: 5675mm
 *   Item 1: 2 x BLAZE H P 18W - 1710mm IF
 *   Item 2: 1 x BLAZE H P 18W - 2255mm ML
 *   Preço Total: R$ 3.400,00  ← apenas quando há preço cadastrado (ON/OFF 220V)
 *
 * Sufixo de instalação: E=Embutir, S=Sobrepor, P=Pendente, A=Arandela
 */

import type { CompositionResult } from "./ledEngine";
import { calculateTotalPrice, formatBRL } from "./priceCatalog";

// Re-exporta formatBRL para compatibilidade com código existente
export { formatBRL };

/** Mapa de tipo de instalação → sufixo de 1 letra */
const INSTALL_SUFFIX: Record<string, string> = {
  EMBUTIR: "E",
  SOBREPOR: "S",
  PENDENTE: "P",
  ARANDELA: "A",
};

/** Extrai o tipo de módulo (IF, ML, IN) do SKU.
 *  Barras inteiras: LLP-6060.4IF.48F → IF | LLP-6060.2ML.48F → ML | LLP-4251.1IN.48F → IN
 *  Barras decimais: LLP-4536.34I.48F → IN | LLP-4536.34F.48F → IF | LLP-4536.34M.48F → ML
 */
function moduleTypeFromSku(sku: string): string {
  // Primeiro tenta o padrão completo (barras inteiras): IF, ML, IN
  const fullMatch = sku.match(/\.(\d+)(IF|ML|IN)\./i);
  if (fullMatch) return fullMatch[2].toUpperCase();
  // Depois tenta o padrão abreviado (barras decimais): F→IF, M→ML, I→IN
  const shortMatch = sku.match(/\.(\d+)(F|M|I)\./i);
  if (shortMatch) {
    const t = shortMatch[2].toUpperCase();
    if (t === "F") return "IF";
    if (t === "M") return "ML";
    if (t === "I") return "IN";
  }
  return "";
}

/**
 * Gera o texto resumo para orçamento.
 * Uma linha de cabeçalho + uma linha por tipo de módulo (SKU distinto)
 * + linha de preço total quando o produto tem preço cadastrado (ON/OFF 220V).
 */
export function generateQuoteSummary(result: CompositionResult): string {
  const suffix = INSTALL_SUFFIX[result.installType] ?? result.installType.charAt(0);
  const productName = result.profileName.toUpperCase();
  const power = result.powerD1;
  const cct = result.cct;

  // Aplicação (D1/D2/D1+D2) — apenas para Pendente e Arandela
  const showApplication = result.installType === "PENDENTE" || result.installType === "ARANDELA";
  const applicationLabel = showApplication
    ? result.application === "D1+D2"
      ? "D1 + D2"
      : result.application === "D2"
      ? "D2"
      : "D1"
    : "";

  // Nome base do produto para o orçamento: "BLAZE H P D1 18W 3000K"
  const appPart = applicationLabel ? ` ${applicationLabel}` : "";
  const productLabel = `${productName} ${suffix}${appPart} ${power}W ${cct}`;

  // Medida total realizada
  const totalMm = result.realizedLength;

  // Construir mapa de SKUs únicos preservando a ordem
  const skuOrder: string[] = [];
  const skuMap = new Map<string, { length: number; quantity: number }>();
  for (const item of result.composition) {
    if (!skuMap.has(item.sku)) {
      skuOrder.push(item.sku);
      skuMap.set(item.sku, { length: item.length, quantity: item.quantity });
    }
  }

  // Linha de cabeçalho
  const header = `${productLabel} - Medida Total: ${totalMm}mm`;

  // Linhas de itens
  const items = skuOrder.map((sku, index) => {
    const info = skuMap.get(sku)!;
    const modType = moduleTypeFromSku(sku);
    const modTypeSuffix = modType ? ` ${modType}` : "";
    const qtyStr = info.quantity === 1 ? "1 x" : `${info.quantity} x`;
    return `Item ${index + 1}: ${qtyStr} ${productLabel} - ${info.length}mm${modTypeSuffix}`;
  });

  // Preço temporariamente oculto — reativar quando necessário
  // const totalPrice = calculateTotalPrice(
  //   result.profileCode,
  //   result.powerD1,
  //   result.voltage,
  //   result.application,
  //   result.realizedLength,
  // );
  // const priceLine = totalPrice !== null ? `Preço Total: ${formatBRL(totalPrice)}` : null;

  return [header, ...items].join("\n");
}
