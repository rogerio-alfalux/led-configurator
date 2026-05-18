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
import { PAINEL_CATALOG } from "./painelCatalog";
import type { SpotProduct } from "./spotCatalog";

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
  otica: string | null;
  holder: string | null;
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
  custoLuminaria: number | null;
  custoDriver220: number | null;
  custoDriverBivolt: number | null;
  custoDriverDim110v: number | null;
  custoDriverDimDali: number | null;
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

/** Converte um produto da API para DownlightProduct */
function toDownlightProduct(p: ApiProduct): DownlightProduct {
  const d220 = p.driver220;
  const dBivolt = p.driverBivolt;

  return {
    instalacao: p.instalacao,
    familia: p.familia,
    sku: p.sku,
    name: p.name,
    holder: p.holder ?? null,
    otica: p.otica ?? null,
    dissipador: p.dissipador ?? null,
    ledModule: p.ledModule ?? "",
    driver220: d220
      ? { model: driverModel(d220), code: driverCode(d220) }
      : { model: "", code: "" },
    driverBivolt: dBivolt
      ? { model: driverModel(dBivolt), code: driverCode(dBivolt) }
      : null,
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
    otica: p.otica ?? null,
    holder: p.holder ?? null,
    dissipador: p.dissipador ?? null,
    driver220: d220
      ? { model: driverModel(d220), code: driverCode(d220) }
      : { model: "", code: "" },
    driverBivolt: dBivolt
      ? { model: driverModel(dBivolt), code: driverCode(dBivolt) }
      : null,
    ccts,
    fotoUrl: normalizeFotoUrl(p.fotoUrl),
  };
}

/** Converte um produto da API para PainelProduct */
function toPainelProduct(p: ApiProduct): PainelProduct {
  const d220 = p.driver220;
  const dBivolt = p.driverBivolt;
  const dDim110v = p.driverDim110v;
  const dDimDali = p.driverDimDali;

  // Fallback: quando os drivers não estão cadastrados na API, usa o catálogo estático pelo SKU
  const staticFallback = p.sku ? PAINEL_CATALOG.find((s) => s.sku === p.sku) : undefined;

  const driver220: PainelProduct["driver220"] = d220
    ? { model: driverModel(d220), code: driverCode(d220) }
    : staticFallback?.driver220 ?? { model: "", code: "" };

  const driverBivolt: PainelProduct["driverBivolt"] = dBivolt
    ? { model: driverModel(dBivolt), code: driverCode(dBivolt) }
    : d220
    ? null
    : staticFallback?.driverBivolt ?? null;

  const driverDim110v: PainelProduct["driverDim110v"] = dDim110v
    ? { model: driverModel(dDim110v), code: driverCode(dDim110v) }
    : null;

  const driverDimDali: PainelProduct["driverDimDali"] = dDimDali
    ? { model: driverModel(dDimDali), code: driverCode(dDimDali) }
    : null;

  return {
    instalacao: p.instalacao,
    familia: p.familia,
    sku: p.sku || null,
    name: p.name,
    ledModule: p.ledModule ? p.ledModule.replace(/\[CCT\]/gi, "").trim() : null,
    driver220,
    driverBivolt,
    driverDim110v,
    driverDimDali,
  };
}

const ALFALUX_API_BASE = "https://alfaluxprod-c8zmg2fn.manus.space";

/** Normaliza fotoUrl: usa proxy interno para evitar bloqueios CORS/referrer do CloudFront */
function normalizeFotoUrl(fotoUrl: string | null): string | null {
  if (!fotoUrl) return null;
  const absoluteUrl =
    fotoUrl.startsWith("http://") || fotoUrl.startsWith("https://")
      ? fotoUrl
      : `${ALFALUX_API_BASE}${fotoUrl}`;
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
  /** Mapa familia → CCTs disponíveis para Downlights */
  downlightCCTs: Record<string, string[]>;
  /** Mapa familia → CCTs disponíveis para Painéis */
  painelCCTs: Record<string, string[]>;
  /** Mapa familia → CCTs disponíveis para Spots */
  spotCCTs: Record<string, string[]>;
  /** Mapa sku → fotoUrl para Downlights */
  downlightFotos: Record<string, string>;
  /** Mapa familia → fotoUrl para Painéis */
  painelFotos: Record<string, string>;
  /** Mapa familia → fotoUrl para Spots */
  spotFotos: Record<string, string>;
}

/** Converte o array completo de produtos da API nos catálogos internos */
export function adaptAlfaluxProducts(products: ApiProduct[]): AdaptedCatalogs {
  const downlights: DownlightProduct[] = [];
  const paineis: PainelProduct[] = [];
  const spots: SpotProduct[] = [];
  const downlightCCTs: Record<string, string[]> = {};
  const painelCCTs: Record<string, string[]> = {};
  const spotCCTs: Record<string, string[]> = {};
  const downlightFotos: Record<string, string> = {};
  const painelFotos: Record<string, string> = {};
  const spotFotos: Record<string, string> = {};

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
    }
  }

  return {
    downlights,
    paineis,
    spots,
    downlightCCTs,
    painelCCTs,
    spotCCTs,
    downlightFotos,
    painelFotos,
    spotFotos,
  };
}
