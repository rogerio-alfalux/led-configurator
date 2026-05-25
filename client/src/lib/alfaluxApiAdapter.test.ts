import { describe, it, expect } from "vitest";
import { adaptAlfaluxProducts, parseCCTs } from "./alfaluxApiAdapter";
import type { ApiProduct, DriverInfo } from "./alfaluxApiAdapter";

/** Cria um DriverInfo padrão para testes */
function makeDriver(model: string, code: string | null = null): DriverInfo {
  return { model, code };
}

/** Cria um ApiProduct no novo formato (campos do /api/products/all) */
function makeProduct(overrides: Partial<ApiProduct> = {}): ApiProduct {
  return {
    categoria: "DOWNLIGHTS",
    instalacao: "EMBUTIR",
    familia: "LUNA",
    sku: "LDE-1234.567.89F",
    name: "LUNA PP LED 13W",
    ledModule: "TRACE CIRCULAR 12 LEDS Ø67MM",
    otica: "REFLETOR Ø50MM 15°",
    oticaPrimaria: null,
    oticaSecundaria: null,
    holder: "HOLDER NATA 50MM",
    dissipador: null,
    fotoUrl: "https://example.com/foto.jpg",
    temperaturasCor: ["2700", "3000", "4000", "5000"],
    driver220: makeDriver("LIFUD 30W 700MA", "EQ00123"),
    driverBivolt: makeDriver("LIFUD 30W BIVOLT", "EQ00456"),
    driverDim110v: null,
    driverDimDali: null,
    custoLuminaria: null,
    custoDriver220: null,
    custoDriverBivolt: null,
    custoDriverDim110v: null,
    custoDriverDimDali: null,
    ...overrides,
  };
}

describe("parseCCTs", () => {
  it("converte array de CCTs para strings com K", () => {
    expect(parseCCTs(["2700", "3000", "4000", "5000"])).toEqual(["2700K", "3000K", "4000K", "5000K"]);
  });

  it("mantém K se já presente no array", () => {
    expect(parseCCTs(["2700K", "3000K"])).toEqual(["2700K", "3000K"]);
  });

  it("aceita JSON string legado", () => {
    expect(parseCCTs('["2700","3000","4000","5000"]')).toEqual(["2700K", "3000K", "4000K", "5000K"]);
  });

  it("retorna 3000K como fallback para JSON inválido", () => {
    expect(parseCCTs("invalid")).toEqual(["3000K"]);
  });

  it("retorna 3000K para array vazio", () => {
    expect(parseCCTs([])).toEqual(["3000K"]);
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
    expect(dl.dissipador).toBeNull();
  });

  it("usa model e code do objeto DriverInfo para driver 220V", () => {
    const products = [makeProduct({ driver220: makeDriver("LIFUD 30W 700MA", "EQ00123") })];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlights[0].driver220.code).toBe("EQ00123");
    expect(result.downlights[0].driver220.model).toBe("LIFUD 30W 700MA");
  });

  it("usa model e code do objeto DriverInfo para driver Bivolt", () => {
    const products = [makeProduct({ driverBivolt: makeDriver("LIFUD 30W BIVOLT", "EQ00456") })];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlights[0].driverBivolt?.code).toBe("EQ00456");
    expect(result.downlights[0].driverBivolt?.model).toBe("LIFUD 30W BIVOLT");
  });

  it("define driverBivolt como null quando campo é null", () => {
    const products = [makeProduct({ driverBivolt: null })];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlights[0].driverBivolt).toBeNull();
  });

  it("extrai código EQ do model quando code é null", () => {
    const products = [makeProduct({ driver220: makeDriver("LIFUD 30W 700MA (EQ00123)", null) })];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlights[0].driver220.code).toBe("EQ00123");
    expect(result.downlights[0].driver220.model).toBe("LIFUD 30W 700MA");
  });

  it("mapeia CCTs por familia", () => {
    const products = [makeProduct({ familia: "LUNA", temperaturasCor: ["2700", "3000", "4000"] })];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlightCCTs["LUNA"]).toEqual(["2700K", "3000K", "4000K"]);
  });

  it("mapeia foto por SKU", () => {
    const products = [makeProduct({ sku: "LDE-1234.567.89F", fotoUrl: "https://example.com/foto.jpg" })];
    const result = adaptAlfaluxProducts(products);
    // URLs absolutas (CloudFront pré-assinado) são usadas diretamente pelo browser, sem proxy
    expect(result.downlightFotos["LDE-1234.567.89F"]).toBe("https://example.com/foto.jpg");
  });

  it("usa proxy para caminhos relativos de foto (legado)", () => {
    const products = [makeProduct({ sku: "LDE-1234.567.89F", fotoUrl: "/manus-storage/foto.jpg" })];
    const result = adaptAlfaluxProducts(products);
    // Caminhos relativos passam pelo proxy para evitar bloqueio de autenticação
    expect(result.downlightFotos["LDE-1234.567.89F"]).toBe("/api/image-proxy?url=https%3A%2F%2Falfaluxprod-c8zmg2fn.manus.space%2Fmanus-storage%2Ffoto.jpg");
  });
});

