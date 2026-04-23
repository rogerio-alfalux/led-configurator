/**
 * driverSelector.ts
 * Seleciona o driver correto da lista do Google Sheets com base em:
 *   - Tensão de saída calculada (barras × V/barra)
 *   - Corrente requerida (mA)
 *   - Tensão de entrada (220V ou Bivolt)
 *   - Prioridade (menor = melhor)
 *   - Restrições da coluna OBSERVAÇÕES:
 *       onlyPowerW: driver restrito a uma potência específica
 *       onlyVoltage: driver restrito a uma tensão de entrada
 *       onlyStripMethod: driver restrito a um método de barra (STRIPFLEX/STRIPLINE)
 *       preferredMinBars/preferredMaxBars: faixa de barras preferencial
 *       maxBars: número máximo de barras permitido
 *       notBlazeH: não usar no perfil BLAZE H
 *       onlyEmbutirOrRemote: apenas Embutir ou driver remoto
 *
 * Tensões de referência por barra:
 *   Stripflex 562,5 x 10mm: ~25V por barra (350mA ou 500mA)
 *   Stripline 562,5 x 15mm: ~75V por barra (250mA)
 */

import type { Power, Voltage, StripMethod, CCT } from "./ledEngine";
import type { DriverRestrictions } from "@shared/driverRestrictions";

export type { DriverRestrictions };

export interface SheetDriver {
  code: string;
  model: string;
  inputVoltage: string;
  outputRanges: { current: number; vMin: number; vMax: number }[];
  currents: number[];
  available: boolean;
  priority: number;
  restrictions?: DriverRestrictions;
}

export interface SelectedDriver {
  code: string;        // EQ00346
  model: string;       // PHILIPS XITANIUM 19W
  current: string;     // "350mA"
  quantity: number;    // sempre 1 por SKU
  vOut: number;        // tensão de saída calculada
}

/** Contexto de seleção para aplicar restrições contextuais */
export interface DriverSelectionContext {
  power: Power;
  voltage: Voltage;
  stripMethod: StripMethod;
  totalBars: number;
  profileCode?: string;
  isRemoteDriver?: boolean;
  installType?: string;
}

/** Tensão por barra em volts */
const V_PER_BAR: Record<StripMethod, number> = {
  STRIPFLEX: 25,
  STRIPLINE: 75,
};

/** Corrente em mA por potência e método */
function getCurrentMA(power: Power, stripMethod: StripMethod): number {
  if (stripMethod === "STRIPLINE") return 250;
  if (power === 26) return 500;
  return 350; // 18W e 36W Stripflex
}

/**
 * Calcula a tensão de saída real para um módulo com N barras.
 * Para Stripflex 36W barra dupla: cada seção tem 2 barras em paralelo,
 * mas a tensão de saída do driver é a mesma de 1 barra (25V).
 * Para Stripflex simples (18W/26W): tensão = barras × V/barra.
 * Para Stripline: tensão = barras × 75V.
 */
export function calcVOut(
  totalBarsForDriver: number,
  power: Power,
  stripMethod: StripMethod
): number {
  const vPerBar = V_PER_BAR[stripMethod];
  // Para 36W Stripflex dupla: 2 barras em paralelo por seção → tensão = barras_série × 25V
  // barsTotal = barras físicas (2 por seção), mas em paralelo → Vout = (barsTotal/2) × 25V
  if (power === 36 && stripMethod === "STRIPFLEX") {
    return (totalBarsForDriver / 2) * vPerBar;
  }
  return totalBarsForDriver * vPerBar;
}

/**
 * Verifica se um driver atende as restrições contextuais da coluna OBSERVAÇÕES.
 * Retorna true se o driver pode ser usado neste contexto.
 */
