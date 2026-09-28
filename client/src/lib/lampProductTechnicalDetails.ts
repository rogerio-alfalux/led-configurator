export interface LampTechnicalProduct {
  name: string;
  isLamp?: boolean | null;
  productStructure?: {
    lightingMode?: string | null;
  } | null;
}

/**
 * A luminária do tipo LAMP recebe CCT, tensão e comando da lâmpada/acessório
 * escolhido separadamente; esses dados não pertencem ao corpo da luminária.
 */
export function isLampBasedProduct(product: LampTechnicalProduct): boolean {
  return product.isLamp === true || product.productStructure?.lightingMode === "LAMP";
}

/**
 * Monta a descrição comercial somente com dados que pertencem à luminária.
 */
export function buildFixtureCommercialDescription(
  product: LampTechnicalProduct,
  technical: { cct?: string | null; control?: string | null; voltage?: string | null },
): string {
  const name = product.name.trim();
  if (isLampBasedProduct(product)) return name;

  return [name, technical.cct, technical.control, technical.voltage]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" ");
}
