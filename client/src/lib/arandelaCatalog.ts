/**
 * arandelaCatalog.ts
 * Catálogo de Arandelas — dados carregados da API Alfalux
 * (https://alfaluxprod-c8zmg2fn.manus.space, categoria = "ARANDELAS")
 * Revisão: 25/05/2026 — 1 produto (TRICK)
 */
import type { ControleType } from "./downlightCatalog";

export interface ArandelaDriver {
  model: string;
  code: string;
  /** Corrente de programação do driver (ex: "350MA", "700MA"). null se não disponível. */
  corrente?: string | null;
}

export interface ArandelaProduct {
  /** Tipo de instalação: "EMBUTIR" | "SOBREPOR" | "PENDENTE" */
  instalacao: string;
  /** Família do produto */
  familia: string;
  /** SKU do produto */
  sku: string | null;
  /** Nome comercial do produto */
  name: string;
  /** Módulo LED (sem [CCT]) — campo legado */
  ledModule: string | null;
  /** Quantidade numérica de módulos LED. null quando não retornado pela API. */
  ledModuleQtd: number | null;
  /** Módulo LED específico por CCT (novos campos da API) */
  ledModule2700?: string | null;
  ledModule3000?: string | null;
  ledModule4000?: string | null;
  ledModule5000?: string | null;
  ledModuleQtd2700?: number | null;
  ledModuleQtd3000?: number | null;
  ledModuleQtd4000?: number | null;
  ledModuleQtd5000?: number | null;
  /** Código EQ do módulo por CCT — enriquecido pelo servidor */
  ledModuleEq2700?: string | null;
  ledModuleEq3000?: string | null;
  ledModuleEq4000?: string | null;
  ledModuleEq5000?: string | null;
  /** Ótica legado (primaria + secundaria concatenadas) — null se não aplicável */
  otica: string | null;
  /** Ótica primária com quantidade embutida. null quando não retornado pela API. */
  oticaPrimaria: string | null;
  /** Ótica secundária com quantidade embutida. null quando não há. */
  oticaSecundaria: string | null;
  /** Holder — null se não aplicável */
  holder: string | null;
  /** Quantidade numérica de holders. null quando não retornado pela API. */
  holderQtd: number | null;
  /** Dissipador — null se não aplicável */
  dissipador: string | null;
  /** Driver para 220Vac */
  driver220: ArandelaDriver;
  /** Driver para Bivolt — null se não houver opção */
  driverBivolt: ArandelaDriver | null;
  /** Quantidade de drivers ON/OFF 220V. null = driver não existe no produto. */
  driverQtd220: number | null;
  /** Quantidade de drivers Bivolt. null = driver não existe no produto. */
  driverQtdBivolt: number | null;
  /** CCTs disponíveis para este produto */
  ccts: string[];
  /** URL da foto do produto */
  fotoUrl: string | null;
  /** Preço unitário ON/OFF 220V (R$). null = não cadastrado. */
  precoOnOff220?: number | null;
  /** Preço unitário ON/OFF Bivolt (R$). null = não cadastrado. */
  precoOnOffBivolt?: number | null;
  /** Preço unitário DIM 1-10V (R$). null = não cadastrado. */
  precoDim110v?: number | null;
  /** Preço unitário DIM DALI (R$). null = não cadastrado. */
  precoDimDali?: number | null;
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
  /** Produto com módulo RGBW (não tem CCT convencional). Exibe apenas opção "RGBW". */
  isRgbw?: boolean;
  /** Produto com lâmpada (sem módulo LED e sem driver). Não exibe seleção de CCT. */
  isLamp?: boolean;
}

export interface ArandelaInput {
  /** SKU do produto (campo `sku` no catálogo) */
  productSku: string;
  /** Nome do produto — combinado com productSku para identificar unicamente produtos com SKU duplicado */
  productName?: string;
  tensao: "220V" | "Bivolt";
  cct: string;
  controle: ControleType;
}

export interface ArandelaResult {
  product: ArandelaProduct;
  tensao: "220V" | "Bivolt";
  cct: string;
  controle: ControleType;
  driver: ArandelaDriver;
  ledModuleWithCCT: string | null;
  /** Código EQ do módulo resolvido para o CCT selecionado. null se não encontrado. */
  ledModuleEq: string | null;
}

/** Catálogo estático de fallback — será sobreposto pelos dados da API */
export const ARANDELA_CATALOG: ArandelaProduct[] = [
  {
    instalacao: "SOBREPOR",
    familia: "TRICK",
    sku: "LDA-5270.100.50C",
    name: "TRICK LED 2W IP65 D1 + D2",
    ledModule: "STRIPFLEX 562,5 X 10MM 36L",
    ledModuleQtd: 1,
    otica: null,
    oticaPrimaria: null,
    oticaSecundaria: null,
    holder: null,
    holderQtd: null,
    dissipador: null,
    driver220: { model: "LED DRIVER 3W 700MA 2-4VDC 220V FLICKERFREE", code: "EQ00665" },
    driverBivolt: null,
    driverQtd220: 1,
    driverQtdBivolt: null,
    ccts: ["2700K", "3000K", "4000K", "5000K"],
    fotoUrl: null,
  },
];

/**
 * Calcula o resultado de configuração de uma Arandela.
 */
export function calculateArandela(catalog: ArandelaProduct[], input: ArandelaInput): ArandelaResult | null {
  // Busca por SKU+Nome quando productName estiver definido (evita ambiguidade com SKUs duplicados)
  const product = input.productName !== undefined
    ? catalog.find(p => p.sku === input.productSku && p.name === input.productName)
    : catalog.find(p => p.sku === input.productSku);
  if (!product) return null;

  const driver = input.tensao === "Bivolt" && product.driverBivolt
    ? product.driverBivolt
    : product.driver220;

  // Produto com lâmpada (sem driver, sem módulo LED): retornar resultado sem driver
  if (!driver && product.isLamp) {
    return {
      product,
      tensao: input.tensao,
      cct: input.cct,
      controle: input.controle,
      driver: { model: "", code: "" },
      ledModuleWithCCT: null,
      ledModuleEq: null,
    };
  }

  // Usar módulo LED específico por CCT quando disponível
  const cctKey = input.cct.replace("K", "") as "2700" | "3000" | "4000" | "5000";
  const cctSpecificModule = (product as any)[`ledModule${cctKey}`] as string | null | undefined;
  const ledModuleWithCCT = cctSpecificModule
    ? cctSpecificModule.replace(/\[CCT\]/gi, input.cct).trim()
    : product.ledModule
      ? product.ledModule.replace(/\[CCT\]/gi, input.cct)
      : null;
  const ledModuleEq = ((product as any)[`ledModuleEq${cctKey}`] as string | null | undefined) ?? null;

  return {
    product,
    tensao: input.tensao,
    cct: input.cct,
    controle: input.controle,
    driver: driver ?? { model: "", code: "" },
    ledModuleWithCCT,
    ledModuleEq,
  };
}
