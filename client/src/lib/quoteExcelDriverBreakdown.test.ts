import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { CartItemData, QuoteFormData } from "./cartTypes";
import { migrateItemDrivers } from "./cartTypes";
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
});
