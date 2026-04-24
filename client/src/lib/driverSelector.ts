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
  /**
   * Se true, o botão de Módulos Longos está habilitado.
   * Necessário para usar Philips 100W e 150W (onlyLongModules=true).
   */
  allowLongModules?: boolean;
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

  // Restrição de Módulos Longos
  // Philips 100W e 150W só podem ser usados quando allowLongModules=true
  if (r.onlyLongModules && !ctx.allowLongModules) return false;

  // Restrição de faixa de barras preferencial como filtro obrigatório
  // Se o driver tem preferredMinBars/MaxBars definidos, ele só é elegivel dentro dessa faixa.
  // Isso garante que o Philips 65W (faixa 6-7) nunca seja selecionado para 4 barras,
  // mesmo que a faixa de Vout se sobreponha.
  if (r.preferredMinBars !== undefined && r.preferredMaxBars !== undefined) {
    if (ctx.totalBars < r.preferredMinBars || ctx.totalBars > r.preferredMaxBars) return false;
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
    allowLongModules: context?.allowLongModules,
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
 * LÓGICA DE DRIVERS ALFALUX — VERSÃO FINAL 02 (24/04/2026)
 *
 * CENÁRIO A — REDE 220V (Philips Xitanium) para 18W e 36W Fileira Dupla:
 *   1.0 a 2.0 barras → Philips Xitanium 19W 350mA (EQ00346)
 *   2.1 a 5.0 barras → Philips Xitanium 44W 350mA (EQ00347)
 *   5.1 a 7.0 barras → Philips Xitanium 65W 350mA (EQ00393)
 *   GATILHO: barras = 2.0 → EQ00346 | barras = 2.1 → EQ00347 (salto imediato)
 *            barras = 5.0 → EQ00347 | barras = 5.1 → EQ00393 (salto imediato)
 *
 * CENÁRIO B — REDE BIVOLT (Lifud) para 18W:
 *   1.0 a 2.0 barras → Lifud 20W 350mA (EQ00580)
 *   2.1 a 4.0 barras → Lifud 40W 350mA (EQ00581)
 *   4.1 a 6.0 barras → Lifud 60W 350mA (EQ00582)
 *
 * CENÁRIO C — STRIPLINE 220V (apenas inteiros, mínimo 1):
 *   Exatamente 1 barra → Philips Xitanium 44W 250mA (EQ00347)
 *   Exatamente 2 barras → Philips Xitanium 65W 250mA (EQ00393)
 *
 * CENÁRIO D — STRIPLINE BIVOLT (apenas inteiros, mínimo 1):
 *   Exatamente 1 barra → Lifud 40W 250mA (EQ00581)
 *   Exatamente 2 barras → Lifud 60W 250mA (EQ00582)
 *
 * PISO MÍNIMO: se barras < 1.0, assumir 1.0.
 * STRIPLINE: proibido fracionamento — apenas inteiros (1, 2, 3...).
 */
export function selectDriverFallback(
  rawBars: number,
  power: Power,
  voltage: Voltage,
  stripMethod: StripMethod,
  _allowLongModules?: boolean
): SelectedDriver {
  const isBivolt = voltage === "Bivolt";

  // ── CENÁRIO C e D: 36W STRIPLINE ─────────────────────────────────────────────
  // RESTRÇÃO: apenas números INTEIROS (1, 2, 3...). Proibido fracionamento.
  // Piso mínimo: 1. Não aceitar valores < 1.0.
  if (power === 36 && stripMethod === "STRIPLINE") {
    // Garantir inteiro e piso mínimo 1
    const bars = Math.max(1, Math.round(rawBars));
    const vOut = calcVOut(bars, power, stripMethod);
    if (isBivolt) {
      // Exatamente 1 barra → Lifud 40W 250mA (EQ00581)
      // Exatamente 2 barras → Lifud 60W 250mA (EQ00582)
      if (bars <= 1) return { code: "EQ00581", model: "LIFUD 40W 250MA LF-FMR040YS0350U(S)", current: "250mA", quantity: 1, vOut };
      return { code: "EQ00582", model: "LIFUD 60W 250MA LF-FMR060YS0350U(S)", current: "250mA", quantity: 1, vOut };
    } else {
      // Exatamente 1 barra → Philips Xitanium 44W 250mA (EQ00347)
      // Exatamente 2 barras → Philips Xitanium 65W 250mA (EQ00393)
      if (bars <= 1) return { code: "EQ00347", model: "PHILIPS XITANIUM 44W 250MA", current: "250mA", quantity: 1, vOut };
      return { code: "EQ00393", model: "PHILIPS XITANIUM 65W 250MA", current: "250mA", quantity: 1, vOut };
    }
  }

  // ── CENÁRIO A e B: 18W e 36W STRIPFLEX ───────────────────────────────────────
  // 36W Fileira Dupla: barras já multiplicadas por 2 pelo ledEngine.
  // Piso mínimo: 1.0. Não aceitar valores < 1.0.
  if (power === 18 || (power === 36 && stripMethod === "STRIPFLEX")) {
    // Aplicar piso mínimo de 1.0 barra
    const bars = Math.max(1.0, rawBars);
    const vOut = calcVOut(bars, power, stripMethod);
    if (isBivolt) {
      // CENÁRIO B — Bivolt Lifud:
      // 1.0 a 2.0 barras → Lifud 20W 350mA (EQ00580)
      // 2.1 a 4.0 barras → Lifud 40W 350mA (EQ00581)
      // 4.1 a 6.0 barras → Lifud 60W 350mA (EQ00582)
      if (bars <= 2.0) return { code: "EQ00580", model: "LIFUD 20W 350MA LF-FMR020YS0350U(S)", current: "350mA", quantity: 1, vOut };
      if (bars <= 4.0) return { code: "EQ00581", model: "LIFUD 40W 350MA LF-FMR040YS0350U(S)", current: "350mA", quantity: 1, vOut };
      return { code: "EQ00582", model: "LIFUD 60W 350MA LF-FMR060YS0350U(S)", current: "350mA", quantity: 1, vOut };
    } else {
      // CENÁRIO A — 220V Philips Xitanium:
      // 1.0 a 2.0 barras → Philips Xitanium 19W 350mA (EQ00346)
      // 2.1 a 5.0 barras → Philips Xitanium 44W 350mA (EQ00347)
      // 5.1 a 7.0 barras → Philips Xitanium 65W 350mA (EQ00393)
      // GATILHO PRECISO: 2.0 → EQ00346; 2.1 → EQ00347; 5.0 → EQ00347; 5.1 → EQ00393
      if (bars <= 2.0) return { code: "EQ00346", model: "PHILIPS XITANIUM 19W 350MA", current: "350mA", quantity: 1, vOut };
      if (bars <= 5.0) return { code: "EQ00347", model: "PHILIPS XITANIUM 44W 350MA", current: "350mA", quantity: 1, vOut };
      return { code: "EQ00393", model: "PHILIPS XITANIUM 65W 350MA", current: "350mA", quantity: 1, vOut };
    }
  }

  // ── 26W STRIPFLEX (500mA) ──────────────────────────────────────────────────
  // OSRAM IT FIT 75W é o driver principal para 26W/500mA 220V
  // CERTADRIVE 20W é alternativa para 1 barra (25V ≤ 42V)
  const bars26 = Math.max(1.0, rawBars);
  const vOut26 = calcVOut(bars26, power, stripMethod);
  if (isBivolt) {
    return { code: "EQ00220", model: "OSRAM IT FIT 75W 500MA", current: "500mA", quantity: 1, vOut: vOut26 };
  } else {
    if (vOut26 <= 42) return { code: "EQ00353", model: "PHILIPS CERTADRIVE 20W 500MA", current: "500mA", quantity: 1, vOut: vOut26 };
    return { code: "EQ00220", model: "OSRAM IT FIT 75W 500MA", current: "500mA", quantity: 1, vOut: vOut26 };
  }
}
