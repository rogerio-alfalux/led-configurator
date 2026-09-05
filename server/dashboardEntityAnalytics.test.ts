import { describe, expect, it } from "vitest";
import { buildDashboardEntityAnalytics } from "./dashboardEntityAnalytics";

describe("buildDashboardEntityAnalytics", () => {
  it("separa valor, recorrência e ticket dos clientes no recorte de cada evento", () => {
    const analytics = buildDashboardEntityAnalytics([
      { id: 1, clientName: "Cliente A", projectName: "Obra 1", totalFinal: 1_000, createdInPeriod: true, closedInPeriod: true, lostInPeriod: false },
      { id: 2, clientName: "Cliente A", projectName: "Obra 2", totalFinal: 200, createdInPeriod: true, closedInPeriod: false, lostInPeriod: true },
      { id: 3, clientName: "Cliente B", projectName: "Obra 3", totalFinal: 5_000, createdInPeriod: true, closedInPeriod: false, lostInPeriod: true },
    ]);

    expect(analytics.clients.rankings.quotedByRecurrence[0]).toMatchObject({ label: "Cliente A", quotedQuoteCount: 2, quotedAverageTicket: 600 });
    expect(analytics.clients.rankings.quotedByValue[0]).toMatchObject({ label: "Cliente B", quotedAmount: 5_000 });
    expect(analytics.clients.rankings.lostByValue[0]).toMatchObject({ label: "Cliente B", lostAmount: 5_000 });
  });

  it("conta duplicações de obra somente no período de criação e ignora obras vazias", () => {
    const analytics = buildDashboardEntityAnalytics([
      { id: 1, clientName: "Cliente A", projectName: "Obra Norte", totalFinal: 1_000, createdInPeriod: true, closedInPeriod: false, lostInPeriod: false, duplicatedFromQuoteId: 99 },
      { id: 2, clientName: "Cliente B", projectName: "Obra Norte", totalFinal: 2_000, createdInPeriod: true, closedInPeriod: false, lostInPeriod: false, isManuallyDuplicate: true },
      { id: 3, clientName: "Cliente C", projectName: null, totalFinal: 3_000, createdInPeriod: true, closedInPeriod: false, lostInPeriod: false, isManuallyDuplicate: true },
    ]);

    expect(analytics.works.rankings.mostDuplicated[0]).toMatchObject({ label: "Obra Norte", duplicateQuoteCount: 2 });
    expect(analytics.works.rows).toHaveLength(1);
  });
});
