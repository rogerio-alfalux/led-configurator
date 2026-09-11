import { describe, it, expect } from "vitest";
import { enrichDriverCurrentsFromApi, enrichShiftAccessoryTechnicalComponents, migrateItemDrivers, migrateLegacyGlowCommercialItem, normalizeRv00064TechnicalConfiguration, parseCartItemData, selectApiTechnicalVariantForItem } from "./cartTypes";

describe("parseCartItemData - correção de driverQty para perfis", () => {
  it("corrige driverQty quando está salvo apenas por luminária (BLAZE 45700mm, 12 lum, 17 drv/lum)", () => {
    const item = {
      sku: "LLS-3945",
      description: "BLAZE Sobrepor 18W 3000K ON/OFF 220Vac 45700mm",
      qty: 12,
      totalPrice: 183371.28,
      driverLines: [
        {
          driverCode: "EQ00396",
          driverModel: "PHILIPS XITANIUM 44W",
          driverQty: 17, // ERRADO: só por luminária, sem multiplicar por 12
          driverUnitPrice: 54,
          driverTotalPrice: 918, // ERRADO: 54 × 17 = 918
        },
      ],
      profileSegments: [
        { qty: 2, driverCode: "EQ00396", driverQtyPerPiece: 1, driverModel: "PHILIPS XITANIUM 44W" },
        { qty: 15, driverCode: "EQ00396", driverQtyPerPiece: 1, driverModel: "PHILIPS XITANIUM 44W" },
      ],
    };

    const result = parseCartItemData(JSON.stringify(item));
    expect(result).not.toBeNull();
    const dl = result!.driverLines![0];
    // 17 drivers/lum × 12 lum = 204 drivers
    expect(dl.driverQty).toBe(204);
    // 54 × 204 = 11016
    expect(dl.driverTotalPrice).toBe(11016);
    expect(dl.driverUnitPrice).toBe(54); // unitPrice não muda
  });

  it("corrige driverQty para BLAZE 3965mm (26 lum, 3 drv/lum)", () => {
    const item = {
      sku: "LLS-3945",
      qty: 26,
      totalPrice: 65395.20,
      driverLines: [
        { driverCode: "EQ00396", driverQty: 3, driverUnitPrice: 108, driverTotalPrice: 324 },
      ],
      profileSegments: [
        { qty: 2, driverCode: "EQ00396", driverQtyPerPiece: 1 },
        { qty: 1, driverCode: "EQ00396", driverQtyPerPiece: 1 },
      ],
    };

    const result = parseCartItemData(JSON.stringify(item));
    expect(result!.driverLines![0].driverQty).toBe(78); // 3 × 26 = 78
    expect(result!.driverLines![0].driverTotalPrice).toBe(8424); // 108 × 78 = 8424
  });

  it("NÃO altera driverQty quando já está correto (BLAZE 31600mm, 4 lum, 12 drv/lum = 48 total)", () => {
    const item = {
      sku: "LLS-3945",
      qty: 4,
      totalPrice: 84416.32,
      driverLines: [
        { driverCode: "EQ00396", driverQty: 48, driverUnitPrice: 54, driverTotalPrice: 2592 },
      ],
      profileSegments: [
        { qty: 2, driverCode: "EQ00396", driverQtyPerPiece: 1 },
        { qty: 10, driverCode: "EQ00396", driverQtyPerPiece: 1 },
      ],
    };

    const result = parseCartItemData(JSON.stringify(item));
    // 12 drv/lum × 4 lum = 48 — já correto, não deve alterar
    expect(result!.driverLines![0].driverQty).toBe(48);
    expect(result!.driverLines![0].driverTotalPrice).toBe(2592);
  });

  it("NÃO altera driverLines de itens sem profileSegments (downlights, spots, etc.)", () => {
    const item = {
      sku: "DL-001",
      qty: 5,
      totalPrice: 1000,
      driverLines: [
        { driverCode: "EQ00100", driverQty: 5, driverUnitPrice: 50, driverTotalPrice: 250 },
      ],
      // sem profileSegments
    };

    const result = parseCartItemData(JSON.stringify(item));
    expect(result!.driverLines![0].driverQty).toBe(5);
    expect(result!.driverLines![0].driverTotalPrice).toBe(250);
  });

  it("corrige somente o padrão inequívoco de driver multiplicado duas vezes em luminária", () => {
    const item = {
      sku: "LDP-4359.400.50P",
      description: "TURPIN P LED 4,5W 36° Ø38 X 400MM 3000K",
      category: "Decorativas",
      qty: 379,
      unitPrice: 255,
      totalPrice: 96645,
      priceWithoutDriver: 96645,
      driverQtyPerUnit: 1,
      driverLines: [{
        driverCode: "EQ00346",
        driverModel: "LED DRIVER XITANIUM 19W",
        driverQty: 143641,
        driverUnitPrice: 54,
        driverTotalPrice: 7756614,
      }],
    };

    const result = parseCartItemData(JSON.stringify(item));

    expect(result!.driverLines![0].driverQty).toBe(379);
    expect(result!.driverLines![0].driverTotalPrice).toBe(20466);
    expect(result!.totalPrice).toBe(96645);
  });

  it("retorna null para JSON inválido", () => {
    expect(parseCartItemData("invalid json")).toBeNull();
  });
});

