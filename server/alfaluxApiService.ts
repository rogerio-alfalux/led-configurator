/**
 * alfaluxApiService.ts
 * Proxy server-side para a API de produtos da Alfalux.
 * Busca todos os produtos via tRPC público do site de cadastro,
 * paginando automaticamente (máx 200 por página) e cacheando por 5 minutos.
 */

const ALFALUX_BASE = "https://alfaluxprod-c8zmg2fn.manus.space";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export interface AlfaluxProduct {
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
  temperaturasCor: string; // JSON array string, ex: '["2700","3000","4000","5000"]'
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

interface CacheEntry {
  data: AlfaluxProduct[];
  fetchedAt: number;
}

let cache: CacheEntry | null = null;

async function fetchPage(offset: number, limit = 200): Promise<AlfaluxProduct[]> {
  const input = encodeURIComponent(
    JSON.stringify({ json: { search: "", categoria: "", instalacao: "", offset, limit } })
  );
  const url = `${ALFALUX_BASE}/api/trpc/products.list?input=${input}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Alfalux API error: ${res.status}`);
  const body = await res.json() as {
    result?: { data?: { json?: { items?: AlfaluxProduct[] } } };
    error?: unknown;
  };
  if (body.error) throw new Error(`Alfalux API returned error: ${JSON.stringify(body.error)}`);
  return body.result?.data?.json?.items ?? [];
}

export async function fetchAllAlfaluxProducts(): Promise<AlfaluxProduct[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  console.log("[AlfaluxAPI] Buscando produtos...");
  const page1 = await fetchPage(0, 200);
  let all = [...page1];

  // Se retornou 200 itens, pode haver mais
  if (page1.length === 200) {
    const page2 = await fetchPage(200, 200);
    all = [...all, ...page2];
    // Se ainda houver mais (improvável com 211 produtos)
    if (page2.length === 200) {
      const page3 = await fetchPage(400, 200);
      all = [...all, ...page3];
    }
  }

  console.log(`[AlfaluxAPI] ${all.length} produtos carregados.`);
  cache = { data: all, fetchedAt: now };
  return all;
}

export function invalidateAlfaluxCache(): void {
  cache = null;
}
