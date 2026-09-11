import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { CartItemData, QuoteFormData } from "./cartTypes";
import { generateQuoteExcelBuffer } from "./quoteExcelGenerator";

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
});
