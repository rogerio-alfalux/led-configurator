import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LdGuestCartItemCard, LdGuestRequestHistoryCard } from "@/components/LdGuestCards";
import type { CartItemData } from "./cartTypes";

describe("LD Convidado UI isolation", () => {
  it("renders the guest cart item with configurations but no monetary content", () => {
    const item = {
      sku: "LLP-6060.4IF.48F",
      description: "BLAZE H PENDENTE",
      category: "Perfis",
      power: "18W",
      cct: "3000K",
      corPeca: "Preto",
      qty: 2,
      totalPrice: 9876.54,
      unitPrice: 4938.27,
      priceWithoutDriver: 9500,
      profileSegments: [{ sku: "LLP-6060.4IF.48F", qty: 2 }],
    } as CartItemData;
    const html = renderToStaticMarkup(createElement(LdGuestCartItemCard, { item, index: 0, onRemove: () => undefined, onUpdate: () => undefined }));
    expect(html).toContain("BLAZE H PENDENTE");
    expect(html).toContain('aria-label="Item em planta"');
    expect(html).toContain('aria-label="Quantidade"');
    expect(html).not.toMatch(/9876|4938|9500|R\$/);
  });

  it("renders a validated PDF state in the guest history without monetary content", () => {
    const html = renderToStaticMarkup(createElement(LdGuestRequestHistoryCard, {
      finalClientName: "Cliente Final",
      officeName: "Escritório",
      submittedAtLabel: "12/08/2026 12:00",
      statusLabel: "PDF disponível",
      statusClassName: "bg-emerald-100",
      pdfAvailable: true,
      onPreview: () => undefined,
    }));
    expect(html).toContain("PDF disponível");
    expect(html).toContain("Pré-visualizar orçamento");
    expect(html).not.toMatch(/R\$|valor|preço|custo/i);
  });
});
