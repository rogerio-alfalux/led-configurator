/**
 * Catálogo estático de preços por metro linear para perfis modulares.
 *
 * Fonte: Comparativolineares25.05.26Dennisfinal.xlsx
 *
 * Lógica de controle:
 *   - ON/OFF 220V = ON/OFF Bivolt = preço base da planilha
 *   - DIM DALI = DIM 1-10V = preço base + R$ 160,00/m
 *
 * Chave: profileCode (ex: "LLP-6060") → wattagem → preços
 *
 * Wattagens disponíveis: 18W, 26W, 36W
 */

const DIM_SURCHARGE = 160; // R$/m adicional para DIM DALI e DIM 1-10V

export interface ProfilePriceEntry {
  /** Preço base por metro (ON/OFF 220V e ON/OFF Bivolt) */
  onoff: number;
  /** Preço por metro para DIM DALI (onoff + 160) */
  dimDali: number;
  /** Preço por metro para DIM 1-10V (onoff + 160) */
  dim110v: number;
}

/** Mapa de preços: profileCode → wattagem → preços */
export type ProfilePriceByWatt = Record<number, ProfilePriceEntry>;
export type StaticProfilePriceMap = Record<string, ProfilePriceByWatt>;

function entry(base: number): ProfilePriceEntry {
  return {
    onoff: base,
    dimDali: base + DIM_SURCHARGE,
    dim110v: base + DIM_SURCHARGE,
  };
}

/**
 * Catálogo estático de preços.
 *
 * Mapeamento planilha → profileCodes:
 *
 * BLAZE E (embutir)          → LLE-2810
 * EASY PRIME E (embutir)     → LLE-2580
 * SKYLINE E (embutir)        → LLE-2052
 * BLAZE H P D1 (pendente)    → LLP-6060  (D1)
 * BLAZE H P D1+D2 (pendente) → LLP-6060  (D1+D2)
 * MINI BLAZE P/S             → LLP-3336, LLS-3336
 * EASY H PLUS D1             → LLP-4450, LLA-4450  (D1)
 * EASY H PLUS D1+D2          → LLP-4450, LLA-4450  (D1+D2)
 * HIT P D1                   → LLP-4251, LLA-3395  (D1)
 * HIT P D1+D2                → LLP-4251, LLA-3395  (D1+D2)
 * BLAZE S D1 (sobrepor)      → LLS-3945, LLA-5945  (D1 sobrepor)
 *
 * Perfis sem preço na planilha (SHARP, FLOW, SOFT, SMART MINI, BLAZE pendente/sobrepor genérico):
 * não incluídos — preço não exibido.
 */
