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
import { selectDriverFromSheet, selectDriverFallback, calcVOut } from "./driverSelector";

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
  barsTotal: number;
  quantity: number;
  /** Driver associado a este SKU (1 driver por SKU, nunca compartilhado) */
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
  driverContext?: Partial<DriverSelectionContext>
): SkuDriverEntry[] {
  return composition.map(item => {
    // barsTotal = barras desta peça individual (nunca multiplicado pela quantidade)
    const driver = selectDriverForBars(item.barsTotal, power, voltage, stripMethod, sheetDrivers, driverContext);
    return {
      sku: item.sku,
      quantity: item.quantity,
      driver,
      barsPerPiece: item.barsTotal,
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

function getModules(profileCode: string, type: ModuleType, allowLongModules: boolean, stripMethod?: StripMethod): RawModule[] {
  const profile = LED_CATALOG[profileCode];
  if (!profile) return [];
  const mods = profile.modules[type];
  if (!mods) return [];
  return Object.entries(mods)
    .filter(([, data]) => data.sku && data.sku !== "")
    .filter(([, data]) => allowLongModules || data.length <= 2825)
    .filter(([barrasKey]) => {
      // Stripline: apenas barras inteiras (1, 2, 3, 4, 5)
      if (stripMethod === "STRIPLINE") {
        const b = parseFloat(barrasKey);
        return STRIPLINE_VALID_BARS.includes(b);
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
      existing.barsTotal += item.barras * barsPerSection;
    } else {
      const barsTotal = item.barras * barsPerSection;
      skuMap.set(item.sku, {
        sku: item.sku,
        moduleType: item.type,
        moduleTypeLabel: MODULE_TYPE_LABELS[item.type],
        length: item.length,
        barras: item.barras,
        barsTotal,
        quantity: 1,
        driverPerSku: selectDriverForBars(barsTotal, power, voltage, stripMethod, sheetDrivers),
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
  sheetDrivers?: SheetDriver[]
): { composition: CompositionItem[]; realizedLength: number; remainingLength: number } | null {
  const inModules = getModules(profileCode, "IN", allowLongModules, stripMethod)
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
 * Regra de otimização de módulos (Prompt Definitivo v3.1):
 * Ordem de prioridade absoluta:
 *   1. Não ultrapassar o comprimento solicitado
 *   2. Minimizar a quantidade total de módulos (SKU) — prioridade absoluta
 *   3. Entre as soluções com menor número de módulos, escolher a mais próxima da medida
 *   4. Minimizar variedade de SKUs
 *   5. Manter IF iguais nas pontas
 *
 * Para linhas até 6000mm: SEMPRE testar primeiro 2x IF sem ML.
 * Somente usar ML se não existir solução válida com 2x IF.
 * Uma solução com menos módulos SEMPRE vence, mesmo com maior diferença de comprimento.
 */
function buildIfMlComposition(
  profileCode: string,
  requestedLength: number,
  power: Power,
  voltage: Voltage,
  allowLongModules: boolean,
  stripMethod: StripMethod,
  sheetDrivers?: SheetDriver[]
): { composition: CompositionItem[]; realizedLength: number; remainingLength: number } | null {
  const ifModules = getModules(profileCode, "IF", allowLongModules, stripMethod)
    .sort((a, b) => b.length - a.length);
  const mlModules = getModules(profileCode, "ML", allowLongModules, stripMethod)
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

    // --- Candidato A: 2x IF sem ML (sempre testar primeiro para linhas ≤ 6000mm) ---
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

  // Ordenação com prioridade absoluta:
  // 1. Menor número de módulos (prioridade absoluta — regra definitiva v3.1)
  // 2. Mais próximo do comprimento solicitado (entre candidatos com mesmo moduleCount)
  // 3. Menor variedade de SKUs
  // 4. Menor desvio de equilíbrio
  candidates.sort((a, b) => {
    if (a.moduleCount !== b.moduleCount) return a.moduleCount - b.moduleCount;
    if (b.realizedLength !== a.realizedLength) return b.realizedLength - a.realizedLength;
    if (a.skuVariety !== b.skuVariety) return a.skuVariety - b.skuVariety;
    return a.balance - b.balance;
  });

  const best = candidates[0];
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
  sheetDrivers?: SheetDriver[]
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

  const inModulesAll = getModules(profileCode, "IN", allowLongModules, stripMethod);
  const largestInWithinLimit = inModulesAll
    .filter(m => m.barras <= maxBars)
    .sort((a, b) => b.length - a.length)[0];

  const isShortLine = largestInWithinLimit !== undefined && requestedLength <= largestInWithinLimit.length;

  if (isShortLine) {
    const inResult = tryInSingle(profileCode, requestedLength, power, voltage, allowLongModules, stripMethod, sheetDrivers);
    if (inResult) {
      return { ...inResult, compositionMode: "IN_SINGLE" };
    }
  }

  const ifMlResult = buildIfMlComposition(profileCode, requestedLength, power, voltage, allowLongModules, stripMethod, sheetDrivers);
  if (ifMlResult) {
    return { ...ifMlResult, compositionMode: "IF_ML_LINE" };
  }

  // Fallback: algoritmo guloso genérico
  const allModules: RawModule[] = [
    ...getModules(profileCode, "IN", allowLongModules, stripMethod),
    ...getModules(profileCode, "IF", allowLongModules, stripMethod),
    ...getModules(profileCode, "ML", allowLongModules, stripMethod),
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
    stripMethod
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
  const combinedDrivers: SkuDriverEntry[] | undefined =
    effectiveApplication === "D1+D2" && !isIndependent
      ? buildSkuDriverList(composition, powerD1, voltage, stripMethod, input.sheetDrivers, driverCtx)
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
