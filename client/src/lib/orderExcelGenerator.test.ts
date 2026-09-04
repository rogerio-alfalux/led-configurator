import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { addBusinessDays, buildLedBarEquipamentosText, buildLuminariaEquipamentosText, buildProfileEquipamentosText, buildProfileFonteLuzText, buildProfileSkuText, generateOrderExcel } from "./orderExcelGenerator";

describe("buildProfileSkuText", () => {
  it("informa a quantidade de cada SKU da composição na ficha de produção", () => {
    const text = buildProfileSkuText({
      sku: "LLP-6060",
      profileSegments: [
        { sku: "LLP-6060.2IF.48F", qty: 2 },
        { sku: "LLP-6060.5ML.48F", qty: 4 },
        { sku: "LLP-6060.2IF.48F", qty: 1 },
      ],
    } as any);

    expect(text).toBe("3 x LLP-6060.2IF.48F\n4 x LLP-6060.5ML.48F");
  });

  it("mantém o SKU simples quando não há composição de perfil", () => {
    expect(buildProfileSkuText({ sku: "LDE-7035", profileSegments: [] } as any)).toBe("LDE-7035");
  });

  it("assume uma unidade por segmento em composições históricas sem qty", () => {
    const text = buildProfileSkuText({
      sku: "LLP-6060",
      profileSegments: [
        { sku: "LLP-6060.2IF.48F" },
        { sku: "LLP-6060.2IF.48F" },
        { sku: "LLP-6060.5ML.48F" },
      ],
    } as any);

    expect(text).toBe("2 x LLP-6060.2IF.48F\n1 x LLP-6060.5ML.48F");
  });
});

