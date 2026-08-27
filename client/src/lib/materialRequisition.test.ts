import { describe, it, expect } from "vitest";
import { buildMaterialRequisition } from "./materialRequisition";
import type { CartItemData } from "./cartTypes";

describe("materialRequisition", () => {
  // Simular descMap da API
  const descMap = new Map<string, string>([
    ["EQ00121", "MODULO LUX ROUND Ø80MM 36 LEDS 830-3000K 1800LM (LC) 36V"],
    ["EQ00586", "FITA LED 2835 60LEDS/M 24V 5W/M IP20 IRC90 3000K 500LM/M"],
    ["EQ00125", "STRIPFLEX 562.5 X 10MM - 36 LEDS 830 - 3000K (LC) 25V"],
    ["EQ00347", "LED DRIVER XITANIUM 44W 200-350MA 70-125VDC DIP SWITCH 230V"],
  ]);

  it("deve resolver PT001050 para EQ00121 via busca normalizada (D80MM vs Ø80MM)", () => {
    const items: CartItemData[] = [
      {
        sku: "DL-100",
        description: "DOWNLIGHT 18W 3000K 220V 1260mm",
        category: "Downlight",
        qty: 2,
        moduloLed: "MODULO LUX ROUND 36 LEDS 830-3000K 1800LM D80MM (LC) (PT001050) 36V",
        moduloLedCode: null as any,
        driverLines: [{ driverModel: "LED DRIVER XITANIUM 44W (EQ00347)", driverCode: "EQ00347", driverQty: 1 }],
      } as any,
    ];

    const result = buildMaterialRequisition(items, descMap);
    const moduloEntry = result.find(e => e.codigo === "EQ00121");
    expect(moduloEntry).toBeDefined();
    expect(moduloEntry!.descricao).toBe("MODULO LUX ROUND Ø80MM 36 LEDS 830-3000K 1800LM (LC) 36V");
    expect(moduloEntry!.tipo).toBe("MÓDULOS LED");
    expect(moduloEntry!.unidade).toBe("un");
    expect(moduloEntry!.qty).toBe(2); // 2 peças × 1 módulo por peça
  });

  it("deve classificar EQ00586 (FITA LED) como FITAS LED em metros", () => {
    const items: CartItemData[] = [
      {
        sku: "LLS-3945",
        description: "BLAZE SOBREPOR 18W 3000K ON/OFF 220Vac 1260mm",
        category: "Perfil",
        qty: 2,
        moduloLed: "FITA LED 2835 60LEDS/M 24V 5W/M IP20 IRC90 3000K 500LM/M",
        moduloLedCode: "EQ00586",
        stripMethod: "STRIPFLEX",
        power: "18",
        profileSegments: [
          {
            sku: "LLS-3945.22I.38F",
            lengthMm: 1260,
            qty: 1,
            barsPerPiece: 2,
            driverModel: "LED DRIVER XITANIUM 44W (EQ00347)",
            driverCode: "EQ00347",
            driverQtyPerPiece: 1,
            ledModuleCode: "EQ00586",
          },
        ],
        driverLines: [{ driverModel: "LED DRIVER XITANIUM 44W (EQ00347)", driverCode: "EQ00347", driverQty: 1 }],
      } as any,
    ];

    const result = buildMaterialRequisition(items, descMap);
    const fitaEntry = result.find(e => e.codigo === "EQ00586");
    expect(fitaEntry).toBeDefined();
    expect(fitaEntry!.tipo).toBe("FITAS LED");
    expect(fitaEntry!.unidade).toBe("m");
    // 1 seg × 2 barsPerPiece × 2 itemQty = 4 barras × 1.26m = 5.04m
    expect(fitaEntry!.qty).toBeGreaterThanOrEqual(5.0);
    expect(fitaEntry!.qty).toBeLessThanOrEqual(5.2);
  });

  it("deve classificar EQ00125 (STRIPFLEX) como MÓDULOS LED em unidades (NÃO como FITAS LED)", () => {
    const items: CartItemData[] = [
      {
        sku: "LLE-2810",
        description: "BLAZE EMBUTIR 18W 3000K ON/OFF 220Vac 2260mm",
        category: "Perfil",
        qty: 3,
        moduloLed: "STRIPFLEX 562.5 X 10MM - 36 LEDS 830 - 3000K (LC) 25V",
        moduloLedCode: "EQ00125",
        stripMethod: "STRIPFLEX",
        power: "18",
        profileSegments: [
          {
            sku: "LLE-2810.4IF.38F",
            lengthMm: 2260,
            qty: 1,
            barsPerPiece: 4,
            driverModel: "LED DRIVER XITANIUM 44W (EQ00347)",
            driverCode: "EQ00347",
            driverQtyPerPiece: 1,
            ledModuleCode: "EQ00125",
          },
        ],
        driverLines: [{ driverModel: "LED DRIVER XITANIUM 44W (EQ00347)", driverCode: "EQ00347", driverQty: 1 }],
      } as any,
    ];

    const result = buildMaterialRequisition(items, descMap);
    const stripflexEntry = result.find(e => e.codigo === "EQ00125");
    expect(stripflexEntry).toBeDefined();
    // Stripflex DEVE ser MÓDULOS LED, NÃO FITAS LED
    expect(stripflexEntry!.tipo).toBe("MÓDULOS LED");
    // Stripflex DEVE ser em unidades, NÃO em metros
    expect(stripflexEntry!.unidade).toBe("un");
    // 1 seg × 4 barsPerPiece × 3 itemQty = 12 unidades
    expect(stripflexEntry!.qty).toBe(12);
  });

  it("NÃO deve duplicar EQ00586 em FITAS LED e MÓDULOS LED", () => {
    const items: CartItemData[] = [
      {
        sku: "LLS-3945",
        description: "BLAZE SOBREPOR 18W 3000K ON/OFF 220Vac 1260mm",
        category: "Perfil",
        qty: 19,
        moduloLed: "FITA LED 2835 60LEDS/M 24V 5W/M IP20 IRC90 3000K 500LM/M",
        moduloLedCode: "EQ00586",
        stripMethod: "STRIPFLEX",
        power: "18",
        profileSegments: [
          {
            sku: "LLS-3945.22I.38F",
            lengthMm: 1260,
            qty: 1,
            barsPerPiece: 2,
            driverModel: "LED DRIVER XITANIUM 44W (EQ00347)",
            driverCode: "EQ00347",
            driverQtyPerPiece: 1,
            ledModuleCode: "EQ00586",
          },
        ],
        driverLines: [{ driverModel: "LED DRIVER XITANIUM 44W (EQ00347)", driverCode: "EQ00347", driverQty: 1 }],
      } as any,
    ];

    const result = buildMaterialRequisition(items, descMap);
    const fitaEntries = result.filter(e => e.codigo === "EQ00586");
    // Deve haver apenas UMA entrada para EQ00586 (como FITAS LED em metros)
    expect(fitaEntries.length).toBe(1);
    expect(fitaEntries[0].tipo).toBe("FITAS LED");
    expect(fitaEntries[0].unidade).toBe("m");
  });

  it("Stripflex com 36W dupla deve contar unidades dobradas (não metros)", () => {
    const items: CartItemData[] = [
      {
        sku: "LLE-2810",
        description: "BLAZE EMBUTIR 36W 3000K ON/OFF 220Vac 2260mm",
        category: "Perfil",
        qty: 2,
        moduloLed: "STRIPFLEX 562.5 X 10MM - 36 LEDS 830 - 3000K (LC) 25V",
        moduloLedCode: "EQ00125",
        stripMethod: "STRIPFLEX",
        power: "36",
        profileSegments: [
          {
            sku: "LLE-2810.4IF.48F",
            lengthMm: 2260,
            qty: 1,
            barsPerPiece: 4,
            driverModel: "LED DRIVER XITANIUM 44W (EQ00347)",
            driverCode: "EQ00347",
            driverQtyPerPiece: 1,
            ledModuleCode: "EQ00125",
          },
        ],
        driverLines: [{ driverModel: "LED DRIVER XITANIUM 44W (EQ00347)", driverCode: "EQ00347", driverQty: 1 }],
      } as any,
    ];

    const result = buildMaterialRequisition(items, descMap);
    const stripflexEntry = result.find(e => e.codigo === "EQ00125");
    expect(stripflexEntry).toBeDefined();
    expect(stripflexEntry!.tipo).toBe("MÓDULOS LED");
    expect(stripflexEntry!.unidade).toBe("un");
    // 36W Stripflex dupla: 1 seg × 4 barsPerPiece × 2 itemQty × 2 (dupla) = 16 unidades
    expect(stripflexEntry!.qty).toBe(16);
  });
});

