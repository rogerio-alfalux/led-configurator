/**
 * lEngine.ts — Motor de cálculo para formas EM L (L, Quadrado, Retangular, U).
 *
 * Lógica de montagem:
 *
 * FORMATO L (2 lados):
 *   - 1 canto 1L1 no vértice
 *   - Cada lado: canto + módulos ML + exatamente 1 acabamento IF
 *
 * FORMATO QUADRADO (4 lados iguais):
 *   - 4 cantos 1L1 nos vértices
 *   - Cada lado: canto + módulos ML + canto; IF é proibido
 *   - Lado = 2 × cornerLength + módulos retos
 *
 * FORMATO RETANGULAR (4 lados, 2 pares diferentes):
 *   - 4 cantos 1L1 nos vértices
 *   - Lados largos/curtos: canto + módulos ML + canto; IF é proibido
 *
 * FORMATO U (3 lados):
 *   - 2 cantos 1L1 nos vértices fechados
 *   - Cada profundidade: canto + módulos ML + exatamente 1 IF na abertura
 *   - Base: canto + módulos ML + canto; IF é proibido
 *
 * Algoritmo de preenchimento (v6 — busca ótima por aresta):
 *   Usa programação dinâmica (DP) sobre os ML e escolhe IF separadamente apenas
 *   para as pontas abertas de L/U. Pode priorizar proximidade ou menos módulos.
 *   Inclui módulos de 1 barra (minBars=1) para minimizar o desvio.
 *
 * Drivers:
 *   - Cada peça (canto ou módulo reto) recebe 1 driver calculado pelas suas barras.
 *   - Canto 1x1: totalBars = barsLong + barsShort = 1 + 1 = 2
 *   - Módulo reto ML/IF: totalBars = bars do módulo
 */

import { getLConfig, getCorner1x1, type LCornerModule, type ShapeResult, type ShapePiece, type ShapePieceDriver, type ShapeAssemblyModule } from "./lCatalog";
import { getActiveCatalog, type ProfileVariant } from "./ledCatalog";
import { selectDriverFallback } from "./driverSelector";
import type { Power, Voltage, StripMethod } from "./ledEngine";

type ResolvedShapeCorner = Pick<LCornerModule, "sku" | "barsLong" | "barsShort" | "lengthLong" | "lengthShort">;

function getApiVariantLabel(power: Power, stripMethod: StripMethod): "18W" | "26W" | "36W SF" | "36W SL" {
  if (power === 26) return "26W";
  if (power === 36) return stripMethod === "STRIPLINE" ? "36W SL" : "36W SF";
  return "18W";
}

function resolveShapeCorner(
  profileCode: string,
  profileEntry: ProfileVariant,
  driverParams?: ShapeDriverParams,
): ResolvedShapeCorner | null {
  if (driverParams) {
    const variantLabel = getApiVariantLabel(driverParams.power, driverParams.stripMethod);
    const apiCorner = profileEntry.apiLinearVariants?.[variantLabel]?.shapeCorners
      ?.find((corner) => corner.barsLong === 1 && corner.barsShort === 1);
    if (apiCorner) return apiCorner;
  }

  // Catálogo API nunca pode receber SKU comercial substituído pelo catálogo estático.
  if (profileEntry.catalogSource === "api") return null;
  return getCorner1x1(profileCode);
}

/**
 * Comprimento máximo de módulo sem módulos longos habilitados.
 * Módulos com comprimento > 2840mm (tipicamente 6 barras) só são incluídos
 * quando allowLongModules=true. Este limite é aplicado em collectAllModules
 * para todos os formatos (L/U/Quadrado/Retangular).
 * O valor 2840mm inclui o IF-5 do BLAZE embutir (2835mm).
 */
