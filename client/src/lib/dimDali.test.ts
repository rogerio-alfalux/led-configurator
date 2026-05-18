import { describe, it, expect } from "vitest";
import { calculateComposition } from "./ledEngine";

describe("DIM DALI no ledEngine", () => {
  it("retorna controlType=dimDali e driverDimSelected quando controlType=dimDali", () => {
    const result = calculateComposition({
      profileCode: "LLE-2810",
      application: "D1",
      powerD1: 18,
      cct: "3000K",
      voltage: "220Vac",
      stripMethod: "STRIPFLEX",
      totalLength: 1200,
      allowLongModules: false,
      allowFractional: false,
      adjustToLarger: false,
      independentLighting: false,
      sheetDrivers: [],
      controlType: "dimDali",
      driverDimDali: { model: "OSRAM ETI 75W DALI (EQ00221)", code: null },
      driverDim110v: null,
    });
    console.log("controlType:", result.controlType);
    console.log("driverDimSelected:", JSON.stringify(result.driverDimSelected));
    expect(result.controlType).toBe("dimDali");
    expect(result.driverDimSelected).not.toBeNull();
    expect(result.driverDimSelected?.model).toBe("OSRAM ETI 75W DALI (EQ00221)");
  });
  
  it("retorna controlType=onoff e driverDimSelected=null quando controlType=onoff", () => {
    const result = calculateComposition({
      profileCode: "LLE-2810",
      application: "D1",
      powerD1: 18,
      cct: "3000K",
      voltage: "220Vac",
      stripMethod: "STRIPFLEX",
      totalLength: 1200,
      allowLongModules: false,
      allowFractional: false,
      adjustToLarger: false,
      independentLighting: false,
      sheetDrivers: [],
      controlType: "onoff",
      driverDimDali: { model: "OSRAM ETI 75W DALI (EQ00221)", code: null },
      driverDim110v: null,
    });
    expect(result.controlType).toBe("onoff");
    expect(result.driverDimSelected).toBeNull();
  });
});