describe("programação de corrente — Excel da ficha", () => {
  it("exibe a corrente API inclusive para fonte 24V", () => {
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

  it("deriva a quantidade de driver do total quando o campo legado por unidade é zero", () => {
    const luminaria = buildLuminariaEquipamentosText({
      qty: 2,
      driverQtyPerUnit: 0,
      driverLines: [{ driverCode: "EQ00346", driverModel: "DRIVER 19W", driverQty: 2, driverUnitPrice: null, driverTotalPrice: null }],
    } as any);

    expect(luminaria).toContain("1x DRIVER 19W (EQ00346)");
    expect(luminaria).not.toContain("0x DRIVER");
  });
});

describe("STRIPFLEX em nonos — Excel da ficha", () => {
  it("normaliza 1,9 e soma trechos antes de exibir a Fonte de Luz", () => {
    const normalized = buildProfileFonteLuzText({
      moduloLed: "STRIPFLEX 562.5 X 10MM 4000K",
      profileSegments: [{ qty: 1, barsPerPiece: 1.9 }],
    } as any);
    const summed = buildProfileFonteLuzText({
      moduloLed: "STRIPFLEX 562.5 X 10MM 4000K",
      profileSegments: [
        { qty: 1, barsPerPiece: 4.4 },
        { qty: 1, barsPerPiece: 4.4 },
      ],
    } as any);

    expect(normalized).toContain("2 x STRIPFLEX");
    expect(summed).toContain("8,8 x STRIPFLEX");
  });
});

describe("estrutura heterogênea da API — Excel da ficha", () => {
  it("preserva a lâmpada em Fonte de Luz", () => {
    expect(buildProfileFonteLuzText({
      category: "Decorativas",
      description: "LUMINÁRIA COM LÂMPADA",
      qty: 1,
      productLightingMode: "LAMP",
      productLightSource: { description: "LÂMPADA G9", code: "CP00991", type: "LAMPADA", quantity: 2 },
    } as any)).toBe("2 x LÂMPADA G9 (CP00991)");
  });

  it("preserva a PCI do SHIFT em Equipamentos", () => {
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

describe("addBusinessDays", () => {
  it("conta integralmente o prazo informado e ignora sábados e domingos", () => {
    const start = new Date("2026-08-07T12:00:00-03:00"); // sexta-feira
    const delivery = addBusinessDays(start, 20);

    // 20º dia útil após sexta, 07/08/2026, é sexta, 04/09/2026.
    expect(delivery.toISOString().slice(0, 10)).toBe("2026-09-04");
  });

  it("ignora feriados informados além dos fins de semana", () => {
    const start = new Date("2026-08-06T12:00:00-03:00"); // quinta-feira
    const holidays = new Set(["2026-08-07"]); // sexta-feira
    const delivery = addBusinessDays(start, 1, holidays);

    // Sexta é feriado e o fim de semana é ignorado: próximo dia útil é segunda.
    expect(delivery.toISOString().slice(0, 10)).toBe("2026-08-10");
  });
});

describe("generateOrderExcel", () => {
  it("mantém em J3 o prazo pré-calculado, sem sobrescrevê-lo pela data de hoje", async () => {
    const buffer = await generateOrderExcel([], {
      clientName: "Cliente Teste",
      projectName: "Obra Teste",
      quoteNumber: "04.0173-26",
      vendorName: "Vendedor Teste",
      date: "12/08/2026",
      deliveryDays: 20,
      precomputedDisplayDays: 20,
      precomputedDeliveryDate: "09/09/2026",
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet.getCell("J3").value).toBe("20 dias úteis → 09/09/2026");
  });

  it("mantém uma sublinha de acessório para cada item no Excel", async () => {
    const buffer = await generateOrderExcel([
      {
        category: "Downlights",
        sku: "DL-01",
        description: "DOWNLIGHT 01",
        qty: 2,
        unitPrice: 100,
        totalPrice: 200,
        photoUrl: null,
        accessories: [{ codigo: "CP001", descricao: "RABICHO 01", qty: 2, unitPrice: 10, quantityScope: "order_total" }],
      },
      {
        category: "Downlights",
        sku: "DL-02",
        description: "DOWNLIGHT 02",
        qty: 3,
        unitPrice: 100,
        totalPrice: 300,
        photoUrl: null,
        accessories: [{ codigo: "CP002", descricao: "RABICHO 02", qty: 3, unitPrice: 10, quantityScope: "order_total" }],
      },
    ] as any, {
      clientName: "Cliente Teste",
      projectName: "Obra Teste",
      quoteNumber: "20.0428-26",
      vendorName: "Vendedor Teste",
      date: "18/08/2026",
      precomputedDisplayDays: 20,
      precomputedDeliveryDate: "15/09/2026",
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet.getCell("D8").value).toBe("↳ Acessório: RABICHO 01");
    expect(worksheet.getCell("D10").value).toBe("↳ Acessório: RABICHO 02");
    expect(worksheet.getCell("H8").value).toBe(2);
    expect(worksheet.getCell("H10").value).toBe(3);
  });

  it("leva observações por item e gerais à ficha de produção", async () => {
    const buffer = await generateOrderExcel([{
      category: "Downlights", sku: "DL-OBS", description: "DOWNLIGHT OBS", qty: 1,
      unitPrice: 100, totalPrice: 100, photoUrl: null,
      productionObservation: "Usar acabamento especial",
    }] as any, {
      clientName: "Cliente Teste", projectName: "Obra Teste", quoteNumber: "20.0000-26",
      vendorName: "Vendedor Teste", date: "25/08/2026", notes: "Conferir antes de embalar",
      precomputedDisplayDays: 20,
      precomputedDeliveryDate: "22/09/2026",
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet.getCell("J7").value).toBe("Usar acabamento especial");
    expect(worksheet.getCell("D9").value).toBe("Conferir antes de embalar");
  });

  it("exibe equipamento técnico manual de produto não especial na ficha", async () => {
    const buffer = await generateOrderExcel([{
      category: "Downlights", sku: "DL-EQ", description: "DOWNLIGHT EQUIPADO", qty: 1,
      unitPrice: 0, totalPrice: 0, photoUrl: null,
      productionEquipments: [{ codigo: "EQ00999", descricao: "DISSIPADOR TESTE", qty: 2, tipo: "DISSIPADOR" }],
    }] as any, {
      clientName: "Cliente Teste", projectName: "Obra Teste", quoteNumber: "20.0000-26",
      vendorName: "Vendedor Teste", date: "25/08/2026",
      precomputedDisplayDays: 20,
      precomputedDeliveryDate: "22/09/2026",
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.worksheets[0];

    expect(String(worksheet.getCell("F7").value)).toContain("DISSIPADOR TESTE");
  });
});
