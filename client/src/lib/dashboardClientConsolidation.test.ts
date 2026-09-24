import { describe, expect, it } from "vitest";
import {
  findDashboardClient,
  searchDashboardClients,
  type DashboardClientMetrics,
} from "./dashboardClientConsolidation";

const clients: DashboardClientMetrics[] = [
  {
    key: "ALFA ENGENHARIA", label: "Alfa Engenharia", quotedAmount: 12_000, quotedQuoteCount: 2, quotedAverageTicket: 6_000,
    closedAmount: 8_000, closedQuoteCount: 1, closedAverageTicket: 8_000,
    lostAmount: 4_000, lostQuoteCount: 1, lostAverageTicket: 4_000, duplicateQuoteCount: 0,
  },
  {
    key: "BETA LUZ", label: "Béta Luz", quotedAmount: 4_000, quotedQuoteCount: 1, quotedAverageTicket: 4_000,
    closedAmount: 0, closedQuoteCount: 0, closedAverageTicket: null,
    lostAmount: 4_000, lostQuoteCount: 1, lostAverageTicket: 4_000, duplicateQuoteCount: 0,
  },
];

describe("dashboardClientConsolidation", () => {
  it("localiza clientes ignorando acentos e ordena sugestões por nome", () => {
    expect(searchDashboardClients(clients, "beta")).toEqual([clients[1]]);
    expect(searchDashboardClients(clients, "").map((client) => client.label)).toEqual(["Alfa Engenharia", "Béta Luz"]);
  });

  it("recupera o agregado escolhido pela chave técnica do analytics", () => {
    expect(findDashboardClient(clients, "ALFA ENGENHARIA")).toMatchObject({
      label: "Alfa Engenharia",
      quotedAmount: 12_000,
      closedAmount: 8_000,
      lostAmount: 4_000,
    });
    expect(findDashboardClient(clients, "CLIENTE INEXISTENTE")).toBeNull();
  });
});
