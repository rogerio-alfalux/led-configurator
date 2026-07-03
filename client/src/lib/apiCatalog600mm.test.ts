/**
 * Teste de regressão: verificar se o catálogo dinâmico (adaptado da API)
 * tem o módulo IN 1B 575MM para BLAZE H e se 600mm funciona corretamente.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { adaptProfileProducts } from "./profileApiAdapter";
import { setActiveCatalog, resetActiveCatalog, getActiveCatalog } from "./ledCatalog";
import { calculateComposition } from "./ledEngine";
import type { AlfaluxProduct } from "../../../server/alfaluxApiService";

// Simular os produtos BLAZE H retornados pela API
function makeBlazeHProduct(name: string, sku: string): AlfaluxProduct {
  return {
    sku,
    name,
    categoria: "PERFIS",
    instalacao: "PENDENTE",
    ledModule: "STRIPFLEX 562,5 X 10MM - 36 LEDS [CCT]",
    driver220: { model: "LED DRIVER XITANIUM 19W 200-350MA 30-54VDC DS 230V", code: "EQ00346" },
    driverBivolt: { model: "LED DRIVER 20W 350MA 25-57VDC BIV", code: "EQ00658" },
    driverDimDali: { model: "LED DRIVER 75W 120-500MA 54-240VDC 220V DALI SLIM", code: "EQ00221" },
    driverDim110v: null,
    // outros campos obrigatórios
    familia: "BLAZE H",
    foto: null,
    fotoUrl: null,
    custoCorpoOnoff220v: null,
    custoCorpoOnoffBivolt: null,
    custoCorpoDim110v: null,
    custoCorpoDimDali: null,
    custoCorpoDimTriac110v: null,
    custoCorpoDimTriac220v: null,
    custoCorpoOnoff220vD1D2: null,
    custoCorpoOnoffBivoltD1D2: null,
    custoCorpoDim110vD1D2: null,
    custoCorpoDimDaliD1D2: null,
    custoCorpoDimTriac110vD1D2: null,
    custoCorpoDimTriac220vD1D2: null,
    markupPadraoOnoff220v: null,
    markupMinimoOnoff220v: null,
    markupPadraoOnoffBivolt: null,
    markupMinimoOnoffBivolt: null,
    markupPadraoDim110v: null,
    markupMinimoDim110v: null,
    markupPadraoDimDali: null,
    markupMinimoDimDali: null,
    markupPadraoDimTriac110v: null,
    markupMinimoDimTriac110v: null,
    markupPadraoDimTriac220v: null,
    markupMinimoDimTriac220v: null,
    markupMinimoDriver: null,
    driverQtdOnoff220v: null,
    driverQtdOnoffBivolt: null,
    driverQtdDim110v: null,
    driverQtdDimDali: null,
    driverQtdDimTriac110v: null,
    driverQtdDimTriac220v: null,
  } as unknown as AlfaluxProduct;
}

const BLAZE_H_PRODUCTS: AlfaluxProduct[] = [
  makeBlazeHProduct("BLAZE H P IF 1B 575MM", "LLP-6060.1IF.48F"),
  makeBlazeHProduct("BLAZE H P IF 2B 1135MM", "LLP-6060.2IF.48F"),
  makeBlazeHProduct("BLAZE H P IF 3B 1700MM", "LLP-6060.3IF.48F"),
  makeBlazeHProduct("BLAZE H P IF 3.5B 2010MM", "LLP-6060.35F.48F"),
  makeBlazeHProduct("BLAZE H P IF 3.8B 2200MM", "LLP-6060.38F.48F"),
  makeBlazeHProduct("BLAZE H P IF 4B 2260MM", "LLP-6060.4IF.48F"),
  makeBlazeHProduct("BLAZE H P IF 4.6B 2635MM", "LLP-6060.46F.48F"),
  makeBlazeHProduct("BLAZE H P IF 4.8B 2760MM", "LLP-6060.48F.48F"),
  makeBlazeHProduct("BLAZE H P IF 5B 2825MM", "LLP-6060.5IF.48F"),
  makeBlazeHProduct("BLAZE H P IF 5.8B 3325MM", "LLP-6060.58F.48F"),
  makeBlazeHProduct("BLAZE H P IF 6B 3385MM", "LLP-6060.6IF.48F"),
  makeBlazeHProduct("BLAZE H P IN 1B 575MM", "LLP-6060.1IN.48F"),
  makeBlazeHProduct("BLAZE H P IN 2B 1135MM", "LLP-6060.2IN.48F"),
  makeBlazeHProduct("BLAZE H P IN 2.2B 1260MM", "LLP-6060.22I.48F"),
  makeBlazeHProduct("BLAZE H P IN 3B 1700MM", "LLP-6060.3IN.48F"),
  makeBlazeHProduct("BLAZE H P IN 3.1B 1760MM", "LLP-6060.31I.48F"),
  makeBlazeHProduct("BLAZE H P IN 4B 2260MM", "LLP-6060.4IN.48F"),
  makeBlazeHProduct("BLAZE H P IN 5B 2825MM", "LLP-6060.5IN.48F"),
  makeBlazeHProduct("BLAZE H P IN 6B 3385MM", "LLP-6060.6IN.48F"),
  makeBlazeHProduct("BLAZE H P ML 1B 570MM", "LLP-6060.1ML.48F"),
  makeBlazeHProduct("BLAZE H P ML 2B 1130MM", "LLP-6060.2ML.48F"),
  makeBlazeHProduct("BLAZE H P ML 3B 1695MM", "LLP-6060.3ML.48F"),
  makeBlazeHProduct("BLAZE H P ML 4B 2255MM", "LLP-6060.4ML.48F"),
  makeBlazeHProduct("BLAZE H P ML 4.6B 2630MM", "LLP-6060.46M.48F"),
  makeBlazeHProduct("BLAZE H P ML 4.8B 2755MM", "LLP-6060.48M.48F"),
  makeBlazeHProduct("BLAZE H P ML 5B 2820MM", "LLP-6060.5ML.48F"),
];

describe("catálogo dinâmico BLAZE H — módulo IN 1B e 600mm", () => {
  let apiCatalog: ReturnType<typeof adaptProfileProducts>;

  beforeEach(() => {
    apiCatalog = adaptProfileProducts(BLAZE_H_PRODUCTS);
    if (apiCatalog) setActiveCatalog(apiCatalog);
  });

  afterEach(() => {
    resetActiveCatalog();
  });

  it("adaptProfileProducts retorna catálogo não-nulo", () => {
    expect(apiCatalog).not.toBeNull();
  });

  it("catálogo dinâmico tem LLP-6060", () => {
    expect(apiCatalog!["LLP-6060"]).toBeDefined();
  });

  it("catálogo dinâmico tem módulo IN 1B 575mm", () => {
    const variant = apiCatalog!["LLP-6060"];
    expect(variant.modules.IN["1"]).toBeDefined();
    expect(variant.modules.IN["1"].length).toBe(575);
    expect(variant.modules.IN["1"].sku).toBe("LLP-6060.1IN.48F");
  });

  it("catálogo ativo (getActiveCatalog) tem LLP-6060 com módulo IN 1B", () => {
    const active = getActiveCatalog();
    expect(active["LLP-6060"]).toBeDefined();
    expect(active["LLP-6060"].modules.IN["1"]).toBeDefined();
    expect(active["LLP-6060"].modules.IN["1"].length).toBe(575);
  });

  it("calculateComposition para BLAZE H 600mm retorna realizedLength > 0", () => {
    const result = calculateComposition({
      profileCode: "LLP-6060",
      application: "D1",
      powerD1: 18,
      cct: "3000K",
      voltage: "220Vac",
      totalLength: 600,
      allowLongModules: false,
      independentLighting: false,
      sheetDrivers: [],
      controlType: "onoff",
      driver220: { model: "LED DRIVER XITANIUM 19W", code: "EQ00346" },
      driverBivolt: { model: "LED DRIVER 20W", code: "EQ00658" },
      driverDimDali: null,
      driverDim110v: null,
    });
    expect(result.realizedLength).toBeGreaterThan(0);
    expect(result.realizedLength).toBe(575);
    expect(result.composition.length).toBe(1);
    expect(result.composition[0].sku).toBe("LLP-6060.1IN.48F");
  });

  it("driver da API é usado no resultado para 600mm 220V ON/OFF", () => {
    const result = calculateComposition({
      profileCode: "LLP-6060",
      application: "D1",
      powerD1: 18,
      cct: "3000K",
      voltage: "220Vac",
      totalLength: 600,
      allowLongModules: false,
      independentLighting: false,
      sheetDrivers: [],
      controlType: "onoff",
      driver220: { model: "LED DRIVER XITANIUM 19W 200-350MA 30-54VDC DS 230V", code: "EQ00346" },
      driverBivolt: { model: "LED DRIVER 20W 350MA 25-57VDC BIV", code: "EQ00658" },
      driverDimDali: null,
      driverDim110v: null,
    });
    expect(result.driversD1.length).toBeGreaterThan(0);
    const driver = result.driversD1[0].driver;
    expect(driver.model).toBe("LED DRIVER XITANIUM 19W 200-350MA 30-54VDC DS 230V");
    expect(driver.code).toBe("EQ00346");
  });
});
