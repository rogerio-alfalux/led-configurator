/**
 * lEngine.ts — Motor de cálculo para formas EM L (L, Quadrado, Retangular, U).
 *
 * Lógica de montagem:
 *
 * FORMATO L (2 lados):
 *   - 1 canto 1L1 no vértice
 *   - Lado horizontal: canto + módulos retos (ML e/ou IF)
 *   - Lado vertical: canto + módulos retos (ML e/ou IF)
 *
 * FORMATO QUADRADO (4 lados iguais):
 *   - 4 cantos 1L1 nos vértices
 *   - Cada lado: canto + módulos retos + canto
 *   - Lado = 2 × cornerLength + módulos retos
 *
 * FORMATO RETANGULAR (4 lados, 2 pares diferentes):
 *   - 4 cantos 1L1 nos vértices
 *   - Lado largo: canto + módulos retos + canto
 *   - Lado curto: canto + módulos retos + canto
 *
 * FORMATO U (3 lados):
 *   - 2 cantos 1L1 nos vértices fechados
 *   - 2 lados de profundidade: canto + módulos retos (abertura livre)
 *   - 1 base: canto + módulos retos + canto
 *
 * Algoritmo de preenchimento (v5 — busca ótima ML+IF combinados):
 *   Para cada segmento reto, usa programação dinâmica (DP) sobre o conjunto
 *   unificado de módulos ML e IF disponíveis para o perfil. O objetivo é
 *   maximizar o comprimento realizado sem ultrapassar o disponível.
 *   Inclui módulos de 1 barra (minBars=1) para minimizar o desvio.
 *
 * Drivers:
 *   - Cada peça (canto ou módulo reto) recebe 1 driver calculado pelas suas barras.
 *   - Canto 1x1: totalBars = barsLong + barsShort = 1 + 1 = 2
 *   - Módulo reto ML/IF: totalBars = bars do módulo
 */

import { getLConfig, getCorner1x1, getCabeceiraMm, type LCornerModule, type ShapeResult, type ShapePiece, type ShapePieceDriver } from "./lCatalog";
import { getActiveCatalog, type ProfileVariant } from "./ledCatalog";
import { selectDriverFallback } from "./driverSelector";
import type { Power, Voltage, StripMethod } from "./ledEngine";

/** Comprimento máximo de módulo IF sem módulos longos habilitados */
const MAX_IF_LENGTH_STANDARD = 2840;

/** Número máximo de módulos por lado — valor alto para suportar instalações grandes */
const MAX_MODULES_PER_SIDE = 500;

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
  /** Nome da barra Stripflex/Stripline com CCT para exibição (ex: "STRIPFLEX 562.5 X 10MM - 36 LEDS 830 - 3000K (LC) 25V") */
  stripflexName?: string | null;
  /** Código EQ da barra Stripflex/Stripline para a CCT selecionada (ex: "EQ00125") */
  stripflexEq?: string | null;
  /** Tipo de controle selecionado pelo usuário */
  controlType?: import("./ledEngine").ControlType;
  /** Driver ON/OFF 220V da API (substitui banco estático quando disponível) */
  driver220?: { model: string; code: string | null } | null;
  /** Driver ON/OFF Bivolt da API (substitui banco estático quando disponível) */
  driverBivolt?: { model: string; code: string | null } | null;
  /** Driver DIM DALI da API */
  driverDimDali?: { model: string; code: string | null } | null;
  /** Driver DIM 1-10V da API */
  driverDim110v?: { model: string; code: string | null } | null;
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
  // Verificar se a API fornece o driver exato para este controle/tensão
  const apiDriver = params.controlType === "dimDali"
    ? (params.driverDimDali ?? null)
    : params.controlType === "dim110v"
      ? (params.driverDim110v ?? null)
      : params.voltage === "220Vac"
        ? (params.driver220 ?? null)
        : (params.driverBivolt ?? null);

  if (apiDriver) {
    return {
      code: apiDriver.code ?? undefined,
      model: apiDriver.model,
      quantity: 1,
    };
  }

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
 * Coleta todos os módulos ML e IF disponíveis para um perfil, retornando uma lista
 * unificada ordenada do maior para o menor comprimento.
 * Inclui módulos de 1 barra (minBars=1) para maximizar a precisão nos formatos especiais.
 * Preferência: quando ML e IF têm o mesmo comprimento, ML vem primeiro.
 */
