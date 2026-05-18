import { describe, it, expect } from "vitest";
import { SPOT_CATALOG, calculateSpot } from "./spotCatalog";

describe("SPOT_CATALOG", () => {
  it("deve ter 3 produtos no catálogo de fallback", () => {
    expect(SPOT_CATALOG).toHaveLength(3);
  });

  it("todos os produtos devem ter instalação SOBREPOR", () => {
    for (const p of SPOT_CATALOG) {
      expect(p.instalacao).toBe("SOBREPOR");
    }
  });

  it("todos os produtos devem ser da família ZEUS", () => {
    for (const p of SPOT_CATALOG) {
      expect(p.familia).toBe("ZEUS");
    }
  });

  it("todos os produtos devem ter driver 220V", () => {
    for (const p of SPOT_CATALOG) {
      expect(p.driver220).toBeDefined();
      expect(p.driver220.model).toContain("PHILIPS");
      expect(p.driver220.code).toBe("EQ00353");
    }
  });

  it("nenhum produto deve ter driver Bivolt (NÃO APLICÁVEL)", () => {
    for (const p of SPOT_CATALOG) {
      expect(p.driverBivolt).toBeNull();
    }
  });

  it("todos os produtos devem ter CCTs 2700K, 3000K, 4000K, 5000K", () => {
    for (const p of SPOT_CATALOG) {
      expect(p.ccts).toContain("2700K");
      expect(p.ccts).toContain("3000K");
      expect(p.ccts).toContain("4000K");
      expect(p.ccts).toContain("5000K");
    }
  });

  it("deve ter os 3 ângulos: 10°, 24° e 36°", () => {
    const names = SPOT_CATALOG.map((p) => p.name);
    expect(names.some((n) => n.includes("10°"))).toBe(true);
    expect(names.some((n) => n.includes("24°"))).toBe(true);
    expect(names.some((n) => n.includes("36°"))).toBe(true);
  });
});

describe("calculateSpot", () => {
  const zeusProduct = SPOT_CATALOG.find(p => p.name === "ZEUS 17W 10° TRL")!;
  const secondProduct = SPOT_CATALOG[1];

  it("deve retornar null para SKU inválido", () => {
    expect(calculateSpot(SPOT_CATALOG, { productName: "NOME-INEXISTENTE-9999", tensao: "220V", cct: "3000K", controle: "ON/OFF" })).toBeNull();
  });

  it("deve calcular corretamente para ZEUS 17W 10° TRL em 220V 3000K", () => {
    const result = calculateSpot(SPOT_CATALOG, { productName: zeusProduct.name, tensao: "220V", cct: "3000K", controle: "ON/OFF" });
    expect(result).not.toBeNull();
    expect(result!.product.name).toBe("ZEUS 17W 10° TRL");
    expect(result!.tensao).toBe("220V");
    expect(result!.cct).toBe("3000K");
    expect(result!.driver.code).toBe("EQ00353");
  });

  it("deve usar driver 220V quando Bivolt não está disponível", () => {
    const result = calculateSpot(SPOT_CATALOG, { productName: secondProduct.name, tensao: "Bivolt", cct: "4000K", controle: "ON/OFF" });
    expect(result).not.toBeNull();
    // Bivolt não disponível → usa driver 220V
    expect(result!.driver.code).toBe("EQ00353");
  });

  it("deve substituir [CCT] no módulo LED pelo valor selecionado", () => {
    const result = calculateSpot(SPOT_CATALOG, { productName: zeusProduct.name, tensao: "220V", cct: "2700K", controle: "ON/OFF" });
    expect(result).not.toBeNull();
    expect(result!.ledModuleWithCCT).not.toBeNull();
  });

  it("deve preservar ótica e holder no resultado", () => {
    const result = calculateSpot(SPOT_CATALOG, { productName: zeusProduct.name, tensao: "220V", cct: "3000K", controle: "ON/OFF" });
    expect(result).not.toBeNull();
    expect(result!.product.otica).toContain("REFLETOR");
    expect(result!.product.holder).toContain("HOLDER");
  });

  it("deve calcular para todos os produtos sem erros", () => {
    for (const p of SPOT_CATALOG) {
      if (!p.sku) continue;
      const result = calculateSpot(SPOT_CATALOG, { productName: p.name, tensao: "220V", cct: "3000K", controle: "ON/OFF" });
      expect(result).not.toBeNull();
    }
  });
});