describe("migrateItemDrivers - itens não-perfil consultam a API", () => {
describe("parseCartItemData - múltiplos modelos de driver (caso 33.9995-26)", () => {
  it("adiciona linhas de driver faltantes para segmentos com códigos distintos", () => {
    const item = {
      sku: "LLP-6060",
      description: "BLAZE H Pendente 18W 3000K ON/OFF 220Vac 9605mm",
      qty: 1,
      unitPriceDriver: 54,
      driverLines: [
        { driverCode: "EQ00346", driverModel: "LED DRIVER XITANIUM 19W", driverQty: 2, driverUnitPrice: 54, driverTotalPrice: 108 },
      ],
      profileSegments: [
        { sku: "LLP-6060.2IF.48F", qty: 2, driverQtyPerPiece: 1, driverCode: "EQ00346", driverModel: "LED DRIVER XITANIUM 19W" },
        { sku: "LLP-6060.5ML.48F", qty: 2, driverQtyPerPiece: 1, driverCode: "EQ00347", driverModel: "LED DRIVER XITANIUM 44W" },
        { sku: "LLP-6060.3ML.48F", qty: 1, driverQtyPerPiece: 1, driverCode: "EQ00347", driverModel: "LED DRIVER XITANIUM 44W" },
      ],
    };

    const result = parseCartItemData(JSON.stringify(item));
    expect(result).not.toBeNull();
    expect(result!.driverLines).toHaveLength(2);

    const dl346 = result!.driverLines!.find(dl => dl.driverCode === "EQ00346");
    const dl347 = result!.driverLines!.find(dl => dl.driverCode === "EQ00347");

    expect(dl346).toBeDefined();
    expect(dl346!.driverQty).toBe(2); // 2 segmentos IF × 1 driver/peça
    expect(dl346!.driverTotalPrice).toBe(108); // 54 × 2

    expect(dl347).toBeDefined();
    expect(dl347!.driverQty).toBe(3); // 2 segmentos ML + 1 segmento ML × 1 driver/peça
    expect(dl347!.driverModel).toBe("LED DRIVER XITANIUM 44W");
  });
});

  it("corrige CCT/quantidade de módulo e total de drivers com os campos da API", () => {
    const item = {
      category: "Spots",
      sku: "SP-API",
      description: "SPOT TESTE 4000K 220Vac",
      cct: "4000K",
      qty: 145,
      moduloLed: "MÓDULO ANTIGO 3000K (EQOLD)",
      moduloLedCode: "EQOLD",
      driverLines: [{ driverCode: "EQOLD-DRV", driverModel: "DRIVER ANTIGO", driverQty: 83, driverUnitPrice: 10, driverTotalPrice: 830 }],
    } as any;
    const productMap = new Map([[
      "SP-API",
      {
        sku: "SP-API",
        driver220: { code: "EQDRIVER", model: "DRIVER API 20W" },
        driverBivolt: null,
        driverQtd220: 1,
        driverQtdBivolt: null,
        ledModuleEq4000: "EQMOD4000",
        ledModuleQtd4000: 2,
      },
    ]]);
    const descMap = new Map([
      ["EQDRIVER", "DRIVER API 20W 400MA"],
      ["EQMOD4000", "MÓDULO LED API 4000K"],
    ]);

    const result = migrateItemDrivers(item, new Map([["EQDRIVER", 10]]), descMap, productMap);

    expect(result.driverQtyPerUnit).toBe(1);
    expect(result.driverLines).toEqual(expect.arrayContaining([
      expect.objectContaining({ driverCode: "EQDRIVER", driverQty: 145, driverModel: "DRIVER API 20W 400MA" }),
    ]));
    expect(result.moduloLedCode).toBe("EQMOD4000");
    expect(result.moduloLed).toContain("2x MÓDULO LED API 4000K (EQMOD4000)");
  });

  it("preserva o preço comercial manual do driver e o preço da luminária durante a reidratação", () => {
    const item = {
      category: "Painéis",
      sku: "ALE-2750.618.18F",
      description: "ALE-2750 18W RTG 618MM (C/ MOLA) 3000K ON/OFF 220V",
      cct: "3000K",
      qty: 298,
      unitPrice: 354.35,
      unitPriceLuminaria: 354.35,
      priceWithoutDriver: 105596.3,
      totalPrice: 121688.3,
      driverLines: [{
        driverCode: "EQ00346",
        driverModel: "LED DRIVER XITANIUM 19W 200-350MA 30-54V",
        driverQty: 298,
        driverUnitPrice: 54,
        driverTotalPrice: 16092,
        driverPriceManual: true,
      }],
    } as any;
    const productMap = new Map([["ALE-2750.618.18F", {
      sku: "ALE-2750.618.18F",
      driver220: { code: "EQ00346", model: "LED DRIVER XITANIUM 19W" },
      driverQtd220: 1,
    }]]);
    const descMap = new Map([["EQ00346", "LED DRIVER XITANIUM 19W 200-350MA 30-54V"]]);

    const result = migrateItemDrivers(item, new Map([["EQ00346", 19.45]]), descMap, productMap);

    expect(result.driverLines![0]).toMatchObject({
      driverUnitPrice: 54,
      driverTotalPrice: 16092,
      driverPriceManual: true,
    });
    expect(result.unitPriceLuminaria).toBe(354.35);
    expect(result.priceWithoutDriver).toBe(105596.3);
    expect(result.totalPrice).toBe(121688.3);
  });

  it("preserva 4,4 módulos LED por peça ao reidratar o ALE-2430 pela API", () => {
    const item = {
      category: "Painéis",
      sku: "LLE-2430.300.19F",
      description: "ALE-2430 36W 3000K ON/OFF 220V",
      cct: "3000K",
      qty: 48,
      moduloLed: "4.4X STRIPFLEX ANTIGO (EQ00125)",
      moduloLedCode: "EQ00125",
    } as any;
    const productMap = new Map([["LLE-2430.300.19F", {
      sku: "LLE-2430.300.19F",
      name: "ALE-2430 36W 300X300MM",
      ledModuleEq3000: "EQ00125",
      ledModuleQtd3000: 4.4,
    }]]);
    const descMap = new Map([
      ["EQ00125", "STRIPFLEX 562.5 X 10MM - 36 LEDS 830 - 3000K (LC) 25V"],
    ]);

    const result = migrateItemDrivers(item, new Map(), descMap, productMap);

    expect(result.moduloLedCode).toBe("EQ00125");
    expect(result.moduloLed).toBe("4.4x STRIPFLEX 562.5 X 10MM - 36 LEDS 830 - 3000K (LC) 25V (EQ00125)");
  });

  it("preserva o módulo LED escolhido manualmente na ficha contra reidratação da API", () => {
    const item = {
      category: "Painéis",
      sku: "LLE-2430.300.19F",
      description: "ALE-2430 36W 3000K ON/OFF 220V",
      cct: "3000K",
      qty: 2,
      moduloLed: "2.2x MÓDULO MANUAL (EQ00991)",
      moduloLedCode: "EQ00991",
      moduloLedManual: true,
    } as any;
    const productMap = new Map([["LLE-2430.300.19F", {
      sku: "LLE-2430.300.19F",
      ledModuleEq3000: "EQ00125",
      ledModuleQtd3000: 4.4,
    }]]);

    const result = migrateItemDrivers(item, new Map(), new Map(), productMap);

    expect(result.moduloLedCode).toBe("EQ00991");
    expect(result.moduloLed).toBe("2.2x MÓDULO MANUAL (EQ00991)");
  });

  it("preserva o módulo LED manual de um segmento de perfil contra reidratação da API", () => {
    const item = {
      category: "Perfis",
      sku: "LLP-6060",
      description: "BLAZE H 18W 3000K",
      cct: "3000K",
      power: "18W",
      profileSegments: [{
        sku: "LLP-6060.2IF.18F",
        qty: 1,
        lengthMm: 1125,
        barsPerPiece: 2.2,
        driverQtyPerPiece: 1,
        driverModel: "DRIVER API",
        driverCode: "EQ00347",
        ledModuleCode: "EQ00991",
        ledModuleManual: true,
      }],
    } as any;
    const productMap = new Map([["LLP-6060.2IF.18F|18W", {
      sku: "LLP-6060.2IF.18F",
      ledModuleEq3000: "EQ00125",
    }]]);

    const result = migrateItemDrivers(item, new Map(), new Map(), productMap);

    expect(result.profileSegments?.[0].ledModuleCode).toBe("EQ00991");
    expect(result.profileSegments?.[0].ledModuleManual).toBe(true);
  });

  it("usa a composição D1+D2 oficial da API em vez do driver legado da versão D1", () => {
    const item = {
      category: "Perfis",
      sku: "LLA-3395",
      description: "HIT Arandela D1+D2 18W 3000K ON/OFF 220Vac 1135mm",
      power: "18W",
      qty: 16,
      profileSegments: [{
        sku: "LLA-3395.2IN.58F",
        qty: 1,
        lengthMm: 1135,
        barsPerPiece: 2,
        driverQtyPerPiece: 1,
        driverModel: "LED DRIVER XITANIUM 19W 200-350MA 30-54VDC DS 230V",
        driverCode: "EQ00346",
      }],
      driverLines: [{
        driverCode: "EQ00346",
        driverModel: "LED DRIVER XITANIUM 19W 200-350MA 30-54VDC DS 230V",
        driverQty: 16,
        driverUnitPrice: 54,
        driverTotalPrice: 864,
      }],
    } as any;
    const apiD1D2Model = "LED DRIVER XITANIUM 44W 200-350MA 70-125VDC DIP SWITCH 230V";
    const productMap = new Map([["LLA-3395.2IN.58F|18W", {
      sku: "LLA-3395.2IN.58F",
      driver220: { code: "EQ00346", model: "LED DRIVER XITANIUM 19W 200-350MA 30-54VDC DS 230V" },
      driverQtd220: 1,
      composicaoD1D2: {
        qtdModuloLed: 4,
        drivers: [{ tipo: "DRIVER_ONOFF_220", modelo: apiD1D2Model, qtd: 1, custo: "18.00" }],
      },
    } as any]]);
    const descMap = new Map([["EQ00347", apiD1D2Model]]);
    const reverseDescMap = new Map([[apiD1D2Model, "EQ00347"]]);

    const result = migrateItemDrivers(item, new Map([["EQ00347", 18]]), descMap, productMap, new Map([["EQ00347", "350mA"]]), reverseDescMap);

    expect(result.profileSegments?.[0]).toMatchObject({
      barsPerPiece: 4,
      driverCode: "EQ00347",
      driverQtyPerPiece: 1,
      corrente: "350mA",
    });
    expect(result.driverLines).toEqual([expect.objectContaining({
      driverCode: "EQ00347",
      driverQty: 16,
      driverUnitPrice: 18,
      driverTotalPrice: 288,
    })]);
  });

  it("reidrata custo e markup da variante exata sem reprecificar a venda salva", () => {
    const item = {
      category: "Spots",
      sku: "LDE-1021.1DK.60B",
      description: "EASY LED POINT 1X6 13W 48º ORIENTÁVEL 3000K DIM DALI 220V",
      cct: "3000K",
      qty: 49,
      unitPrice: 427.51,
      totalPrice: 20947.99,
      driverLines: [{ driverCode: "EQ00640", driverModel: "DRIVER LEGADO", driverQty: 49, driverUnitPrice: 217.35, driverTotalPrice: 10650.15 }],
    } as any;
    const productMap = new Map([["LDE-1021.1DK.60B|EASY LED POINT 1X6 13W 48º ORIENTÁVEL", {
      sku: "LDE-1021.1DK.60B",
      name: "EASY LED POINT 1X6 13W 48º ORIENTÁVEL",
      driver220: null,
      driverBivolt: null,
      driverDimDali: { code: "EQ00640", model: "DRIVER API 30W DALI" },
      driverQtd220: null,
      driverQtdBivolt: null,
      driverQtdDimDali: 1,
      custoCorpoDimDali: 104.15,
      custoDriverDimDali: 72.45,
      markupPadraoDimDali: 3,
      markupMinimoDimDali: 2,
      markupMinimoDriver: 2,
    }]]);

    const result = migrateItemDrivers(item, new Map([["EQ00640", 217.35]]), new Map([["EQ00640", "DRIVER API 30W DALI"]]), productMap);

    expect(result).toMatchObject({
      unitPrice: 427.51,
      totalPrice: 20947.99,
      custoCorpoBase: 104.15,
      custoDriverBase: 72.45,
      markupPadraoApi: 3,
      markupMinimoApi: 2,
      markupMinimoDriverApi: 2,
    });
  });
});

