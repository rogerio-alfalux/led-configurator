/**
 * Catálogo de Spots Alfalux
 * Fonte: API https://alfaluxprod-c8zmg2fn.manus.space (categoria = "SPOTS")
 * Revisão: 15/05/2026 -- 3 produtos (ZEUS)
 */
import type { ControleType } from "./downlightCatalog";

export interface SpotDriver {
  model: string;
  code: string;
}

export interface SpotProduct {
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
  /** Ótica — null se não aplicável */
  otica: string | null;
  /** Holder — null se não aplicável */
  holder: string | null;
  /** Dissipador — null se não aplicável */
  dissipador: string | null;
  /** Driver para 220Vac */
  driver220: SpotDriver;
  /** Driver para Bivolt — null se não houver opção */
  driverBivolt: SpotDriver | null;
  /** CCTs disponíveis para este produto */
  ccts: string[];
  /** URL da foto do produto */
  fotoUrl: string | null;
}

export interface SpotInput {
  /** SKU do produto (campo `sku` no catálogo) */
  productSku: string;
  /** Nome do produto -- combinado com productSku para identificar unicamente produtos com SKU duplicado */
  productName?: string;
  tensao: "220V" | "Bivolt";
  cct: string;
  controle: ControleType;
}

export interface SpotResult {
  product: SpotProduct;
  tensao: "220V" | "Bivolt";
  cct: string;
  controle: ControleType;
  driver: SpotDriver;
  ledModuleWithCCT: string | null;
}

/** Catálogo estático de fallback — será sobreposto pelos dados da API */
export const SPOT_CATALOG: SpotProduct[] = [
  {
    instalacao: "SOBREPOR",
    familia: "ZEUS",
    sku: "LDS-2300.1CO.01B",
    name: "ZEUS 17W 10° TRL",
    ledModule: "LED COB 13 X 13MM CREE CMU1013",
    otica: "REFLETOR Ø69 X 38MM BA/2512-E 15° (CP00217)",
    holder: "HOLDER C-1313 LUCCHI (CP00061)",
    dissipador: null,
    driver220: { model: "PHILIPS CERTADRIVE 20W 500MA", code: "EQ00353" },
    driverBivolt: null,
    ccts: ["2700K", "3000K", "4000K", "5000K"],
    fotoUrl: null,
  },
  {
    instalacao: "SOBREPOR",
    familia: "ZEUS",
    sku: "LDS-2300.1CO.01B",
    name: "ZEUS 17W 24° TRL",
    ledModule: "LED COB 13 X 13MM CREE CMU1013",
    otica: "REFLETOR Ø69 X 38MM BA/2513-E-Z 24° (CP00802)",
    holder: "HOLDER C-1313 LUCCHI (CP00061)",
    dissipador: null,
    driver220: { model: "PHILIPS CERTADRIVE 20W 500MA", code: "EQ00353" },
    driverBivolt: null,
    ccts: ["2700K", "3000K", "4000K", "5000K"],
    fotoUrl: null,
  },
  {
    instalacao: "SOBREPOR",
    familia: "ZEUS",
    sku: "LDS-2300.1CO.01B",
    name: "ZEUS 17W 36° TRL",
    ledModule: "LED COB 13 X 13MM CREE CMU1013",
    otica: "REFLETOR Ø69 X 38MM BA/2514-E 36° (PC00062)",
    holder: "HOLDER C-1313 LUCCHI (CP00061)",
    dissipador: null,
    driver220: { model: "PHILIPS CERTADRIVE 20W 500MA", code: "EQ00353" },
    driverBivolt: null,
    ccts: ["2700K", "3000K", "4000K", "5000K"],
    fotoUrl: null,
  },
];

/**
 * Calcula o resultado de configuração de um Spot.
 */
export function calculateSpot(catalog: SpotProduct[], input: SpotInput): SpotResult | null {
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
