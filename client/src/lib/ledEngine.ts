// LED Engine v1.6
// Regras de módulos:
//   IN (Módulo Inteiro): apenas quando a composição é uma peça única (≤ 5 barras; ≤ 6 com módulos longos)
//   IF + ML: para linhas longas — sempre 2 IFs iguais nas pontas + MLs no meio
//
// Regras de driver remoto:
//   Sempre remoto: todos os de embutir, BLAZE H D1+D2, SKYLINE Pendente, MINI BLAZE, SHARP, SOFT
//   EASY H PLUS: driver sempre integrado ao perfil (nunca remoto)
//   Demais: integrado ao perfil ou remoto conforme projeto
//
// 36W: Stripflex dupla (25V, 350mA) OU Stripline única (75V, 250mA)
//   Stripline: apenas barras inteiras (1, 2, 3, 4, 5) — sem medidas fracionadas

import { LED_CATALOG, MODULE_TYPE_LABELS } from "./ledCatalog";
import type { InstallType } from "./ledCatalog";
import type { SheetDriver, DriverSelectionContext } from "./driverSelector";
import { selectDriverFromSheet, selectDriverFallback, calcVOut, splitDriverForDualSimultaneous } from "./driverSelector";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Power = 18 | 26 | 36;
export type CCT = "2700K" | "3000K" | "4000K" | "5000K";
export type Voltage = "220Vac" | "Bivolt";
export type Application = "D1" | "D2" | "D1+D2";
export type ModuleType = "IN" | "IF" | "ML";
export type DiffuserType = "DA" | "DB" | "DC";
export type StripMethod = "STRIPFLEX" | "STRIPLINE";

export type { InstallType };

export interface DriverSpec {
  code?: string;       // EQ00346 (do Google Sheets)
  model: string;
  power: number;
  current: string;
  quantity: number;
  vOut?: number;       // tensão de saída calculada
  /** Drivers adicionais para combos (ex: Stripline 3 barras = 44W + 65W) */
  combo?: Array<{ code: string; model: string; quantity: number }>;
}

/** Driver associado a um SKU específico — 1 driver por peça/SKU individual */
export interface SkuDriverEntry {
  sku: string;
  quantity: number;
  driver: DriverSpec;
  /** Barras por peça (barsTotal do módulo individual) */
  barsPerPiece: number;
}

export interface CompositionItem {
  sku: string;
  moduleType: ModuleType;
  moduleTypeLabel: string;
  length: number;
  barras: number;
  /** Barras de UMA peça individual (barras × barsPerSection) — usado para calcular o driver */
  barsPerModule: number;
  /** Barras totais acumuladas (barsPerModule × quantity) — apenas para exibição */
  barsTotal: number;
  quantity: number;
  /** Driver associado a este SKU — calculado pelas barras de UMA peça individual */
  driverPerSku: DriverSpec;
}

export interface CompositionResult {
  /** Drivers combinados para D1+D2 conjunto (não independente) */
  combinedDrivers?: SkuDriverEntry[];
  profileCode: string;
  profileName: string;
  installType: InstallType;
  application: Application;
  powerD1: Power;
  powerD2: Power;
  cct: CCT;
  voltage: Voltage;
  stripMethod: StripMethod;
  allowLongModules: boolean;
  independentLighting: boolean;
  forcedIndependent: boolean;
  isRemoteDriver: boolean;
  requestedLength: number;
  realizedLength: number;
  remainingLength: number;
  composition: CompositionItem[];
  totalBars: number;
  /** Lista consolidada de drivers D1 (por SKU) */
  driversD1: SkuDriverEntry[];
  /** Lista consolidada de drivers D2 (por SKU) — apenas D1+D2 independente */
  driversD2: SkuDriverEntry[];
  stripflexName: string;
  engineeringNotes: string[];
  hasAlert: boolean;
  alertMessage?: string;
  compositionMode: "IN_SINGLE" | "IF_ML_LINE";
  diffuserD1?: DiffuserType;
  diffuserD2?: DiffuserType;
}

