// LED Engine v1.4
// Lógica correta de módulos:
//   IN (Módulo Inteiro): apenas quando a composição é uma peça única (≤ 5 barras; ≤ 6 com módulos longos)
//   IF + ML: para linhas longas — sempre 2 IFs iguais nas pontas + MLs no meio

import { LED_CATALOG, MODULE_TYPE_LABELS } from "./ledCatalog";
import type { InstallType } from "./ledCatalog";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Power = 18 | 26 | 36;
export type CCT = "3000K" | "4000K";
export type Voltage = "220Vac" | "Bivolt";
export type Application = "D1" | "D2" | "D1+D2";
export type ModuleType = "IN" | "IF" | "ML";
export type DiffuserType = "DA" | "DB" | "DC";

export type { InstallType };

export interface DriverSpec {
  model: string;
  power: number;
  current: string;
  quantity: number;
}

export interface CompositionItem {
  sku: string;
  moduleType: ModuleType;
  moduleTypeLabel: string;
  length: number;
  barras: number;
  barsTotal: number;
  quantity: number;
}

export interface CompositionResult {
  profileCode: string;
  profileName: string;
  installType: InstallType;
  application: Application;
  powerD1: Power;
  powerD2: Power;
  cct: CCT;
  voltage: Voltage;
  allowLongModules: boolean;
  independentLighting: boolean;
  forcedIndependent: boolean;
  requestedLength: number;
  realizedLength: number;
  remainingLength: number;
  composition: CompositionItem[];
  totalBars: number;
  driversD1: DriverSpec[];
  driversD2: DriverSpec[];
  combinedDrivers?: DriverSpec[];
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
  totalLength: number;
  allowLongModules: boolean;
  independentLighting: boolean;
  diffuserD1?: DiffuserType;
  diffuserD2?: DiffuserType;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const BARS_PER_SECTION: Record<Power, number> = {
  18: 1,  // Fileira Simples · 350mA
  26: 1,  // Fileira Simples · 500mA
  36: 2,  // Fileira Dupla   · 350mA — Método Barra Dupla
};

const CURRENT_TYPE: Record<Power, "350mA" | "500mA"> = {
  18: "350mA",
  26: "500mA",
  36: "350mA",
};

/**
 * Limite máximo de barras para uso de IN como peça única.
 * Se o comprimento total cabe em ≤ 5 barras (ou ≤ 6 com módulos longos),
 * pode-se usar um único módulo IN. Caso contrário, usar IF + ML.
 */
export const IN_MAX_BARS_STANDARD = 5;
export const IN_MAX_BARS_LONG = 6;

// ─── Seleção de Drivers ───────────────────────────────────────────────────────

function selectDrivers220V(totalBars: number, power: Power): DriverSpec[] {
  const current = CURRENT_TYPE[power];
  if (current === "350mA") {
    if (totalBars <= 1)  return [{ model: "Philips 19W 350mA",  power: 19, current: "350mA", quantity: 1 }];
    if (totalBars <= 5)  return [{ model: "Philips 44W 350mA",  power: 44, current: "350mA", quantity: 1 }];
    if (totalBars <= 6)  return [{ model: "Philips 65W 350mA",  power: 65, current: "350mA", quantity: 1 }];
    const n = Math.ceil(totalBars / 6);
    return [{ model: "Philips 65W 350mA", power: 65, current: "350mA", quantity: n }];
  } else {
    if (totalBars <= 1)  return [{ model: "Philips 21W 500mA",  power: 21, current: "500mA", quantity: 1 }];
    return [{ model: "Element 75W 500mA", power: 75, current: "500mA", quantity: 1 }];
  }
}

function selectDriversBivolt(totalBars: number, power: Power): DriverSpec[] {
  const current = CURRENT_TYPE[power];
  if (current === "350mA") {
    if (totalBars <= 1)  return [{ model: "LIFUD 20W 350mA (LF-FMR020YS0350U(S))", power: 20, current: "350mA", quantity: 1 }];
    if (totalBars <= 4)  return [{ model: "LIFUD 40W 350mA (LF-FMR040YS0350U(S))", power: 40, current: "350mA", quantity: 1 }];
    if (totalBars <= 6)  return [{ model: "LIFUD 60W 350mA (LF-FMR060YS0350U(S))", power: 60, current: "350mA", quantity: 1 }];
    const n = Math.ceil(totalBars / 6);
    return [{ model: "LIFUD 60W 350mA (LF-FMR060YS0350U(S))", power: 60, current: "350mA", quantity: n }];
  } else {
    if (totalBars <= 1)  return [{ model: "Philips 21W 500mA",  power: 21, current: "500mA", quantity: 1 }];
    return [{ model: "Element 75W 500mA", power: 75, current: "500mA", quantity: 1 }];
  }
}

export function selectDrivers(totalBars: number, power: Power, voltage: Voltage = "220Vac"): DriverSpec[] {
  return voltage === "Bivolt"
    ? selectDriversBivolt(totalBars, power)
    : selectDrivers220V(totalBars, power);
}

export function optimizeDrivers(totalBars: number, power: Power, voltage: Voltage): DriverSpec[] {
  return selectDrivers(totalBars, power, voltage);
}

// ─── Helpers de módulos ───────────────────────────────────────────────────────

interface RawModule {
  type: ModuleType;
  barras: number;
  length: number;
  sku: string;
}

function getModules(profileCode: string, type: ModuleType, allowLongModules: boolean): RawModule[] {
  const profile = LED_CATALOG[profileCode];
  if (!profile) return [];
  const mods = profile.modules[type];
  if (!mods) return [];
  return Object.entries(mods)
    .filter(([, data]) => data.sku && data.sku !== "")
    .filter(([, data]) => allowLongModules || data.length <= 2825)
    .map(([barrasKey, data]) => ({
      type,
      barras: parseFloat(barrasKey),
      length: data.length,
      sku: data.sku,
    }));
}

function toCompositionItems(
  rawItems: RawModule[],
  barsPerSection: number
): CompositionItem[] {
  const skuMap = new Map<string, CompositionItem>();
  for (const item of rawItems) {
    const existing = skuMap.get(item.sku);
    if (existing) {
      existing.quantity += 1;
      existing.barsTotal += item.barras * barsPerSection;
    } else {
      skuMap.set(item.sku, {
        sku: item.sku,
        moduleType: item.type,
        moduleTypeLabel: MODULE_TYPE_LABELS[item.type],
        length: item.length,
        barras: item.barras,
        barsTotal: item.barras * barsPerSection,
        quantity: 1,
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
  allowLongModules: boolean
): { composition: CompositionItem[]; realizedLength: number; remainingLength: number } | null {
  const inModules = getModules(profileCode, "IN", allowLongModules)
    .filter(m => m.length <= requestedLength)
    .sort((a, b) => b.length - a.length);

  if (inModules.length === 0) return null;

  const best = inModules[0];
  const barsPerSection = BARS_PER_SECTION[power];

  const composition = toCompositionItems([best], barsPerSection);
  const realizedLength = best.length;
  const remainingLength = requestedLength - best.length;

  return { composition, realizedLength, remainingLength };
}

// ─── Estratégia 2: IF + ML para linhas longas ─────────────────────────────────

function buildIfMlComposition(
  profileCode: string,
  requestedLength: number,
  power: Power,
  allowLongModules: boolean
): { composition: CompositionItem[]; realizedLength: number; remainingLength: number } | null {
  const ifModules = getModules(profileCode, "IF", allowLongModules)
    .sort((a, b) => b.length - a.length);
  const mlModules = getModules(profileCode, "ML", allowLongModules)
    .sort((a, b) => b.length - a.length);

  if (ifModules.length === 0) return null;

  const barsPerSection = BARS_PER_SECTION[power];

  interface Candidate {
    ifMod: RawModule;
    mlItems: RawModule[];
    realizedLength: number;
    moduleCount: number;
    balance: number;
  }

  const candidates: Candidate[] = [];

  for (const ifMod of ifModules) {
    const twoIfLength = 2 * ifMod.length;
    if (twoIfLength > requestedLength) continue;

    const remaining = requestedLength - twoIfLength;

    const mlItems: RawModule[] = [];
    let rem = remaining;
    for (const ml of mlModules) {
      while (rem >= ml.length) {
        mlItems.push(ml);
        rem -= ml.length;
      }
    }

    const realizedLength = requestedLength - rem;
    const moduleCount = 2 + mlItems.length;

    const allLengths = [ifMod.length, ifMod.length, ...mlItems.map(m => m.length)];
    const mean = allLengths.reduce((s, v) => s + v, 0) / allLengths.length;
    const balance = Math.sqrt(allLengths.reduce((s, v) => s + (v - mean) ** 2, 0) / allLengths.length);

    candidates.push({ ifMod, mlItems, realizedLength, moduleCount, balance });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.moduleCount !== b.moduleCount) return a.moduleCount - b.moduleCount;
    if (Math.abs(a.balance - b.balance) > 1) return a.balance - b.balance;
    return b.realizedLength - a.realizedLength;
  });

  const best = candidates[0];
  const rawItems: RawModule[] = [best.ifMod, best.ifMod, ...best.mlItems];
  const composition = toCompositionItems(rawItems, barsPerSection);
  const remainingLength = requestedLength - best.realizedLength;

  return { composition, realizedLength: best.realizedLength, remainingLength };
}

// ─── buildComposition: orquestrador das duas estratégias ─────────────────────

export function buildComposition(
  profileCode: string,
  requestedLength: number,
  power: Power,
  allowLongModules: boolean
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

  const barsPerSection = BARS_PER_SECTION[power];
  const maxBars = allowLongModules ? IN_MAX_BARS_LONG : IN_MAX_BARS_STANDARD;

  const inModulesAll = getModules(profileCode, "IN", allowLongModules);
  const largestInWithinLimit = inModulesAll
    .filter(m => m.barras <= maxBars)
    .sort((a, b) => b.length - a.length)[0];

  const isShortLine = largestInWithinLimit !== undefined && requestedLength <= largestInWithinLimit.length;

  if (isShortLine) {
    const inResult = tryInSingle(profileCode, requestedLength, power, allowLongModules);
    if (inResult) {
      return { ...inResult, compositionMode: "IN_SINGLE" };
    }
  }

  const ifMlResult = buildIfMlComposition(profileCode, requestedLength, power, allowLongModules);
  if (ifMlResult) {
    return { ...ifMlResult, compositionMode: "IF_ML_LINE" };
  }

  // Fallback: algoritmo guloso genérico
  const allModules: RawModule[] = [
    ...getModules(profileCode, "IN", allowLongModules),
    ...getModules(profileCode, "IF", allowLongModules),
    ...getModules(profileCode, "ML", allowLongModules),
  ].sort((a, b) => b.length - a.length);

  const rawItems: RawModule[] = [];
  let remaining = requestedLength;
  for (const mod of allModules) {
    while (remaining >= mod.length) {
      rawItems.push(mod);
      remaining -= mod.length;
    }
  }

  const composition = toCompositionItems(rawItems, barsPerSection);
  const realizedLength = requestedLength - remaining;

  return { composition, realizedLength, remainingLength: remaining, compositionMode: "IF_ML_LINE" };
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

  const effectivePowerD2: Power = (application === "D1+D2" ? (powerD2 ?? powerD1) : powerD1);

  // Acendimento independente forçado quando potências diferentes
  const forcedIndependent = application === "D1+D2" && powerD1 !== effectivePowerD2;
  const isIndependent = forcedIndependent || (application === "D1+D2" && independentLighting);

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
    allowLongModules
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
    if (application === "D1+D2") {
      engineeringNotes.push(`Difusor SHARP: D1 = ${d1Label} | D2 = ${d2Label}`);
    } else if (application === "D1") {
      engineeringNotes.push(`Difusor SHARP: D1 = ${d1Label}`);
    } else {
      engineeringNotes.push(`Difusor SHARP: D2 = ${d2Label}`);
    }
  }

  const totalBarsD1 = composition.reduce((sum, item) => sum + item.barsTotal, 0);

  let totalBarsD2 = totalBarsD1;
  if (application === "D1+D2" && powerD1 !== effectivePowerD2) {
    const barsD2 = BARS_PER_SECTION[effectivePowerD2];
    const barsD1 = BARS_PER_SECTION[powerD1];
    totalBarsD2 = composition.reduce((sum, item) => sum + item.barras * barsD2, 0);
    if (barsD1 !== barsD2) {
      engineeringNotes.push(
        `D2 (${effectivePowerD2}W) utiliza ${barsD2} barra(s) por seção (${CURRENT_TYPE[effectivePowerD2]}), totalizando ${totalBarsD2} barras.`
      );
    }
  }

  // ── Seleção de Drivers ──
  let driversD1: DriverSpec[] = [];
  let driversD2: DriverSpec[] = [];
  let combinedDrivers: DriverSpec[] | undefined;

  if (application === "D1") {
    driversD1 = selectDrivers(totalBarsD1, powerD1, voltage);
  } else if (application === "D2") {
    driversD1 = selectDrivers(totalBarsD1, effectivePowerD2, voltage);
  } else {
    if (isIndependent) {
      driversD1 = selectDrivers(totalBarsD1, powerD1, voltage);
      driversD2 = selectDrivers(totalBarsD2, effectivePowerD2, voltage);
    } else {
      const totalBarsCombined = totalBarsD1 + totalBarsD2;
      combinedDrivers = optimizeDrivers(totalBarsCombined, powerD1, voltage);
      engineeringNotes.push(
        `Acendimento conjunto: drivers otimizados → ${combinedDrivers.map((d) => `${d.quantity}x ${d.model}`).join(", ")}.`
      );
    }
  }

  // ── Alerta Driver Remoto (EASY H PLUS e outros com requiresRemoteDriver) ──
  const requiresRemote = profile?.requiresRemoteDriver === true;
  const totalDriverCount = combinedDrivers
    ? combinedDrivers.reduce((s, d) => s + d.quantity, 0)
    : [...driversD1, ...driversD2].reduce((s, d) => s + d.quantity, 0);

  if (requiresRemote && totalDriverCount > 1) {
    hasAlert = true;
    alertMessage = `⚠️ DRIVER REMOTO OBRIGATÓRIO: O perfil ${profileName} com múltiplos drivers exige instalação de driver remoto.`;
    engineeringNotes.push(alertMessage);
  }

  // ── Notas de instalação ──
  if (application === "D1+D2") {
    if (isIndependent) {
      engineeringNotes.push("Tipo de ligação: Acendimento Independente — D1 e D2 com drivers separados.");
    } else {
      engineeringNotes.push("Tipo de ligação: Acendimento Conjunto — D1 e D2 compartilham o mesmo driver.");
    }
  }

  if (requiresRemote) {
    engineeringNotes.push(`Local do driver: Remoto (externo ao perfil) — obrigatório para ${profileName}.`);
  } else {
    engineeringNotes.push("Local do driver: Interno ao perfil ou remoto conforme projeto.");
  }

  if (remainingLength > 0) {
    engineeringNotes.push(
      `Comprimento realizado (${realizedLength}mm) é menor que o solicitado (${totalLength}mm). Diferença: ${remainingLength}mm.`
    );
  }

  const totalBars = application === "D1+D2"
    ? totalBarsD1 + totalBarsD2
    : totalBarsD1;

  return {
    profileCode,
    profileName,
    installType,
    application,
    powerD1,
    powerD2: effectivePowerD2,
    cct,
    voltage,
    allowLongModules,
    independentLighting: isIndependent,
    forcedIndependent,
    requestedLength: totalLength,
    realizedLength,
    remainingLength,
    composition,
    totalBars,
    driversD1,
    driversD2,
    combinedDrivers,
    engineeringNotes,
    hasAlert,
    alertMessage,
    compositionMode,
    diffuserD1,
    diffuserD2,
  };
}
