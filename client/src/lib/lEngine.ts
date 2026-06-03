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
 * Escolhemos o módulo IF mais próximo (por baixo) do comprimento disponível.
 *
 * Drivers:
 *   - Cada peça (canto ou módulo reto) recebe 1 driver calculado pelas suas barras.
 *   - Canto 1x1: totalBars = barsLong + barsShort = 1 + 1 = 2
 *   - Canto 1xN: totalBars = barsLong + barsShort = N + 1
 *   - Módulo reto IF: totalBars = bars do módulo
 */

import { getLConfig, getCorner1x1, type LCornerModule, type ShapeResult, type ShapePiece, type ShapePieceDriver } from "./lCatalog";
import { LED_CATALOG, type ProfileVariant } from "./ledCatalog";
import { selectDriverFallback } from "./driverSelector";
import type { Power, Voltage, StripMethod } from "./ledEngine";

/** Tolerância de ajuste em mm (diferença aceitável entre medida desejada e real) */
const TOLERANCE_MM = 50;

/** Comprimento máximo de módulo IF sem módulos longos habilitados */
const MAX_IF_LENGTH_STANDARD = 2840;

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

/** Resultado do cálculo de um lado reto entre dois cantos */
type StraightSegment = {
  /** Comprimento total disponível para módulos retos */
  availableLength: number;
  /** Módulo IF escolhido (ou null se não há espaço) */
  module: { sku: string; length: number; bars: number } | null;
  /** Comprimento real do segmento (0 se sem módulo) */
  actualLength: number;
};

/**
 * Calcula o driver para uma peça com base no total de barras.
 */