export const STATIC_PROFILE_PRICES: StaticProfilePriceMap = {
  // ── BLAZE E (embutir) ────────────────────────────────────────────────────
  "LLE-2810": {
    18: entry(330),
    26: entry(340),
    36: entry(360),
  },

  // ── EASY PRIME E (embutir) ───────────────────────────────────────────────
  "LLE-2580": {
    18: entry(310),
    26: entry(320),
    36: entry(340),
  },

  // ── SKYLINE E (embutir) ──────────────────────────────────────────────────
  "LLE-2052": {
    18: entry(270),
    26: entry(280),
    36: entry(300),
  },

  // ── BLAZE H P (pendente) — D1 e D1+D2 têm preços diferentes ─────────────
  // D1 simples
  "LLP-6060-D1": {
    18: entry(410),
    26: entry(420),
    36: entry(440),
  },
  // D1+D2
  "LLP-6060-D1D2": {
    18: entry(460),
    26: entry(480),
    36: entry(520),
  },

  // ── MINI BLAZE P/S (pendente e sobrepor) ─────────────────────────────────
  "LLP-3336": {
    18: entry(310),
    26: entry(320),
    36: entry(340),
  },
  "LLS-3336": {
    18: entry(310),
    26: entry(320),
    36: entry(340),
  },

  // ── EASY H PLUS (pendente) — D1 e D1+D2 têm preços diferentes ───────────
  // D1 simples
  "LLP-4450-D1": {
    18: entry(470),
    26: entry(480),
    36: entry(500),
  },
  "LLA-4450-D1": {
    18: entry(470),
    26: entry(480),
    36: entry(500),
  },
  // D1+D2
  "LLP-4450-D1D2": {
    18: entry(600),
    26: entry(620),
    36: entry(660),
  },
  "LLA-4450-D1D2": {
    18: entry(600),
    26: entry(620),
    36: entry(660),
  },

  // ── HIT P (pendente) — D1 e D1+D2 têm preços diferentes ─────────────────
  // D1 simples
  "LLP-4251-D1": {
    18: entry(410),
    26: entry(420),
    36: entry(440),
  },
  "LLA-3395-D1": {
    18: entry(410),
    26: entry(420),
    36: entry(440),
  },
  // D1+D2
  "LLP-4251-D1D2": {
    18: entry(520),
    26: entry(550),
    36: entry(600),
  },
  "LLA-3395-D1D2": {
    18: entry(520),
    26: entry(550),
    36: entry(600),
  },

  // ── BLAZE S D1 (sobrepor) ────────────────────────────────────────────────
  "LLS-3945": {
    18: entry(370),
    26: entry(380),
    36: entry(400),
  },
  "LLA-5945": {
    18: entry(370),
    26: entry(380),
    36: entry(400),
  },

  // ── SKYLINE P (pendente) — mesmo código LLP-4536 ─────────────────────────
  // Não consta na planilha; sem preço estático.
};

/**
 * Retorna o preço por metro para um perfil/wattagem/controle/aplicação.
 *
 * @param profileCode  Código do perfil (ex: "LLP-6060")
 * @param powerW       Potência em W (18, 26 ou 36)
 * @param controlType  "onoff" | "dimDali" | "dim110v"
 * @param isDual       true quando a configuração é D1+D2
 * @returns preço por metro ou null se não cadastrado
 */
export function getStaticPricePerMeter(
  profileCode: string,
  powerW: number,
  controlType: "onoff" | "dimDali" | "dim110v",
  isDual: boolean
): number | null {
  // Normalizar wattagem para a mais próxima disponível (18/26/36)
  const normalizedW = powerW <= 18 ? 18 : powerW <= 26 ? 26 : 36;

  // Tentar chave com sufixo D1D2 ou D1 primeiro (para perfis com preços distintos)
  const suffix = isDual ? "-D1D2" : "-D1";
  const keyWithSuffix = profileCode + suffix;
  const keyPlain = profileCode;

  const byWatt =
    STATIC_PROFILE_PRICES[keyWithSuffix] ??
    STATIC_PROFILE_PRICES[keyPlain] ??
    null;

  if (!byWatt) return null;

  const priceEntry = byWatt[normalizedW] ?? null;
  if (!priceEntry) return null;

  return priceEntry[controlType];
}

// ─── Engine de Cálculo por Módulo (Novo Método — BLAZE H e futuros) ──────────
//
// Perfis que usam o novo método: aqueles que têm custoCorpo* preenchido na API.
// Perfis que continuam no método antigo: BLAZE E, EASY PRIME, SKYLINE, MINI BLAZE,
// EASY H PLUS, HIT, BLAZE S, e todos os que não têm custoCorpo* na API.
//
// Fórmula:
//   precoLuminaria = custoCorpo[controle] × markupLuminaria
//   precoDriver    = custoDriver[controle] × markupDriver (padrão = 3)
//   precoModulo    = precoLuminaria + precoDriver
//   precoTotal     = soma(precoModulo × qtdModulos por trecho)
//
// O custo NUNCA é exposto ao usuário — apenas o preço de venda calculado.

import type { ProfileVariant } from "./ledCatalog";

export type ModuleControlType =
  | "onoff220v"
  | "onoffBivolt"
  | "dim110v"
  | "dimDali"
  | "dimTriac110v"
  | "dimTriac220v";

