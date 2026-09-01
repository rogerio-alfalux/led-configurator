import { describe, expect, it } from "vitest";
import { buildLedBarEquipamentosText, buildLuminariaEquipamentosText, buildProfileEquipamentosText, buildProfileFonteLuzText, buildProfileSkuText } from "./orderPreviewGenerator";

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

describe("STRIPFLEX em nonos — prévia da ficha", () => {
  it("mostra 1,9 como duas barras completas", () => {
    const text = buildProfileFonteLuzText({
      moduloLed: "STRIPFLEX 562.5 X 10MM 3000K",
      profileSegments: [{ qty: 1, barsPerPiece: 1.9 }],
    } as any);

    expect(text).toContain("2 x STRIPFLEX");
  });

  it("soma duas quantidades 4,4 como 8,8 barras", () => {
    const text = buildProfileFonteLuzText({
      moduloLed: "STRIPFLEX 562.5 X 10MM 3000K",
      profileSegments: [
        { qty: 1, barsPerPiece: 4.4 },
        { qty: 1, barsPerPiece: 4.4 },
      ],
    } as any);

    expect(text).toContain("8,8 x STRIPFLEX");
  });
});

describe("estrutura heterogênea da API — prévia da ficha", () => {
  it("exibe lâmpada na Fonte de Luz e não inventa módulo LED", () => {
    expect(buildProfileFonteLuzText({
      category: "Decorativas",
      description: "LUMINÁRIA COM LÂMPADA",
      qty: 1,
      productLightingMode: "LAMP",
      productLightSource: { description: "LÂMPADA G9", code: "CP00991", type: "LAMPADA", quantity: 2 },
    } as any)).toBe("2 x LÂMPADA G9 (CP00991)");
  });

  it("exibe a PCI do SHIFT em Equipamentos", () => {
    const text = buildProfileEquipamentosText({
      category: "Perfis",
      description: "SHIFT",
      qty: 1,
      profileSegments: [{ sku: "LLE-4846.1IN", qty: 1, lengthMm: 500, barsPerPiece: 0, driverQtyPerPiece: 0, driverModel: "", driverCode: "" }],
      apiOtherEquipments: [{ description: "PCI CONTATO 500MM REV01 (500X26MM)", code: "MP00064", type: "MODULO_LED", quantity: 3 }],
    } as any);
    expect(text).toContain("3 x PCI CONTATO 500MM REV01 (500X26MM) (MP00064)");
  });
});
