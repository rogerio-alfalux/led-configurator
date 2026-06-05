/**
 * lEngine.ts — Motor de cálculo para formas EM L (L, Quadrado, Retangular).
 *
 * Lógica de montagem:
 *
 * FORMATO L (2 lados):
 *   - 1 canto 1x1 no vértice
 *   - Lado horizontal: canto (lengthLong) + módulos retos adicionais
 *   - Lado vertical: canto (lengthShort) + módulos retos adicionais
 *
 * FORMATO QUADRADO (4 lados iguais):
 *   - 4 cantos 1x1 nos vértices
 *   - Cada lado: canto + módulos retos + canto (oposto)
 *   - Lado = 2 × cornerLength + módulos retos
 *
 * FORMATO RETANGULAR (4 lados, 2 pares diferentes):
 *   - 4 cantos 1x1 nos vértices
 *   - Lado curto (altura): canto + canto (sem retos)
 *   - Lado longo (largura): canto + módulos retos + canto
 *
 * Módulos retos entre cantos: usamos módulos IF do catálogo reto.
 * O comprimento disponível para retos = lado total - 2 × cornerLength.
 *
 * Otimização: para cada módulo IF disponível, testamos múltiplas quantidades
 * (1×, 2×, 3×...) e escolhemos a combinação que minimiza o desvio em relação
 * ao comprimento disponível (sem ultrapassar).
 *
 * Drivers:
 *   - Cada peça (canto ou módulo reto) recebe 1 driver calculado pelas suas barras.
 *   - Canto 1x1: totalBars = barsLong + barsShort = 1 + 1 = 2
 *   - Canto 1xN: totalBars = barsLong + barsShort = N + 1
 *   - Módulo reto IF: totalBars = bars do módulo
 */

import { getLConfig, getCorner1x1, getCabeceiraMm, type LCornerModule, type ShapeResult, type ShapePiece, type ShapePieceDriver } from "./lCatalog";
import { LED_CATALOG, type ProfileVariant } from "./ledCatalog";
import { selectDriverFallback } from "./driverSelector";
import type { Power, Voltage, StripMethod } from "./ledEngine";

/** Comprimento máximo de módulo IF sem módulos longos habilitados */
const MAX_IF_LENGTH_STANDARD = 2840;

/** Número máximo de módulos por lado (evita combinações absurdas) */
const MAX_MODULES_PER_SIDE = 8;

/** Parâmetros de driver para cálculo */
export interface ShapeDriverParams {
  power: Power;
  voltage: Voltage;
  stripMethod: StripMethod;
  allowLongModules: boolean;
  /** Quando false (padrão), apenas módulos com número inteiro de barras são considerados */
  allowFractionalBars?: boolean;
  cct?: string;
  profileName?: string;
}

/** Uma peça dentro de um segmento reto (pode haver múltiplas peças diferentes) */
type SegmentPiece = {
  sku: string;
  length: number;
  bars: number;
  qty: number;
};

/** Resultado do cálculo de um segmento reto entre dois cantos */
type StraightSegment = {
  /** Comprimento total disponível para módulos retos */
  availableLength: number;
  /** Lista de peças (pode ser vazia se não há espaço) */
  pieces: SegmentPiece[];
  /** Comprimento real do segmento (0 se sem módulos) */
  actualLength: number;
  // Compat: primeiro módulo (para código legado)
  module: { sku: string; length: number; bars: number } | null;
  moduleQty: number;
};

/**
 * Calcula o driver para uma peça com base no total de barras.
 */
function calcPieceDriver(
  totalBars: number,
  params: ShapeDriverParams
): ShapePieceDriver {
  const d = selectDriverFallback(
    totalBars,
    params.power,
    params.voltage,
    params.stripMethod,
    params.allowLongModules
  );

  return {
    code: d.code,
    model: d.model,
    quantity: d.quantity,
    combo: d.combo,
  };
}