describe("migrateItemDrivers - perfis usam a variante API da potência selecionada", () => {
  it("substitui driver e programação antigos pela variante 26W/500mA da API", () => {
    const item = {
      category: "Perfis", sku: "LLP-6060", description: "BLAZE H 26W", power: "26W", cct: "3000K", qty: 1,
      unitPrice: null, totalPrice: null, photoUrl: null, stripMethod: "STRIPFLEX",
      profileSegments: [{ sku: "LLP-6060.2IF.26F", qty: 2, lengthMm: 1180, barsPerPiece: 2, driverQtyPerPiece: 1, driverModel: "DRIVER ANTIGO", driverCode: "EQOLD", corrente: "350mA" }],
      driverLines: [{ driverCode: "EQOLD", driverModel: "DRIVER ANTIGO", driverQty: 2, driverUnitPrice: null, driverTotalPrice: null, corrente: "350mA" }],
    } as any;
    const productMap = new Map([["LLP-6060.2IF.26F|26W", {
      sku: "LLP-6060.2IF.26F", driver220: { model: "DRIVER API 26W", code: "EQ0026" }, driverBivolt: null,
      driverQtd220: 1, driverQtdBivolt: null, correnteDriver: "500mA",
    }]]);

    const migrated = migrateItemDrivers(item, new Map([["EQ0026", 50]]), new Map([["EQ0026", "DRIVER API 26W"]]), productMap);
    expect(migrated.profileSegments?.[0].driverCode).toBe("EQ0026");
    expect(migrated.profileSegments?.[0].corrente).toBe("500mA");
    expect(migrated.driverLines?.[0]).toMatchObject({ driverCode: "EQ0026", driverQty: 2, corrente: "500mA" });
  });
});

