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
 */

import { getLConfig, getCorner1x1, type LCornerModule, type ShapeResult, type ShapePiece } from "./lCatalog";
import { LED_CATALOG, type ProfileVariant } from "./ledCatalog";

/** Tolerância de ajuste em mm (diferença aceitável entre medida desejada e real) */
const TOLERANCE_MM = 50;

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
 * Encontra o melhor módulo IF para preencher um comprimento disponível.
 * Escolhe o módulo mais próximo por baixo (≤ availableLength).
 */
function findBestIFModule(
  profileEntry: ProfileVariant,
  availableLength: number
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
    if (m.length <= availableLength + TOLERANCE_MM) {
      if (!best || m.length > best.length) {
        best = { sku: m.sku, length: m.length, bars: parseFloat(barsKey) };
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
 */
export function calculateLShape(
  profileCode: string,
  sideH: number,
  sideV: number
): ShapeResult | null {
  const lConfig = getLConfig(profileCode);
  if (!lConfig) return null;

  const corner = getCorner1x1(profileCode);
  if (!corner) return null;

  const profileEntry = LED_CATALOG[profileCode];
  if (!profileEntry) return null;

  const cornerLen = corner.lengthLong; // 1x1 é quadrado, ambos os lados iguais

  // Comprimento disponível para módulos retos em cada lado
  const availH = sideH - cornerLen;
  const availV = sideV - cornerLen;

  const segH = findBestIFModule(profileEntry as unknown as ProfileVariant, availH);
  const segV = findBestIFModule(profileEntry as unknown as ProfileVariant, availV);

  const actualH = cornerLen + segH.actualLength;
  const actualV = cornerLen + segV.actualLength;

  const pieces: ShapePiece[] = [];

  // 1 canto
  pieces.push({
    sku: corner.sku,
    quantity: 1,
    description: `Canto EM L 1×1 (${cornerLen}×${cornerLen}mm)`,
    type: "CORNER",
  });

  // Módulo reto horizontal (se houver)
  if (segH.module) {
    pieces.push({
      sku: segH.module.sku,
      quantity: 1,
      description: `Módulo reto IF ${segH.module.bars} barras (${segH.module.length}mm) — lado horizontal`,
      length: segH.module.length,
      type: "STRAIGHT_IF",
    });
  }

  // Módulo reto vertical (se houver)
  if (segV.module) {
    pieces.push({
      sku: segV.module.sku,
      quantity: segH.module?.sku === segV.module.sku ? 0 : 1, // será agrupado
      description: `Módulo reto IF ${segV.module.bars} barras (${segV.module.length}mm) — lado vertical`,
      length: segV.module.length,
      type: "STRAIGHT_IF",
    });
    // Agrupar se mesmo SKU
    if (segH.module?.sku === segV.module.sku) {
      pieces[pieces.length - 2].quantity = 2;
      pieces.pop();
    }
  }

  const summary =
    `Formato L: ${actualH}mm × ${actualV}mm\n` +
    `1× canto ${corner.sku} (${cornerLen}mm)\n` +
    (segH.module ? `1× IF ${segH.module.sku} (${segH.module.length}mm) — horizontal\n` : "") +
    (segV.module ? `1× IF ${segV.module.sku} (${segV.module.length}mm) — vertical\n` : "");

  return {
    shape: "L_SHAPE",
    dimensions: [actualH, actualV],
    pieces,
    summary,
  };
}

/**
 * Calcula a composição para o formato Quadrado.
 *
 * @param profileCode - Código do perfil
 * @param side - Comprimento desejado de cada lado em mm
 */
export function calculateSquare(
  profileCode: string,
  side: number
): ShapeResult | null {
  const lConfig = getLConfig(profileCode);
  if (!lConfig) return null;

  const corner = getCorner1x1(profileCode);
  if (!corner) return null;

  const profileEntry = LED_CATALOG[profileCode];
  if (!profileEntry) return null;

  const cornerLen = corner.lengthLong;

  // Comprimento disponível para módulos retos entre os dois cantos opostos
  // Cada lado = canto + reto + canto → disponível = side - 2 × cornerLen
  const availPerSide = side - 2 * cornerLen;

  const seg = findBestIFModule(profileEntry as unknown as ProfileVariant, availPerSide);

  const actualSide = 2 * cornerLen + seg.actualLength;

  const pieces: ShapePiece[] = [];

  // 4 cantos
  pieces.push({
    sku: corner.sku,
    quantity: 4,
    description: `Canto EM L 1×1 (${cornerLen}×${cornerLen}mm)`,
    type: "CORNER",
  });

  // Módulos retos (4 lados, cada um com 1 módulo reto se houver)
  if (seg.module) {
    pieces.push({
      sku: seg.module.sku,
      quantity: 4,
      description: `Módulo reto IF ${seg.module.bars} barras (${seg.module.length}mm)`,
      length: seg.module.length,
      type: "STRAIGHT_IF",
    });
  }

  const summary =
    `Formato Quadrado: ${actualSide}mm × ${actualSide}mm\n` +
    `4× canto ${corner.sku} (${cornerLen}mm)\n` +
    (seg.module ? `4× IF ${seg.module.sku} (${seg.module.length}mm)\n` : "");

  return {
    shape: "SQUARE",
    dimensions: [actualSide, actualSide],
    pieces,
    summary,
  };
}

/**
 * Calcula a composição para o formato Retangular.
 *
 * @param profileCode - Código do perfil
 * @param width - Comprimento desejado do lado longo (largura) em mm
 * @param height - Comprimento desejado do lado curto (altura) em mm
 */
export function calculateRectangle(
  profileCode: string,
  width: number,
  height: number
): ShapeResult | null {
  const lConfig = getLConfig(profileCode);
  if (!lConfig) return null;

  const corner = getCorner1x1(profileCode);
  if (!corner) return null;

  const profileEntry = LED_CATALOG[profileCode];
  if (!profileEntry) return null;

  const cornerLen = corner.lengthLong;

  // Lado curto (altura): canto + canto = 2 × cornerLen
  // Lado longo (largura): canto + reto + canto = 2 × cornerLen + reto
  const availWidth = width - 2 * cornerLen;
  const availHeight = height - 2 * cornerLen;

  const segWidth = findBestIFModule(profileEntry as unknown as ProfileVariant, availWidth);
  const segHeight = findBestIFModule(profileEntry as unknown as ProfileVariant, availHeight);

  const actualWidth = 2 * cornerLen + segWidth.actualLength;
  const actualHeight = 2 * cornerLen + segHeight.actualLength;

  const pieces: ShapePiece[] = [];

  // 4 cantos
  pieces.push({
    sku: corner.sku,
    quantity: 4,
    description: `Canto EM L 1×1 (${cornerLen}×${cornerLen}mm)`,
    type: "CORNER",
  });

  // Módulos retos nos lados largos (2 peças)
  if (segWidth.module) {
    const widthPiece: ShapePiece = {
      sku: segWidth.module.sku,
      quantity: 2,
      description: `Módulo reto IF ${segWidth.module.bars} barras (${segWidth.module.length}mm) — lados largos`,
      length: segWidth.module.length,
      type: "STRAIGHT_IF",
    };
    pieces.push(widthPiece);
  }

  // Módulos retos nos lados curtos (2 peças) — se diferentes dos largos
  if (segHeight.module && segHeight.module.sku !== segWidth.module?.sku) {
    pieces.push({
      sku: segHeight.module.sku,
      quantity: 2,
      description: `Módulo reto IF ${segHeight.module.bars} barras (${segHeight.module.length}mm) — lados curtos`,
      length: segHeight.module.length,
      type: "STRAIGHT_IF",
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

  return {
    shape: "RECTANGLE",
    dimensions: [actualWidth, actualHeight],
    pieces,
    summary,
  };
}

/**
 * Verifica se um perfil suporta formatos EM L.
 */
export function profileSupportsLShape(profileCode: string): boolean {
  return getLConfig(profileCode) !== null;
}
