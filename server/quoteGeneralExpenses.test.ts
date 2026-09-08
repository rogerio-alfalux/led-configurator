import { describe, expect, it } from "vitest";
import { buildQuoteGeneralExpenses } from "./quoteGeneralExpenses";

describe("buildQuoteGeneralExpenses", () => {
  it("soma amostras e manutenções ainda não recuperadas, custos adicionais e fretes isentados", () => {
    const summary = buildQuoteGeneralExpenses({
      samples: [
        { kind: "sample", status: "active", costAmount: "850.50" },
        { kind: "sample", status: "linked", costAmount: "300", financiallyTransferred: true },
        { kind: "maintenance", status: "active", costAmount: "100" },
        { kind: "maintenance", status: "linked", costAmount: "250", financiallyTransferred: true },
        { kind: "sample", status: "cancelled", costAmount: "50" },
      ],
      additionalCosts: [{ value: "120" }, { value: 80 }, { value: 0 }],
      freights: [{ value: "75", isWaived: true }, { value: 90, isWaived: false }],
    });

    expect(summary).toEqual({
      sampleCosts: 850.5,
      maintenanceCosts: 100,
      additionalCosts: 200,
      waivedFreights: 75,
      total: 1225.5,
      counts: { unrecoveredSamples: 1, unrecoveredMaintenances: 1, additionalCosts: 2, waivedFreights: 1 },
    });
  });

  it("não inventa custo quando os registros não possuem valores positivos", () => {
    const summary = buildQuoteGeneralExpenses({
      samples: [{ kind: "sample", status: "active", costAmount: null }],
      additionalCosts: [{ value: -10 }],
      freights: [{ value: undefined, isWaived: true }],
    });

    expect(summary.total).toBe(0);
    expect(summary.counts).toEqual({ unrecoveredSamples: 1, unrecoveredMaintenances: 0, additionalCosts: 0, waivedFreights: 0 });
  });
});
