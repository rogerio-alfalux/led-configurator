/**
 * bageoCatalog.ts
 *
 * Tipos, engine de cálculo e catálogo estático de fallback para a família BAGEO.
 *
 * BAGEO é um perfil sinuoso vendido por metro linear — o usuário digita o comprimento
 * desejado em mm e o configurador calcula drivers, módulos LED e preço proporcionalmente.
 *
 * Há dois modelos:
 *   - D1 (20W/m): usa 2x FITA LED HOPELUMI 24V 10W/M — circuito único
 *   - D1+D2 (40W/m): usa FITA LED HOPELUMI 24V 10W/M — dois circuitos independentes
 *
 * Drivers são fontes de tensão 24V (não drivers de corrente constante como nos perfis lineares).
 * Preços são por metro linear (campo custoLuminaria na API).
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type BageoInstalacao = "PENDENTE" | "SOBREPOR" | "EMBUTIR";
export type BageoAplicacao = "D1" | "D1+D2";
export type BageoControle = "ON/OFF 220V" | "ON/OFF Bivolt" | "DIM 1-10V" | "DIM DALI";

export interface BageoDriverInfo {
  model: string;
  code: string;
}

export interface BageoProduct {
  /** Família do produto */
  familia: string;
  /** SKU do produto */
  sku: string;
  /** Nome completo do produto */
  name: string;
  /** Tipo de instalação */
  instalacao: BageoInstalacao;
  /** Aplicação: D1 ou D1+D2 */
  aplicacao: BageoAplicacao;
  /** Módulo LED (com [CCT] placeholder) */
  ledModule: string;
  /** Quantidade de módulos LED por metro */
  ledModuleQtd: number;
  /** Temperaturas de cor disponíveis */
  ccts: string[];
  /** Driver ON/OFF 220V */
  driver220: BageoDriverInfo | null;
  /** Driver ON/OFF Bivolt */
  driverBivolt: BageoDriverInfo | null;
  /** Driver DIM 1-10V */
  driverDim110v: BageoDriverInfo | null;
  /** Driver DIM DALI */
  driverDimDali: BageoDriverInfo | null;
  /** Preço por metro linear (R$) — ON/OFF 220V */
  precoOnOff220: number | null;
  /** Preço por metro linear (R$) — ON/OFF Bivolt */
  precoOnOffBivolt: number | null;
  /** Preço por metro linear (R$) — DIM 1-10V */
  precoDim110v: number | null;
  /** Preço por metro linear (R$) — DIM DALI */
  precoDimDali: number | null;
  /** URL da foto do produto */
  fotoUrl: string | null;
}

// ─── Catálogo estático de fallback ───────────────────────────────────────────

