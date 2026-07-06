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
 *
 * Para BAGEO SINUOSA: cortes obrigatórios com máx BAGEO_MAX_LENGTH_MM por trecho.
 * Cada trecho tem seu(s) driver(s) — igual à família LED BAR.
 * O preço é separado em: precoPerfil (corpo × metros) + precoDriverTotal (driver × driverQtd).
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
  /** Preço por metro linear (R$) — ON/OFF 220V (somente corpo, sem driver) */
  precoOnOff220: number | null;
  /** Preço por metro linear (R$) — ON/OFF Bivolt */
  precoOnOffBivolt: number | null;
  /** Preço por metro linear (R$) — DIM 1-10V */
  precoDim110v: number | null;
  /** Preço por metro linear (R$) — DIM DALI */
  precoDimDali: number | null;
  /** Custo do corpo ON/OFF 220V (para cálculo custo×markup) */
  custoCorpoOnoff220v?: number | null;
  /** Custo do corpo ON/OFF Bivolt */
  custoCorpoOnoffBivolt?: number | null;
  /** Custo do corpo DIM 1-10V */
  custoCorpoDim110v?: number | null;
  /** Custo do corpo DIM DALI */
  custoCorpoDimDali?: number | null;
  /** Markup padrão ON/OFF 220V */
  markupPadraoOnoff220v?: number | null;
  /** Markup padrão ON/OFF Bivolt */
  markupPadraoOnoffBivolt?: number | null;
  /** Markup padrão DIM 1-10V */
  markupPadraoDim110v?: number | null;
  /** Markup padrão DIM DALI */
  markupPadraoDimDali?: number | null;
  // ─── Custo do driver separado (para cálculo custo×markup do driver) ───
  /** Custo do driver ON/OFF 220V (por unidade) */
  custoDriver220?: number | null;
  /** Custo do driver ON/OFF Bivolt (por unidade) */
  custoDriverBivolt?: number | null;
  /** Custo do driver DIM 1-10V (por unidade) */
  custoDriverDim110v?: number | null;
  /** Custo do driver DIM DALI (por unidade) */
  custoDriverDimDali?: number | null;
  /** Markup padrão do driver ON/OFF 220V */
  markupPadraoDriverOnoff220v?: number | null;
  /** Markup padrão do driver ON/OFF Bivolt */
  markupPadraoDriverOnoffBivolt?: number | null;
  /** Markup padrão do driver DIM 1-10V */
  markupPadraoDriverDim110v?: number | null;
  /** Markup padrão do driver DIM DALI */
  markupPadraoDriverDimDali?: number | null;
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
    driver220: null,
    driverBivolt: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM", code: "EQ00112" },
    driverDim110v: null,
    driverDimDali: { model: "FONTE DE TENSÃO 72W 24V IP67 BIV DIM DALI/0-10V/1-10V/PUSH DT6", code: "EQ00666" },
    precoOnOff220: null,
    precoOnOffBivolt: null,
    precoDim110v: null,
    precoDimDali: null,
    fotoUrl: null,
  },
  {
    familia: "BAGEO",
    sku: "LDP-4910",
    name: "BAGEO SINUOSA P D1 40W/M",
    instalacao: "PENDENTE",
    aplicacao: "D1",
    ledModule: "2x FITA LED HOPELUMI 24V 20W/M [CCT]",
    ledModuleQtd: 2,
    ccts: ["2700K", "3000K", "4000K", "5000K"],
    driver220: null,
    driverBivolt: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM", code: "EQ00112" },
    driverDim110v: null,
    driverDimDali: { model: "FONTE DE TENSÃO 72W 24V IP67 BIV DIM DALI/0-10V/1-10V/PUSH DT6", code: "EQ00666" },
    precoOnOff220: 1140,
    precoOnOffBivolt: 1140,
    precoDim110v: 1140,
    precoDimDali: 1140,
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
    driver220: null,
    driverBivolt: { model: "FONTE DE TENSÃO 60W 24V IP20 BIV DIP SLIM", code: "EQ00112" },
    driverDim110v: null,
    driverDimDali: { model: "FONTE DE TENSÃO 72W 24V IP67 BIV DIM DALI/0-10V/1-10V/PUSH DT6", code: "EQ00666" },
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
  // ON/OFF 220V: disponível se driver220 existe OU se driverBivolt existe como fallback (BAGEO SINUOSA)
  if (product.driver220 || product.driverBivolt) opts.push("ON/OFF 220V");
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
  /** Número de cortes (mínimo = ceil(comprimento / BAGEO_MAX_LENGTH_MM)); se omitido, usa o mínimo obrigatório */
  nCortes?: number;
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
  /** Número de cortes (trechos) */
  nCortes: number;
  /** Comprimento por corte em mm (ceil(comprimento / nCortes)) */
  comprimentoPorCorte: number;
  /** Quantidade de fontes total (driverQtdPorCorte × nCortes) */
  driverQtd: number;
  /** Quantidade de fontes por corte */
  driverQtdPorCorte: number;
  /** Módulo LED com CCT substituído (ex: FITA LED HOPELUMI 24V 10W/M 3000K) */
  ledModuleWithCCT: string;
  /** Quantidade de módulos LED por metro (do produto) */
  ledModuleQtd: number;
  /** Metragem total de fita LED (ledModuleQtd × comprimentoMetros) */
  fitaMetros: number;
  /** Preço por metro do corpo (R$) — null se não cadastrado */
  precoPorMetro: number | null;
  /** Preço do corpo total (precoPorMetro × comprimentoMetros) — null se não cadastrado */
  precoPerfil: number | null;
  /** Preço por unidade de driver (R$) — null se não cadastrado */
  precoDriverPorUnidade: number | null;
  /** Preço total dos drivers (precoDriverPorUnidade × driverQtd) — null se não cadastrado */
  precoDriverTotal: number | null;
  /** Preço total da linha = precoPerfil + precoDriverTotal — null se algum não cadastrado */
  precoTotal: number | null;
}

