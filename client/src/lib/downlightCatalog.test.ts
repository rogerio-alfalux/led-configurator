import { describe, it, expect } from "vitest";
import {
  DOWNLIGHT_CATALOG,
  calculateDownlight,
  type DownlightConfig,
} from "./downlightCatalog";

// ─── Catálogo ──────────────────────────────────────────────────────────────

describe("DOWNLIGHT_CATALOG", () => {
  it("deve ter 156 produtos", () => {
    expect(DOWNLIGHT_CATALOG).toHaveLength(156);
  });

  it("todos os produtos devem ter sku, name, instalacao, familia, ledModule", () => {
    for (const p of DOWNLIGHT_CATALOG) {
      expect(p.sku).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.instalacao).toBeTruthy();
      expect(p.familia).toBeTruthy();
      expect(p.ledModule).toBeTruthy();
    }
  });

  it("todos os produtos devem ter driver220 com model", () => {
    for (const p of DOWNLIGHT_CATALOG) {
      expect(p.driver220).toBeTruthy();
      expect(p.driver220.model).toBeTruthy();
      // code pode ser vazio para produtos sem código EQ (ex: LIFUD sem EQ)
      expect(typeof p.driver220.code).toBe("string");
    }
  });

  it("campos holder, otica, dissipador devem ser string ou null (nunca 'NÃO APLICÁVEL')", () => {
    for (const p of DOWNLIGHT_CATALOG) {
      if (p.holder !== null) {
        expect(typeof p.holder).toBe("string");
        expect(p.holder.toUpperCase()).not.toContain("NÃO APLICÁVEL");
      }
      if (p.otica !== null) {
        expect(typeof p.otica).toBe("string");
        expect(p.otica.toUpperCase()).not.toContain("NÃO APLICÁVEL");
      }
      if (p.dissipador !== null) {
        expect(typeof p.dissipador).toBe("string");
        expect(p.dissipador.toUpperCase()).not.toContain("NÃO APLICÁVEL");
      }
    }
  });

  it("módulo LED não deve conter '[CCT]' (placeholder removido)", () => {
    for (const p of DOWNLIGHT_CATALOG) {
      expect(p.ledModule).not.toContain("[CCT]");
    }
  });

  it("deve conter produtos do tipo EMBUTIR", () => {
    const embutir = DOWNLIGHT_CATALOG.filter((p) => p.instalacao === "EMBUTIR");
    expect(embutir.length).toBeGreaterThan(0);
  });

  it("deve conter produtos do tipo NO FRAME", () => {
    const noFrame = DOWNLIGHT_CATALOG.filter((p) => p.instalacao === "NO FRAME");
    expect(noFrame.length).toBeGreaterThan(0);
  });

  it("deve conter família LUNA", () => {
    const luna = DOWNLIGHT_CATALOG.filter((p) => p.familia === "LUNA");
    expect(luna.length).toBeGreaterThan(0);
  });

  it("deve conter família MYRO", () => {
    const myro = DOWNLIGHT_CATALOG.filter((p) => p.familia === "MYRO");
    expect(myro.length).toBeGreaterThan(0);
  });

  it("deve conter família LUNA SPOT", () => {
    const lunaSpot = DOWNLIGHT_CATALOG.filter((p) => p.familia === "LUNA SPOT");
    expect(lunaSpot.length).toBeGreaterThan(0);
  });

  it("deve conter família EASY LED POINT", () => {
    const easyLed = DOWNLIGHT_CATALOG.filter((p) => p.familia === "EASY LED POINT");
    expect(easyLed.length).toBeGreaterThan(0);
  });

  it("produtos com código EQ devem estar no formato EQ00XXX", () => {
    for (const p of DOWNLIGHT_CATALOG) {
      if (p.driver220.code) {
        expect(p.driver220.code).toMatch(/^(EQ\d{5}|S|)$/);
      }
      if (p.driverBivolt?.code) {
        expect(p.driverBivolt.code).toMatch(/^(EQ\d{5}|S|)$/);
      }
    }
  });
});

