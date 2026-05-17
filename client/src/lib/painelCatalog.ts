/**
 * Catalogo de Paineis Alfalux
 * Fonte: DRIVER_LOOKUP_ALFALUX_LUMINARIAS_R01_(14-05-2026).xlsx
 * Revisao: 14/05/2026 -- 50 produtos
 */

import type { ControleType } from "./downlightCatalog";

export interface PainelDriver {
  model: string;
  code: string;
}

export interface PainelProduct {
  /** Tipo de instalacao: "EMBUTIR" | "SOBREPOR" | "PENDENTE" */
  instalacao: string;
  /** Familia do produto */
  familia: string;
  /** SKU do produto -- null se NAO APLICAVEL */
  sku: string | null;
  /** Nome comercial do produto */
  name: string;
  /** Modulo LED (sem [CCT]) -- null se NAO APLICAVEL */
  ledModule: string | null;
  /** Driver para 220Vac */
  driver220: PainelDriver;
  /** Driver para Bivolt -- null se nao houver opcao */
  driverBivolt: PainelDriver | null;
}

export interface PainelInput {
  /** SKU do produto (campo `sku` no catálogo) */
  productSku: string;
  tensao: "220V" | "Bivolt";
  cct: string;
  controle: ControleType;
}

export interface PainelResult {
  product: PainelProduct;
  tensao: "220V" | "Bivolt";
  cct: string;
  controle: ControleType;
  driver: PainelDriver;
  ledModuleWithCCT: string | null;
}

