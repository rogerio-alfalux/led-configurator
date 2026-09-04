import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { CartItemData, QuoteFormData } from "./cartTypes";
import { getStateInfo } from "./difalTable";
import { generateQuoteExcelBuffer } from "./quoteExcelGenerator";
import { generateQuotePdfBlob } from "./quotePdfGenerator";
import { allocateDilutedAmount, calculateCombinedTaxAmount, getDifalFcpDilutionAmount } from "./quoteTaxDilution";

const form: QuoteFormData = {
  cliente: "CLIENTE DIFAL",
  contato: "Contato",
  tel: "11 90000-0000",
  email: "difal@teste.com",
  obra: "OBRA RJ",
  referencia: "FORNECIMENTO",
  numero: "33.0109-26",
  data: "04/09/2026",
  destState: "RJ",
  difalEnabled: true,
  difalPercent: 12,
  fcpEnabled: true,
  fcpPercent: 2,
};

const item: CartItemData = {
  category: "Downlight",
  sku: "TESTE-DIFAL",
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
    driverCode: "EQ-DIFAL",
    driverModel: "Driver teste DIFAL",
    driverQty: 2,
    driverUnitPrice: 50,
    driverTotalPrice: 100,
  }],
  accessories: [{
    codigo: "AC-DIFAL",
    descricao: "Acessório teste DIFAL",
    qty: 1,
    unitPrice: 20,
  }],
};

function findRowByText(worksheet: ExcelJS.Worksheet, needle: string): number {
  let found = 0;
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell(cell => {
      if (String(cell.value ?? "").includes(needle)) found = rowNumber;
    });
  });
  return found;
}

function findRowByLabel(worksheet: ExcelJS.Worksheet, needle: string): number {
  let found = 0;
  worksheet.eachRow((row, rowNumber) => {
    if (String(row.getCell("C").value ?? "").includes(needle)) found = rowNumber;
  });
  return found;
}

async function loadWorksheet(difalFcpIncluded: boolean) {
  const buffer = await generateQuoteExcelBuffer([item], { ...form, difalFcpIncluded });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.getWorksheet("Alfalux")!;
}

describe("diluição opcional de DIFAL/FCP", () => {
  it("calcula o imposto por dentro e conserva a soma das parcelas", () => {
    const rate = getStateInfo("RJ")!.combined;
    const amount = calculateCombinedTaxAmount(340, rate);
    expect(getDifalFcpDilutionAmount({ enabled: true, included: true, taxableBase: 340, combinedRatePercent: rate })).toBeCloseTo(amount, 8);
    expect(getDifalFcpDilutionAmount({ enabled: true, included: false, taxableBase: 340, combinedRatePercent: rate })).toBe(0);

    const product = allocateDilutedAmount(amount, 200, 340);
    const driver = allocateDilutedAmount(amount, 100, 340);
    const accessory = allocateDilutedAmount(amount, 40, 340);
    expect(product + driver + accessory).toBeCloseTo(amount, 8);
  });

  it("mantém o modo destacado quando a opção está desabilitada", async () => {
    const worksheet = await loadWorksheet(false);
    const productRow = findRowByText(worksheet, "Produto com driver e acessório");
    const driverRow = findRowByText(worksheet, "Driver teste DIFAL");
    const accessoryRow = findRowByText(worksheet, "Acessório teste DIFAL");
    expect(worksheet.getCell(`N${productRow}`).value).toBeCloseTo(200, 8);
    expect(worksheet.getCell(`N${driverRow}`).value).toBeCloseTo(100, 8);
    expect(worksheet.getCell(`N${accessoryRow}`).value).toBeCloseTo(40, 8);
    expect(findRowByLabel(worksheet, "DIFAL (")).toBeGreaterThan(0);
  });

  it("dilui o imposto em produto, driver e acessório sem repetir a cobrança no rodapé", async () => {
    const worksheet = await loadWorksheet(true);
    const productRow = findRowByText(worksheet, "Produto com driver e acessório");
    const driverRow = findRowByText(worksheet, "Driver teste DIFAL");
    const accessoryRow = findRowByText(worksheet, "Acessório teste DIFAL");
    expect(Number(worksheet.getCell(`N${productRow}`).value)).toBeGreaterThan(200);
    expect(Number(worksheet.getCell(`N${driverRow}`).value)).toBeGreaterThan(100);
    expect(Number(worksheet.getCell(`N${accessoryRow}`).value)).toBeGreaterThan(40);
    expect(findRowByLabel(worksheet, "DIFAL (")).toBe(0);
    expect(findRowByLabel(worksheet, "TOTAL GERAL\n(com DIFAL/FCP)")).toBe(0);

    const totalRow = findRowByLabel(worksheet, "impostos já incluídos");
    const expected = 340 + calculateCombinedTaxAmount(340, getStateInfo("RJ")!.combined);
    expect(Number(worksheet.getCell(`E${totalRow}`).value)).toBeCloseTo(expected, 8);
  });

  it("aplica a mesma regra ao PDF direto e à prévia", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    const highlightedPdf = await generateQuotePdfBlob([item], { ...form, difalFcpIncluded: false });
    const dilutedPdf = await generateQuotePdfBlob([item], { ...form, difalFcpIncluded: true });
    expect(await highlightedPdf.text()).toContain("DIFAL");
    expect(await dilutedPdf.text()).not.toContain("DIFAL (");
    vi.unstubAllGlobals();

    const previewSource = readFileSync(new URL("../components/ExcelPreviewModal.tsx", import.meta.url), "utf8");
    expect(previewSource).toContain("getItemDifalFcp(item)");
    expect(previewSource).toContain("!difalFcpDiluted");
  });
});
