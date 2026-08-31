import type { DriverLine } from "@/lib/cartTypes";

export interface GlowCommercialItemInput {
  productName: string;
  sku: string;
  cct: string;
  controle: string;
  tensao: string;
  quantity: number;
  apiUnitPrice: number | null;
  priceWithoutDriver: number | null;
  driverLines: DriverLine[];
  hasApiPricing: boolean;
  driverModel: string;
  driverCode: string;
}

/**
 * Forma o bloco comercial persistido pelo GLOW sem perder o controle escolhido
 * nem o desmembramento entre corpo e driver recebido da API.
 */
export function buildGlowCommercialItem(input: GlowCommercialItemInput) {
  const quantity = Math.max(1, input.quantity || 1);
  const fallbackBodyTotal = input.apiUnitPrice != null
    ? Math.round(input.apiUnitPrice * quantity * 100) / 100
    : null;
  const driverTotal = input.driverLines.reduce(
    (sum, line) => sum + (line.driverTotalPrice ?? 0),
    0,
  );
  const bodyTotal = input.priceWithoutDriver ?? fallbackBodyTotal;
  const totalPrice = input.hasApiPricing || bodyTotal != null || driverTotal > 0
    ? Math.round(((bodyTotal ?? 0) + driverTotal) * 100) / 100
    : null;
  const controlLabel = input.controle.toUpperCase();

  return {
    description: `${input.productName} ${input.cct} ${input.controle} ${input.tensao}`,
    quoteSummary: `${input.productName} ${input.cct} ${input.controle} ${input.tensao}`.toUpperCase(),
    orderSummary: `CÓDIGO: ${input.sku}\n${input.productName.toUpperCase()} ${input.cct} ${controlLabel} ${input.tensao} COM DRIVER ${input.driverModel.toUpperCase()} (${input.driverCode})`,
    totalPrice,
    priceFromApi: input.apiUnitPrice != null || input.hasApiPricing,
  };
}
