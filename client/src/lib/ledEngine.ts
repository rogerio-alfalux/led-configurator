// LED Configurator Engine v1.2
// Seleção automática de tipo de módulo (IN/IF/ML), resultado unificado D1+D2

import { LED_CATALOG } from "./ledCatalog";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Power = 18 | 26 | 36;
export type CCT = "3000K" | "4000K";
export type Voltage = "220Vac" | "Bivolt";
export type Application = "D1" | "D2" | "D1+D2";
export type ModuleType = "IN" | "IF" | "ML";

/** Nomenclatura oficial dos tipos de módulo */
export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  IN: "Módulo Inteiro",
  IF: "Início ou Final de Linha",
  ML: "Meio de Linha",
};

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
  quantity: number; // quantas vezes este SKU aparece
}

export interface CompositionResult {
  profileCode: string;
  profileName: string;
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
  composition: CompositionItem[];   // composição unificada (D1 e D2 usam o mesmo perfil)
  totalBars: number;                // total de barras (D1+D2 juntos se independente, senão igual)
  driversD1: DriverSpec[];          // drivers para D1 (ou único driver se conjunto)
  driversD2: DriverSpec[];          // drivers para D2 (vazio se não independente ou D1 only)
  combinedDrivers?: DriverSpec[];   // drivers otimizados quando acendimento conjunto
  engineeringNotes: string[];
  hasAlert: boolean;
  alertMessage?: string;
}

export interface ConfigInput {
  profileCode: string;
  application: Application;
  powerD1: Power;
  powerD2?: Power;
  cct: CCT;
  voltage: Voltage;
  totalLength: number;    // comprimento total único (mesmo para D1+D2)
  allowLongModules: boolean;
  independentLighting: boolean;
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

// ─── Seleção Automática de Módulos ───────────────────────────────────────────

/**
 * Algoritmo guloso com seleção automática de tipo de módulo.
 *
 * Estratégia:
 * 1. Combina todos os módulos disponíveis (IN, IF, ML) respeitando allowLongModules.
 * 2. Ordena por comprimento decrescente (maior primeiro).
 * 3. Aplica algoritmo guloso: usa o maior módulo que cabe no restante.
 * 4. Consolida itens iguais (mesmo SKU) somando quantidades.
 *
 * Retorna a composição como lista de CompositionItem consolidados.
 */
export function buildComposition(
  profileCode: string,
  requestedLength: number,
  power: Power,
  allowLongModules: boolean
): { composition: CompositionItem[]; realizedLength: number; remainingLength: number } {
  const profile = LED_CATALOG[profileCode];
  if (!profile) {
    return { composition: [], realizedLength: 0, remainingLength: requestedLength };
  }

  const barsPerSection = BARS_PER_SECTION[power];
  const moduleTypes: ModuleType[] = ["IN", "IF", "ML"];

  // Montar lista plana de todos os módulos disponíveis
  const allModules: { type: ModuleType; barras: number; length: number; sku: string }[] = [];
  for (const mt of moduleTypes) {
    const mods = profile.modules[mt];
    if (!mods) continue;
    for (const [barrasKey, data] of Object.entries(mods)) {
      if (!data.sku || data.sku === "") continue; // Regra de Ouro
      if (!allowLongModules && data.length > 2825) continue;
      allModules.push({
        type: mt,
        barras: parseFloat(barrasKey),
        length: data.length,
        sku: data.sku,
      });
    }
  }

  // Ordenar por comprimento decrescente
  allModules.sort((a, b) => b.length - a.length);

  const rawItems: { type: ModuleType; barras: number; length: number; sku: string }[] = [];
  let remaining = requestedLength;

  // Algoritmo guloso
  for (const mod of allModules) {
    while (remaining >= mod.length) {
      rawItems.push(mod);
      remaining -= mod.length;
    }
  }

  // Consolidar por SKU
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

  const composition = Array.from(skuMap.values());
  const realizedLength = requestedLength - remaining;

  return { composition, realizedLength, remainingLength: remaining };
}

// ─── Engine Principal ─────────────────────────────────────────────────────────

/**
 * Função principal de cálculo da composição.
 *
 * D1+D2 compartilham o mesmo perfil e o mesmo comprimento total.
 * A composição de módulos é única (mesma lista de SKUs para ambos).
 * Drivers são calculados por circuito (D1 e D2 separados se independente,
 * ou otimizados juntos se acendimento conjunto).
 */
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
  } = input;

  const profile = LED_CATALOG[profileCode];
  const profileName = profile?.name ?? profileCode;

  // Validação: perfis com noD1D2 não suportam aplicação D1+D2
  if (application === "D1+D2" && profile?.noD1D2) {
    throw new Error(`O perfil ${profileName} não suporta aplicação D1+D2. Use apenas D1 ou D2.`);
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

  // ── Composição de módulos (única para o perfil, independente de D1/D2) ──
  // Usa a potência de D1 para definir barras por seção na tabela de itens.
  // Quando D1+D2 com potências iguais, as barras são as mesmas.
  // Quando D1+D2 com potências diferentes, exibimos a composição física (módulos)
  // e calculamos os drivers separadamente por circuito.
  const { composition, realizedLength, remainingLength } = buildComposition(
    profileCode,
    totalLength,
    powerD1,
    allowLongModules
  );

  // Total de barras para D1
  const totalBarsD1 = composition.reduce((sum, item) => sum + item.barsTotal, 0);

  // Para D2 com potência diferente, recalcular barras (barsPerSection pode diferir)
  let totalBarsD2 = totalBarsD1;
  if (application === "D1+D2" && powerD1 !== effectivePowerD2) {
    const barsD2 = BARS_PER_SECTION[effectivePowerD2];
    const barsD1 = BARS_PER_SECTION[powerD1];
    // Reescalar: mesmos módulos físicos, mas barras por seção diferem
    totalBarsD2 = composition.reduce((sum, item) => sum + item.barras * barsD2, 0);
    // Atualizar composição para refletir barras de D1 (padrão de exibição)
    // A tabela mostra barras de D1; nota de engenharia explica D2
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
    // D1+D2
    if (isIndependent) {
      driversD1 = selectDrivers(totalBarsD1, powerD1, voltage);
      driversD2 = selectDrivers(totalBarsD2, effectivePowerD2, voltage);
    } else {
      // Acendimento conjunto: otimizar drivers somando barras
      const totalBarsCombined = totalBarsD1 + totalBarsD2;
      combinedDrivers = optimizeDrivers(totalBarsCombined, powerD1, voltage);
      engineeringNotes.push(
        `Acendimento conjunto: drivers otimizados → ${combinedDrivers.map((d) => `${d.quantity}x ${d.model}`).join(", ")}.`
      );
    }
  }

  // ── Alerta EASY H PLUS ──
  const isEasyHPlus = profileCode === "LLP-4450";
  const totalDriverCount = combinedDrivers
    ? combinedDrivers.reduce((s, d) => s + d.quantity, 0)
    : [...driversD1, ...driversD2].reduce((s, d) => s + d.quantity, 0);

  if (isEasyHPlus && totalDriverCount > 1) {
    hasAlert = true;
    alertMessage = "⚠️ DRIVER REMOTO OBRIGATÓRIO: O perfil EASY H PLUS com múltiplos drivers exige instalação de driver remoto.";
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

  if (isEasyHPlus) {
    engineeringNotes.push("Local do driver: Remoto (externo ao perfil) — obrigatório para EASY H PLUS.");
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
  };
}