function meetsRestrictions(
  driver: SheetDriver,
  ctx: DriverSelectionContext
): boolean {
  const r = driver.restrictions;
  if (!r) return true;

  // Restrição de potência
  if (r.onlyPowerW !== undefined && r.onlyPowerW !== ctx.power) return false;

  // Restrição de tensão de entrada
  if (r.onlyVoltage !== undefined) {
    const inputVoltage = ctx.voltage === "Bivolt" ? "BIVOLT" : "220V";
    if (r.onlyVoltage !== inputVoltage) return false;
  }

  // Restrição de método de barra
  // onlyStripMethod=STRIPFLEX significa: não usar para 26W (500mA) mesmo que seja bivolt
  // Para 18W e 36W Stripflex: OK. Para 26W: excluir.
  if (r.onlyStripMethod !== undefined) {
    if (r.onlyStripMethod !== ctx.stripMethod) return false;
    // Adicionalmente: se onlyStripMethod=STRIPFLEX e power=26W, excluir
    // (os LIFUD bivolt são para 18W fileira simples ou 36W barra dupla, não 26W)
    if (r.onlyStripMethod === "STRIPFLEX" && ctx.power === 26) return false;
  }

  // Restrição de número máximo de barras
  if (r.maxBars !== undefined && ctx.totalBars > r.maxBars) return false;

  // Restrição de não usar no BLAZE H
  if (r.notBlazeH && ctx.profileCode === "LLP-6060") return false;

  // Restrição de apenas Embutir ou driver remoto
  if (r.onlyEmbutirOrRemote) {
    const isEmbutir = ctx.installType === "EMBUTIR";
    const isRemote = ctx.isRemoteDriver === true;
    if (!isEmbutir && !isRemote) return false;
  }

  return true;
}

/**
 * Calcula um score de "adequação" para a faixa de barras preferencial.
 * Drivers na faixa preferencial recebem score 0 (melhor).
 * Drivers fora da faixa recebem score positivo (pior).
 * Usado como critério de desempate após prioridade.
 */
function barRangeScore(driver: SheetDriver, totalBars: number): number {
  const r = driver.restrictions;
  if (!r) return 0;
  if (r.preferredMinBars === undefined || r.preferredMaxBars === undefined) return 0;

  if (totalBars >= r.preferredMinBars && totalBars <= r.preferredMaxBars) {
    return 0; // dentro da faixa preferencial
  }
  // Fora da faixa: penalidade proporcional à distância
  const distMin = Math.max(0, r.preferredMinBars - totalBars);
  const distMax = Math.max(0, totalBars - r.preferredMaxBars);
  return distMin + distMax;
}

/**
 * Seleciona o melhor driver da lista para um dado módulo.
 * Aplica todas as restrições da coluna OBSERVAÇÕES.
 */
export function selectDriverFromSheet(
  drivers: SheetDriver[],
  totalBars: number,
  power: Power,
  voltage: Voltage,
  stripMethod: StripMethod,
  context?: Partial<DriverSelectionContext>
): SelectedDriver | null {
  const currentMA = getCurrentMA(power, stripMethod);
  const vOut = calcVOut(totalBars, power, stripMethod);
  const isBivolt = voltage === "Bivolt";

  const ctx: DriverSelectionContext = {
    power,
    voltage,
    stripMethod,
    totalBars,
    profileCode: context?.profileCode,
    isRemoteDriver: context?.isRemoteDriver,
    installType: context?.installType,
  };

  const candidates = drivers.filter(d => {
    // Filtrar indisponíveis
    if (!d.available) return false;

    // Filtrar por tensão de entrada
    const inputMatch = isBivolt
      ? d.inputVoltage === "BIVOLT"
      : d.inputVoltage === "220V";
    if (!inputMatch) return false;

    // Verificar se suporta a corrente
    if (!d.currents.includes(currentMA)) return false;

    // Verificar se a tensão de saída está dentro da faixa para essa corrente
    const range = d.outputRanges.find(r => r.current === currentMA);
    if (!range) return false;
    if (vOut < range.vMin || vOut > range.vMax) return false;

    // Verificar restrições da coluna OBSERVAÇÕES
    if (!meetsRestrictions(d, ctx)) return false;

    return true;
  });

  if (candidates.length === 0) return null;

  // Ordenar por:
  // 1. Prioridade (menor = melhor)
  // 2. Score de faixa de barras (0 = dentro da faixa preferencial)
  // 3. Menor potência (mais eficiente)
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const scoreA = barRangeScore(a, totalBars);
    const scoreB = barRangeScore(b, totalBars);
    if (scoreA !== scoreB) return scoreA - scoreB;
    const wA = parseInt(a.model.match(/(\d+)W/i)?.[1] ?? "999");
    const wB = parseInt(b.model.match(/(\d+)W/i)?.[1] ?? "999");
    return wA - wB;
  });

  const best = candidates[0];
  return {
    code: best.code,
    model: best.model,
    current: `${currentMA}mA`,
    quantity: 1,
    vOut,
  };
}