export const BAGEO_CATALOG: BageoProduct[] = [
  {
    familia: "BAGEO",
    sku: "LDP-4910",
    name: "BAGEO SINUOSA P D1 20W/M",
    instalacao: "PENDENTE",
    aplicacao: "D1",
    ledModule: "2x FITA LED HOPELUMI 24V 10W/M [CCT]",
    ledModuleQtd: 2,
    ccts: ["2700K", "3000K", "4000K", "5000K"],
    driver220: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM (EQ00112)", code: "EQ00112" },
    driverBivolt: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM (EQ00112)", code: "EQ00112" },
    driverDim110v: { model: "FONTE DE TENSÃO 60W 24V IP20 220V DIM TRIAC 0-10V (EQ00583)", code: "EQ00583" },
    driverDimDali: { model: "FONTE DE TENSÃO 72W 24V IP67 BIV DIM DALI/0-10V/1-10V/PUSH DT6 (EQ00666)", code: "EQ00666" },
    precoOnOff220: null,
    precoOnOffBivolt: null,
    precoDim110v: null,
    precoDimDali: null,
    fotoUrl: null,
  },
  {
    familia: "BAGEO",
    sku: "LDP-4910",
    name: "BAGEO SINUOSA P D1+D2 40W/M",
    instalacao: "PENDENTE",
    aplicacao: "D1+D2",
    ledModule: "FITA LED HOPELUMI 24V 10W/M [CCT]",
    ledModuleQtd: 1,
    ccts: ["2700K", "3000K", "4000K", "5000K"],
    driver220: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM (EQ00112)", code: "EQ00112" },
    driverBivolt: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM (EQ00112)", code: "EQ00112" },
    driverDim110v: { model: "FONTE DE TENSÃO 60W 24V IP20 220V DIM TRIAC 0-10V (EQ00583)", code: "EQ00583" },
    driverDimDali: { model: "FONTE DE TENSÃO 72W 24V IP67 BIV DIM DALI/0-10V/1-10V/PUSH DT6 (EQ00666)", code: "EQ00666" },
    precoOnOff220: null,
    precoOnOffBivolt: null,
    precoDim110v: null,
    precoDimDali: null,
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

/** Parseia a instalação a partir do campo instalacao da API */
export function parseInstalacaoFromApi(instalacao: string): BageoInstalacao {
  const upper = instalacao.toUpperCase();
  if (upper === "SOBREPOR") return "SOBREPOR";
  if (upper === "EMBUTIR") return "EMBUTIR";
  return "PENDENTE";
}

/** Retorna as instalações disponíveis no catálogo */
export function getBageoAvailableInstalacoes(catalog: BageoProduct[]): BageoInstalacao[] {
  const set = new Set(catalog.map((p) => p.instalacao));
  const order: BageoInstalacao[] = ["PENDENTE", "SOBREPOR", "EMBUTIR"];
  return order.filter((i) => set.has(i));
}

/** Retorna os produtos disponíveis para uma instalação */
export function getBageoProductsByInstalacao(
  catalog: BageoProduct[],
  instalacao: BageoInstalacao
): BageoProduct[] {
  return catalog.filter((p) => p.instalacao === instalacao);
}

/** Retorna os controles disponíveis para um produto */
export function getBageoAvailableControles(product: BageoProduct): BageoControle[] {
  const opts: BageoControle[] = [];
  if (product.driver220) opts.push("ON/OFF 220V");
  if (product.driverBivolt) opts.push("ON/OFF Bivolt");
  if (product.driverDim110v) opts.push("DIM 1-10V");
  if (product.driverDimDali) opts.push("DIM DALI");
  return opts;
}

// ─── Engine de Cálculo ────────────────────────────────────────────────────────

export interface BageoInput {
  product: BageoProduct;
  controle: BageoControle;
  cct: string;
  /** Comprimento desejado em mm */
  comprimento: number;
}

export interface BageoResult {
  product: BageoProduct;
  controle: BageoControle;
  cct: string;
  /** Comprimento em mm */
  comprimento: number;
  /** Comprimento em metros (para exibição e cálculo de preço) */
  comprimentoMetros: number;
  driver: BageoDriverInfo;
  /** Quantidade de drivers necessários */
  driverQtd: number;
  /** Módulo LED com CCT substituído */
  ledModuleWithCCT: string;
  /** Quantidade de módulos LED */
  ledModuleQtd: number;
  /** Preço por metro (R$) — null se não cadastrado */
  precoPorMetro: number | null;
  /** Preço total da linha (R$) — null se não cadastrado */
  precoTotal: number | null;
}

/**
 * Seleciona o driver e o preço por metro para o controle selecionado.
 */
function selectBageoDriverAndPrice(
  product: BageoProduct,
  controle: BageoControle
): { driver: BageoDriverInfo | null; precoPorMetro: number | null; driverQtd: number } {
  switch (controle) {
    case "ON/OFF 220V":
      return { driver: product.driver220, precoPorMetro: product.precoOnOff220, driverQtd: product.driver220 ? 1 : 0 };
    case "ON/OFF Bivolt":
      return { driver: product.driverBivolt, precoPorMetro: product.precoOnOffBivolt, driverQtd: product.driverBivolt ? 1 : 0 };
    case "DIM 1-10V":
      return { driver: product.driverDim110v, precoPorMetro: product.precoDim110v, driverQtd: product.driverDim110v ? 1 : 0 };
    case "DIM DALI":
      return { driver: product.driverDimDali, precoPorMetro: product.precoDimDali, driverQtd: product.driverDimDali ? 1 : 0 };
  }
}

/**
 * Calcula o resultado de configuração de um BAGEO com base no comprimento.
 *
 * Regras:
 * - Comprimento mínimo: 100mm
 * - Módulos LED e drivers são calculados proporcionalmente ao comprimento em metros
 * - Preço total = preço por metro × comprimento em metros
 */
export function calculateBageo(catalog: BageoProduct[], input: BageoInput): BageoResult | null {
  if (!input.product || input.comprimento < 100) return null;

  const product = catalog.find(
    (p) =>
      p.sku === input.product.sku &&
      p.aplicacao === input.product.aplicacao &&
      p.instalacao === input.product.instalacao
  );
  if (!product) return null;

  const { driver, precoPorMetro, driverQtd } = selectBageoDriverAndPrice(product, input.controle);
  if (!driver) return null;

  const comprimentoMetros = input.comprimento / 1000;
  const ledModuleWithCCT = product.ledModule.replace(/\[CCT\]/gi, input.cct).trim();

  // Quantidade de módulos LED: ledModuleQtd por metro × comprimento em metros
  const ledModuleQtdTotal = product.ledModuleQtd * comprimentoMetros;

  // Preço total
  const precoTotal = precoPorMetro !== null ? precoPorMetro * comprimentoMetros : null;

  return {
    product,
    controle: input.controle,
    cct: input.cct,
    comprimento: input.comprimento,
    comprimentoMetros,
    driver,
    driverQtd,
    ledModuleWithCCT,
    ledModuleQtd: ledModuleQtdTotal,
    precoPorMetro,
    precoTotal,
  };
}

/** Formata o preço em reais com separador de milhar */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