describe("buildMaterialRequisition — componentes múltiplos (óticas, holders, dissipadores)", () => {
  it("não deve requisitar driver, módulo, lente, holder ou dissipador de item sem equipamento", () => {
    const items: CartItemData[] = [{
      category: "Downlights",
      sku: "DL-SEM-EQUIPAMENTO",
      description: "DOWNLIGHT SEM EQUIPAMENTO",
      qty: 2,
      unitPrice: 100,
      totalPrice: 200,
      photoUrl: null,
      withoutEquipment: true,
      moduloLed: "MÓDULO LED (EQ00123) + LENTE (EQ00456) + HOLDER (EQ00789) + DISSIPADOR (EQ00999)",
      moduloLedCode: "EQ00123",
      driverLines: [{ driverModel: "DRIVER OSRAM", driverCode: "EQ00220", driverQty: 2 }],
    } as any];

    const result = buildMaterialRequisition(items);
    expect(result.map(entry => entry.codigo)).not.toEqual(expect.arrayContaining([
      "EQ00123", "EQ00456", "EQ00789", "EQ00999", "EQ00220",
    ]));
  });

  it("deve extrair módulo LED, lente, holder e dissipador de moduloLed concatenado", () => {
    const items: CartItemData[] = [
      {
        category: "Downlights",
        sku: "DL-TEST",
        description: "ORBIT 7W 3000K DIM DALI 220Vac",
        qty: 10,
        unitPrice: 100,
        totalPrice: 1000,
        photoUrl: null,
        moduloLed: "MÓDULO LED LUX ROUND 7W 3000K (EQ00123) + LENTE NARROW 24° (EQ00456) + HOLDER ALUMÍNIO (EQ00789) + DISSIPADOR ALUMÍNIO (EQ00999)",
        moduloLedCode: "EQ00123",
        driverLines: [{
          driverModel: "DRIVER OSRAM 20W",
          driverCode: "EQ00220",
          driverQty: 10,
          driverUnitPrice: 50,
          driverTotalPrice: 500,
        }],
      } as any,
    ];

    const result = buildMaterialRequisition(items);
    const codes = result.map(e => e.codigo);

    // Deve conter todos os 5 componentes
    expect(codes).toContain("EQ00123"); // Módulo LED
    expect(codes).toContain("EQ00456"); // Lente
    expect(codes).toContain("EQ00789"); // Holder
    expect(codes).toContain("EQ00999"); // Dissipador
    expect(codes).toContain("EQ00220"); // Driver

    // Verificar quantidades (10 itens × 1 por unidade = 10 cada)
    const ledEntry = result.find(e => e.codigo === "EQ00123");
    expect(ledEntry?.qty).toBe(10);
    expect(ledEntry?.tipo).toBe("MÓDULOS LED");

    const lensEntry = result.find(e => e.codigo === "EQ00456");
    expect(lensEntry?.qty).toBe(10);
    expect(lensEntry?.tipo).toBe("LENTES");

    const holderEntry = result.find(e => e.codigo === "EQ00789");
    expect(holderEntry?.qty).toBe(10);
    expect(holderEntry?.tipo).toBe("SUPORTES");

    const dissipadorEntry = result.find(e => e.codigo === "EQ00999");
    expect(dissipadorEntry?.qty).toBe(10);
    expect(dissipadorEntry?.tipo).toBe("DISSIPADORES");

    const driverEntry = result.find(e => e.codigo === "EQ00220");
    expect(driverEntry?.qty).toBe(10);
    expect(driverEntry?.tipo).toBe("DRIVERS");
  });

  it("deve respeitar quantidade prefixada (ex: 2x MÓDULO LED...)", () => {
    const items: CartItemData[] = [
      {
        category: "Arandelas",
        sku: "AR-TEST",
        description: "ARANDELA TESTE 14W 3000K",
        qty: 5,
        unitPrice: 200,
        totalPrice: 1000,
        photoUrl: null,
        moduloLed: "2x MÓDULO LED LUX ROUND 7W 3000K (EQ00123) + LENTE 60° (EQ00456)",
        moduloLedCode: "EQ00123",
        driverLines: [{
          driverModel: "DRIVER LIFUD 20W",
          driverCode: "EQ00580",
          driverQty: 5,
          driverUnitPrice: 30,
          driverTotalPrice: 150,
        }],
      } as any,
    ];

    const result = buildMaterialRequisition(items);

    // 2x módulo LED por unidade × 5 unidades = 10
    const ledEntry = result.find(e => e.codigo === "EQ00123");
    expect(ledEntry?.qty).toBe(10);

    // 1x lente por unidade × 5 unidades = 5
    const lensEntry = result.find(e => e.codigo === "EQ00456");
    expect(lensEntry?.qty).toBe(5);
  });

  it("deve funcionar com item sem driverLines (item antigo) mas com moduloLed", () => {
    const items: CartItemData[] = [
      {
        category: "Spots",
        sku: "SP-TEST",
        description: "SPOT TESTE 7W 3000K",
        qty: 8,
        unitPrice: 150,
        totalPrice: 1200,
        photoUrl: null,
        moduloLed: "MÓDULO LED LUX ROUND 7W 3000K (EQ00123) + DISSIPADOR (EQ00999)",
        moduloLedCode: "EQ00123",
        drivers: "DRIVER OSRAM 20W (EQ00220)",
      } as any,
    ];

    const result = buildMaterialRequisition(items);
    const codes = result.map(e => e.codigo);

    // Deve conter módulo LED e dissipador
    expect(codes).toContain("EQ00123");
    expect(codes).toContain("EQ00999");

    const ledEntry = result.find(e => e.codigo === "EQ00123");
    expect(ledEntry?.qty).toBe(8);

    const dissipadorEntry = result.find(e => e.codigo === "EQ00999");
    expect(dissipadorEntry?.qty).toBe(8);
  });

  it("não deve duplicar módulo LED para itens com profileSegments", () => {
    const items: CartItemData[] = [
      {
        category: "Perfis",
        sku: "LLE-2810",
        description: "BLAZE EMBUTIR 18W 3000K",
        qty: 5,
        unitPrice: 500,
        totalPrice: 2500,
        photoUrl: null,
        moduloLed: "STRIPFLEX 562,5 X 10MM 36L 3000K (EQ00125)",
        moduloLedCode: "EQ00125",
        profileSegments: [{
          sku: "LLE-2810.3IF.18F",
          qty: 2,
          lengthMm: 1710,
          barsPerPiece: 3,
          driverQtyPerPiece: 1,
          driverModel: "PHILIPS XITANIUM 44W 350MA",
          driverCode: "EQ00347",
          corrente: "350mA",
          ledModuleCode: "EQ00125",
        }],
      } as any,
    ];

    const result = buildMaterialRequisition(items);
    const codes = result.map(e => e.codigo);

    // Módulo LED deve vir dos profileSegments, NÃO do moduloLed
    expect(codes).toContain("EQ00125");
    expect(codes).toContain("EQ00347");

    // Não deve ter duplicata
    const ledEntries = result.filter(e => e.codigo === "EQ00125");
    expect(ledEntries.length).toBe(1);
  });

  it("deve funcionar com moduloLed simples (sem ' + ')", () => {
    const items: CartItemData[] = [
      {
        category: "Downlights",
        sku: "DL-SIMPLE",
        description: "DOWNLIGHT SIMPLES 7W 3000K",
        qty: 6,
        unitPrice: 80,
        totalPrice: 480,
        photoUrl: null,
        moduloLed: "MÓDULO LED LUX ROUND 7W 3000K (EQ00123)",
        moduloLedCode: "EQ00123",
        driverLines: [{
          driverModel: "DRIVER LIFUD 13W",
          driverCode: "EQ00236",
          driverQty: 6,
          driverUnitPrice: 25,
          driverTotalPrice: 150,
        }],
      } as any,
    ];

    const result = buildMaterialRequisition(items);
    const codes = result.map(e => e.codigo);

    expect(codes).toContain("EQ00123");
    expect(codes).toContain("EQ00236");

    const ledEntry = result.find(e => e.codigo === "EQ00123");
    expect(ledEntry?.qty).toBe(6);
    expect(ledEntry?.tipo).toBe("MÓDULOS LED");
  });
});

