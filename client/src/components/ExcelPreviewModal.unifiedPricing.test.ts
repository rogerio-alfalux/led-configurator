/** @vitest-environment jsdom */
import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { formatBRL, type CartItemData, type QuoteFormData } from "@/lib/cartTypes";
import { getUnitPriceWithoutIpi } from "@/lib/quoteIpi";
import { ExcelPreviewModal } from "./ExcelPreviewModal";

const item: CartItemData = {
  category: "Downlight",
  sku: "ITEM-01",
  description: "Luminária do item 01",
  qty: 1,
  unitPrice: 306.48,
  unitPriceLuminaria: 306.48,
  priceWithoutDriver: 306.48,
  totalPrice: 360.48,
  luminariaHasApiPrice: true,
  photoUrl: null,
  driverLines: [{
    driverCode: "EQ00347",
    driverModel: "Driver 44W",
    driverQty: 1,
    driverUnitPrice: 54,
    driverTotalPrice: 54,
  }],
};

const baseForm: QuoteFormData = {
  cliente: "Cliente",
  contato: "Contato",
  tel: "",
  email: "",
  obra: "Obra",
  referencia: "",
  numero: "33.0200-26",
  data: "23/09/2026",
};

afterEach(() => cleanup());

function renderPreview(options: Partial<QuoteFormData> = {}) {
  render(React.createElement(ExcelPreviewModal, {
    open: true,
    onClose: () => undefined,
    items: [item],
    formData: { ...baseForm, ...options },
  }));
  const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>(".quote-items-table tbody tr"));
  const productRow = rows.find(row => row.textContent?.includes("Luminária do item 01"));
  const driverRow = rows.find(row => row.textContent?.includes("Driver 44W"));
  if (!productRow || !driverRow) throw new Error("Linhas comerciais não renderizadas.");
  return { productRow, driverRow };
}

describe("PDF com valores unificados por produto", () => {
  it("preserva os valores separados no padrão atual", () => {
    const { productRow, driverRow } = renderPreview();
    expect(productRow.textContent).toContain(formatBRL(306.48));
    expect(driverRow.textContent).toContain(formatBRL(54));
  });

  it("soma o driver à luminária e mantém a sublinha sem valor", () => {
    const { productRow, driverRow } = renderPreview({ unifyPdfItemValues: true });
    expect(productRow.textContent).toContain(formatBRL(360.48));
    expect(driverRow.textContent).toContain("incl.");
    expect(driverRow.textContent).not.toContain(formatBRL(54));
  });

  it("retira 9,75% somente do preço unificado quando o IPI também é destacado", () => {
    const { productRow, driverRow } = renderPreview({ showIpi: true, unifyPdfItemValues: true });
    expect(productRow.textContent).toContain(formatBRL(getUnitPriceWithoutIpi(360.48)));
    expect(productRow.textContent).toContain(formatBRL(360.48));
    expect(driverRow.textContent).toContain("incl.");
  });
});
