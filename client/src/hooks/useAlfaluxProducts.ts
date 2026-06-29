/**
 * useAlfaluxProducts
 * Busca os produtos Alfalux via servidor (tRPC), que enriquece os produtos
 * com campos calculados como ledModuleEq (código EQ do módulo por CCT).
 */
import { useEffect, useRef, useState } from "react";
import type { AlfaluxProduct } from "../../../server/alfaluxApiService";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  data: AlfaluxProduct[];
  fetchedAt: number;
}

// Cache em memória (persiste enquanto a página estiver aberta)
let memoryCache: CacheEntry | null = null;

export interface UseAlfaluxProductsResult {
  products: AlfaluxProduct[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAlfaluxProducts(): UseAlfaluxProductsResult {
  const [products, setProducts] = useState<AlfaluxProduct[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchCountRef = useRef(0);

  const fetchProducts = async (force = false) => {
    const now = Date.now();

    // Usar cache em memória se válido
    if (!force && memoryCache && now - memoryCache.fetchedAt < CACHE_TTL_MS) {
      setProducts(memoryCache.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const currentFetch = ++fetchCountRef.current;

    try {
      // Buscar via servidor tRPC — o servidor enriquece com ledModuleEq (lookup de componentes)
      const res = await fetch(`/api/trpc/alfalux.products?input=${encodeURIComponent(JSON.stringify({ json: null }))}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const body = await res.json() as { result?: { data?: { json?: AlfaluxProduct[] } } };
      const all = body?.result?.data?.json ?? [];

      // Ignorar resultado se um fetch mais recente já foi iniciado
      if (currentFetch !== fetchCountRef.current) return;

      memoryCache = { data: all, fetchedAt: Date.now() };
      setProducts(all);
      setError(null);
    } catch (err) {
      if (currentFetch !== fetchCountRef.current) return;
      console.warn("[AlfaluxAPI] Falha ao buscar produtos no cliente:", err instanceof Error ? err.message : err);
      setError("Falha ao conectar com a API Alfalux");
      setProducts([]);
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