describe("buildMaterialRequisition — luminárias não-perfil", () => {
  it("não multiplica novamente o acessório informado como quantidade total no pedido de fábrica", () => {
    const items: CartItemData[] = [{
      category: "Downlights",
      sku: "LUNA-TEST",
      description: "LUNA TESTE",
      qty: 188,
      unitPrice: 100,
      totalPrice: 18800,
      photoUrl: null,
      accessories: [{
        codigo: "CP00526",
        descricao: "RABICHO CABO PP 3X 0,50",
        qty: 188,
        unitPrice: 14.5,
        quantityScope: "order_total",
      }],
    }];

    const result = buildMaterialRequisition(items);
    expect(result.find(entry => entry.codigo === "CP00526")?.qty).toBe(188);
  });

  it("soma acessórios totais de vários itens sem reaplicar a quantidade de cada produto", () => {
    const quantities = [188, 257, 12, 3, 4, 4, 497, 8, 9];
    const items: CartItemData[] = quantities.map((accessoryQty, index) => ({
      category: "Downlights",
      sku: `LUNA-${index + 1}`,
      description: `LUNA ${index + 1}`,
      qty: [188, 257, 4, 1, 2, 1, 497, 8, 9][index],
      unitPrice: 100,
      totalPrice: 100,
      photoUrl: null,
      accessories: [{
        codigo: "CP00526",
        descricao: "RABICHO CABO PP 3X 0,50",
        qty: accessoryQty,
        unitPrice: 14.5,
        quantityScope: "order_total",
      }],
    }));

    const result = buildMaterialRequisition(items);
    expect(result.find(entry => entry.codigo === "CP00526")?.qty).toBe(982);
  });

  it("mantém a multiplicação dos acessórios definidos por unidade de luminária", () => {
    const items: CartItemData[] = [{
      category: "Downlights",
      sku: "LUNA-TEST",
      description: "LUNA TESTE",
      qty: 4,
      unitPrice: 100,
      totalPrice: 400,
      photoUrl: null,
      accessories: [{
        codigo: "CP00526",
        descricao: "RABICHO CABO PP 3X 0,50",
        qty: 2,
        unitPrice: 14.5,
        quantityScope: "per_unit",
      }],
    }];

    const result = buildMaterialRequisition(items);
    expect(result.find(entry => entry.codigo === "CP00526")?.qty).toBe(8);
  });

  it("soma módulo LED e driver usando quantidade por unidade e quantidade total do item", () => {
    const items: CartItemData[] = [{
      category: "Spots",
      sku: "SP-API",
      description: "SPOT 4000K",
      qty: 145,
      unitPrice: 100,
      totalPrice: 14500,
      photoUrl: null,
      moduloLed: "2x MÓDULO LED API 4000K (EQMOD4000)",
      moduloLedCode: "EQMOD4000",
      driverQtyPerUnit: 1,
      driverLines: [{ driverModel: "DRIVER API 20W", driverCode: "EQDRIVER", driverQty: 145, driverUnitPrice: 10, driverTotalPrice: 1450 }],
    }];

    const result = buildMaterialRequisition(items, new Map([
      ["EQMOD4000", "MÓDULO LED API 4000K"],
      ["EQDRIVER", "DRIVER API 20W"],
    ]));

    expect(result.find(entry => entry.codigo === "EQMOD4000")?.qty).toBe(290);
    expect(result.find(entry => entry.codigo === "EQDRIVER")?.qty).toBe(145);
  });

  it("spot com ledModuleQtd=4 (ex: FOCO) deve incluir módulo LED com quantidade correta", () => {
    const items: CartItemData[] = [{
      category: "Spots",
      qty: 5,
      description: "FOCO 7W 3000K ON/OFF 220V",
      sku: "LDS-1234",
      moduloLed: "4x TRACE Ø50MM 6 LEDS 900LM 3000K (EQ00555) + LENTE 36° (CP00119)",
      moduloLedCode: "EQ00555",
      driverLines: [{ driverModel: "DRIVER 19W", driverCode: "EQ00346", driverQty: 5, driverUnitPrice: 54, driverTotalPrice: 270 }],
      withoutEquipment: false,
    } as any];
    const descMap = new Map([
      ["EQ00555", "TRACE Ø50MM 6 LEDS 900LM 3000K"],
      ["CP00119", "LENTE 36°"],
    ]);
    const result = buildMaterialRequisition(items, descMap);
    // Módulo LED: 4 por unidade × 5 unidades = 20
    const modulo = result.find(e => e.codigo === "EQ00555");
    expect(modulo).toBeDefined();
    expect(modulo!.qty).toBe(20);
    expect(modulo!.tipo).toBe("MÓDULOS LED");
    // Lente: 1 por unidade × 5 unidades = 5
    const lente = result.find(e => e.codigo === "CP00119");
    expect(lente).toBeDefined();
    expect(lente!.qty).toBe(5);
    // Driver: 1 por unidade × 5 unidades = 5
    const driver = result.find(e => e.codigo === "EQ00346");
    expect(driver).toBeDefined();
    expect(driver!.qty).toBe(5);
    // sourceItems
    expect(modulo!.sourceItems).toContain(1);
  });

  it("LED BAR não deve duplicar fontes (driverLines + ledBarDriverCode)", () => {
    const items: CartItemData[] = [{
      category: "LED BAR",
      qty: 5,
      description: "LED BAR 3000K 3750mm (2 CORTES)",
      sku: "LLB-1234",
      ledBarNCortes: 2,
      ledBarComprimentoTotalMm: 3750,
      ledBarDriverCode: "EQ00400",
      ledBarDriverModel: "DRIVER 24V 100W",
      driverLines: [{ driverModel: "DRIVER 24V 100W", driverCode: "EQ00400", driverQty: 10, driverUnitPrice: 80, driverTotalPrice: 800 }],
      withoutEquipment: false,
    } as any];
    const result = buildMaterialRequisition(items);
    const fontes = result.filter(e => e.codigo === "EQ00400");
    // Deve haver apenas UMA entrada de fontes, não duplicada
    expect(fontes.length).toBe(1);
    // 2 cortes × 5 unidades = 10 fontes
    expect(fontes[0].qty).toBe(10);
    expect(fontes[0].tipo).toBe("FONTES DE TENSÃO");
  });

  it("deve levar o módulo LED fixo do SHIFT à requisição sem associá-lo a CCT", () => {
    const items: CartItemData[] = [{
      category: "Perfis",
      sku: "LLE-4846",
      description: "SHIFT Embutir ON/OFF 220Vac 1800mm",
      qty: 2,
      profileSegments: [{
        sku: "LLE-4846.1IN",
        qty: 1,
        lengthMm: 1800,
        barsPerPiece: 1,
        driverQtyPerPiece: 0,
        driverModel: "",
        driverCode: "",
      }],
      profileMaterialComponents: [{
        codigo: "EQ00999",
        descricao: "MÓDULO LED FIXO SHIFT",
        qty: 3,
      }],
    }];

    const result = buildMaterialRequisition(items, new Map([["EQ00999", "MÓDULO LED FIXO SHIFT"]]));
    const modulo = result.find(entry => entry.codigo === "EQ00999");
    expect(modulo).toBeDefined();
    expect(modulo!.qty).toBe(6);
    expect(modulo!.tipo).toBe("MÓDULOS LED");
    expect(modulo!.sourceItems).toEqual([1]);
  });

  it("inclui equipamentos técnicos adicionados na ficha para categorias não especiais", () => {
    const result = buildMaterialRequisition([{
      category: "Downlights",
      sku: "DL-EQUIPAMENTO",
      description: "DOWNLIGHT EQUIPADO",
      qty: 3,
      productionEquipments: [{ codigo: "EQ00998", descricao: "DISSIPADOR TÉCNICO", qty: 2, tipo: "DISSIPADOR" }],
    } as any]);

    expect(result).toContainEqual(expect.objectContaining({
      codigo: "EQ00998", qty: 6, tipo: "DISSIPADORES",
    }));
  });

  it("converte a FITA LED editada em mm para metros sem multiplicação duplicada", () => {
    const result = buildMaterialRequisition([{
      category: "Perfis",
      sku: "LLS-3336.200.39I",
      description: "MINI BLAZE SOBREPOR COM 2000MM 10W/M",
      qty: 3,
      productionEquipments: [{
        codigo: "EQ00557",
        descricao: "FITA LED 2835 128LEDS 24V 10W/M IP20 IRC80 3000K 1500LM/M",
        qty: 2000,
        tipo: "MODULO_LED",
        familia: "MÓDULOS LED",
      }],
    } as any]);

    expect(result).toContainEqual(expect.objectContaining({
      codigo: "EQ00557",
      qty: 6,
      unidade: "m",
      tipo: "FITAS LED",
    }));
  });

  it("soma em metros a FITA LED usada por itens diferentes", () => {
    const result = buildMaterialRequisition([{
      category: "Perfis",
      sku: "LLS-A",
      description: "PERFIL A",
      qty: 3,
      productionEquipments: [{ codigo: "EQ00557", descricao: "FITA LED COB 24V", qty: 2000 }],
    }, {
      category: "Perfis",
      sku: "LLS-B",
      description: "PERFIL B",
      qty: 2,
      productionEquipments: [{ codigo: "EQ00557", descricao: "FITA LED COB 24V", qty: 500 }],
    }] as any);

    expect(result).toContainEqual(expect.objectContaining({
      codigo: "EQ00557",
      qty: 7,
      unidade: "m",
      sourceItems: [1, 2],
    }));
  });
});
