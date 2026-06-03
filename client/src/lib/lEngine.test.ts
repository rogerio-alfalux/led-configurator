/**
 * lEngine.test.ts — Testes para a engine de formato EM L.
 *
 * Foco: lógica de cabeceira para perfis embutir (LLE-*).
 *
 * Regras testadas:
 * 1. Perfis embutir com canto SOZINHO (sem módulos retos): soma 2× cabeceira a cada lado sem retos.
 * 2. Perfis embutir com módulos retos: cabeceira NÃO é somada (já está no IF).
 * 3. Perfis não-embutir: cabeceira nunca é somada (cabeceiraMm = 0).
 * 4. Formato Quadrado/Retangular: cabeceira nunca é somada (apenas EM L).
 */

import { describe, it, expect } from "vitest";
import { calculateLShape, calculateSquare, calculateRectangle } from "./lEngine";
import { getCabeceiraMm } from "./lCatalog";

// ─── Testes de getCabeceiraMm ────────────────────────────────────────────────

describe("getCabeceiraMm", () => {
  it("LLE-2580 (EASY PRIME embutir) → 7mm", () => {
    expect(getCabeceiraMm("LLE-2580")).toBe(7);
  });

  it("LLE-2052 (SKYLINE embutir) → 7mm", () => {
    expect(getCabeceiraMm("LLE-2052")).toBe(7);
  });

  it("LLE-2810 (BLAZE embutir) → 10mm", () => {
    expect(getCabeceiraMm("LLE-2810")).toBe(10);
  });

  it("LLP-4536 (SKYLINE pendente) → 0 (sem cabeceira)", () => {
    expect(getCabeceiraMm("LLP-4536")).toBe(0);
  });

  it("LLP-4450 (EASY H PLUS pendente) → 0 (sem cabeceira)", () => {
    expect(getCabeceiraMm("LLP-4450")).toBe(0);
  });

  it("LLP-6060 (BLAZE H pendente) → 0 (sem cabeceira)", () => {
    expect(getCabeceiraMm("LLP-6060")).toBe(0);
  });
});

// ─── Testes de calculateLShape — cabeceira ───────────────────────────────────

