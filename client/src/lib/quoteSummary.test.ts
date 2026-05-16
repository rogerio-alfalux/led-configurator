/**
 * quoteSummary.test.ts
 * Testes para a geração do Resumo Para Orçamento.
 */
import { describe, it, expect } from "vitest";
import { formatBRL, generateQuoteSummary } from "./quoteSummary";
import type { CompositionResult } from "./ledEngine";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<CompositionResult>): CompositionResult {
  return {
    profileCode: "LLP-4251",
    profileName: "HIT",
    installType: "PENDENTE",
    application: "D1",
    powerD1: 18,
    powerD2: null,
    cct: "3000K",
    voltage: "220Vac",
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

// ─── generateQuoteSummary (preço total) ──────────────────────────────────────

describe("generateQuoteSummary (preço total)", () => {
  it("não inclui preço total (preço ocultado temporariamente)", () => {
    const result = makeResult({
      profileCode: "LLE-2810",
      profileName: "BLAZE",
      installType: "EMBUTIR",
      application: "D1",
      powerD1: 18,
      voltage: "220Vac",
      realizedLength: 5000,
      composition: [{
        sku: "LLE-2810.5IF.18F", length: 5000, quantity: 1,
        barras: 5, barsPerModule: 5, barsTotal: 5, drivers: [], driverPerSku: null,
      }],
    });
    // Preço ocultado temporariamente — o resumo não deve conter a linha de preço
    expect(generateQuoteSummary(result)).not.toContain("Preço Total:");
  });

  it("NÃO inclui preço total para Bivolt", () => {
    const result = makeResult({
      profileCode: "LLE-2810",
      profileName: "BLAZE",
      installType: "EMBUTIR",
      application: "D1",
      powerD1: 18,
      voltage: "Bivolt",
      realizedLength: 5000,
    });
    expect(generateQuoteSummary(result)).not.toContain("Preço Total");
  });

  it("NÃO inclui preço total para perfil sem preço (LLP-6060)", () => {
    const result = makeResult({
      profileCode: "LLP-6060",
      profileName: "BLAZE H",
      installType: "PENDENTE",
      application: "D1",
      powerD1: 18,
      voltage: "220Vac",
      realizedLength: 3000,
    });
    expect(generateQuoteSummary(result)).not.toContain("Preço Total");
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