const MAX_IF_LENGTH_STANDARD = 2840; // mm — mesmo limite do ledEngine.ts

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
  /** Corrente de programação do driver (ex: "programar em 350mA"). Campo direto da API. */
  correnteDriver?: string | null;
  /** Prioriza menor quantidade de módulos dentro da tolerância, como no formato reto. */
  optimizeModuleCount?: boolean;
  /** Permite escolher o primeiro conjunto acima da medida quando não há encaixe exato. */
  adjustToLarger?: boolean;
  /** Em L/U, permite acabamentos IF de tamanhos distintos nas extremidades. */
  allowMixedIF?: boolean;
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
      corrente: params.correnteDriver ?? null,
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
    corrente: params.correnteDriver ?? null,
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
  allowFractionalBars: boolean,
  moduleTypeFilter: "ML" | "IF" | "both" = "both"
): Array<{ sku: string; length: number; bars: number; type: "ML" | "IF" }> {
  type ModEntry = { sku: string; length: number; bars: number; type: "ML" | "IF" };
  const result: ModEntry[] = [];
  const seen = new Set<string>(); // evitar duplicatas por SKU

  const moduleTypes = moduleTypeFilter === "both"
    ? (["ML", "IF"] as const)
    : ([moduleTypeFilter] as const);

  for (const moduleType of moduleTypes) {
    const rawModules = profileEntry.modules?.[moduleType];
    if (!rawModules) continue;
    for (const [barsKey, mod] of Object.entries(rawModules)) {
      const m = mod as { length: number; sku: string };
      const bars = parseFloat(barsKey);
      // Respeitar allowLongModules: módulos com comprimento > 2840mm (6 barras)
      // só são incluídos quando o usuário habilitou "Permitir Módulos Longos".
      // O limite 2840mm é o mesmo usado em ledEngine.ts (inclui IF-5 do BLAZE embutir 2835mm).
      if (!allowLongModules && m.length > 2840) continue;
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
 * Busca ótima para preencher um segmento reto com módulos ML e/ou IF.
 *
 * Estratégia: minimizar número de peças primeiro.
 * Para cada N (1, 2, 3, ...), encontra a melhor combinação com exatamente N peças.
 * Escolhe o menor N tal que o desvio seja <= MAX_DESVIO (800mm).
 * Se nenhum N satisfaz, usa o N que minimiza o desvio.
 *
 * Estágio 2: se ainda sobrar espaço, adiciona no máximo 1 módulo pequeno (1 barra).
 */
function findBestSegmentOptimal(
  profileEntry: ProfileVariant,
  availableLength: number,
  allowLongModules: boolean,
  allowFractionalBars: boolean,
  moduleTypeFilter: "ML" | "IF" | "both" = "both",
  allowSmallModules = true,
  prioritizeCloseness = false,
  optimizeModuleCount = false,
  adjustToLarger = false,
): StraightSegment {
  const empty: StraightSegment = {
    availableLength,
    pieces: [],
    module: null,
    moduleQty: 0,
    actualLength: 0,
  };

  if (availableLength <= 0) return empty;

  const allMods = collectAllModules(profileEntry, allowLongModules, allowFractionalBars, moduleTypeFilter);
  if (allMods.length === 0) return empty;

  // Separar módulos grandes (>=2 barras) e pequenos (1 barra)
  const largeMods = allMods.filter(m => m.length >= MIN_2BAR_LENGTH);
  const smallMods = allMods.filter(m => m.length < MIN_2BAR_LENGTH);

  if (largeMods.length === 0) {
    // Sem módulos grandes: usar apenas pequenos
    const bestSmall = smallMods.find(m => m.length <= availableLength);
    if (!bestSmall) return empty;
    return {
      availableLength,
      pieces: [{ sku: bestSmall.sku, length: bestSmall.length, bars: bestSmall.bars, qty: 1 }],
      module: { sku: bestSmall.sku, length: bestSmall.length, bars: bestSmall.bars },
      moduleQty: 1,
      actualLength: bestSmall.length,
    };
  }

  // Desvio máximo aceitável para considerar uma solução "boa o suficiente"
  // Usamos o comprimento do menor módulo grande: aceitar perder até 1 módulo de 2 barras
  const smallestLarge = largeMods[largeMods.length - 1].length;
  const MAX_DESVIO = smallestLarge; // aceitar desvio de até 1 módulo de 2 barras

  // Para cada número de peças N = 1, 2, 3, ..., MAX_N:
  // encontrar a combinação de N peças que maximiza o comprimento sem ultrapassar availableLength
  const MAX_N = 8; // máximo de peças grandes por segmento
  const GRAN = 5;
  const longestModule = allMods[0]?.length ?? 0;
  const searchLength = adjustToLarger ? availableLength + longestModule : availableLength;
  const maxSlots = Math.floor(searchLength / GRAN);
  const MAX_SLOTS = Math.min(maxSlots, 50000);

  // DP com estado (slots, numPecas) → comprimento máximo
  // Para eficiência, rodamos o DP uma vez e guardamos dpLen[i] e dpPcs[i]
  const dpLen = new Int32Array(MAX_SLOTS + 1).fill(-1);
  const dpPcs = new Int16Array(MAX_SLOTS + 1).fill(0x7fff);
  const from = new Int16Array(MAX_SLOTS + 1).fill(-1);
  dpLen[0] = 0;
  dpPcs[0] = 0;

  for (let i = 1; i <= MAX_SLOTS; i++) {
    for (let mi = 0; mi < largeMods.length; mi++) {
      const mod = largeMods[mi];
      const slots = Math.round(mod.length / GRAN);
      if (slots > i) continue;
      const prevLen = dpLen[i - slots];
      if (prevLen < 0) continue;
      const prevPcs = dpPcs[i - slots];
      if (prevPcs >= MAX_N) continue; // limitar número de peças
      const candLen = prevLen + mod.length;
      const candPcs = prevPcs + 1;
      // Critério: minimizar peças; desempate: maximizar comprimento
      if (candPcs < dpPcs[i] || (candPcs === dpPcs[i] && candLen > dpLen[i])) {
        dpLen[i] = candLen;
        dpPcs[i] = candPcs;
        from[i] = mi;
      }
    }
  }

  // Encontrar o estado com menor número de peças e desvio aceitável
  // Percorrer do estado com maior comprimento para o menor
  // Escolher: menor peças, com desvio <= MAX_DESVIO
  // Se não houver, escolher o de menor desvio (mais comprimento)
  let bestSlots = -1;
  let bestLen = 0;
  let bestPcs = 0x7fff;
  let bestDesvio = availableLength; // desvio da melhor solução encontrada

  for (let i = MAX_SLOTS; i >= 0; i--) {
    const l = dpLen[i];
    const p = dpPcs[i];
    if (l < 0) continue;
    const signedDeviation = availableLength - l;
    if (!adjustToLarger && signedDeviation < 0) continue;
    if (adjustToLarger && l < availableLength) continue;
    const desvio = Math.abs(signedDeviation);
    if (optimizeModuleCount) {
      if (
        desvio <= MAX_DESVIO &&
        (p < bestPcs || (p === bestPcs && desvio < bestDesvio))
      ) {
        bestDesvio = desvio;
        bestPcs = p;
        bestLen = l;
        bestSlots = i;
      } else if (bestSlots < 0 && desvio < bestDesvio) {
        bestDesvio = desvio;
        bestPcs = p;
        bestLen = l;
        bestSlots = i;
      }
    } else if (prioritizeCloseness || adjustToLarger) {
      // Modo formatos geométricos: priorizar menor desvio absoluto, depois menos peças
      if (desvio < bestDesvio || (desvio === bestDesvio && p < bestPcs)) {
        bestDesvio = desvio;
        bestPcs = p;
        bestLen = l;
        bestSlots = i;
      }
    } else {
      if (desvio <= MAX_DESVIO) {
        // Solução aceitável: preferir menos peças, depois maior comprimento
        if (p < bestPcs || (p === bestPcs && l > bestLen)) {
          bestPcs = p;
          bestLen = l;
          bestSlots = i;
          bestDesvio = desvio;
        }
      } else if (bestSlots < 0) {
        // Nenhuma solução aceitável ainda: guardar a de menor desvio
        if (l > bestLen) {
          bestLen = l;
          bestPcs = p;
          bestSlots = i;
          bestDesvio = desvio;
        }
      }
    }
  }


  if (bestSlots < 0) return empty;

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
  // Desabilitado quando allowSmallModules=false (formatos Quadrado e Retangular)
  const remaining = availableLength - bestLen;
  if (allowSmallModules && remaining > 0 && smallMods.length > 0) {
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

type EndCappedSegment = {
  ifModule: { sku: string; length: number; bars: number; type: "IF" };
  mlSegment: StraightSegment;
  actualLength: number;
  deviation: number;
  totalPieces: number;
};

function countSegmentPieces(segment: StraightSegment): number {
  return segment.pieces.reduce((sum, piece) => sum + piece.qty, 0);
}

function expandSegmentModules(segment: StraightSegment, type: "ML" | "IF" = "ML"): ShapeAssemblyModule[] {
  return segment.pieces.flatMap(piece => Array.from({ length: piece.qty }, () => ({
    sku: piece.sku,
    type,
    length: piece.length,
    bars: piece.bars,
  })));
}

function cornerAssemblyModule(corner: ResolvedShapeCorner): ShapeAssemblyModule {
  return {
    sku: corner.sku,
    type: "CORNER",
    length: corner.lengthLong,
    bars: corner.barsLong + corner.barsShort,
  };
}

function endCappedModules(segment: EndCappedSegment, corner: ResolvedShapeCorner, reverse = false): ShapeAssemblyModule[] {
  const modules: ShapeAssemblyModule[] = [
    cornerAssemblyModule(corner),
    ...expandSegmentModules(segment.mlSegment),
    { sku: segment.ifModule.sku, type: "IF", length: segment.ifModule.length, bars: segment.ifModule.bars },
  ];
  return reverse ? modules.reverse() : modules;
}

function findBestEndCappedSegment(
  profileEntry: ProfileVariant,
  availableLength: number,
  allowLongModules: boolean,
  allowFractionalBars: boolean,
  options: { optimizeModuleCount?: boolean; adjustToLarger?: boolean; requiredIfSku?: string } = {},
): EndCappedSegment | null {
  // When allowFractionalBars is true, we allow small (1-bar) modules in the ML segment
  const allowSmallInMl = allowFractionalBars;
  if (availableLength <= 0) return null;

  // Preferir IFs de 2+ barras; usar IF de 1 barra como fallback quando é a única opção disponível
  const allIfMods = collectAllModules(profileEntry, allowLongModules, allowFractionalBars, "IF")
    .filter(m => (options.adjustToLarger || m.length <= availableLength) && (!options.requiredIfSku || m.sku === options.requiredIfSku));
  if (allIfMods.length === 0) return null;
  const ifMods2Plus = allIfMods.filter(m => m.bars >= 2);
  const ifMods = ifMods2Plus.length > 0 ? ifMods2Plus : allIfMods;

  const largeMods = collectAllModules(profileEntry, allowLongModules, allowFractionalBars, "both")
    .filter(m => m.length >= MIN_2BAR_LENGTH);
  const maxDesvio = largeMods.length > 0
    ? largeMods[largeMods.length - 1].length
    : availableLength;

  let bestAcceptable: EndCappedSegment | null = null;
  let bestFallback: EndCappedSegment | null = null;

  for (const ifMod of ifMods) {
    if (!options.adjustToLarger && ifMod.length > availableLength) continue;

    const remainingForMl = availableLength - ifMod.length;
    const mlSegment = findBestSegmentOptimal(
      profileEntry,
      remainingForMl,
      allowLongModules,
      allowFractionalBars,
      "ML",
      allowSmallInMl, // permitir módulos de 1 barra quando medidas quebradas está ativo
      true, // priorizar proximidade da medida solicitada
      options.optimizeModuleCount ?? false,
      options.adjustToLarger ?? false,
    );
    const actualLength = ifMod.length + mlSegment.actualLength;
    const signedDeviation = availableLength - actualLength;
    if (!options.adjustToLarger && signedDeviation < 0) continue;
    if (options.adjustToLarger && actualLength < availableLength) continue;
    const deviation = Math.abs(signedDeviation);

    const candidate: EndCappedSegment = {
      ifModule: { ...ifMod, type: "IF" },
      mlSegment,
      actualLength,
      deviation,
      totalPieces: 1 + countSegmentPieces(mlSegment),
    };

    if (deviation <= maxDesvio) {
      // Modo por quantidade: menos peças dentro da tolerância. Padrão: menor desvio.
      if (
        !bestAcceptable ||
        (options.optimizeModuleCount
          ? candidate.totalPieces < bestAcceptable.totalPieces ||
            (candidate.totalPieces === bestAcceptable.totalPieces && candidate.deviation < bestAcceptable.deviation)
          : candidate.deviation < bestAcceptable.deviation ||
            (candidate.deviation === bestAcceptable.deviation && candidate.totalPieces < bestAcceptable.totalPieces))
      ) {
        bestAcceptable = candidate;
      }
    } else if (
      !bestFallback ||
      candidate.deviation < bestFallback.deviation ||
      (candidate.deviation === bestFallback.deviation && candidate.totalPieces < bestFallback.totalPieces)
    ) {
      bestFallback = candidate;
    }
  }

  return bestAcceptable ?? bestFallback;
}

function findBestMatchedEndCaps(
  profileEntry: ProfileVariant,
  firstLength: number,
  secondLength: number,
  allowLongModules: boolean,
  allowFractionalBars: boolean,
  options: { optimizeModuleCount?: boolean; adjustToLarger?: boolean },
): [EndCappedSegment, EndCappedSegment] | null {
  const ifSkus = collectAllModules(profileEntry, allowLongModules, allowFractionalBars, "IF").map(module => module.sku);
  let best: { pair: [EndCappedSegment, EndCappedSegment]; deviation: number; pieces: number } | null = null;
  for (const sku of ifSkus) {
    const first = findBestEndCappedSegment(profileEntry, firstLength, allowLongModules, allowFractionalBars, { ...options, requiredIfSku: sku });
    const second = findBestEndCappedSegment(profileEntry, secondLength, allowLongModules, allowFractionalBars, { ...options, requiredIfSku: sku });
    if (!first || !second) continue;
    const candidate = {
      pair: [first, second] as [EndCappedSegment, EndCappedSegment],
      deviation: first.deviation + second.deviation,
      pieces: first.totalPieces + second.totalPieces,
    };
    if (!best || (options.optimizeModuleCount
      ? candidate.pieces < best.pieces || (candidate.pieces === best.pieces && candidate.deviation < best.deviation)
      : candidate.deviation < best.deviation || (candidate.deviation === best.deviation && candidate.pieces < best.pieces))) {
      best = candidate;
    }
  }
  return best?.pair ?? null;
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

  const profileEntry = getActiveCatalog()[profileCode];
  if (!profileEntry) return null;
  const corner = resolveShapeCorner(profileCode, profileEntry, driverParams);
  if (!corner) return null;

  const allowLongModules = driverParams?.allowLongModules ?? false;
  const allowFractionalBars = driverParams?.allowFractionalBars ?? false;
  const optimizeModuleCount = driverParams?.optimizeModuleCount ?? false;
  const adjustToLarger = driverParams?.adjustToLarger ?? false;
  const allowMixedIF = driverParams?.allowMixedIF ?? false;
  const cornerLen = corner.lengthLong; // 1x1 é quadrado, ambos os lados iguais

  // Comprimento disponível para módulos retos em cada lado
  const availH = sideH - cornerLen;
  const availV = sideV - cornerLen;

  let segH: EndCappedSegment | null;
  let segV: EndCappedSegment | null;
  const optimizationOptions = { optimizeModuleCount, adjustToLarger };
  if (allowMixedIF) {
    segH = findBestEndCappedSegment(profileEntry, availH, allowLongModules, allowFractionalBars, optimizationOptions);
    segV = findBestEndCappedSegment(profileEntry, availV, allowLongModules, allowFractionalBars, optimizationOptions);
  } else {
    const matched = findBestMatchedEndCaps(profileEntry, availH, availV, allowLongModules, allowFractionalBars, optimizationOptions);
    segH = matched?.[0] ?? null;
    segV = matched?.[1] ?? null;
  }
  // Formato L sempre possui duas pontas abertas e, portanto, exatamente dois IFs.
  if (!segH || !segV) return null;

  const actualH = cornerLen + segH.actualLength;
  const actualV = cornerLen + segV.actualLength;

  // Composição em L: exatamente 1 IF na extremidade de cada lado.

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

  // Neste ponto, pelo menos um de segH ou segV não é null (o caso ambos null já foi tratado acima)
  // e o caso de um ser null com availX > 0 também já foi tratado.
  // Portanto: se segH é null, availH <= 0 (canto sozinho horizontal)
  //           se segV é null, availV <= 0 (canto sozinho vertical)

  const summaryLines: string[] = [
    `Formato L: ${actualH}mm × ${actualV}mm`,
    `1× canto ${corner.sku} (${cornerLen}mm)`,
  ];

  if (segH) {
    const hIfDriver = driverParams ? calcPieceDriver(segH.ifModule.bars, driverParams) : undefined;
    pieces.push({
      sku: segH.ifModule.sku,
      quantity: 1,
      description: `IF ${segH.ifModule.bars} barras (${segH.ifModule.length}mm) — extremidade horizontal`,
      length: segH.ifModule.length,
      type: "STRAIGHT_IF",
      bars: segH.ifModule.bars,
      driver: hIfDriver,
    });
    summaryLines.push(`1× IF ${segH.ifModule.sku} (${segH.ifModule.length}mm) — extremidade horizontal`);
    for (const sp of segH.mlSegment.pieces) {
      const hDriver = driverParams ? calcPieceDriver(sp.bars, driverParams) : undefined;
      const hDesc = sp.qty > 1
        ? `${sp.qty}× ML ${sp.bars} barras (${sp.length}mm) — horizontal`
        : `ML ${sp.bars} barras (${sp.length}mm) — horizontal`;
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
      summaryLines.push(`${sp.qty}× ML ${sp.sku} (${sp.length}mm) — horizontal`);
    }
  }
  if (segV) {
    const vIfDriver = driverParams ? calcPieceDriver(segV.ifModule.bars, driverParams) : undefined;
    const existingVerticalIf = pieces.find(p => p.sku === segV!.ifModule.sku && p.type === "STRAIGHT_IF");
    if (existingVerticalIf) {
      existingVerticalIf.quantity += 1;
      existingVerticalIf.description = `IF ${segV.ifModule.bars} barras (${segV.ifModule.length}mm) — extremidades horizontal e vertical`;
    } else {
      pieces.push({
        sku: segV.ifModule.sku,
        quantity: 1,
        description: `IF ${segV.ifModule.bars} barras (${segV.ifModule.length}mm) — extremidade vertical`,
        length: segV.ifModule.length,
        type: "STRAIGHT_IF",
        bars: segV.ifModule.bars,
        driver: vIfDriver,
      });
    }
    summaryLines.push(`1× IF ${segV.ifModule.sku} (${segV.ifModule.length}mm) — extremidade vertical`);
    for (const sp of segV.mlSegment.pieces) {
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
      summaryLines.push(`${sp.qty}× ML ${sp.sku} (${sp.length}mm) — vertical`);
    }
  }
  const summary = summaryLines.join("\n") + "\n";

  // Comprimento total = soma dos dois lados realizados (já incluem canto + retos + cabeceira)
  const totalLengthMm = actualH + actualV;

  return {
    shape: "L_SHAPE",
    dimensions: [actualH, actualV],
    requestedDimensions: [sideH, sideV],
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
    assemblyEdges: [
      { id: "horizontal", label: "Horizontal", requestedLength: sideH, achievedLength: actualH, modules: endCappedModules(segH, corner) },
      { id: "vertical", label: "Vertical", requestedLength: sideV, achievedLength: actualV, modules: endCappedModules(segV, corner) },
    ],
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

  const profileEntry = getActiveCatalog()[profileCode];
  if (!profileEntry) return null;
  const corner = resolveShapeCorner(profileCode, profileEntry, driverParams);
  if (!corner) return null;

  const allowLongModules = driverParams?.allowLongModules ?? false;
  const allowFractionalBars = driverParams?.allowFractionalBars ?? false;
  const optimizeModuleCount = driverParams?.optimizeModuleCount ?? false;
  const adjustToLarger = driverParams?.adjustToLarger ?? false;
  const cornerLen = corner.lengthLong;

  // Comprimento disponível para módulos retos entre os dois cantos opostos
  // Cada lado = canto + reto(s) + canto → disponível = side - 2 × cornerLen
  const availPerSide = side - 2 * cornerLen;

  const seg = findBestSegmentOptimal(profileEntry, availPerSide, allowLongModules, allowFractionalBars, "ML", allowFractionalBars, true, optimizeModuleCount, adjustToLarger);

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

  // Módulos retos ML (4 lados, algoritmo DP — apenas ML + cantos no quadrado)
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

  // Comprimento total = 4 lados completos (cada lado = 2 cantos + retos)
  // actualSide = 2 * cornerLen + seg.actualLength
  const totalLengthMm = 4 * actualSide;
  const squareEdgeModules = [cornerAssemblyModule(corner), ...expandSegmentModules(seg), cornerAssemblyModule(corner)];

  return {
    shape: "SQUARE",
    dimensions: [actualSide, actualSide],
    requestedDimensions: [side, side],
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
    assemblyEdges: ["Superior", "Direita", "Inferior", "Esquerda"].map((label, index) => ({
      id: `side-${index + 1}`,
      label,
      requestedLength: side,
      achievedLength: actualSide,
      modules: squareEdgeModules.map(module => ({ ...module })),
    })),
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

  const profileEntry = getActiveCatalog()[profileCode];
  if (!profileEntry) return null;
  const corner = resolveShapeCorner(profileCode, profileEntry, driverParams);
  if (!corner) return null;

  const allowLongModules = driverParams?.allowLongModules ?? false;
  const allowFractionalBars = driverParams?.allowFractionalBars ?? false;
  const optimizeModuleCount = driverParams?.optimizeModuleCount ?? false;
  const adjustToLarger = driverParams?.adjustToLarger ?? false;
  const cornerLen = corner.lengthLong;

  // Lado curto (altura): canto + reto(s) + canto
  // Lado longo (largura): canto + reto(s) + canto
  const availWidth = width - 2 * cornerLen;
  const availHeight = height - 2 * cornerLen;

  const segWidth = findBestSegmentOptimal(profileEntry, availWidth, allowLongModules, allowFractionalBars, "ML", allowFractionalBars, true, optimizeModuleCount, adjustToLarger);
  const segHeight = findBestSegmentOptimal(profileEntry, availHeight, allowLongModules, allowFractionalBars, "ML", allowFractionalBars, true, optimizeModuleCount, adjustToLarger);

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

  // Módulos retos ML nos lados largos (2 lados, algoritmo DP — apenas ML no retângulo)
  const summaryWidthLines: string[] = [];
  for (const sp of segWidth.pieces) {
    const spDriver = driverParams ? calcPieceDriver(sp.bars, driverParams) : undefined;
    const totalQty = 2 * sp.qty;
    const desc = sp.qty > 1
      ? `${sp.qty}× ML ${sp.bars} barras (${sp.length}mm) por lado largo`
      : `ML ${sp.bars} barras (${sp.length}mm) — lados largos`;
    // Verificar se já existe peça com mesmo SKU
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

  // Módulos retos ML nos lados curtos (2 lados, algoritmo DP — apenas ML no retângulo)
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
  const widthModules = [cornerAssemblyModule(corner), ...expandSegmentModules(segWidth), cornerAssemblyModule(corner)];
  const heightModules = [cornerAssemblyModule(corner), ...expandSegmentModules(segHeight), cornerAssemblyModule(corner)];

  return {
    shape: "RECTANGLE",
    dimensions: [actualWidth, actualHeight],
    requestedDimensions: [width, height],
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
    assemblyEdges: [
      { id: "top", label: "Superior", requestedLength: width, achievedLength: actualWidth, modules: widthModules.map(module => ({ ...module })) },
      { id: "right", label: "Direita", requestedLength: height, achievedLength: actualHeight, modules: heightModules.map(module => ({ ...module })) },
      { id: "bottom", label: "Inferior", requestedLength: width, achievedLength: actualWidth, modules: widthModules.map(module => ({ ...module })) },
      { id: "left", label: "Esquerda", requestedLength: height, achievedLength: actualHeight, modules: heightModules.map(module => ({ ...module })) },
    ],
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

  const profileEntry = getActiveCatalog()[profileCode];
  if (!profileEntry) return null;
  const corner = resolveShapeCorner(profileCode, profileEntry, driverParams);
  if (!corner) return null;

  const allowLongModules = driverParams?.allowLongModules ?? false;
  const allowFractionalBars = driverParams?.allowFractionalBars ?? false;
  const optimizeModuleCount = driverParams?.optimizeModuleCount ?? false;
  const adjustToLarger = driverParams?.adjustToLarger ?? false;
  const cornerLen = corner.lengthLong;

  // Comprimento disponível para ML em cada segmento:
  // - Lados de profundidade: canto + ML (abertura livre, sem canto na ponta)
  //   disponível = depth - cornerLen
  // - Base: canto + ML + canto
  //   disponível = width - 2 * cornerLen
  const availDepth = depth - cornerLen;
  const availBase = width - 2 * cornerLen;

  const segDepth = findBestEndCappedSegment(
    profileEntry,
    availDepth,
    allowLongModules,
    allowFractionalBars,
    { optimizeModuleCount, adjustToLarger },
  );
  const segBase = findBestSegmentOptimal(
    profileEntry,
    availBase,
    allowLongModules,
    allowFractionalBars,
    "ML",
    allowFractionalBars, // permitir módulos de 1 barra quando medidas quebradas está ativo
    true, // priorizar proximidade da medida solicitada
    optimizeModuleCount,
    adjustToLarger,
  );
  if (!segDepth) return null;

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

  const depthIfDriver = driverParams ? calcPieceDriver(segDepth.ifModule.bars, driverParams) : undefined;
  pieces.push({
    sku: segDepth.ifModule.sku,
    quantity: 2,
    description: `IF ${segDepth.ifModule.bars} barras (${segDepth.ifModule.length}mm) — extremidades do U`,
    length: segDepth.ifModule.length,
    type: "STRAIGHT_IF",
    bars: segDepth.ifModule.bars,
    driver: depthIfDriver,
  });

  const summaryDepthLines: string[] = [
    `2× IF ${segDepth.ifModule.sku} (${segDepth.ifModule.length}mm) — extremidades abertas`,
  ];
  for (const sp of segDepth.mlSegment.pieces) {
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

  // ML da base (apenas ML na base do U — entre os dois cantos)
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
  const baseModules = [cornerAssemblyModule(corner), ...expandSegmentModules(segBase), cornerAssemblyModule(corner)];

  return {
    shape: "U_SHAPE",
    dimensions: [actualBase, actualDepth],
    requestedDimensions: [width, depth],
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
    assemblyEdges: [
      { id: "left-depth", label: "Profundidade esquerda", requestedLength: depth, achievedLength: actualDepth, modules: endCappedModules(segDepth, corner, true) },
      { id: "base", label: "Base", requestedLength: width, achievedLength: actualBase, modules: baseModules },
      { id: "right-depth", label: "Profundidade direita", requestedLength: depth, achievedLength: actualDepth, modules: endCappedModules(segDepth, corner) },
    ],
  };
}

/**
 * Verifica se um perfil suporta formatos EM L.
 */
export function profileSupportsLShape(profileCode: string): boolean {
  return getLConfig(profileCode) !== null;
}
