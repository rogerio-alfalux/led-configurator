/**
 * Lógica de Cálculo - Luminárias SPACE (Painéis Tensionados)
 *
 * Margem de Borda: Subtrair sempre 50mm das dimensões externas (25mm de cada lado)
 * Espaçamento entre Eixos: Fixado em 60% da Altura (0.6 * H)
 * Altura Fixa: 100mm (constante em todas as fórmulas)
 * Fluxo Útil: Potência × 86 (em lm)
 *
 * Fórmulas:
 * - Space R (Redonda):    Metros = (π × (Diâmetro - 50)²) / (2400 × 100)
 * - Space Q (Quadrada):   Metros = ((Largura - 50) × (Comprimento - 50)) / (600 × 100)
 * - Space Ret (Retangular): usa mesma fórmula Space Q com Largura ≠ Comprimento
 *
 * Fonte: Documentação Compartilhada — Lógica de Cálculo SPACE (Maio 2026)
 */

export interface SpaceCalculationResult {
  /** Metros lineares de fita LED */
  metragem: number;
  /** Potência total com fita 5W/m (em Watts) */
  potencia5w: number;
  /** Potência total com fita 10W/m (em Watts) */
  potencia10w: number;
  /** Fluxo luminoso com fita 5W/m (em lúmens) */
  fluxoUtil5w: number;
  /** Fluxo luminoso com fita 10W/m (em lúmens) */
  fluxoUtil10w: number;
  /** Área da tela tensionada (em m²) */
  areaTela: number;
  /** Texto formatado com todos os dados */
  resumo: string;
  /** true se as dimensões são válidas */
  valido: boolean;
}

export interface SpaceRInput {
  /** Diâmetro externo em mm */
  diametro: number;
}

export interface SpaceQInput {
  /** Largura externa em mm */
  largura: number;
  /** Comprimento externo em mm */
  comprimento: number;
}

/** Altura fixa em mm (constante em todas as fórmulas) */
const ALTURA_FIXA = 100;

/** Fator de conversão de Watts para lúmens */
const FATOR_FLUXO = 86;

/**
 * Calcula a metragem e potência para um painel SPACE Redondo (Space R).
 * Fórmula: Metros = (π × (Diâmetro - 50)²) / (2400 × 100)
 */
export function calculateSpaceR(input: SpaceRInput): SpaceCalculationResult {
  const { diametro } = input;

  if (diametro <= 50) {
    return {
      metragem: 0,
      potencia5w: 0,
      potencia10w: 0,
      fluxoUtil5w: 0,
      fluxoUtil10w: 0,
      areaTela: 0,
      resumo: "Dimensões inválidas (diâmetro deve ser > 50mm)",
      valido: false,
    };
  }

  const diametroAjustado = diametro - 50;
  const metragem = (Math.PI * Math.pow(diametroAjustado, 2)) / (2400 * ALTURA_FIXA);

  const potencia5w = metragem * 5;
  const potencia10w = metragem * 10;
  const fluxoUtil5w = potencia5w * FATOR_FLUXO;
  const fluxoUtil10w = potencia10w * FATOR_FLUXO;

  // Área da tela: corte quadrado para Space R
  const areaTela = (diametro * diametro) / 1_000_000;

  const metragemR = Math.round(metragem * 10) / 10;
  const pot5R = Math.round(potencia5w * 10) / 10;
  const pot10R = Math.round(potencia10w * 10) / 10;

  const resumo =
    `Space R Ø${diametro}mm: ${metragemR}m de fita | ` +
    `Pot. 5W/m: ${pot5R}W | Pot. 10W/m: ${pot10R}W | ` +
    `Área tela: ${(Math.round(areaTela * 100) / 100).toFixed(2)}m²`;

  return {
    metragem: metragemR,
    potencia5w: pot5R,
    potencia10w: pot10R,
    fluxoUtil5w: Math.round(fluxoUtil5w),
    fluxoUtil10w: Math.round(fluxoUtil10w),
    areaTela: Math.round(areaTela * 100) / 100,
    resumo,
    valido: true,
  };
}

/**
 * Calcula a metragem e potência para um painel SPACE Quadrado ou Retangular (Space Q / Space Ret).
 * Fórmula: Metros = ((Largura - 50) × (Comprimento - 50)) / (600 × 100)
 * Para Space Q: largura === comprimento
 * Para Space Ret: largura ≠ comprimento
 */
