import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import type { CartItemData, QuoteFormData } from "./cartTypes";
import { generateQuoteExcelBuffer } from "./quoteExcelGenerator";
import { generateQuotePdfBlob } from "./quotePdfGenerator";
import { getUnitPriceWithoutIpi, QUOTE_IPI_RATE } from "./quoteIpi";
import { getQuotePreviewColumnCount, getQuotePreviewColumnWidths } from "./quotePreviewLayout";

const form: QuoteFormData = {
  cliente: "CLIENTE IPI",
  contato: "Contato",
  tel: "11 90000-0000",
  email: "ipi@teste.com",
  obra: "OBRA IPI",
  referencia: "FORNECIMENTO",
  numero: "33.0109-26",
  data: "03/09/2026",
};

const itemWithSubitems: CartItemData = {
  category: "Downlight",
  sku: "TESTE-IPI",
  description: "Produto com driver e acessório",
  qty: 2,
  unitPrice: 100,
  unitPriceLuminaria: 100,
  priceWithoutDriver: 200,
  totalPrice: 200,
  luminariaHasApiPrice: true,
  photoUrl: null,
  driverQtyPerUnit: 1,
  driverLines: [{
    driverCode: "EQ-IPI",
    driverModel: "Driver teste IPI",
    driverQty: 2,
    driverUnitPrice: 50,
    driverTotalPrice: 100,
  }],
  accessories: [{
    codigo: "AC-IPI",
    descricao: "Acessório teste IPI",
    qty: 1,
    unitPrice: 20,
  }],
};

async function loadQuoteWorksheet(showIpi: boolean) {
  const buffer = await generateQuoteExcelBuffer([itemWithSubitems], { ...form, showIpi });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.getWorksheet("Alfalux")!;
}

function findRowByModelText(worksheet: ExcelJS.Worksheet, needle: string): number {
  let found = 0;
  worksheet.eachRow((row, rowNumber) => {
    if (String(row.getCell("E").value ?? "").includes(needle)) found = rowNumber;
  });
  return found;
}

describe("destaque opcional de IPI", () => {
  it("reduz efetivamente 9,75% do preço original", () => {
    expect(QUOTE_IPI_RATE).toBe(0.0975);
    expect(getUnitPriceWithoutIpi(100)).toBeCloseTo(90.25, 8);
    expect(getUnitPriceWithoutIpi(272.77)).toBeCloseTo(246.174925, 8);
    expect(getQuotePreviewColumnCount(false)).toBe(12);
    expect(getQuotePreviewColumnCount(true)).toBe(13);
    expect(getQuotePreviewColumnWidths(false)).toHaveLength(12);
    expect(getQuotePreviewColumnWidths(true)).toHaveLength(13);
  });

  it("mantém o layout e os valores atuais quando a opção está desativada", async () => {
    const worksheet = await loadQuoteWorksheet(false);
    expect(worksheet.getCell("M18").value).toBe("PREÇO\nUNITÁRIO");
    expect(worksheet.getCell("N18").value).toBe("PREÇO\nTOTAL");
    expect(worksheet.getCell("O18").value).toBeNull();
    expect(worksheet.getColumn("D").width).toBe(18);
    expect(worksheet.getColumn("F").width).toBe(14);
    expect(worksheet.getColumn("K").width).toBe(14);
    expect(worksheet.getCell("F18").font?.size).toBe(11);
    expect(worksheet.getCell("K18").font?.size).toBe(11);
    expect(worksheet.getCell("M19").value).toBeCloseTo(100, 8);
    expect(worksheet.getCell("N19").value).toBeCloseTo(200, 8);
  });

  it("mostra preço sem IPI, preço original e total inalterado em produtos, acessórios e drivers", async () => {
    const worksheet = await loadQuoteWorksheet(true);
    expect(worksheet.getCell("M18").value).toBe("PREÇO\nUNITÁRIO");
    expect(worksheet.getCell("N18").value).toBe("C/ IPI\n(9,75%)");
    expect(worksheet.getCell("O18").value).toBe("PREÇO\nTOTAL");
    expect(getQuotePreviewColumnWidths(true)[1]).toBe(9);
    expect(worksheet.getColumn("D").width).toBe(20);
    expect(worksheet.getColumn("F").width).toBe(13);
    expect(worksheet.getColumn("K").width).toBe(13);
    expect(worksheet.getCell("F18").font?.size).toBe(9);
    expect(worksheet.getCell("K18").font?.size).toBe(9);
    expect(worksheet.getCell("F18").alignment?.shrinkToFit).toBe(true);
    expect(worksheet.getCell("K18").alignment?.shrinkToFit).toBe(true);

    expect(worksheet.getCell("M19").value).toBeCloseTo(90.25, 8);
    expect(worksheet.getCell("N19").value).toBeCloseTo(100, 8);
    expect(worksheet.getCell("O19").value).toBeCloseTo(200, 8);

    const accessoryRow = findRowByModelText(worksheet, "Acessório teste IPI");
    expect(accessoryRow).toBeGreaterThan(0);
    expect(worksheet.getCell(`M${accessoryRow}`).value).toBeCloseTo(18.05, 8);
    expect(worksheet.getCell(`N${accessoryRow}`).value).toBeCloseTo(20, 8);
    expect(worksheet.getCell(`O${accessoryRow}`).value).toBeCloseTo(40, 8);

    const driverRow = findRowByModelText(worksheet, "Driver teste IPI");
    expect(driverRow).toBeGreaterThan(0);
    expect(worksheet.getCell(`M${driverRow}`).value).toBeCloseTo(45.125, 8);
    expect(worksheet.getCell(`N${driverRow}`).value).toBeCloseTo(50, 8);
    expect(worksheet.getCell(`O${driverRow}`).value).toBeCloseTo(100, 8);
  });

  it("inclui os cabeçalhos de IPI no PDF direto somente quando solicitado", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    const standardPdf = await generateQuotePdfBlob([itemWithSubitems], { ...form, showIpi: false });
    const ipiPdf = await generateQuotePdfBlob([itemWithSubitems], { ...form, showIpi: true });
    expect(await standardPdf.text()).not.toContain("C/ IPI");
    expect(await ipiPdf.text()).toContain("C/ IPI");
    vi.unstubAllGlobals();
  });
});
