import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAcessoriosProducts, fetchRevendaProducts, invalidateAlfaluxCache, normalizeAlfaluxComponentDescription, normalizeRevendaProduct } from "./alfaluxApiService";

beforeEach(() => {
  invalidateAlfaluxCache();
});

afterEach(() => {
  vi.useRealTimers();
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

  it("compartilha a mesma requisição de acessórios entre consultas simultâneas do Dashboard", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: 1, codigo: "EQ00001", sku: null, produto: "DRIVER", familia: null, dimensao: null, precoVenda: 10, custo: 5, fotoUrl: null, source: "driver", observacoes: null }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([fetchAcessoriosProducts(), fetchAcessoriosProducts()]);

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("mantém a última resposta oficial de revenda quando a atualização transitória falha", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    const officialProducts = [{ codigo: "RV00032", descricao: "LUMINÁRIA DE REVENDA", referencia: null, fornecedor: null, fotoUrl: null, precoVenda: 60.52 }];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ products: officialProducts }) })
      .mockResolvedValueOnce({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchRevendaProducts();
    vi.advanceTimersByTime(60_001);
    const recovered = await fetchRevendaProducts();

    expect(recovered).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
