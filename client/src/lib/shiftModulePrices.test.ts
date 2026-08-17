import { describe, expect, it } from "vitest";
import { parseShiftModuleManualPrice } from "./shiftModulePrices";

describe("parseShiftModuleManualPrice", () => {
  it("aceita preço brasileiro com milhar e vírgula", () => {
    expect(parseShiftModuleManualPrice("1.234,56")).toBe(1234.56);
  });

  it("aceita decimal com ponto, valor zero e campo vazio", () => {
    expect(parseShiftModuleManualPrice("1234.56")).toBe(1234.56);
    expect(parseShiftModuleManualPrice("0")).toBe(0);
    expect(parseShiftModuleManualPrice("")).toBeNull();
  });
});
