/**
 * alfaluxApiAdapter.ts
 * Converte o formato da API de produtos da Alfalux (novo endpoint /api/products/all)
 * para os tipos internos DownlightProduct, PainelProduct e SpotProduct.
 *
 * Mapeamento de campos (novo formato):
 *   API.name         → nome do produto (era "produto")
 *   API.sku          → sku
 *   API.familia      → familia
 *   API.instalacao   → instalacao
 *   API.ledModule    → módulo LED (era "moduloLed")
 *   API.otica        → otica (null = não aplicável)
 *   API.holder       → holder (null = não aplicável)
 *   API.dissipador   → dissipador (null = não aplicável)
 *   API.driver220    → { model, code } | null  (era driverOnoff220: string)
 *   API.driverBivolt → { model, code } | null  (era driverOnoffBivolt: string)
 *   API.driverDim110v→ { model, code } | null
 *   API.driverDimDali→ { model, code } | null
 *   API.temperaturasCor → string[] (era JSON string)
 */

import type { DownlightProduct } from "./downlightCatalog";
import type { PainelProduct } from "./painelCatalog";
import type { SpotProduct } from "./spotCatalog";
import type { ArandelaProduct } from "./arandelaCatalog";
import type { LedBarProduct, LedBarPotencia, LedBarDifusor } from "./ledBarCatalog";
import { parsePotenciaFromName, parseDifusorFromName } from "./ledBarCatalog";
import type { BageoProduct, BageoAplicacao, BageoInstalacao } from "./bageoCatalog";
import { parseAplicacaoFromName, parseInstalacaoFromApi } from "./bageoCatalog";

/** Formato de um driver retornado pelo /api/products/all */
export interface DriverInfo {
  model: string;
  code: string | null;
}

/**
 * Formato retornado pela API Alfalux via tRPC (espelha AlfaluxProduct no servidor).
 * Todos os campos de driver são objetos { model, code } | null.
 */
export interface ApiProduct {
  categoria: string;
  instalacao: string;
  familia: string;
  sku: string;
  /** Nome do produto (ex: "BLAZE E IF 1.1B 645MM") */
  name: string;
  ledModule: string | null;
  /** Quantidade numérica de módulos LED. null quando não retornado pela API. */
  ledModuleQtd: number | null;
  otica: string | null;
  /** Ótica primária com quantidade embutida. null quando não retornado pela API. */
  oticaPrimaria: string | null;
  /** Ótica secundária com quantidade embutida. null quando não há. */
  oticaSecundaria: string | null;
  holder: string | null;
  /** Quantidade numérica de holders. null quando não retornado pela API. */
  holderQtd: number | null;
  dissipador: string | null;
  fotoUrl: string | null;
  /** Array de temperaturas de cor (ex: ["3000K", "4000K"]) */
  temperaturasCor: string[];
  /** Driver On/Off 220V */
  driver220: DriverInfo | null;
  /** Driver Bivolt */
  driverBivolt: DriverInfo | null;
  /** Driver DIM 1-10V (null = não disponível) */
  driverDim110v: DriverInfo | null;
  /** Driver DIM DALI (null = não disponível) */
  driverDimDali: DriverInfo | null;
  /** Quantidade de drivers ON/OFF 220V. null = driver não existe no produto. */
  driverQtd220: number | null;
  /** Quantidade de drivers Bivolt. null = driver não existe no produto. */
  driverQtdBivolt: number | null;
  /** Quantidade de drivers DIM 1-10V. null = driver não existe no produto. */
  driverQtdDim110v: number | null;
  /** Quantidade de drivers DIM DALI. null = driver não existe no produto. */
  driverQtdDimDali: number | null;
  custoLuminaria: number | null;
  custoDriver220: number | null;
  custoDriverBivolt: number | null;
  custoDriverDim110v: number | null;
  custoDriverDimDali: number | null;
  /** Preço por metro (D1 simples) — ON/OFF 220V */
  precoOnOff220?: number | null;
  /** Preço por metro (D1 simples) — ON/OFF Bivolt */
  precoOnOffBivolt?: number | null;
  /** Preço por metro (D1 simples) — DIM 1-10V */
  precoDim110v?: number | null;
  /** Preço por metro (D1 simples) — DIM DALI */
  precoDimDali?: number | null;
  /** Preço por metro (D1 isolado) — ON/OFF 220V */
  precoOnOff220D1?: number | null;
  /** Preço por metro (D1 isolado) — ON/OFF Bivolt */
  precoOnOffBivoltD1?: number | null;
  /** Preço por metro (D1 isolado) — DIM 1-10V */
  precoDim110vD1?: number | null;
  /** Preço por metro (D1 isolado) — DIM DALI */
  precoDimDaliD1?: number | null;
  /** Preço por metro (D1+D2 duplo) — ON/OFF 220V */
  precoOnOff220D1D2?: number | null;
  /** Preço por metro (D1+D2 duplo) — ON/OFF Bivolt */
  precoOnOffBivoltD1D2?: number | null;
  /** Preço por metro (D1+D2 duplo) — DIM 1-10V */
  precoDim110vD1D2?: number | null;
  /** Preço por metro (D1+D2 duplo) — DIM DALI */
  precoDimDaliD1D2?: number | null;
  precoMetro?: number | null;
}

