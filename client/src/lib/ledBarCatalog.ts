/**
 * ledBarCatalog.ts
 *
 * Tipos, engine de cálculo e catálogo estático de fallback para a família LED BAR.
 *
 * LED BAR é vendido por metro linear — o usuário digita qualquer comprimento até 3000mm.
 * Se o comprimento for maior que 3000mm, é obrigatório informar a quantidade de cortes
 * (nCortes ≥ 2), e o perfil será dividido em trechos iguais, cada um com sua fonte.
 *
 * Drivers 0-10V (driverDim010v) são MONOVOLT: 110V ou 220V separados, NÃO bivolt automático.
 * Drivers DALI (driverDimDali) podem ser bivolt conforme indicado no modelo.
 * Driver ON/OFF (driver220 / driverBivolt) seguem o padrão normal.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type LedBarDifusor = "DA" | "DB" | "DC" | "NF";
export type LedBarPotencia = 5 | 10 | 20 | 25;
export type LedBarControle = "ON/OFF" | "DIM 0-10V" | "DIM DALI" | "DIM TRIAC";
export type LedBarVoltage = "110V" | "220V" | "Bivolt";

export interface LedBarDriverInfo {
  model: string;
  code: string;
}

export interface LedBarProduct {
  /** Família do produto (ex: "LED BAR U") */
  familia: string;
  /** SKU do produto (ex: "LED BAR U DB") */
  sku: string;
  /** Nome completo do produto (ex: "LED BAR U DB 10W/M") */
  name: string;
  /** Potência em W/m */
  potencia: LedBarPotencia;
  /** Tipo de difusor */
  difusor: LedBarDifusor;
  /** Módulo LED (sem [CCT]) — campo legado */
  ledModule: string;
  /** Módulo LED específico por CCT (novos campos da API) */
  ledModule2700?: string | null;
  ledModule3000?: string | null;
  ledModule4000?: string | null;
  ledModule5000?: string | null;
  ledModuleQtd2700?: number | null;
  ledModuleQtd3000?: number | null;
  ledModuleQtd4000?: number | null;
  ledModuleQtd5000?: number | null;
  /** Temperaturas de cor disponíveis */
  ccts: string[];
  /** Driver ON/OFF 220V */
  driver220: LedBarDriverInfo | null;
  /** Driver ON/OFF Bivolt */
  driverBivolt: LedBarDriverInfo | null;
  /** Driver DIM 0-10V (MONOVOLT — 110V ou 220V, NÃO bivolt automático) */
  driverDim010v: LedBarDriverInfo | null;
  /** Driver DIM DALI */
  driverDimDali: LedBarDriverInfo | null;
  /** Driver DIM TRIAC 110V */
  driverDimTriac110v?: LedBarDriverInfo | null;
  /** Driver DIM TRIAC 220V */
  driverDimTriac220v?: LedBarDriverInfo | null;
  /** Tipo de instalação (EMBUTIR | SOBREPOR | null para outros) */
  instalacao?: string | null;
  /** URL da foto do produto */
  fotoUrl: string | null;
  /** Preço unitário ON/OFF 220V (R$). null = não cadastrado. */
  precoOnOff220?: number | null;
  /** Preço unitário ON/OFF Bivolt (R$). null = não cadastrado. */
  precoOnOffBivolt?: number | null;
  /** Preço unitário DIM 0-10V (R$). null = não cadastrado. */
  precoDim110v?: number | null;
  /** Preço unitário DIM DALI (R$). null = não cadastrado. */
  precoDimDali?: number | null;
}

// ─── Catálogo estático de fallback ───────────────────────────────────────────
// Usado quando a API não está disponível. Contém apenas os produtos confirmados.