// ─── calculateDownlight ────────────────────────────────────────────────────

describe("calculateDownlight", () => {
  // Índice de produto LUNA com Bivolt disponível
  const lunaIdx = DOWNLIGHT_CATALOG.findIndex(
    (p) => p.familia === "LUNA" && p.driverBivolt !== null
  );
  // Índice de produto sem Bivolt
  const noBivoltIdx = DOWNLIGHT_CATALOG.findIndex(
    (p) => p.driverBivolt === null
  );

  it("deve retornar resultado com ledModuleWithCCT concatenado", () => {
    const cfg: DownlightConfig = {
      productIndex: lunaIdx,
      voltage: "220V",
      cct: "3000K",
      quantity: 1,
    };
    const result = calculateDownlight(cfg);
    expect(result.ledModuleWithCCT).toContain("3000K");
    expect(result.ledModuleWithCCT).not.toContain("[CCT]");
  });

  it("deve usar driver220 quando tensão é 220V", () => {
    const cfg: DownlightConfig = {
      productIndex: lunaIdx,
      voltage: "220V",
      cct: "4000K",
      quantity: 1,
    };
    const result = calculateDownlight(cfg);
    expect(result.driver).toEqual(DOWNLIGHT_CATALOG[lunaIdx].driver220);
    expect(result.bivoltUnavailable).toBe(false);
  });

  it("deve usar driverBivolt quando tensão é Bivolt e produto tem Bivolt", () => {
    const cfg: DownlightConfig = {
      productIndex: lunaIdx,
      voltage: "Bivolt",
      cct: "2700K",
      quantity: 1,
    };
    const result = calculateDownlight(cfg);
    expect(result.driver).toEqual(DOWNLIGHT_CATALOG[lunaIdx].driverBivolt);
    expect(result.bivoltUnavailable).toBe(false);
  });

  it("deve usar driver220 e sinalizar bivoltUnavailable quando produto não tem Bivolt", () => {
    if (noBivoltIdx < 0) return;
    const cfg: DownlightConfig = {
      productIndex: noBivoltIdx,
      voltage: "Bivolt",
      cct: "3000K",
      quantity: 1,
    };
    const result = calculateDownlight(cfg);
    expect(result.driver).toEqual(DOWNLIGHT_CATALOG[noBivoltIdx].driver220);
    expect(result.bivoltUnavailable).toBe(true);
  });

  it("deve preservar cct e voltage no resultado", () => {
    const cfg: DownlightConfig = {
      productIndex: lunaIdx,
      voltage: "220V",
      cct: "5000K",
      quantity: 2,
    };
    const result = calculateDownlight(cfg);
    expect(result.cct).toBe("5000K");
    expect(result.voltage).toBe("220V");
    expect(result.quantity).toBe(2);
  });

  it("deve incluir referência ao produto no resultado com SKU", () => {
    const cfg: DownlightConfig = {
      productIndex: lunaIdx,
      voltage: "220V",
      cct: "3000K",
      quantity: 1,
    };
    const result = calculateDownlight(cfg);
    expect(result.product).toEqual(DOWNLIGHT_CATALOG[lunaIdx]);
    expect(result.product.sku).toBeTruthy();
  });

  it("deve incluir campos holder, otica, dissipador no produto do resultado", () => {
    const cfg: DownlightConfig = {
      productIndex: lunaIdx,
      voltage: "220V",
      cct: "3000K",
      quantity: 1,
    };
    const result = calculateDownlight(cfg);
    // holder/otica/dissipador podem ser null ou string — nunca undefined
    expect(result.product.holder === null || typeof result.product.holder === "string").toBe(true);
    expect(result.product.otica === null || typeof result.product.otica === "string").toBe(true);
    expect(result.product.dissipador === null || typeof result.product.dissipador === "string").toBe(true);
  });
});