/**
 * Algoritmo greedy de combinação de módulos:
 * Ordena os módulos do maior para o menor e vai preenchendo o espaço disponível
 * com o maior módulo que couber, repetindo até não caber mais nenhum.
 * Objetivo: minimizar o número de peças (usar módulos maiores primeiro).
 */
function findBestModuleByType(
  profileEntry: ProfileVariant,
  moduleType: "IF" | "ML",
  availableLength: number,
  allowLongModules: boolean,
  allowFractionalBars: boolean = false
): StraightSegment {
  const empty: StraightSegment = {
    availableLength,
    pieces: [],
    module: null,
    moduleQty: 0,
    actualLength: 0,
  };

  if (availableLength <= 0) return empty;

  const rawModules = profileEntry.modules?.[moduleType];
  if (!rawModules) return empty;

  // Construir lista de módulos elegantes ordenados do maior para o menor
  type ModEntry = { sku: string; length: number; bars: number };
  const eligible: ModEntry[] = [];

  for (const [barsKey, mod] of Object.entries(rawModules)) {
    const m = mod as { length: number; sku: string };
    const bars = parseFloat(barsKey);
    if (!allowLongModules && m.length > MAX_IF_LENGTH_STANDARD) continue;
    if (!allowFractionalBars && !Number.isInteger(bars)) continue;
    eligible.push({ sku: m.sku, length: m.length, bars });
  }

  if (eligible.length === 0) return empty;

  // Ordenar do maior para o menor comprimento
  eligible.sort((a, b) => b.length - a.length);

  // Greedy: preencher o espaço restante com o maior módulo que couber
  const segPieces: SegmentPiece[] = [];
  let remaining = availableLength;
  let totalPieces = 0;

  while (remaining > 0 && totalPieces < MAX_MODULES_PER_SIDE) {
    // Encontrar o maior módulo que cabe no espaço restante
    const best = eligible.find(m => m.length <= remaining);
    if (!best) break; // Nenhum módulo cabe mais

    // Adicionar à lista de peças (agrupar se já existe)
    const existing = segPieces.find(p => p.sku === best.sku);
    if (existing) {
      existing.qty++;
    } else {
      segPieces.push({ sku: best.sku, length: best.length, bars: best.bars, qty: 1 });
    }

    remaining -= best.length;
    totalPieces++;
  }

  if (segPieces.length === 0) return empty;

  const actualLength = availableLength - remaining;

  // Compat: expor o primeiro módulo (maior) e total de peças do primeiro tipo
  const firstPiece = segPieces[0];

  return {
    availableLength,
    pieces: segPieces,
    module: { sku: firstPiece.sku, length: firstPiece.length, bars: firstPiece.bars },
    moduleQty: firstPiece.qty,
    actualLength,
  };
}

/**
 * Encontra a melhor combinação de módulos IF para preencher um comprimento disponível.
 *
 * Algoritmo:
 * 1. Para cada módulo IF disponível, testa quantidades de 1 a MAX_MODULES_PER_SIDE.
 * 2. Escolhe a combinação (módulo × qty) que resulta no comprimento mais próximo
 *    do disponível, sem ultrapassar.
 * 3. Respeita os limites de allowLongModules e allowFractionalBars.
 */
function findBestIFModule(
  profileEntry: ProfileVariant,
  availableLength: number,
  allowLongModules: boolean,
  allowFractionalBars: boolean = false
): StraightSegment {
  return findBestModuleByType(profileEntry, "IF", availableLength, allowLongModules, allowFractionalBars);
}

/**
 * Encontra a melhor combinação de módulos ML para preencher um comprimento disponível.
 * Usado nos formatos Quadrado e Retangular, onde os segmentos retos entre cantos
 * devem ser sempre ML (nunca IF).
 */