/** Helper: calcula custo × markup se preço direto for null */
function calcPreco(
  preco: number | null | undefined,
  custo: number | null | undefined,
  markup: number | null | undefined
): number | null {
  if (preco != null && preco > 0) return preco;
  if (custo != null && custo > 0 && markup != null && markup > 0) {
    return Math.round(custo * markup * 100) / 100;
  }
  return null;
}

/**
 * Seleciona o driver, preço do corpo por metro e preço do driver por unidade.
 * Para BAGEO SINUOSA (driver220=null), usa driverBivolt como fallback em ON/OFF 220V.
 */
function selectBageoDriverAndPrice(
  product: BageoProduct,
  controle: BageoControle
): {
  driver: BageoDriverInfo | null;
  precoPorMetro: number | null;
  precoDriverPorUnidade: number | null;
} {
  switch (controle) {
    case "ON/OFF 220V":
      return {
        driver: product.driver220 ?? product.driverBivolt,
        precoPorMetro: calcPreco(product.precoOnOff220, product.custoCorpoOnoff220v, product.markupPadraoOnoff220v),
        precoDriverPorUnidade: calcPreco(null, product.custoDriver220 ?? product.custoDriverBivolt, product.markupPadraoDriverOnoff220v ?? product.markupPadraoDriverOnoffBivolt),
      };
    case "ON/OFF Bivolt":
      return {
        driver: product.driverBivolt,
        precoPorMetro: calcPreco(product.precoOnOffBivolt, product.custoCorpoOnoffBivolt, product.markupPadraoOnoffBivolt),
        precoDriverPorUnidade: calcPreco(null, product.custoDriverBivolt, product.markupPadraoDriverOnoffBivolt),
      };
    case "DIM 1-10V":
      return {
        driver: product.driverDim110v,
        precoPorMetro: calcPreco(product.precoDim110v, product.custoCorpoDim110v, product.markupPadraoDim110v),
        precoDriverPorUnidade: calcPreco(null, product.custoDriverDim110v, product.markupPadraoDriverDim110v),
      };
    case "DIM DALI":
      return {
        driver: product.driverDimDali,
        precoPorMetro: calcPreco(product.precoDimDali, product.custoCorpoDimDali, product.markupPadraoDimDali),
        precoDriverPorUnidade: calcPreco(null, product.custoDriverDimDali, product.markupPadraoDriverDimDali),
      };
  }
}