function collectAllModules(
  profileEntry: ProfileVariant,
  allowLongModules: boolean,
  allowFractionalBars: boolean
): Array<{ sku: string; length: number; bars: number; type: "ML" | "IF" }> {
  type ModEntry = { sku: string; length: number; bars: number; type: "ML" | "IF" };
  const result: ModEntry[] = [];
  const seen = new Set<string>(); // evitar duplicatas por SKU

  for (const moduleType of ["ML", "IF"] as const) {
    const rawModules = profileEntry.modules?.[moduleType];
    if (!rawModules) continue;
    for (const [barsKey, mod] of Object.entries(rawModules)) {
      const m = mod as { length: number; sku: string };
      const bars = parseFloat(barsKey);
      if (!allowLongModules && m.length > MAX_IF_LENGTH_STANDARD) continue;
      if (!allowFractionalBars && !Number.isInteger(bars)) continue;
      if (seen.has(m.sku)) continue;
      seen.add(m.sku);
      result.push({ sku: m.sku, length: m.length, bars, type: moduleType });
    }
  }

  // Ordenar: maior comprimento primeiro; empate: ML antes de IF
  result.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return a.type === "ML" ? -1 : 1;
  });

  return result;
}

/**
 * Comprimento mínimo de um módulo de 2 barras (limiar para separar módulos grandes de pequenos).
 * Módulos abaixo deste limiar são considerados "de 1 barra" e usados apenas como complemento.
 */
const MIN_2BAR_LENGTH = 1100; // ~1130mm para 2 barras

/**
 * Busca ótima (DP) para preencher um segmento reto com módulos ML e/ou IF.
 *
 * Estratégia de dois estágios:
 *   Estágio 1: DP sobre módulos >=2 barras (comprimento >= MIN_2BAR_LENGTH).
 *     Objetivo: maximizar comprimento realizado com o menor número de peças.
 *     Desempate: menos peças vence.
 *   Estágio 2: Se sobrar espaço após o estágio 1, adicionar no máximo 1 módulo
 *     de 1 barra (o maior que couber no espaço restante).
 *
 * Isso garante que o resultado usa o menor número de módulos grandes possível
 * e no máximo 1 módulo pequeno de complemento.
 *
 * Granularidade: 5mm (todos os módulos são múltiplos de 5mm ou muito próximos).
 */