function findBestMLModule(
  profileEntry: ProfileVariant,
  availableLength: number,
  allowLongModules: boolean,
  allowFractionalBars: boolean = false
): StraightSegment {
  return findBestModuleByType(profileEntry, "ML", availableLength, allowLongModules, allowFractionalBars);
}

/**
 * Calcula a composição para o formato L.
 *
 * @param profileCode - Código do perfil (ex: "LLP-4536")
 * @param sideH - Comprimento desejado do lado horizontal em mm
 * @param sideV - Comprimento desejado do lado vertical em mm
 * @param driverParams - Parâmetros para cálculo de drivers (opcional)
 */
export function calculateLShape(
  profileCode: string,
  sideH: number,
  sideV: number,
  driverParams?: ShapeDriverParams
): ShapeResult | null {
  const lConfig = getLConfig(profileCode);
  if (!lConfig) return null;

  const corner = getCorner1x1(profileCode);
  if (!corner) return null;

  const profileEntry = LED_CATALOG[profileCode];
  if (!profileEntry) return null;

  const allowLongModules = driverParams?.allowLongModules ?? false;
  const allowFractionalBars = driverParams?.allowFractionalBars ?? false;
  const cornerLen = corner.lengthLong; // 1x1 é quadrado, ambos os lados iguais

  // Cabeceira para perfis embutir (LLE-*): só aplicada quando o canto é instalado
  // SOZINHO em um lado (sem módulos retos naquele lado).
  // Quando há módulos retos (IF/ML), a cabeceira já está incluída no IF.
  const cabeceiraMm = getCabeceiraMm(profileCode);

  // Comprimento disponível para módulos retos em cada lado
  const availH = sideH - cornerLen;
  const availV = sideV - cornerLen;

  const segH = findBestIFModule(profileEntry as unknown as ProfileVariant, availH, allowLongModules, allowFractionalBars);
  const segV = findBestIFModule(profileEntry as unknown as ProfileVariant, availV, allowLongModules, allowFractionalBars);

  // Ajuste de cabeceira: quando um lado não tem módulos retos (canto sozinho),
  // soma 2× cabeceira ao comprimento realizado naquele lado.
  // Isso reflete que o canto EM L, quando isolado, precisa das duas cabeceiras
  // (uma em cada extremidade), assim como um módulo IN.
  const cabH = (cabeceiraMm > 0 && segH.actualLength === 0) ? 2 * cabeceiraMm : 0;
  const cabV = (cabeceiraMm > 0 && segV.actualLength === 0) ? 2 * cabeceiraMm : 0;

  const actualH = cornerLen + segH.actualLength + cabH;
  const actualV = cornerLen + segV.actualLength + cabV;

  const pieces: ShapePiece[] = [];

  // Calcular driver do canto (barsLong + barsShort)
  const cornerBars = corner.barsLong + corner.barsShort;
  const cornerDriver = driverParams ? calcPieceDriver(cornerBars, driverParams) : undefined;

  // 1 canto
  pieces.push({
    sku: corner.sku,
    quantity: 1,
    description: `Canto EM L 1×1 (${cornerLen}×${cornerLen}mm)`,
    type: "CORNER",
    bars: cornerBars,
    driver: cornerDriver,
  });

  // Módulos retos horizontais (algoritmo greedy, múltiplos tipos possíveis)
  for (const sp of segH.pieces) {
    const hDriver = driverParams ? calcPieceDriver(sp.bars, driverParams) : undefined;
    const hDesc = sp.qty > 1
      ? `${sp.qty}× IF ${sp.bars} barras (${sp.length}mm) — horizontal`
      : `IF ${sp.bars} barras (${sp.length}mm) — horizontal`;
    // Agrupar com peça vertical de mesmo SKU, se existir
    const existing = pieces.find(p => p.sku === sp.sku && p.type === "STRAIGHT_IF");
    if (existing) {
      existing.quantity += sp.qty;
      existing.description = `IF ${sp.bars} barras (${sp.length}mm) — horizontal e vertical`;
    } else {
      pieces.push({
        sku: sp.sku,
        quantity: sp.qty,
        description: hDesc,
        length: sp.length,
        type: "STRAIGHT_IF",
        bars: sp.bars,
        driver: hDriver,
      });
    }
  }

  // Módulos retos verticais (algoritmo greedy, múltiplos tipos possíveis)
  for (const sp of segV.pieces) {
    const vDriver = driverParams ? calcPieceDriver(sp.bars, driverParams) : undefined;
    const vDesc = sp.qty > 1
      ? `${sp.qty}× IF ${sp.bars} barras (${sp.length}mm) — vertical`
      : `IF ${sp.bars} barras (${sp.length}mm) — vertical`;
    const existing = pieces.find(p => p.sku === sp.sku && p.type === "STRAIGHT_IF");
    if (existing) {
      existing.quantity += sp.qty;
      existing.description = `IF ${sp.bars} barras (${sp.length}mm) — horizontal e vertical`;
    } else {
      pieces.push({
        sku: sp.sku,
        quantity: sp.qty,
        description: vDesc,
        length: sp.length,
        type: "STRAIGHT_IF",
        bars: sp.bars,
        driver: vDriver,
      });
    }
  }

  const summaryLines: string[] = [
    `Formato L: ${actualH}mm × ${actualV}mm`,
    `1× canto ${corner.sku} (${cornerLen}mm)`,
  ];
  for (const sp of segH.pieces) summaryLines.push(`${sp.qty}× IF ${sp.sku} (${sp.length}mm) — horizontal`);
  if (cabH > 0) summaryLines.push(`+ ${cabH}mm cabeceira (lado horizontal, canto isolado)`);
  for (const sp of segV.pieces) summaryLines.push(`${sp.qty}× IF ${sp.sku} (${sp.length}mm) — vertical`);
  if (cabV > 0) summaryLines.push(`+ ${cabV}mm cabeceira (lado vertical, canto isolado)`);
  const summary = summaryLines.join("\n") + "\n";

  // Comprimento total = soma dos dois lados realizados (já incluem canto + retos + cabeceira)
  const totalLengthMm = actualH + actualV;

  return {
    shape: "L_SHAPE",
    dimensions: [actualH, actualV],
    pieces,
    summary,
    power: driverParams?.power,
    voltage: driverParams?.voltage,
    stripMethod: driverParams?.stripMethod,
    cct: driverParams?.cct,
    profileName: driverParams?.profileName,
    profileCode,
    totalLengthMm,
  };
}