/** Normaliza CCTs: garante sufixo "K" */
function normalizeCCTs(temperaturasCor: string[]): string[] {
  if (!Array.isArray(temperaturasCor) || temperaturasCor.length === 0) return ["3000K"];
  return temperaturasCor.map((k) => (k.endsWith("K") ? k : `${k}K`));
}

/**
 * Extrai o código EQ de um DriverInfo, se disponível.
 * Prioridade:
 *   1. Campo `code` separado da API (formato futuro: sempre aqui)
 *   2. EQ embutido no `model` entre parênteses (formato legado)
 * Retorna string vazia se não houver código.
 */
function driverCode(d: DriverInfo): string {
  // 1. Campo code separado (formato atual e futuro)
  if (d.code && d.code.trim()) return d.code.trim();
  // 2. Fallback legado: EQ embutido no model (ex: "PHILIPS 44W (EQ00347)")
  const match = d.model.match(/\(?(EQ\d{5})\)?/);
  return match ? match[1] : "";
}

/**
 * Normaliza o modelo do driver removendo o código EQ embutido.
 * Suporta tanto EQ no final (legado) quanto EQ em qualquer posição entre parênteses.
 * No formato futuro, o EQ não estará no model, então esta função retorna o model sem alterações.
 */
function driverModel(d: DriverInfo): string {
  // Remove EQ embutido entre parênteses em qualquer posição do model
  return d.model.replace(/\s*\(EQ\d{5}\)\s*/g, " ").trim();
}

/**
 * Resolve o campo ótica a partir dos campos da API.
 * Prioridade:
 *   1. Se `oticaPrimaria` estiver presente, constrói a string combinando todos os campos de ótica
 *      separados por " + " (oticaPrimaria + oticaSecundaria + ... conforme a API expandir).
 *   2. Caso contrário, usa o campo `otica` diretamente como retornado pela API.
 * Nunca infere ou adiciona dados que não vieram da API.
 */
function resolveOtica(p: ApiProduct): string | null {
  if (p.oticaPrimaria) {
    const parts = [p.oticaPrimaria, p.oticaSecundaria].filter(Boolean) as string[];
    return parts.join(" + ");
  }
  return p.otica ?? null;
}