export const PAINEL_CATALOG: PainelProduct[] = [
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2462",
    sku: "LLE-2462.450.04F",
    name: "ALE-2462 LED 36W",
    ledModule: "4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "ALS-3462",
    sku: "LLS-3462.450.38F",
    name: "ALS-3462 LED 36W",
    ledModule: "4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "BOX LED E",
    sku: "LLE-2660.618.19F",
    name: "BOX LED E 36W",
    ledModule: "6x MÓDULO LED LUCCHI 6W C/ LENTES LCR1ML4808X08LE",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "BOX LED E",
    sku: "LLE-2660.124.18F",
    name: "BOX LED E 36W RTG",
    ledModule: "6x MÓDULO LED LUCCHI 6W C/ LENTES LCR1ML4808X08LE",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "BOX LED S",
    sku: "LLS-2660.597.18F",
    name: "BOX LED S 36W",
    ledModule: "6x MÓDULO LED LUCCHI 6W C/ LENTES LCR1ML4808X08LE",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "BOX LED S",
    sku: "LLS-2660.120.18F",
    name: "BOX LED S 36W RTG",
    ledModule: "6x MÓDULO LED LUCCHI 6W C/ LENTES LCR1ML4808X08LE",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "LUMIGRID E",
    sku: null,
    name: "LUMIGRID E 36W",
    ledModule: null,
    driver220: { model: "1x LIFUD 40W 1000mA BIVOLT (LF-GIF040YCII1000U)", code: "EQ00496" },
    driverBivolt: { model: "1x LIFUD 40W 1000mA BIVOLT (LF-GIF040YCII1000U)", code: "EQ00496" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "LUMIGRID S",
    sku: "LLS-3454.620.65F",
    name: "LUMIGRID S 36W",
    ledModule: null,
    driver220: { model: "1x LIFUD 40W 1000mA BIVOLT (LF-GIF040YCII1000U)", code: "EQ00496" },
    driverBivolt: { model: "1x LIFUD 40W 1000mA BIVOLT (LF-GIF040YCII1000U)", code: "EQ00496" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ORBIT E",
    sku: "LLE-1423.120.38F",
    name: "ORBIT E Ø1200mm 100W",
    ledModule: "23.1x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "3x PHILIPS XITANIUM 65W 200MA", code: "EQ00393" },
    driverBivolt: { model: "3x LIFUD 60W LF-FMR060YS0350U(S) 200MA", code: "EQ00582" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ORBIT E",
    sku: "LLE-1423.100.38F",
    name: "ORBIT E Ø1000mm 76W",
    ledModule: "15.5x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "2x PHILIPS XITANIUM 65W 200MA", code: "EQ00393" },
    driverBivolt: { model: "2x LIFUD 60W LF-FMR060YS0350U(S) 200MA", code: "EQ00582" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ORBIT E",
    sku: "LLE-1423.080.38F",
    name: "ORBIT E Ø800mm 50W",
    ledModule: "10x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "2x PHILIPS XITANIUM 44W 200MA", code: "EQ00347" },
    driverBivolt: { model: "2x LIFUD 40W LF-FMR040YS0350U(S) 200MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ORBIT E",
    sku: "LLE-1423.060.38F",
    name: "ORBIT E Ø600mm 28W",
    ledModule: "5.5x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 65W 200MA", code: "EQ00393" },
    driverBivolt: { model: "LIFUD 60W LF-FMR060YS0350U(S) 200MA", code: "EQ00582" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ORBIT E",
    sku: "LLE-1423.040.38F",
    name: "ORBIT E Ø400mm 13W",
    ledModule: "2.4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 200MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 200MA", code: "EQ00581" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "ORBIT S",
    sku: "LLP-3823.120.38F",
    name: "ORBIT S Ø1200mm 100W",
    ledModule: "23.1x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "3x PHILIPS XITANIUM 65W 200MA", code: "EQ00393" },
    driverBivolt: { model: "3x LIFUD 60W LF-FMR060YS0350U(S) 200MA", code: "EQ00582" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "ORBIT S",
    sku: "LLP-3823.100.38F",
    name: "ORBIT S Ø1000mm 76W",
    ledModule: "15.5x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "2x PHILIPS XITANIUM 65W 200MA", code: "EQ00393" },
    driverBivolt: { model: "2x LIFUD 60W LF-FMR060YS0350U(S) 200MA", code: "EQ00582" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "ORBIT S",
    sku: "LLP-3823.080.38F",
    name: "ORBIT S Ø800mm 50W",
    ledModule: "10x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "2x PHILIPS XITANIUM 44W 200MA", code: "EQ00347" },
    driverBivolt: { model: "2x LIFUD 40W LF-FMR040YS0350U(S) 200MA", code: "EQ00581" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "ORBIT S",
    sku: "LLP-3823.060.38F",
    name: "ORBIT S Ø600mm 28W",
    ledModule: "5.5x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 65W 200MA", code: "EQ00393" },
    driverBivolt: { model: "LIFUD 60W LF-FMR060YS0350U(S) 200MA", code: "EQ00582" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "ORBIT S",
    sku: "LLP-3823.040.38F",
    name: "ORBIT S Ø400mm 13W",
    ledModule: "2.4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 200MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 200MA", code: "EQ00581" },
  },
  {
    instalacao: "PENDENTE",
    familia: "ORBIT P",
    sku: "LLP-3823.120.38F",
    name: "ORBIT P Ø1200mm 100W",
    ledModule: "23.1x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "3x PHILIPS XITANIUM 65W 200MA", code: "EQ00393" },
    driverBivolt: { model: "3x LIFUD 60W LF-FMR060YS0350U(S) 200MA", code: "EQ00582" },
  },
  {
    instalacao: "PENDENTE",
    familia: "ORBIT P",
    sku: "LLP-3823.100.38F",
    name: "ORBIT P Ø1000mm 76W",
    ledModule: "15.5x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "2x PHILIPS XITANIUM 65W 200MA", code: "EQ00393" },
    driverBivolt: { model: "2x LIFUD 60W LF-FMR060YS0350U(S) 200MA", code: "EQ00582" },
  },
  {
    instalacao: "PENDENTE",
    familia: "ORBIT P",
    sku: "LLP-3823.080.38F",
    name: "ORBIT P Ø800mm 50W",
    ledModule: "10x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "2x PHILIPS XITANIUM 44W 200MA", code: "EQ00347" },
    driverBivolt: { model: "2x LIFUD 40W LF-FMR040YS0350U(S) 200MA", code: "EQ00581" },
  },
  {
    instalacao: "PENDENTE",
    familia: "ORBIT P",
    sku: "LLP-3823.060.38F",
    name: "ORBIT P Ø600mm 28W",
    ledModule: "5.5x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 65W 200MA", code: "EQ00393" },
    driverBivolt: { model: "LIFUD 60W LF-FMR060YS0350U(S) 200MA", code: "EQ00582" },
  },
  {
    instalacao: "PENDENTE",
    familia: "ORBIT P",
    sku: "LLP-3823.040.38F",
    name: "ORBIT P Ø400mm 13W",
    ledModule: "2.4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 200MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 200MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2750",
    sku: "LLE-2750.618.21F",
    name: "ALE-2750 9W RTG 618mm",
    ledModule: "Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 19W 350MA", code: "EQ00346" },
    driverBivolt: { model: "LIFUD 20W LF-FMR020YS0350U(S) 350MA", code: "EQ00580" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2750",
    sku: "LLE-2750.124.20F",
    name: "ALE-2750 18W RTG 1243mm",
    ledModule: "2.1x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 19W 350MA", code: "EQ00346" },
    driverBivolt: { model: "LIFUD 20W LF-FMR020YS0350U(S) 350MA", code: "EQ00580" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2750",
    sku: "LLE-2750.124.20F",
    name: "ALE-2750 36W RTG 1243mm",
    ledModule: "4.2x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "ALS-3750",
    sku: "LLS-3750.060.21F",
    name: "ALS-3750 9W RTG 618mm",
    ledModule: "Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 19W 350MA", code: "EQ00346" },
    driverBivolt: { model: "LIFUD 20W LF-FMR020YS0350U(S) 350MA", code: "EQ00580" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "ALS-3750",
    sku: "LLS-3750.120.21F",
    name: "ALS-3750 18W RTG 1243mm",
    ledModule: "2x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 19W 350MA", code: "EQ00346" },
    driverBivolt: { model: "LIFUD 20W LF-FMR020YS0350U(S) 350MA", code: "EQ00580" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "ALS-3750",
    sku: "LLS-3750.120.21F",
    name: "ALS-3750 36W RTG 1243mm",
    ledModule: "4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2420",
    sku: "LLE-2420.450.28F",
    name: "ALE-2420 18W RTG",
    ledModule: "2x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 19W 350MA", code: "EQ00346" },
    driverBivolt: { model: "LIFUD 20W LF-FMR020YS0350U(S) 350MA", code: "EQ00580" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2420",
    sku: "LLE-2420.450.28F",
    name: "ALE-2420 36W RTG",
    ledModule: "4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "ALS-3420",
    sku: "LLS-3420.450.38F",
    name: "ALS-3420 18W RTG",
    ledModule: "2x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 19W 350MA", code: "EQ00346" },
    driverBivolt: { model: "LIFUD 20W LF-FMR020YS0350U(S) 350MA", code: "EQ00580" },
  },
  {
    instalacao: "SOBREPOR",
    familia: "ALS-3420",
    sku: "LLS-3420.450.38F",
    name: "ALS-3420 36W RTG",
    ledModule: "4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2103",
    sku: "LLE-2103.450.28F",
    name: "ALE-2103 36W",
    ledModule: "4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2103",
    sku: "LLE-2103.450.24F",
    name: "ALE-2103 36W RTG",
    ledModule: "4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2118",
    sku: "LLE-2118.250.04M",
    name: "ALE-2118.2 18W",
    ledModule: "2x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 19W 350MA", code: "EQ00346" },
    driverBivolt: { model: "LIFUD 20W LF-FMR020YS0350U(S) 350MA", code: "EQ00580" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2118",
    sku: "LLE-2118.250.04M",
    name: "ALE-2118.2 36W",
    ledModule: "4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2118",
    sku: "LLE-2118.350.04M",
    name: "ALE-2118.3 26W",
    ledModule: "3x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2118",
    sku: "LLE-2118.350.04M",
    name: "ALE-2118.3 36W",
    ledModule: "3x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "OSRAM IT FIT 75W 500MA", code: "EQ00220" },
    driverBivolt: null,
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2118",
    sku: "LLE-2118.450.08F",
    name: "ALE-2118.4 36W",
    ledModule: "4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2140",
    sku: "LLE-2140.150.08F",
    name: "ALE-2140 9W 618mm",
    ledModule: "Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 19W 350MA", code: "EQ00346" },
    driverBivolt: { model: "LIFUD 20W LF-FMR020YS0350U(S) 350MA", code: "EQ00580" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2140",
    sku: "LLE-2140.150.08F",
    name: "ALE-2140 18W 618mm",
    ledModule: "2x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 19W 350MA", code: "EQ00346" },
    driverBivolt: { model: "LIFUD 20W LF-FMR020YS0350U(S) 350MA", code: "EQ00580" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2140",
    sku: "LLE-2140.24A.08F",
    name: "ALE-2140 18W 1243mm",
    ledModule: "2x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 19W 350MA", code: "EQ00346" },
    driverBivolt: { model: "LIFUD 20W LF-FMR020YS0350U(S) 350MA", code: "EQ00580" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2140",
    sku: "LLE-2140.24A.08F",
    name: "ALE-2140 36W 1243mm",
    ledModule: "4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2430",
    sku: "LLE-2430.300.19F",
    name: "ALE-2430 18W",
    ledModule: "2.2x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 19W 350MA", code: "EQ00346" },
    driverBivolt: { model: "LIFUD 20W LF-FMR020YS0350U(S) 350MA", code: "EQ00580" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2430",
    sku: "LLE-2430.300.19F",
    name: "ALE-2430 18W",
    ledModule: "4.4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2142",
    sku: "LLE-2142.618.19F",
    name: "ALE-2142 18W",
    ledModule: "2x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 19W 350MA", code: "EQ00346" },
    driverBivolt: { model: "LIFUD 20W LF-FMR020YS0350U(S) 350MA", code: "EQ00580" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "ALE-2142",
    sku: "LLE-2142.124.19F",
    name: "ALE-2142 36W RTG",
    ledModule: "4x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "OFFICE COMFORT",
    sku: "LLE-2488.012.10F",
    name: "OFFICE COMFORT 2x3 32W (618 x 618mm)",
    ledModule: "6x TRACE 150x30 20L 800LM 5W",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "OFFICE COMFORT",
    sku: "LLE-2488.004.10F",
    name: "OFFICE COMFORT 2x3 32W (618 x 155mm)",
    ledModule: "6x TRACE 150x30 20L 800LM 5W",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "OFFICE COMFORT",
    sku: "LLE-2488.006.10F",
    name: "OFFICE COMFORT 1x6 32W (1243 x 155mm)",
    ledModule: "6x TRACE 150x30 20L 800LM 5W",
    driver220: { model: "PHILIPS XITANIUM 44W 350MA", code: "EQ00347" },
    driverBivolt: { model: "LIFUD 40W LF-FMR040YS0350U(S) 350MA", code: "EQ00581" },
  },
  {
    instalacao: "EMBUTIR",
    familia: "PRISMA",
    sku: "LLE-4420.1D2.18F",
    name: "PRISMA LED 21W E",
    ledModule: "2.2x Stripflex 562,5 x 10mm 36L",
    driver220: { model: "PHILIPS XITANIUM 19W 350MA", code: "EQ00346" },
    driverBivolt: { model: "LIFUD 20W LF-FMR020YS0350U(S) 350MA", code: "EQ00580" },
  },
];

export function calculatePainel(input: PainelInput, catalog?: PainelProduct[]): PainelResult | null {
  const source = catalog ?? PAINEL_CATALOG;
  const product = source.find(p => p.sku === input.productSku);
  if (!product) return null;

  const driver =
    input.tensao === "Bivolt" && product.driverBivolt
      ? product.driverBivolt
      : product.driver220;

  const ledModuleWithCCT = product.ledModule
    ? product.ledModule + " " + input.cct
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