/**
 * Calcula a composição para o formato Quadrado.
 *
 * @param profileCode - Código do perfil
 * @param side - Comprimento desejado de cada lado em mm
 * @param driverParams - Parâmetros para cálculo de drivers (opcional)
 */
export function calculateSquare(
  profileCode: string,
  side: number,
  driverParams?: ShapeDriverParams
): ShapeResult | null {
  const lConfig = getLConfig(profileCode);
  if (!lConfig) return null;

  const corner = getCorner1x1(profileCode);
  if (!corner) return null;

  const profileEntry = LED_CATALOG[profileCode];
  if (!profileEntry) return null;

  const allowLongModules = driverParams?.allowLongModules ?? false;
  const allowFractionalBars = driverParams?.allowFractionalBars ?? false;
  const cornerLen = corner.lengthLong;

  // Comprimento disponível para módulos retos entre os dois cantos opostos
  // Cada lado = canto + reto(s) + canto → disponível = side - 2 × cornerLen
  const availPerSide = side - 2 * cornerLen;

  const seg = findBestMLModule(profileEntry as unknown as ProfileVariant, availPerSide, allowLongModules, allowFractionalBars);

  const actualSide = 2 * cornerLen + seg.actualLength;

  const pieces: ShapePiece[] = [];

  // Calcular driver do canto
  const cornerBars = corner.barsLong + corner.barsShort;
  const cornerDriver = driverParams ? calcPieceDriver(cornerBars, driverParams) : undefined;

  // 4 cantos
  pieces.push({
    sku: corner.sku,
    quantity: 4,
    description: `Canto EM L 1×1 (${cornerLen}×${cornerLen}mm)`,
    type: "CORNER",
    bars: cornerBars,
    driver: cornerDriver,
  });

  // Módulos retos ML (4 lados, algoritmo greedy — múltiplos tipos de módulo possíveis)
  // Cada peça do segmento aparece 4× (uma por lado do quadrado)
  const summaryModLines: string[] = [];
  for (const sp of seg.pieces) {
    const spDriver = driverParams ? calcPieceDriver(sp.bars, driverParams) : undefined;
    const totalQty = 4 * sp.qty;
    const desc = sp.qty > 1
      ? `${sp.qty}× Módulo reto ML ${sp.bars} barras (${sp.length}mm) por lado`
      : `Módulo reto ML ${sp.bars} barras (${sp.length}mm)`;
    pieces.push({
      sku: sp.sku,
      quantity: totalQty,
      description: desc,
      length: sp.length,
      type: "STRAIGHT_ML",
      bars: sp.bars,
      driver: spDriver,
    });
    summaryModLines.push(`${totalQty}× ML ${sp.sku} (${sp.length}mm)`);
  }

  const summary =
    `Formato Quadrado: ${actualSide}mm × ${actualSide}mm\n` +
    `4× canto ${corner.sku} (${cornerLen}mm)\n` +
    summaryModLines.join("\n") + (summaryModLines.length ? "\n" : "");

  // Comprimento total = 4 lados (4 cantos + 4 × retos)
  const totalLengthMm = 4 * cornerLen + 4 * seg.actualLength;

  return {
    shape: "SQUARE",
    dimensions: [actualSide, actualSide],
    pieces,
    summary,
    power: driverParams?.power,
    voltage: driverParams?.voltage,
    stripMethod: driverParams?.stripMethod,
    cct: driverParams?.cct,
    profileName: driverParams?.profileName,
    profileCode,
    totalLengthMm,
  };
}