export interface ConfigInput {
  profileCode: string;
  application: Application;
  powerD1: Power;
  powerD2?: Power;
  cct: CCT;
  voltage: Voltage;
  stripMethod?: StripMethod;
  totalLength: number;
  allowLongModules: boolean;
  independentLighting: boolean;
  diffuserD1?: DiffuserType;
  diffuserD2?: DiffuserType;
  /** Lista de drivers do Google Sheets (opcional — usa fallback se ausente) */
  sheetDrivers?: SheetDriver[];
  /**
   * Quando false (padrão), usa apenas módulos com barras inteiras (1, 2, 3, 4, 5...).
   * Quando true, libera módulos com barras decimais (1.1, 1.2, 3.4, 4.2 etc).
   */
  allowFractional?: boolean;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const BARS_PER_SECTION_STRIPFLEX: Record<Power, number> = {
  18: 1,  // Fileira Simples · 350mA · 25V
  26: 1,  // Fileira Simples · 500mA · 25V
  36: 2,  // Fileira Dupla   · 350mA · 25V — Método Barra Dupla
};

const CURRENT_TYPE: Record<Power, "350mA" | "500mA" | "250mA"> = {
  18: "350mA",
  26: "500mA",
  36: "350mA", // padrão Stripflex; Stripline usa 250mA
};

/**
 * Limite máximo de barras para uso de IN como peça única.
 */
export const IN_MAX_BARS_STANDARD = 5;
export const IN_MAX_BARS_LONG = 6;

/** Barras inteiras válidas para Stripline (75V) */
const STRIPLINE_VALID_BARS = [1, 2, 3, 4, 5];

// ─── Regras de Driver Remoto ──────────────────────────────────────────────────

/**
 * Determina se o driver deve ser instalado em ponto remoto.
 * Regras:
 * - Embutir: sempre remoto
 * - BLAZE H (LLP-6060): remoto quando D1+D2
 * - SKYLINE Pendente (LLP-4536): sempre remoto
 * - MINI BLAZE (LLP-3336, LLS-3336): sempre remoto
 * - SHARP (LLP-4451, LLA-4451): sempre remoto
 * - SOFT (LLP-4452): sempre remoto
 * - EASY H PLUS (LLP-4450, LLA-4450): NUNCA remoto (sempre integrado)
 */
export function isRemoteDriverRequired(
  profileCode: string,
  installType: InstallType,
  application: Application
): boolean {
  // Embutir: sempre remoto
  if (installType === "EMBUTIR") return true;

  // EASY H PLUS: nunca remoto
  if (profileCode === "LLP-4450" || profileCode === "LLA-4450") return false;

  // BLAZE H: remoto apenas quando D1+D2
  if (profileCode === "LLP-6060" && application === "D1+D2") return true;

  // SKYLINE Pendente: sempre remoto
  if (profileCode === "LLP-4536") return true;

  // MINI BLAZE: sempre remoto
  if (profileCode === "LLP-3336" || profileCode === "LLS-3336") return true;

  // SHARP: sempre remoto
  if (profileCode === "LLP-4451" || profileCode === "LLA-4451") return true;

  // SOFT: sempre remoto
  if (profileCode === "LLP-4452") return true;

  return false;
}

// ─── Nome da barra Stripflex ──────────────────────────────────────────────────

export function getStripflexName(cct: CCT): string {
  return `Stripflex 562,5 x 10mm 36L ${cct}`;
}

export function getStriplineName(cct: CCT): string {
  return `Stripline 562,5 x 15mm 105L ${cct}`;
}

// ─── Seleção de Drivers por SKU ───────────────────────────────────────────────

/**
 * Seleciona o driver para um único SKU usando a lógica definitiva v00 (23/04/2026).
 * A planilha Google Sheets está desabilitada por enquanto — toda seleção usa selectDriverFallback.
 * Cada SKU recebe seu próprio driver — nunca compartilhado entre SKUs.
 */
function selectDriverForBars(
  totalBars: number,
  power: Power,
  voltage: Voltage,
  stripMethod: StripMethod,
  _sheetDrivers?: SheetDriver[],
  driverContext?: Partial<DriverSelectionContext>
): DriverSpec {
  // Lógica v01: sempre usar o fallback determinístico (planilha desabilitada)
  const d = selectDriverFallback(totalBars, power, voltage, stripMethod, driverContext?.allowLongModules);
  return {
    code: d.code,
    model: d.model,
    power: parseInt(d.model.match(/(\d+)W/i)?.[1] ?? "0"),
    current: d.current,
    quantity: d.quantity, // preserva a quantidade retornada pelo fallback (ex: 26W CERTADRIVE = qty de barras)
    vOut: d.vOut,
    // Propagar combo para drivers compostos (ex: Stripline 3 barras = 44W + 65W)
    ...(d.combo ? { combo: d.combo } : {}),
  };
}

/**
 * Gera a lista de SkuDriverEntry para uma composição.
 * REGRA DEFINITIVA: 1 driver por peça/SKU individual.
 * O driver é calculado pelas barras daquela peça (barsTotal), nunca pelo total acumulado.
 * Quantidade de drivers = quantidade de peças × 1 driver por peça.
 */
function buildSkuDriverList(
  composition: CompositionItem[],
  power: Power,
  voltage: Voltage,
  stripMethod: StripMethod,
  sheetDrivers?: SheetDriver[],
  driverContext?: Partial<DriverSelectionContext>,
  dualSimultaneous = false  // D1+D2 sem acendimento independente: dobrar barras para dimensionar o driver
): SkuDriverEntry[] {
  return composition.map(item => {
    // Quando D1+D2 simultâneo, as duas fileiras compartilham o mesmo driver
    // → usar barsPerModule × 2 para dimensionar corretamente
    const effectiveBars = dualSimultaneous ? item.barsPerModule * 2 : item.barsPerModule;

    // Verificar se precisa de split (barras efetivas acima do limite da tabela)
    let driver: DriverSpec;
    if (dualSimultaneous) {
      const splitResult = splitDriverForDualSimultaneous(effectiveBars, power, voltage, stripMethod);
      if (splitResult) {
        // Converter SelectedDriver para DriverSpec
        driver = {
          code: splitResult.code,
          model: splitResult.model,
          power: power,
          current: splitResult.current,
          quantity: splitResult.quantity,
          vOut: splitResult.vOut,
          ...(splitResult.combo ? { combo: splitResult.combo } : {}),
        };
      } else {
        driver = selectDriverForBars(effectiveBars, power, voltage, stripMethod, sheetDrivers, driverContext);
      }
    } else {
      driver = selectDriverForBars(effectiveBars, power, voltage, stripMethod, sheetDrivers, driverContext);
    }

    return {
      sku: item.sku,
      quantity: item.quantity,
      driver,
      barsPerPiece: effectiveBars, // barras efetivas usadas para dimensionar o driver
    };
  });
}

// ─── Helpers de módulos ───────────────────────────────────────────────────────

interface RawModule {
  type: ModuleType;
  barras: number;
  length: number;
  sku: string;
}

/**
 * Retorna os módulos disponíveis para um perfil, tipo e configuração.
 * Para 26W: exclui módulos nos gaps inválidos da tabela DRIVER_LOOKUP
 *   Gap 1: 1.61–1.99 (sem driver entre 1x e 2x Certadrive)
 *   Gap 2: 3.21–3.99 (sem driver entre 3x Certadrive e OSRAM)
 */
// Mínimo de barras para módulos usados em composição IF/ML (evitar emendas muito próximas)
const MIN_BARS_FOR_COMPOSITION = 2;

function getModules(profileCode: string, type: ModuleType, allowLongModules: boolean, stripMethod?: StripMethod, power?: Power, forComposition = false, allowFractional = false): RawModule[] {
  const profile = LED_CATALOG[profileCode];
  if (!profile) return [];
  const mods = profile.modules[type];
  if (!mods) return [];
  return Object.entries(mods)
    .filter(([, data]) => data.sku && data.sku !== "")
    .filter(([, data]) => allowLongModules || data.length <= 2840) // 2840mm inclui IF-5 do BLAZE embutir (2835mm)
    .filter(([barrasKey]) => {
      // Modo padrão: apenas barras inteiras; modo quebrado: libera decimais
      if (!allowFractional) {
        const b = parseFloat(barrasKey);
        if (!Number.isInteger(b)) return false;
      }
      // Stripline: apenas barras inteiras (1, 2, 3, 4, 5)
      if (stripMethod === "STRIPLINE") {
        const b = parseFloat(barrasKey);
        return STRIPLINE_VALID_BARS.includes(b);
      }
      // 26W: excluir módulos nos gaps inválidos da tabela DRIVER_LOOKUP
      // Gap 1: 1.61–1.99 (sem driver entre 1x e 2x Certadrive)
      // Gap 2: 3.21–3.99 (sem driver entre 3x Certadrive e OSRAM)
      if (power === 26) {
        const b = parseFloat(barrasKey);
        if (b > 1.6 && b < 2.0) return false; // gap 1.61–1.99
        if (b > 3.2 && b < 4.0) return false; // gap 3.21–3.99
      }
      // Composições IF/ML: excluir módulos com menos de 2 barras (evitar emendas muito próximas)
      // Módulos < 2 barras só são permitidos para IN (módulo único inteiro)
      if (forComposition && type !== "IN") {
        const b = parseFloat(barrasKey);
        if (b < MIN_BARS_FOR_COMPOSITION) return false;
      }
      return true;
    })
    .map(([barrasKey, data]) => ({
      type,
      barras: parseFloat(barrasKey),
      length: data.length,
      sku: data.sku,
    }));
}

function toCompositionItems(
  rawItems: RawModule[],
  barsPerSection: number,
  power: Power,
  voltage: Voltage,
  stripMethod: StripMethod,
  sheetDrivers?: SheetDriver[]
): CompositionItem[] {
  const skuMap = new Map<string, CompositionItem>();
  for (const item of rawItems) {
    const existing = skuMap.get(item.sku);
    if (existing) {
      existing.quantity += 1;
      existing.barsTotal += item.barras * barsPerSection; // acumula apenas para exibição
    } else {
      const barsPerModule = item.barras * barsPerSection; // barras de UMA peça
      const barsTotal = barsPerModule; // inicia com 1 peça
      skuMap.set(item.sku, {
        sku: item.sku,
        moduleType: item.type,
        moduleTypeLabel: MODULE_TYPE_LABELS[item.type],
        length: item.length,
        barras: item.barras,
        barsPerModule, // barras de UMA peça — nunca muda
        barsTotal,
        quantity: 1,
        // driver calculado pelas barras de UMA peça individual
        driverPerSku: selectDriverForBars(barsPerModule, power, voltage, stripMethod, sheetDrivers),
      });
    }
  }
  return Array.from(skuMap.values());
}

// ─── Estratégia 1: IN como peça única ────────────────────────────────────────

function tryInSingle(
  profileCode: string,
  requestedLength: number,
  power: Power,
  voltage: Voltage,
  allowLongModules: boolean,
  stripMethod: StripMethod,
  sheetDrivers?: SheetDriver[],
  allowFractional = false
): { composition: CompositionItem[]; realizedLength: number; remainingLength: number } | null {
  const inModules = getModules(profileCode, "IN", allowLongModules, stripMethod, power, false, allowFractional)
    .filter(m => m.length <= requestedLength)
    .sort((a, b) => b.length - a.length);

  if (inModules.length === 0) return null;

  const best = inModules[0];
  const barsPerSection = stripMethod === "STRIPLINE" ? 1 : BARS_PER_SECTION_STRIPFLEX[power];

  const composition = toCompositionItems([best], barsPerSection, power, voltage, stripMethod, sheetDrivers);
  const realizedLength = best.length;
  const remainingLength = requestedLength - best.length;

  return { composition, realizedLength, remainingLength };
}

// ─── Estratégia 2: IF + ML para linhas longas ────────────────────────────────

/**
 * Regra de otimização de módulos (v3.3 — Tolerância 250mm + Preferência por Limpeza):
 *
 * Para comprimentos até 5650mm:
 *   1. Testar primeiro 2x IF iguais (sem ML)
 *   2. Se a diferença (solicitado - realizado) <= 250mm → manter 2 módulos
 *   3. Se a diferença > 250mm → permitir mais módulos para aproximar melhor a medida
 *
 * Para comprimentos > 5650mm (v3.3):
 *   1. Encontrar o candidato "mais limpo": menos SKUs → menos módulos → mais próximo
 *   2. Encontrar o candidato "mais exato": mais próximo do comprimento solicitado
 *   3. Se diferença entre eles <= ONE_BAR_TOLERANCE (565mm) → preferir o mais limpo
 *   4. Caso contrário → usar o mais exato (diferença seria muito grande para ignorar)
 *
 * Regras gerais:
 *   - Nunca ultrapassar o comprimento solicitado
 *   - Entre candidatos com mesmo moduleCount, escolher o mais próximo
 *   - Minimizar variedade de SKUs
 *   - Manter IF iguais nas pontas
 */

const SHORT_LINE_THRESHOLD = 5650;  // mm — limite para aplicar regra de tolerância
const TWO_MODULE_TOLERANCE = 250;   // mm — tolerância máxima para aceitar 2 módulos
const ONE_BAR_TOLERANCE = 565;      // mm — tolerância de 1 barra para preferir solução mais limpa em linhas longas

function buildIfMlComposition(
  profileCode: string,
  requestedLength: number,
  power: Power,
  voltage: Voltage,
  allowLongModules: boolean,
  stripMethod: StripMethod,
  sheetDrivers?: SheetDriver[],
  allowFractional = false
): { composition: CompositionItem[]; realizedLength: number; remainingLength: number } | null {
  const ifModules = getModules(profileCode, "IF", allowLongModules, stripMethod, power, true, allowFractional)
    .sort((a, b) => b.length - a.length);
  const mlModules = getModules(profileCode, "ML", allowLongModules, stripMethod, power, true, allowFractional)
    .sort((a, b) => b.length - a.length);

  if (ifModules.length === 0) return null;

  const barsPerSection = stripMethod === "STRIPLINE" ? 1 : BARS_PER_SECTION_STRIPFLEX[power];

  interface Candidate {
    ifMod: RawModule;
    mlItems: RawModule[];
    realizedLength: number;
    moduleCount: number;
    skuVariety: number;
    balance: number;
  }

  const candidates: Candidate[] = [];

  for (const ifMod of ifModules) {
    const twoIfLength = 2 * ifMod.length;
    if (twoIfLength > requestedLength) continue;

    const remaining = requestedLength - twoIfLength;

    // --- Candidato A: 2x IF sem ML ---
    {
      const realizedLength = twoIfLength;
      const moduleCount = 2;
      const balance = 0; // IFs iguais = desvio zero
      const skuVariety = 1; // apenas 1 tipo de SKU (IF)
      candidates.push({ ifMod, mlItems: [], realizedLength, moduleCount, skuVariety, balance });
    }

    // --- Candidato B: 2x IF + ML (somente se sobrar comprimento) ---
    if (mlModules.length > 0 && remaining > 0) {
      const mlItems: RawModule[] = [];
      let rem = remaining;
      for (const ml of mlModules) {
        while (rem >= ml.length) {
          mlItems.push(ml);
          rem -= ml.length;
        }
      }

      if (mlItems.length > 0) {
        const realizedLength = requestedLength - rem;
        const moduleCount = 2 + mlItems.length;
        const allLengths = [ifMod.length, ifMod.length, ...mlItems.map(m => m.length)];
        const mean = allLengths.reduce((s, v) => s + v, 0) / allLengths.length;
        const balance = Math.sqrt(allLengths.reduce((s, v) => s + (v - mean) ** 2, 0) / allLengths.length);
        const skuVariety = new Set([ifMod.sku, ...mlItems.map(m => m.sku)]).size;
        candidates.push({ ifMod, mlItems, realizedLength, moduleCount, skuVariety, balance });
      }
    }
  }

  if (candidates.length === 0) return null;

  // ── Lógica de seleção v3.2 ──────────────────────────────────────────────────
  //
  // Para linhas curtas (≤ 5650mm), aplicar regra de tolerância:
  //   - Encontrar a melhor solução de 2 módulos (mais próxima sem ultrapassar)
  //   - Se diferença <= 250mm → usar 2 módulos (aceitar)
  //   - Se diferença > 250mm → permitir mais módulos para aproximar melhor
  //
  // Para linhas longas (> 5650mm):
  //   - Ordenar por: menor módulos → mais próximo → menos SKUs → menor desvio

  if (requestedLength <= SHORT_LINE_THRESHOLD) {
    // Encontrar a melhor solução de 2 módulos
    const twoModuleCandidates = candidates
      .filter(c => c.moduleCount === 2)
      .sort((a, b) => b.realizedLength - a.realizedLength); // mais próximo primeiro

    if (twoModuleCandidates.length > 0) {
      const best2 = twoModuleCandidates[0];
      const diff2 = requestedLength - best2.realizedLength;

      if (diff2 <= TWO_MODULE_TOLERANCE) {
        // Diferença aceitável: usar 2 módulos
        const rawItems: RawModule[] = [best2.ifMod, best2.ifMod, ...best2.mlItems];
        const composition = toCompositionItems(rawItems, barsPerSection, power, voltage, stripMethod, sheetDrivers);
        return { composition, realizedLength: best2.realizedLength, remainingLength: diff2 };
      }
      // Diferença > 250mm: cair no ordenamento geral abaixo (permite mais módulos)
    }
  }

   // Ordenação geral: mais próximo primeiro (independente de número de módulos)
  // Para linhas longas OU quando 2 módulos ficou muito abaixo da tolerância
  candidates.sort((a, b) => {
    // Mais próximo do comprimento solicitado (prioridade principal)
    if (b.realizedLength !== a.realizedLength) return b.realizedLength - a.realizedLength;
    // Menor número de módulos (desempate)
    if (a.moduleCount !== b.moduleCount) return a.moduleCount - b.moduleCount;
    // Menor variedade de SKUs
    if (a.skuVariety !== b.skuVariety) return a.skuVariety - b.skuVariety;
    // Menor desvio de equilíbrio
    return a.balance - b.balance;
  });
  // v3.3: Para linhas longas, verificar se o candidato "mais limpo" está suficientemente
  // próximo do "mais exato" — se sim, preferir o mais limpo (menos SKUs/módulos).
  // Tolerância proporcional: 0,2% do comprimento solicitado, mínimo 30mm, máximo 100mm.
  // Isso captura diferenças mínimas (ex: 30mm em 42330mm) sem sacrificar precisão em linhas curtas.
  let best = candidates[0];
  if (requestedLength > SHORT_LINE_THRESHOLD && candidates.length > 1) {
    const mostExact = candidates[0]; // já ordenado por realizedLength desc
    // Candidato mais limpo: menos SKUs → menos módulos → mais próximo
    const cleanest = [...candidates].sort((a, b) => {
      if (a.skuVariety !== b.skuVariety) return a.skuVariety - b.skuVariety;
      if (a.moduleCount !== b.moduleCount) return a.moduleCount - b.moduleCount;
      return b.realizedLength - a.realizedLength;
    })[0];
    const lengthDiff = mostExact.realizedLength - cleanest.realizedLength;
    const cleanTolerance = Math.min(100, Math.max(30, requestedLength * 0.002));
    if (lengthDiff <= cleanTolerance) {
      best = cleanest;
    }
  }
  const rawItems: RawModule[] = [best.ifMod, best.ifMod, ...best.mlItems];
  const composition = toCompositionItems(rawItems, barsPerSection, power, voltage, stripMethod, sheetDrivers);
  const remainingLength = requestedLength - best.realizedLength;

  return { composition, realizedLength: best.realizedLength, remainingLength };
}

// ─── buildComposition: orquestrador das duas estratégias ─────────────────────

export function buildComposition(
  profileCode: string,
  requestedLength: number,
  power: Power,
  voltage: Voltage,
  allowLongModules: boolean,
  stripMethod: StripMethod = "STRIPFLEX",
  sheetDrivers?: SheetDriver[],
  allowFractional = false
): {
  composition: CompositionItem[];
  realizedLength: number;
  remainingLength: number;
  compositionMode: "IN_SINGLE" | "IF_ML_LINE";
} {
  const profile = LED_CATALOG[profileCode];
  if (!profile) {
    return { composition: [], realizedLength: 0, remainingLength: requestedLength, compositionMode: "IF_ML_LINE" };
  }

  const maxBars = allowLongModules ? IN_MAX_BARS_LONG : IN_MAX_BARS_STANDARD;

  const inModulesAll = getModules(profileCode, "IN", allowLongModules, stripMethod, power, false, allowFractional);
  const largestInWithinLimit = inModulesAll
    .filter(m => m.barras <= maxBars)
    .sort((a, b) => b.length - a.length)[0];

  const isShortLine = largestInWithinLimit !== undefined && requestedLength <= largestInWithinLimit.length;

  if (isShortLine) {
    const inResult = tryInSingle(profileCode, requestedLength, power, voltage, allowLongModules, stripMethod, sheetDrivers, allowFractional);
    if (inResult) {
      return { ...inResult, compositionMode: "IN_SINGLE" };
    }
  }

  const ifMlResult = buildIfMlComposition(profileCode, requestedLength, power, voltage, allowLongModules, stripMethod, sheetDrivers, allowFractional);
  if (ifMlResult) {
    return { ...ifMlResult, compositionMode: "IF_ML_LINE" };
  }

  // Fallback: algoritmo guloso genérico
  // IF e ML com forComposition=true: excluir módulos < 2 barras (evitar emendas muito próximas)
  const allModules: RawModule[] = [
    ...getModules(profileCode, "IN", allowLongModules, stripMethod, power, false, allowFractional),
    ...getModules(profileCode, "IF", allowLongModules, stripMethod, power, true, allowFractional),
    ...getModules(profileCode, "ML", allowLongModules, stripMethod, power, true, allowFractional),
  ].sort((a, b) => b.length - a.length);

  const barsPerSection = stripMethod === "STRIPLINE" ? 1 : BARS_PER_SECTION_STRIPFLEX[power];
  const rawItems: RawModule[] = [];
  let remaining = requestedLength;
  for (const mod of allModules) {
    while (remaining >= mod.length) {
      rawItems.push(mod);
      remaining -= mod.length;
    }
  }

  const composition = toCompositionItems(rawItems, barsPerSection, power, voltage, stripMethod, sheetDrivers);
  const realizedLength = requestedLength - remaining;

  return { composition, realizedLength, remainingLength: remaining, compositionMode: "IF_ML_LINE" };
}

/**
 * Exporta selectDrivers como wrapper público para uso em testes.
 * Seleciona o driver para um número de barras, potência e tensão.
 */
export function selectDrivers(
  totalBars: number,
  power: Power,
  voltage: Voltage,
  stripMethod: StripMethod = "STRIPFLEX"
): DriverSpec[] {
  return [selectDriverForBars(totalBars, power, voltage, stripMethod)];
}

// ─── Engine Principal ─────────────────────────────────────────────────────────

export function calculateComposition(input: ConfigInput): CompositionResult {
  const {
    profileCode,
    application,
    powerD1,
    powerD2,
    cct,
    voltage,
    stripMethod = "STRIPFLEX",
    totalLength,
    allowLongModules,
    independentLighting,
    diffuserD1,
    diffuserD2,
    allowFractional = false,
  } = input;

  const profile = LED_CATALOG[profileCode];
  const profileName = profile?.name ?? profileCode;
  const installType: InstallType = profile?.installType ?? "PENDENTE";

  // Validação: aplicação não permitida para esta variante
  if (application === "D1+D2" && profile && !profile.allowD1D2) {
    throw new Error(`O perfil ${profileName} (${installType}) não suporta aplicação D1+D2. Use apenas D1 ou D2.`);
  }
  if (application === "D1" && profile && !profile.allowD1) {
    throw new Error(`O perfil ${profileName} (${installType}) não suporta aplicação D1.`);
  }
  if (application === "D2" && profile && !profile.allowD2) {
    throw new Error(`O perfil ${profileName} (${installType}) não suporta aplicação D2.`);
  }

  // Embutir: sempre D1
  const effectiveApplication: Application = installType === "EMBUTIR" ? "D1" : application;

  const effectivePowerD2: Power = (effectiveApplication === "D1+D2" ? (powerD2 ?? powerD1) : powerD1);

  // Acendimento independente forçado quando potências diferentes
  const forcedIndependent = effectiveApplication === "D1+D2" && powerD1 !== effectivePowerD2;
  // Embutir: sem acendimento independente
  const isIndependent = installType !== "EMBUTIR" && (forcedIndependent || (effectiveApplication === "D1+D2" && independentLighting));

  // Regra de driver remoto
  const isRemoteDriver = isRemoteDriverRequired(profileCode, installType, effectiveApplication);

  const engineeringNotes: string[] = [];
  let hasAlert = false;
  let alertMessage: string | undefined;

  if (forcedIndependent) {
    engineeringNotes.push(
      `⚠️ Acendimento Independente forçado: D1 (${powerD1}W) e D2 (${effectivePowerD2}W) possuem potências diferentes.`
    );
  }

  // ── Composição de módulos ──
  const { composition, realizedLength, remainingLength, compositionMode } = buildComposition(
    profileCode,
    totalLength,
    powerD1,
    voltage,
    allowLongModules,
    stripMethod,
    undefined,
    allowFractional
  );

  if (compositionMode === "IN_SINGLE") {
    engineeringNotes.push("Composição: Módulo Inteiro (IN) — peça única dentro do limite de barras.");
  } else {
    engineeringNotes.push("Composição: Linha longa — 2× IF (Início/Final) + ML (Meio de Linha).");
  }

  // Nota de difusor SHARP
  if (profile?.hasDiffuser) {
    const d1Label = diffuserD1 ?? "—";
    const d2Label = diffuserD2 ?? "—";
    if (effectiveApplication === "D1+D2") {
      engineeringNotes.push(`Difusor SHARP: D1 = ${d1Label} | D2 = ${d2Label}`);
    } else if (effectiveApplication === "D1") {
      engineeringNotes.push(`Difusor SHARP: D1 = ${d1Label}`);
    } else {
      engineeringNotes.push(`Difusor SHARP: D2 = ${d2Label}`);
    }
  }

  // Nota de método de barra para 36W
  if (powerD1 === 36) {
    if (stripMethod === "STRIPLINE") {
      engineeringNotes.push(
        `36W com Stripline única (75V, 250mA) — apenas barras inteiras utilizadas.`
      );
    } else {
      engineeringNotes.push(
        `36W com Stripflex dupla (25V, 350mA) — 2 barras por seção.`
      );
    }
  }

  // ── Contexto para seleção de drivers (aplica restrições da planilha) ──
  const driverCtx: Partial<DriverSelectionContext> = {
    profileCode,
    isRemoteDriver,
    installType,
    allowLongModules,
  };

  // ── Drivers por SKU (D1) ──
  const driversD1: SkuDriverEntry[] = buildSkuDriverList(composition, powerD1, voltage, stripMethod, input.sheetDrivers, driverCtx);

  // ── Drivers por SKU (D2) — apenas D1+D2 independente ──
  let driversD2: SkuDriverEntry[] = [];
  if (effectiveApplication === "D1+D2" && isIndependent) {
    // D2 usa a mesma composição de módulos mas com potência D2
    driversD2 = buildSkuDriverList(composition, effectivePowerD2, voltage, stripMethod, input.sheetDrivers, driverCtx);
  }

  // ── Nota de acendimento conjunto (D1+D2 não independente) ──
  if (effectiveApplication === "D1+D2" && !isIndependent) {
    engineeringNotes.push(
      "Tipo de ligação: Acendimento Conjunto — D1 e D2 compartilham os mesmos drivers."
    );
  } else if (effectiveApplication === "D1+D2" && isIndependent) {
    engineeringNotes.push(
      "Tipo de ligação: Acendimento Independente — D1 e D2 com drivers separados por SKU."
    );
  }

  // ── Nota de driver remoto ──
  if (isRemoteDriver) {
    hasAlert = true;
    alertMessage = `⚠️ DRIVER REMOTO OBRIGATÓRIO: O perfil ${profileName} (${installType}) exige instalação de driver em ponto remoto.`;
    engineeringNotes.push(alertMessage);
    engineeringNotes.push("Local do driver: Remoto — externo ao perfil, instalado em caixa de passagem ou teto.");
  } else {
    engineeringNotes.push("Local do driver: Integrado ao perfil.");
  }

  if (remainingLength > 0) {
    engineeringNotes.push(
      `Comprimento realizado (${realizedLength}mm) é menor que o solicitado (${totalLength}mm). Diferença: ${remainingLength}mm.`
    );
  }

  const barsPerSection = stripMethod === "STRIPLINE" ? 1 : BARS_PER_SECTION_STRIPFLEX[powerD1];
  const totalBarsD1 = composition.reduce((sum, item) => sum + item.barsTotal, 0);
  let totalBarsD2 = totalBarsD1;
  if (effectiveApplication === "D1+D2" && powerD1 !== effectivePowerD2) {
    const barsD2 = BARS_PER_SECTION_STRIPFLEX[effectivePowerD2];
    totalBarsD2 = composition.reduce((sum, item) => sum + item.barras * barsD2, 0);
  }

  const totalBars = effectiveApplication === "D1+D2"
    ? totalBarsD1 + totalBarsD2
    : totalBarsD1;

  const stripflexName = stripMethod === "STRIPLINE"
    ? getStriplineName(cct)
    : getStripflexName(cct);

  // Drivers combinados para D1+D2 conjunto
  // Quando D1+D2 simultâneo: barras × 2 para dimensionar o driver (as duas fileiras compartilham o mesmo driver)
  const combinedDrivers: SkuDriverEntry[] | undefined =
    effectiveApplication === "D1+D2" && !isIndependent
      ? buildSkuDriverList(composition, powerD1, voltage, stripMethod, input.sheetDrivers, driverCtx, true)
      : undefined;

  return {
    profileCode,
    profileName,
    installType,
    application: effectiveApplication,
    powerD1,
    powerD2: effectivePowerD2,
    cct,
    voltage,
    stripMethod,
    allowLongModules,
    independentLighting: isIndependent,
    forcedIndependent,
    isRemoteDriver,
    requestedLength: totalLength,
    realizedLength,
    remainingLength,
    composition,
    totalBars,
    driversD1,
    driversD2,
    combinedDrivers,
    stripflexName,
    engineeringNotes,
    hasAlert,
    alertMessage,
    compositionMode,
    diffuserD1,
    diffuserD2,
  };
}