/** Converte um produto da API para DownlightProduct */
function toDownlightProduct(p: ApiProduct): DownlightProduct {
  const d220 = p.driver220;
  const dBivolt = p.driverBivolt;
  const dDim110v = p.driverDim110v;
  const dDimDali = p.driverDimDali;
  const dDimTriac110v = (p as any).driverDimTriac110v ?? null;
  const dDimTriac220v = (p as any).driverDimTriac220v ?? null;
  const ccts = normalizeCCTs(p.temperaturasCor);

  return {
    instalacao: p.instalacao,
    familia: p.familia,
    sku: p.sku,
    name: p.name,
    holder: p.holder ?? null,
    holderQtd: p.holderQtd ?? null,
    otica: resolveOtica(p),
    oticaPrimaria: p.oticaPrimaria ?? null,
    oticaSecundaria: p.oticaSecundaria ?? null,
    dissipador: p.dissipador ?? null,
    // Remove [CCT] do ledModule — substituído pela CCT selecionada pelo usuário na UI
    ledModule: p.ledModule ? p.ledModule.replace(/\[CCT\]/gi, "").trim() : "",
    ledModuleQtd: p.ledModuleQtd ?? null,
    ccts,
    driver220: d220
      ? { model: driverModel(d220), code: driverCode(d220) }
      : { model: "", code: "" },
    driverBivolt: dBivolt
      ? { model: driverModel(dBivolt), code: driverCode(dBivolt) }
      : null,
    driverDim110v: dDim110v
      ? { model: driverModel(dDim110v), code: driverCode(dDim110v) }
      : null,
    driverDimDali: dDimDali
      ? { model: driverModel(dDimDali), code: driverCode(dDimDali) }
      : null,
    driverDimTriac110v: dDimTriac110v
      ? { model: driverModel(dDimTriac110v), code: driverCode(dDimTriac110v) }
      : null,
    driverDimTriac220v: dDimTriac220v
      ? { model: driverModel(dDimTriac220v), code: driverCode(dDimTriac220v) }
      : null,
    driverQtd220: p.driverQtd220 ?? null,
    driverQtdBivolt: p.driverQtdBivolt ?? null,
    driverQtdDim110v: p.driverQtdDim110v ?? null,
    driverQtdDimDali: p.driverQtdDimDali ?? null,
    driverQtdDimTriac110v: (p as any).driverQtdDimTriac110v ?? null,
    driverQtdDimTriac220v: (p as any).driverQtdDimTriac220v ?? null,
    precoOnOff220: p.precoOnOff220 ?? null,
    precoOnOffBivolt: p.precoOnOffBivolt ?? null,
    precoDim110v: p.precoDim110v ?? null,
    precoDimDali: p.precoDimDali ?? null,
    precoDimTriac110v: (p as any).precoDimTriac110v ?? null,
    precoDimTriac220v: (p as any).precoDimTriac220v ?? null,
  };
}

/** Converte um produto da API para SpotProduct */
function toSpotProduct(p: ApiProduct): SpotProduct {
  const d220 = p.driver220;
  const dBivolt = p.driverBivolt;
  const ccts = normalizeCCTs(p.temperaturasCor);

  return {
    instalacao: p.instalacao,
    familia: p.familia,
    sku: p.sku || null,
    name: p.name,
    ledModule: p.ledModule ? p.ledModule.replace(/\[CCT\]/gi, "").trim() : null,
    ledModuleQtd: p.ledModuleQtd ?? null,
    otica: resolveOtica(p),
    oticaPrimaria: p.oticaPrimaria ?? null,
    oticaSecundaria: p.oticaSecundaria ?? null,
    holder: p.holder ?? null,
    holderQtd: p.holderQtd ?? null,
    dissipador: p.dissipador ?? null,
    driver220: d220
      ? { model: driverModel(d220), code: driverCode(d220) }
      : { model: "", code: "" },
    driverBivolt: dBivolt
      ? { model: driverModel(dBivolt), code: driverCode(dBivolt) }
      : null,
    driverQtd220: p.driverQtd220 ?? null,
    driverQtdBivolt: p.driverQtdBivolt ?? null,
    ccts,
    fotoUrl: normalizeFotoUrl(p.fotoUrl),
    precoOnOff220: p.precoOnOff220 ?? null,
    precoOnOffBivolt: p.precoOnOffBivolt ?? null,
    precoDim110v: p.precoDim110v ?? null,
    precoDimDali: p.precoDimDali ?? null,
  };
}