describe("migrateLegacyGlowCommercialItem", () => {
  it("seleciona a variante GLOW exata pelo nome quando o SKU é compartilhado", () => {
    const item = {
      category: "Perfis",
      sku: "LLS-9465.577.65F",
      description: "GLOW S 37W 577MM 3000K 220V",
      cct: "3000K",
      qty: 144,
      unitPrice: 202,
      totalPrice: 29088,
      photoUrl: null,
      drivers: "DRIVER LED DRIVER XITANIUM 35W 80-350MA 50-220VDC 220V DALI (EQ00659)",
    } as any;
    const productMap = new Map([
      ["LLS-9465.577.65F|GLOW S 18W 577MM", {
        sku: "LLS-9465.577.65F", name: "GLOW S 18W 577MM",
        driver220: { code: "EQ00347", model: "DRIVER 44W" }, driverBivolt: null,
        driverQtd220: 1, driverQtdBivolt: null,
      }],
      ["LLS-9465.577.65F|GLOW S 37W 577MM", {
        sku: "LLS-9465.577.65F", name: "GLOW S 37W 577MM",
        driver220: { code: "EQ00348", model: "DRIVER 65W" }, driverBivolt: null,
        driverDimDali: { code: "EQ00659", model: "DRIVER 35W DALI" },
        driverQtd220: 1, driverQtdBivolt: null, driverQtdDimDali: 1,
        custoCorpoDimDali: 145.5337, custoDriverDimDali: 87.46,
        markupPadraoDimDali: 2, markupPadraoDriverDimDali: 3, markupMinimoDriver: 3,
      }],
    ]);

    const migrated = migrateLegacyGlowCommercialItem(
      item,
      new Map([["EQ00659", 262.38]]),
      new Map([["EQ00659", "LED DRIVER 35W 220V DALI"]]),
      productMap,
    );

    expect(migrated.description).toBe("GLOW S 37W 577MM 3000K 220V");
    expect(migrated.unitPrice).toBe(202);
    expect(migrated.totalPrice).toBe(29088);
    expect(migrated.driverLines).toEqual([expect.objectContaining({
      driverCode: "EQ00659", driverQty: 144, driverUnitPrice: 262.38, driverTotalPrice: 37782.72,
    })]);
  });

  it("reconstrói o GLOW DALI legado com corpo e driver da variante API exata", () => {
    const item = {
      category: "Perfis",
      sku: "LLS-9465.115.65F",
      description: "GLOW S 54W 1154MM 3000K 220V",
      cct: "3000K",
      qty: 41,
      unitPrice: 345.21,
      totalPrice: 14153.61,
      photoUrl: null,
      drivers: "DRIVER LED DRIVER 100W 150-500MA 100-300VDC 220V DALI (EQ00179)",
    } as any;
    const productMap = new Map([[
      "LLS-9465.115.65F|GLOW S 54W 1154MM",
      {
        sku: "LLS-9465.115.65F",
        name: "GLOW S 54W 1154MM",
        driver220: { code: "EQ00348", model: "DRIVER 65W" },
        driverBivolt: null,
        driverDimDali: { code: "EQ00179", model: "DRIVER 100W DALI" },
        driverQtd220: 1,
        driverQtdBivolt: null,
        driverQtdDimDali: 1,
        custoCorpoDimDali: 172.6047,
        custoDriverDimDali: 159.84,
        markupPadraoDimDali: 2,
        markupPadraoDriverDimDali: 3,
        markupMinimoDriver: 3,
      },
    ]]);

    const migrated = migrateLegacyGlowCommercialItem(
      item,
      new Map([["EQ00179", 479.52]]),
      new Map([["EQ00179", "LED DRIVER 100W 220V DALI"]]),
      productMap,
      new Map([["EQ00179", "500mA"]]),
    );

    expect(migrated.description).toBe("GLOW S 54W 1154MM 3000K 220V");
    expect(migrated.unitPrice).toBe(345.21);
    expect(migrated.totalPrice).toBe(14153.61);
    expect(migrated.driverLines).toEqual([expect.objectContaining({
      driverCode: "EQ00179", driverQty: 41, driverUnitPrice: 479.52, driverTotalPrice: 19660.32, corrente: "500mA",
    })]);
  });

  it("preenche o preço oficial do EQ00348 quando o item GLOW legado não o persistiu", () => {
    const item = {
      category: "Perfis",
      sku: "LLS-9465.115.65F",
      description: "GLOW S 37W 1154MM 3000K 220V",
      qty: 6,
      unitPrice: 345.21,
      totalPrice: 2071.26,
      photoUrl: null,
    } as any;
    const productMap = new Map([["LLS-9465.115.65F|GLOW S 37W 1154MM", {
      sku: "LLS-9465.115.65F",
      name: "GLOW S 37W 1154MM",
      driver220: { code: "EQ00348", model: "DRIVER 65W" },
      driverBivolt: null,
      driverQtd220: 1,
      driverQtdBivolt: null,
    }]]);

    const migrated = migrateLegacyGlowCommercialItem(
      item,
      new Map([["EQ00348", 54]]),
      new Map([["EQ00348", "LED DRIVER XITANIUM 65W 200-350MA 120-185VDC DS 230V"]]),
      productMap,
    );

    expect(migrated.unitPrice).toBe(345.21);
    expect(migrated.totalPrice).toBe(2071.26);
    expect(migrated.driverLines).toEqual([expect.objectContaining({
      driverCode: "EQ00348", driverQty: 6, driverUnitPrice: 54, driverTotalPrice: 324,
    })]);
  });
});

