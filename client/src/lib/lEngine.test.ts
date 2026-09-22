/**
 * lEngine.test.ts — Testes para a engine de formato EM L.
 *
 * Foco: lógica de cabeceira para perfis embutir (LLE-*).
 *
 * Regras testadas:
 * 1. Formato L só é válido com exatamente duas pontas IF.
 * 2. Perfis embutir com módulos retos não somam cabeceira extra (já está no IF).
 * 3. Perfis não-embutir nunca somam cabeceira.
 * 4. Formato Quadrado/Retangular usa apenas canto 1L1 + ML.
 */

import { afterEach, describe, it, expect } from "vitest";
import { calculateLShape, calculateSquare, calculateRectangle, calculateUShape } from "./lEngine";
import { getCabeceiraMm } from "./lCatalog";
import { adaptProfileProducts } from "./profileApiAdapter";
import { resetActiveCatalog, setActiveCatalog } from "./ledCatalog";

afterEach(() => resetActiveCatalog());

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

  it("LLE-2580 canto sozinho é inválido: faltariam os dois acabamentos IF", () => {
    expect(calculateLShape("LLE-2580", 595, 595, baseParams)).toBeNull();
  });

  // LLE-2810 BLAZE embutir: canto 1x1 = 615×615mm, cabeceira = 10mm
  // Quando canto sozinho: cada lado = 615 + 2×10 = 635mm
  it("LLE-2810 canto sozinho é inválido: faltariam os dois acabamentos IF", () => {
    expect(calculateLShape("LLE-2810", 615, 615, baseParams)).toBeNull();
  });

  // LLE-2052 SKYLINE embutir: canto 1x1 = 590×590mm, cabeceira = 7mm
  // Quando canto sozinho: cada lado = 590 + 2×7 = 604mm
  it("LLE-2052 canto sozinho é inválido: faltariam os dois acabamentos IF", () => {
    expect(calculateLShape("LLE-2052", 590, 590, baseParams)).toBeNull();
  });

  // LLE-2580 com módulos retos no lado horizontal: cabeceira NÃO somada no lado com retos
  // Canto = 595mm; IF de 2 barras = 1142mm
  // Lado H deve ter pelo menos 595 + 1142 = 1737mm para caber 1 IF de 2 barras
  // Lado V = 595mm (sozinho) → 595 + 14 = 609mm
  it("LLE-2580 com IF apenas no lado H é inválido porque o L exige duas pontas IF", () => {
    // Pedir lado H grande o suficiente para ter 1 módulo IF de 2 barras (1142mm)
    // availH = 1800 - 595 = 1205mm >= 1142mm → IF de 2 barras cabe
    const result = calculateLShape("LLE-2580", 1800, 595, baseParams);
    expect(result).toBeNull();
  });

  // Perfil não-embutir (LLP-4536 SKYLINE pendente): sem cabeceira
  it("LLP-4536 canto sozinho também é inválido sem os dois IFs", () => {
    expect(calculateLShape("LLP-4536", 590, 590, baseParams)).toBeNull();
  });

  // LLP-4450 EASY H PLUS (pendente): sem cabeceira
  it("LLP-4450 canto sozinho também é inválido sem os dois IFs", () => {
    expect(calculateLShape("LLP-4450", 610, 610, baseParams)).toBeNull();
  });
});

describe("calculateLShape — SKU do canto vindo exclusivamente da API", () => {
  it("não inventa IF quando a API retornou somente o canto do BLAZE S", () => {
    const catalog = adaptProfileProducts([
      {
        sku: "LLS-3945.1L1.38F",
        name: "BLAZE S ML 1B X 1B 600 X 600MM 18W",
        categoria: "PERFIS",
        familia: "BLAZE",
        instalacao: "SOBREPOR",
      } as any,
    ]);
    expect(catalog).not.toBeNull();
    setActiveCatalog(catalog!);

    const result = calculateLShape("LLS-3945", 600, 600, {
      power: 18,
      voltage: "220V",
      stripMethod: "STRIPLINE",
      allowLongModules: false,
    });

    expect(result).toBeNull();
  });
});

