import { describe, expect, it } from "vitest";
import { readAdditionalCostsAggregate } from "./dashboardAdditionalCosts";

describe("readAdditionalCostsAggregate", () => {
  it("lê resultados diretos de uma linha", () => {
    expect(readAdditionalCostsAggregate([{ total: "7788.65", count: "3" }])).toEqual({
      total: 7788.65,
      count: 3,
    });
  });

  it("lê a tupla de linhas e metadados sem descartar os custos adicionais", () => {
    expect(readAdditionalCostsAggregate([[{ total: "7788.65", count: "3" }], { fieldCount: 2 }])).toEqual({
      total: 7788.65,
      count: 3,
    });
  });
});
