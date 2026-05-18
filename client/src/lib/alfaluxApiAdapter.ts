/**
 * alfaluxApiAdapter.ts
 * Converte o formato da API de produtos da Alfalux para os tipos internos
 * DownlightProduct e PainelProduct usados pelo configurador.
 *
 * Mapeamento de campos:
 *   API.produto          → name
 *   API.sku              → sku
 *   API.familia          → familia
 *   API.instalacao       → instalacao
 *   API.moduloLed        → ledModule (sem [CCT])
 *   API.otica            → otica (null se oticaNaoAplicavel)
 *   API.holder           → holder (null se holderNaoAplicavel)
 *   API.dissipador       → dissipador (null se dissipadorNaoAplicavel)
 *   API.driverOnoff220   → driver220 (código EQ extraído do texto)
 *   API.driverOnoffBivolt→ driverBivolt (null se bivoltNaoAplicavel ou vazio)
 *   API.temperaturasCor  → CCTs disponíveis (JSON array string)
 */

import type { DownlightProduct } from "./downlightCatalog";
import type { PainelProduct } from "./painelCatalog";
import { PAINEL_CATALOG } from "./painelCatalog";
import type { SpotProduct } from "./spotCatalog";

/** Formato retornado pela API Alfalux (espelhado de AlfaluxProduct no servidor) */
export interface ApiProduct {
  id: number;
  categoria: string;
  instalacao: string;
  familia: string;
  sku: string;
  produto: string;
  moduloLed: string;
  otica: string;
  oticaNaoAplicavel: boolean;
  holder: string;
  holderNaoAplicavel: boolean;
  dissipador: string;
  dissipadorNaoAplicavel: boolean;
  driverOnoff220: string;
  driverOnoffBivolt: string;
  driverOnoffBivoltNaoAplicavel: boolean;
  driverDim110v: string | null;
  driverDim110vNaoAplicavel: boolean;
  driverDimDali: string | null;
  driverDimDaliNaoAplicavel: boolean;
  temperaturasCor: string;
  fotoUrl: string | null;
  fotoKey: string | null;
  custoLuminaria: number | null;
  custoDriverOnoff220: number | null;
  custoDriverOnoffBivolt: number | null;
  custoDriverDim110v: number | null;
  custoDriverDimDali: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Extrai o código EQ de uma string de driver, ex: "PHILIPS 44W 350MA (EQ00347)" → "EQ00347" */
function extractEqCode(text: string): string {
  const match = text.match(/\(?(EQ\d{5})\)?/);
  return match ? match[1] : "";
}

/** Normaliza o texto do driver removendo o código EQ do final */
function normalizeDriverModel(text: string): string {
  return text.replace(/\s*\(EQ\d{5}\)\s*$/, "").trim();
}

/** Converte um produto da API para DownlightProduct */
function toDownlightProduct(p: ApiProduct): DownlightProduct {
  const driver220Text = p.driverOnoff220 || "";
  const driverBivoltText = p.driverOnoffBivolt || "";
  const hasBivolt = !p.driverOnoffBivoltNaoAplicavel && driverBivoltText.length > 0;

  return {
    instalacao: p.instalacao,
    familia: p.familia,
    sku: p.sku,
    name: p.produto,
    holder: p.holderNaoAplicavel ? null : (p.holder || null),
    otica: p.oticaNaoAplicavel ? null : (p.otica || null),
    dissipador: p.dissipadorNaoAplicavel ? null : (p.dissipador || null),
    ledModule: p.moduloLed || "",
    driver220: {
      model: normalizeDriverModel(driver220Text),
      code: extractEqCode(driver220Text),
    },
    driverBivolt: hasBivolt
      ? {
          model: normalizeDriverModel(driverBivoltText),
          code: extractEqCode(driverBivoltText),
        }
      : null,
  };
}

/** Converte um produto da API para SpotProduct */
function toSpotProduct(p: ApiProduct): SpotProduct {
  const driver220Text = p.driverOnoff220 || "";
  const driverBivoltText = p.driverOnoffBivolt || "";
  const hasBivolt = !p.driverOnoffBivoltNaoAplicavel && driverBivoltText.length > 0;
  const ccts = parseCCTs(p.temperaturasCor);

  return {
    instalacao: p.instalacao,
    familia: p.familia,
    sku: p.sku || null,
    name: p.produto,
    ledModule: p.moduloLed ? p.moduloLed.replace(/\[CCT\]/gi, "").trim() : null,
    otica: p.oticaNaoAplicavel ? null : (p.otica || null),
    holder: p.holderNaoAplicavel ? null : (p.holder || null),
    dissipador: p.dissipadorNaoAplicavel ? null : (p.dissipador || null),
    driver220: {
      model: normalizeDriverModel(driver220Text),
      code: extractEqCode(driver220Text),
    },
    driverBivolt: hasBivolt
      ? {
          model: normalizeDriverModel(driverBivoltText),
          code: extractEqCode(driverBivoltText),
        }
      : null,
     ccts,
    fotoUrl: normalizeFotoUrl(p.fotoUrl),
  };
}
/** Converte um produto da API para PainelProduct */
function toPainelProduct(p: ApiProduct): PainelProduct {
  const driver220Text = p.driverOnoff220 || "";
  const driverBivoltText = p.driverOnoffBivolt || "";
  const hasBivolt = !p.driverOnoffBivoltNaoAplicavel && driverBivoltText.length > 0;

  // Fallback: quando os drivers não estão cadastrados na API, usa o catálogo estático pelo SKU
  const staticFallback = p.sku ? PAINEL_CATALOG.find(s => s.sku === p.sku) : undefined;

  const driver220: PainelProduct["driver220"] = driver220Text
    ? { model: normalizeDriverModel(driver220Text), code: extractEqCode(driver220Text) }
    : staticFallback?.driver220 ?? { model: "", code: "" };

  const driverBivolt: PainelProduct["driverBivolt"] = hasBivolt
    ? { model: normalizeDriverModel(driverBivoltText), code: extractEqCode(driverBivoltText) }
    : (driver220Text ? null : staticFallback?.driverBivolt ?? null);

  return {
    instalacao: p.instalacao,
    familia: p.familia,
    sku: p.sku || null,
    name: p.produto,
    ledModule: p.moduloLed || null,
    driver220,
    driverBivolt,
  };
}

/** Extrai CCTs disponíveis do campo temperaturasCor (JSON array string) */
export function parseCCTs(temperaturasCor: string): string[] {
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

const ALFALUX_API_BASE = "https://alfaluxprod-c8zmg2fn.manus.space";

/** Normaliza fotoUrl: usa proxy interno para evitar bloqueios CORS/referrer do CloudFront */
function normalizeFotoUrl(fotoUrl: string | null): string | null {
  if (!fotoUrl) return null;
  // Montar URL absoluta do servidor Alfalux
  const absoluteUrl = fotoUrl.startsWith("http://") || fotoUrl.startsWith("https://")
    ? fotoUrl
    : `${ALFALUX_API_BASE}${fotoUrl}`;
  // Rotear pelo proxy interno para evitar bloqueios CORS/referrer
  return `/api/image-proxy?url=${encodeURIComponent(absoluteUrl)}`;
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
    const ccts = parseCCTs(p.temperaturasCor);
    const cat = (p.categoria || "").toUpperCase();

    if (cat === "DOWNLIGHTS") {
      downlights.push(toDownlightProduct(p));
      if (!downlightCCTs[p.familia]) downlightCCTs[p.familia] = ccts;
      if (p.fotoUrl && p.sku) downlightFotos[p.sku] = normalizeFotoUrl(p.fotoUrl)!
    } else if (cat === "PAINÉIS" || cat === "PAINEIS") {
      paineis.push(toPainelProduct(p));
      if (!painelCCTs[p.familia]) painelCCTs[p.familia] = ccts;
      if (p.fotoUrl && p.familia) painelFotos[p.familia] = normalizeFotoUrl(p.fotoUrl)!
    } else if (cat === "SPOTS") {
      spots.push(toSpotProduct(p));
      if (!spotCCTs[p.familia]) spotCCTs[p.familia] = ccts;
      if (p.fotoUrl && p.familia) spotFotos[p.familia] = normalizeFotoUrl(p.fotoUrl)!
    }
  }

  return { downlights, paineis, spots, downlightCCTs, painelCCTs, spotCCTs, downlightFotos, painelFotos, spotFotos };
}
