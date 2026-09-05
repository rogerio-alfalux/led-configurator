export type EntityAnalyticsQuote = {
  id: number;
  clientName?: string | null;
  projectName?: string | null;
  totalFinal?: unknown;
  createdInPeriod: boolean;
  closedInPeriod: boolean;
  lostInPeriod: boolean;
  isManuallyDuplicate?: boolean | null;
  duplicatedFromQuoteId?: number | null;
};

export type EntityMetric = {
  key: string;
  label: string;
  quotedAmount: number;
  quotedQuoteCount: number;
  quotedAverageTicket: number | null;
  closedAmount: number;
  closedQuoteCount: number;
  closedAverageTicket: number | null;
  lostAmount: number;
  lostQuoteCount: number;
  lostAverageTicket: number | null;
  duplicateQuoteCount: number;
};

type MutableMetric = Omit<EntityMetric, "quotedAverageTicket" | "closedAverageTicket" | "lostAverageTicket">;

function amount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

function createMetric(key: string, label: string): MutableMetric {
  return {
    key,
    label,
    quotedAmount: 0,
    quotedQuoteCount: 0,
    closedAmount: 0,
    closedQuoteCount: 0,
    lostAmount: 0,
    lostQuoteCount: 0,
    duplicateQuoteCount: 0,
  };
}

function toResult(metric: MutableMetric): EntityMetric {
  return {
    ...metric,
    quotedAmount: rounded(metric.quotedAmount),
    closedAmount: rounded(metric.closedAmount),
    lostAmount: rounded(metric.lostAmount),
    quotedAverageTicket: metric.quotedQuoteCount > 0 ? rounded(metric.quotedAmount / metric.quotedQuoteCount) : null,
    closedAverageTicket: metric.closedQuoteCount > 0 ? rounded(metric.closedAmount / metric.closedQuoteCount) : null,
    lostAverageTicket: metric.lostQuoteCount > 0 ? rounded(metric.lostAmount / metric.lostQuoteCount) : null,
  };
}

function byNumber(field: keyof EntityMetric, direction: "asc" | "desc" = "desc") {
  return (a: EntityMetric, b: EntityMetric) => {
    const difference = Number(a[field] ?? 0) - Number(b[field] ?? 0);
    return direction === "desc" ? -difference : difference;
  };
}

function createRankings(rows: EntityMetric[]) {
  const highRecurrenceLowTicket = rows
    .filter((row) => row.quotedQuoteCount >= 2 && row.quotedAverageTicket !== null)
    .sort((a, b) => b.quotedQuoteCount - a.quotedQuoteCount || Number(a.quotedAverageTicket) - Number(b.quotedAverageTicket));
  return {
    quotedByValue: rows.filter((row) => row.quotedAmount > 0).sort(byNumber("quotedAmount")).slice(0, 10),
    quotedByRecurrence: rows.filter((row) => row.quotedQuoteCount > 0).sort(byNumber("quotedQuoteCount")).slice(0, 10),
    closedByValue: rows.filter((row) => row.closedAmount > 0).sort(byNumber("closedAmount")).slice(0, 10),
    closedByRecurrence: rows.filter((row) => row.closedQuoteCount > 0).sort(byNumber("closedQuoteCount")).slice(0, 10),
    lostByValue: rows.filter((row) => row.lostAmount > 0).sort(byNumber("lostAmount")).slice(0, 10),
    lostByRecurrence: rows.filter((row) => row.lostQuoteCount > 0).sort(byNumber("lostQuoteCount")).slice(0, 10),
    highRecurrenceLowTicket: highRecurrenceLowTicket.slice(0, 10),
    mostDuplicated: rows.filter((row) => row.duplicateQuoteCount > 0).sort(byNumber("duplicateQuoteCount")).slice(0, 10),
  };
}

function aggregateBy(quotes: EntityAnalyticsQuote[], getLabel: (quote: EntityAnalyticsQuote) => string | null) {
  const metrics = new Map<string, MutableMetric>();
  for (const quote of quotes) {
    const label = getLabel(quote)?.trim();
    if (!label) continue;
    const key = normalize(label);
    const metric = metrics.get(key) ?? createMetric(key, label);
    metrics.set(key, metric);
    const total = amount(quote.totalFinal);
    if (quote.createdInPeriod) {
      metric.quotedAmount += total;
      metric.quotedQuoteCount += 1;
      if (quote.isManuallyDuplicate || quote.duplicatedFromQuoteId != null) metric.duplicateQuoteCount += 1;
    }
    if (quote.closedInPeriod) {
      metric.closedAmount += total;
      metric.closedQuoteCount += 1;
    }
    if (quote.lostInPeriod) {
      metric.lostAmount += total;
      metric.lostQuoteCount += 1;
    }
  }
  const rows = Array.from(metrics.values()).map(toResult);
  return { rows: rows.sort(byNumber("closedAmount")), rankings: createRankings(rows) };
}

/**
 * Agregação de clientes e obras do período ativo. Orçados usam a data de
 * criação, fechados a aprovação e perdas a atualização, conforme o Dashboard.
 * Duplicações são atribuídas à criação porque não existe data própria do evento.
 */
export function buildDashboardEntityAnalytics(quotes: EntityAnalyticsQuote[]) {
  return {
    clients: aggregateBy(quotes, (quote) => quote.clientName ?? null),
    works: aggregateBy(quotes, (quote) => quote.projectName ?? null),
  };
}
