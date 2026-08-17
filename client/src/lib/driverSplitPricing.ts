export interface DriverSplitPricingInput {
  fallbackUnitPrice?: number | null;
  unitPriceLuminaria?: number | null;
  priceWithoutDriver?: number | null;
  quantity?: number | null;
  hasDriverLines: boolean;
}

/**
 * Seleciona o preço comercial do corpo da luminária quando drivers aparecem
 * separados. Valores de custo/markup retornados pela API têm precedência.
 */
export function resolveDriverSplitCartPricing(input: DriverSplitPricingInput): {
  unitPrice: number | null;
  totalPrice: number | null;
  priceFromApi: boolean;
} {
  const qty = Math.max(1, input.quantity ?? 1);
  const bodyUnit = input.unitPriceLuminaria != null && input.unitPriceLuminaria > 0
    ? input.unitPriceLuminaria
    : null;
  const bodyTotal = input.priceWithoutDriver != null && input.priceWithoutDriver > 0
    ? input.priceWithoutDriver
    : bodyUnit != null ? Math.round(bodyUnit * qty * 100) / 100 : null;

  if (input.hasDriverLines && bodyUnit != null && bodyTotal != null) {
    return { unitPrice: bodyUnit, totalPrice: bodyTotal, priceFromApi: true };
  }

  const fallback = input.fallbackUnitPrice != null && input.fallbackUnitPrice > 0
    ? input.fallbackUnitPrice
    : null;
  return {
    unitPrice: fallback,
    totalPrice: fallback != null ? Math.round(fallback * qty * 100) / 100 : null,
    priceFromApi: fallback != null,
  };
}

/** Valor que deve preencher o editor do corpo quando drivers estão desmembrados. */
export function getEditableBodyUnitPrice(input: Pick<DriverSplitPricingInput, "fallbackUnitPrice" | "unitPriceLuminaria" | "hasDriverLines">): number | null {
  if (input.hasDriverLines && input.unitPriceLuminaria != null && input.unitPriceLuminaria > 0) {
    return input.unitPriceLuminaria;
  }
  return input.fallbackUnitPrice != null && input.fallbackUnitPrice > 0 ? input.fallbackUnitPrice : null;
}