export interface ModulePriceInput {
  variant: ProfileVariant;
  controlType: ModuleControlType;
  isD1D2: boolean;
  /** Número total de módulos na composição */
  nModules: number;
  /** Markup da luminária (substituído pelo usuário Dennis/Vivian). Se null, usa markupPadrao da API. */
  markupLuminaria?: number | null;
  /** Markup do driver (padrão = 3). Se null, usa markupMinimoDriver da API ou 3. */
  markupDriver?: number | null;
}

export interface ModulePriceResult {
  /** Preço de venda da luminária (sem driver) por módulo */
  precoLuminariaPorModulo: number;
  /** Preço de venda do driver por módulo */
  precoDriverPorModulo: number;
  /** Preço total da luminária (todos os módulos) */
  precoLuminariaTotal: number;
  /** Preço total dos drivers (todos os módulos) */
  precoDriverTotal: number;
  /** Preço total da composição */
  total: number;
  /** Markup da luminária efetivamente aplicado */
  markupLuminariaAplicado: number;
  /** Markup padrão da API (para exibir referência) */
  markupPadrao: number;
  /** Markup mínimo da API (limite inferior) */
  markupMinimo: number;
  /** Markup do driver aplicado */
  markupDriverAplicado: number;
  /** true = preço calculado via API; false = sem dados de custo na API */
  fromApi: boolean;
}

/**
 * Extrai o custo do corpo para o controle e aplicação selecionados.
 * Retorna null se não houver custo cadastrado.
 */
function getCustoCorpo(
  variant: ProfileVariant,
  controlType: ModuleControlType,
  isD1D2: boolean
): number | null {
  if (isD1D2) {
    switch (controlType) {
      case "onoff220v":    return variant.custoCorpoOnoff220vD1D2 ?? null;
      case "onoffBivolt":  return variant.custoCorpoOnoffBivoltD1D2 ?? null;
      case "dim110v":      return variant.custoCorpoDim110vD1D2 ?? null;
      case "dimDali":      return variant.custoCorpoDimDaliD1D2 ?? null;
      case "dimTriac110v": return variant.custoCorpoDimTriac110vD1D2 ?? null;
      case "dimTriac220v": return variant.custoCorpoDimTriac220vD1D2 ?? null;
    }
  }
  switch (controlType) {
    case "onoff220v":    return variant.custoCorpoOnoff220v ?? null;
    case "onoffBivolt":  return variant.custoCorpoOnoffBivolt ?? null;
    case "dim110v":      return variant.custoCorpoDim110v ?? null;
    case "dimDali":      return variant.custoCorpoDimDali ?? null;
    case "dimTriac110v": return variant.custoCorpoDimTriac110v ?? null;
    case "dimTriac220v": return variant.custoCorpoDimTriac220v ?? null;
  }
}

/**
 * Extrai o markup padrão para o controle selecionado.
 * Retorna null se não houver markup cadastrado.
 */
function getMarkupPadrao(
  variant: ProfileVariant,
  controlType: ModuleControlType
): number | null {
  switch (controlType) {
    case "onoff220v":    return variant.markupPadraoOnoff220v ?? null;
    case "onoffBivolt":  return variant.markupPadraoOnoffBivolt ?? null;
    case "dim110v":      return variant.markupPadraoDim110v ?? null;
    case "dimDali":      return variant.markupPadraoDimDali ?? null;
    case "dimTriac110v": return variant.markupPadraoDimTriac110v ?? null;
    case "dimTriac220v": return variant.markupPadraoDimTriac220v ?? null;
  }
}

/**
 * Extrai o markup mínimo para o controle selecionado.
 * Retorna null se não houver markup cadastrado.
 */
function getMarkupMinimo(
  variant: ProfileVariant,
  controlType: ModuleControlType
): number | null {
  switch (controlType) {
    case "onoff220v":    return variant.markupMinimoOnoff220v ?? null;
    case "onoffBivolt":  return variant.markupMinimoOnoffBivolt ?? null;
    case "dim110v":      return variant.markupMinimoDim110v ?? null;
    case "dimDali":      return variant.markupMinimoDimDali ?? null;
    case "dimTriac110v": return variant.markupMinimoDimTriac110v ?? null;
    case "dimTriac220v": return variant.markupMinimoDimTriac220v ?? null;
  }
}