/**
 * Fallback quando a planilha não está disponível.
 * Usa os drivers conhecidos hardcoded para não travar o cálculo.
 */
export function selectDriverFallback(
  totalBars: number,
  power: Power,
  voltage: Voltage,
  stripMethod: StripMethod
): SelectedDriver {
  const currentMA = getCurrentMA(power, stripMethod);
  const vOut = calcVOut(totalBars, power, stripMethod);
  const isBivolt = voltage === "Bivolt";

  // Stripline 36W/250mA
  if (power === 36 && stripMethod === "STRIPLINE") {
    if (isBivolt) {
      if (vOut <= 57) return { code: "EQ00580", model: "LIFUD 20W LF-FMR020YS0350U(S)", current: "250mA", quantity: 1, vOut };
      if (vOut <= 115) return { code: "EQ00581", model: "LIFUD 40W LF-FMR040YS0350U(S)", current: "250mA", quantity: 1, vOut };
      return { code: "EQ00582", model: "LIFUD 60W LF-FMR060YS0350U(S)", current: "250mA", quantity: 1, vOut };
    } else {
      if (vOut <= 54) return { code: "EQ00346", model: "PHILIPS XITANIUM 19W", current: "250mA", quantity: 1, vOut };
      if (vOut <= 125) return { code: "EQ00347", model: "PHILIPS XITANIUM 44W", current: "250mA", quantity: 1, vOut };
      return { code: "EQ00393", model: "PHILIPS XITANIUM 65W", current: "250mA", quantity: 1, vOut };
    }
  }

  // Stripflex 350mA (18W e 36W dupla)
  if (currentMA === 350) {
    if (isBivolt) {
      if (vOut <= 57) return { code: "EQ00580", model: "LIFUD 20W LF-FMR020YS0350U(S)", current: "350mA", quantity: 1, vOut };
      if (vOut <= 115) return { code: "EQ00581", model: "LIFUD 40W LF-FMR040YS0350U(S)", current: "350mA", quantity: 1, vOut };
      return { code: "EQ00582", model: "LIFUD 60W LF-FMR060YS0350U(S)", current: "350mA", quantity: 1, vOut };
    } else {
      if (vOut <= 54) return { code: "EQ00346", model: "PHILIPS XITANIUM 19W", current: "350mA", quantity: 1, vOut };
      if (vOut <= 125) return { code: "EQ00347", model: "PHILIPS XITANIUM 44W", current: "350mA", quantity: 1, vOut };
      if (vOut <= 185) return { code: "EQ00393", model: "PHILIPS XITANIUM 65W", current: "350mA", quantity: 1, vOut };
      return { code: "EQ00220", model: "OSRAM IT FIT 75W", current: "350mA", quantity: 1, vOut };
    }
  }

  // Stripflex 500mA (26W)
  if (isBivolt) {
    if (vOut <= 57) return { code: "EQ00580", model: "LIFUD 20W LF-FMR020YS0350U(S)", current: "500mA", quantity: 1, vOut };
    return { code: "EQ00582", model: "LIFUD 60W LF-FMR060YS0350U(S)", current: "500mA", quantity: 1, vOut };
  } else {
    if (vOut <= 42) return { code: "EQ00353", model: "PHILIPS CERTADRIVE 20W", current: "500mA", quantity: 1, vOut };
    return { code: "EQ00220", model: "OSRAM IT FIT 75W", current: "500mA", quantity: 1, vOut };
  }
}