describe("calculateLShape — cabeceira para perfis embutir", () => {
  const baseParams = {
    power: 18 as const,
    voltage: "220V" as const,
    stripMethod: "STRIPFLEX" as const,
    allowLongModules: false,
  };

  // LLE-2580 EASY PRIME: canto 1x1 = 595×595mm, cabeceira = 7mm
  // Quando canto sozinho (sem módulos retos): cada lado = 595 + 2×7 = 609mm
  it("LLE-2580 canto 1x1 sozinho: cada lado = 595 + 14 = 609mm", () => {
    // Solicitar exatamente o comprimento do canto (595mm) — sem espaço para retos
    const result = calculateLShape("LLE-2580", 595, 595, baseParams);
    expect(result).not.toBeNull();
    expect(result!.dimensions[0]).toBe(609); // 595 + 14
    expect(result!.dimensions[1]).toBe(609); // 595 + 14
    expect(result!.totalLengthMm).toBe(609 + 609); // ambos os lados com cabeceira
  });

  // LLE-2810 BLAZE embutir: canto 1x1 = 615×615mm, cabeceira = 10mm
  // Quando canto sozinho: cada lado = 615 + 2×10 = 635mm
  it("LLE-2810 canto 1x1 sozinho: cada lado = 615 + 20 = 635mm", () => {
    const result = calculateLShape("LLE-2810", 615, 615, baseParams);
    expect(result).not.toBeNull();
    expect(result!.dimensions[0]).toBe(635); // 615 + 20
    expect(result!.dimensions[1]).toBe(635); // 615 + 20
  });

  // LLE-2052 SKYLINE embutir: canto 1x1 = 590×590mm, cabeceira = 7mm
  // Quando canto sozinho: cada lado = 590 + 2×7 = 604mm
  it("LLE-2052 canto 1x1 sozinho: cada lado = 590 + 14 = 604mm", () => {
    const result = calculateLShape("LLE-2052", 590, 590, baseParams);
    expect(result).not.toBeNull();
    expect(result!.dimensions[0]).toBe(604); // 590 + 14
    expect(result!.dimensions[1]).toBe(604); // 590 + 14
  });

  // LLE-2580 com módulos retos no lado horizontal: cabeceira NÃO somada no lado com retos
  // Canto = 595mm; lado H = 595 + IF(560mm) = 1155mm → sem cabeceira (IF já inclui)
  // Lado V = 595mm (sozinho) → 595 + 14 = 609mm
  it("LLE-2580 com IF no lado H: H sem cabeceira, V com cabeceira", () => {
    // Pedir lado H grande o suficiente para ter 1 módulo IF
    const result = calculateLShape("LLE-2580", 1200, 595, baseParams);
    expect(result).not.toBeNull();
    // Lado H: tem módulo reto → sem cabeceira adicional
    // actualH = 595 (canto) + algum IF
    expect(result!.dimensions[0]).toBeGreaterThan(595); // tem módulo reto
    // Lado V: sem módulo reto → com cabeceira
    expect(result!.dimensions[1]).toBe(609); // 595 + 14
  });

  // Perfil não-embutir (LLP-4536 SKYLINE pendente): sem cabeceira
  it("LLP-4536 (pendente) canto 1x1 sozinho: sem cabeceira, lado = 590mm", () => {
    const result = calculateLShape("LLP-4536", 590, 590, baseParams);
    expect(result).not.toBeNull();
    expect(result!.dimensions[0]).toBe(590); // sem cabeceira
    expect(result!.dimensions[1]).toBe(590); // sem cabeceira
  });

  // LLP-4450 EASY H PLUS (pendente): sem cabeceira
  it("LLP-4450 (pendente) canto 1x1 sozinho: sem cabeceira, lado = 610mm", () => {
    const result = calculateLShape("LLP-4450", 610, 610, baseParams);
    expect(result).not.toBeNull();
    expect(result!.dimensions[0]).toBe(610); // sem cabeceira
    expect(result!.dimensions[1]).toBe(610); // sem cabeceira
  });
});

// ─── Testes de calculateSquare/calculateRectangle — sem cabeceira ────────────

describe("calculateSquare/calculateRectangle — sem ajuste de cabeceira", () => {
  const baseParams = {
    power: 18 as const,
    voltage: "220V" as const,
    stripMethod: "STRIPFLEX" as const,
    allowLongModules: false,
  };

  it("calculateSquare LLE-2580: sem ajuste de cabeceira", () => {
    // Quadrado: cabeceira não se aplica (apenas EM L)
    const result = calculateSquare("LLE-2580", 1200, baseParams);
    expect(result).not.toBeNull();
    // Resultado deve ser baseado apenas nos cantos e módulos retos, sem cabeceira
    // cornerLen = 595, availPerSide = 1200 - 2*595 = 10 → sem módulos retos
    // actualSide = 2*595 = 1190
    expect(result!.dimensions[0]).toBe(1190);
    expect(result!.dimensions[1]).toBe(1190);
  });

  it("calculateRectangle LLE-2810: sem ajuste de cabeceira", () => {
    const result = calculateRectangle("LLE-2810", 1400, 700, baseParams);
    expect(result).not.toBeNull();
    // Sem cabeceira no retangular
    // cornerLen = 615
    // availWidth = 1400 - 2*615 = 170 → sem módulos retos (menor IF > 170)
    // availHeight = 700 - 2*615 = -530 → sem módulos retos
    // actualWidth = 2*615 = 1230, actualHeight = 2*615 = 1230
    expect(result!.dimensions[0]).toBe(1230);
    expect(result!.dimensions[1]).toBe(1230);
  });
});
