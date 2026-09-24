import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { CartItemData, QuoteFormData } from "./cartTypes";
import { getEffectiveDriverLineQuantity, migrateItemDrivers, normalizeSplitCommercialPricing } from "./cartTypes";
import { generateQuoteExcelBuffer } from "./quoteExcelGenerator";
import { buildSplitDriverPricePatch } from "./splitItemPricing";

const form: QuoteFormData = {
  cliente: "CLIENTE TESTE",
  contato: "Contato Teste",
  tel: "11 90000-0000",
  email: "cliente@teste.com",
  obra: "OBRA TESTE",
  referencia: "REFERÊNCIA TESTE",
  numero: "ORC 99.9999-26",
  data: "11/09/2026",
};

describe("sub-linha comercial de driver de perfil", () => {
  it("exporta separadamente o corpo corrigido e o driver sem propagar o preço negativo legado", async () => {
    const item = normalizeSplitCommercialPricing({
      category: "Perfis",
      sku: "LLE-2580",
      description: "EASY PRIME Embutir 18W 3000K DIM DALI 220Vac 589mm",
      qty: 298,
      unitPrice: 193.42,
      unitPriceLuminaria: -1.579999999999883,
      priceWithoutDriver: -470.8399999999651,
      totalPrice: 57_639.16,
      photoUrl: null,
      custoCorpoBase: 69.08,
      markupPadraoApi: 2.8,
      driverLines: [{
        driverCode: "EQ00509",
        driverModel: "LED DRIVER 20W 200-500MA 15-42VDC DIP DALI 220V",
        driverQty: 298,
        driverUnitPrice: 195,
        driverTotalPrice: 58_110,
      }],
    } as CartItemData);

    const buffer = await generateQuoteExcelBuffer([item], form);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet("Alfalux")!;
    const bodyRow = Array.from({ length: worksheet.rowCount }, (_, index) => index + 1)
      .find((row) => String(worksheet.getCell(`E${row}`).value ?? "").includes("EASY PRIME Embutir"));
    const driverRow = Array.from({ length: worksheet.rowCount }, (_, index) => index + 1)
      .find((row) => String(worksheet.getCell(`E${row}`).value ?? "").includes("↳ Driver: LED DRIVER 20W"));

    expect(item.unitPriceLuminaria).toBe(193.42);
    expect(item.priceWithoutDriver).toBe(57_639.16);
    expect(item.totalPrice).toBe(115_749.16);
    expect(bodyRow).toBeDefined();
    expect(worksheet.getCell(`M${bodyRow}`).value).toBe(193.42);
    expect(driverRow).toBeDefined();
    expect(worksheet.getCell(`M${driverRow}`).value).toBe(195);
    expect(worksheet.getCell(`N${driverRow}`).value).toBe(58_110);
  });

  it("preserva a quantidade total persistida de cada modelo de driver", async () => {
    const item: CartItemData = {
      category: "Perfis",
      sku: "LLP-TESTE",
      description: "PERFIL TESTE 26W 3000K ON/OFF 220V 6000MM",
      qty: 2,
      unitPrice: 100,
      totalPrice: 260,
      priceWithoutDriver: 200,
      unitPriceLuminaria: 100,
      driverQtyPerUnit: 1,
      photoUrl: null,
      profileSegments: [
        { sku: "LLP-TESTE", qty: 3, driverQtyPerPiece: 1, driverCode: "EQ00347", driverModel: "DRIVER TESTE 44W" },
        { sku: "LLP-TESTE", qty: 2, driverQtyPerPiece: 1, driverCode: "EQ00346", driverModel: "DRIVER TESTE 19W" },
      ],
      driverLines: [
        {
          driverCode: "EQ00347",
          driverModel: "DRIVER TESTE 44W",
          driverQty: 6,
          driverUnitPrice: 10,
          driverTotalPrice: 60,
        },
        {
          driverCode: "EQ00346",
          driverModel: "DRIVER TESTE 19W",
          driverQty: 4,
          driverUnitPrice: 15,
          driverTotalPrice: 60,
        },
      ],
    };

    const buffer = await generateQuoteExcelBuffer([item], form);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet("Alfalux")!;
    const driverRow = Array.from({ length: worksheet.rowCount }, (_, index) => index + 1)
      .find((row) => String(worksheet.getCell(`E${row}`).value ?? "").includes("↳ Driver: DRIVER TESTE 44W"));
    const secondDriverRow = Array.from({ length: worksheet.rowCount }, (_, index) => index + 1)
      .find((row) => String(worksheet.getCell(`E${row}`).value ?? "").includes("↳ Driver: DRIVER TESTE 19W"));

    expect(driverRow).toBeDefined();
    expect(worksheet.getCell(`L${driverRow}`).value).toBe(6);
    expect(worksheet.getCell(`M${driverRow}`).value).toBe(10);
    expect(worksheet.getCell(`N${driverRow}`).value).toBe(60);
    expect(worksheet.getCell(`E${driverRow}`).fill.fgColor?.argb).toBe("FFFFF3E0");
    expect(secondDriverRow).toBeDefined();
    expect(worksheet.getCell(`L${secondDriverRow}`).value).toBe(4);
    expect(worksheet.getCell(`M${secondDriverRow}`).value).toBe(15);
    expect(worksheet.getCell(`N${secondDriverRow}`).value).toBe(60);
    expect(worksheet.getCell(`E${secondDriverRow}`).fill.fgColor?.argb).toBe("FFFFF3E0");
  });

  it("não aplica a quantidade agregada do item a cada modelo de driver do P07", async () => {
    const item: CartItemData = {
      category: "Perfis",
      sku: "LLP-6060",
      description: "BLAZE H Pendente 18W 3000K ON/OFF 220Vac 3960mm",
      qty: 1,
      unitPrice: 1_636.31,
      totalPrice: 1_636.31,
      priceWithoutDriver: 1_528.31,
      unitPriceLuminaria: 1_528.31,
      driverQtyPerUnit: 2,
      photoUrl: null,
      driverLines: [
        { driverCode: "EQ00347", driverModel: "DRIVER 44W", driverQty: 1, driverUnitPrice: 54, driverTotalPrice: 54 },
        { driverCode: "EQ00346", driverModel: "DRIVER 19W", driverQty: 1, driverUnitPrice: 54, driverTotalPrice: 54 },
      ],
    };

    expect(getEffectiveDriverLineQuantity(item, item.driverLines![0])).toBe(1);
    expect(getEffectiveDriverLineQuantity(item, item.driverLines![1])).toBe(1);

    const buffer = await generateQuoteExcelBuffer([item], form);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet("Alfalux")!;
    const driverRows = Array.from({ length: worksheet.rowCount }, (_, index) => index + 1)
      .filter((row) => String(worksheet.getCell(`E${row}`).value ?? "").includes("↳ Driver:"));

    expect(driverRows).toHaveLength(2);
    expect(driverRows.map((row) => worksheet.getCell(`L${row}`).value)).toEqual([1, 1]);
    expect(driverRows.map((row) => worksheet.getCell(`N${row}`).value)).toEqual([54, 54]);
  });

  it("mantém no Excel o preço manual do driver após a reidratação do catálogo", async () => {
    const item: CartItemData = {
      category: "Painéis",
      sku: "ALE-2750.618.18F",
      description: "ALE-2750 18W RTG 618MM (C/ MOLA) 3000K ON/OFF 220V",
      cct: "3000K",
      qty: 298,
      unitPrice: 354.35,
      unitPriceLuminaria: 354.35,
      priceWithoutDriver: 105596.3,
      totalPrice: 121688.3,
      photoUrl: null,
      driverLines: [{
        driverCode: "EQ00346",
        driverModel: "LED DRIVER XITANIUM 19W",
        driverQty: 298,
        driverUnitPrice: 19.45,
        driverTotalPrice: 5796.1,
      }],
    };
    const edited = { ...item, ...buildSplitDriverPricePatch(item, 0, 54) };
    const rehydrated = migrateItemDrivers(
      edited,
      new Map([["EQ00346", 19.45]]),
      new Map([["EQ00346", "LED DRIVER XITANIUM 19W"]]),
      new Map([["ALE-2750.618.18F", {
        sku: "ALE-2750.618.18F",
        driver220: { code: "EQ00346", model: "LED DRIVER XITANIUM 19W" },
        driverQtd220: 1,
      }]]),
    );

    const buffer = await generateQuoteExcelBuffer([rehydrated], form);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet("Alfalux")!;
    const driverRow = Array.from({ length: worksheet.rowCount }, (_, index) => index + 1)
      .find((row) => String(worksheet.getCell(`E${row}`).value ?? "").includes("↳ Driver: LED DRIVER XITANIUM 19W"));

    expect(rehydrated.unitPriceLuminaria).toBe(354.35);
    expect(rehydrated.priceWithoutDriver).toBe(105596.3);
    expect(rehydrated.driverLines![0]).toMatchObject({ driverUnitPrice: 54, driverTotalPrice: 16092, driverPriceManual: true });
    expect(driverRow).toBeDefined();
    expect(worksheet.getCell(`M${driverRow}`).value).toBe(54);
    expect(worksheet.getCell(`N${driverRow}`).value).toBe(16092);
  });

  it("mostra equipamento de item especial como sublinha incluída no preço", async () => {
    const item: CartItemData = {
      category: "Item Especial",
      isSpecialItem: true,
      sku: "ESP-001",
      description: "LUMINÁRIA ESPECIAL TESTE",
      qty: 3,
      unitPrice: 500,
      totalPrice: 1_500,
      photoUrl: null,
      specialEquipments: [{
        codigo: "EQ00999",
        descricao: "DISSIPADOR TÉCNICO TESTE",
        qty: 2,
        unitPrice: 35,
        familia: "DISSIPADORES",
      }],
    };

    const buffer = await generateQuoteExcelBuffer([item], form);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet("Alfalux")!;
    const equipmentRow = Array.from({ length: worksheet.rowCount }, (_, index) => index + 1)
      .find((row) => String(worksheet.getCell(`E${row}`).value ?? "").includes("↳ Equipamento: DISSIPADOR TÉCNICO TESTE"));

    expect(equipmentRow).toBeDefined();
    expect(worksheet.getCell(`L${equipmentRow}`).value).toBe(6);
    expect(worksheet.getCell(`M${equipmentRow}`).value).toBe("incl.");
    expect(worksheet.getCell(`N${equipmentRow}`).value).toBe("incl.");
    expect(worksheet.getCell(`E${equipmentRow}`).fill.fgColor?.argb).toBe("FFF3E5F5");
  });

  it("leva DIM, tensão, cor e CCT de Item Especial para suas colunas comerciais", async () => {
    const item: CartItemData = {
      category: "Item Especial",
      isSpecialItem: true,
      sku: "ESP-TEC",
      description: "LUMINÁRIA ESPECIAL TÉCNICA",
      qty: 1,
      unitPrice: 500,
      totalPrice: 500,
      photoUrl: null,
      specialDimensions: "1200 x 100mm",
      specialPower: "36W",
      specialDim: "DALI",
      specialVoltage: "Bivolt",
      specialColor: "Grafite",
      specialColorTemp: "6000K",
    };

    const buffer = await generateQuoteExcelBuffer([item], form);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet("Alfalux")!;
    const row = Array.from({ length: worksheet.rowCount }, (_, index) => index + 1)
      .find((rowNumber) => String(worksheet.getCell(`E${rowNumber}`).value ?? "").includes("LUMINÁRIA ESPECIAL TÉCNICA"));

    expect(row).toBeDefined();
    expect(worksheet.getCell(`F${row}`).value).toBe("1200 x 100mm");
    expect(worksheet.getCell(`G${row}`).value).toBe("36W");
    expect(worksheet.getCell(`H${row}`).value).toBe("DALI");
    expect(worksheet.getCell(`I${row}`).value).toBe("Bivolt");
    expect(worksheet.getCell(`J${row}`).value).toBe("Grafite");
    expect(worksheet.getCell(`K${row}`).value).toBe("6000K");
  });

  it("sempre imprime a observação comercial de Não Orçamos quando preenchida", async () => {
    const item: CartItemData = {
      category: "Não Orçamos",
      sku: "NAO-TESTE",
      description: "PRODUTO SEM EQUIVALENTE",
      qty: 1,
      unitPrice: 0,
      totalPrice: 0,
      photoUrl: null,
      nonQuotedObservation: "Cliente solicitou equivalência externa.",
    };

    const buffer = await generateQuoteExcelBuffer([item], form);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet("Alfalux")!;
    const observationRow = Array.from({ length: worksheet.rowCount }, (_, index) => index + 1)
      .find((row) => String(worksheet.getCell(`E${row}`).value ?? "").includes("Cliente solicitou equivalência externa."));

    expect(observationRow).toBeDefined();
    expect(worksheet.getCell(`E${observationRow}`).value).toContain("Obs.:");
  });

  it("respeita a quantidade total do acessório e aplica RT, margem e desconto à sua sublinha", async () => {
    const item: CartItemData = {
      category: "Painéis",
      sku: "ACC-TESTE",
      description: "LUMINÁRIA COM ACESSÓRIO TESTE",
      qty: 3,
      unitPrice: 100,
      totalPrice: 300,
      photoUrl: null,
      accessories: [{
        codigo: "CP-TESTE",
        descricao: "ACESSÓRIO TESTE",
        qty: 2,
        unitPrice: 10,
        quantityScope: "order_total",
      }],
    };

    const buffer = await generateQuoteExcelBuffer([item], {
      ...form,
      rtPercent: 0.1,
      marginPercent: 0.1,
      discountPercent: 0.1,
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet("Alfalux")!;
    const accessoryRow = Array.from({ length: worksheet.rowCount }, (_, index) => index + 1)
      .find((row) => String(worksheet.getCell(`E${row}`).value ?? "").includes("↳ Acessório: ACESSÓRIO TESTE"));

    expect(accessoryRow).toBeDefined();
    expect(worksheet.getCell(`L${accessoryRow}`).value).toBe(2);
    // 20 / (1 - 10% RT) / (1 - 10% margem) × (1 - 10% desconto)
    expect(Number(worksheet.getCell(`N${accessoryRow}`).value)).toBeCloseTo(22.2222, 3);
  });

  it("mantém no rodapé o total final soberano da revisão histórica", async () => {
    const item: CartItemData = {
      category: "Painéis",
      sku: "HIST-001",
      description: "ITEM HISTÓRICO",
      qty: 1,
      unitPrice: 100,
      totalPrice: 100,
      photoUrl: null,
    };
    const totalFinalOverride = 12_345.67;
    const buffer = await generateQuoteExcelBuffer([item], { ...form, marginPercent: 0.05, totalFinalOverride });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet("Alfalux")!;
    const numericValues = Array.from({ length: worksheet.rowCount }, (_, rowIndex) => rowIndex + 1)
      .flatMap((row) => Array.from({ length: worksheet.columnCount }, (_, columnIndex) => worksheet.getCell(row, columnIndex + 1).value))
      .filter((value): value is number => typeof value === "number");

    expect(numericValues).toContain(totalFinalOverride);
  });
});