/** Converte um produto da API para PainelProduct */
function toPainelProduct(p: ApiProduct): PainelProduct {
  const d220 = p.driver220;
  const dBivolt = p.driverBivolt;
  const dDim110v = p.driverDim110v;
  const dDimDali = p.driverDimDali;
  const dDimTriac110v = (p as any).driverDimTriac110v ?? null;
  const dDimTriac220v = (p as any).driverDimTriac220v ?? null;

  const driver220: PainelProduct["driver220"] = d220
    ? { model: driverModel(d220), code: driverCode(d220) }
    : { model: "", code: "" };

  const driverBivolt: PainelProduct["driverBivolt"] = dBivolt
    ? { model: driverModel(dBivolt), code: driverCode(dBivolt) }
    : null;

  const driverDim110v: PainelProduct["driverDim110v"] = dDim110v
    ? { model: driverModel(dDim110v), code: driverCode(dDim110v) }
    : null;

  const driverDimDali: PainelProduct["driverDimDali"] = dDimDali
    ? { model: driverModel(dDimDali), code: driverCode(dDimDali) }
    : null;

  const driverDimTriac110v: PainelProduct["driverDimTriac110v"] = dDimTriac110v
    ? { model: driverModel(dDimTriac110v), code: driverCode(dDimTriac110v) }
    : null;

  const driverDimTriac220v: PainelProduct["driverDimTriac220v"] = dDimTriac220v
    ? { model: driverModel(dDimTriac220v), code: driverCode(dDimTriac220v) }
    : null;

  const cctsPainel = normalizeCCTs(p.temperaturasCor);

  return {
    instalacao: p.instalacao,
    familia: p.familia,
    sku: p.sku || null,
    name: p.name,
    ledModule: p.ledModule ? p.ledModule.replace(/\[CCT\]/gi, "").trim() : null,
    ccts: cctsPainel,
    driver220,
    driverBivolt,
    driverDim110v,
    driverDimDali,
    driverDimTriac110v,
    driverDimTriac220v,
    driverQtd220: p.driverQtd220 ?? null,
    driverQtdBivolt: p.driverQtdBivolt ?? null,
    driverQtdDim110v: p.driverQtdDim110v ?? null,
    driverQtdDimDali: p.driverQtdDimDali ?? null,
    driverQtdDimTriac110v: (p as any).driverQtdDimTriac110v ?? null,
    driverQtdDimTriac220v: (p as any).driverQtdDimTriac220v ?? null,
    precoOnOff220: p.precoOnOff220 ?? null,
    precoOnOffBivolt: p.precoOnOffBivolt ?? null,
    precoDim110v: p.precoDim110v ?? null,
    precoDimDali: p.precoDimDali ?? null,
    precoDimTriac110v: (p as any).precoDimTriac110v ?? null,
    precoDimTriac220v: (p as any).precoDimTriac220v ?? null,
    fotoUrl: normalizeFotoUrl(p.fotoUrl ?? null),
  };
}

const ALFALUX_API_BASE = "https://alfaluxprod-c8zmg2fn.manus.space";

/**
 * Normaliza fotoUrl:
 * - URLs absolutas (http/https) → usadas diretamente pelo browser (CloudFront pré-assinado público)
 * - Caminhos relativos (/manus-storage/...) → passados pelo proxy interno (legado autenticado)
 */