describe("adaptAlfaluxProducts - Painéis", () => {
  it("converte produto Painel corretamente", () => {
    const products = [makeProduct({ categoria: "PAINÉIS", familia: "ALE-2103", name: "ALE-2103 36W" })];
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
    // URLs absolutas (CloudFront pré-assinado) são usadas diretamente pelo browser, sem proxy
    expect(result.painelFotos["ALE-2103"]).toBe("https://example.com/painel.jpg");
  });

  it("remove [CCT] do ledModule em Painéis", () => {
    const products = [makeProduct({ categoria: "PAINÉIS", ledModule: "2.1x Stripflex 562,5 x 10mm 36L [CCT]" })];
    const result = adaptAlfaluxProducts(products);
    expect(result.paineis[0].ledModule).toBe("2.1x Stripflex 562,5 x 10mm 36L");
  });

  it("mapeia driverDimDali de Painéis corretamente", () => {
    const products = [makeProduct({
      categoria: "PAINÉIS",
      driverDimDali: makeDriver("OSRAM ETI 75W DALI (EQ00221)", null),
    })];
    const result = adaptAlfaluxProducts(products);
    const p = result.paineis[0];
    expect(p.driverDimDali).not.toBeNull();
    expect(p.driverDimDali!.model).toBe("OSRAM ETI 75W DALI");
    expect(p.driverDimDali!.code).toBe("EQ00221");
  });

  it("mantém driverDimDali null quando API retorna null", () => {
    const products = [makeProduct({ categoria: "PAINÉIS", driverDimDali: null })];
    const result = adaptAlfaluxProducts(products);
    expect(result.paineis[0].driverDimDali).toBeNull();
  });
});

