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

/** Resultado do cálculo de um segmento reto entre dois cantos */
type StraightSegment = {
  /** Comprimento total disponível para módulos retos */
  availableLength: number;
  /** Módulo IF escolhido (ou null se não há espaço) */
  module: { sku: string; length: number; bars: number } | null;
  /** Quantidade de módulos neste segmento */
  moduleQty: number;
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
 * Encontra a melhor combinação de módulos para preencher um comprimento disponível.
 * Algoritmo genérico usado tanto para IF (formato L) quanto para ML (quadrado/retangular).
 */
function findBestModuleByType(
  profileEntry: ProfileVariant,
  moduleType: "IF" | "ML",
  availableLength: number,
  allowLongModules: boolean,
  allowFractionalBars: boolean = false
): StraightSegment {
  if (availableLength <= 0) {
    return { availableLength, module: null, moduleQty: 0, actualLength: 0 };
  }

  const modules = profileEntry.modules?.[moduleType];
  if (!modules) {
    return { availableLength, module: null, moduleQty: 0, actualLength: 0 };
  }

  let bestModule: { sku: string; length: number; bars: number } | null = null;
  let bestQty = 0;
  let bestTotal = 0;

  for (const [barsKey, mod] of Object.entries(modules)) {
    const m = mod as { length: number; sku: string };
    const bars = parseFloat(barsKey);

    if (!allowLongModules && m.length > MAX_IF_LENGTH_STANDARD) continue;
    if (!allowFractionalBars && !Number.isInteger(bars)) continue;

    for (let qty = 1; qty <= MAX_MODULES_PER_SIDE; qty++) {
      const total = m.length * qty;
      if (total > availableLength) break;
      if (total > bestTotal) {
        bestTotal = total;
        bestModule = { sku: m.sku, length: m.length, bars };
        bestQty = qty;
      }
    }
  }

  return {
    availableLength,
    module: bestModule,
    moduleQty: bestQty,
    actualLength: bestTotal,
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

  // Módulo reto horizontal (se houver)
  if (segH.module) {
    const hDriver = driverParams ? calcPieceDriver(segH.module.bars, driverParams) : undefined;
    const hDesc = segH.moduleQty > 1
      ? `${segH.moduleQty}× Módulo reto IF ${segH.module.bars} barras (${segH.module.length}mm) — lado horizontal`
      : `Módulo reto IF ${segH.module.bars} barras (${segH.module.length}mm) — lado horizontal`;
    pieces.push({
      sku: segH.module.sku,
      quantity: segH.moduleQty,
      description: hDesc,
      length: segH.module.length,
      type: "STRAIGHT_IF",
      bars: segH.module.bars,
      driver: hDriver,
    });
  }

  // Módulo reto vertical (se houver)
  if (segV.module) {
    const vDriver = driverParams ? calcPieceDriver(segV.module.bars, driverParams) : undefined;
    // Verificar se é o mesmo SKU e mesma quantidade do horizontal
    const hPiece = pieces.find(p => p.sku === segV.module!.sku && p.type === "STRAIGHT_IF");
    if (hPiece && hPiece.quantity === segV.moduleQty) {
      // Agrupar: dobrar quantidade
      hPiece.quantity = hPiece.quantity + segV.moduleQty;
      hPiece.description = `Módulo reto IF ${segV.module.bars} barras (${segV.module.length}mm) — horizontal e vertical`;
    } else if (hPiece) {
      // Mesmo SKU mas quantidades diferentes: manter separado
      pieces.push({
        sku: segV.module.sku + "_V",
        quantity: segV.moduleQty,
        description: `Módulo reto IF ${segV.module.bars} barras (${segV.module.length}mm) — lado vertical`,
        length: segV.module.length,
        type: "STRAIGHT_IF",
        bars: segV.module.bars,
        driver: vDriver,
      });
    } else {
      const vDesc = segV.moduleQty > 1
        ? `${segV.moduleQty}× Módulo reto IF ${segV.module.bars} barras (${segV.module.length}mm) — lado vertical`
        : `Módulo reto IF ${segV.module.bars} barras (${segV.module.length}mm) — lado vertical`;
      pieces.push({
        sku: segV.module.sku,
        quantity: segV.moduleQty,
        description: vDesc,
        length: segV.module.length,
        type: "STRAIGHT_IF",
        bars: segV.module.bars,
        driver: vDriver,
      });
    }
  }

  const summaryLines: string[] = [
    `Formato L: ${actualH}mm × ${actualV}mm`,
    `1× canto ${corner.sku} (${cornerLen}mm)`,
  ];
  if (segH.module) summaryLines.push(`${segH.moduleQty}× IF ${segH.module.sku} (${segH.module.length}mm) — horizontal`);
  if (cabH > 0) summaryLines.push(`+ ${cabH}mm cabeceira (lado horizontal, canto isolado)`);
  if (segV.module) summaryLines.push(`${segV.moduleQty}× IF ${segV.module.sku} (${segV.module.length}mm) — vertical`);
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

  // Módulos retos ML (4 lados, cada um com moduleQty módulos)
  if (seg.module) {
    const segDriver = driverParams ? calcPieceDriver(seg.module.bars, driverParams) : undefined;
    const totalQty = 4 * seg.moduleQty;
    const desc = seg.moduleQty > 1
      ? `${seg.moduleQty}× Módulo reto ML ${seg.module.bars} barras (${seg.module.length}mm) por lado`
      : `Módulo reto ML ${seg.module.bars} barras (${seg.module.length}mm)`;
    pieces.push({
      sku: seg.module.sku,
      quantity: totalQty,
      description: desc,
      length: seg.module.length,
      type: "STRAIGHT_ML",
      bars: seg.module.bars,
      driver: segDriver,
    });
  }

  const summary =
    `Formato Quadrado: ${actualSide}mm × ${actualSide}mm\n` +
    `4× canto ${corner.sku} (${cornerLen}mm)\n` +
    (seg.module ? `${4 * seg.moduleQty}× ML ${seg.module.sku} (${seg.module.length}mm)\n` : "");

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

  // Módulos retos ML nos lados largos (2 lados × moduleQty)
  if (segWidth.module) {
    const widthDriver = driverParams ? calcPieceDriver(segWidth.module.bars, driverParams) : undefined;
    const totalWidthQty = 2 * segWidth.moduleQty;
    const desc = segWidth.moduleQty > 1
      ? `${segWidth.moduleQty}× Módulo reto ML ${segWidth.module.bars} barras (${segWidth.module.length}mm) por lado largo`
      : `Módulo reto ML ${segWidth.module.bars} barras (${segWidth.module.length}mm) — lados largos`;
    pieces.push({
      sku: segWidth.module.sku,
      quantity: totalWidthQty,
      description: desc,
      length: segWidth.module.length,
      type: "STRAIGHT_ML",
      bars: segWidth.module.bars,
      driver: widthDriver,
    });
  }

  // Módulos retos ML nos lados curtos (2 lados × moduleQty)
  if (segHeight.module) {
    const heightDriver = driverParams ? calcPieceDriver(segHeight.module.bars, driverParams) : undefined;
    const totalHeightQty = 2 * segHeight.moduleQty;

    if (segHeight.module.sku === segWidth.module?.sku) {
      // Mesmo SKU: somar quantidades
      const existing = pieces.find(p => p.sku === segHeight.module!.sku);
      if (existing) {
        existing.quantity += totalHeightQty;
        existing.description = `Módulo reto ML ${segHeight.module.bars} barras (${segHeight.module.length}mm) — todos os lados`;
      }
    } else {
      const desc = segHeight.moduleQty > 1
        ? `${segHeight.moduleQty}× Módulo reto ML ${segHeight.module.bars} barras (${segHeight.module.length}mm) por lado curto`
        : `Módulo reto ML ${segHeight.module.bars} barras (${segHeight.module.length}mm) — lados curtos`;
      pieces.push({
        sku: segHeight.module.sku,
        quantity: totalHeightQty,
        description: desc,
        length: segHeight.module.length,
        type: "STRAIGHT_ML",
        bars: segHeight.module.bars,
        driver: heightDriver,
      });
    }
  }

  const summary =
    `Formato Retangular: ${actualWidth}mm × ${actualHeight}mm\n` +
    `4× canto ${corner.sku} (${cornerLen}mm)\n` +
    (segWidth.module ? `${2 * segWidth.moduleQty}× ML ${segWidth.module.sku} (${segWidth.module.length}mm) — lados largos\n` : "") +
    (segHeight.module && segHeight.module.sku !== segWidth.module?.sku
      ? `${2 * segHeight.moduleQty}× ML ${segHeight.module.sku} (${segHeight.module.length}mm) — lados curtos\n`
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
