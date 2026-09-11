import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRevendaProducts, invalidateAlfaluxCache, normalizeAlfaluxComponentDescription, normalizeRevendaProduct } from "./alfaluxApiService";

beforeEach(() => {
  invalidateAlfaluxCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

describe("cache curto de catálogos auxiliares", () => {
  it("reutiliza a resposta oficial de revenda durante a janela curta de consulta", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [{ codigo: "RV00032", descricao: "LUMINÁRIA DE REVENDA", referencia: null, fornecedor: null, fotoUrl: null, precoVenda: 60.52 }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchRevendaProducts();
    await fetchRevendaProducts();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
