import { describe, it, expect } from "vitest";
import { adaptAlfaluxProducts, parseCCTs } from "./alfaluxApiAdapter";
import type { ApiProduct } from "./alfaluxApiAdapter";

function makeProduct(overrides: Partial<ApiProduct> = {}): ApiProduct {
  return {
    id: 1,
    categoria: "DOWNLIGHTS",
    instalacao: "EMBUTIR",
    familia: "LUNA",
    sku: "LDE-1234.567.89F",
    produto: "LUNA PP LED 13W",
    moduloLed: "TRACE CIRCULAR 12 LEDS Ø67MM",
    otica: "REFLETOR Ø50MM 15°",
    oticaNaoAplicavel: false,
    holder: "HOLDER NATA 50MM",
    holderNaoAplicavel: false,
    dissipador: "NÃO APLICÁVEL",
    dissipadorNaoAplicavel: true,
    driverOnoff220: "LIFUD 30W 700MA (EQ00123)",
    driverOnoffBivolt: "LIFUD 30W BIVOLT (EQ00456)",
    driverOnoffBivoltNaoAplicavel: false,
    driverDim110v: null,
    driverDim110vNaoAplicavel: false,
    driverDimDali: null,
    driverDimDaliNaoAplicavel: false,
    temperaturasCor: '["2700","3000","4000","5000"]',
    fotoUrl: "https://example.com/foto.jpg",
    fotoKey: "foto.jpg",
    custoLuminaria: null,
    custoDriverOnoff220: null,
    custoDriverOnoffBivolt: null,
    custoDriverDim110v: null,
    custoDriverDimDali: null,
    createdAt: "2026-05-15T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("parseCCTs", () => {
  it("converte array JSON de CCTs para strings com K", () => {
    expect(parseCCTs('["2700","3000","4000","5000"]')).toEqual(["2700K", "3000K", "4000K", "5000K"]);
  });

  it("mantém K se já presente", () => {
    expect(parseCCTs('["2700K","3000K"]')).toEqual(["2700K", "3000K"]);
  });

  it("retorna 3000K como fallback para JSON inválido", () => {
    expect(parseCCTs("invalid")).toEqual(["3000K"]);
  });

  it("retorna 3000K para string vazia", () => {
    expect(parseCCTs("")).toEqual(["3000K"]);
  });
});

describe("adaptAlfaluxProducts - Downlights", () => {
  it("converte produto Downlight corretamente", () => {
    const products = [makeProduct()];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlights).toHaveLength(1);
    const dl = result.downlights[0];
    expect(dl.instalacao).toBe("EMBUTIR");
    expect(dl.familia).toBe("LUNA");
    expect(dl.sku).toBe("LDE-1234.567.89F");
    expect(dl.name).toBe("LUNA PP LED 13W");
    expect(dl.ledModule).toBe("TRACE CIRCULAR 12 LEDS Ø67MM");
    expect(dl.otica).toBe("REFLETOR Ø50MM 15°");
    expect(dl.holder).toBe("HOLDER NATA 50MM");
    expect(dl.dissipador).toBeNull(); // dissipadorNaoAplicavel = true
  });

  it("extrai código EQ do driver 220V", () => {
    const products = [makeProduct({ driverOnoff220: "LIFUD 30W 700MA (EQ00123)" })];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlights[0].driver220.code).toBe("EQ00123");
    expect(result.downlights[0].driver220.model).toBe("LIFUD 30W 700MA");
  });

  it("extrai código EQ do driver Bivolt", () => {
    const products = [makeProduct({ driverOnoffBivolt: "LIFUD 30W BIVOLT (EQ00456)" })];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlights[0].driverBivolt?.code).toBe("EQ00456");
    expect(result.downlights[0].driverBivolt?.model).toBe("LIFUD 30W BIVOLT");
  });

  it("define driverBivolt como null quando naoAplicavel=true", () => {
    const products = [makeProduct({ driverOnoffBivoltNaoAplicavel: true })];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlights[0].driverBivolt).toBeNull();
  });

  it("define driverBivolt como null quando campo vazio", () => {
    const products = [makeProduct({ driverOnoffBivolt: "", driverOnoffBivoltNaoAplicavel: false })];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlights[0].driverBivolt).toBeNull();
  });

  it("mapeia CCTs por familia", () => {
    const products = [makeProduct({ familia: "LUNA", temperaturasCor: '["2700","3000","4000"]' })];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlightCCTs["LUNA"]).toEqual(["2700K", "3000K", "4000K"]);
  });

  it("mapeia foto por SKU", () => {
    const products = [makeProduct({ sku: "LDE-1234.567.89F", fotoUrl: "https://example.com/foto.jpg" })];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlightFotos["LDE-1234.567.89F"]).toBe("https://example.com/foto.jpg");
  });
});

describe("adaptAlfaluxProducts - Painéis", () => {
  it("converte produto Painel corretamente", () => {
    const products = [makeProduct({ categoria: "PAINÉIS", familia: "ALE-2103", produto: "ALE-2103 36W" })];
    const result = adaptAlfaluxProducts(products);
    expect(result.paineis).toHaveLength(1);
    const p = result.paineis[0];
    expect(p.familia).toBe("ALE-2103");
    expect(p.name).toBe("ALE-2103 36W");
  });

  it("aceita categoria PAINEIS (sem acento)", () => {
    const products = [makeProduct({ categoria: "PAINEIS", familia: "ALE-2103" })];
    const result = adaptAlfaluxProducts(products);
    expect(result.paineis).toHaveLength(1);
  });

  it("mapeia foto por familia para Painéis", () => {
    const products = [makeProduct({ categoria: "PAINÉIS", familia: "ALE-2103", fotoUrl: "https://example.com/painel.jpg" })];
    const result = adaptAlfaluxProducts(products);
    expect(result.painelFotos["ALE-2103"]).toBe("https://example.com/painel.jpg");
  });
});

describe("adaptAlfaluxProducts - separação de categorias", () => {
  it("separa Downlights e Painéis corretamente", () => {
    const products = [
      makeProduct({ categoria: "DOWNLIGHTS", familia: "LUNA" }),
      makeProduct({ id: 2, categoria: "PAINÉIS", familia: "ALE-2103" }),
    ];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlights).toHaveLength(1);
    expect(result.paineis).toHaveLength(1);
  });

  it("ignora categorias desconhecidas", () => {
    const products = [makeProduct({ categoria: "SPOTS" })];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlights).toHaveLength(0);
    expect(result.paineis).toHaveLength(0);
  });

  it("retorna catálogos vazios para array vazio", () => {
    const result = adaptAlfaluxProducts([]);
    expect(result.downlights).toHaveLength(0);
    expect(result.paineis).toHaveLength(0);
  });
});
