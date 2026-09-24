import { describe, expect, it, vi } from "vitest";
import type { CartItemData, QuoteFormData } from "./cartTypes";
import { generateQuotePdfBlob } from "./quotePdfGenerator";

const form: QuoteFormData = {
  cliente: "CLIENTE TESTE",
  contato: "Contato",
  tel: "",
  email: "",
  obra: "OBRA TESTE",
  referencia: "FORNECIMENTO",
  numero: "99.9999-26",
  data: "24/09/2026",
};

describe("PDF comercial: Item Especial e Não Orçamos", () => {
  it("mostra os campos técnicos próprios de Item Especial e a observação obrigatória de Não Orçamos", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    const specialItem: CartItemData = {
      category: "Item Especial",
      isSpecialItem: true,
      sku: "ESP-PDF",
      description: "LUMINÁRIA ESPECIAL PDF",
      qty: 1,
      unitPrice: 500,
      totalPrice: 500,
      photoUrl: null,
      specialDim: "DALI",
      specialVoltage: "Bivolt",
      specialColorTemp: "6000K",
    };
    const nonQuotedItem: CartItemData = {
      category: "Não Orçamos",
      sku: "NAO-PDF",
      description: "PRODUTO SEM EQUIVALENTE",
      qty: 1,
      unitPrice: 0,
      totalPrice: 0,
      photoUrl: null,
      nonQuotedObservation: "OBS-NAO-ORCAMOS-OK",
    };

    const pdf = await generateQuotePdfBlob([specialItem, nonQuotedItem], form);
    const text = await pdf.text();

    expect(text).toContain("DALI");
    expect(text).toContain("Bivolt");
    expect(text).toContain("6000K");
    expect(text).toContain("OBS-NAO-ORCAMOS-OK");
    vi.unstubAllGlobals();
  });
});
