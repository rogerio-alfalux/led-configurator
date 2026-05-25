/**
 * orderSummary.test.ts
 * Testes para a geração do Resumo Para Pedido (ficha comercial).
 */
import { describe, it, expect } from "vitest";
import { generateOrderSummary } from "./orderSummary";
import { calculateComposition } from "./ledEngine";
import type { ConfigInput } from "./ledEngine";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeInput(overrides: Partial<ConfigInput> = {}): ConfigInput {
  return {
    profileCode: "LLP-4251", // HIT — perfil válido no catálogo
    application: "D1",
    powerD1: 18,
    cct: "3000K",
    voltage: "220Vac",
    totalLength: 2250,
    allowLongModules: false,
    independentLighting: false,
    sheetDrivers: [],
    ...overrides,
  };
}

// ─── Estrutura básica ─────────────────────────────────────────────────────────
describe("generateOrderSummary — estrutura básica", () => {
  it("deve conter 'Item 1' no resumo", () => {
    const result = calculateComposition(makeInput());
    expect(generateOrderSummary(result)).toContain("Item 1");
  });

  it("deve conter o nome do perfil em maiúsculas", () => {
    const result = calculateComposition(makeInput());
    expect(generateOrderSummary(result)).toContain("HIT");
  });

  it("deve conter 'MONTADO COM' no resumo", () => {
    const result = calculateComposition(makeInput());
    expect(generateOrderSummary(result)).toContain("MONTADO COM");
  });

  it("deve conter o tipo de barra STRIPFLEX para 18W", () => {
    const result = calculateComposition(makeInput({ powerD1: 18, stripMethod: "STRIPFLEX" }));
    expect(generateOrderSummary(result)).toContain("STRIPFLEX");
  });
});

// ─── Observação 36W Stripline ─────────────────────────────────────────────────
describe("generateOrderSummary — observação 36W Stripline", () => {
  it("deve incluir 'OBS: programar driver em 250mA' para 36W Stripline", () => {
    const result = calculateComposition(
      makeInput({ powerD1: 36, stripMethod: "STRIPLINE", totalLength: 562 })
    );
    const summary = generateOrderSummary(result);
    expect(summary).toContain("OBS: programar driver em 250mA");
  });

  it("NÃO deve incluir observação 250mA para 36W Stripflex", () => {
    const result = calculateComposition(
      makeInput({ powerD1: 36, stripMethod: "STRIPFLEX", totalLength: 1125 })
    );
    const summary = generateOrderSummary(result);
    expect(summary).not.toContain("programar driver em 250mA");
  });

  it("NÃO deve incluir observação 250mA para 18W Stripline", () => {
    const result = calculateComposition(
      makeInput({ powerD1: 18, stripMethod: "STRIPLINE", totalLength: 562 })
    );
    const summary = generateOrderSummary(result);
    expect(summary).not.toContain("programar driver em 250mA");
  });

  it("NÃO deve incluir observação 250mA para 18W Stripflex", () => {
    const result = calculateComposition(makeInput({ powerD1: 18 }));
    const summary = generateOrderSummary(result);
    expect(summary).not.toContain("programar driver em 250mA");
  });
});

// ─── Observação ORBIT (painéis) — verificada via campo familia em PainelProduct ──
// A lógica ORBIT está em Home.tsx (UI), não em orderSummary.ts.
// Os testes abaixo verificam que o orderSummary NÃO inclui a observação 200mA
// (pois ela é responsabilidade do bloco de painéis na UI).
describe("generateOrderSummary — sem observação 200mA para perfis lineares", () => {
  it("NÃO deve incluir observação 200mA para perfis lineares", () => {
    const result = calculateComposition(makeInput());
    const summary = generateOrderSummary(result);
    expect(summary).not.toContain("programar driver em 200mA");
  });

  it("NÃO deve incluir observação 200mA para 36W Stripline", () => {
    const result = calculateComposition(
      makeInput({ powerD1: 36, stripMethod: "STRIPLINE", totalLength: 562 })
    );
    const summary = generateOrderSummary(result);
    expect(summary).not.toContain("programar driver em 200mA");
  });
});