function findBestSegmentOptimal(
  profileEntry: ProfileVariant,
  availableLength: number,
  allowLongModules: boolean,
  allowFractionalBars: boolean
): StraightSegment {
  const empty: StraightSegment = {
    availableLength,
    pieces: [],
    module: null,
    moduleQty: 0,
    actualLength: 0,
  };

  if (availableLength <= 0) return empty;

  const allMods = collectAllModules(profileEntry, allowLongModules, allowFractionalBars);
  if (allMods.length === 0) return empty;

  // Separar módulos grandes (>=2 barras) e pequenos (1 barra)
  const largeMods = allMods.filter(m => m.length >= MIN_2BAR_LENGTH);
  const smallMods = allMods.filter(m => m.length < MIN_2BAR_LENGTH);

  const GRAN = 5;
  const maxSlots = Math.floor(availableLength / GRAN);
  const MAX_SLOTS = Math.min(maxSlots, 50000);

  // Estado DP: dp[i] = [comprimento_realizado, num_pecas]
  // Maximizar comprimento; desempate: minimizar num_pecas
  const dpLen = new Int32Array(MAX_SLOTS + 1).fill(-1);
  const dpPcs = new Int16Array(MAX_SLOTS + 1).fill(0x7fff); // INF
  dpLen[0] = 0;
  dpPcs[0] = 0;
  const from = new Int16Array(MAX_SLOTS + 1).fill(-1);

  for (let i = 1; i <= MAX_SLOTS; i++) {
    for (let mi = 0; mi < largeMods.length; mi++) {
      const mod = largeMods[mi];
      const slots = Math.round(mod.length / GRAN);
      if (slots > i) continue;
      const prevLen = dpLen[i - slots];
      if (prevLen < 0) continue;
      const prevPcs = dpPcs[i - slots];
      const candLen = prevLen + mod.length;
      const candPcs = prevPcs + 1;
      // Maximizar comprimento; desempate: menos peças
      if (candLen > dpLen[i] || (candLen === dpLen[i] && candPcs < dpPcs[i])) {
        dpLen[i] = candLen;
        dpPcs[i] = candPcs;
        from[i] = mi;
      }
    }
  }

  // Encontrar melhor estado (maior comprimento, depois menos peças)
  let bestSlots = 0;
  let bestLen = 0;
  let bestPcs = 0x7fff;
  for (let i = MAX_SLOTS; i >= 0; i--) {
    if (dpLen[i] > bestLen || (dpLen[i] === bestLen && dpLen[i] >= 0 && dpPcs[i] < bestPcs)) {
      bestLen = dpLen[i];
      bestPcs = dpPcs[i];
      bestSlots = i;
      if (bestLen > 0) break;
    }
  }

  // Reconstruir peças grandes
  const segPieces: SegmentPiece[] = [];
  let cur = bestSlots;
  while (cur > 0 && from[cur] >= 0) {
    const mi = from[cur];
    const mod = largeMods[mi];
    const slots = Math.round(mod.length / GRAN);
    const existing = segPieces.find(p => p.sku === mod.sku);
    if (existing) {
      existing.qty++;
    } else {
      segPieces.push({ sku: mod.sku, length: mod.length, bars: mod.bars, qty: 1 });
    }
    cur -= slots;
  }

  // Estágio 2: complementar com no máximo 1 módulo pequeno (1 barra)
  let remaining = availableLength - bestLen;
  if (remaining > 0 && smallMods.length > 0) {
    // Escolher o maior módulo pequeno que cabe no espaço restante
    const bestSmall = smallMods.find(m => m.length <= remaining);
    if (bestSmall) {
      const existing = segPieces.find(p => p.sku === bestSmall.sku);
      if (existing) {
        existing.qty++;
      } else {
        segPieces.push({ sku: bestSmall.sku, length: bestSmall.length, bars: bestSmall.bars, qty: 1 });
      }
      bestLen += bestSmall.length;
    }
  }

  if (segPieces.length === 0) return empty;

  // Ordenar peças do maior para o menor comprimento
  segPieces.sort((a, b) => b.length - a.length);

  const firstPiece = segPieces[0];
  return {
    availableLength,
    pieces: segPieces,
    module: { sku: firstPiece.sku, length: firstPiece.length, bars: firstPiece.bars },
    moduleQty: firstPiece.qty,
    actualLength: bestLen,
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

  const profileEntry = getActiveCatalog()[profileCode];
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

  const segH = findBestSegmentOptimal(profileEntry as unknown as ProfileVariant, availH, allowLongModules, allowFractionalBars);
  const segV = findBestSegmentOptimal(profileEntry as unknown as ProfileVariant, availV, allowLongModules, allowFractionalBars);

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
  // v4.1: usa ML (não IF) — barras quebradas só nos MLs, cantos sempre inteiros
  for (const sp of segH.pieces) {
    const hDriver = driverParams ? calcPieceDriver(sp.bars, driverParams) : undefined;
    const hDesc = sp.qty > 1
      ? `${sp.qty}× ML ${sp.bars} barras (${sp.length}mm) — horizontal`
      : `ML ${sp.bars} barras (${sp.length}mm) — horizontal`;
    // Agrupar com peça vertical de mesmo SKU, se existir
    const existing = pieces.find(p => p.sku === sp.sku && p.type === "STRAIGHT_ML");
    if (existing) {
      existing.quantity += sp.qty;
      existing.description = `ML ${sp.bars} barras (${sp.length}mm) — horizontal e vertical`;
    } else {
      pieces.push({
        sku: sp.sku,
        quantity: sp.qty,
        description: hDesc,
        length: sp.length,
        type: "STRAIGHT_ML",
        bars: sp.bars,
        driver: hDriver,
      });
    }
  }

  // Módulos retos verticais (algoritmo greedy, múltiplos tipos possíveis)
  // v4.1: usa ML (não IF) — barras quebradas só nos MLs, cantos sempre inteiros
  for (const sp of segV.pieces) {
    const vDriver = driverParams ? calcPieceDriver(sp.bars, driverParams) : undefined;
    const vDesc = sp.qty > 1
      ? `${sp.qty}× ML ${sp.bars} barras (${sp.length}mm) — vertical`
      : `ML ${sp.bars} barras (${sp.length}mm) — vertical`;
    const existing = pieces.find(p => p.sku === sp.sku && p.type === "STRAIGHT_ML");
    if (existing) {
      existing.quantity += sp.qty;
      existing.description = `ML ${sp.bars} barras (${sp.length}mm) — horizontal e vertical`;
    } else {
      pieces.push({
        sku: sp.sku,
        quantity: sp.qty,
        description: vDesc,
        length: sp.length,
        type: "STRAIGHT_ML",
        bars: sp.bars,
        driver: vDriver,
      });
    }
  }

  const summaryLines: string[] = [
    `Formato L: ${actualH}mm × ${actualV}mm`,
    `1× canto ${corner.sku} (${cornerLen}mm)`,
  ];
  for (const sp of segH.pieces) summaryLines.push(`${sp.qty}× ML ${sp.sku} (${sp.length}mm) — horizontal`);
  if (cabH > 0) summaryLines.push(`+ ${cabH}mm cabeceira (lado horizontal, canto isolado)`);
  for (const sp of segV.pieces) summaryLines.push(`${sp.qty}× ML ${sp.sku} (${sp.length}mm) — vertical`);
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
    stripflexName: driverParams?.stripflexName,
    stripflexEq: driverParams?.stripflexEq,
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

  const profileEntry = getActiveCatalog()[profileCode];
  if (!profileEntry) return null;

  const allowLongModules = driverParams?.allowLongModules ?? false;
  const allowFractionalBars = driverParams?.allowFractionalBars ?? false;
  const cornerLen = corner.lengthLong;

  // Comprimento disponível para módulos retos entre os dois cantos opostos
  // Cada lado = canto + reto(s) + canto → disponível = side - 2 × cornerLen
  const availPerSide = side - 2 * cornerLen;

  const seg = findBestSegmentOptimal(profileEntry as unknown as ProfileVariant, availPerSide, allowLongModules, allowFractionalBars);

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
    stripflexName: driverParams?.stripflexName,
    stripflexEq: driverParams?.stripflexEq,
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

  const profileEntry = getActiveCatalog()[profileCode];
  if (!profileEntry) return null;

  const allowLongModules = driverParams?.allowLongModules ?? false;
  const allowFractionalBars = driverParams?.allowFractionalBars ?? false;
  const cornerLen = corner.lengthLong;

  // Lado curto (altura): canto + reto(s) + canto
  // Lado longo (largura): canto + reto(s) + canto
  const availWidth = width - 2 * cornerLen;
  const availHeight = height - 2 * cornerLen;

  const segWidth = findBestSegmentOptimal(profileEntry as unknown as ProfileVariant, availWidth, allowLongModules, allowFractionalBars);
  const segHeight = findBestSegmentOptimal(profileEntry as unknown as ProfileVariant, availHeight, allowLongModules, allowFractionalBars);

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
    stripflexName: driverParams?.stripflexName,
    stripflexEq: driverParams?.stripflexEq,
  };
}

