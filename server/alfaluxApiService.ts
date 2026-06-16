/**
 * alfaluxApiService.ts
 * Proxy server-side para a API de produtos da Alfalux.
 * Busca todos os produtos via /api/products/all (retorna todos de uma vez)
 * e cacheia por 5 minutos.
 *
 * Formato do endpoint /api/products/all:
 *   - driver220, driverBivolt, driverDim110v, driverDimDali, driverDimTriac110v, driverDimTriac220v: { model: string, code: string | null } | null
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
  /** Driver DIM TRIAC 110V (null = não disponível) */
  driverDimTriac110v: DriverInfo | null;
  /** Driver DIM TRIAC 220V (null = não disponível) */
  driverDimTriac220v: DriverInfo | null;

  /** Quantidade de drivers ON/OFF 220V. null = driver não existe no produto. */
  driverQtd220: number | null;
  /** Quantidade de drivers Bivolt. null = driver não existe no produto. */
  driverQtdBivolt: number | null;
  /** Quantidade de drivers DIM 1-10V. null = driver não existe no produto. */
  driverQtdDim110v: number | null;
  /** Quantidade de drivers DIM DALI. null = driver não existe no produto. */
  driverQtdDimDali: number | null;
  /** Quantidade de drivers DIM TRIAC 110V. null = driver não existe no produto. */
  driverQtdDimTriac110v: number | null;
  /** Quantidade de drivers DIM TRIAC 220V. null = driver não existe no produto. */
  driverQtdDimTriac220v: number | null;

  custoLuminaria: number | null;
  custoDriver220: number | null;
  custoDriverBivolt: number | null;
  custoDriverDim110v: number | null;
  custoDriverDimDali: number | null;
  custoDriverDimTriac110v: number | null;
  custoDriverDimTriac220v: number | null;
  /** Preço por metro (D1 simples) — ON/OFF 220V */
  precoOnOff220?: number | null;
  /** Preço por metro (D1 simples) — ON/OFF Bivolt */
  precoOnOffBivolt?: number | null;
  /** Preço por metro (D1 simples) — DIM 1-10V */
  precoDim110v?: number | null;
  /** Preço por metro (D1 simples) — DIM DALI */
  precoDimDali?: number | null;
  /** Preço por metro (D1 simples) — DIM TRIAC 110V */
  precoDimTriac110v?: number | null;
  /** Preço por metro (D1 simples) — DIM TRIAC 220V */
  precoDimTriac220v?: number | null;
  /** Preço por metro (D1 isolado) — ON/OFF 220V */
  precoOnOff220D1?: number | null;
  /** Preço por metro (D1 isolado) — ON/OFF Bivolt */
  precoOnOffBivoltD1?: number | null;
  /** Preço por metro (D1 isolado) — DIM 1-10V */
  precoDim110vD1?: number | null;
  /** Preço por metro (D1 isolado) — DIM DALI */
  precoDimDaliD1?: number | null;
  /** Preço por metro (D1 isolado) — DIM TRIAC 110V */
  precoDimTriac110vD1?: number | null;
  /** Preço por metro (D1 isolado) — DIM TRIAC 220V */
  precoDimTriac220vD1?: number | null;
  /** Preço por metro (D1+D2 duplo) — ON/OFF 220V */
  precoOnOff220D1D2?: number | null;
  /** Preço por metro (D1+D2 duplo) — ON/OFF Bivolt */
  precoOnOffBivoltD1D2?: number | null;
  /** Preço por metro (D1+D2 duplo) — DIM 1-10V */
  precoDim110vD1D2?: number | null;
  /** Preço por metro (D1+D2 duplo) — DIM DALI */
  precoDimDaliD1D2?: number | null;
  /** Preço por metro (D1+D2 duplo) — DIM TRIAC 110V */
  precoDimTriac110vD1D2?: number | null;
  /** Preço por metro (D1+D2 duplo) — DIM TRIAC 220V */
  precoDimTriac220vD1D2?: number | null;
  precoMetro?: number | null;
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

// ── Revenda ───────────────────────────────────────────────────────────────────────────────────

export interface RevendaProduct {
  codigo: string;
  descricao: string;
  referencia: string | null;
  fornecedor: string | null;
  fotoUrl: string | null;
  precoVenda: number | null;
}

interface RevendaCacheEntry {
  data: RevendaProduct[];
  fetchedAt: number;
}

let revendaCache: RevendaCacheEntry | null = null;

export async function fetchRevendaProducts(): Promise<RevendaProduct[]> {
  const now = Date.now();
  if (revendaCache && now - revendaCache.fetchedAt < CACHE_TTL_MS) {
    return revendaCache.data;
  }

  console.log("[AlfaluxAPI] Buscando produtos de revenda via /api/revenda/all...");
  const url = `${ALFALUX_BASE}/api/revenda/all`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Alfalux Revenda API error: ${res.status}`);

  const body = await res.json() as { count?: number; products?: RevendaProduct[] };
  const all = body.products ?? (Array.isArray(body) ? body as RevendaProduct[] : []);

  console.log(`[AlfaluxAPI] ${all.length} produtos de revenda carregados.`);
  revendaCache = { data: all, fetchedAt: now };
  return all;
}

// ── Acessórios ────────────────────────────────────────────────────────────────────────────────────

export interface AcessorioProduct {
  id: number;
  codigo: string | null;
  sku: string | null;
  produto: string | null;
  familia: string | null;
  dimensao: string | null;
  precoVenda: number | null;
  fotoUrl: string | null;
  /** 'driver' = drivers/fontes; 'accessories' = acessórios físicos */
  source: 'driver' | 'accessories' | null;
  /** Referência do fabricante (ex: '929001402380/929001007211 - PHILIPS') */
  observacoes: string | null;
}

interface AcessoriosCacheEntry {
  data: AcessorioProduct[];
  fetchedAt: number;
}

let acessoriosCache: AcessoriosCacheEntry | null = null;

export async function fetchAcessoriosProducts(): Promise<AcessorioProduct[]> {
  const now = Date.now();
  if (acessoriosCache && now - acessoriosCache.fetchedAt < CACHE_TTL_MS) {
    return acessoriosCache.data;
  }

  console.log("[AlfaluxAPI] Buscando acessórios via /api/acessorios/all...");
  const url = `${ALFALUX_BASE}/api/acessorios/all`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Alfalux Acessórios API error: ${res.status}`);

  const body = await res.json() as { count?: number; items?: AcessorioProduct[] };
  const all = body.items ?? (Array.isArray(body) ? body as AcessorioProduct[] : []);

  console.log(`[AlfaluxAPI] ${all.length} acessórios carregados.`);
  acessoriosCache = { data: all, fetchedAt: now };
  return all;
}
