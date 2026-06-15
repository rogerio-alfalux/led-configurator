/**
 * ProductSearch.tsx
 * Campo de busca rápida por produtos com sugestões em tempo real.
 * Agrega produtos de todos os catálogos (Perfis, LED BAR, BAGEO,
 * Downlights, Painéis, Spots, Arandelas, Revenda, Acessórios).
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Zap, Lightbulb, Grid2X2, Focus, Lamp, ShoppingBag, Wrench } from "lucide-react";
import type { ProfileVariant } from "@/lib/ledCatalog";
import type { LedBarProduct } from "@/lib/ledBarCatalog";
import type { BageoProduct } from "@/lib/bageoCatalog";
import type { DownlightProduct } from "@/lib/downlightCatalog";
import type { PainelProduct } from "@/lib/painelCatalog";
import type { SpotProduct } from "@/lib/spotCatalog";
import type { ArandelaProduct } from "@/lib/arandelaCatalog";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ProductCategory =
  | "Perfis"
  | "LED BAR"
  | "BAGEO"
  | "Downlights"
  | "Painéis"
  | "Spots"
  | "Arandelas"
  | "Revenda"
  | "Acessórios";

// Interfaces mínimas para produtos de Revenda e Acessórios (espelham o retorno do tRPC)
export interface RevendaSearchItem {
  sku: string;
  name: string;
  fornecedor: string | null;
  fotoUrl: string | null;
}
export interface AcessorioSearchItem {
  id: number;
  codigo: string | null;
  sku: string | null;
  produto: string | null;
  familia: string | null;
  dimensao: string | null;
  fotoUrl: string | null;
}

export interface SearchSuggestion {
  /** Categoria do produto */
  category: ProductCategory;
  /** Nome do produto para exibição */
  name: string;
  /** Família do produto (ex: BLAZE, ZEUS) */
  familia: string;
  /** SKU ou código do produto */
  code: string | null;
  /** URL da foto do produto (quando disponível) */
  fotoUrl: string | null;
  /** Tipo de instalação (quando aplicável) */
  instalacao?: string;
  /** Potência (quando aplicável) */
  potencia?: string;
}

export interface ProductSearchCatalogs {
  profiles: Record<string, ProfileVariant>;
  ledBars: LedBarProduct[];
  bageos: BageoProduct[];
  downlights: DownlightProduct[];
  paineis: PainelProduct[];
  spots: SpotProduct[];
  arandelas: ArandelaProduct[];
  revenda: RevendaSearchItem[];
  acessorios: AcessorioSearchItem[];
}

interface ProductSearchProps {
  catalogs: ProductSearchCatalogs;
  onSelect: (suggestion: SearchSuggestion) => void;
}

// ─── Ícones por categoria ────────────────────────────────────────────────────

function CategoryIcon({ category }: { category: ProductCategory }) {
  const cls = "w-3.5 h-3.5 shrink-0";
  switch (category) {
    case "Perfis":
    case "LED BAR":
    case "BAGEO":
      return <Zap className={cls} />;
    case "Downlights":
      return <Lightbulb className={cls} />;
    case "Painéis":
      return <Grid2X2 className={cls} />;
    case "Spots":
      return <Focus className={cls} />;
    case "Arandelas":
      return <Lamp className={cls} />;
    case "Revenda":
      return <ShoppingBag className={cls} />;
    case "Acessórios":
      return <Wrench className={cls} />;
  }
}

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  Perfis: "text-blue-500",
  "LED BAR": "text-violet-500",
  BAGEO: "text-indigo-500",
  Downlights: "text-amber-500",
  "Painéis": "text-emerald-500",
  Spots: "text-orange-500",
  Arandelas: "text-pink-500",
  Revenda: "text-teal-500",
  "Acessórios": "text-cyan-500",
};

// ─── Lógica de busca ─────────────────────────────────────────────────────────

