export type QuoteListFilterState = {
  search: string;
  status: string;
  sellerFilter: string;
  assistantFilter: string;
  duplicateFilter: "all" | "duplicates" | "unique";
  prospectingFilter: "all" | "prospecting" | "commercial";
  ldOriginFilter: "all" | "ld_only";
  ldResponseFilter: "all" | "awaiting_pdf" | "sent_pdf";
  dateFrom: string;
  dateTo: string;
  datePreset: string;
  page: number;
};

const QUOTE_LIST_FILTER_STATE_KEY = "sistema-luna:meus-orcamentos-filtros";

export const DEFAULT_QUOTE_LIST_FILTER_STATE: QuoteListFilterState = {
  search: "",
  status: "all",
  sellerFilter: "all",
  assistantFilter: "all",
  duplicateFilter: "all",
  prospectingFilter: "all",
  ldOriginFilter: "all",
  ldResponseFilter: "all",
  dateFrom: "",
  dateTo: "",
  datePreset: "all",
  page: 0,
};

function isOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? value as T : fallback;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function page(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function readQuoteListFilterState(): QuoteListFilterState {
  if (typeof window === "undefined") return DEFAULT_QUOTE_LIST_FILTER_STATE;

  try {
    const raw = window.sessionStorage.getItem(QUOTE_LIST_FILTER_STATE_KEY);
    if (!raw) return DEFAULT_QUOTE_LIST_FILTER_STATE;
    const parsed = JSON.parse(raw) as Partial<QuoteListFilterState>;
    return {
      search: text(parsed.search),
      status: text(parsed.status, "all"),
      sellerFilter: text(parsed.sellerFilter, "all"),
      assistantFilter: text(parsed.assistantFilter, "all"),
      duplicateFilter: isOneOf(parsed.duplicateFilter, ["all", "duplicates", "unique"] as const, "all"),
      prospectingFilter: isOneOf(parsed.prospectingFilter, ["all", "prospecting", "commercial"] as const, "all"),
      ldOriginFilter: isOneOf(parsed.ldOriginFilter, ["all", "ld_only"] as const, "all"),
      ldResponseFilter: isOneOf(parsed.ldResponseFilter, ["all", "awaiting_pdf", "sent_pdf"] as const, "all"),
      dateFrom: text(parsed.dateFrom),
      dateTo: text(parsed.dateTo),
      datePreset: text(parsed.datePreset, "all"),
      page: page(parsed.page),
    };
  } catch {
    return DEFAULT_QUOTE_LIST_FILTER_STATE;
  }
}

export function hasQuoteListFilters(state: QuoteListFilterState): boolean {
  return Boolean(
    state.search.trim()
    || state.status !== "all"
    || state.sellerFilter !== "all"
    || state.assistantFilter !== "all"
    || state.duplicateFilter !== "all"
    || state.prospectingFilter !== "all"
    || state.ldOriginFilter !== "all"
    || state.ldResponseFilter !== "all"
    || state.dateFrom
    || state.dateTo
    || state.datePreset !== "all",
  );
}

/** Mantém filtros apenas durante a navegação da sessão; limpar todos remove o estado. */
export function persistQuoteListFilterState(state: QuoteListFilterState): void {
  if (typeof window === "undefined") return;

  try {
    if (!hasQuoteListFilters(state)) {
      window.sessionStorage.removeItem(QUOTE_LIST_FILTER_STATE_KEY);
      return;
    }
    window.sessionStorage.setItem(QUOTE_LIST_FILTER_STATE_KEY, JSON.stringify(state));
  } catch {
    // Navegação continua funcional mesmo em contextos que bloqueiam sessionStorage.
  }
}

export function clearQuoteListFilterState(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(QUOTE_LIST_FILTER_STATE_KEY);
  } catch {
    // Nenhuma ação adicional é necessária se o navegador bloquear o armazenamento.
  }
}