export const LED_BAR_CATALOG: LedBarProduct[] = [
  {
    familia: "LED BAR U",
    sku: "LED BAR U DB",
    name: "LED BAR U DB 5W/M",
    potencia: 5,
    difusor: "DB",
    ledModule: "FITA LED HOPELUMI 24V 5W/M",
    ccts: ["2700K", "3000K", "4000K", "5000K"],
    driver220: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM", code: "EQ00112" },
    driverBivolt: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM", code: "EQ00112" },
    driverDim010v: { model: "FONTE DE TENSÃO 60W 24V IP20 220V DIM TRIAC 0-10V", code: "EQ00583" },
    driverDimDali: { model: "FONTE DE TENSÃO 72W 24V IP67 BIV DIM DALI/0-10V/1-10V/PUSH DT6", code: "EQ00666" },
    fotoUrl: null,
  },
  {
    familia: "LED BAR U",
    sku: "LED BAR U DB",
    name: "LED BAR U DB 10W/M",
    potencia: 10,
    difusor: "DB",
    ledModule: "FITA LED HOPELUMI 24V 10W/M",
    ccts: ["2700K", "3000K", "4000K", "5000K"],
    driver220: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM", code: "EQ00112" },
    driverBivolt: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM", code: "EQ00112" },
    driverDim010v: { model: "FONTE DE TENSÃO 60W 24V IP20 220V DIM TRIAC 0-10V", code: "EQ00583" },
    driverDimDali: { model: "FONTE DE TENSÃO 72W 24V IP67 BIV DIM DALI/0-10V/1-10V/PUSH DT6", code: "EQ00666" },
    fotoUrl: null,
  },
  {
    familia: "LED BAR U",
    sku: "LED BAR U DB",
    name: "LED BAR U DB 25W/M",
    potencia: 25,
    difusor: "DB",
    ledModule: "FITA LED HOPELUMI 24V 25W/M",
    ccts: ["2700K", "3000K", "4000K", "5000K"],
    driver220: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM", code: "EQ00112" },
    driverBivolt: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM", code: "EQ00112" },
    driverDim010v: { model: "FONTE DE TENSÃO 60W 24V IP20 220V DIM TRIAC 0-10V", code: "EQ00583" },
    driverDimDali: { model: "FONTE DE TENSÃO 72W 24V IP67 BIV DIM DALI/0-10V/1-10V/PUSH DT6", code: "EQ00666" },
    fotoUrl: null,
  },
];

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Comprimento máximo de um trecho sem corte para LED BAR rígido (mm) */
export const LED_BAR_MAX_LENGTH_MM = 3000;

/** Comprimento máximo de um trecho sem corte para PERFIL FLEXÍVEL (mm) */
export const PERFIL_FLEXIVEL_MAX_LENGTH_MM = 5000;

// ─── Tabela de preços LED BAR U ──────────────────────────────────────────────

/**
 * Famílias de LED BAR que ainda não têm tabela de preço cadastrada.
 * Para essas famílias, calcLedBarPrice retorna null e o usuário preenche manualmente no carrinho.
 */
export const LED_BAR_FAMILIES_NO_PRICE = /^(LED BAR WW|FLOOR|LED BAR EC|MEIA LUA|MILANO)/i;

/**
 * Preço temporário do PERFIL FLEXÍVEL por metro linear (R$).
 * Valor: R$ 157,00/m — apenas o perfil, sem drivers/fontes.
 * TODO: remover quando a API Alfalux fornecer o preço automaticamente.
 */
export const PERFIL_FLEXIVEL_PRECO_POR_METRO_TEMP = 157.00;

/** Preço por metro linear (R$) por potência. Difusor não altera o valor. */
export const LED_BAR_PRECO_POR_METRO: Record<LedBarPotencia, number> = {
  5:  106.40,
  10: 120.00,
  20: 126.00, // MILANO / MEIA LUA — preço provisorio; atualizar quando API fornecer
  25: 133.89,
};

/** Preço fixo do driver 60W por corte (R$). Usado quando potência do trecho ≤ 60W. */
export const LED_BAR_PRECO_DRIVER_60W = 104.28;

/** Preço fixo do driver 100W por corte (R$). Usado quando potência do trecho > 60W e ≤ 100W. */
export const LED_BAR_PRECO_DRIVER_100W = 157.27;

/**
 * Seleciona o preço do driver correto para um trecho de LED BAR.
 * Regra: potência_trecho = potencia_wm × comprimento_trecho_m
 *   ≤ 60W  → driver 60W  (R$104,28)
 *   > 60W  → driver 100W (R$157,27)
 */
export function selectLedBarDriverPrice(
  potenciaWm: LedBarPotencia,
  comprimentoTrechoMm: number
): { preco: number; wattsDriver: 60 | 100; potenciaTrecho: number } {
  const potenciaTrecho = potenciaWm * (comprimentoTrechoMm / 1000);
  if (potenciaTrecho <= 60) {
    return { preco: LED_BAR_PRECO_DRIVER_60W, wattsDriver: 60, potenciaTrecho };
  }
  return { preco: LED_BAR_PRECO_DRIVER_100W, wattsDriver: 100, potenciaTrecho };
}