function normalizeFotoUrl(fotoUrl: string | null): string | null {
  if (!fotoUrl) return null;
  // URL absoluta (CloudFront assinado ou qualquer CDN público) → usar diretamente
  if (fotoUrl.startsWith("http://") || fotoUrl.startsWith("https://")) {
    return fotoUrl;
  }
  // Caminho relativo legado → passar pelo proxy para evitar bloqueio de autenticação
  const absoluteUrl = `${ALFALUX_API_BASE}${fotoUrl}`;
  return `/api/image-proxy?url=${encodeURIComponent(absoluteUrl)}`;
}

/**
 * Extrai CCTs disponíveis do campo temperaturasCor.
 * Aceita tanto array (novo formato) quanto JSON string (legado).
 */
export function parseCCTs(temperaturasCor: string | string[]): string[] {
  if (Array.isArray(temperaturasCor)) {
    return normalizeCCTs(temperaturasCor);
  }
  try {
    const arr = JSON.parse(temperaturasCor) as string[];
    return arr.map((k) => (k.endsWith("K") ? k : `${k}K`));
  } catch {
    return ["3000K"];
  }
}

export interface AdaptedCatalogs {
  downlights: DownlightProduct[];
  paineis: PainelProduct[];
  spots: SpotProduct[];
  arandelas: ArandelaProduct[];
  ledBars: LedBarProduct[];
  bageos: BageoProduct[];
  /** Produtos BAGEO com tamanhos fixos (família "BAGEO", sem sinuosa) — usam DownlightProduct */
  bageosFixos: DownlightProduct[];
  /** Produtos GLOW (perfis fixos como downlights) — usam DownlightProduct */
  glowProducts: DownlightProduct[];
  /** Mapa sku → fotoUrl para GLOW */
  glowFotos: Record<string, string>;
  /** Produtos Decorativas (ISA, etc.) — usam DownlightProduct */
  decorativas: DownlightProduct[];
  /** Mapa sku → fotoUrl para Decorativas */
  decorativasFotos: Record<string, string>;
  /** Mapa familia → CCTs disponíveis para Downlights */
  downlightCCTs: Record<string, string[]>;
  /** Mapa familia → CCTs disponíveis para Painéis */
  painelCCTs: Record<string, string[]>;
  /** Mapa familia → CCTs disponíveis para Spots */
  spotCCTs: Record<string, string[]>;
  /** Mapa familia → CCTs disponíveis para Arandelas */
  arandelaCCTs: Record<string, string[]>;
  /** Produtos Área Externa (PROOF, etc.) — usam DownlightProduct */
  areaExterna: DownlightProduct[];
  /** Mapa sku → fotoUrl para Área Externa */
  areaExternaFotos: Record<string, string>;
  /** Mapa familia → CCTs disponíveis para Área Externa */
  areaExternaCCTs: Record<string, string[]>;
  /** Mapa sku → fotoUrl para Downlights */
  downlightFotos: Record<string, string>;
  /** Mapa sku → fotoUrl para BAGEO fixo */
  bageosFixosFotos: Record<string, string>;
  /** Mapa familia → fotoUrl para Painéis */
  painelFotos: Record<string, string>;
  /** Mapa familia → fotoUrl para Spots */
  spotFotos: Record<string, string>;
  /** Mapa familia → fotoUrl para Arandelas */
  arandelaFotos: Record<string, string>;
}

