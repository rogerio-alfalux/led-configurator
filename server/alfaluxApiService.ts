/**
 * alfaluxApiService.ts
 * Proxy server-side para a API de produtos da Alfalux.
 * Busca todos os produtos via /api/products/all (retorna todos de uma vez)
 * e cacheia por 5 minutos.
 *
 * Formato do endpoint /api/products/all:
 *   - driver220, driverBivolt, driverDim110v, driverDimDali: { model: string, code: string | null } | null
 *   - temperaturasCor: string[] (array, não JSON string)
 *   - name: nome do produto (em vez de "produto")
 *   - ledModule: módulo LED (em vez de "moduloLed")
 *   - Sem campos *NaoAplicavel — null significa não aplicável
 *   - Sem id, createdAt, updatedAt, fotoKey
 */

const ALFALUX_BASE = "https://alfaluxprod-c8zmg2fn.manus.space";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/** Formato de um driver retornado pelo /api/products/all */
export interface DriverInfo {
  model: string;
  code: string | null;
}

export interface AlfaluxProduct {
  categoria: string;
  instalacao: string;
  familia: string;
  sku: string;
  /** Nome do produto (ex: "BLAZE E IF 1.1B 645MM") */
  name: string;
  ledModule: string | null;
  /** Quantidade numérica de módulos LED (ex: 3 para produto 3X3). null quando não retornado pela API. */
  ledModuleQtd: number | null;
  otica: string | null;
  /** Ótica primária com quantidade embutida (ex: "9x LENTE DARKOO..."). null quando não retornado pela API. */
  oticaPrimaria: string | null;
  /** Ótica secundária com quantidade embutida (ex: "3x LOUVER PRETO..."). null quando não há ou não retornado. */
  oticaSecundaria: string | null;
  holder: string | null;
  /** Quantidade numérica de holders. null quando não aplicável ou não retornado. */
  holderQtd: number | null;
  dissipador: string | null;
  fotoUrl: string | null;
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

interface ApiResponse {
  count: number;
  available: number;
  products: AlfaluxProduct[];
}

interface CacheEntry {
  data: AlfaluxProduct[];
  fetchedAt: number;
}

let cache: CacheEntry | null = null;

export async function fetchAllAlfaluxProducts(): Promise<AlfaluxProduct[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  console.log("[AlfaluxAPI] Buscando produtos via /api/products/all...");
  const url = `${ALFALUX_BASE}/api/products/all`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Alfalux API error: ${res.status}`);

  const body = await res.json() as ApiResponse;
  const all = body.products ?? [];

  // Reportar SKUs duplicados (sem removê-los) para diagnóstico
  const skuCount = new Map<string, number>();
  for (const p of all) skuCount.set(p.sku, (skuCount.get(p.sku) ?? 0) + 1);
  const dups = Array.from(skuCount.entries()).filter(([, n]) => n > 1);
  if (dups.length > 0) {
    console.warn(`[AlfaluxAPI] ATENÇÃO: ${dups.length} SKUs duplicados na API (nenhum foi removido):`);
    for (const [sku, n] of dups) console.warn(`  ${sku}: ${n}x`);
  }

  console.log(`[AlfaluxAPI] ${all.length} produtos carregados.`);
  cache = { data: all, fetchedAt: now };
  return all;
}

export function invalidateAlfaluxCache(): void {
  cache = null;
}
