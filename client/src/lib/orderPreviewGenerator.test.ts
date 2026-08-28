import { describe, expect, it } from "vitest";
import { buildLedBarEquipamentosText, buildLuminariaEquipamentosText, buildProfileSkuText } from "./orderPreviewGenerator";

describe("buildProfileSkuText — prévia de ficha técnica", () => {
  it("mostra a quantidade por SKU também para orçamentos históricos", () => {
    const text = buildProfileSkuText({
      sku: "LLP-6060",
      profileSegments: [
        { sku: "LLP-6060.2IF.48F", qty: 2 },
        { sku: "LLP-6060.5ML.48F", qty: 2 },
        { sku: "LLP-6060.3ML.48F", qty: 1 },
      ],
    } as any);

    expect(text).toBe("2 x LLP-6060.2IF.48F<br>2 x LLP-6060.5ML.48F<br>1 x LLP-6060.3ML.48F");
  });
});

describe("programação de corrente — prévia da ficha", () => {
  it("exibe a corrente API para luminária e fonte 24V", () => {
    const luminaria = buildLuminariaEquipamentosText({
      qty: 1,
      driverLines: [{ driverCode: "EQ00348", driverModel: "DRIVER 44W", driverQty: 1, driverUnitPrice: null, driverTotalPrice: null, corrente: "350mA" }],
    } as any);
    const ledBar = buildLedBarEquipamentosText({
      category: "LED BAR",
      ledBarNCortes: 2,
      ledBarDriverModel: "FONTE 60W 24V",
      ledBarDriverCode: "EQ00801",
      ledBarDriverCorrente: "250mA",
    } as any);

    expect(luminaria).toContain("PROGRAMAÇÃO: 350mA");
    expect(ledBar).toContain("PROGRAMAÇÃO: 250mA");
  });
});