/** Converte um produto da API para ArandelaProduct */
function toArandelaProduct(p: ApiProduct): ArandelaProduct {
  const d220 = p.driver220;
  const dBivolt = p.driverBivolt;
  const ccts = normalizeCCTs(p.temperaturasCor);
  return {
    instalacao: p.instalacao,
    familia: p.familia,
    sku: p.sku || null,
    name: p.name,
    ledModule: p.ledModule ? p.ledModule.replace(/\[CCT\]/gi, "").trim() : null,
    ledModuleQtd: p.ledModuleQtd ?? null,
    otica: resolveOtica(p),
    oticaPrimaria: p.oticaPrimaria ?? null,
    oticaSecundaria: p.oticaSecundaria ?? null,
    holder: p.holder ?? null,
    holderQtd: p.holderQtd ?? null,
    dissipador: p.dissipador ?? null,
    driver220: d220
      ? { model: driverModel(d220), code: driverCode(d220) }
      : { model: "", code: "" },
    driverBivolt: dBivolt
      ? { model: driverModel(dBivolt), code: driverCode(dBivolt) }
      : null,
    driverQtd220: p.driverQtd220 ?? null,
    driverQtdBivolt: p.driverQtdBivolt ?? null,
    ccts,
    fotoUrl: normalizeFotoUrl(p.fotoUrl),
    precoOnOff220: p.precoOnOff220 ?? null,
    precoOnOffBivolt: p.precoOnOffBivolt ?? null,
    precoDim110v: p.precoDim110v ?? null,
    precoDimDali: p.precoDimDali ?? null,
  };
}

/** Converte um produto da API para LedBarProduct */
/** Famílias que usam o fluxo LED BAR mas não têm difusor no nome (ex: MILANO NF, MEIA LUA, PERFIL FLEXIVEL) */
const LED_BAR_FAMILIES_NO_DIFUSOR = /^(MILANO|MEIA LUA|PERFIL FLEXIVEL|LED BAR WW|FLOOR)/i;

function toLedBarProduct(p: ApiProduct): LedBarProduct | null {
  const potencia = parsePotenciaFromName(p.name);
  // Famílias sem difusor no nome usam "NF" como difusor padrão
  const isNoDifusorFamily = LED_BAR_FAMILIES_NO_DIFUSOR.test(p.familia ?? "");
  const difusor = parseDifusorFromName(p.name) ?? (isNoDifusorFamily ? "NF" as const : null);
  if (!potencia || !difusor) return null; // não conseguiu parsear potência ou difusor

  const d220 = p.driver220;
  const dBivolt = p.driverBivolt;
  // driverDim110v é o campo padrão para DIM 0-10V. Para PERFIL FLEXIVEL, a API usa driverDimTriac110v/220v.
  // Usamos driverDimTriac220v como fallback quando driverDim110v for null.
  const dDimTriac110v = (p as any).driverDimTriac110v ?? null;
  const dDimTriac220v = (p as any).driverDimTriac220v ?? null;
  const dDim010v = p.driverDim110v ?? dDimTriac220v ?? dDimTriac110v;
  const dDimDali = p.driverDimDali;
  const ccts = normalizeCCTs(p.temperaturasCor);

  return {
    familia: p.familia,
    sku: p.sku,
    name: p.name,
    potencia,
    difusor,
    // Remover [CCT] do ledModule
    ledModule: p.ledModule ? p.ledModule.replace(/\[CCT\]/gi, "").trim() : "",
    ccts,
    driver220: d220 ? { model: driverModel(d220), code: driverCode(d220) } : null,
    driverBivolt: dBivolt ? { model: driverModel(dBivolt), code: driverCode(dBivolt) } : null,
    driverDim010v: dDim010v ? { model: driverModel(dDim010v), code: driverCode(dDim010v) } : null,
    driverDimDali: dDimDali ? { model: driverModel(dDimDali), code: driverCode(dDimDali) } : null,
    driverDimTriac110v: dDimTriac110v ? { model: driverModel(dDimTriac110v), code: driverCode(dDimTriac110v) } : null,
    driverDimTriac220v: dDimTriac220v ? { model: driverModel(dDimTriac220v), code: driverCode(dDimTriac220v) } : null,
    instalacao: p.instalacao ?? null,
    fotoUrl: normalizeFotoUrl(p.fotoUrl),
    precoOnOff220: p.precoOnOff220 ?? null,
    precoOnOffBivolt: p.precoOnOffBivolt ?? null,
    precoDim110v: p.precoDim110v ?? null,
    precoDimDali: p.precoDimDali ?? null,
  };
}

