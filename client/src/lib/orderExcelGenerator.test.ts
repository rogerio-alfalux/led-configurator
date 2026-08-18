import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { addBusinessDays, buildProfileSkuText, generateOrderExcel } from "./orderExcelGenerator";

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
});