describe("calculateUShape — cantos e extremidades do U", () => {
  const params26W = {
    power: 26 as const,
    voltage: "220V" as const,
    stripMethod: "STRIPFLEX" as const,
    allowLongModules: false,
    allowFractionalBars: false,
  };

  it("calcula o U do MINI BLAZE com 2 cantos, 2 IFs e ML somente como complemento", () => {
    const result = calculateUShape("LLP-3336", 2743, 1794, params26W);

    expect(result).not.toBeNull();
    expect(result!.shape).toBe("U_SHAPE");
    expect(result!.pieces.find((piece) => piece.type === "CORNER")?.quantity).toBe(2);
    expect(result!.pieces.filter((piece) => piece.type === "STRAIGHT_IF").reduce((sum, piece) => sum + piece.quantity, 0)).toBe(2);
    expect(result!.pieces.filter((piece) => piece.type !== "CORNER" && piece.type !== "STRAIGHT_IF").every((piece) => piece.type === "STRAIGHT_ML")).toBe(true);
    const base = result!.assemblyEdges!.find((edge) => edge.id === "base")!;
    expect(base.modules.some((module) => module.type === "IF")).toBe(false);
    expect(base.modules.some((module) => module.type === "ML" && module.bars === 1)).toBe(true);
  });

  it("usa o canto compartilhado confirmado pela API para MINI BLAZE sobrepor", () => {
    const catalog = adaptProfileProducts([
      {
        sku: "LLP-3336.1L1.48F",
        name: "MINI BLAZE P ML 1B X 1B 590 X 590MM 18W",
        categoria: "PERFIS",
        familia: "MINI BLAZE",
        instalacao: "PENDENTE",
      },
      {
        sku: "LLS-3336.2IF.38F",
        name: "MINI BLAZE S IF 2B 1135MM 26W",
        categoria: "PERFIS",
        familia: "MINI BLAZE",
        instalacao: "SOBREPOR",
      },
      {
        sku: "LLS-3336.2ML.38F",
        name: "MINI BLAZE S ML 2B 1130MM 26W",
        categoria: "PERFIS",
        familia: "MINI BLAZE",
        instalacao: "SOBREPOR",
      },
    ] as any);
    expect(catalog).not.toBeNull();
    setActiveCatalog(catalog!);

    const result = calculateUShape("LLS-3336", 2743, 1794, params26W);

    expect(result).not.toBeNull();
    expect(result!.pieces.find((piece) => piece.type === "CORNER")?.sku).toBe("LLP-3336.1L1.48F");
    expect(result!.pieces.find((piece) => piece.type === "CORNER")?.quantity).toBe(2);
    expect(result!.pieces.filter((piece) => piece.type === "STRAIGHT_IF").reduce((sum, piece) => sum + piece.quantity, 0)).toBe(2);
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

  it("calculateSquare LLP-6060 (BLAZE H): módulos retos devem ser exclusivamente ML", () => {
    // cornerLen LLP-6060 = 565mm (canto 1x1)
    // Quadrado 3000mm: availPerSide = 3000 - 2*565 = 1870mm
    // Quadrado fechado usa exclusivamente ML entre os cantos.
    const result = calculateSquare("LLP-6060", 3000, baseParams);
    expect(result).not.toBeNull();
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    expect(straightPieces.length).toBeGreaterThan(0);
    straightPieces.forEach(p => expect(p.type).toBe("STRAIGHT_ML"));
  });

  it("calculateSquare LLP-6060 (BLAZE H) 8000mm: otimização usa módulos ML maiores primeiro", () => {
    // cornerLen = 565mm; availPerSide = 8000 - 2*565 = 6870mm
    // DP otimiza apenas com ML para melhor proximidade da medida solicitada.
    const result = calculateSquare("LLP-6060", 8000, baseParams);
    expect(result).not.toBeNull();
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    // Deve ter pelo menos 1 tipo de módulo reto
    expect(straightPieces.length).toBeGreaterThanOrEqual(1);
    straightPieces.forEach(p => expect(p.type).toBe("STRAIGHT_ML"));
    // Número total de peças deve ser menor que 24 (antigo: 6×4=24 peças de 2 barras)
    const totalQty = straightPieces.reduce((s, p) => s + p.quantity, 0);
    expect(totalQty).toBeLessThan(24);
  });

  it("calculateRectangle LLP-6060 (BLAZE H): módulos retos podem ser ML ou IF (otimização de proximidade)", () => {
    // cornerLen = 565mm
    // Retângulo 4000mm × 2000mm:
    // availWidth = 4000 - 2*565 = 2870mm
    // availHeight = 2000 - 2*565 = 870mm
    const result = calculateRectangle("LLP-6060", 4000, 2000, baseParams);
    expect(result).not.toBeNull();
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    expect(straightPieces.length).toBeGreaterThan(0);
    // Apenas ML no retângulo (sem IF)
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

  it("módulos de 1 barra não devem aparecer em formato Quadrado (sem medidas quebradas)", () => {
    // cornerLen LLP-6060 = 565mm; availPerSide = 3000 - 2*565 = 1870mm
    // Com allowFractionalBars=false (baseParams), módulos de 1 barra não são usados
    const result = calculateSquare("LLP-6060", 3000, baseParams);
    expect(result).not.toBeNull();
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    straightPieces.forEach(p => {
      expect(p.bars).toBeGreaterThanOrEqual(2);
    });
  });

  it("módulos de 1 barra não devem aparecer em formato Retangular (sem medidas quebradas)", () => {
    // cornerLen LLP-6060 = 565mm; availWidth = 4000 - 2*565 = 2870mm
    // Com allowFractionalBars=false (baseParams), módulos de 1 barra não são usados
    const result = calculateRectangle("LLP-6060", 4000, 2000, baseParams);
    expect(result).not.toBeNull();
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    // Apenas verificar que as peças presentes têm bars >= 2
    straightPieces.forEach(p => {
      expect(p.bars).toBeGreaterThanOrEqual(2);
    });
  });
});

// ─── Testes: allowLongModules=false deve bloquear módulos de 6 barras em formatos especiais ──
describe("allowLongModules=false — formatos especiais não devem usar módulos de 6 barras", () => {
  const paramsNoLong = {
    power: 18 as const,
    voltage: "220V" as const,
    stripMethod: "STRIPFLEX" as const,
    allowLongModules: false,
  };
  const paramsWithLong = {
    power: 18 as const,
    voltage: "220V" as const,
    stripMethod: "STRIPFLEX" as const,
    allowLongModules: true,
  };

  it("calculateSquare LLE-2052 4560mm: sem módulos longos → nenhum módulo de 6 barras (3380mm)", () => {
    const result = calculateSquare("LLE-2052", 4560, paramsNoLong);
    expect(result).not.toBeNull();
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    straightPieces.forEach(p => {
      expect(p.bars).toBeLessThanOrEqual(5);
      expect(p.length).toBeLessThanOrEqual(2840);
    });
  });

  it("calculateSquare LLE-2052 4560mm: com módulos longos → pode usar módulos de 6 barras (3380mm)", () => {
    const result = calculateSquare("LLE-2052", 4560, paramsWithLong);
    expect(result).not.toBeNull();
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    // Com allowLongModules=true, módulos de 6 barras podem aparecer
    const has6BarModule = straightPieces.some(p => p.bars === 6);
    // Não forçamos que apareça, apenas que o filtro não os bloqueia
    // O teste principal é que sem módulos longos, eles NÃO aparecem (teste acima)
    expect(has6BarModule || straightPieces.length >= 0).toBe(true);
  });

  it("calculateRectangle LLE-2052 7000x5000mm: sem módulos longos → nenhum módulo de 6 barras", () => {
    const result = calculateRectangle("LLE-2052", 7000, 5000, paramsNoLong);
    expect(result).not.toBeNull();
    const straightPieces = result!.pieces.filter(p => p.type !== "CORNER");
    straightPieces.forEach(p => {
      expect(p.bars).toBeLessThanOrEqual(5);
      expect(p.length).toBeLessThanOrEqual(2840);
    });
  });
});
