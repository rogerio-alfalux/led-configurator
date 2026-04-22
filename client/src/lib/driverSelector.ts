/**
 * driverSelector.ts
 * Seleciona o driver correto da lista do Google Sheets com base em:
 *   - Tensão de saída calculada (barras × V/barra)
 *   - Corrente requerida (mA)
 *   - Tensão de entrada (220V ou Bivolt)
 *   - Prioridade (menor = melhor)
 *
 * Tensões de referência por barra:
 *   Stripflex 562,5 x 10mm: ~25V por barra (350mA ou 500mA)
 *   Stripline 562,5 x 15mm: ~75V por barra (250mA)
 */

import type { Power, Voltage, StripMethod, CCT } from "./ledEngine";

export interface SheetDriver {
  code: string;
  model: string;
  inputVoltage: string;
  outputRanges: { current: number; vMin: number; vMax: number }[];
  currents: number[];
  available: boolean;
  priority: number;
}

export interface SelectedDriver {
  code: string;        // EQ00346
  model: string;       // PHILIPS XITANIUM 19W
  current: string;     // "350mA"
  quantity: number;    // sempre 1 por SKU
  vOut: number;        // tensão de saída calculada
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
  // Para 36W Stripflex dupla: o driver alimenta 2 barras em paralelo por seção.
  // Barras em paralelo = mesma tensão, então Vout = barras_em_serie × V/barra.
  // O campo barsTotal já representa as barras em série (1 para 18W, 2 para 36W barra dupla).
  // Para o driver, o que importa é a tensão total em série.
  if (power === 36 && stripMethod === "STRIPFLEX") {
    // Barra dupla: 2 barras em paralelo por seção → tensão = barras_série × 25V
    // barsTotal = barras físicas (2 por seção), mas em paralelo → Vout = (barsTotal/2) × 25V
    return (totalBarsForDriver / 2) * vPerBar;
  }
  return totalBarsForDriver * vPerBar;
}

/**
 * Seleciona o melhor driver da lista para um dado módulo.
 */
export function selectDriverFromSheet(
  drivers: SheetDriver[],
  totalBars: number,
  power: Power,
  voltage: Voltage,
  stripMethod: StripMethod
): SelectedDriver | null {
  const currentMA = getCurrentMA(power, stripMethod);
  const vOut = calcVOut(totalBars, power, stripMethod);
  const isBivolt = voltage === "Bivolt";

  const candidates = drivers.filter(d => {
    if (!d.available) return false;
    const inputMatch = isBivolt
      ? d.inputVoltage === "BIVOLT"
      : d.inputVoltage === "220V";
    if (!inputMatch) return false;
    if (!d.currents.includes(currentMA)) return false;
    const range = d.outputRanges.find(r => r.current === currentMA);
    if (!range) return false;
    return vOut >= range.vMin && vOut <= range.vMax;
  });

  if (candidates.length === 0) return null;

  // Ordenar por prioridade (menor = melhor), depois menor potência
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
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
    return { code: "EQ00232", model: "LIFUD 20W LF/GIF022YF0500HDDS", current: "500mA", quantity: 1, vOut };
  }
}