describe("adaptAlfaluxProducts - separação de categorias", () => {
  it("separa Downlights e Painéis corretamente", () => {
    const products = [
      makeProduct({ categoria: "DOWNLIGHTS", familia: "LUNA" }),
      makeProduct({ categoria: "PAINÉIS", familia: "ALE-2103" }),
    ];
    const result = adaptAlfaluxProducts(products);
    expect(result.downlights).toHaveLength(1);
    expect(result.paineis).toHaveLength(1);
  });

  it("ignora categorias desconhecidas (PERFIS vai para o profileApiAdapter)", () => {
    const products = [makeProduct({ categoria: "PERFIS" })];
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

describe("dados da API usados sem modificação — sem inferência de quantidade", () => {
  it("EASY LED POINT 3X3: ledModule, otica e holder usados exatamente como a API retorna", () => {
    const p = makeProduct({
      categoria: "DOWNLIGHTS",
      name: "EASY LED POINT 3X3 18W 10º",
      ledModule: "TRACE LINEAR 74 x 23MM 3 LEDS 750LM [CCT]",
      otica: "LENTE DARKOO DK-15-X10-LENS-H8.6-3535 + 3x LOUVER PRETO 3 PONTOS DK-S80-GSZ",
      holder: "SUPORTE LENTE DARKOO 3 PONTOS DK-72-ZJ-3H1",
    });
    const result = adaptAlfaluxProducts([p]);
    const dl = result.downlights[0];
    // O adaptador NÃO deve adicionar prefixos — usa os dados exatamente como a API retorna
    expect(dl.ledModule).toBe("TRACE LINEAR 74 x 23MM 3 LEDS 750LM"); // [CCT] removido
    expect(dl.otica).toBe("LENTE DARKOO DK-15-X10-LENS-H8.6-3535 + 3x LOUVER PRETO 3 PONTOS DK-S80-GSZ");
    expect(dl.holder).toBe("SUPORTE LENTE DARKOO 3 PONTOS DK-72-ZJ-3H1");
  });

  it("EASY LED POINT 4X6: ledModule, otica e holder usados exatamente como a API retorna", () => {
    const p = makeProduct({
      categoria: "DOWNLIGHTS",
      name: "EASY LED POINT 4X6 52W 10º",
      ledModule: "TRACE LINEAR 154 x 23MM 6 LEDS 1400LM [CCT]",
      otica: "LENTE DARKOO DK-15-X10-LENS-H8.6-3535 + 4x LOUVER PRETO 6 PONTOS DK-149-GSZ-6H5",
      holder: "SUPORTE LENTE DARKOO 6 PONTOS DK-151-ZJ-6H1",
    });
    const result = adaptAlfaluxProducts([p]);
    const dl = result.downlights[0];
    expect(dl.ledModule).toBe("TRACE LINEAR 154 x 23MM 6 LEDS 1400LM");
    expect(dl.otica).toBe("LENTE DARKOO DK-15-X10-LENS-H8.6-3535 + 4x LOUVER PRETO 6 PONTOS DK-149-GSZ-6H5");
    expect(dl.holder).toBe("SUPORTE LENTE DARKOO 6 PONTOS DK-151-ZJ-6H1");
  });

  it("produto sem NxM no nome: dados usados sem modificação", () => {
    const p = makeProduct({
      categoria: "DOWNLIGHTS",
      name: "LUNA PP LED 13W",
      ledModule: "TRACE CIRCULAR 12 LEDS Ø67MM",
      otica: "REFLETOR Ø50MM 15°",
      holder: "HOLDER NATA 50MM",
    });
    const result = adaptAlfaluxProducts([p]);
    const dl = result.downlights[0];
    expect(dl.ledModule).toBe("TRACE CIRCULAR 12 LEDS Ø67MM");
    expect(dl.otica).toBe("REFLETOR Ø50MM 15°");
    expect(dl.holder).toBe("HOLDER NATA 50MM");
  });
});

describe("resolveOtica — suporte a oticaPrimaria/oticaSecundaria", () => {
  it("usa otica diretamente quando oticaPrimaria é null", () => {
    const p = makeProduct({
      categoria: "DOWNLIGHTS",
      otica: "LENTE DARKOO DK-15-X10-LENS-H8.6-3535 + 3x LOUVER PRETO 3 PONTOS DK-S80-GSZ",
      oticaPrimaria: null,
      oticaSecundaria: null,
    });
    const result = adaptAlfaluxProducts([p]);
    expect(result.downlights[0].otica).toBe("LENTE DARKOO DK-15-X10-LENS-H8.6-3535 + 3x LOUVER PRETO 3 PONTOS DK-S80-GSZ");
  });

  it("combina oticaPrimaria + oticaSecundaria com ' + ' quando ambos presentes", () => {
    const p = makeProduct({
      categoria: "DOWNLIGHTS",
      otica: null,
      oticaPrimaria: "LENTE DARKOO DK-15-X10-LENS-H8.6-3535",
      oticaSecundaria: "3x LOUVER PRETO 3 PONTOS DK-S80-GSZ",
    });
    const result = adaptAlfaluxProducts([p]);
    expect(result.downlights[0].otica).toBe("LENTE DARKOO DK-15-X10-LENS-H8.6-3535 + 3x LOUVER PRETO 3 PONTOS DK-S80-GSZ");
  });

  it("usa apenas oticaPrimaria quando oticaSecundaria é null", () => {
    const p = makeProduct({
      categoria: "DOWNLIGHTS",
      otica: null,
      oticaPrimaria: "LENTE DARKOO DK-15-X10-LENS-H8.6-3535",
      oticaSecundaria: null,
    });
    const result = adaptAlfaluxProducts([p]);
    expect(result.downlights[0].otica).toBe("LENTE DARKOO DK-15-X10-LENS-H8.6-3535");
  });

  it("retorna null quando otica, oticaPrimaria e oticaSecundaria são null", () => {
    const p = makeProduct({
      categoria: "DOWNLIGHTS",
      otica: null,
      oticaPrimaria: null,
      oticaSecundaria: null,
    });
    const result = adaptAlfaluxProducts([p]);
    expect(result.downlights[0].otica).toBeNull();
  });
});
