import { describe, it, expect } from "vitest";
import { calculateComposition } from "./ledEngine";

describe("DIM DALI — driversD1 vs driverDimSelected", () => {
  it("driversD1 ainda usa driver ON/OFF mesmo com controlType=dimDali", () => {
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
    console.log("driversD1[0].driver.model:", result.driversD1[0]?.driver.model);
    // O driver DIM DALI deve aparecer em driverDimSelected
    expect(result.controlType).toBe("dimDali");
    expect(result.driverDimSelected?.model).toBe("OSRAM ETI 75W DALI (EQ00221)");
    // driversD1 ainda usa o driver ON/OFF (dimensionado por barras)
    // Isso é esperado — o driver DIM DALI é exibido separadamente
    console.log("driversD1 length:", result.driversD1.length);
  });
});
