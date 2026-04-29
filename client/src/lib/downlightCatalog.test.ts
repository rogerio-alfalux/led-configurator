import { describe, it, expect } from "vitest";
import {
  DOWNLIGHT_CATALOG,
  calculateDownlight,
  type DownlightConfig,
} from "./downlightCatalog";

describe("DOWNLIGHT_CATALOG", () => {
  it("deve ter 7 produtos", () => {
    expect(DOWNLIGHT_CATALOG).toHaveLength(7);
  });

  it("todos os produtos devem ter nome, ledModule e driver220", () => {
    for (const p of DOWNLIGHT_CATALOG) {
      expect(p.name).toBeTruthy();
      expect(p.ledModule).toBeTruthy();
      expect(p.driver220.model).toBeTruthy();
      expect(p.driver220.code).toBeTruthy();
    }
  });

  it("LUNA GG LED 36W RE não deve ter opção Bivolt", () => {
    const luna36 = DOWNLIGHT_CATALOG.find((p) => p.name === "LUNA GG LED 36W RE");
    expect(luna36).toBeDefined();
    expect(luna36!.driverBivolt).toBeNull();
  });

  it("todos os outros produtos devem ter opção Bivolt", () => {
    const others = DOWNLIGHT_CATALOG.filter((p) => p.name !== "LUNA GG LED 36W RE");
    for (const p of others) {
      expect(p.driverBivolt).not.toBeNull();
    }
  });
});

describe("calculateDownlight", () => {
  it("deve retornar driver220 quando tensão é 220V", () => {
    const cfg: DownlightConfig = {
      productIndex: 0,
      voltage: "220V",
      cct: "3000K",
      quantity: 1,
    };
    const result = calculateDownlight(cfg);
    expect(result.driver).toEqual(DOWNLIGHT_CATALOG[0].driver220);
    expect(result.bivoltUnavailable).toBe(false);
  });

  it("deve retornar driverBivolt quando tensão é Bivolt e produto tem Bivolt", () => {
    const cfg: DownlightConfig = {
      productIndex: 3, // LUNA G LED 17W RE — tem Bivolt
      voltage: "Bivolt",
      cct: "4000K",
      quantity: 2,
    };
    const result = calculateDownlight(cfg);
    expect(result.driver).toEqual(DOWNLIGHT_CATALOG[3].driverBivolt);
    expect(result.bivoltUnavailable).toBe(false);
  });

  it("deve usar driver220 e marcar bivoltUnavailable quando produto não tem Bivolt", () => {
    const lunaGGIdx = DOWNLIGHT_CATALOG.findIndex((p) => p.name === "LUNA GG LED 36W RE");
    const cfg: DownlightConfig = {
      productIndex: lunaGGIdx,
      voltage: "Bivolt",
      cct: "3000K",
      quantity: 1,
    };
    const result = calculateDownlight(cfg);
    expect(result.driver).toEqual(DOWNLIGHT_CATALOG[lunaGGIdx].driver220);
    expect(result.bivoltUnavailable).toBe(true);
  });

  it("deve incluir CCT no campo ledModuleWithCCT", () => {
    const cfg: DownlightConfig = {
      productIndex: 1,
      voltage: "220V",
      cct: "5000K",
      quantity: 3,
    };
    const result = calculateDownlight(cfg);
    expect(result.ledModuleWithCCT).toContain("5000K");
    expect(result.ledModuleWithCCT).toContain(DOWNLIGHT_CATALOG[1].ledModule);
  });

  it("deve preservar quantidade no resultado", () => {
    const cfg: DownlightConfig = {
      productIndex: 2,
      voltage: "220V",
      cct: "2700K",
      quantity: 10,
    };
    const result = calculateDownlight(cfg);
    expect(result.quantity).toBe(10);
  });

  it("deve retornar o produto correto no resultado", () => {
    const cfg: DownlightConfig = {
      productIndex: 4,
      voltage: "220V",
      cct: "3000K",
      quantity: 1,
    };
    const result = calculateDownlight(cfg);
    expect(result.product).toEqual(DOWNLIGHT_CATALOG[4]);
  });

  it("códigos EQ dos drivers devem estar no formato EQ00XXX", () => {
    for (const p of DOWNLIGHT_CATALOG) {
      expect(p.driver220.code).toMatch(/^EQ\d{5}$/);
      if (p.driverBivolt) {
        expect(p.driverBivolt.code).toMatch(/^EQ\d{5}$/);
      }
    }
  });
});