describe("enrichDriverCurrentsFromApi", () => {
  it("preenche somente a programação dos drivers persistidos pelos códigos da API", () => {
    const item = {
      category: "LED BAR",
      sku: "LLE-2052",
      description: "SKYLINE FL 10W/M",
      qty: 1,
      unitPrice: null,
      totalPrice: null,
      photoUrl: null,
      ledBarNCortes: 2,
      ledBarDriverCode: "EQ00801",
      ledBarDriverModel: "FONTE 60W 24V",
      driverLines: [{ driverCode: "EQ00348", driverModel: "DRIVER 44W", driverQty: 1, driverUnitPrice: null, driverTotalPrice: null }],
      profileSegments: [{ sku: "LLP-6060.2IF.48F", qty: 1, lengthMm: 1180, barsPerPiece: 2, driverQtyPerPiece: 1, driverCode: "EQ00348", driverModel: "DRIVER 44W" }],
    } as any;

    const enriched = enrichDriverCurrentsFromApi(item, new Map([
      ["EQ00348", "350mA"],
      ["EQ00801", "250mA"],
    ]));

    expect(enriched.driverLines?.[0]).toMatchObject({ driverCode: "EQ00348", corrente: "350mA" });
    expect(enriched.profileSegments?.[0]).toMatchObject({ driverCode: "EQ00348", corrente: "350mA" });
    expect(enriched.ledBarDriverCorrente).toBe("250mA");
    expect(enriched.driverLines?.[0]?.driverModel).toBe("DRIVER 44W");
  });

  it("preserva a programação digitada manualmente na ficha", () => {
    const item = {
      category: "Perfis",
      sku: "LLP-6060",
      description: "BLAZE H 26W",
      qty: 1,
      unitPrice: null,
      totalPrice: null,
      photoUrl: null,
      ledBarDriverCode: "EQ00801",
      ledBarDriverCorrente: "400mA",
      ledBarDriverProgramacaoManual: true,
      driverLines: [{ driverCode: "EQ00348", driverModel: "DRIVER 44W", driverQty: 1, driverUnitPrice: null, driverTotalPrice: null, corrente: "500mA", programacaoManual: true }],
      profileSegments: [{ sku: "LLP-6060.2IF.26F", qty: 1, lengthMm: 1180, barsPerPiece: 2, driverQtyPerPiece: 1, driverCode: "EQ00348", driverModel: "DRIVER 44W", corrente: "500mA", programacaoManual: true }],
    } as any;

    const enriched = enrichDriverCurrentsFromApi(item, new Map([
      ["EQ00348", "350mA"],
      ["EQ00801", "250mA"],
    ]));

    expect(enriched.driverLines?.[0]?.corrente).toBe("500mA");
    expect(enriched.profileSegments?.[0]?.corrente).toBe("500mA");
    expect(enriched.ledBarDriverCorrente).toBe("400mA");
  });
});

