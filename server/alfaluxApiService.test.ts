import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gzipSync } from "node:zlib";
import { ENV } from "./_core/env";
import {
  fetchAcessoriosProducts,
  fetchAllAlfaluxProducts,
  fetchCustomizadosProducts,
  fetchRevendaProducts,
  invalidateAlfaluxCache,
  isCustomizadosCacheFresh,
  isValidOfficialProductCatalog,
  mergeRevendaProductsWithOfficialCosts,
  normalizeAlfaluxComponentDescription,
  normalizeRevendaProduct,
} from "./alfaluxApiService";

const realAlfaluxApiEmail = ENV.alfaluxApiEmail;
const realAlfaluxApiPassword = ENV.alfaluxApiPassword;

beforeEach(() => {
  ENV.alfaluxApiEmail = "";
  ENV.alfaluxApiPassword = "";
  invalidateAlfaluxCache();
});

afterEach(() => {
  ENV.alfaluxApiEmail = realAlfaluxApiEmail;
  ENV.alfaluxApiPassword = realAlfaluxApiPassword;
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
  it("lê diretamente o novo campo custo publicado no catálogo oficial de Revenda", () => {
    const product = normalizeRevendaProduct({
      codigo: "RV00001",
      descricao: "SPOT LED MR16 GU10 6W",
      referencia: null,
      fornecedor: "FORNECEDOR",
      fotoUrl: null,
      precoVenda: 258.4,
      custo: 103.36,
    });

    expect(product).toMatchObject({ codigo: "RV00001", custo: 103.36, precoVenda: 258.4 });
  });

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

  it("mescla somente o custo oficial protegido do mesmo código de Revenda", () => {
    const publicProducts = [
      normalizeRevendaProduct({ codigo: "RV00064", descricao: "POWER BEAM", referencia: null, fornecedor: null, fotoUrl: null, precoVenda: 476.15 }),
      normalizeRevendaProduct({ codigo: "RV00065", descricao: "SEM CUSTO", referencia: null, fornecedor: null, fotoUrl: null, precoVenda: 100 }),
    ];
    const protectedProducts = [
      normalizeRevendaProduct({ codigo: "rv00064", descricao: "POWER BEAM", referencia: null, fornecedor: null, fotoUrl: null, precoVenda: 476.15, custo: 190.46 }),
    ];

    const merged = mergeRevendaProductsWithOfficialCosts(publicProducts, protectedProducts);

    expect(merged[0]).toMatchObject({ codigo: "RV00064", custo: 190.46, precoVenda: 476.15 });
    expect(merged[1]?.custo).toBeUndefined();
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
  it("considera Customizados recente somente dentro da janela do catálogo auxiliar", () => {
    const entry = {
      data: [{ sku: "CUS-001", name: "CUSTOMIZADO OFICIAL", descricao: null, familia: null, fotoUrl: null, precoVenda: null, clienteEspecifico: null, observacoes: null }],
      fetchedAt: 1_000,
    };

    expect(isCustomizadosCacheFresh(entry, 1_000 + 59_999)).toBe(true);
    expect(isCustomizadosCacheFresh(entry, 1_000 + 60_001)).toBe(false);
  });

  it("compartilha a mesma consulta oficial de Customizados entre chamadas simultâneas", async () => {
    const officialProducts = Array.from({ length: 120 }, (_, index) => ({
      sku: `CUS-${String(index + 1).padStart(3, "0")}`,
      name: `CUSTOMIZADO OFICIAL ${index + 1}`,
      categoria: "CUSTOMIZADOS",
    }));
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/api/products/all")) {
        return { ok: true, json: async () => ({ products: officialProducts }) };
      }
      if (url.includes("/api/componentes/all")) {
        return { ok: true, json: async () => ({ items: [], tipos: [] }) };
      }
      throw new Error(`URL inesperada: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      fetchCustomizadosProducts(),
      fetchCustomizadosProducts(),
    ]);

    expect(first).toHaveLength(120);
    expect(second).toEqual(first);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/products/all"))).toHaveLength(1);
  });

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

  it("preserva no catálogo interno o custo recebido diretamente da rota pública de Revenda", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [{ codigo: "RV00001", descricao: "SPOT LED MR16 GU10 6W", referencia: null, fornecedor: null, fotoUrl: null, precoVenda: 258.4, custo: 103.36 }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const products = await fetchRevendaProducts();

    expect(products).toEqual([
      expect.objectContaining({ codigo: "RV00001", precoVenda: 258.4, custo: 103.36 }),
    ]);
  });

  it("mescla o custo da rota autenticada no catálogo público de Revenda", async () => {
    ENV.alfaluxApiEmail = "conta-tecnica@grupoalfalux.com.br";
    ENV.alfaluxApiPassword = "segredo-de-teste";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/api/revenda/all")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            products: [{ codigo: "RV00064", descricao: "POWER BEAM", referencia: null, fornecedor: null, fotoUrl: null, precoVenda: 476.15 }],
          }),
        } as Response;
      }
      if (url.endsWith("/api/trpc/auth.login")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "set-cookie": "alfalux_session=sessao-teste; Path=/; HttpOnly" }),
          json: async () => ({ result: { data: { json: { success: true } } } }),
        } as Response;
      }
      if (url.includes("/api/trpc/revenda.list")) {
        expect((init?.headers as Record<string, string>)?.Cookie).toBe("alfalux_session=sessao-teste");
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            result: {
              data: {
                json: {
                  items: [{ codigo: "RV00064", descricao: "POWER BEAM", referencia: null, fornecedor: null, fotoUrl: null, precoVenda: 476.15, custo: 190.46 }],
                  total: 1,
                },
              },
            },
          }),
        } as Response;
      }
      throw new Error(`URL inesperada: ${url}`);
    });

    const products = await fetchRevendaProducts();

    expect(products).toEqual([
      expect.objectContaining({ codigo: "RV00064", precoVenda: 476.15, custo: 190.46 }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
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
