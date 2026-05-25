import { describe, it, expect } from "vitest";
import { ARANDELA_CATALOG, calculateArandela } from "./arandelaCatalog";

describe("ARANDELA_CATALOG", () => {
  it("deve conter pelo menos 1 produto no catálogo estático", () => {
    expect(ARANDELA_CATALOG.length).toBeGreaterThanOrEqual(1);
  });

  it("todos os produtos devem ter instalacao, familia, name e driver220", () => {
    for (const p of ARANDELA_CATALOG) {
      expect(p.instalacao).toBeTruthy();
      expect(p.familia).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.driver220).toBeTruthy();
      expect(p.driver220.model).toBeTruthy();
    }
  });

  it("produto TRICK deve estar no catálogo", () => {
    const trick = ARANDELA_CATALOG.find(p => p.familia === "TRICK");
    expect(trick).toBeDefined();
    expect(trick?.name).toBe("TRICK LED 2W IP65 D1 + D2");
    expect(trick?.sku).toBe("LDA-5270.100.50C");
  });
});

describe("calculateArandela", () => {
  const trickProduct = ARANDELA_CATALOG.find(p => p.familia === "TRICK")!;

  it("deve retornar null para SKU inexistente", () => {
    const result = calculateArandela(ARANDELA_CATALOG, {
      productSku: "NAO-EXISTE",
      tensao: "220V",
      cct: "3000K",
      controle: "ON/OFF",
    });
    expect(result).toBeNull();
  });

  it("deve calcular corretamente para TRICK 220V 3000K", () => {
    const result = calculateArandela(ARANDELA_CATALOG, {
      productSku: trickProduct.sku!,
      productName: trickProduct.name,
      tensao: "220V",
      cct: "3000K",
      controle: "ON/OFF",
    });
    expect(result).not.toBeNull();
    expect(result!.product.name).toBe("TRICK LED 2W IP65 D1 + D2");
    expect(result!.tensao).toBe("220V");
    expect(result!.cct).toBe("3000K");
    expect(result!.driver.model).toContain("LED DRIVER");
    expect(result!.driver.code).toBe("EQ00665");
  });

  it("deve usar driver220 quando Bivolt não está disponível", () => {
    const result = calculateArandela(ARANDELA_CATALOG, {
      productSku: trickProduct.sku!,
      productName: trickProduct.name,
      tensao: "Bivolt",
      cct: "3000K",
      controle: "ON/OFF",
    });
    // TRICK não tem driverBivolt, deve usar driver220
    expect(result).not.toBeNull();
    expect(result!.driver.code).toBe("EQ00665");
  });

  it("deve substituir [CCT] no ledModule pelo CCT selecionado", () => {
    const catalogWithCCT = [
      {
        ...trickProduct,
        ledModule: "STRIPFLEX [CCT] 562,5MM",
      },
    ];
    const result = calculateArandela(catalogWithCCT, {
      productSku: trickProduct.sku!,
      productName: trickProduct.name,
      tensao: "220V",
      cct: "4000K",
      controle: "ON/OFF",
    });
    expect(result!.ledModuleWithCCT).toBe("STRIPFLEX 4000K 562,5MM");
  });

  it("deve retornar ledModuleWithCCT null quando ledModule é null", () => {
    const catalogNoModule = [{ ...trickProduct, ledModule: null }];
    const result = calculateArandela(catalogNoModule, {
      productSku: trickProduct.sku!,
      productName: trickProduct.name,
      tensao: "220V",
      cct: "3000K",
      controle: "ON/OFF",
    });
    expect(result!.ledModuleWithCCT).toBeNull();
  });
});
