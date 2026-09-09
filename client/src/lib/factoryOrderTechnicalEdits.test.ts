import { describe, expect, it } from "vitest";
import { buildManualDriverLines } from "./factoryOrderTechnicalEdits";

describe("buildManualDriverLines", () => {
  it("persiste o driver escolhido com código, quantidade total e marcador manual", () => {
    expect(buildManualDriverLines("DRIVER DALI 40W", "EQ00999", 2, 8, { driverUnitPrice: 54 })).toEqual([
      expect.objectContaining({
        driverCode: "EQ00999",
        driverModel: "DRIVER DALI 40W",
        driverQty: 16,
        driverUnitPrice: 54,
        driverManual: true,
      }),
    ]);
  });

  it("remove linhas quando o campo de driver é limpo", () => {
    expect(buildManualDriverLines("", "", 1, 1)).toEqual([]);
  });
});