function calcPieceDriver(
  totalBars: number,
  params: ShapeDriverParams
): ShapePieceDriver {
  // driverSelector usa Voltage = "220Vac" | "Bivolt" (mesmo tipo do ledEngine)
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
 * Encontra o melhor módulo IF para preencher um comprimento disponível.
 * Escolhe o módulo mais próximo por baixo (≤ availableLength).
 * Respeita o limite de comprimento de módulos longos.
 * Por padrão, apenas módulos com número inteiro de barras são considerados.
 */
function findBestIFModule(
  profileEntry: ProfileVariant,
  availableLength: number,
  allowLongModules: boolean,
  allowFractionalBars: boolean = false
): StraightSegment {
  if (availableLength <= 0) {
    return { availableLength, module: null, actualLength: 0 };
  }

  const ifModules = profileEntry.modules?.IF;
  if (!ifModules) {
    return { availableLength, module: null, actualLength: 0 };
  }

  let best: { sku: string; length: number; bars: number } | null = null;

  for (const [barsKey, mod] of Object.entries(ifModules)) {
    const m = mod as { length: number; sku: string };
    const bars = parseFloat(barsKey);
    // Respeitar limite de comprimento (allowLongModules libera módulos > 2840mm)
    if (!allowLongModules && m.length > MAX_IF_LENGTH_STANDARD) continue;
    // Bloquear barras decimais quando allowFractionalBars = false
    if (!allowFractionalBars && !Number.isInteger(bars)) continue;
    if (m.length <= availableLength + TOLERANCE_MM) {
      if (!best || m.length > best.length) {
        best = { sku: m.sku, length: m.length, bars };
      }
    }
  }

  return {
    availableLength,
    module: best,
    actualLength: best?.length ?? 0,
  };
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

  // Comprimento disponível para módulos retos em cada lado
  const availH = sideH - cornerLen;
  const availV = sideV - cornerLen;

  const segH = findBestIFModule(profileEntry as unknown as ProfileVariant, availH, allowLongModules, allowFractionalBars);
  const segV = findBestIFModule(profileEntry as unknown as ProfileVariant, availV, allowLongModules, allowFractionalBars);

  const actualH = cornerLen + segH.actualLength;
  const actualV = cornerLen + segV.actualLength;

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

  // Módulo reto horizontal (se houver)
  if (segH.module) {
    const hDriver = driverParams ? calcPieceDriver(segH.module.bars, driverParams) : undefined;
    pieces.push({
      sku: segH.module.sku,
      quantity: 1,
      description: `Módulo reto IF ${segH.module.bars} barras (${segH.module.length}mm) — lado horizontal`,
      length: segH.module.length,
      type: "STRAIGHT_IF",
      bars: segH.module.bars,
      driver: hDriver,
    });
  }

  // Módulo reto vertical (se houver)
  if (segV.module) {
    const vDriver = driverParams ? calcPieceDriver(segV.module.bars, driverParams) : undefined;
    // Verificar se é o mesmo SKU do horizontal
    if (segH.module?.sku === segV.module.sku) {
      // Agrupar: incrementar quantidade do horizontal
      const hPiece = pieces.find(p => p.sku === segV.module!.sku && p.type === "STRAIGHT_IF");
      if (hPiece) {
        hPiece.quantity = 2;
        // Atualizar descrição para refletir ambos os lados
        hPiece.description = `Módulo reto IF ${segV.module.bars} barras (${segV.module.length}mm) — horizontal e vertical`;
      }
    } else {
      pieces.push({
        sku: segV.module.sku,
        quantity: 1,
        description: `Módulo reto IF ${segV.module.bars} barras (${segV.module.length}mm) — lado vertical`,
        length: segV.module.length,
        type: "STRAIGHT_IF",
        bars: segV.module.bars,
        driver: vDriver,
      });
    }
  }

  const summary =
    `Formato L: ${actualH}mm × ${actualV}mm\n` +
    `1× canto ${corner.sku} (${cornerLen}mm)\n` +
    (segH.module ? `1× IF ${segH.module.sku} (${segH.module.length}mm) — horizontal\n` : "") +
    (segV.module ? `1× IF ${segV.module.sku} (${segV.module.length}mm) — vertical\n` : "");

  // Comprimento total = soma de todos os lados (1 canto + 2 retos)
  const totalLengthMm = cornerLen + segH.actualLength + segV.actualLength;

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
  // Cada lado = canto + reto + canto → disponível = side - 2 × cornerLen
  const availPerSide = side - 2 * cornerLen;

  const seg = findBestIFModule(profileEntry as unknown as ProfileVariant, availPerSide, allowLongModules, allowFractionalBars);

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

  // Módulos retos (4 lados, cada um com 1 módulo reto se houver)
  if (seg.module) {
    const segDriver = driverParams ? calcPieceDriver(seg.module.bars, driverParams) : undefined;
    pieces.push({
      sku: seg.module.sku,
      quantity: 4,
      description: `Módulo reto IF ${seg.module.bars} barras (${seg.module.length}mm)`,
      length: seg.module.length,
      type: "STRAIGHT_IF",
      bars: seg.module.bars,
      driver: segDriver,
    });
  }

  const summary =
    `Formato Quadrado: ${actualSide}mm × ${actualSide}mm\n` +
    `4× canto ${corner.sku} (${cornerLen}mm)\n` +
    (seg.module ? `4× IF ${seg.module.sku} (${seg.module.length}mm)\n` : "");

  // Comprimento total = 4 lados (4 cantos + 4 retos)
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

  // Lado curto (altura): canto + canto = 2 × cornerLen
  // Lado longo (largura): canto + reto + canto = 2 × cornerLen + reto
  const availWidth = width - 2 * cornerLen;
  const availHeight = height - 2 * cornerLen;

  const segWidth = findBestIFModule(profileEntry as unknown as ProfileVariant, availWidth, allowLongModules, allowFractionalBars);
  const segHeight = findBestIFModule(profileEntry as unknown as ProfileVariant, availHeight, allowLongModules, allowFractionalBars);

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

  // Módulos retos nos lados largos (2 peças)
  if (segWidth.module) {
    const widthDriver = driverParams ? calcPieceDriver(segWidth.module.bars, driverParams) : undefined;
    const widthPiece: ShapePiece = {
      sku: segWidth.module.sku,
      quantity: 2,
      description: `Módulo reto IF ${segWidth.module.bars} barras (${segWidth.module.length}mm) — lados largos`,
      length: segWidth.module.length,
      type: "STRAIGHT_IF",
      bars: segWidth.module.bars,
      driver: widthDriver,
    };
    pieces.push(widthPiece);
  }

  // Módulos retos nos lados curtos (2 peças) — se diferentes dos largos
  if (segHeight.module && segHeight.module.sku !== segWidth.module?.sku) {
    const heightDriver = driverParams ? calcPieceDriver(segHeight.module.bars, driverParams) : undefined;
    pieces.push({
      sku: segHeight.module.sku,
      quantity: 2,
      description: `Módulo reto IF ${segHeight.module.bars} barras (${segHeight.module.length}mm) — lados curtos`,
      length: segHeight.module.length,
      type: "STRAIGHT_IF",
      bars: segHeight.module.bars,
      driver: heightDriver,
    });
  } else if (segHeight.module && segHeight.module.sku === segWidth.module?.sku) {
    // Mesmo SKU: somar quantidades
    const existing = pieces.find(p => p.sku === segHeight.module!.sku);
    if (existing) existing.quantity += 2;
  }

  const summary =
    `Formato Retangular: ${actualWidth}mm × ${actualHeight}mm\n` +
    `4× canto ${corner.sku} (${cornerLen}mm)\n` +
    (segWidth.module ? `2× IF ${segWidth.module.sku} (${segWidth.module.length}mm) — lados largos\n` : "") +
    (segHeight.module && segHeight.module.sku !== segWidth.module?.sku
      ? `2× IF ${segHeight.module.sku} (${segHeight.module.length}mm) — lados curtos\n`
      : "");

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
