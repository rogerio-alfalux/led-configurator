import { describe, expect, it } from "vitest";
import { normalizeAlfaluxComponentDescription, normalizeRevendaProduct } from "./alfaluxApiService";

describe("normalizeAlfaluxComponentDescription", () => {
  it("preserva o conteúdo técnico e remove somente variações de espaços no lookup", () => {
    expect(normalizeAlfaluxComponentDescription("  FITA LED  2835 128LEDS 24V 10W/M  "))
      .toBe("FITA LED 2835 128LEDS 24V 10W/M");
  });
});

describe("normalizeRevendaProduct", () => {
  it("normaliza campos alternativos de custo publicados pela API de revenda", () => {
    const product = normalizeRevendaProduct({
      codigo: "RV00032",
      descricao: "LUMINÁRIA DE REVENDA",
      referencia: null,
      fornecedor: "FORNECEDOR",
      fotoUrl: null,
      precoVenda: 60.52,
      custoUnitario: "31.04",
    });

    expect(product.custo).toBe(31.04);
  });

  it("não inventa custo quando a resposta pública não o disponibiliza", () => {
    const product = normalizeRevendaProduct({
      codigo: "RV00032",
      descricao: "LUMINÁRIA DE REVENDA",
      referencia: null,
      fornecedor: "FORNECEDOR",
      fotoUrl: null,
      precoVenda: 60.52,
    });

    expect(product.custo).toBeUndefined();
  });
});
