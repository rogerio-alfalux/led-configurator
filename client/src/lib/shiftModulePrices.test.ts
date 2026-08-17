import { describe, expect, it } from "vitest";
import { calculateLinkedAccessoriesTotal, parseShiftModuleManualPrice } from "./shiftModulePrices";

describe("parseShiftModuleManualPrice", () => {
  it("aceita preço brasileiro com milhar e vírgula", () => {
    expect(parseShiftModuleManualPrice("1.234,56")).toBe(1234.56);
  });

  it("aceita decimal com ponto, valor zero e campo vazio", () => {
    expect(parseShiftModuleManualPrice("1234.56")).toBe(1234.56);
    expect(parseShiftModuleManualPrice("0")).toBe(0);
    expect(parseShiftModuleManualPrice("")).toBeNull();
  });

  it("inclui módulos SHIFT pelo preço e quantidade efetivos do item pai", () => {
    expect(calculateLinkedAccessoriesTotal({
      qty: 2,
      accessories: [
        { codigo: "S01-06860", descricao: "Módulo SHIFT", familia: "SHIFT MÓDULO", qty: 3, unitPrice: 125.5 },
        { codigo: "S01-06863", descricao: "Módulo SHIFT", familia: "SHIFT MÓDULO", qty: 1, unitPrice: 80 },
      ],
    })).toBe(913);
  });
});