/**
 * Calcula a composição para o formato em U.
 *
 * O formato em U tem 3 lados:
 *   - 2 lados paralelos (profundidade), cada um com 1 canto EM L nas extremidades
 *   - 1 lado de base (largura), conectando os dois cantos
 *
 * Estrutura:
 *   Canto1 + ML(profundidade) ... Canto2 + ML(base) ... (sem canto na abertura)
 *
 * Montagem:
 *   - 2 cantos EM L 1x1 (um em cada canto fechado do U)
 *   - Lado esquerdo (profundidade): canto + ML retos
 *   - Base (largura): canto + ML retos + canto (os dois cantos já contam acima)
 *   - Lado direito (profundidade): canto + ML retos
 *
 * @param profileCode - Código do perfil
 * @param depth - Comprimento dos lados paralelos (profundidade do U) em mm
 * @param width - Comprimento da base do U em mm
 * @param driverParams - Parâmetros para cálculo de drivers (opcional)
 */
export function calculateUShape(
  profileCode: string,
  depth: number,
  width: number,
  driverParams?: ShapeDriverParams
): ShapeResult | null {
  const lConfig = getLConfig(profileCode);
  if (!lConfig) return null;

  const corner = getCorner1x1(profileCode);
  if (!corner) return null;

  const profileEntry = getActiveCatalog()[profileCode];
  if (!profileEntry) return null;

  const allowLongModules = driverParams?.allowLongModules ?? false;
  const allowFractionalBars = driverParams?.allowFractionalBars ?? false;
  const cornerLen = corner.lengthLong;

  // Comprimento disponível para ML em cada segmento:
  // - Lados de profundidade: canto + ML (abertura livre, sem canto na ponta)
  //   disponível = depth - cornerLen
  // - Base: canto + ML + canto
  //   disponível = width - 2 * cornerLen
  const availDepth = depth - cornerLen;
  const availBase = width - 2 * cornerLen;

  const segDepth = findBestSegmentOptimal(
    profileEntry as unknown as ProfileVariant,
    availDepth,
    allowLongModules,
    allowFractionalBars
  );
  const segBase = findBestSegmentOptimal(
    profileEntry as unknown as ProfileVariant,
    availBase,
    allowLongModules,
    allowFractionalBars
  );

  const actualDepth = cornerLen + segDepth.actualLength;
  const actualBase = 2 * cornerLen + segBase.actualLength;

  const pieces: ShapePiece[] = [];

  // Calcular driver do canto
  const cornerBars = corner.barsLong + corner.barsShort;
  const cornerDriver = driverParams ? calcPieceDriver(cornerBars, driverParams) : undefined;

  // 2 cantos EM L
  pieces.push({
    sku: corner.sku,
    quantity: 2,
    description: `Canto EM L 1×1 (${cornerLen}×${cornerLen}mm)`,
    type: "CORNER",
    bars: cornerBars,
    driver: cornerDriver,
  });

  // ML dos lados de profundidade (2 lados idênticos)
  const summaryDepthLines: string[] = [];
  for (const sp of segDepth.pieces) {
    const spDriver = driverParams ? calcPieceDriver(sp.bars, driverParams) : undefined;
    const totalQty = 2 * sp.qty; // 2 lados de profundidade
    const desc = sp.qty > 1
      ? `${sp.qty}× ML ${sp.bars} barras (${sp.length}mm) por lado de profundidade`
      : `ML ${sp.bars} barras (${sp.length}mm) — lados de profundidade`;
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
    summaryDepthLines.push(`${totalQty}× ML ${sp.sku} (${sp.length}mm) — profundidade`);
  }

  // ML da base
  const summaryBaseLines: string[] = [];
  for (const sp of segBase.pieces) {
    const spDriver = driverParams ? calcPieceDriver(sp.bars, driverParams) : undefined;
    const totalQty = sp.qty; // 1 base
    const desc = sp.qty > 1
      ? `${sp.qty}× ML ${sp.bars} barras (${sp.length}mm) na base`
      : `ML ${sp.bars} barras (${sp.length}mm) — base`;
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
    summaryBaseLines.push(`${totalQty}× ML ${sp.sku} (${sp.length}mm) — base`);
  }

  const summary =
    `Formato U: profundidade ${actualDepth}mm × base ${actualBase}mm\n` +
    `2× canto ${corner.sku} (${cornerLen}mm)\n` +
    [...summaryDepthLines, ...summaryBaseLines].join("\n") +
    ([...summaryDepthLines, ...summaryBaseLines].length ? "\n" : "");

  // Comprimento total = 2 lados de profundidade + 1 base
  const totalLengthMm = 2 * actualDepth + actualBase;

  return {
    shape: "U_SHAPE",
    dimensions: [actualBase, actualDepth],
    pieces,
    summary,
    power: driverParams?.power,
    voltage: driverParams?.voltage,
    stripMethod: driverParams?.stripMethod,
    cct: driverParams?.cct,
    profileName: driverParams?.profileName,
    profileCode,
    totalLengthMm,
    stripflexName: driverParams?.stripflexName,
    stripflexEq: driverParams?.stripflexEq,
  };
}

/**
 * Verifica se um perfil suporta formatos EM L.
 */
export function profileSupportsLShape(profileCode: string): boolean {
  return getLConfig(profileCode) !== null;
}