/**
 * Verifica se um perfil usa o novo método de cálculo por módulo (custo × markup da API).
 * Retorna true se houver pelo menos um campo custoCorpo* preenchido.
 */
export function usesModulePricing(variant: ProfileVariant): boolean {
  return (
    variant.custoCorpoOnoff220v != null ||
    variant.custoCorpoOnoffBivolt != null ||
    variant.custoCorpoDim110v != null ||
    variant.custoCorpoDimDali != null ||
    variant.custoCorpoDimTriac110v != null ||
    variant.custoCorpoDimTriac220v != null ||
    variant.custoCorpoOnoff220vD1D2 != null ||
    variant.custoCorpoOnoffBivoltD1D2 != null ||
    variant.custoCorpoDim110vD1D2 != null ||
    variant.custoCorpoDimDaliD1D2 != null ||
    variant.custoCorpoDimTriac110vD1D2 != null ||
    variant.custoCorpoDimTriac220vD1D2 != null
  );
}

/**
 * Mapeia o controlType do engine de composição para ModuleControlType.
 * O engine usa "onoff" (genérico), "dimDali", "dim110v".
 * A tensão (220V vs Bivolt) é necessária para discriminar ON/OFF.
 */
export function toModuleControlType(
  controlType: string,
  voltage: string
): ModuleControlType {
  if (controlType === "dimDali") return "dimDali";
  if (controlType === "dim110v") return "dim110v";
  if (controlType === "dimTriac110v") return "dimTriac110v";
  if (controlType === "dimTriac220v") return "dimTriac220v";
  // ON/OFF: discriminar por tensão
  if (/bivolt/i.test(voltage)) return "onoffBivolt";
  return "onoff220v";
}

/**
 * Calcula o preço de venda por módulo usando custo × markup da API.
 *
 * O custo NUNCA é exposto — apenas o preço de venda calculado é retornado.
 * Retorna null se não houver dados de custo na API para o controle selecionado.
 */
export function calcModulePrice(input: ModulePriceInput): ModulePriceResult | null {
  const { variant, controlType, isD1D2, nModules } = input;

  const custoCorpo = getCustoCorpo(variant, controlType, isD1D2);
  if (custoCorpo == null) return null;

  const markupPadrao = getMarkupPadrao(variant, controlType) ?? 2;
  const markupMinimo = getMarkupMinimo(variant, controlType) ?? 1;
  const markupDriverPadrao = variant.markupMinimoDriver ?? 3;

  // Markup efetivo: respeitar range [mínimo, padrão]
  let markupLuminariaAplicado = input.markupLuminaria ?? markupPadrao;
  markupLuminariaAplicado = Math.max(markupMinimo, Math.min(markupPadrao, markupLuminariaAplicado));

  const markupDriverAplicado = input.markupDriver ?? markupDriverPadrao;

  // Preço de venda por módulo
  const precoLuminariaPorModulo = Math.round(custoCorpo * markupLuminariaAplicado * 100) / 100;
  // Driver: custo do driver não está disponível ainda → precoDriver = 0 por enquanto
  // Quando a API fornecer custoDriver*, substituir aqui
  const precoDriverPorModulo = 0;

  const precoLuminariaTotal = Math.round(precoLuminariaPorModulo * nModules * 100) / 100;
  const precoDriverTotal = Math.round(precoDriverPorModulo * nModules * 100) / 100;
  const total = Math.round((precoLuminariaTotal + precoDriverTotal) * 100) / 100;

  return {
    precoLuminariaPorModulo,
    precoDriverPorModulo,
    precoLuminariaTotal,
    precoDriverTotal,
    total,
    markupLuminariaAplicado,
    markupPadrao,
    markupMinimo,
    markupDriverAplicado,
    fromApi: true,
  };
}
