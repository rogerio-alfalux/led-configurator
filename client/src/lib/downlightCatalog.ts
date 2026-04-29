/**
 * Catálogo de Downlights Alfalux
 * Fonte: DRIVER_LOOKUP_ALFALUX_LUMINARIAS_R00_(29-04-2026).xlsx
 */

export interface DownlightDriver {
  model: string;
  code: string;
}

export interface DownlightProduct {
  /** Nome comercial do produto */
  name: string;
  /** Módulo LED (nome técnico da barra/módulo) */
  ledModule: string;
  /** Driver para 220Vac */
  driver220: DownlightDriver;
  /** Driver para Bivolt — null se não houver opção Bivolt */
  driverBivolt: DownlightDriver | null;
}

/** Extrai código EQ do texto entre parênteses: "PHILIPS XITANIUM 44W 350MA (EQ00347)" → "EQ00347" */
function parseCode(text: string): string {
  const m = text.match(/\(([^)]+)\)/);
  return m ? m[1] : "";
}

/** Extrai nome do driver removendo o código entre parênteses */
function parseName(text: string): string {
  return text.replace(/\s*\([^)]+\)\s*$/, "").trim();
}

function driver(text: string): DownlightDriver {
  return { model: parseName(text), code: parseCode(text) };
}

export const DOWNLIGHT_CATALOG: DownlightProduct[] = [
  {
    name: "LUNA PP LED 6,5W RE ABS",
    ledModule: "TRACE CIRCULAR 6 LEDS Ø50MM",
    driver220: driver("LED DRIVER 13W 350MA 25-38VDC BIV (EQ00236)"),
    driverBivolt: driver("LED DRIVER 13W 350MA 25-38VDC BIV (EQ00236)"),
  },
  {
    name: "LUNA PP LED 13W RE ABS",
    ledModule: "TRACE CIRCULAR 12 LEDS Ø67MM",
    driver220: driver("LED DRIVER 13W 350MA 25-38VDC BIV (EQ00236)"),
    driverBivolt: driver("LED DRIVER 13W 350MA 25-38VDC BIV (EQ00236)"),
  },
  {
    name: "LUNA P LED 13W RE",
    ledModule: "LUX ROUND Ø80MM 36L",
    driver220: driver("LED DRIVER 13W 350MA 25-38VDC BIV (EQ00236)"),
    driverBivolt: driver("LED DRIVER 13W 350MA 25-38VDC BIV (EQ00236)"),
  },
  {
    name: "LUNA G LED 17W RE",
    ledModule: "LUX ROUND Ø120MM 54L",
    driver220: driver("PHILIPS XITANIUM 19W 350MA (EQ00346)"),
    driverBivolt: driver("LIFUD 20W 350MA SLIM BIVOLT (EQ00580)"),
  },
  {
    name: "LUNA G LED 26W RE",
    ledModule: "LUX ROUND Ø120MM 120L",
    driver220: driver("PHILIPS XITANIUM 44W 350MA (EQ00347)"),
    driverBivolt: driver("LIFUD 40W 350MA SLIM BIVOLT (EQ00581)"),
  },
  {
    name: "LUNA GG LED 26W RE",
    ledModule: "LUX ROUND Ø120MM 120L",
    driver220: driver("PHILIPS XITANIUM 44W 350MA (EQ00347)"),
    driverBivolt: driver("LIFUD 40W 350MA SLIM BIVOLT (EQ00581)"),
  },
  {
    name: "LUNA GG LED 36W RE",
    ledModule: "LUX ROUND Ø120MM 120L",
    driver220: driver("OSRAM IT FIT 75W (EQ00220)"),
    driverBivolt: null, // Sem opção Bivolt
  },
];

/** CCTs disponíveis para Downlights */
export const DOWNLIGHT_CCTS = ["2700K", "3000K", "4000K", "5000K"] as const;
export type DownlightCCT = (typeof DOWNLIGHT_CCTS)[number];

/** Tensões disponíveis */
export type DownlightVoltage = "220V" | "Bivolt";

export interface DownlightConfig {
  productIndex: number;
  voltage: DownlightVoltage;
  cct: DownlightCCT;
  quantity: number;
}

export interface DownlightResult {
  product: DownlightProduct;
  /** Módulo LED com CCT, sem colchetes: "LUX ROUND Ø120MM 120L 3000K" */
  ledModuleWithCCT: string;
  driver: DownlightDriver;
  voltage: DownlightVoltage;
  cct: DownlightCCT;
  quantity: number;
  /** true se o produto não tem opção Bivolt e foi solicitado Bivolt */
  bivoltUnavailable: boolean;
}

/**
 * Calcula o resultado de configuração para um Downlight.
 */
export function calculateDownlight(config: DownlightConfig): DownlightResult {
  const product = DOWNLIGHT_CATALOG[config.productIndex];
  const bivoltUnavailable = config.voltage === "Bivolt" && product.driverBivolt === null;
  const selectedDriver =
    config.voltage === "Bivolt" && product.driverBivolt
      ? product.driverBivolt
      : product.driver220;

  return {
    product,
    ledModuleWithCCT: `${product.ledModule} ${config.cct}`,
    driver: selectedDriver,
    voltage: config.voltage,
    cct: config.cct,
    quantity: config.quantity,
    bivoltUnavailable,
  };
}