/**
 * Calcula o preço total de um LED BAR:
 *   preço = (R$/m × comprimentoTotalMm / 1000) + soma(preço_driver_por_trecho)
 *
 * Cada trecho tem seu driver selecionado individualmente com base na potência.
 *
 * @param potencia  Potência em W/m
 * @param comprimentoTotalMm  Comprimento total em mm
 * @param nCortes   Número de cortes (cada corte leva 1 driver)
 * @param familia   Família do produto (opcional). Se for uma família sem preço, retorna null.
 * @returns Preço total em R$, ou null se a família não tem tabela de preço
 */
export function calcLedBarPrice(
  potencia: LedBarPotencia,
  comprimentoTotalMm: number,
  nCortes: number,
  familia?: string
): number | null {
  // Famílias sem tabela de preço: retornar null para que o usuário preencha manualmente
  if (familia && LED_BAR_FAMILIES_NO_PRICE.test(familia)) return null;
  // PERFIL FLEXÍVEL: preço temporário fixo por metro (independente de potência), sem drivers
  if (familia && /^PERFIL FLEXIVEL/i.test(familia)) {
    const comprimentoM = comprimentoTotalMm / 1000;
    return Math.round(PERFIL_FLEXIVEL_PRECO_POR_METRO_TEMP * comprimentoM * 100) / 100;
  }
  const precoPorMetro = LED_BAR_PRECO_POR_METRO[potencia] ?? 0;
  const comprimentoM  = comprimentoTotalMm / 1000;
  // Comprimento por trecho (igual para todos os cortes)
  const comprimentoTrechoMm = Math.floor(comprimentoTotalMm / Math.max(1, nCortes));
  // Soma dos drivers (cada trecho pode ter driver diferente)
  let totalDrivers = 0;
  for (let i = 0; i < Math.max(1, nCortes); i++) {
    totalDrivers += selectLedBarDriverPrice(potencia, comprimentoTrechoMm).preco;
  }
  const total = precoPorMetro * comprimentoM + totalDrivers;
  return Math.round(total * 100) / 100;
}

/**
 * Retorna o detalhamento de preço do LED BAR para exibição na UI.
 * Retorna null se a família não tem tabela de preço.
 */
export function calcLedBarPriceDetail(
  potencia: LedBarPotencia,
  comprimentoTotalMm: number,
  nCortes: number,
  familia?: string
): {
  precoPerfil: number;
  precoDriverPorCorte: number;
  wattsDriver: 60 | 100;
  potenciaTrecho: number;
  totalDrivers: number;
  total: number;
  perfilFlexivelTemp?: boolean; // indica que o preço é temporário e não inclui drivers
} | null {
  if (familia && LED_BAR_FAMILIES_NO_PRICE.test(familia)) return null;
  // PERFIL FLEXÍVEL: preço temporário fixo por metro, sem drivers
  if (familia && /^PERFIL FLEXIVEL/i.test(familia)) {
    const comprimentoM = comprimentoTotalMm / 1000;
    const precoPerfil = Math.round(PERFIL_FLEXIVEL_PRECO_POR_METRO_TEMP * comprimentoM * 100) / 100;
    return {
      precoPerfil,
      precoDriverPorCorte: 0,
      wattsDriver: 60,
      potenciaTrecho: 0,
      totalDrivers: 0,
      total: precoPerfil,
      perfilFlexivelTemp: true,
    };
  }
  const precoPorMetro = LED_BAR_PRECO_POR_METRO[potencia] ?? 0;
  const comprimentoM  = comprimentoTotalMm / 1000;
  const comprimentoTrechoMm = Math.floor(comprimentoTotalMm / Math.max(1, nCortes));
  const { preco: precoDriverPorCorte, wattsDriver, potenciaTrecho } = selectLedBarDriverPrice(potencia, comprimentoTrechoMm);
  const nT = Math.max(1, nCortes);
  const precoPerfil = Math.round(precoPorMetro * comprimentoM * 100) / 100;
  const totalDrivers = Math.round(precoDriverPorCorte * nT * 100) / 100;
  const total = Math.round((precoPerfil + totalDrivers) * 100) / 100;
  return { precoPerfil, precoDriverPorCorte, wattsDriver, potenciaTrecho, totalDrivers, total };
}

export const LED_BAR_POTENCIA_OPTIONS: { value: LedBarPotencia; label: string }[] = [
  { value: 5,  label: "5 W/m" },
  { value: 10, label: "10 W/m" },
  { value: 20, label: "20 W/m" },
  { value: 25, label: "25 W/m" },
];