/**
 * Calcula a composição para o formato Retangular.
 *
 * @param profileCode - Código do perfil
 * @param width - Comprimento desejado do lado longo (largura) em mm
 * @param height - Comprimento desejado do lado curto (altura) em mm
 * @param driverParams - Parâmetros para cálculo de drivers (opcional)
 */
export function calculateRectangle(
  profileCode: string,
  width: number,
  height: number,
  driverParams?: ShapeDriverParams
): ShapeResult | null {
  const lConfig = getLConfig(profileCode);
  if (!lConfig) return null;

  const corner = getCorner1x1(profileCode);
  if (!corner) return null;

  const profileEntry = LED_CATALOG[profileCode];
  if (!profileEntry) return null;

  const allowLongModules = driverParams?.allowLongModules ?? false;
  const allowFractionalBars = driverParams?.allowFractionalBars ?? false;
  const cornerLen = corner.lengthLong;

  // Lado curto (altura): canto + reto(s) + canto
  // Lado longo (largura): canto + reto(s) + canto
  const availWidth = width - 2 * cornerLen;
  const availHeight = height - 2 * cornerLen;

  const segWidth = findBestMLModule(profileEntry as unknown as ProfileVariant, availWidth, allowLongModules, allowFractionalBars);
  const segHeight = findBestMLModule(profileEntry as unknown as ProfileVariant, availHeight, allowLongModules, allowFractionalBars);

  const actualWidth = 2 * cornerLen + segWidth.actualLength;
  const actualHeight = 2 * cornerLen + segHeight.actualLength;

  const pieces: ShapePiece[] = [];

  // Calcular driver do canto
  const cornerBars = corner.barsLong + corner.barsShort;
  const cornerDriver = driverParams ? calcPieceDriver(cornerBars, driverParams) : undefined;

  // 4 cantos
  pieces.push({
    sku: corner.sku,
    quantity: 4,
    description: `Canto EM L 1×1 (${cornerLen}×${cornerLen}mm)`,
    type: "CORNER",
    bars: cornerBars,
    driver: cornerDriver,
  });

  // Módulos retos ML nos lados largos (2 lados, algoritmo greedy)
  const summaryWidthLines: string[] = [];
  for (const sp of segWidth.pieces) {
    const spDriver = driverParams ? calcPieceDriver(sp.bars, driverParams) : undefined;
    const totalQty = 2 * sp.qty;
    const desc = sp.qty > 1
      ? `${sp.qty}× ML ${sp.bars} barras (${sp.length}mm) por lado largo`
      : `ML ${sp.bars} barras (${sp.length}mm) — lados largos`;
    // Verificar se já existe peça com mesmo SKU (pode ser compartilhada com lados curtos)
    const existing = pieces.find(p => p.sku === sp.sku && p.type === "STRAIGHT_ML");
    if (existing) {
      existing.quantity += totalQty;
      existing.description = `ML ${sp.bars} barras (${sp.length}mm) — todos os lados`;
    } else {
      pieces.push({
        sku: sp.sku,
        quantity: totalQty,
        description: desc,
        length: sp.length,
        type: "STRAIGHT_ML",
        bars: sp.bars,
        driver: spDriver,
      });
    }
    summaryWidthLines.push(`${totalQty}× ML ${sp.sku} (${sp.length}mm) — largos`);
  }

  // Módulos retos ML nos lados curtos (2 lados, algoritmo greedy)
  const summaryHeightLines: string[] = [];
  for (const sp of segHeight.pieces) {
    const spDriver = driverParams ? calcPieceDriver(sp.bars, driverParams) : undefined;
    const totalQty = 2 * sp.qty;
    const desc = sp.qty > 1
      ? `${sp.qty}× ML ${sp.bars} barras (${sp.length}mm) por lado curto`
      : `ML ${sp.bars} barras (${sp.length}mm) — lados curtos`;
    const existing = pieces.find(p => p.sku === sp.sku && p.type === "STRAIGHT_ML");
    if (existing) {
      existing.quantity += totalQty;
      existing.description = `ML ${sp.bars} barras (${sp.length}mm) — todos os lados`;
    } else {
      pieces.push({
        sku: sp.sku,
        quantity: totalQty,
        description: desc,
        length: sp.length,
        type: "STRAIGHT_ML",
        bars: sp.bars,
        driver: spDriver,
      });
    }
    summaryHeightLines.push(`${totalQty}× ML ${sp.sku} (${sp.length}mm) — curtos`);
  }

  const summary =
    `Formato Retangular: ${actualWidth}mm × ${actualHeight}mm\n` +
    `4× canto ${corner.sku} (${cornerLen}mm)\n` +
    [...summaryWidthLines, ...summaryHeightLines].join("\n") +
    ([...summaryWidthLines, ...summaryHeightLines].length ? "\n" : "");

  // Comprimento total = 2 lados largos + 2 lados curtos
  const totalLengthMm = 2 * actualWidth + 2 * actualHeight;

  return {
    shape: "RECTANGLE",
    dimensions: [actualWidth, actualHeight],
    pieces,
    summary,
    power: driverParams?.power,
    voltage: driverParams?.voltage,
    stripMethod: driverParams?.stripMethod,
    cct: driverParams?.cct,
    profileName: driverParams?.profileName,
    profileCode,
    totalLengthMm,
  };
}

/**
 * Verifica se um perfil suporta formatos EM L.
 */
export function profileSupportsLShape(profileCode: string): boolean {
  return getLConfig(profileCode) !== null;
}