export function calculateSpaceQ(input: SpaceQInput): SpaceCalculationResult {
  const { largura, comprimento } = input;

  if (largura <= 50 || comprimento <= 50) {
    return {
      metragem: 0,
      potencia5w: 0,
      potencia10w: 0,
      fluxoUtil5w: 0,
      fluxoUtil10w: 0,
      areaTela: 0,
      resumo: "Dimensões inválidas (largura e comprimento devem ser > 50mm)",
      valido: false,
    };
  }

  const larguraAjustada = largura - 50;
  const comprimentoAjustado = comprimento - 50;
  const metragem = (larguraAjustada * comprimentoAjustado) / (600 * ALTURA_FIXA);

  const potencia5w = metragem * 5;
  const potencia10w = metragem * 10;
  const fluxoUtil5w = potencia5w * FATOR_FLUXO;
  const fluxoUtil10w = potencia10w * FATOR_FLUXO;

  // Área da tela: área bruta do retângulo
  const areaTela = (largura * comprimento) / 1_000_000;

  const metragemR = Math.round(metragem * 10) / 10;
  const pot5R = Math.round(potencia5w * 10) / 10;
  const pot10R = Math.round(potencia10w * 10) / 10;

  const tipoLabel = largura === comprimento ? `Space Q ${largura}x${comprimento}mm` : `Space Ret ${largura}x${comprimento}mm`;
  const resumo =
    `${tipoLabel}: ${metragemR}m de fita | ` +
    `Pot. 5W/m: ${pot5R}W | Pot. 10W/m: ${pot10R}W | ` +
    `Área tela: ${(Math.round(areaTela * 100) / 100).toFixed(2)}m²`;

  return {
    metragem: metragemR,
    potencia5w: pot5R,
    potencia10w: pot10R,
    fluxoUtil5w: Math.round(fluxoUtil5w),
    fluxoUtil10w: Math.round(fluxoUtil10w),
    areaTela: Math.round(areaTela * 100) / 100,
    resumo,
    valido: true,
  };
}

/** Tipo de formato do painel SPACE */
export type SpaceFormat = "R" | "Q" | "Ret";

/** Rótulos amigáveis para cada formato */
export const SPACE_FORMAT_LABELS: Record<SpaceFormat, string> = {
  R: "Space R — Redondo",
  Q: "Space Q — Quadrado",
  Ret: "Space Ret — Retangular",
};

/** Potências de fita disponíveis */
export type SpacePotencia = "5W/m" | "10W/m";

/**
 * Retorna o SKU genérico da API para o formato/potência selecionado.
 * Space R → LDS-6078
 * Space Q / Space Ret → LDS-6079
 */
export function getSpaceGenericSku(format: SpaceFormat): string {
  return format === "R" ? "LDS-6078" : "LDS-6079";
}

/**
 * Retorna o nome do produto genérico conforme o formato e potência.
 * Esses nomes correspondem exatamente aos retornados pela API.
 */
export function getSpaceGenericName(format: SpaceFormat, potencia: SpacePotencia): string {
  if (format === "R") {
    return potencia === "5W/m"
      ? "SPACE P R LED 5W Ø1000MM GENÉRICA"
      : "SPACE P R LED 10W Ø1000MM GENÉRICA";
  }
  // Q e Ret usam o mesmo produto genérico Q
  return potencia === "5W/m"
    ? "SPACE P Q LED 5W 1000 X 1000MM GENÉRICA"
    : "SPACE P Q LED 10W 1000 X 1000MM GENÉRICA";
}

/**
 * Gera a descrição do item para o carrinho.
 * Ex: "Space R Ø1000mm 5W/m 3000K"
 * Ex: "Space Q 1000x1000mm 10W/m 4000K"
 * Ex: "Space Ret 600x1200mm 5W/m 3000K"
 */
export function getSpaceCartDescription(
  format: SpaceFormat,
  dimensions: { diametro?: number; largura?: number; comprimento?: number },
  potencia: SpacePotencia,
  cct: string
): string {
  let dimStr = "";
  if (format === "R") {
    dimStr = `Ø${dimensions.diametro}mm`;
  } else {
    dimStr = `${dimensions.largura}x${dimensions.comprimento}mm`;
  }
  return `Space ${format} ${dimStr} ${potencia} ${cct}`;
}
