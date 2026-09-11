import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gzipSync } from "node:zlib";
import {
  fetchAcessoriosProducts,
  fetchAllAlfaluxProducts,
  fetchRevendaProducts,
  invalidateAlfaluxCache,
  isValidOfficialProductCatalog,
  normalizeAlfaluxComponentDescription,
  normalizeRevendaProduct,
} from "./alfaluxApiService";

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

describe("recuperação persistente do catálogo principal", () => {
  const officialProducts = Array.from({ length: 120 }, (_, index) => ({
    sku: `LLE-${String(index + 1).padStart(4, "0")}`,
    name: `PRODUTO OFICIAL ${index + 1}`,
  }));

  it("rejeita respostas incompletas antes de substituir o último catálogo válido", () => {
    expect(isValidOfficialProductCatalog(officialProducts)).toBe(true);
    expect(isValidOfficialProductCatalog(officialProducts.slice(0, 99))).toBe(false);
    expect(isValidOfficialProductCatalog([{ sku: "", name: "SEM IDENTIDADE" }])).toBe(false);
  });

  it("recupera o último snapshot oficial em uma instância sem cache de memória", async () => {
    const compressed = gzipSync(Buffer.from(JSON.stringify({
      version: 1,
      fetchedAt: Date.parse("2026-09-11T12:00:00.000Z"),
      products: officialProducts,
    }), "utf8"));

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("v1/storage/presign/get")) {
        return { ok: true, json: async () => ({ url: "https://snapshot.example/catalog.gz" }) };
      }
      if (url === "https://snapshot.example/catalog.gz") {
        return {
          ok: true,
          arrayBuffer: async () => compressed.buffer.slice(
            compressed.byteOffset,
            compressed.byteOffset + compressed.byteLength,
          ),
        };
      }
      throw new Error(`A API externa não deveria ser consultada antes do snapshot: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const recovered = await fetchAllAlfaluxProducts();

    expect(recovered).toHaveLength(120);
    expect(recovered[0]).toMatchObject({ sku: "LLE-0001", name: "PRODUTO OFICIAL 1" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("entrega o mesmo snapshot oficial a consultas concorrentes quando a atualização falha", async () => {
    const compressed = gzipSync(Buffer.from(JSON.stringify({
      version: 1,
      fetchedAt: Date.parse("2026-09-11T12:00:00.000Z"),
      products: officialProducts,
    }), "utf8"));

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("v1/storage/presign/get")) {
        return { ok: true, json: async () => ({ url: "https://snapshot.example/catalog.gz" }) };
      }
      if (url === "https://snapshot.example/catalog.gz") {
        return {
          ok: true,
          arrayBuffer: async () => compressed.buffer.slice(
            compressed.byteOffset,
            compressed.byteOffset + compressed.byteLength,
          ),
        };
      }
      if (url.includes("/api/products/all")) {
        await Promise.resolve();
        return { ok: false, status: 503 };
      }
      throw new Error(`URL inesperada: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchAllAlfaluxProducts();
    const [first, second] = await Promise.all([
      fetchAllAlfaluxProducts(true),
      fetchAllAlfaluxProducts(true),
    ]);

    expect(first).toHaveLength(120);
    expect(second).toEqual(first);
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
