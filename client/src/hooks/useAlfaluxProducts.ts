/**
 * useAlfaluxProducts
 * Busca os produtos Alfalux via servidor (tRPC), que enriquece os produtos
 * com campos calculados como ledModuleEq (código EQ do módulo por CCT).
 */
import { useEffect, useRef, useState } from "react";
import type { AlfaluxProduct } from "../../../server/alfaluxApiService";
const FETCH_TIMEOUT_MS = 60_000; // 60 segundos (API pode demorar ~12s + margem)
const MAX_RETRIES = 3;
const SNAPSHOT_KEY = "sistema-luna:alfalux-products-snapshot:v1";

interface CacheEntry {
  data: AlfaluxProduct[];
  fetchedAt: number;
}

// Snapshot de disponibilidade: mantém a última resposta válida visível enquanto
// uma atualização forçada consulta novamente a API. Nunca substitui dados por
// catálogo comercial local.
let memoryCache: CacheEntry | null = null;

export function readAlfaluxProductsSnapshot(): CacheEntry | null {
  if (memoryCache?.data.length) return memoryCache;
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SNAPSHOT_KEY) ?? "null") as CacheEntry | null;
    if (!parsed?.data?.length) return null;
    memoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function saveAlfaluxProductsSnapshot(entry: CacheEntry) {
  memoryCache = entry;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(entry));
  } catch {
    // A falta de sessionStorage não impede o catálogo da sessão atual.
  }
}

export interface UseAlfaluxProductsResult {
  products: AlfaluxProduct[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAlfaluxProducts(): UseAlfaluxProductsResult {
  const [products, setProducts] = useState<AlfaluxProduct[] | null>(() => readAlfaluxProductsSnapshot()?.data ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchCountRef = useRef(0);

  const fetchProducts = async (force = false) => {
    const now = Date.now();

    setIsLoading(true);
    setError(null);

    const currentFetch = ++fetchCountRef.current;

    try {
      // Buscar via servidor tRPC — o servidor enriquece com ledModuleEq (lookup de componentes)
      let lastErr: unknown;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const res = await fetch(`/api/trpc/alfalux.products?input=${encodeURIComponent(JSON.stringify({ json: { forceRefresh: force } }))}`, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const body = await res.json() as { result?: { data?: { json?: AlfaluxProduct[] } } };
          const all = body?.result?.data?.json ?? [];

          // Ignorar resultado se um fetch mais recente já foi iniciado
          if (currentFetch !== fetchCountRef.current) return;

          saveAlfaluxProductsSnapshot({ data: all, fetchedAt: Date.now() });
          setProducts(all);
          setError(null);
          // A primeira resposta pode vir do cache de disponibilidade do servidor
          // para liberar a interface rapidamente. Em seguida, uma única consulta
          // forçada atualiza silenciosamente os dados diretamente na API.
          if (!force) {
            setTimeout(() => { void fetchProducts(true); }, 0);
          }
          return; // sucesso — sair do loop
        } catch (err) {
          lastErr = err;
          if (currentFetch !== fetchCountRef.current) return;
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[AlfaluxAPI] Tentativa ${attempt}/${MAX_RETRIES} falhou:`, msg);
          if (attempt < MAX_RETRIES) {
            // Aguardar antes de tentar novamente (2s, 4s)
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          }
        }
      }
      // Todas as tentativas falharam
      if (currentFetch !== fetchCountRef.current) return;
      console.warn("[AlfaluxAPI] Falha ao buscar produtos no cliente após", MAX_RETRIES, "tentativas:", lastErr instanceof Error ? lastErr.message : lastErr);
      setError("Falha ao conectar com a API Alfalux");
      // Manter o último snapshot válido em tela. Sem snapshot, o configurador
      // permanece indisponível em vez de recorrer a quantidades locais.
      if (!readAlfaluxProductsSnapshot()) setProducts(null);
    } finally {
      if (currentFetch === fetchCountRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    products,
    isLoading,
    error,
    refetch: () => fetchProducts(true),
  };
}