/** Verifica se um produto PERFIS usa o fluxo LED BAR (por metro linear com fonte de tensão) */
function isLedBarProduct(p: ApiProduct): boolean {
  return /^(LED BAR|MILANO|MEIA LUA|PERFIL FLEXIVEL|FLOOR)/i.test(p.familia ?? "");
}
/** Verifica se um produto PERFIS é da família GLOW */
function isGlowProduct(p: ApiProduct): boolean {
  return /^GLOW/i.test(p.familia ?? "");
}
/** Verifica se um produto PERFIS é da família BAGEO */
function isBageoProduct(p: ApiProduct): boolean {
  return /^BAGEO/i.test(p.familia ?? "");
}
/** Converte um produto da API para BageoProduct */
function toBageoProduct(p: ApiProduct): BageoProduct | null {
  const aplicacao = parseAplicacaoFromName(p.name);
  if (!aplicacao) return null;
  const instalacao: BageoInstalacao = parseInstalacaoFromApi(p.instalacao ?? "");
  const ccts = normalizeCCTs(p.temperaturasCor);
  const d220 = p.driver220;
  const dBivolt = p.driverBivolt;
  const dDim110v = p.driverDim110v;
  const dDimDali = p.driverDimDali;
  return {
    familia: p.familia,
    sku: p.sku,
    name: p.name,
    instalacao,
    aplicacao,
    ledModule: p.ledModule ?? "",
    ledModuleQtd: p.ledModuleQtd ?? 1,
    ccts,
    driver220: d220 ? { model: driverModel(d220), code: driverCode(d220) } : null,
    driverBivolt: dBivolt ? { model: driverModel(dBivolt), code: driverCode(dBivolt) } : null,
    driverDim110v: dDim110v ? { model: driverModel(dDim110v), code: driverCode(dDim110v) } : null,
    driverDimDali: dDimDali ? { model: driverModel(dDimDali), code: driverCode(dDimDali) } : null,
    // Preços por metro linear — a API pode enviar os campos com nomes diferentes.
    // Tentamos os nomes explícitos primeiro (precoOnOff220, etc.) e depois os campos custo*.
    // Isso garante compatibilidade enquanto a API não padroniza os nomes.
    precoOnOff220: p.precoOnOff220 ?? p.custoLuminaria ?? p.custoDriver220 ?? null,
    precoOnOffBivolt: p.precoOnOffBivolt ?? p.custoDriverBivolt ?? null,
    precoDim110v: p.precoDim110v ?? p.custoDriverDim110v ?? null,
    precoDimDali: p.precoDimDali ?? p.custoDriverDimDali ?? null,
    fotoUrl: normalizeFotoUrl(p.fotoUrl),
  };
}

