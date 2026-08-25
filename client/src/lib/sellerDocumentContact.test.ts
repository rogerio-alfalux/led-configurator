import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import { generateQuoteExcelBuffer } from "./quoteExcelGenerator";
import { generateQuotePdfBlob } from "./quotePdfGenerator";
import type { CartItemData, QuoteFormData } from "./cartTypes";

const item: CartItemData = {
  category: "Downlight",
  sku: "TEST-ANALICE",
  description: "Produto de teste",
  qty: 1,
  unitPrice: 100,
  totalPrice: 100,
  photoUrl: null,
};

const form: QuoteFormData = {
  cliente: "CLIENTE TESTE",
  contato: "Contato Teste",
  tel: "11 90000-0000",
  email: "cliente@teste.com",
  obra: "OBRA TESTE",
  referencia: "REFERÊNCIA TESTE",
  numero: "ORC 99.9999-26",
  data: "14/08/2026",
  seller1Name: "ANALICE COSTA",
  seller1Phone: "11 98551-6985",
  seller1Email: "analice@grupoalfalux.com.br",
  notes: "Entregar em horário agendado",
};

describe("contato documental da vendedora", () => {
  it("inclui o telefone e o e-mail de ANALICE COSTA no Excel", async () => {
    const buffer = await generateQuoteExcelBuffer([item], form);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const values = Array.from(workbook.getWorksheet("Alfalux")!.getSheetValues())
      .flatMap(value => Array.isArray(value) ? value : [value]);
    const textValues = values
      .map(value => typeof value === "string" ? value : (typeof value === "object" && value && "richText" in value
        ? (value as { richText: Array<{ text: string }> }).richText.map(part => part.text).join("")
        : ""));
    expect(textValues).toContain("CONTATO: 11 98551-6985");
    expect(textValues).toContain("E-MAIL: analice@grupoalfalux.com.br");
    expect(textValues.some(value => value.includes("Entregar em horário agendado"))).toBe(true);
  });

  it("leva o contato da vendedora ao PDF oficial", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const pdf = await generateQuotePdfBlob([item], form);
    expect(pdf.size).toBeGreaterThan(0);
    expect(await pdf.text()).toContain("analice@grupoalfalux.com.br");
    vi.unstubAllGlobals();
  });
});
