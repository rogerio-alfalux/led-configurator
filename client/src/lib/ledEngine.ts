// Engine de Cálculo para Configuração de Perfis LED Lineares
// Implementa calculateComposition(), seleção de drivers e lógica de acendimento

import { LED_CATALOG, ModuleType, ProfileData } from "./ledCatalog";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Power = 18 | 26 | 36;
export type CCT = "3000K" | "4000K";
export type Voltage = "220V";
export type Application = "D1" | "D2" | "D1+D2";

export interface DriverSpec {
  model: string;
  power: number;
  current: string;
  quantity: number;
}

export interface CompositionItem {
  sku: string;
  length: number;
  barras: number;
  barsTotal: number; // barras * bars_per_section
}

export interface SectionResult {
  application: "D1" | "D2";
  power: Power;
  requestedLength: number;
  realizedLength: number;
  remainingLength: number;
  composition: CompositionItem[];
  totalBars: number;
  drivers: DriverSpec[];
  notes: string[];
}

export interface CompositionResult {
  profileCode: string;
  profileName: string;
  application: Application;
  power: Power;
  cct: CCT;
  voltage: Voltage;
  moduleType: ModuleType;
  allowLongModules: boolean;
  independentLighting: boolean;
  forcedIndependent: boolean;
  sections: SectionResult[];
  combinedDrivers?: DriverSpec[];
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
  lengthD1: number;
  lengthD2?: number;
  moduleType: ModuleType;
  allowLongModules: boolean;
  independentLighting: boolean;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const BARS_PER_SECTION: Record<Power, number> = {
  18: 1,
  26: 1,
  36: 2, // Barra Dupla
};

const CURRENT_TYPE: Record<Power, "350mA" | "500mA"> = {
  18: "500mA",
  26: "500mA",
  36: "350mA",
};

// ─── Seleção de Drivers ───────────────────────────────────────────────────────

/**
 * Seleciona os drivers otimizados para um número de barras e potência.
 * 
 * 350mA (36W):
 *   1–5 barras → Philips 44W 350mA (1 driver)
 *   6 barras   → Philips 65W 350mA (1 driver)
 *   >6 barras  → múltiplos drivers Philips 65W 350mA
 * 
 * 500mA (18W / 26W):
 *   1 barra    → Philips 21W 500mA
 *   >1 barra   → Element 75W 500mA
 */
export function selectDrivers(totalBars: number, power: Power): DriverSpec[] {
  const current = CURRENT_TYPE[power];

  if (current === "350mA") {
    if (totalBars <= 5) {
      return [{ model: "Philips 44W 350mA", power: 44, current: "350mA", quantity: 1 }];
    } else if (totalBars <= 6) {
      return [{ model: "Philips 65W 350mA", power: 65, current: "350mA", quantity: 1 }];
    } else {
      // Múltiplos drivers de 65W
      const numDrivers = Math.ceil(totalBars / 6);
      return [{ model: "Philips 65W 350mA", power: 65, current: "350mA", quantity: numDrivers }];
    }
  } else {
    // 500mA
    if (totalBars <= 1) {
      return [{ model: "Philips 21W 500mA", power: 21, current: "500mA", quantity: 1 }];
    } else {
      return [{ model: "Element 75W 500mA", power: 75, current: "500mA", quantity: 1 }];
    }
  }
}

/**
 * Otimiza drivers quando acendimento é conjunto (Independente = Não).
 * Soma a carga total e recalcula com o menor número de drivers possível.
 */
export function optimizeDrivers(sections: SectionResult[], powers: Power[]): DriverSpec[] {
  // Verificar se todas as potências são iguais
  const uniquePowers = powers.filter((v, i, arr) => arr.indexOf(v) === i);
  if (uniquePowers.length > 1) {
    // Potências diferentes — não pode otimizar, retornar drivers separados
    return sections.flatMap((s) => s.drivers);
  }

  const power = uniquePowers[0];
  const totalBars = sections.reduce((sum, s) => sum + s.totalBars, 0);
  return selectDrivers(totalBars, power);
}

// ─── Engine Principal ─────────────────────────────────────────────────────────

/**
 * Calcula a composição de módulos para um comprimento solicitado.
 * 
 * Algoritmo Guloso: Prioriza o maior módulo disponível sem ultrapassar o comprimento.
 * Regra de Ouro: Apenas módulos com SKU válido existem no catálogo.
 */
export function calculateSection(
  profileCode: string,
  requestedLength: number,
  power: Power,
  moduleType: ModuleType,
  allowLongModules: boolean
): SectionResult {
  const profile = LED_CATALOG[profileCode];
  if (!profile) {
    return {
      application: "D1",
      power,
      requestedLength,
      realizedLength: 0,
      remainingLength: requestedLength,
      composition: [],
      totalBars: 0,
      drivers: [],
      notes: [`Perfil ${profileCode} não encontrado no catálogo.`],
    };
  }

  const modules = profile.modules[moduleType];
  const barsPerSection = BARS_PER_SECTION[power];

  // Ordenar módulos por comprimento (maior primeiro) — Algoritmo Guloso
  const sortedModules = Object.entries(modules)
    .map(([barrasKey, data]) => ({
      barras: parseFloat(barrasKey),
      length: data.length,
      sku: data.sku,
    }))
    .filter((m) => allowLongModules || m.length <= 2825)
    .sort((a, b) => b.length - a.length);

  const composition: CompositionItem[] = [];
  let remaining = requestedLength;

  // Fase 1: Usar os maiores módulos possíveis
  for (const mod of sortedModules) {
    while (remaining >= mod.length) {
      composition.push({
        sku: mod.sku,
        length: mod.length,
        barras: mod.barras,
        barsTotal: mod.barras * barsPerSection,
      });
      remaining -= mod.length;
    }
  }

  const realizedLength = requestedLength - remaining;
  const totalBars = composition.reduce((sum, item) => sum + item.barsTotal, 0);
  const drivers = selectDrivers(totalBars, power);

  const notes: string[] = [];
  if (remaining > 0) {
    notes.push(
      `Comprimento realizado (${realizedLength}mm) é menor que o solicitado (${requestedLength}mm). Diferença: ${remaining}mm.`
    );
  }

  return {
    application: "D1",
    power,
    requestedLength,
    realizedLength,
    remainingLength: remaining,
    composition,
    totalBars,
    drivers,
    notes,
  };
}

/**
 * Função principal de cálculo da composição completa.
 * Suporta aplicações D1, D2 e D1+D2 com lógica de acendimento independente.
 */
export function calculateComposition(input: ConfigInput): CompositionResult {
  const {
    profileCode,
    application,
    powerD1,
    powerD2,
    cct,
    voltage,
    lengthD1,
    lengthD2,
    moduleType,
    allowLongModules,
    independentLighting,
  } = input;

  const profile = LED_CATALOG[profileCode];
  const profileName = profile?.name ?? profileCode;

  const engineeringNotes: string[] = [];
  let hasAlert = false;
  let alertMessage: string | undefined;

  // Determinar se acendimento deve ser forçado como independente
  let forcedIndependent = false;
  const effectivePowerD2 = powerD2 ?? powerD1;

  if (application === "D1+D2" && powerD1 !== effectivePowerD2) {
    forcedIndependent = true;
    engineeringNotes.push(
      `⚠️ Acendimento Independente forçado: D1 (${powerD1}W) e D2 (${effectivePowerD2}W) possuem potências diferentes.`
    );
  }

  const isIndependent = forcedIndependent || independentLighting;

  // Calcular seções
  const sections: SectionResult[] = [];

  if (application === "D1" || application === "D1+D2") {
    const sectionD1 = calculateSection(profileCode, lengthD1, powerD1, moduleType, allowLongModules);
    sectionD1.application = "D1";
    sections.push(sectionD1);
  }

  if (application === "D2" || application === "D1+D2") {
    const len2 = lengthD2 ?? lengthD1;
    const sectionD2 = calculateSection(profileCode, len2, effectivePowerD2, moduleType, allowLongModules);
    sectionD2.application = "D2";
    sections.push(sectionD2);
  }

  // Otimizar drivers se acendimento conjunto
  let combinedDrivers: DriverSpec[] | undefined;
  if (!isIndependent && sections.length > 1) {
    const powers = sections.map((_, i) => (i === 0 ? powerD1 : effectivePowerD2));
    combinedDrivers = optimizeDrivers(sections, powers);
    engineeringNotes.push(
      `Acendimento conjunto: drivers otimizados para ${combinedDrivers.map((d) => `${d.quantity}x ${d.model}`).join(", ")}.`
    );
  }

  // Verificar alerta EASY H PLUS
  const isEasyHPlus = profileCode === "LLP-4450";
  const totalDriverCount = isIndependent
    ? sections.reduce((sum, s) => sum + s.drivers.reduce((ds, d) => ds + d.quantity, 0), 0)
    : (combinedDrivers?.reduce((sum, d) => sum + d.quantity, 0) ?? 0);

  if (isEasyHPlus && totalDriverCount > 1) {
    hasAlert = true;
    alertMessage = "⚠️ DRIVER REMOTO OBRIGATÓRIO: O perfil EASY H PLUS com múltiplos drivers exige instalação de driver remoto.";
    engineeringNotes.push(alertMessage);
  }

  // Notas de instalação
  if (isIndependent) {
    engineeringNotes.push("Tipo de ligação: Acendimento Independente (D1 e D2 com drivers separados).");
  } else if (sections.length > 1) {
    engineeringNotes.push("Tipo de ligação: Acendimento Conjunto (D1 e D2 compartilham o mesmo driver).");
  }

  if (isEasyHPlus) {
    engineeringNotes.push("Local do driver: Remoto (externo ao perfil) — obrigatório para EASY H PLUS.");
  } else {
    engineeringNotes.push("Local do driver: Interno ao perfil ou remoto conforme projeto.");
  }

  // Adicionar notas das seções
  sections.forEach((s) => {
    s.notes.forEach((n) => engineeringNotes.push(n));
  });

  return {
    profileCode,
    profileName,
    application,
    power: powerD1,
    cct,
    voltage,
    moduleType,
    allowLongModules,
    independentLighting: isIndependent,
    forcedIndependent,
    sections,
    combinedDrivers,
    engineeringNotes,
    hasAlert,
    alertMessage,
  };
}
