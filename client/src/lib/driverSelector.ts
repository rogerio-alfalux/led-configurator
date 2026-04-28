/**
 * driverSelector.ts
 * Seleciona o driver correto da lista do Google Sheets com base em:
 *   - Tensão de saída calculada (barras x V/barra)
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
  /** Drivers adicionais para casos de combo (ex: Stripline 3 barras = 44W + 65W) */
  combo?: Array<{ code: string; model: string; quantity: number }>;
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

/**
 * Resultado de seleção de driver com possível erro técnico.
 * Quando `error` está definido, o driver não deve ser usado.
 */
export interface DriverSelectionResult {
  driver: SelectedDriver | null;
  error?: string;   // ex: "Medida 1.7 barras não existe para 26W"
  warning?: string; // ex: "Driver deve ser desencapado (BLAZE H)"
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
 * Para Stripflex simples (18W/26W): tensão = barras x V/barra.
 * Para Stripline: tensão = barras x 75V.
 */
export function calcVOut(
  totalBarsForDriver: number,
  power: Power,
  stripMethod: StripMethod
): number {
  const vPerBar = V_PER_BAR[stripMethod];
  // Para 36W Stripflex dupla: 2 barras em paralelo por seção > tensão = barras_série x 25V
  // barsTotal = barras físicas (2 por seção), mas em paralelo > Vout = (barsTotal/2) x 25V
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
 * SISTEMA DETERMINÍSTICO DE SELEÇÃO DE DRIVERS — VERSÃO 03 (27/04/2026)
 *
 * A seleção de driver É UMA CONSULTA OBRIGATÓRIA na tabela DRIVER_LOOKUP_ALFALUX.
 * NÃO é uma decisão de lógica, aproximação ou interpretação.
 *
 * Fluxo:
 *   1. Receber barras_por_peca (valor real, SEM arredondar)
 *   2. Consultar DRIVER_LOOKUP_TABLE (driverLookup.ts)
 *   3. Filtrar por Potencia + Tensao + Tipo_Barra
 *   4. Encontrar linha onde Barras_Min <= barras <= Barras_Max
 *   5. Retornar Driver_Modelo + Driver_Codigo
 *   6. Se não encontrar: ERRO
 *
 * PROIBIDO: arredondar barras, usar CEIL/FLOOR, usar driver fora do intervalo.
 */
import { lookupDriver, DRIVER_LOOKUP_TABLE, type DriverLookupRow } from "./driverLookup";

/**
 * Retorna o máximo de barras suportado por um único driver para uma dada combinação.
 * Usado para calcular o split quando D1+D2 simultâneo excede o limite.
 */
function getMaxBarsForConfig(
  potencia: string,
  tensao: string,
  tipoBarra: string
): number {
  const rows = DRIVER_LOOKUP_TABLE.filter(
    (r: DriverLookupRow) => r.potencia === potencia && r.tensao === tensao && r.tipoBarra === tipoBarra
  );
  if (rows.length === 0) return 7; // fallback conservador
  return Math.max(...rows.map((r: DriverLookupRow) => r.barrasMax));
}

/**
 * Quando D1+D2 simultâneo e as barras efetivas (barsPerModule × 2) excedem o limite da tabela,
 * divide em N drivers iguais do maior modelo disponível.
 *
 * Estratégia:
 *   1. Calcular N mínimo de drivers para cobrir as barras efetivas
 *   2. Dividir barras_efetivas / N — cada driver recebe barras_efetivas/N
 *   3. Retornar um combo com N itens iguais
 *
 * Exemplo 18W 220Vac:
 *   - 8.4 barras efetivas → máximo = 7 → N = ceil(8.4/7) = 2 → cada driver: 4.2 barras → EQ00347 (44W)
 *   - 10 barras efetivas → N = ceil(10/7) = 2 → cada driver: 5 barras → EQ00347 (44W)
 *   - 14.2 barras efetivas → N = ceil(14.2/7) = 3 → cada driver: ~4.73 barras → EQ00347 (44W)
 */
export function splitDriverForDualSimultaneous(
  effectiveBars: number,
  power: Power,
  voltage: Voltage,
  stripMethod: StripMethod
): SelectedDriver | null {
  const potencia = `${power}W`;
  const tensao = voltage === "Bivolt" ? "Bivolt" : "220V";
  const tipoBarra = stripMethod === "STRIPFLEX" ? "Stripflex" : "Stripline";
  const currentMA = getCurrentMA(power, stripMethod);
  const maxBars = getMaxBarsForConfig(potencia, tensao, tipoBarra);

  if (effectiveBars <= maxBars) return null; // não precisa de split

  // Calcular N mínimo de drivers
  const n = Math.ceil(effectiveBars / maxBars);
  const barsPerDriver = effectiveBars / n;

  // Selecionar o driver para barsPerDriver barras
  const result = lookupDriver(barsPerDriver, potencia, tensao, tipoBarra);
  if (result.error) return null; // não foi possível dividir

  const vOut = calcVOut(effectiveBars, power, stripMethod);

  // Retornar como combo com N itens iguais
  const comboItem = { code: result.driverCodigo, model: result.driverModelo, quantity: n };
  return {
    code: result.driverCodigo,
    model: result.driverModelo,
    current: `${currentMA}mA`,
    quantity: n,
    vOut,
    combo: [comboItem],
  };
}

export function selectDriverFallback(
  rawBars: number,
  power: Power,
  voltage: Voltage,
  stripMethod: StripMethod,
  _allowLongModules?: boolean,
  _profileCode?: string
): SelectedDriver {
  const bars = Math.max(1.0, rawBars);
  const potencia = `${power}W`;
  const tensao = voltage === "Bivolt" ? "Bivolt" : "220V";
  const tipoBarra = stripMethod === "STRIPFLEX" ? "Stripflex" : "Stripline";
  const vOut = calcVOut(bars, power, stripMethod);
  const currentMA = getCurrentMA(power, stripMethod);

  const result = lookupDriver(bars, potencia, tensao, tipoBarra);

  if (result.error) {
    // Retornar um driver de erro com o código especial ERRO
    return {
      code: "ERRO",
      model: result.error,
      current: `${currentMA}mA`,
      quantity: 0,
      vOut,
    };
  }

  // Verificar se é um driver composto (combo) — driverCodigo contém " + "
  // Ex: "EQ00347 + EQ00393" = 1x 44W + 1x 65W (Stripline 3 barras)
  if (result.driverCodigo.includes(" + ")) {
    // Parsear os códigos e modelos do combo
    const codigos = result.driverCodigo.split(" + ").map(s => s.trim());
    const modelos = result.driverModelo.split(" + ").map(s => s.trim());

    // Parsear quantity de cada parte (prefixo "Nx ")
    const comboItems = codigos.map((code, i) => {
      const modelStr = modelos[i] ?? code;
      const qMatch = modelStr.match(/^(\d+)x\s+/i);
      const qty = qMatch ? parseInt(qMatch[1], 10) : 1;
      const cleanModel = modelStr.replace(/^\d+x\s+/i, "");
      return { code, model: cleanModel, quantity: qty };
    });

    // O driver principal é o primeiro do combo
    return {
      code: comboItems[0].code,
      model: comboItems[0].model,
      current: `${currentMA}mA`,
      quantity: comboItems[0].quantity,
      vOut,
      combo: comboItems, // todos os itens do combo (incluindo o primeiro)
    };
  }

  // Determinar quantity para Certadrive (26W pode ter 1x, 2x ou 3x)
  // O modelo na tabela usa prefixo: "PHILIPS CERTADRIVE 20W" (1x), "2x PHILIPS..." (2x), "3x PHILIPS..." (3x)
  let quantity = 1;
  if (result.driverCodigo === "EQ00353") {
    const match = result.driverModelo.match(/^(\d+)x\s/i);
    if (match) {
      quantity = parseInt(match[1], 10);
    } else {
      quantity = 1;
    }
  }
  // Detectar quantity para outros drivers com prefixo "Nx " (ex: "2x PHILIPS XITANIUM 65W")
  if (quantity === 1) {
    const qMatch = result.driverModelo.match(/^(\d+)x\s/i);
    if (qMatch) {
      quantity = parseInt(qMatch[1], 10);
    }
  }

  return {
    code: result.driverCodigo,
    model: result.driverModelo.replace(/^\d+x\s+/i, ""), // remover prefixo "Nx " do modelo
    current: `${currentMA}mA`,
    quantity,
    vOut,
  };
}
