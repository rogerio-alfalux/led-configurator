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
  // Canto = 595mm; IF de 2 barras = 1142mm
  // Lado H deve ter pelo menos 595 + 1142 = 1737mm para caber 1 IF de 2 barras
  // Lado V = 595mm (sozinho) → 595 + 14 = 609mm
  it("LLE-2580 com IF de 2 barras no lado H: H sem cabeceira, V com cabeceira", () => {
    // Pedir lado H grande o suficiente para ter 1 módulo IF de 2 barras (1142mm)
    // availH = 1800 - 595 = 1205mm >= 1142mm → IF de 2 barras cabe
    const result = calculateLShape("LLE-2580", 1800, 595, baseParams);
    expect(result).not.toBeNull();
    // Lado H: tem módulo reto (IF de 2 barras) → sem cabeceira adicional
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

// ─── Testes de calculateSquare/calculateRectangle — sem cabeceira e usando ML ──

describe("calculateSquare/calculateRectangle — sem ajuste de cabeceira e módulos ML", () => {
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
    // cornerLen = 595, availPerSide = 1200 - 2*595 = 10 → sem módulos retos
    // actualSide = 2*595 = 1190
    expect(result!.dimensions[0]).toBe(1190);
    expect(result!.dimensions[1]).toBe(1190);
  });

  it("calculateRectangle LLE-2810: sem ajuste de cabeceira", () => {
    const result = calculateRectangle("LLE-2810", 1400, 700, baseParams);
    expect(result).not.toBeNull();
    // cornerLen = 615
    // availWidth = 1400 - 2*615 = 170 → sem módulos retos
    // availHeight = 700 - 2*615 = -530 → sem módulos retos
    expect(result!.dimensions[0]).toBe(1230);
    expect(result!.dimensions[1]).toBe(1230);
  });

  // ─── Testes: quadrado/retangular usam ML (nunca IF) ───

  it("calculateSquare LLP-6060 (BLAZE H): módulos retos devem ser ML, não IF", () => {
    // cornerLen LLP-6060 = 565mm (canto 1x1)
    // Quadrado 3000mm: availPerSide = 3000 - 2*565 = 1870mm
    // Greedy: ML 3 barras (1695mm) + ML 1 barra (570mm) = 2265mm > 1870 → ML 3 barras (1695mm) + ML 1 barra (570mm) = 2265mm > 1870
    //         ML 3 barras (1695mm) ≤ 1870 → usa 1695mm; restante = 175mm; ML 1 barra = 570mm > 175 → para
    //         actualSide = 2*565 + 1695 = 2825mm
    const result = calculateSquare("LLP-6060", 3000, baseParams);
    expect(result).not.toBeNull();
    // Deve ter peças do tipo STRAIGHT_ML (não STRAIGHT_IF)
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    expect(straightPieces.length).toBeGreaterThan(0);
    straightPieces.forEach(p => {
      expect(p.type).toBe("STRAIGHT_ML");
    });
    // SKU deve ser ML (conter 'ML' no nome)
    straightPieces.forEach(p => {
      expect(p.sku).toMatch(/ML|ml/i);
    });
  });

  it("calculateSquare LLP-6060 (BLAZE H) 8000mm: greedy usa módulos maiores primeiro", () => {
    // cornerLen = 565mm; availPerSide = 8000 - 2*565 = 6870mm
    // Greedy: ML 5 barras (2820mm) → usa 2820mm; restante = 4050mm
    //         ML 5 barras (2820mm) → usa 2820mm; restante = 1230mm
    //         ML 2 barras (1130mm) → usa 1130mm; restante = 100mm
    //         ML 1 barra (570mm) > 100mm → para
    //         actualSide = 2*565 + 2820+2820+1130 = 7900mm
    const result = calculateSquare("LLP-6060", 8000, baseParams);
    expect(result).not.toBeNull();
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    // Deve ter pelo menos 2 tipos de módulo diferentes (5 barras e 2 barras)
    expect(straightPieces.length).toBeGreaterThanOrEqual(2);
    // Todos devem ser ML
    straightPieces.forEach(p => expect(p.type).toBe("STRAIGHT_ML"));
    // Número total de peças deve ser menor que 24 (antigo: 6×4=24 peças de 2 barras)
    const totalQty = straightPieces.reduce((s, p) => s + p.quantity, 0);
    expect(totalQty).toBeLessThan(24);
  });

  it("calculateRectangle LLP-6060 (BLAZE H): módulos retos devem ser ML, não IF", () => {
    // cornerLen = 565mm
    // Retângulo 4000mm × 2000mm:
    // availWidth = 4000 - 2*565 = 2870mm → greedy: ML 5 barras (2820mm) → restante 50mm → para
    // availHeight = 2000 - 2*565 = 870mm → greedy: ML 1 barra (570mm) → restante 300mm → para
    const result = calculateRectangle("LLP-6060", 4000, 2000, baseParams);
    expect(result).not.toBeNull();
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    expect(straightPieces.length).toBeGreaterThan(0);
    straightPieces.forEach(p => {
      expect(p.type).toBe("STRAIGHT_ML");
    });
  });

  it("calculateLShape LLP-6060 (BLAZE H): deve ter exatamente 1 IF por extremidade (2 IFs no total) e ML no meio", () => {
    // Formato L: exatamente 2 IF (1 por extremidade) + ML para o restante
    // cornerLen = 565mm
    // Lado H = 2000mm: availH = 2000 - 565 = 1435mm → IF + ML
    // Lado V = 2000mm: availV = 2000 - 565 = 1435mm → IF + ML
    const result = calculateLShape("LLP-6060", 2000, 2000, baseParams);
    expect(result).not.toBeNull();
    const ifPieces = result!.pieces.filter(p => p.type === "STRAIGHT_IF");
    const mlPieces = result!.pieces.filter(p => p.type === "STRAIGHT_ML");
    // Deve ter pelo menos 1 entrada de IF (pode ser agrupada)
    expect(ifPieces.length).toBeGreaterThan(0);
    // A soma das quantidades de IF deve ser exatamente 2 (1 por extremidade)
    const totalIfQty = ifPieces.reduce((s, p) => s + p.quantity, 0);
    expect(totalIfQty).toBe(2);
    // Módulos ML são opcionais (depende do comprimento disponível)
    mlPieces.forEach(p => expect(p.type).toBe("STRAIGHT_ML"));
  });

  it("módulos de 1 barra não devem aparecer em formato L (comprimento suficiente para IF de 2 barras)", () => {
    // cornerLen LLP-6060 = 600mm; availH = 2000 - 600 = 1400mm
    // IF de 2 barras = 1135mm <= 1400mm → válido
    // Nenhum IF de 1 barra (575mm) deve aparecer
    const result = calculateLShape("LLP-6060", 2000, 2000, baseParams);
    expect(result).not.toBeNull();
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    straightPieces.forEach(p => {
      expect(p.bars).toBeGreaterThanOrEqual(2);
    });
  });

  it("módulos de 1 barra não devem aparecer em formato Quadrado", () => {
    // cornerLen LLP-6060 = 600mm; availPerSide = 3000 - 2*600 = 1800mm
    // ML de 2 barras = 1130mm <= 1800mm → válido
    const result = calculateSquare("LLP-6060", 3000, baseParams);
    expect(result).not.toBeNull();
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    straightPieces.forEach(p => {
      expect(p.bars).toBeGreaterThanOrEqual(2);
    });
  });

  it("módulos de 1 barra não devem aparecer em formato Retangular (lado longo)", () => {
    // cornerLen LLP-6060 = 600mm; availWidth = 4000 - 2*600 = 2800mm
    // ML de 2 barras = 1130mm <= 2800mm → válido
    // O lado curto (2000mm) também tem availHeight = 800mm < 1130mm → sem módulos retos no lado curto
    const result = calculateRectangle("LLP-6060", 4000, 2000, baseParams);
    expect(result).not.toBeNull();
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    // Apenas verificar que as peças presentes têm bars >= 2
    straightPieces.forEach(p => {
      expect(p.bars).toBeGreaterThanOrEqual(2);
    });
  });
});
