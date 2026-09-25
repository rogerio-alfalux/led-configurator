export type DashboardClientMetrics = {
  key: string;
  label: string;
  quotedAmount: number;
  quotedQuoteCount: number;
  quotedAverageTicket: number | null;
  openAmount: number;
  openQuoteCount: number;
  closedAmount: number;
  closedQuoteCount: number;
  closedAverageTicket: number | null;
  lostAmount: number;
  lostQuoteCount: number;
  lostAverageTicket: number | null;
  duplicateQuoteCount: number;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Filtra clientes por nome, ignorando acentos, e mantém a lista estável para
 * que a seleção no autocomplete não salte entre renderizações.
 */
export function searchDashboardClients(rows: DashboardClientMetrics[], query: string, limit = 8): DashboardClientMetrics[] {
  const search = normalize(query);
  return rows
    .filter((row) => !search || normalize(row.label).includes(search))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }))
    .slice(0, limit);
}

/** Localiza um cliente pela chave técnica normalizada, preservada no analytics. */
export function findDashboardClient(rows: DashboardClientMetrics[], key: string | null): DashboardClientMetrics | null {
  if (!key) return null;
  return rows.find((row) => row.key === key) ?? null;
}