/** Converte o array completo de produtos da API nos catálogos internos */
export function adaptAlfaluxProducts(products: ApiProduct[]): AdaptedCatalogs {
  const downlights: DownlightProduct[] = [];
  const paineis: PainelProduct[] = [];
  const spots: SpotProduct[] = [];
  const arandelas: ArandelaProduct[] = [];
  const ledBars: LedBarProduct[] = [];
  const bageos: BageoProduct[] = [];
  const bageosFixos: DownlightProduct[] = [];
  const glowProducts: DownlightProduct[] = [];
  const glowFotos: Record<string, string> = {};
  const decorativas: DownlightProduct[] = [];
  const decorativasFotos: Record<string, string> = {};
  const downlightCCTs: Record<string, string[]> = {};
  const painelCCTs: Record<string, string[]> = {};
  const spotCCTs: Record<string, string[]> = {};
  const arandelaCCTs: Record<string, string[]> = {};
  const areaExterna: DownlightProduct[] = [];
  const areaExternaFotos: Record<string, string> = {};
  const areaExternaCCTs: Record<string, string[]> = {};
  const downlightFotos: Record<string, string> = {};
  const bageosFixosFotos: Record<string, string> = {};
  const painelFotos: Record<string, string> = {};
  const spotFotos: Record<string, string> = {};
  const arandelaFotos: Record<string, string> = {};

  for (const p of products) {
    const ccts = normalizeCCTs(p.temperaturasCor);
    const cat = (p.categoria || "").toUpperCase();

    if (cat === "DOWNLIGHTS") {
      downlights.push(toDownlightProduct(p));
      if (!downlightCCTs[p.familia]) downlightCCTs[p.familia] = ccts;
      // Indexar por familia|produto (como resolveDownlightPhoto busca) E por sku (para freshPhotoMap)
      if (p.fotoUrl && p.familia && p.name) downlightFotos[`${p.familia}|${p.name}`] = normalizeFotoUrl(p.fotoUrl)!;
    } else if (cat === "PAINÉIS" || cat === "PAINEIS") {
      paineis.push(toPainelProduct(p));
      if (!painelCCTs[p.familia]) painelCCTs[p.familia] = ccts;
      if (p.fotoUrl && p.familia) painelFotos[p.familia] = normalizeFotoUrl(p.fotoUrl)!;
    } else if (cat === "SPOTS") {
      spots.push(toSpotProduct(p));
      if (!spotCCTs[p.familia]) spotCCTs[p.familia] = ccts;
      if (p.fotoUrl && p.familia) spotFotos[p.familia] = normalizeFotoUrl(p.fotoUrl)!;
    } else if (cat === "ARANDELAS") {
      arandelas.push(toArandelaProduct(p));
      if (!arandelaCCTs[p.familia]) arandelaCCTs[p.familia] = ccts;
      if (p.fotoUrl && p.familia) arandelaFotos[p.familia] = normalizeFotoUrl(p.fotoUrl)!;
    } else if (cat === "PERFIS" && isLedBarProduct(p)) {
      const lb = toLedBarProduct(p);
      if (lb) ledBars.push(lb);
    } else if (cat === "PERFIS" && isGlowProduct(p)) {
      glowProducts.push(toDownlightProduct(p));
      if (p.fotoUrl && p.sku) glowFotos[p.sku] = normalizeFotoUrl(p.fotoUrl)!;
    } else if (cat === "DECORATIVAS") {
      decorativas.push(toDownlightProduct(p));
      if (p.fotoUrl && p.sku) decorativasFotos[p.sku] = normalizeFotoUrl(p.fotoUrl)!;
    } else if (cat === "ÁREA EXTERNA" || cat === "AREA EXTERNA") {
      areaExterna.push(toDownlightProduct(p));
      if (!areaExternaCCTs[p.familia]) areaExternaCCTs[p.familia] = ccts;
      if (p.fotoUrl && p.sku) areaExternaFotos[p.sku] = normalizeFotoUrl(p.fotoUrl)!;
    } else if (cat === "PERFIS" && isBageoProduct(p)) {
      const familiaUpper = (p.familia ?? "").toUpperCase();
      if (familiaUpper === "BAGEO") {
        // BAGEO com tamanhos fixos — usa a mesma estrutura de DownlightProduct
        bageosFixos.push(toDownlightProduct(p));
        if (p.fotoUrl && p.sku) bageosFixosFotos[p.sku] = normalizeFotoUrl(p.fotoUrl)!;
      } else {
        // BAGEO SINUOSA (por metro linear)
        const bg = toBageoProduct(p);
        if (bg) bageos.push(bg);
      }
    }
  }

  return {
    downlights,
    paineis,
    spots,
    arandelas,
    ledBars,
    bageos,
    bageosFixos,
    bageosFixosFotos,
    glowProducts,
    glowFotos,
    decorativas,
    decorativasFotos,
    downlightCCTs,
    painelCCTs,
    spotCCTs,
    arandelaCCTs,
    downlightFotos,
    painelFotos,
    spotFotos,
    arandelaFotos,
    areaExterna,
    areaExternaFotos,
    areaExternaCCTs,
  };
}