function buildSuggestions(catalogs: ProductSearchCatalogs): SearchSuggestion[] {
  const suggestions: SearchSuggestion[] = [];

  // Perfis lineares — deduplica por nome (cada nome pode ter múltiplos installTypes)
  const seenProfiles = new Set<string>();
  for (const variant of Object.values(catalogs.profiles)) {
    if (!seenProfiles.has(variant.name)) {
      seenProfiles.add(variant.name);
      suggestions.push({
        category: "Perfis",
        name: variant.name,
        familia: variant.name,
        code: variant.code,
        fotoUrl: null,
        instalacao: variant.installType,
      });
    }
  }

  // LED BAR — deduplica por família
  const seenLedBars = new Set<string>();
  for (const p of catalogs.ledBars) {
    if (!seenLedBars.has(p.familia)) {
      seenLedBars.add(p.familia);
      suggestions.push({
        category: "LED BAR",
        name: p.name,
        familia: p.familia,
        code: p.sku,
        fotoUrl: p.fotoUrl,
        potencia: String(p.potencia) + "W/m",
      });
    }
  }

  // BAGEO — deduplica por família
  const seenBageos = new Set<string>();
  for (const p of catalogs.bageos) {
    if (!seenBageos.has(p.familia)) {
      seenBageos.add(p.familia);
      suggestions.push({
        category: "BAGEO",
        name: p.name,
        familia: p.familia,
        code: p.sku,
        fotoUrl: p.fotoUrl,
      });
    }
  }

  // Downlights — deduplica por família
  const seenDl = new Set<string>();
  for (const p of catalogs.downlights) {
    if (!seenDl.has(p.familia)) {
      seenDl.add(p.familia);
      suggestions.push({
        category: "Downlights",
        name: p.name,
        familia: p.familia,
        code: p.sku,
        fotoUrl: null,
        instalacao: p.instalacao,
      });
    }
  }

  // Painéis — deduplica por família
  const seenPaineis = new Set<string>();
  for (const p of catalogs.paineis) {
    if (!seenPaineis.has(p.familia)) {
      seenPaineis.add(p.familia);
      suggestions.push({
        category: "Painéis",
        name: p.name,
        familia: p.familia,
        code: p.sku,
        fotoUrl: p.fotoUrl ?? null,
        instalacao: p.instalacao,
      });
    }
  }

  // Spots — deduplica por família
  const seenSpots = new Set<string>();
  for (const p of catalogs.spots) {
    if (!seenSpots.has(p.familia)) {
      seenSpots.add(p.familia);
      suggestions.push({
        category: "Spots",
        name: p.name,
        familia: p.familia,
        code: p.sku,
        fotoUrl: p.fotoUrl,
        instalacao: p.instalacao,
      });
    }
  }

  // Arandelas — deduplica por família
  const seenArandelas = new Set<string>();
  for (const p of catalogs.arandelas) {
    if (!seenArandelas.has(p.familia)) {
      seenArandelas.add(p.familia);
      suggestions.push({
        category: "Arandelas",
        name: p.name,
        familia: p.familia,
        code: p.sku,
        fotoUrl: p.fotoUrl,
        instalacao: p.instalacao,
      });
    }
  }

  // Revenda — cada produto individualmente (sem deduplicação, pois são itens únicos)
  for (const p of catalogs.revenda) {
    suggestions.push({
      category: "Revenda",
      name: p.name,
      familia: p.name,
      code: p.sku,
      fotoUrl: p.fotoUrl,
      instalacao: p.fornecedor ?? undefined,
    });
  }

  // Acessórios — cada produto individualmente
  for (const p of catalogs.acessorios) {
    const nome = p.produto ?? p.sku ?? p.codigo ?? "";
    suggestions.push({
      category: "Acessórios",
      name: nome,
      familia: nome,
      code: p.codigo ?? p.sku,
      fotoUrl: p.fotoUrl,
      instalacao: p.familia ?? undefined,
      potencia: p.dimensao ?? undefined,
    });
  }

  return suggestions;
}

function filterSuggestions(
  all: SearchSuggestion[],
  query: string
): SearchSuggestion[] {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  return all
    .filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.familia.toLowerCase().includes(q) ||
        (s.code ?? "").toLowerCase().includes(q)
    )
    .slice(0, 12); // máximo de 12 sugestões
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function ProductSearch({ catalogs, onSelect }: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allSuggestions = React.useMemo(
    () => buildSuggestions(catalogs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      catalogs.profiles,
      catalogs.ledBars,
      catalogs.bageos,
      catalogs.downlights,
      catalogs.paineis,
      catalogs.spots,
      catalogs.arandelas,
      catalogs.revenda,
      catalogs.acessorios,
    ]
  );

  const filtered = React.useMemo(
    () => filterSuggestions(allSuggestions, query),
    [allSuggestions, query]
  );

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
    setHighlighted(-1);
  }, []);

  const handleSelect = useCallback(
    (suggestion: SearchSuggestion) => {
      setQuery("");
      setOpen(false);
      setHighlighted(-1);
      onSelect(suggestion);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || filtered.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
      } else if (e.key === "Enter" && highlighted >= 0) {
        e.preventDefault();
        handleSelect(filtered[highlighted]);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [open, filtered, highlighted, handleSelect]
  );

  // Scroll automático para o item destacado
  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const item = listRef.current.children[highlighted] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder="Buscar produto... (ex: BLAZE, ZEUS, ORBIT, Tartaruga)"
          className="w-full h-10 pl-9 pr-9 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown de sugestões */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              Nenhum produto encontrado para "{query}"
            </div>
          ) : (
            <ul ref={listRef} className="max-h-72 overflow-y-auto py-1">
              {filtered.map((s, i) => (
                <li key={`${s.category}-${s.familia}-${i}`}>
                  <button
                    type="button"
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      i === highlighted
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    }`}
                    onMouseEnter={() => setHighlighted(i)}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                  >
                    {/* Foto ou ícone */}
                    <div className="w-8 h-8 rounded-md overflow-hidden bg-muted/50 border border-border shrink-0 flex items-center justify-center">
                      {s.fotoUrl ? (
                        <img
                          src={s.fotoUrl}
                          alt={s.name}
                          className="w-full h-full object-contain p-0.5"
                          loading="lazy"
                        />
                      ) : (
                        <span className={CATEGORY_COLORS[s.category]}>
                          <CategoryIcon category={s.category} />
                        </span>
                      )}
                    </div>
                    {/* Texto */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">{s.familia}</span>
                        <span className={`text-xs font-medium shrink-0 ${CATEGORY_COLORS[s.category]}`}>
                          {s.category}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.instalacao && <span className="mr-1.5">{s.instalacao}</span>}
                        {s.potencia && <span className="mr-1.5">{s.potencia}</span>}
                        {s.code && <span className="font-mono">{s.code}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="px-3 py-1.5 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {filtered.length > 0
                ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""} · ↑↓ navegar · Enter selecionar`
                : "Tente outro termo de busca"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