export const LED_BAR_DIFUSOR_OPTIONS: { value: LedBarDifusor; label: string; desc: string }[] = [
  { value: "DA", label: "DA", desc: "Difusor Alto" },
  { value: "DB", label: "DB", desc: "Difusor Baixo" },
  { value: "DC", label: "DC", desc: "Difusor Curvo" },
  { value: "NF", label: "NF", desc: "No Frame" },
];

export const LED_BAR_CONTROLE_OPTIONS: { value: LedBarControle; label: string }[] = [
  { value: "ON/OFF",    label: "ON/OFF" },
  { value: "DIM 0-10V", label: "DIM 0-10V" },
  { value: "DIM DALI",  label: "DIM DALI" },
  { value: "DIM TRIAC", label: "DIM TRIAC" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extrai a potência em W/m do nome do produto.
 * Ex: "LED BAR U DB 10W/M" → 10
 */
export function parsePotenciaFromName(name: string): LedBarPotencia | null {
  const m = name.match(/(\d+)\s*W\/M/i);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  if (v === 5 || v === 10 || v === 20 || v === 25) return v;
  return null;
}

/**
 * Extrai o tipo de difusor do nome ou SKU do produto.
 * Ex: "LED BAR U DB 10W/M" → "DB"
 */
export function parseDifusorFromName(name: string): LedBarDifusor | null {
  const m = name.match(/\b(DA|DB|DC|NF)\b/i);
  if (!m) return null;
  return m[1].toUpperCase() as LedBarDifusor;
}

/**
 * Verifica se o driver DIM 0-10V suporta bivolt (busca "biv" no modelo).
 */
export function dim010vIsBivolt(product: LedBarProduct): boolean {
  if (!product.driverDim010v) return false;
  return /bivolt|biv\b/i.test(product.driverDim010v.model);
}

/**
 * Verifica se o driver DALI suporta bivolt.
 */
export function daliIsBivolt(product: LedBarProduct): boolean {
  if (!product.driverDimDali) return false;
  return /bivolt|biv\b/i.test(product.driverDimDali.model);
}

/**
 * Retorna as opções de tensão disponíveis para o produto e controle selecionados.
 * - ON/OFF: 220V (se driver220 != null) + Bivolt (se driverBivolt != null)
 * - DIM 0-10V: 110V + 220V (monovolt — NÃO bivolt automático, exceto se modelo indicar)
 * - DIM DALI: 220V + Bivolt (se modelo indicar bivolt)
 * - DIM TRIAC: 110V (se driverDimTriac110v != null) e/ou 220V (se driverDimTriac220v != null)
 */
export function getAvailableVoltages(
  product: LedBarProduct,
  controle: LedBarControle
): LedBarVoltage[] {
  if (controle === "ON/OFF") {
    const opts: LedBarVoltage[] = [];
    if (product.driver220) opts.push("220V");
    if (product.driverBivolt) opts.push("Bivolt");
    // Garantir pelo menos uma opção
    if (opts.length === 0) opts.push("220V");
    return opts;
  }
  if (controle === "DIM 0-10V") {
    // Monovolt 220V apenas (a fonte EQ00583 é 220V).
    return ["220V"];
  }
  if (controle === "DIM DALI") {
    const opts: LedBarVoltage[] = ["220V"];
    if (daliIsBivolt(product)) opts.push("Bivolt");
    return opts;
  }
  if (controle === "DIM TRIAC") {
    const opts: LedBarVoltage[] = [];
    if (product.driverDimTriac110v) opts.push("110V");
    if (product.driverDimTriac220v) opts.push("220V");
    // Fallback: se não há drivers TRIAC específicos, usa driverDim010v (monovolt 220V)
    if (opts.length === 0 && product.driverDim010v) opts.push("220V");
    if (opts.length === 0) opts.push("220V");
    return opts;
  }
  return ["220V"];
}

// ─── Engine de Cálculo ────────────────────────────────────────────────────────

export interface LedBarInput {
  product: LedBarProduct;
  comprimentoMm: number;
  nCortes: number; // 1 = sem corte (trecho único), ≥ 2 = dividir em nCortes trechos iguais
  controle: LedBarControle;
  voltage: LedBarVoltage;
  cct: string;
  /** Comprimento máximo por trecho (mm). Padrão: LED_BAR_MAX_LENGTH_MM (3000). Para PERFIL FLEXÍVEL use PERFIL_FLEXIVEL_MAX_LENGTH_MM (5000). */
  maxLengthMm?: number;
}

export interface LedBarTrecho {
  /** Número do trecho (1-based) */
  numero: number;
  /** Comprimento do trecho em mm */
  comprimentoMm: number;
  /** Driver selecionado para este trecho */
  driver: LedBarDriverInfo;
  /** Tensão do driver */
  voltage: LedBarVoltage;
}

export interface LedBarResult {
  product: LedBarProduct;
  comprimentoTotalMm: number;
  nCortes: number;
  comprimentoPorTrechoMm: number;
  trechos: LedBarTrecho[];
  controle: LedBarControle;
  voltage: LedBarVoltage;
  cct: string;
  /** Módulo LED com CCT substituído */
  ledModuleWithCCT: string;
  /** Erros de validação */
  errors: string[];
}

/**
 * Seleciona o driver correto para o controle e tensão selecionados.
 */
function selectDriver(
  product: LedBarProduct,
  controle: LedBarControle,
  voltage: LedBarVoltage
): LedBarDriverInfo | null {
  if (controle === "ON/OFF") {
    if (voltage === "Bivolt") return product.driverBivolt;
    return product.driver220;
  }
  if (controle === "DIM 0-10V") {
    // Monovolt: usa driverDim010v para 110V e 220V
    // (o mesmo driver físico, mas a tensão de entrada é configurada pelo instalador)
    return product.driverDim010v;
  }
  if (controle === "DIM DALI") {
    return product.driverDimDali;
  }
  if (controle === "DIM TRIAC") {
    if (voltage === "110V") return product.driverDimTriac110v ?? product.driverDim010v ?? null;
    // Para 220V: usa driverDimTriac220v se disponível, senão fallback para driverDim010v
    return product.driverDimTriac220v ?? product.driverDim010v ?? null;
  }
  return product.driver220;
}

/**
 * Calcula a composição de um LED BAR.
 *
 * Regras:
 * - comprimento ≤ maxLengthMm → 1 trecho (nCortes = 1)
 * - comprimento > maxLengthMm → nCortes ≥ 2 obrigatório
 * - Cada trecho recebe sua própria fonte
 * - Comprimento por trecho = floor(comprimentoTotal / nCortes) mm
 *   (o último trecho pode ter 1mm a menos por arredondamento — aceitável)
 */
export function calculateLedBar(input: LedBarInput): LedBarResult {
  const { product, comprimentoMm, nCortes, controle, voltage, cct, maxLengthMm: maxLen } = input;
  const maxLengthMm = maxLen ?? LED_BAR_MAX_LENGTH_MM;
  const errors: string[] = [];

  // Validações
  if (comprimentoMm <= 0) {
    errors.push("O comprimento deve ser maior que 0mm.");
  }
  if (comprimentoMm > maxLengthMm && nCortes < 2) {
    errors.push(`Comprimento acima de ${maxLengthMm}mm requer pelo menos 2 cortes.`);
  }
  if (nCortes < 1) {
    errors.push("A quantidade de cortes deve ser pelo menos 1.");
  }

  const driver = selectDriver(product, controle, voltage);
  if (!driver) {
    errors.push(`Driver não disponível para controle "${controle}" e tensão "${voltage}".`);
  }

  // Calcular comprimento por trecho
  const nTrechos = Math.max(1, nCortes);
  const comprimentoPorTrechoMm = Math.floor(comprimentoMm / nTrechos);

  // Montar trechos
  const trechos: LedBarTrecho[] = [];
  for (let i = 0; i < nTrechos; i++) {
    trechos.push({
      numero: i + 1,
      comprimentoMm: comprimentoPorTrechoMm,
      driver: driver ?? { model: "Driver não disponível", code: "" },
      voltage,
    });
  }

  // Usar módulo LED específico por CCT quando disponível (novos campos da API)
  const cctKeyLB = cct.replace("K", "") as "2700" | "3000" | "4000" | "5000";
  const cctSpecificModuleLB = (product as any)[`ledModule${cctKeyLB}`] as string | null | undefined;
  const ledModuleWithCCT = cctSpecificModuleLB
    ? cctSpecificModuleLB.replace(/\[CCT\]/gi, cct).trim()
    : product.ledModule.replace(/\[CCT\]/gi, cct).trim();

  return {
    product,
    comprimentoTotalMm: comprimentoMm,
    nCortes: nTrechos,
    comprimentoPorTrechoMm,
    trechos,
    controle,
    voltage,
    cct,
    ledModuleWithCCT,
    errors,
  };
}
