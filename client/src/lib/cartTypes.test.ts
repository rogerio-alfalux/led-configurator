import { describe, it, expect } from "vitest";
import { enrichDriverCurrentsFromApi, enrichShiftAccessoryTechnicalComponents, migrateItemDrivers, migrateLegacyGlowCommercialItem, normalizeRv00064TechnicalConfiguration, parseCartItemData } from "./cartTypes";

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
      driverCode: "EQ00659", driverQty: 144, driverUnitPrice: null, driverTotalPrice: null,
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
      driverCode: "EQ00179", driverQty: 41, driverUnitPrice: null, driverTotalPrice: null, corrente: "500mA",
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
});