/** Comprimento máximo por corte em mm (BAGEO sinuosa) */
export const BAGEO_MAX_LENGTH_MM = 2000;

/** Intervalo máximo entre fontes em mm */
const DRIVER_INTERVAL_MM = 2300;

/**
 * Calcula o resultado de configuração de um BAGEO com base no comprimento.
 *
 * Regras:
 * - Comprimento mínimo: 100mm
 * - nCortes obrigatório: mínimo ceil(comprimento / BAGEO_MAX_LENGTH_MM)
 * - Fontes: 1 a cada 2300mm por corte × nCortes
 * - Fita LED: ledModuleQtd (por metro) × comprimento em metros
 * - Preço separado: corpo (precoPorMetro × metros) + driver (precoDriverPorUnidade × driverQtd)
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

  const { driver, precoPorMetro, precoDriverPorUnidade } = selectBageoDriverAndPrice(product, input.controle);
  if (!driver) return null;

  const comprimentoMetros = input.comprimento / 1000;

  // Cortes: obrigatório, mínimo ceil(comprimento / BAGEO_MAX_LENGTH_MM)
  const minCortes = Math.ceil(input.comprimento / BAGEO_MAX_LENGTH_MM);
  const nCortes = Math.max(minCortes, input.nCortes ?? minCortes);
  const comprimentoPorCorte = Math.ceil(input.comprimento / nCortes);

  // Valida que cada corte não ultrapassa o limite (segurança extra)
  if (comprimentoPorCorte > BAGEO_MAX_LENGTH_MM) return null;

  // Quantidade de fontes: 1 a cada 2300mm por corte × nCortes
  const driverQtdPorCorte = Math.ceil(comprimentoPorCorte / DRIVER_INTERVAL_MM);
  const driverQtd = driverQtdPorCorte * nCortes;

  // Metragem total de fita LED: ledModuleQtd (por metro) × comprimento em metros
  const fitaMetros = product.ledModuleQtd * comprimentoMetros;

  const ledModuleWithCCT = product.ledModule.replace(/\[CCT\]/gi, input.cct).trim();

  // Preços separados
  const precoPerfil = precoPorMetro !== null ? Math.round(precoPorMetro * comprimentoMetros * 100) / 100 : null;
  const precoDriverTotal = precoDriverPorUnidade !== null ? Math.round(precoDriverPorUnidade * driverQtd * 100) / 100 : null;
  // precoTotal: soma corpo + driver quando ambos disponíveis; usa apenas corpo quando driver não tem preço cadastrado
  const precoTotal = precoPerfil !== null
    ? Math.round((precoPerfil + (precoDriverTotal ?? 0)) * 100) / 100
    : null;

  return {
    product,
    controle: input.controle,
    cct: input.cct,
    comprimento: input.comprimento,
    comprimentoMetros,
    nCortes,
    comprimentoPorCorte,
    driver,
    driverQtd,
    driverQtdPorCorte,
    ledModuleWithCCT,
    ledModuleQtd: product.ledModuleQtd,
    fitaMetros,
    precoPorMetro,
    precoPerfil,
    precoDriverPorUnidade,
    precoDriverTotal,
    precoTotal,
  };
}

/** Formata o preço em reais com separador de milhar */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
