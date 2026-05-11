/**
 * quoteSummary.test.ts
 * Testes para a lógica de preço por metro no Resumo Para Orçamento.
 */

import { describe, it, expect } from "vitest";
import {
  getPricePerMeter,
  formatBRL,
  generateQuoteSummary,
  PRICE_PER_METER,
} from "./quoteSummary";
import type { CompositionResult } from "./ledEngine";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Cria um CompositionResult mínimo para testes */
function makeResult(overrides: Partial<CompositionResult>): CompositionResult {
  return {
    profileCode: "LLP-4251",
    profileName: "HIT",
    installType: "PENDENTE",
    application: "D1",
    powerD1: 18,
    powerD2: null,
    cct: "3000K",
    voltage: "220V",
    requestedLength: 3000,
    realizedLength: 2940,
    diffuserD1: null,
    diffuserD2: null,
    stripMethod: "STRIPFLEX",
    allowLongModules: false,
    allowFractional: false,
    composition: [
      {
        sku: "LLP-4251.2IF.18F",
        length: 1470,
        quantity: 2,
        barras: 2,
        barsPerModule: 2,
        barsTotal: 4,
        drivers: [],
        driverPerSku: null,
      },
    ],
    engineeringNotes: [],
    ...overrides,
  } as CompositionResult;
}

// ─── getPricePerMeter ────────────────────────────────────────────────────────

describe("getPricePerMeter", () => {
  it("retorna 340 para LLE-2810 (BLAZE E)", () => {
    expect(getPricePerMeter("LLE-2810")).toBe(340);
  });

  it("retorna null para profileCode sem preço cadastrado", () => {
    expect(getPricePerMeter("LLP-4251")).toBeNull();
    expect(getPricePerMeter("LLP-6060")).toBeNull();
    expect(getPricePerMeter("INEXISTENTE")).toBeNull();
  });

  it("PRICE_PER_METER contém LLE-2810", () => {
    expect(PRICE_PER_METER["LLE-2810"]).toBe(340);
  });
});

// ─── formatBRL ───────────────────────────────────────────────────────────────

describe("formatBRL", () => {
  it("formata 3400 como R$ 3.400,00", () => {
    expect(formatBRL(3400)).toBe("R$\u00a03.400,00");
  });

  it("formata 340 como R$ 340,00", () => {
    expect(formatBRL(340)).toBe("R$\u00a0340,00");
  });

  it("formata 1700 como R$ 1.700,00", () => {
    expect(formatBRL(1700)).toBe("R$\u00a01.700,00");
  });

  it("formata valor com centavos", () => {
    expect(formatBRL(510)).toBe("R$\u00a0510,00");
  });
});