describe("componentes estruturados de SHIFT", () => {
  it("reidrata o driver do perfil SHIFT sem potência e os componentes próprios de um acessório S01", () => {
    const item = {
      category: "Perfis",
      sku: "LLE-4846",
      description: "SHIFT Embutir ON/OFF 220V 1800mm",
      qty: 1,
      unitPrice: 350,
      totalPrice: 350,
      photoUrl: null,
      profileSegments: [{ sku: "LLE-4846.150.18F", qty: 2, lengthMm: 1500, barsPerPiece: 1, driverQtyPerPiece: 0 }],
      accessories: [{ codigo: "S01-06862", descricao: "SHIFT MÓDULO DIFUSO 7W 3000K", qty: 3, unitPrice: 0, totalPrice: 0 }],
    } as any;
    const productMap = new Map([
      ["LLE-4846.150.18F", {
        sku: "LLE-4846.150.18F",
        driver220: null,
        driverBivolt: { code: "EQ00112", model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM" },
        driverQtd220: null,
        driverQtdBivolt: 1,
      }],
      ["S01-06862", {
        sku: "S01-06862",
        driver220: { code: "EQ00257", model: "REGULADOR DE VOLTAGEM 20X20MM ALUMINIO PCB" },
        driverBivolt: null,
        driverQtd220: 1,
        driverQtdBivolt: null,
        ledModule3000: "MODULO STRIPFLEX 280X10MM C/ REG DE VOLTAGEM 3000K 7W",
        ledModuleEq3000: "EQ00265",
        ledModuleQtd3000: 1,
      }],
    ] as any);

    const withProfileDriver = migrateItemDrivers(item, new Map(), new Map(), productMap);
    expect(withProfileDriver.profileSegments?.[0]).toMatchObject({
      driverCode: "EQ00112",
      driverQtyPerPiece: 1,
    });
    expect(withProfileDriver.driverLines?.[0]).toMatchObject({ driverCode: "EQ00112", driverQty: 2 });

    const enriched = enrichShiftAccessoryTechnicalComponents(withProfileDriver, productMap);
    expect(enriched.accessories?.[0]).toMatchObject({
      productLightSource: expect.objectContaining({ code: "EQ00265", quantity: 1 }),
      technicalDrivers: [expect.objectContaining({ code: "EQ00257", quantity: 1 })],
    });
  });

  it("seleciona o driver DALI oficial do acessório S01 a partir da configuração persistida", () => {
    const item = {
      category: "Perfis",
      sku: "LLE-4846",
      description: "SHIFT Embutir DIM DALI 220V 1800mm",
      qty: 1,
      unitPrice: 350,
      totalPrice: 350,
      photoUrl: null,
      accessories: [{ codigo: "S01-06862", descricao: "SHIFT MÓDULO DIFUSO 7W 3000K", qty: 2, unitPrice: 0 }],
    } as any;
    const productMap = new Map([["S01-06862", {
      sku: "S01-06862",
      driver220: null,
      driverBivolt: null,
      driverDimDali: { code: "EQ00666", model: "FONTE 72W DALI" },
      driverQtdDimDali: 1,
      driverQtd220: null,
      driverQtdBivolt: null,
    }]] as any);

    const enriched = enrichShiftAccessoryTechnicalComponents(item, productMap);
    expect(enriched.accessories?.[0]?.technicalDrivers).toEqual([
      expect.objectContaining({ code: "EQ00666", quantity: 1 }),
    ]);
  });
});

describe("normalização técnica do RV00064", () => {
  it("apresenta o item sempre como DIM 1-10V Bivolt sem alterar preço ou total", () => {
    const item = {
      category: "Revenda",
      sku: "RV00064",
      description: "POWER BEAM P HIGH BAY LED 100W 5000K IP65",
      qty: 3,
      unitPrice: 571.38,
      totalPrice: 1714.14,
      photoUrl: null,
      quoteSummary: "POWER BEAM P HIGH BAY LED 100W 5000K (RV00064)",
      orderSummary: "POWER BEAM P HIGH BAY LED 100W 5000K (RV00064)",
    } as any;

    const normalized = normalizeRv00064TechnicalConfiguration(item);

    expect(normalized.description).toContain("DIM 1-10V Bivolt");
    expect(normalized.quoteSummary).toContain("DIM 1-10V Bivolt");
    expect(normalized.orderSummary).toContain("DIM 1-10V BIVOLT");
    expect(normalized.unitPrice).toBe(571.38);
    expect(normalized.totalPrice).toBe(1714.14);
  });
});

describe("edição manual de drivers em pedido de fábrica", () => {
  it("preserva o equipamento e a programação escolhidos no item simples durante a reidratação da API", () => {
    const item = {
      category: "Luminárias",
      sku: "TURPIN-17W",
      description: "TURPIN 17W",
      qty: 4,
      driverLines: [{
        driverCode: "EQ-MANUAL",
        driverModel: "DRIVER ESCOLHIDO NO PEDIDO",
        driverQty: 4,
        driverUnitPrice: null,
        driverTotalPrice: null,
        corrente: "350mA",
        driverManual: true,
        programacaoManual: true,
      }],
    } as any;
    const productSkuMap = new Map([[
      "TURPIN-17W",
      {
        driver220: { code: "EQ-API", model: "DRIVER ORIGINAL DA API" },
        driverQtd220: 1,
        ledModuleEq: null,
        ledModuleQtd: null,
      },
    ]]);

    const migrated = migrateItemDrivers(item, new Map(), new Map(), productSkuMap, new Map([["EQ-API", "500mA"]]));

    expect(migrated.driverLines).toEqual([expect.objectContaining({
      driverCode: "EQ-MANUAL",
      driverModel: "DRIVER ESCOLHIDO NO PEDIDO",
      corrente: "350mA",
      driverManual: true,
      programacaoManual: true,
    })]);
  });

  it("preserva o driver selecionado pelo grupo de equipamentos de um perfil contra a reidratação da API", () => {
    const item = {
      category: "Perfis",
      sku: "LLP-6060",
      description: "BLAZE H Pendente 26W 3000K ON/OFF 220Vac 1135mm",
      power: "26W",
      qty: 3,
      profileSegments: [{
        sku: "LLP-6060.2IN.48F",
        qty: 1,
        lengthMm: 1135,
        driverQtyPerPiece: 1,
        driverCode: "EQ00220",
        driverModel: "LED DRIVER 75W SELECIONADO NA FICHA",
        driverManual: true,
      }],
    } as any;
    const productSkuMap = new Map([[
      "LLP-6060.2IN.48F|26W",
      {
        sku: "LLP-6060.2IN.48F",
        driver220: { code: "EQ00581", model: "DRIVER ORIGINAL DA API" },
        driverQtd220: 1,
      },
    ]]);

    const migrated = migrateItemDrivers(item, new Map([["EQ00220", 105]]), new Map([["EQ00220", "LED DRIVER 75W SELECIONADO NA FICHA"]]), productSkuMap);

    expect(migrated.profileSegments?.[0]).toMatchObject({
      driverCode: "EQ00220",
      driverModel: "LED DRIVER 75W SELECIONADO NA FICHA",
      driverManual: true,
    });
    expect(migrated.driverLines).toEqual([expect.objectContaining({
      driverCode: "EQ00220",
      driverQty: 3,
    })]);
  });

  it("preserva a programação manual de um driver de perfil contra a reidratação da API", () => {
    const item = {
      category: "Perfis",
      sku: "LLP-6060",
      description: "BLAZE H Pendente 26W 3000K ON/OFF 220Vac 3960mm",
      power: "26W",
      qty: 1,
      profileSegments: [{
        sku: "LLP-6060.5IF.48F",
        qty: 1,
        lengthMm: 2812,
        driverQtyPerPiece: 1,
        driverCode: "EQ00220",
        driverModel: "LED DRIVER 75W 350-550MA 90-216VDC 220V SLIM",
        corrente: "350mA",
        programacaoManual: true,
      }],
    } as any;
    const productSkuMap = new Map([[
      "LLP-6060.5IF.48F|26W",
      {
        sku: "LLP-6060.5IF.48F",
        driver220: { code: "EQ00581", model: "DRIVER ORIGINAL DA API" },
        driverQtd220: 1,
        correnteDriver: "programar em 500mA",
      },
    ]]);

    const migrated = migrateItemDrivers(item, new Map([["EQ00220", 105]]), new Map([["EQ00220", "LED DRIVER 75W 350-550MA 90-216VDC 220V SLIM"]]), productSkuMap);

    expect(migrated.profileSegments?.[0]).toMatchObject({
      driverCode: "EQ00220",
      corrente: "350mA",
      programacaoManual: true,
    });
    expect(migrated.driverLines).toEqual([expect.objectContaining({
      driverCode: "EQ00220",
      corrente: "350mA",
    })]);
  });
});

describe("variantes técnicas com SKU compartilhado", () => {
  const sku = "LLE-2750.124.21F";
  const variant18w = {
    sku,
    name: "ALE-2750 18W RTG 1243MM (C/ MOLA)",
    driver220: { code: "EQ00346", model: "DRIVER 19W" },
    driverBivolt: null,
    driverQtd220: 1,
    driverQtdBivolt: null,
    ledModuleEq4000: "EQ00124",
    ledModule4000: "STRIPFLEX 562.5 X 10MM 4000K",
    ledModuleQtd4000: 2,
    correnteDriver: "350mA",
  };
  const variant36w = {
    sku,
    name: "ALE-2750 36W RTG 1243MM (C/ MOLA)",
    driver220: { code: "EQ00347", model: "DRIVER 44W" },
    driverBivolt: null,
    driverQtd220: 1,
    driverQtdBivolt: null,
    ledModuleEq4000: "EQ00124",
    ledModule4000: "STRIPFLEX 562.5 X 10MM 4000K",
    ledModuleQtd4000: 4,
    correnteDriver: "350mA",
  };
  const productMap = new Map<string, any>([
    [sku, variant18w],
    [`${sku}|${variant18w.name}`, variant18w],
    [`${sku}|${variant36w.name}`, variant36w],
  ]);

  it("usa a descrição para escolher a variante correta, e não o primeiro SKU encontrado", () => {
    const product = selectApiTechnicalVariantForItem({
      sku,
      description: "ALE-2750 36W RTG 1243MM (C/ MOLA) 4000K ON/OFF 220V",
    }, productMap);

    expect(product?.driver220?.code).toBe("EQ00347");
    expect(product?.ledModuleQtd4000).toBe(4);
  });

  it("reidrata módulo e driver do ALE-2750 36W pela variante exata", () => {
    const migrated = migrateItemDrivers({
      category: "Downlights",
      sku,
      description: "ALE-2750 36W RTG 1243MM (C/ MOLA) 4000K ON/OFF 220V",
      cct: "4000K",
      qty: 5,
      moduloLed: "2x STRIPFLEX ANTIGO (EQ00124)",
      moduloLedCode: "EQ00124",
      driverLines: [{ driverCode: "EQ00346", driverModel: "DRIVER 19W", driverQty: 5, driverUnitPrice: 54, driverTotalPrice: 270 }],
    } as any, new Map([["EQ00347", 54]]), new Map([
      ["EQ00124", "STRIPFLEX 562.5 X 10MM 4000K"],
      ["EQ00347", "DRIVER 44W"],
    ]), productMap, new Map([["EQ00347", "350mA"]]));

    expect(migrated.moduloLed).toContain("4x STRIPFLEX 562.5 X 10MM 4000K (EQ00124)");
    expect(migrated.driverLines).toEqual([expect.objectContaining({
      driverCode: "EQ00347",
      driverQty: 5,
      corrente: "350mA",
    })]);
  });
});

describe("drivers múltiplos retornados pela API", () => {
  it("mantém quatro fontes por peça em BAGEO mesmo quando o dado salvo possuía somente uma", () => {
    const sku = "LDP-4910.280.70P";
    const migrated = migrateItemDrivers({
      category: "Perfis",
      sku,
      description: "BAGEO P D1 Ø2800MM 175W 3000K ON/OFF Bivolt",
      cct: "3000K",
      qty: 1,
      moduloLed: "17600MM FITA LED 2835 120LEDS/M 24V 10W/M IP20 IRC80 3000K 1500LM (EQ00082)",
      moduloLedCode: "EQ00082",
      driverLines: [{ driverCode: "EQ00802", driverModel: "FONTE DE TENSÃO ALFALUX 60W 24V IP20 BIVOLT", driverQty: 1, driverUnitPrice: 117.72, driverTotalPrice: 117.72 }],
    } as any, new Map([["EQ00802", 117.72]]), new Map([
      ["EQ00082", "FITA LED 2835 120LEDS/M 24V 10W/M IP20 IRC80 3000K 1500LM"],
      ["EQ00802", "FONTE DE TENSÃO ALFALUX 60W 24V IP20 BIVOLT"],
    ]), new Map<string, any>([[sku, {
      sku,
      name: "BAGEO P D1 Ø2800MM 175W",
      driver220: null,
      driverBivolt: { code: "EQ00802", model: "FONTE DE TENSÃO ALFALUX 60W 24V IP20 BIVOLT" },
      driverQtd220: null,
      driverQtdBivolt: 4,
      ledModuleEq3000: "EQ00082",
      ledModule3000: "FITA LED 2835 120LEDS/M 24V 10W/M IP20 IRC80 3000K 1500LM",
      ledModuleQtd3000: 17.6,
    }]]));

    expect(migrated.driverQtyPerUnit).toBe(4);
    expect(migrated.driverLines).toEqual([expect.objectContaining({
      driverCode: "EQ00802",
      driverQty: 4,
      driverTotalPrice: 470.88,
    })]);
  });

  it("substitui a quantidade unitária do texto legado pela quantidade oficial da API", () => {
    const sku = "LDP-4910.280.70P";
    const migrated = migrateItemDrivers({
      category: "Perfis",
      sku,
      description: "BAGEO P D1 Ø2800MM 175W 3000K ON/OFF Bivolt",
      cct: "3000K",
      qty: 1,
      drivers: "DRIVER FONTE DE TENSÃO ALFALUX 60W 24V IP20 BIVOLT (EQ00802)",
    } as any, new Map([["EQ00802", 117.72]]), new Map([["EQ00802", "FONTE DE TENSÃO ALFALUX 60W 24V IP20 BIVOLT"]]), new Map<string, any>([[sku, {
      sku,
      name: "BAGEO P D1 Ø2800MM 175W",
      driver220: null,
      driverBivolt: { code: "EQ00802", model: "FONTE DE TENSÃO ALFALUX 60W 24V IP20 BIVOLT" },
      driverQtd220: null,
      driverQtdBivolt: 4,
    }]]));

    expect(migrated.driverLines).toEqual([expect.objectContaining({
      driverCode: "EQ00802",
      driverQty: 4,
      driverTotalPrice: 470.88,
    })]);
    expect(migrated.driverQtyPerUnit).toBe(4);
  });
});

describe("migrateItemDrivers — LED BAR e perfis FL", () => {
  it("reconstrói uma fonte por corte para todas as luminárias sem alterar valores comerciais", () => {
    const item = {
      category: "LED BAR",
      sku: "LLE-2052",
      description: "SKYLINE E FL 10W/M 3000K ON/OFF Bivolt 4000MM",
      qty: 7,
      unitPrice: 815.76,
      totalPrice: 5710.32,
      photoUrl: null,
      ledBarNCortes: 2,
      ledBarComprimentoPorTrechoMm: 2000,
      ledBarDriverCode: "EQ00801",
      ledBarDriverModel: "FONTE DE TENSÃO ALFALUX 36W 24V IP20 BIVOLT",
      driverLines: [{
        driverCode: "EQ00801",
        driverModel: "FONTE DE TENSÃO ALFALUX 36W 24V IP20 BIVOLT",
        driverQty: 0,
        driverUnitPrice: null,
        driverTotalPrice: null,
      }],
    } as any;

    const migrated = migrateItemDrivers(
      item,
      new Map(),
      new Map([["EQ00801", "FONTE DE TENSÃO ALFALUX 36W 24V IP20 BIVOLT"]]),
      new Map(),
    );

    expect(migrated.driverQtyPerUnit).toBe(2);
    expect(migrated.driverLines?.[0]).toMatchObject({ driverCode: "EQ00801", driverQty: 14 });
    expect(migrated.unitPrice).toBe(815.76);
    expect(migrated.totalPrice).toBe(5710.32);
    expect(migrated.driverLines?.[0]?.driverTotalPrice).toBeNull();
  });

  it("preserva uma troca manual de fonte mesmo quando o perfil possui mais de um corte", () => {
    const item = {
      category: "LED BAR",
      sku: "LLE-2052",
      description: "SKYLINE E FL 10W/M 3000K ON/OFF Bivolt 4000MM",
      qty: 7,
      unitPrice: 815.76,
      totalPrice: 5710.32,
      photoUrl: null,
      ledBarNCortes: 2,
      ledBarDriverCode: "EQ00801",
      driverLines: [{ driverCode: "EQ00999", driverModel: "FONTE MANUAL", driverQty: 7, driverUnitPrice: null, driverTotalPrice: null, driverManual: true }],
    } as any;

    const migrated = migrateItemDrivers(item, new Map(), new Map(), new Map());

    expect(migrated.driverLines?.[0]).toMatchObject({ driverCode: "EQ00999", driverQty: 7, driverManual: true });
  });

  it("cria o detalhamento de fonte de um item linear legado que possuía somente os campos LED BAR", () => {
    const migrated = migrateItemDrivers({
      category: "LED BAR",
      sku: "LLE-2052",
      description: "SKYLINE E FL 10W/M 3000K ON/OFF Bivolt 5000MM",
      qty: 10,
      unitPrice: 1000.95,
      totalPrice: 10009.5,
      photoUrl: null,
      ledBarNCortes: 2,
      ledBarComprimentoPorTrechoMm: 2500,
      ledBarComprimentoTotalMm: 5000,
      ledBarDriverCode: "EQ00801",
      ledBarDriverModel: "FONTE DE TENSÃO ALFALUX 36W 24V IP20 BIVOLT",
      unitPriceDriver: 89.97,
    } as any, new Map(), new Map(), new Map());

    expect(migrated.driverQtyPerUnit).toBe(2);
    expect(migrated.driverLines).toEqual([expect.objectContaining({
      driverCode: "EQ00801",
      driverQty: 20,
      driverUnitPrice: 89.97,
      driverTotalPrice: 1799.4,
    })]);
  });

  it("impõe dois cortes e duas fontes por luminária FL de 4.000 mm mesmo quando o registro legado declarava um corte", () => {
    const migrated = migrateItemDrivers({
      category: "LED BAR",
      sku: "LLE-2052",
      description: "SKYLINE E FL 10W/M 3000K ON/OFF Bivolt 4000MM",
      qty: 7,
      unitPrice: 815.76,
      totalPrice: 5710.32,
      photoUrl: null,
      ledBarNCortes: 1,
      ledBarComprimentoTotalMm: 4000,
      ledBarDriverCode: "EQ00801",
      ledBarDriverModel: "FONTE DE TENSÃO ALFALUX 36W 24V IP20 BIVOLT",
      driverLines: [{ driverCode: "EQ00801", driverModel: "FONTE DE TENSÃO ALFALUX 36W 24V IP20 BIVOLT", driverQty: 7, driverUnitPrice: null, driverTotalPrice: null }],
    } as any, new Map(), new Map(), new Map());

    expect(migrated.ledBarNCortes).toBe(2);
    expect(migrated.ledBarComprimentoPorTrechoMm).toBe(2000);
    expect(migrated.driverLines?.[0]).toMatchObject({ driverCode: "EQ00801", driverQty: 14 });
    expect(migrated.description).toBe("SKYLINE E FL 10W/M 3000K ON/OFF Bivolt 4000MM (2 x 2000mm)");
  });
});
