import { describe, expect, it } from "vitest";
import { calculateComposition } from "./ledEngine";

describe("composição D1+D2 fornecida pela API", () => {
  it("usa quantidade de módulos e driver da variante D1+D2 da API para BLAZE H pendente", () => {
    const baseInput = {
      profileCode: "LLA-4450",
      application: "D1+D2" as const,
      powerD1: 18 as const,
      powerD2: 18 as const,
      cct: "3000K" as const,
      voltage: "220Vac" as const,
      totalLength: 575,
      allowLongModules: false,
      independentLighting: false,
      stripMethod: "STRIPFLEX" as const,
    };
    const base = calculateComposition(baseInput);
    const selectedSku = base.composition[0].sku;
    const result = calculateComposition({
      ...baseInput,
      apiD1D2BySku: {
        [`LLP-${selectedSku.slice(4)}|18|18|DEFAULT`]: {
          qtdModuloLed: 2,
          drivers: [{
            tipo: "DRIVER_ONOFF_220",
            modelo: "LED DRIVER XITANIUM 44W 200-350MA 70-125VDC DIP SWITCH 230V (EQ00347)",
            qtd: 1,
            custo: "18.0000",
          }],
        },
      },
    });

    expect(result.composition).toHaveLength(1);
    expect(result.composition[0].barsPerModule).toBe(2);
    expect(result.totalBars).toBe(2);
    expect(result.combinedDrivers?.[0].driver.model).toContain("44W");
    expect(result.combinedDrivers?.[0].driver.code).toBe("EQ00347");
  });
});
