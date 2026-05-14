import { describe, it, expect } from "vitest";
import {
  PAINEL_CATALOG,
  calculatePainel,
} from "./painelCatalog";

// ─── Catálogo ──────────────────────────────────────────────────────────────

describe("PAINEL_CATALOG", () => {
  it("deve ter 50 produtos", () => {
    expect(PAINEL_CATALOG).toHaveLength(50);
  });

  it("todos os produtos devem ter name, instalacao e familia", () => {
    for (const p of PAINEL_CATALOG) {
      expect(p.name).toBeTruthy();
      expect(p.instalacao).toBeTruthy();
      expect(p.familia).toBeTruthy();
    }
  });

  it("todos os produtos devem ter driver220 com model e code", () => {
    for (const p of PAINEL_CATALOG) {
      expect(p.driver220).toBeTruthy();
      expect(p.driver220.model).toBeTruthy();
      expect(typeof p.driver220.code).toBe("string");
    }
  });

  it("módulo LED não deve conter '[CCT]' quando presente", () => {
    for (const p of PAINEL_CATALOG) {
      if (p.ledModule) {
        expect(p.ledModule).not.toContain("[CCT]");
      }
    }
  });

  it("deve conter produtos do tipo EMBUTIR", () => {
    const embutir = PAINEL_CATALOG.filter((p) => p.instalacao === "EMBUTIR");
    expect(embutir.length).toBeGreaterThan(0);
  });

  it("deve conter produtos do tipo SOBREPOR", () => {
    const sobrepor = PAINEL_CATALOG.filter((p) => p.instalacao === "SOBREPOR");
    expect(sobrepor.length).toBeGreaterThan(0);
  });

  it("deve conter família ALE-2462", () => {
    const fam = PAINEL_CATALOG.filter((p) => p.familia === "ALE-2462");
    expect(fam.length).toBeGreaterThan(0);
  });
});

// ─── calculatePainel ───────────────────────────────────────────────────────

describe("calculatePainel", () => {
  const firstIdx = 0;
  const bivoltIdx = PAINEL_CATALOG.findIndex((p) => p.driverBivolt !== null);
  const noBivoltIdx = PAINEL_CATALOG.findIndex((p) => p.driverBivolt === null);

  it("deve retornar resultado para produto válido", () => {
    const result = calculatePainel({
      productIndex: firstIdx,
      tensao: "220V",
      cct: "3000K",
      controle: "ON/OFF",
    });
    expect(result).not.toBeNull();
    expect(result!.product).toEqual(PAINEL_CATALOG[firstIdx]);
  });

  it("deve usar driver220 quando tensão é 220V", () => {
    const result = calculatePainel({
      productIndex: firstIdx,
      tensao: "220V",
      cct: "3000K",
      controle: "ON/OFF",
    });
    expect(result).not.toBeNull();
    expect(result!.driver).toEqual(PAINEL_CATALOG[firstIdx].driver220);
  });

  it("deve usar driverBivolt quando tensão é Bivolt e produto tem Bivolt", () => {
    if (bivoltIdx < 0) return;
    const result = calculatePainel({
      productIndex: bivoltIdx,
      tensao: "Bivolt",
      cct: "3000K",
      controle: "ON/OFF",
    });
    expect(result).not.toBeNull();
    expect(result!.driver).toEqual(PAINEL_CATALOG[bivoltIdx].driverBivolt);
  });

  it("deve usar driver220 quando produto não tem Bivolt", () => {
    if (noBivoltIdx < 0) return;
    const result = calculatePainel({
      productIndex: noBivoltIdx,
      tensao: "Bivolt",
      cct: "3000K",
      controle: "ON/OFF",
    });
    expect(result).not.toBeNull();
    expect(result!.driver).toEqual(PAINEL_CATALOG[noBivoltIdx].driver220);
  });

  it("deve preservar cct, tensao e controle no resultado", () => {
    const result = calculatePainel({
      productIndex: firstIdx,
      tensao: "220V",
      cct: "4000K",
      controle: "ON/OFF",
    });
    expect(result).not.toBeNull();
    expect(result!.cct).toBe("4000K");
    expect(result!.tensao).toBe("220V");
    expect(result!.controle).toBe("ON/OFF");
  });

  it("deve concatenar CCT ao ledModule quando presente", () => {
    const withModule = PAINEL_CATALOG.findIndex((p) => p.ledModule !== null);
    if (withModule < 0) return;
    const result = calculatePainel({
      productIndex: withModule,
      tensao: "220V",
      cct: "3000K",
      controle: "ON/OFF",
    });
    expect(result).not.toBeNull();
    expect(result!.ledModuleWithCCT).toContain("3000K");
  });

  it("deve retornar null para índice inválido", () => {
    const result = calculatePainel({
      productIndex: 9999,
      tensao: "220V",
      cct: "3000K",
      controle: "ON/OFF",
    });
    expect(result).toBeNull();
  });
});
