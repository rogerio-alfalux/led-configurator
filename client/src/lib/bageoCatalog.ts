/**
 * bageoCatalog.ts
 *
 * Tipos, engine de cálculo e catálogo estático de fallback para a família BAGEO.
 *
 * BAGEO é um perfil sinuoso vendido por metro linear — o usuário digita qualquer comprimento.
 * Há dois modelos:
 *   - D1 (20W/m): usa 2x FITA LED HOPELUMI 24V 10W/M — circuito único
 *   - D1+D2 (40W/m): usa FITA LED HOPELUMI 24V 10W/M — dois circuitos independentes
 *
 * Drivers são fontes de tensão 24V (não drivers de corrente constante como nos perfis lineares).
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type BageoAplicacao = "D1" | "D1+D2";
export type BageoControle = "ON/OFF" | "DIM 0-10V" | "DIM DALI";
export type BageoVoltage = "220V" | "Bivolt";

export interface BageoDriverInfo {
  model: string;
  code: string;
}

export interface BageoProduct {
  /** Família do produto (ex: "BAGEO") */
  familia: string;
  /** SKU do produto */
  sku: string;
  /** Nome completo do produto */
  name: string;
  /** Aplicação: D1 ou D1+D2 */
  aplicacao: BageoAplicacao;
  /** Módulo LED (com [CCT] placeholder) */
  ledModule: string;
  /** Quantidade de módulos LED */
  ledModuleQtd: number;
  /** Temperaturas de cor disponíveis */
  ccts: string[];
  /** Driver ON/OFF 220V */
  driver220: BageoDriverInfo | null;
  /** Driver ON/OFF Bivolt */
  driverBivolt: BageoDriverInfo | null;
  /** Driver DIM 0-10V */
  driverDim110v: BageoDriverInfo | null;
  /** Driver DIM DALI */
  driverDimDali: BageoDriverInfo | null;
  /** URL da foto do produto */
  fotoUrl: string | null;
}

// ─── Catálogo estático de fallback ───────────────────────────────────────────

export const BAGEO_CATALOG: BageoProduct[] = [
  {
    familia: "BAGEO",
    sku: "LDP-4910",
    name: "BAGEO SINUOSA P D1 20W/M",
    aplicacao: "D1",
    ledModule: "2x FITA LED HOPELUMI 24V 10W/M [CCT]",
    ledModuleQtd: 2,
    ccts: ["2700K", "3000K", "4000K", "5000K"],
    driver220: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM (EQ00112)", code: "EQ00112" },
    driverBivolt: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM (EQ00112)", code: "EQ00112" },
    driverDim110v: { model: "FONTE DE TENSÃO 60W 24V IP20 220V DIM TRIAC 0-10V (EQ00583)", code: "EQ00583" },
    driverDimDali: { model: "FONTE DE TENSÃO 72W 24V IP67 BIV DIM DALI/0-10V/1-10V/PUSH DT6 (EQ00666)", code: "EQ00666" },
    fotoUrl: null,
  },
  {
    familia: "BAGEO",
    sku: "LDP-4910",
    name: "BAGEO SINUOSA P D1+D2 40W/M",
    aplicacao: "D1+D2",
    ledModule: "FITA LED HOPELUMI 24V 10W/M [CCT]",
    ledModuleQtd: 1,
    ccts: ["2700K", "3000K", "4000K", "5000K"],
    driver220: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM (EQ00112)", code: "EQ00112" },
    driverBivolt: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM (EQ00112)", code: "EQ00112" },
    driverDim110v: { model: "FONTE DE TENSÃO 60W 24V IP20 220V DIM TRIAC 0-10V (EQ00583)", code: "EQ00583" },
    driverDimDali: { model: "FONTE DE TENSÃO 72W 24V IP67 BIV DIM DALI/0-10V/1-10V/PUSH DT6 (EQ00666)", code: "EQ00666" },
    fotoUrl: null,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parseia a aplicação (D1 ou D1+D2) a partir do nome do produto */
export function parseAplicacaoFromName(name: string): BageoAplicacao | null {
  if (/D1\+D2/i.test(name)) return "D1+D2";
  if (/\bD1\b/i.test(name)) return "D1";
  return null;
}

/** Retorna as tensões disponíveis para o produto e controle selecionados */
export function getBageoAvailableVoltages(
  product: BageoProduct,
  controle: BageoControle
): BageoVoltage[] {
  if (controle === "DIM 0-10V") {
    // DIM 0-10V é monovolt — apenas 220V
    return ["220V"];
  }
  const opts: BageoVoltage[] = ["220V"];
  if (product.driverBivolt) opts.push("Bivolt");
  return opts;
}

// ─── Engine de Cálculo ────────────────────────────────────────────────────────

export interface BageoInput {
  product: BageoProduct;
  controle: BageoControle;
  voltage: BageoVoltage;
  cct: string;
}

export interface BageoResult {
  product: BageoProduct;
  controle: BageoControle;
  voltage: BageoVoltage;
  cct: string;
  driver: BageoDriverInfo;
  /** Módulo LED com CCT substituído */
  ledModuleWithCCT: string;
}

/**
 * Seleciona o driver correto para o controle e tensão selecionados.
 */
function selectBageoDriver(
  product: BageoProduct,
  controle: BageoControle,
  voltage: BageoVoltage
): BageoDriverInfo | null {
  if (controle === "DIM DALI") return product.driverDimDali;
  if (controle === "DIM 0-10V") return product.driverDim110v;
  // ON/OFF
  if (voltage === "Bivolt") return product.driverBivolt;
  return product.driver220;
}

/**
 * Calcula o resultado de configuração de um BAGEO.
 */
export function calculateBageo(catalog: BageoProduct[], input: BageoInput): BageoResult | null {
  const product = catalog.find(
    (p) => p.sku === input.product.sku && p.aplicacao === input.product.aplicacao
  );
  if (!product) return null;

  const driver = selectBageoDriver(product, input.controle, input.voltage);
  if (!driver) return null;

  const ledModuleWithCCT = product.ledModule.replace(/\[CCT\]/gi, input.cct).trim();

  return {
    product,
    controle: input.controle,
    voltage: input.voltage,
    cct: input.cct,
    driver,
    ledModuleWithCCT,
  };
}
