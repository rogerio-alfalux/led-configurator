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
  /** Módulo LED (sem [CCT]) */
  ledModule: string | null;
  /** Quantidade numérica de módulos LED. null quando não retornado pela API. */
  ledModuleQtd: number | null;
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

  const ledModuleWithCCT = product.ledModule
    ? product.ledModule.replace(/\[CCT\]/gi, input.cct)
    : null;

  return {
    product,
    tensao: input.tensao,
    cct: input.cct,
    controle: input.controle,
    driver,
    ledModuleWithCCT,
  };
}
