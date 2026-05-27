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
 * Tenta primeiro o campo `code`, depois extrai do `model`.
 */
function driverCode(d: DriverInfo): string {
  if (d.code) return d.code;
  const match = d.model.match(/\(?(EQ\d{5})\)?/);
  return match ? match[1] : "";
}

/** Normaliza o modelo do driver removendo o código EQ do final */
function driverModel(d: DriverInfo): string {
  return d.model.replace(/\s*\(EQ\d{5}\)\s*$/, "").trim();
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
    driverQtd220: p.driverQtd220 ?? null,
    driverQtdBivolt: p.driverQtdBivolt ?? null,
    driverQtdDim110v: p.driverQtdDim110v ?? null,
    driverQtdDimDali: p.driverQtdDimDali ?? null,
    precoOnOff220: p.precoOnOff220 ?? null,
    precoOnOffBivolt: p.precoOnOffBivolt ?? null,
    precoDim110v: p.precoDim110v ?? null,
    precoDimDali: p.precoDimDali ?? null,
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
    driverQtd220: p.driverQtd220 ?? null,
    driverQtdBivolt: p.driverQtdBivolt ?? null,
    driverQtdDim110v: p.driverQtdDim110v ?? null,
    driverQtdDimDali: p.driverQtdDimDali ?? null,
    precoOnOff220: p.precoOnOff220 ?? null,
    precoOnOffBivolt: p.precoOnOffBivolt ?? null,
    precoDim110v: p.precoDim110v ?? null,
    precoDimDali: p.precoDimDali ?? null,
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
  /** Mapa familia → CCTs disponíveis para Downlights */
  downlightCCTs: Record<string, string[]>;
  /** Mapa familia → CCTs disponíveis para Painéis */
  painelCCTs: Record<string, string[]>;
  /** Mapa familia → CCTs disponíveis para Spots */
  spotCCTs: Record<string, string[]>;
  /** Mapa familia → CCTs disponíveis para Arandelas */
  arandelaCCTs: Record<string, string[]>;
  /** Mapa sku → fotoUrl para Downlights */
  downlightFotos: Record<string, string>;
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
function toLedBarProduct(p: ApiProduct): LedBarProduct | null {
  const potencia = parsePotenciaFromName(p.name);
  const difusor = parseDifusorFromName(p.name);
  if (!potencia || !difusor) return null; // não conseguiu parsear potência ou difusor

  const d220 = p.driver220;
  const dBivolt = p.driverBivolt;
  const dDim010v = p.driverDim110v; // campo da API: driverDim110v mapeia para DIM 0-10V em LED BAR
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
    fotoUrl: normalizeFotoUrl(p.fotoUrl),
    precoOnOff220: p.precoOnOff220 ?? null,
    precoOnOffBivolt: p.precoOnOffBivolt ?? null,
    precoDim110v: p.precoDim110v ?? null,
    precoDimDali: p.precoDimDali ?? null,
  };
}

/** Verifica se um produto PERFIS é da família LED BAR */
function isLedBarProduct(p: ApiProduct): boolean {
  return /^LED BAR/i.test(p.familia ?? "");
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
  const downlightCCTs: Record<string, string[]> = {};
  const painelCCTs: Record<string, string[]> = {};
  const spotCCTs: Record<string, string[]> = {};
  const arandelaCCTs: Record<string, string[]> = {};
  const downlightFotos: Record<string, string> = {};
  const painelFotos: Record<string, string> = {};
  const spotFotos: Record<string, string> = {};
  const arandelaFotos: Record<string, string> = {};

  for (const p of products) {
    const ccts = normalizeCCTs(p.temperaturasCor);
    const cat = (p.categoria || "").toUpperCase();

    if (cat === "DOWNLIGHTS") {
      downlights.push(toDownlightProduct(p));
      if (!downlightCCTs[p.familia]) downlightCCTs[p.familia] = ccts;
      if (p.fotoUrl && p.sku) downlightFotos[p.sku] = normalizeFotoUrl(p.fotoUrl)!;
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
    } else if (cat === "PERFIS" && isBageoProduct(p)) {
      const bg = toBageoProduct(p);
      if (bg) bageos.push(bg);
    }
  }

  return {
    downlights,
    paineis,
    spots,
    arandelas,
    ledBars,
    bageos,
    downlightCCTs,
    painelCCTs,
    spotCCTs,
    arandelaCCTs,
    downlightFotos,
    painelFotos,
    spotFotos,
    arandelaFotos,
  };
}
