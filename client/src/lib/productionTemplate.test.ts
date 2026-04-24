import { describe, it, expect } from "vitest";
import { generateProductionTemplate } from "./productionTemplate";
import { calculateComposition } from "./ledEngine";
import type { ConfigInput } from "./ledEngine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<ConfigInput> = {}): ConfigInput {
  return {
    profileCode: "LLP-4251", // EASY H PLUS — código válido no catálogo
    application: "D1",
    powerD1: 18,
    cct: "4000K",
    voltage: "220Vac",
    totalLength: 2250,
    allowLongModules: false,
    independentLighting: false,
    sheetDrivers: [],
    ...overrides,
  };
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("generateProductionTemplate — estrutura básica", () => {
  it("deve conter o cabeçalho PEDIDO DE PRODUÇÃO", () => {
    const result = calculateComposition(makeInput());
    const template = generateProductionTemplate(result);
    expect(template).toContain("PEDIDO DE PRODUÇÃO");
    expect(template).toContain("DADOS DA LUMINÁRIA");
    expect(template).toContain("COMPOSIÇÃO TÉCNICA");
  });

  it("deve conter o nome do perfil e tipo de instalação", () => {
    const result = calculateComposition(makeInput());
    const template = generateProductionTemplate(result);
    expect(template).toContain("Modelo:");
    expect(template).toContain("Instalação:");
    expect(template).toContain("CCT: 4000K");
  });

  it("deve conter o comprimento solicitado e realizado", () => {
    const result = calculateComposition(makeInput({ totalLength: 2250 }));
    const template = generateProductionTemplate(result);
    expect(template).toContain("Comprimento Solicitado: 2250mm");
    expect(template).toContain("Comprimento Realizado:");
  });

  it("deve conter o código EQ do driver", () => {
    // 2250mm → 4 barras 18W 220V → EQ00347 (Philips 44W)
    const result = calculateComposition(makeInput({ totalLength: 2250 }));
    const template = generateProductionTemplate(result);
    // O template deve conter o código EQ do driver selecionado
    expect(template).toMatch(/EQ0034[67]/i);
  });

  it("deve conter NOTAS DE MONTAGEM", () => {
    const result = calculateComposition(makeInput());
    const template = generateProductionTemplate(result);
    expect(template).toContain("NOTAS DE MONTAGEM");
  });
});

describe("generateProductionTemplate — 26W CERTADRIVE quantidade", () => {
  it("2 barras 26W → deve mostrar CERTADRIVE", () => {
    // 2250mm = 4 barras 26W → 3.3-4.0 → CERTADRIVE ×3
    const result = calculateComposition(
      makeInput({ powerD1: 26, totalLength: 2250 })
    );
    const template = generateProductionTemplate(result);
    // Deve conter CERTADRIVE com código EQ
    expect(template).toContain("CERTADRIVE");
    expect(template).toContain("EQ00353");
  });
});

describe("generateProductionTemplate — 36W Fileira Dupla", () => {
  it("deve mencionar Fileira Dupla nas notas de montagem", () => {
    const result = calculateComposition(
      makeInput({ powerD1: 36, stripMethod: "STRIPFLEX", totalLength: 1125 })
    );
    const template = generateProductionTemplate(result);
    expect(template).toContain("Fileira Dupla");
  });
});

describe("generateProductionTemplate — Stripline", () => {
  it("deve mencionar Stripline nas notas de montagem", () => {
    const result = calculateComposition(
      makeInput({ powerD1: 36, stripMethod: "STRIPLINE", totalLength: 562 })
    );
    const template = generateProductionTemplate(result);
    expect(template).toContain("Stripline");
  });
});
