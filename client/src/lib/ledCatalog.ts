// Catálogo LED v2 — gerado automaticamente a partir de MEDIDASPERFIL.xlsx
// Regra de Ouro: Apenas módulos com SKU válido existem no catálogo
// Estrutura: cada entrada é uma variante (perfil + tipo de instalação)

export type InstallType = 'PENDENTE' | 'SOBREPOR' | 'EMBUTIR' | 'ARANDELA';

export interface ModuleData {
  length: number;
  sku: string;
}

export interface ProfileModules {
  IN: Record<string, ModuleData>;
  IF: Record<string, ModuleData>;
  ML: Record<string, ModuleData>;
}

export interface ProfileVariant {
  /** Nome do perfil (ex: HIT, BLAZE H) */
  name: string;
  /** Código do produto (ex: LLP-4251) */
  code: string;
  /** Tipo de instalação */
  installType: InstallType;
  /** Permite aplicação D1 */
  allowD1: boolean;
  /** Permite aplicação D2 */
  allowD2: boolean;
  /** Permite aplicação D1+D2 simultâneos */
  allowD1D2: boolean;
  /** SHARP: requer seleção de difusor (DA/DB/DC) */
  hasDiffuser?: boolean;
  /** Alerta de driver remoto obrigatório */
  requiresRemoteDriver?: boolean;
  /** Driver DIM DALI disponível para este perfil (vindo da API) */
  driverDimDali?: { model: string; code: string | null } | null;
  /** Driver DIM 1-10V disponível para este perfil (vindo da API) */
  driverDim110v?: { model: string; code: string | null } | null;
  /** Método de barra: STRIPFLEX ou STRIPLINE */
  stripMethod?: "STRIPFLEX" | "STRIPLINE";
  /** Nome da barra Stripflex vindo da API, ex: "STRIPFLEX 562,5 X 10MM 36L" (genérico sem CCT) */
  ledModuleStripflex?: string | null;
  /** Nome da barra Stripline vindo da API, ex: "STRIPLINE 562,5 X 15MM 108L" (genérico sem CCT) */
  ledModuleStripline?: string | null;
  /** Nome completo da barra Stripflex por CCT (da API, ex: "STRIPFLEX 562.5 X 10MM - 36 LEDS 830 - 3000K (LC) 25V") */
  ledModuleStripflex2700?: string | null;
  ledModuleStripflex3000?: string | null;
  ledModuleStripflex4000?: string | null;
  ledModuleStripflex5000?: string | null;
  /** Nome completo da barra Stripline por CCT (da API) */
  ledModuleStripline2700?: string | null;
  ledModuleStripline3000?: string | null;
  ledModuleStripline4000?: string | null;
  ledModuleStripline5000?: string | null;
  /** Código EQ da barra Stripflex por CCT */
  ledModuleStripflexEq2700?: string | null;
  ledModuleStripflexEq3000?: string | null;
  ledModuleStripflexEq4000?: string | null;
  ledModuleStripflexEq5000?: string | null;
  /** Código EQ da barra Stripline por CCT */
  ledModuleStriplineEq2700?: string | null;
  ledModuleStriplineEq3000?: string | null;
  ledModuleStriplineEq4000?: string | null;
  ledModuleStriplineEq5000?: string | null;
  modules: ProfileModules;

  // ── Precificação por módulo (novo método — BLAZE H e futuros perfis) ──────────
  /** Custo do corpo/luminária para ON/OFF 220V (D1 simples). null = não cadastrado. */
  custoCorpoOnoff220v?: number | null;
  /** Custo do corpo/luminária para ON/OFF Bivolt (D1 simples). null = não cadastrado. */
  custoCorpoOnoffBivolt?: number | null;
  /** Custo do corpo/luminária para DIM 1-10V (D1 simples). null = não cadastrado. */
  custoCorpoDim110v?: number | null;
  /** Custo do corpo/luminária para DIM DALI (D1 simples). null = não cadastrado. */
  custoCorpoDimDali?: number | null;
  /** Custo do corpo/luminária para DIM TRIAC 110V (D1 simples). null = não cadastrado. */
  custoCorpoDimTriac110v?: number | null;
  /** Custo do corpo/luminária para DIM TRIAC 220V (D1 simples). null = não cadastrado. */
  custoCorpoDimTriac220v?: number | null;
  /** Custo do corpo/luminária para ON/OFF 220V (D1+D2 duplo). null = não cadastrado. */
  custoCorpoOnoff220vD1D2?: number | null;
  /** Custo do corpo/luminária para ON/OFF Bivolt (D1+D2 duplo). null = não cadastrado. */
  custoCorpoOnoffBivoltD1D2?: number | null;
  /** Custo do corpo/luminária para DIM 1-10V (D1+D2 duplo). null = não cadastrado. */
  custoCorpoDim110vD1D2?: number | null;
  /** Custo do corpo/luminária para DIM DALI (D1+D2 duplo). null = não cadastrado. */
  custoCorpoDimDaliD1D2?: number | null;
  /** Custo do corpo/luminária para DIM TRIAC 110V (D1+D2 duplo). null = não cadastrado. */
  custoCorpoDimTriac110vD1D2?: number | null;
  /** Custo do corpo/luminária para DIM TRIAC 220V (D1+D2 duplo). null = não cadastrado. */
  custoCorpoDimTriac220vD1D2?: number | null;
  /** Markup padrão da luminária para ON/OFF 220V. null = não cadastrado. */
  markupPadraoOnoff220v?: number | null;
  /** Markup mínimo da luminária para ON/OFF 220V. null = não cadastrado. */
  markupMinimoOnoff220v?: number | null;
  /** Markup padrão da luminária para ON/OFF Bivolt. null = não cadastrado. */
  markupPadraoOnoffBivolt?: number | null;
  /** Markup mínimo da luminária para ON/OFF Bivolt. null = não cadastrado. */
  markupMinimoOnoffBivolt?: number | null;
  /** Markup padrão da luminária para DIM 1-10V. null = não cadastrado. */
  markupPadraoDim110v?: number | null;
  /** Markup mínimo da luminária para DIM 1-10V. null = não cadastrado. */
  markupMinimoDim110v?: number | null;
  /** Markup padrão da luminária para DIM DALI. null = não cadastrado. */
  markupPadraoDimDali?: number | null;
  /** Markup mínimo da luminária para DIM DALI. null = não cadastrado. */
  markupMinimoDimDali?: number | null;
  /** Markup padrão da luminária para DIM TRIAC 110V. null = não cadastrado. */
  markupPadraoDimTriac110v?: number | null;
  /** Markup mínimo da luminária para DIM TRIAC 110V. null = não cadastrado. */
  markupMinimoDimTriac110v?: number | null;
  /** Markup padrão da luminária para DIM TRIAC 220V. null = não cadastrado. */
  markupPadraoDimTriac220v?: number | null;
  /** Markup mínimo da luminária para DIM TRIAC 220V. null = não cadastrado. */
  markupMinimoDimTriac220v?: number | null;
  /** Markup mínimo do driver (padrão = 3). */
  markupMinimoDriver?: number | null;
}

export type ModuleType = 'IN' | 'IF' | 'ML';

/** Nomenclatura oficial dos tipos de módulo */
export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  IN: 'Módulo Inteiro',
  IF: 'Início ou Final de Linha',
  ML: 'Meio de Linha',
};

/**
 * Catálogo principal: chave = código do produto (ex: 'LLP-4251')
 * Cada entrada representa uma variante única (perfil + instalação).
 */
export const LED_CATALOG: Record<string, ProfileVariant> = {
  "LLE-2580": {
    "name": "EASY PRIME",
    "code": "LLE-2580",
    "installType": "EMBUTIR",
    "allowD1": true,
    "allowD2": false,
    "allowD1D2": false,
    "modules": {
      "IN": {
        "1": { "length": 589, "sku": "LLE-2580.1IN.18F" },
        "1.4": { "length": 839, "sku": "LLE-2580.14I.18F" },
        "1.7": { "length": 1024, "sku": "LLE-2580.17I.18F" },
        "2": { "length": 1149, "sku": "LLE-2580.2IN.18F" },
        "2.1": { "length": 1214, "sku": "LLE-2580.21I.18F" },
        "2.2": { "length": 1274, "sku": "LLE-2580.22I.18F" },
        "2.4": { "length": 1399, "sku": "LLE-2580.24I.18F" },
        "2.5": { "length": 1464, "sku": "LLE-2580.25I.18F" },
        "2.8": { "length": 1649, "sku": "LLE-2580.28I.18F" },
        "3": { "length": 1714, "sku": "LLE-2580.3IN.18F" },
        "3.1": { "length": 1774, "sku": "LLE-2580.31I.18F" },
        "3.4": { "length": 1964, "sku": "LLE-2580.34I.18F" },
        "3.5": { "length": 2024, "sku": "LLE-2580.35I.18F" },
        "3.6": { "length": 2089, "sku": "LLE-2580.36I.18F" },
        "3.7": { "length": 2149, "sku": "LLE-2580.37I.18F" },
        "4": { "length": 2274, "sku": "LLE-2580.4IN.18F" },
        "4.2": { "length": 2399, "sku": "LLE-2580.42I.18F" },
        "4.3": { "length": 2464, "sku": "LLE-2580.43I.18F" },
        "4.4": { "length": 2524, "sku": "LLE-2580.44I.18F" },
        "4.5": { "length": 2589, "sku": "LLE-2580.45I.18F" },
        "4.7": { "length": 2714, "sku": "LLE-2580.47I.18F" },
        "4.8": { "length": 2774, "sku": "LLE-2580.48I.18F" },
        "5": { "length": 2839, "sku": "LLE-2580.5IN.18F" },
        "5.2": { "length": 2964, "sku": "LLE-2580.52I.18F" },
        "5.3": { "length": 3024, "sku": "LLE-2580.53I.18F" },
        "5.4": { "length": 3089, "sku": "LLE-2580.54I.18F" },
        "5.6": { "length": 3214, "sku": "LLE-2580.56I.18F" },
        "6": { "length": 3399, "sku": "LLE-2580.6IN.18F" },
      },
      "IF": {
        "1": { "length": 582, "sku": "LLE-2580.1IF.18F" },
        "2": { "length": 1142, "sku": "LLE-2580.2IF.18F" },
        "3": { "length": 1707, "sku": "LLE-2580.3IF.18F" },
        "3.2": { "length": 1832, "sku": "LLE-2580.32F.18F" },
        "3.4": { "length": 1957, "sku": "LLE-2580.34F.18F" },
        "3.6": { "length": 2082, "sku": "LLE-2580.36F.18F" },
        "3.8": { "length": 2207, "sku": "LLE-2580.38F.18F" },
        "4": { "length": 2267, "sku": "LLE-2580.4IF.18F" },
        "4.3": { "length": 2457, "sku": "LLE-2580.43F.18F" },
        "4.4": { "length": 2517, "sku": "LLE-2580.44F.18F" },
        "4.8": { "length": 2767, "sku": "LLE-2580.48F.18F" },
        "5": { "length": 2832, "sku": "LLE-2580.5IF.18F" },
        "5.2": { "length": 2957, "sku": "LLE-2580.52F.18F" },
        "5.3": { "length": 3017, "sku": "LLE-2580.53F.18F" },
        "5.4": { "length": 3082, "sku": "LLE-2580.54F.18F" },
        "5.6": { "length": 3207, "sku": "LLE-2580.56F.18F" },
        "5.7": { "length": 3267, "sku": "LLE-2580.57F.18F" },
        "5.8": { "length": 3332, "sku": "LLE-2580.58F.18F" },
        "6": { "length": 3392, "sku": "LLE-2580.6IF.18F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLE-2580.1ML.18F" },
        "2": { "length": 1130, "sku": "LLE-2580.2ML.18F" },
        "2.8": { "length": 1630, "sku": "LLE-2580.28M.18F" },
        "3": { "length": 1695, "sku": "LLE-2580.3ML.18F" },
        "3.2": { "length": 1820, "sku": "LLE-2580.32M.18F" },
        "3.6": { "length": 2070, "sku": "LLE-2580.36M.18F" },
        "4": { "length": 2255, "sku": "LLE-2580.4ML.18F" },
        "4.3": { "length": 2445, "sku": "LLE-2580.43M.18F" },
        "4.4": { "length": 2505, "sku": "LLE-2580.44M.18F" },
        "4.5": { "length": 2570, "sku": "LLE-2580.45M.18F" },
        "4.8": { "length": 2755, "sku": "LLE-2580.48M.18F" },
        "5": { "length": 2820, "sku": "LLE-2580.5ML.18F" },
        "5.2": { "length": 2945, "sku": "LLE-2580.52M.18F" },
        "5.3": { "length": 3005, "sku": "LLE-2580.53M.18F" },
        "5.8": { "length": 3320, "sku": "LLE-2580.58M.18F" },
        "6": { "length": 3380, "sku": "LLE-2580.6ML.18F" },
      },
    }
  },
  "LLP-4536": {
    "name": "SKYLINE",
    "code": "LLP-4536",
    "installType": "PENDENTE",
    "allowD1": true,
    "allowD2": true,
    "allowD1D2": false,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLP-4536.1IN.48F" },
        "1.7": { "length": 1010, "sku": "LLP-4536.17I.48F" },
        "1.8": { "length": 1075, "sku": "LLP-4536.18I.48F" },
        "2": { "length": 1135, "sku": "LLP-4536.2IN.48F" },
        "2.1": { "length": 1200, "sku": "LLP-4536.21I.48F" },
        "2.2": { "length": 1260, "sku": "LLP-4536.22I.48F" },
        "2.5": { "length": 1450, "sku": "LLP-4536.25I.48F" },
        "2.6": { "length": 1510, "sku": "LLP-4536.26I.48F" },
        "3": { "length": 1700, "sku": "LLP-4536.3IN.48F" },
        "3.1": { "length": 1760, "sku": "LLP-4536.31I.48F" },
        "3.3": { "length": 1885, "sku": "LLP-4536.33I.48F" },
        "3.4": { "length": 1950, "sku": "LLP-4536.34I.48F" },
        "3.5": { "length": 2010, "sku": "LLP-4536.35I.48F" },
        "3.8": { "length": 2200, "sku": "LLP-4536.38I.48F" },
        "4": { "length": 2260, "sku": "LLP-4536.4IN.48F" },
        "4.5": { "length": 2575, "sku": "LLP-4536.45I.48F" },
        "4.7": { "length": 2700, "sku": "LLP-4536.47I.48F" },
        "5": { "length": 2825, "sku": "LLP-4536.5IN.48F" },
        "5.2": { "length": 2950, "sku": "LLP-4536.52I.48F" },
        "5.3": { "length": 3010, "sku": "LLP-4536.53I.48F" },
        "6": { "length": 3385, "sku": "LLP-4536.6IN.48F" },
        "1.4": { "length": 825, "sku": "LLP-4536.14I.49F" },
        "4.4": { "length": 2510, "sku": "LLP-4536.44I.49F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLP-4536.2IF48F" },
        "2": { "length": 1135, "sku": "LLP-4536.2IF.48F" },
        "2.5": { "length": 1450, "sku": "LLP-4536.25F.48F" },
        "2.8": { "length": 1635, "sku": "LLP-4536.28F.48F" },
        "3": { "length": 1700, "sku": "LLP-4536.3IF.48F" },
        "3.1": { "length": 1760, "sku": "LLP-4536.31F.48F" },
        "3.4": { "length": 1950, "sku": "LLP-4536.34F.48F" },
        "4": { "length": 2260, "sku": "LLP-4536.4IF.48F" },
        "4.2": { "length": 2385, "sku": "LLP-4536.42F.48F" },
        "4.3": { "length": 2450, "sku": "LLP-4536.43F.48F" },
        "4.5": { "length": 2575, "sku": "LLP-4536.45F.48F" },
        "4.6": { "length": 2635, "sku": "LLP-4536.46F.48F" },
        "5": { "length": 2825, "sku": "LLP-4536.5IF.48F" },
        "5.4": { "length": 3075, "sku": "LLP-4536.54F.48F" },
        "5.5": { "length": 3135, "sku": "LLP-4536.55F.48F" },
        "6": { "length": 3385, "sku": "LLP-4536.6IF.48F" },
        "3.5": { "length": 2010, "sku": "LLP-4536.35F.49F" },
        "4.4": { "length": 2510, "sku": "LLP-4536.44F.49F" },
        "5.6": { "length": 3200, "sku": "LLP-4536.56F.49F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLP-4536.1ML.48F" },
        "2": { "length": 1130, "sku": "LLP-4536.2ML.48F" },
        "2.7": { "length": 1570, "sku": "LLP-4536.27M.48F" },
        "3": { "length": 1695, "sku": "LLP-4536.3ML.48F" },
        "4": { "length": 2255, "sku": "LLP-4536.4ML.48F" },
        "4.1": { "length": 2320, "sku": "LLP-4536.41M.48F" },
        "4.2": { "length": 2380, "sku": "LLP-4536.42M.48F" },
        "5": { "length": 2820, "sku": "LLP-4536.5ML.48F" },
        "5.2": { "length": 2945, "sku": "LLP-4536.52M.48F" },
        "5.4": { "length": 3070, "sku": "LLP-4536.54M.48F" },
        "5.7": { "length": 3255, "sku": "LLP-4536.57M.48F" },
        "6": { "length": 3380, "sku": "LLP-4536.6ML.48F" },
        "4.4": { "length": 2505, "sku": "LLP-4536.44M.49F" },
      },
    }
  },
  "LLE-2052": {
    "name": "SKYLINE",
    "code": "LLE-2052",
    "installType": "EMBUTIR",
    "allowD1": true,
    "allowD2": false,
    "allowD1D2": false,
    "modules": {
      "IN": {
        "1": { "length": 589, "sku": "LLE-2052.1IN.18F" },
        "1.2": { "length": 714, "sku": "LLE-2052.12I.18F" },
        "1.3": { "length": 774, "sku": "LLE-2052.13I.18F" },
        "1.6": { "length": 964, "sku": "LLE-2052.16I.18F" },
        "1.7": { "length": 1024, "sku": "LLE-2052.17I.18F" },
        "2": { "length": 1149, "sku": "LLE-2052.2IN.18F" },
        "2.1": { "length": 1214, "sku": "LLE-2052.21I.18F" },
        "2.2": { "length": 1274, "sku": "LLE-2052.22I.18F" },
        "2.4": { "length": 1399, "sku": "LLE-2052.24I..18F" },
        "2.5": { "length": 1464, "sku": "LLE-2052.25I.18F" },
        "2.6": { "length": 1524, "sku": "LLE-2052.26I.18F" },
        "2.7": { "length": 1589, "sku": "LLE-2052.27I.18F" },
        "2.8": { "length": 1649, "sku": "LLE-2052.28I.18F" },
        "3": { "length": 1714, "sku": "LLE-2052.3IN.18F" },
        "3.1": { "length": 1774, "sku": "LLE-2052.31I18F" },
        "3.2": { "length": 1839, "sku": "LLE-2052.32I.18F" },
        "3.3": { "length": 1899, "sku": "LLE-2052.33F.18F" },
        "3.4": { "length": 1964, "sku": "LLE-20252.34I.18F" },
        "3.5": { "length": 2024, "sku": "LLE-2052.35I.18F" },
        "3.6": { "length": 2089, "sku": "LLE-2052.36I18F" },
        "3.7": { "length": 2149, "sku": "LLE-2052.37I.18F" },
        "4": { "length": 2274, "sku": "LLE-2052.4IN.18F" },
        "4.1": { "length": 2339, "sku": "LLE-2052.41I.18F" },
        "4.2": { "length": 2399, "sku": "LLE-2052.42I.18F" },
        "4.3": { "length": 2464, "sku": "LLE-2052.43I.18F" },
        "4.4": { "length": 2524, "sku": "LLE-2052.44I.18F" },
        "4.5": { "length": 2589, "sku": "LLE-2052.45I.18F" },
        "4.6": { "length": 2649, "sku": "LLE-2052.46I.18F" },
        "4.8": { "length": 2774, "sku": "LLE-2052.48I.18F" },
        "5": { "length": 2839, "sku": "LLE-2052.5IN.18F" },
        "5.1": { "length": 2899, "sku": "LLE-2052.51I.18F" },
        "5.2": { "length": 2964, "sku": "LLE-2052.52I.18F" },
        "5.3": { "length": 3024, "sku": "LLE-2052.53I.18F" },
        "5.5": { "length": 3149, "sku": "LLE-2052.55I.18F" },
        "5.7": { "length": 3274, "sku": "LLE-2052.57I.18F" },
        "6": { "length": 3399, "sku": "LLE-2052.6IN.18F" },
      },
      "IF": {
        "1": { "length": 582, "sku": "LLE-2052.1IF.18F" },
        "1.2": { "length": 707, "sku": "LLE-2052.12F.18F" },
        "1.3": { "length": 767, "sku": "LLE-2052.13F.18F" },
        "1.4": { "length": 832, "sku": "LLE-2052.14F.18F" },
        "1.6": { "length": 957, "sku": "LLE-2052.16F.18F" },
        "1.8": { "length": 1082, "sku": "LLE-2052.18F.18F" },
        "2": { "length": 1142, "sku": "LLE-2052.2IF.18F" },
        "2.1": { "length": 1207, "sku": "LLE-2052.21F.18F" },
        "2.2": { "length": 1267, "sku": "LLE-2052.22F.18F" },
        "2.3": { "length": 1332, "sku": "LLE-2052.23F.18F" },
        "2.4": { "length": 1392, "sku": "LLE-2052.24F.18F" },
        "2.5": { "length": 1457, "sku": "LLE-2052.25F18F" },
        "2.6": { "length": 1517, "sku": "LLE-2052.26F.18F" },
        "2.7": { "length": 1582, "sku": "LLE-2052.27F.18F" },
        "2.8": { "length": 1642, "sku": "LLE-2052.28F.18F" },
        "3": { "length": 1707, "sku": "LLE-2052.3IF.18F" },
        "3.1": { "length": 1767, "sku": "LLE-2052.31F.18F" },
        "3.2": { "length": 1832, "sku": "LLE-2052.32F.18F" },
        "3.3": { "length": 1892, "sku": "LLE-2052.33F.18F" },
        "3.4": { "length": 1957, "sku": "LLE-2052.34F.18F" },
        "3.5": { "length": 2017, "sku": "LLE-2052.35F.18F" },
        "3.7": { "length": 2142, "sku": "LLE-2052.37F.18F" },
        "4": { "length": 2267, "sku": "LLE-2052.4IF.18F" },
        "4.1": { "length": 2332, "sku": "LLE-2052.41F.18F" },
        "4.2": { "length": 2392, "sku": "LLE-2052.42F.18F" },
        "4.3": { "length": 2457, "sku": "LLE-2052.43F.18F" },
        "4.4": { "length": 2517, "sku": "LLE-2052.44F.18F" },
        "4.5": { "length": 2582, "sku": "LLE-2052.45F.18F" },
        "4.6": { "length": 2642, "sku": "LLE-2052.46F.18F" },
        "4.7": { "length": 2707, "sku": "LLE-2052.47F.18F" },
        "4.8": { "length": 2767, "sku": "LLE-2052.48F.18F" },
        "5": { "length": 2832, "sku": "LLE-2052.5IF.18F" },
        "5.1": { "length": 2892, "sku": "LLE-2052.51F.18F" },
        "5.2": { "length": 2957, "sku": "LLE-2052.52I.18F" },
        "5.3": { "length": 3017, "sku": "LLE-2052.53F.18F" },
        "5.5": { "length": 3142, "sku": "LLE-2052.55F.18F" },
        "5.6": { "length": 3207, "sku": "LLE-2052.56F.18F" },
        "5.7": { "length": 3267, "sku": "LLE-2052.57F.18F" },
        "5.8": { "length": 3332, "sku": "LLE-2052.58F.18F" },
        "6": { "length": 3392, "sku": "LLE-2052.6IF.18F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLE-2052.1ML.18F" },
        "1.3": { "length": 755, "sku": "LLE-2052.13M.18F" },
        "2": { "length": 1130, "sku": "LLE-2052.2ML.18F" },
        "2.3": { "length": 1320, "sku": "LLE-2052.23M.18F" },
        "3": { "length": 1695, "sku": "LLE-2052.3ML.18F" },
        "3.1": { "length": 1755, "sku": "LLE-2052.31M.18F" },
        "3.5": { "length": 2005, "sku": "LLE-2052.35M.18F" },
        "3.7": { "length": 2130, "sku": "LLE-2052.37M.18F" },
        "4": { "length": 2255, "sku": "LLE-2052.4ML.18F" },
        "4.1": { "length": 2320, "sku": "LLE-2052.41M.18F" },
        "4.3": { "length": 2445, "sku": "LLE-2052.43M.18F" },
        "4.4": { "length": 2505, "sku": "LLE-2052.44M.18F" },
        "4.6": { "length": 2630, "sku": "LLE-2052.46M.18F" },
        "5": { "length": 2820, "sku": "LLE-2052.5ML.18F" },
        "5.1": { "length": 2880, "sku": "LLE-2052.51M.18F" },
        "5.3": { "length": 3005, "sku": "LLE-2052.53M.18F" },
        "5.4": { "length": 3070, "sku": "LLE-2052.54M.18F" },
        "5.5": { "length": 3130, "sku": "LLE-2052.55M.18F" },
        "5.6": { "length": 3195, "sku": "LLE-2052.56M.18F" },
        "5.7": { "length": 3255, "sku": "LLE-2052.57M.18F" },
        "5.8": { "length": 3320, "sku": "LLE-2052.58M.18F" },
        "6": { "length": 3380, "sku": "LLE-2052.6ML.18F" },
      },
    }
  },
  "LLS-3945": {
    "name": "BLAZE",
    "code": "LLS-3945",
    "installType": "SOBREPOR",
    "allowD1": true,
    "allowD2": false,
    "allowD1D2": false,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLS-3945.1IN.38F" },
        "1.1": { "length": 635, "sku": "LLS-3945.11I.38F" },
        "1.3": { "length": 760, "sku": "LLS-3945.13I.38F" },
        "1.6": { "length": 950, "sku": "LLS-3945.16I.38F" },
        "1.7": { "length": 1010, "sku": "LLS-3945.17I.38F" },
        "1.8": { "length": 1075, "sku": "LLS-3945.18I.38F" },
        "2": { "length": 1135, "sku": "LLS-3945.2IN.38F" },
        "2.1": { "length": 1200, "sku": "LLS-3945.21I.38F" },
        "2.2": { "length": 1260, "sku": "LLS-3945.22I.38F" },
        "2.5": { "length": 1450, "sku": "LLS-3945.25I.38F" },
        "2.8": { "length": 1635, "sku": "LLS-3945.28I.38F" },
        "3": { "length": 1700, "sku": "LLS-3945.3IN.38F" },
        "3.1": { "length": 1760, "sku": "LLS-3945.31I.38F" },
        "3.4": { "length": 1950, "sku": "LLS-3945.34I.38F" },
        "3.5": { "length": 2010, "sku": "LLS-3945.35I.38F" },
        "3.8": { "length": 2200, "sku": "LLS-3945.38I.38F" },
        "4": { "length": 2260, "sku": "LLS-3945.4IN.38F" },
        "4.1": { "length": 2325, "sku": "LLS-3945.41I.38F" },
        "4.2": { "length": 2385, "sku": "LLS-3945.42I.38F" },
        "4.4": { "length": 2510, "sku": "LLS-3945.44I.38F" },
        "4.5": { "length": 2575, "sku": "LLS-3945.45I.38F" },
        "4.6": { "length": 2635, "sku": "LLS-3945.46I.38F" },
        "4.7": { "length": 2700, "sku": "LLS-3945.47I.38F" },
        "4.8": { "length": 2760, "sku": "LLS-3945.48I.38F" },
        "5": { "length": 2825, "sku": "LLS-3945.5IN.38F" },
        "5.1": { "length": 2885, "sku": "LLS-3945.51I.38F" },
        "5.3": { "length": 3010, "sku": "LLS-3945.53I.38F" },
        "5.4": { "length": 3075, "sku": "LLS-3945.54I.38F" },
        "5.6": { "length": 3200, "sku": "LLS-3945.56I.38F" },
        "5.8": { "length": 3325, "sku": "LLS-3945.58I.38F" },
        "6": { "length": 3385, "sku": "LLS-3945.6IN.38F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLS-3945.1IF.38F" },
        "2": { "length": 1135, "sku": "LLS-3945.2IF.38F" },
        "2.5": { "length": 1450, "sku": "LLS-3945.25F.38F" },
        "2.6": { "length": 1510, "sku": "LLS-3945.26F.38F" },
        "2.8": { "length": 1635, "sku": "LLS-3945.28F.38F" },
        "3": { "length": 1700, "sku": "LLS-3945.3IF.38F" },
        "3.1": { "length": 1760, "sku": "LLS-3945.31F.38F" },
        "3.2": { "length": 1825, "sku": "LLS-3945.32F.38F" },
        "3.3": { "length": 1885, "sku": "LLS-3945.33F.38F" },
        "3.4": { "length": 1950, "sku": "LLS-3945.34F.38F" },
        "3.5": { "length": 2010, "sku": "LLS-3945.35F.38F" },
        "3.6": { "length": 2075, "sku": "LLS-3945.36F.38F" },
        "3.7": { "length": 2135, "sku": "LLS-3945.37F.38F" },
        "3.8": { "length": 2200, "sku": "LLS-3945.38F.38F" },
        "4": { "length": 2260, "sku": "LLS-3945.4IF.38F" },
        "4.1": { "length": 2325, "sku": "LLS-3945.41F.38F" },
        "4.2": { "length": 2385, "sku": "LLS-3945.42F.38F" },
        "4.3": { "length": 2450, "sku": "LLS-3945.43F.38F" },
        "4.4": { "length": 2510, "sku": "LLS-3945.44F.38F" },
        "4.5": { "length": 2575, "sku": "LLS-3945.45F.38F" },
        "4.7": { "length": 2700, "sku": "LLS-3945.47F.38F" },
        "4.8": { "length": 2760, "sku": "LLS-3945.48F.38F" },
        "5": { "length": 2825, "sku": "LLS-3945.5IF.38F" },
        "5.1": { "length": 2885, "sku": "LLS-3945.51F.38F" },
        "5.3": { "length": 3010, "sku": "LLS-3945.53F.38F" },
        "5.4": { "length": 3075, "sku": "LLS-3945.54F.38F" },
        "5.5": { "length": 3135, "sku": "LLS-3945.55F.38F" },
        "5.7": { "length": 3260, "sku": "LLS-3945.57F.38F" },
        "5.8": { "length": 3325, "sku": "LLS-3945.58F.38F" },
        "6": { "length": 3385, "sku": "LLS-3945.6IF.38F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLS-3945.1ML.38F" },
        "1.4": { "length": 820, "sku": "LLS-3945.14M.38F" },
        "2": { "length": 1130, "sku": "LLS-3945.2ML.38F" },
        "2.2": { "length": 1255, "sku": "LLS-3945.22M.38F" },
        "2.3": { "length": 1320, "sku": "LLS-3945.23M.38F" },
        "3": { "length": 1695, "sku": "LLS-3945.3ML.38F" },
        "3.3": { "length": 1880, "sku": "LLS-3945.33M.38F" },
        "3.4": { "length": 1945, "sku": "LLS-3945.34M.38F" },
        "3.5": { "length": 2005, "sku": "LLS-3945.35M.38F" },
        "4": { "length": 2255, "sku": "LLS-3945.4ML.38F" },
        "4.2": { "length": 2380, "sku": "LLS-3945.42M.38F" },
        "4.4": { "length": 2505, "sku": "LLS-3945.44M.38F" },
        "4.5": { "length": 2570, "sku": "LLS-3945.45M.38F" },
        "5": { "length": 2820, "sku": "LLS-3945.5ML.38F" },
        "5.1": { "length": 2880, "sku": "LLS-3945.51M.38F" },
        "5.2": { "length": 2945, "sku": "LLS-3945.52M.38F" },
        "5.3": { "length": 3005, "sku": "LLS-3945.53M.38F" },
        "5.8": { "length": 3320, "sku": "LLS-3945.58M.38F" },
        "6": { "length": 3380, "sku": "LLS-3945.6ML.38F" },
      },
    }
  },
  "LLA-5945": {
    "name": "BLAZE",
    "code": "LLA-5945",
    "installType": "ARANDELA",
    "allowD1": true,
    "allowD2": true,
    "allowD1D2": false,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLA-5945.1IN.39F" },
        "2": { "length": 1135, "sku": "LLA-5945.2IN.39F" },
        "3": { "length": 1700, "sku": "LLA-5945.3IN.39F" },
        "4": { "length": 2260, "sku": "LLA-5945.4IN.39F" },
        "5": { "length": 2825, "sku": "LLA-5945.5IN.39F" },
        "6": { "length": 3385, "sku": "LLA-5945.6IN.39F" },
        "1.5": { "length": 885, "sku": "LLA-5945.15I.58F" },
        "2.6": { "length": 1510, "sku": "LLA-5945.26I.58F" },
        "3.2": { "length": 1825, "sku": "LLA-5945.32I.58F" },
        "5.1": { "length": 2885, "sku": "LLA-5945.51I.58F" },
        "5.6": { "length": 3200, "sku": "LLA-5945.56I.58F" },
        "5.8": { "length": 3325, "sku": "LLA-5945.58I.58F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLA-5945.1IF.39F" },
        "2": { "length": 1135, "sku": "LLA-5945.2IF.39F" },
        "3": { "length": 1700, "sku": "LLA-5945.3IF.39F" },
        "4": { "length": 2260, "sku": "LLA-5945.4IF.39F" },
        "5": { "length": 2825, "sku": "LLA-5945.5IF.39F" },
        "6": { "length": 3385, "sku": "LLA-5945.6IF.39F" },
        "3.7": { "length": 2135, "sku": "LLA-5945.37F.58F" },
        "4.1": { "length": 2325, "sku": "LLA-5945.41F.58F" },
        "4.3": { "length": 2450, "sku": "LLA-5945.43F.58F" },
        "5.6": { "length": 3200, "sku": "LLA-5945.56F.58F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLA-5945.1ML.39F" },
        "2": { "length": 1130, "sku": "LLA-5945.2ML.39F" },
        "3": { "length": 1695, "sku": "LLA-5945.3ML.39F" },
        "4": { "length": 2255, "sku": "LLA-5945.4ML.39F" },
        "5": { "length": 2820, "sku": "LLA-5945.5ML.39F" },
        "6": { "length": 3380, "sku": "LLA-5945.6ML.39F" },
        "4.3": { "length": 2445, "sku": "LLA-5945.43M.58F" },
        "5.6": { "length": 3195, "sku": "LLA-5945.56M.58F" },
        "5.7": { "length": 3255, "sku": "LLA-5945.57M.58F" },
      },
    }
  },
  "LLE-2810": {
    "name": "BLAZE",
    "code": "LLE-2810",
    "installType": "EMBUTIR",
    "allowD1": true,
    "allowD2": true,
    "allowD1D2": false,
    "hasDiffuser": false,
    "modules": {
      "IN": {
        "1": { "length": 595, "sku": "LLE-2810.1IN.18F" },
        "1.1": { "length": 655, "sku": "LLE-2810.11I.18F" },
        "1.2": { "length": 720, "sku": "LLE-2810.12I.18F" },
        "1.3": { "length": 780, "sku": "LLE-2810.13I.18F" },
        "1.5": { "length": 905, "sku": "LLE-2810.15I.18F" },
        "1.6": { "length": 970, "sku": "LLE-2810.16I.18F" },
        "1.7": { "length": 1030, "sku": "LLE-2810.17I.18F" },
        "1.8": { "length": 1095, "sku": "LLE-2810.18I.18F" },
        "2": { "length": 1155, "sku": "LLE-2810.2IN.18F" },
        "2.1": { "length": 1220, "sku": "LLE-2810.21I.18F" },
        "2.2": { "length": 1280, "sku": "LLE-2810.22I.18F" },
        "2.3": { "length": 1345, "sku": "LLE-2810.23I.18F" },
        "2.4": { "length": 1405, "sku": "LLE-2810.24I.18F" },
        "2.5": { "length": 1470, "sku": "LLE-2810.25I.18F" },
        "2.6": { "length": 1530, "sku": "LLE--2810.26I.18F" },
        "2.8": { "length": 1655, "sku": "LLE-2810.28F.18F" },
        "3": { "length": 1720, "sku": "LLE-2810.3IN.18F" },
        "3.1": { "length": 1780, "sku": "LLE-2810.31I.18F" },
        "3.4": { "length": 1970, "sku": "LLE-2810.34I.18F" },
        "3.5": { "length": 2030, "sku": "LLE-2810.35I.18F" },
        "3.6": { "length": 2095, "sku": "LLE-2810.36I.18F" },
        "3.7": { "length": 2155, "sku": "LLE-2810.37I.18F" },
        "3.8": { "length": 2220, "sku": "LLE-2810.38I.18F" },
        "4": { "length": 2280, "sku": "LLE-2810.4IN.18F" },
        "4.1": { "length": 2345, "sku": "LLE-2810.41I.18F" },
        "4.2": { "length": 2405, "sku": "LLE-2810.42I.18F" },
        "4.3": { "length": 2470, "sku": "LLE-2810.43I.18F" },
        "4.4": { "length": 2530, "sku": "LLE-2810.44I.18F" },
        "4.5": { "length": 2595, "sku": "LLE-2810.45I.18F" },
        "4.6": { "length": 2655, "sku": "LLE-2810.46I.18F" },
        "4.8": { "length": 2780, "sku": "LLE-2810.48I.18F" },
        "5": { "length": 2845, "sku": "LLE-2810.5IN.18F" },
        "5.2": { "length": 2970, "sku": "LLE-2810.52I.18F" },
        "5.3": { "length": 3030, "sku": "LLE-2810.53I.18F" },
        "5.5": { "length": 3155, "sku": "LLE-2810.55I.18F" },
        "5.6": { "length": 3220, "sku": "LLE-2810.56I.18F" },
        "6": { "length": 3405, "sku": "LLE-2810.6IN.18F" },
      },
      "IF": {
        "1": { "length": 585, "sku": "LLE-2810.1IF.18F" },
        "1.1": { "length": 645, "sku": "LLE-2810.11F.18F" },
        "1.2": { "length": 710, "sku": "LLE-2810.12F.18F" },
        "1.4": { "length": 835, "sku": "LLE-2810.14F.18F" },
        "1.5": { "length": 895, "sku": "LLE-2810.15F.18F" },
        "1.6": { "length": 960, "sku": "LLE-2810.16F.18F" },
        "2": { "length": 1145, "sku": "LLE-2810.2IF.18F" },
        "2.3": { "length": 1335, "sku": "LLE-2810.23F.18F" },
        "2.4": { "length": 1395, "sku": "LLE-2810.24F.18F" },
        "2.6": { "length": 1520, "sku": "LLE-2810.26F.18F" },
        "2.8": { "length": 1645, "sku": "LLE-2810.28F.18F" },
        "3": { "length": 1710, "sku": "LLE-2810.3IF.18F" },
        "3.1": { "length": 1770, "sku": "LLE-2810.31F.18F" },
        "3.2": { "length": 1835, "sku": "LLE-2810.32F.18F" },
        "3.3": { "length": 1895, "sku": "LLE-2810.33F.18F" },
        "3.4": { "length": 1960, "sku": "LLE-2810.34F.18F" },
        "3.5": { "length": 2020, "sku": "LLE-2810.35F.18F" },
        "3.6": { "length": 2085, "sku": "LLE-2810.36F.18F" },
        "3.7": { "length": 2145, "sku": "LLE-2810.37F.18F" },
        "3.8": { "length": 2210, "sku": "LLE-2810.38F.18F" },
        "4": { "length": 2270, "sku": "LLE-2810.4IF.18F" },
        "4.1": { "length": 2335, "sku": "LLE-2810.41F.18F" },
        "4.3": { "length": 2460, "sku": "LLE-2810.43F.18F" },
        "4.4": { "length": 2520, "sku": "LLE-2810.44F.18F" },
        "4.5": { "length": 2585, "sku": "LLE-2810.45F.18F" },
        "4.6": { "length": 2645, "sku": "LLE-2810.46F.18F" },
        "4.7": { "length": 2710, "sku": "LLE-2810.47F.18F" },
        "4.8": { "length": 2770, "sku": "LLE-2810.48F.18F" },
        "5": { "length": 2835, "sku": "LLE-2810.5IF.18F" },
        "5.1": { "length": 2895, "sku": "LLE-2810.51F.18F" },
        "5.2": { "length": 2960, "sku": "LLE-2810.52F.18F" },
        "5.3": { "length": 3020, "sku": "LLE-2810.53F.18F" },
        "5.4": { "length": 3085, "sku": "LLE-2810.54F.18F" },
        "5.5": { "length": 3145, "sku": "LLE-2810.55F.18F" },
        "5.7": { "length": 3270, "sku": "LLE-2810.57F.18F" },
        "6": { "length": 3395, "sku": "LLE-2810.6IF.18F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLE-2810.1ML.18F" },
        "1.2": { "length": 695, "sku": "LLE-2810.12M.18F" },
        "1.4": { "length": 820, "sku": "LLE-2810.14M.18F" },
        "1.8": { "length": 1070, "sku": "LLE-2810.18M.18F" },
        "2": { "length": 1130, "sku": "LLE-2810.2ML.18F" },
        "2.1": { "length": 1195, "sku": "LLE-2810.21M.18F" },
        "2.4": { "length": 1380, "sku": "LLE-2810.24M.18F" },
        "2.6": { "length": 1505, "sku": "LLE-2810.26M.18F" },
        "2.8": { "length": 1630, "sku": "LLE-2810.28M.18F" },
        "3": { "length": 1695, "sku": "LLE-2810.3ML.18F" },
        "3.2": { "length": 1820, "sku": "LLE-2810.32M.18F" },
        "3.4": { "length": 1945, "sku": "LLE-2810.34M.18F" },
        "3.5": { "length": 2005, "sku": "LLE-2810.35M.18F" },
        "3.7": { "length": 2130, "sku": "LLE-2810.37M.18F" },
        "3.8": { "length": 2195, "sku": "LLE-2810.38M.18F" },
        "4": { "length": 2255, "sku": "LLE-2810.4ML.18F" },
        "4.1": { "length": 2320, "sku": "LLE-2810.41M.18F" },
        "4.3": { "length": 2445, "sku": "LLE-2810.43M.18F" },
        "4.4": { "length": 2505, "sku": "LLE-2810.44M.18F" },
        "4.5": { "length": 2570, "sku": "LLE-2810.45M.18F" },
        "4.7": { "length": 2695, "sku": "LLE-2810.47M.18F" },
        "4.8": { "length": 2755, "sku": "LLE-2810.48M.18F" },
        "5": { "length": 2820, "sku": "LLE-2810.5ML.18F" },
        "5.1": { "length": 2880, "sku": "LLE-2810.51M.18F" },
        "5.3": { "length": 3005, "sku": "LLE-2810.53M.18F" },
        "5.4": { "length": 3070, "sku": "LLE-2810.54M.18F" },
        "5.5": { "length": 3130, "sku": "LLE-2810.55M.18F" },
        "5.6": { "length": 3195, "sku": "LLE-2810.56M.18F" },
        "5.7": { "length": 3255, "sku": "LLE-2810.57M.18F" },
        "5.8": { "length": 3320, "sku": "LLE-2810.58M.18F" },
        "6": { "length": 3380, "sku": "LLE-2810.6ML.18F" },
      },
    }
  },
  "LLP-6060": {
    "name": "BLAZE H",
    "code": "LLP-6060",
    "installType": "PENDENTE",
    "allowD1": true,
    "allowD2": true,
    "allowD1D2": true,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLP-6060.1IN.48F" },
        "2": { "length": 1135, "sku": "LLP-6060.2IN.48F" },
        "2.2": { "length": 1260, "sku": "LLP-6060.22I.48F" },
        "3": { "length": 1700, "sku": "LLP-6060.3IN.48F" },
        "3.1": { "length": 1760, "sku": "LLP-6060.31I.48F" },
        "4": { "length": 2260, "sku": "LLP-6060.4IN.48F" },
        "5": { "length": 2825, "sku": "LLP-6060.5IN.48F" },
        "6": { "length": 3385, "sku": "LLP-6060.6IN.48F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLP-6060.1IF.48F" },
        "2": { "length": 1135, "sku": "LLP-6060.2IF.48F" },
        "3": { "length": 1700, "sku": "LLP-6060.3IF.48F" },
        "3.5": { "length": 2010, "sku": "LLP-6060.35F.48F" },
        "3.6": { "length": 2075, "sku": "LLP-6060.35F.48F" },
        "3.8": { "length": 2200, "sku": "LLP-6060.38F.48F" },
        "4": { "length": 2260, "sku": "LLP-6060.4IF.48F" },
        "4.6": { "length": 2635, "sku": "LLP-6060.46F.48F" },
        "4.8": { "length": 2760, "sku": "LLP-6060.48F.48F" },
        "5": { "length": 2825, "sku": "LLP-6060.5IF.48F" },
        "5.8": { "length": 3325, "sku": "LLP-6060.58F.48F" },
        "6": { "length": 3385, "sku": "LLP-6060.6IF.48F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLP-6060.1ML.48F" },
        "2": { "length": 1130, "sku": "LLP-6060.2ML.48F" },
        "3": { "length": 1695, "sku": "LLP-6060.3ML.48F" },
        "4": { "length": 2255, "sku": "LLP-6060.4ML.48F" },
        "4.6": { "length": 2630, "sku": "LLP-6060.46M.48F" },
        "4.8": { "length": 2755, "sku": "LLP-6060.48M.48F" },
        "5": { "length": 2820, "sku": "LLP-6060.5ML.48F" },
      },
    }
  },
  "LLP-3336": {
    "name": "MINI BLAZE",
    "code": "LLP-3336",
    "installType": "PENDENTE",
    "allowD1": true,
    "allowD2": false,
    "allowD1D2": false,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLP-3336.1IN.48F" },
        "2": { "length": 1135, "sku": "LLP-3336.2IN.48F" },
        "2.3": { "length": 1325, "sku": "LLP-3336.23I.48F" },
        "3": { "length": 1700, "sku": "LLP-3336.3IN.48F" },
        "3.5": { "length": 2010, "sku": "LLP-3336.35I.48F" },
        "4": { "length": 2260, "sku": "LLP-3336.4IN.48F" },
        "5": { "length": 2825, "sku": "LLP-3336.5IN.48F" },
        "5.3": { "length": 3010, "sku": "LLP-3336.53I.48F" },
        "6": { "length": 3385, "sku": "LLP-3336.6IN.48F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLP-3336.1IF.48F" },
        "2": { "length": 1135, "sku": "LLP-3336.2IF.48F" },
        "3": { "length": 1700, "sku": "LLP-336.3IF.48F" },
        "3.4": { "length": 1950, "sku": "LLP-3336.34F.48F" },
        "4": { "length": 2260, "sku": "LLP-3336.4IF.48F" },
        "4.2": { "length": 2385, "sku": "LLP-3336.42F.48F" },
        "4.6": { "length": 2635, "sku": "LLP-3336.46F.48F" },
        "4.7": { "length": 2700, "sku": "LLP-3336.47I.48F" },
        "5": { "length": 2825, "sku": "LLP-3336.5IF.48F" },
        "5.3": { "length": 3010, "sku": "LLP-3336.53F.48F" },
        "6": { "length": 3385, "sku": "LLP-3336.6IF.48F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLP3336.1ML.48F" },
        "2": { "length": 1130, "sku": "LLP-3336.2ML.48F" },
        "2.3": { "length": 1320, "sku": "LLP-3336.23M.48F" },
        "3": { "length": 1695, "sku": "LLP-3336.3ML.48F" },
        "4": { "length": 2255, "sku": "LLP-3336.4ML.48F" },
        "4.2": { "length": 2380, "sku": "LLP-3336.42M.48F" },
        "5": { "length": 2820, "sku": "LLP-3336.5ML.48F" },
        "6": { "length": 3380, "sku": "LLP-3336.6ML.48F" },
      },
    }
  },
  "LLS-3336": {
    "name": "MINI BLAZE",
    "code": "LLS-3336",
    "installType": "SOBREPOR",
    "allowD1": true,
    "allowD2": false,
    "allowD1D2": false,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLS-3336.1IN.38F" },
        "1.1": { "length": 635, "sku": "LLS-3336.11I.38F" },
        "1.6": { "length": 950, "sku": "LLS-3336.16I.38F" },
        "1.7": { "length": 1010, "sku": "LLS-3336.17I.38F" },
        "2": { "length": 1135, "sku": "LLS-3336.2IN.38F" },
        "2.1": { "length": 1200, "sku": "LLS-3336.21I.38F" },
        "2.3": { "length": 1325, "sku": "LLS-3336.23I.38F" },
        "2.4": { "length": 1385, "sku": "LLS-3336.24I.38F" },
        "2.5": { "length": 1450, "sku": "LLS-3336.25I.38F" },
        "2.7": { "length": 1575, "sku": "LLS-3336.27I.38F" },
        "3": { "length": 1700, "sku": "LLS-3336.3IN.38F" },
        "3.1": { "length": 1760, "sku": "LLS-3336.31I.38F" },
        "3.2": { "length": 1825, "sku": "LLS-3336.32F.38F" },
        "3.5": { "length": 2010, "sku": "LLS-3336.35I.38F" },
        "3.7": { "length": 2135, "sku": "LLS-3336.37I.38F" },
        "3.8": { "length": 2200, "sku": "LLS-3336.38I.38F" },
        "4": { "length": 2260, "sku": "LLS-3336.4IN.38F" },
        "4.3": { "length": 2450, "sku": "LLS-336.43I.38F" },
        "5": { "length": 2825, "sku": "LLS-3336.5IN.38F" },
        "5.2": { "length": 2950, "sku": "LLS-3336.52I.38F" },
        "5.3": { "length": 3010, "sku": "LLS-3336.53I.38F" },
        "6": { "length": 3385, "sku": "LLS-3336.6IN.38F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLS-3336.1IF.38F" },
        "1.6": { "length": 950, "sku": "LLS-3336.16F.38F" },
        "2": { "length": 1135, "sku": "LLS-3336.2IF.38F" },
        "2.1": { "length": 1200, "sku": "LLS-3336.21F.38F" },
        "2.6": { "length": 1510, "sku": "LLS-3336.26F.38F" },
        "3": { "length": 1700, "sku": "LLS-3336.3IF.38F" },
        "3.1": { "length": 1760, "sku": "LLS-3336.31F.38F" },
        "3.2": { "length": 1825, "sku": "LLS-3336.32F.38F" },
        "3.4": { "length": 1950, "sku": "LLS-3336.34F.38F" },
        "3.6": { "length": 2075, "sku": "LLS-3336.36F.38F" },
        "3.8": { "length": 2200, "sku": "LLS-3336.38F.38F" },
        "4": { "length": 2260, "sku": "LLS-3336.4IF.38F" },
        "4.1": { "length": 2325, "sku": "LLS-3336.41F.38F" },
        "4.3": { "length": 2450, "sku": "LLS-3336.43F.38F" },
        "4.8": { "length": 2760, "sku": "LLS-3336.48F.38F" },
        "5": { "length": 2825, "sku": "LLS-3336.5IF.38F" },
        "5.1": { "length": 2885, "sku": "LLS-3336.51F.38F" },
        "5.2": { "length": 2950, "sku": "LLS-3336.52F.38F" },
        "6": { "length": 3385, "sku": "LLS-3336.6IF.38F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLS-3336.1ML.38F" },
        "2": { "length": 1130, "sku": "LLS-3336.2ML.38F" },
        "2.1": { "length": 1195, "sku": "LLS-336.21M.38F" },
        "3": { "length": 1695, "sku": "LLS-3336.3ML.38F" },
        "3.1": { "length": 1755, "sku": "LLS-3336.31M.38F" },
        "3.3": { "length": 1880, "sku": "LLS-3336.33M.38F" },
        "3.4": { "length": 1945, "sku": "LLS-3336.34M.38F" },
        "3.5": { "length": 2005, "sku": "LLS-3336.35M.38F" },
        "4": { "length": 2255, "sku": "LLS-3336.4ML.38F" },
        "4.1": { "length": 2320, "sku": "LLS-3336.41M.38F" },
        "4.7": { "length": 2695, "sku": "LLS-3336.47M.38F" },
        "5": { "length": 2820, "sku": "LLS-3336.5ML.38F" },
        "6": { "length": 3380, "sku": "LLS-3336.6ML.38F" },
      },
    }
  },
  "LLP-4251": {
    "name": "HIT",
    "code": "LLP-4251",
    "installType": "PENDENTE",
    "allowD1": true,
    "allowD2": true,
    "allowD1D2": true,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLP-4251.1IN.48F" },
        "1.4": { "length": 825, "sku": "LLP-4251.14I.48F" },
        "1.6": { "length": 950, "sku": "LLP-4251.16I.48F" },
        "1.7": { "length": 1010, "sku": "LLP-4251.17I.48F" },
        "1.8": { "length": 1075, "sku": "LLP-4251.37I.48F" },
        "2": { "length": 1135, "sku": "LLP-4251.2IN.48F" },
        "2.1": { "length": 1200, "sku": "LLP-4251.21I.48F" },
        "2.2": { "length": 1260, "sku": "LLP-4251.22I.48F" },
        "2.3": { "length": 1325, "sku": "LLP-4251.23I.18F" },
        "2.4": { "length": 1385, "sku": "LLP-4251.24I.48F" },
        "2.5": { "length": 1450, "sku": "LLP-4251.25I.48F" },
        "2.6": { "length": 1510, "sku": "LLP-4251.26I.48F" },
        "2.8": { "length": 1635, "sku": "LLP-4251.28I.48F" },
        "3": { "length": 1700, "sku": "LLP-4251.3IN.48F" },
        "3.2": { "length": 1825, "sku": "LLP-4251.32I.48F" },
        "3.4": { "length": 1950, "sku": "LLP-4251.34I.48F" },
        "3.8": { "length": 2200, "sku": "LLP-4251.38I.48F" },
        "4": { "length": 2260, "sku": "LLP-4251.4IN.48F" },
        "4.1": { "length": 2325, "sku": "LLP-4251.41I.48F" },
        "4.2": { "length": 2385, "sku": "LLP-4251.42I.48F" },
        "4.4": { "length": 2510, "sku": "LLP-4251.44I.48F" },
        "5": { "length": 2825, "sku": "LLP-4251.5IN.48F" },
        "5.2": { "length": 2950, "sku": "LLP-4251.52I.48F" },
        "5.3": { "length": 3010, "sku": "LLP-4251.53I.48F" },
        "5.4": { "length": 3075, "sku": "LLP-4251.54I.48F" },
        "6": { "length": 3385, "sku": "LLP-4251.6IN.48F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLP-4251.1IF.48F" },
        "2": { "length": 1135, "sku": "LLP-4251.2IF.48F" },
        "2.7": { "length": 1575, "sku": "LLP-4251.27F.48F" },
        "2.8": { "length": 1635, "sku": "LLP-4251.27F.48F" },
        "3": { "length": 1700, "sku": "LLP-4251.3IF.48F" },
        "3.1": { "length": 1760, "sku": "LLP-4251.31F.48F" },
        "3.3": { "length": 1885, "sku": "LLP-4251.33F.48F" },
        "3.5": { "length": 2010, "sku": "LLP-4251.35F.48F" },
        "3.6": { "length": 2075, "sku": "LLP-4251.36F.48F" },
        "3.7": { "length": 2135, "sku": "LLP-4251.37F.48F" },
        "3.8": { "length": 2200, "sku": "LLP-4251.38F.48F" },
        "4": { "length": 2260, "sku": "LLP-4251.4IF.48F" },
        "4.2": { "length": 2385, "sku": "LLP-4251.42F.48F" },
        "4.4": { "length": 2510, "sku": "LLP-4251.44F.48F" },
        "4.6": { "length": 2635, "sku": "LLP-4251.46F.48F" },
        "4.8": { "length": 2760, "sku": "LLP-4251.48F.48F" },
        "5": { "length": 2825, "sku": "LLP-4251.5IF.48F" },
        "5.1": { "length": 2885, "sku": "LLP-4251.51F.48F" },
        "5.2": { "length": 2950, "sku": "LLP-4251.52F.48F" },
        "6": { "length": 3385, "sku": "LLP-4251.6IF.48F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLP-4251.1ML.48F" },
        "1.1": { "length": 630, "sku": "LLP-4251.11M.48F" },
        "2": { "length": 1130, "sku": "LLP-4251.2ML.48F" },
        "3": { "length": 1695, "sku": "LLP-4251.3ML.48F" },
        "3.4": { "length": 1945, "sku": "LLP-4251.34F.48F" },
        "4": { "length": 2255, "sku": "LLP-4251.4ML.48F" },
        "4.6": { "length": 2630, "sku": "LLP-4251.46M.48F" },
        "5": { "length": 2820, "sku": "LLP-4251.5ML.48F" },
        "6": { "length": 3380, "sku": "LLP-4251.6ML.48F" },
      },
    }
  },
  "LLA-3395": {
    "name": "HIT",
    "code": "LLA-3395",
    "installType": "ARANDELA",
    "allowD1": true,
    "allowD2": true,
    "allowD1D2": true,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLA-3395.1IN.58F" },
        "1.3": { "length": 760, "sku": "LLA-3395.13I.58F" },
        "1.5": { "length": 885, "sku": "LLA-3395.15I.58F" },
        "2": { "length": 1135, "sku": "LLA-3395.2IN.58F" },
        "2.6": { "length": 1510, "sku": "LLA-3395.26I.58F" },
        "3": { "length": 1700, "sku": "LLA-3395.3IN.58F" },
        "3.2": { "length": 1825, "sku": "LLA-3395.32I.58F" },
        "3.4": { "length": 1950, "sku": "LLA-3395.34I.58F" },
        "3.5": { "length": 2010, "sku": "LLA-3395.35I.58F" },
        "4": { "length": 2260, "sku": "LLA-3395.4IN.58F" },
        "4.4": { "length": 2510, "sku": "LLA-3395.44I.58F" },
        "5": { "length": 2825, "sku": "LLA-3395.5IN.58F" },
        "5.6": { "length": 3200, "sku": "LLA-3395.56I.58F" },
        "5.8": { "length": 3325, "sku": "LLA-3395.58I.58F" },
        "6": { "length": 3385, "sku": "LLA-3395.6IN.58F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLA-3395.1IF.58F" },
        "2": { "length": 1135, "sku": "LLA-3395.2IF.58F" },
        "3": { "length": 1700, "sku": "LLA-3395.3IF.58F" },
        "3.3": { "length": 1885, "sku": "LLA-3395.33F.58F" },
        "3.4": { "length": 1950, "sku": "LLA-3395.34F.58F" },
        "3.5": { "length": 2010, "sku": "LLA-3395.35F.58F" },
        "4": { "length": 2260, "sku": "LLA-3395.4IF.58F" },
        "4.1": { "length": 2325, "sku": "LLA-3395.41F.58F" },
        "4.4": { "length": 2510, "sku": "LLA-3395.44F.58F" },
        "5": { "length": 2825, "sku": "LLA-3395.5IF.58F" },
        "5.6": { "length": 3200, "sku": "LLA-3395.56F.58F" },
        "5.7": { "length": 3260, "sku": "LLA-3395.57F.58F" },
        "6": { "length": 3385, "sku": "LLA-3395.6IF.58F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLA-3395.1ML.58F" },
        "2": { "length": 1130, "sku": "LLA-3395.2ML.58F" },
        "3": { "length": 1695, "sku": "LLA-3395.3ML.58F" },
        "4": { "length": 2255, "sku": "LLA-3395.4ML.58F" },
        "4.1": { "length": 2320, "sku": "LLA-3395.41M.58F" },
        "4.3": { "length": 2445, "sku": "LLA-3395.43M.58F" },
        "5": { "length": 2820, "sku": "LLA-3395.5ML.58F" },
        "5.6": { "length": 3195, "sku": "LLA-3395.56M.58F" },
        "6": { "length": 3380, "sku": "LLA-3395.6ML.58F" },
      },
    }
  },
  "LLP-4450": {
    "name": "EASY H PLUS",
    "code": "LLP-4450",
    "installType": "PENDENTE",
    "allowD1": true,
    "allowD2": true,
    "allowD1D2": true,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLP-4450.1IN.48F" },
        "1.7": { "length": 1010, "sku": "LLP-4450.17I.48F" },
        "2": { "length": 1135, "sku": "LLP-4450.2IN.48F" },
        "2.1": { "length": 1200, "sku": "LLP-4450.21I.48F" },
        "2.2": { "length": 1260, "sku": "LLP-4450.22I.48F" },
        "2.4": { "length": 1385, "sku": "LLP-4450.24I.48F" },
        "2.5": { "length": 1450, "sku": "LLP-4450.25I.48F" },
        "2.7": { "length": 1575, "sku": "LLP-4450.27I.48F" },
        "2.8": { "length": 1635, "sku": "LLP-4450.28I.48F" },
        "3": { "length": 1700, "sku": "LLP-4450.3IN.48F" },
        "3.1": { "length": 1760, "sku": "LLP-4450.31I.48F" },
        "3.4": { "length": 1950, "sku": "LLP-4450.34I.48F" },
        "3.5": { "length": 2010, "sku": "LLP-4450.35I.48F" },
        "3.6": { "length": 2075, "sku": "LLP-4450.36I.48F" },
        "3.8": { "length": 2200, "sku": "LLP-4450.38I.48F" },
        "4": { "length": 2260, "sku": "LLP-4450.4IN.48F" },
        "4.2": { "length": 2385, "sku": "LLP-4450.42I.48F" },
        "4.3": { "length": 2450, "sku": "LLP-4450.43I.48F" },
        "4.4": { "length": 2510, "sku": "LLP-4450.44I.48F" },
        "4.7": { "length": 2700, "sku": "LLP-4450.47I.48F" },
        "4.8": { "length": 2760, "sku": "LLP-4450.48I.48F" },
        "5": { "length": 2825, "sku": "LLP-4450.5IN.48F" },
        "5.3": { "length": 3010, "sku": "LLP-4450.53I.48F" },
        "5.4": { "length": 3075, "sku": "LLP-4450.54I.48F" },
        "5.5": { "length": 3135, "sku": "LLP-4450.55I.48F" },
        "5.6": { "length": 3200, "sku": "LLP-4450.56I.48F" },
        "5.7": { "length": 3260, "sku": "LLP-4450.57I.48F" },
        "6": { "length": 3385, "sku": "LLP-4450.6IN.48F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLP-4450.1IF.48F" },
        "2": { "length": 1135, "sku": "LLP-4450.2IF.48F" },
        "3": { "length": 1700, "sku": "LLP-4450.3IF.48F" },
        "3.1": { "length": 1760, "sku": "LLP-4450.31F.48F" },
        "3.4": { "length": 1950, "sku": "LLP-4450.34F.48F" },
        "3.5": { "length": 2010, "sku": "LLP-4450.35F.48F" },
        "3.6": { "length": 2075, "sku": "LLP-4450.36F.48F" },
        "3.8": { "length": 2200, "sku": "LLP-4450.38F.48F" },
        "4": { "length": 2260, "sku": "LLP-4450.4IF.48F" },
        "4.1": { "length": 2325, "sku": "LLP-4450.41F.48F" },
        "4.2": { "length": 2385, "sku": "LLP-4450.42F.48F" },
        "4.4": { "length": 2510, "sku": "LLP-4450.44F.48F" },
        "4.5": { "length": 2575, "sku": "LLP-4450.45F.48F" },
        "4.6": { "length": 2635, "sku": "LLP-4450.46F.48F" },
        "4.8": { "length": 2760, "sku": "LLP-4450.48F.48F" },
        "5": { "length": 2825, "sku": "LLP-4450.5IF.48F" },
        "5.2": { "length": 2950, "sku": "LLP-4450.52F.48F" },
        "5.3": { "length": 3010, "sku": "LLP-4450.53F.48F" },
        "5.5": { "length": 3135, "sku": "LLP-4450.55F.48F" },
        "6": { "length": 3385, "sku": "LLP-4450.6IF.48F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLP-4450.1ML.48F" },
        "2": { "length": 1130, "sku": "LLP-4450.2ML.48F" },
        "3": { "length": 1695, "sku": "LLP-4450.3ML.48F" },
        "4": { "length": 2255, "sku": "LLP-4450.4ML.48F" },
        "4.1": { "length": 2320, "sku": "LLP-4450.41M.48F" },
        "4.2": { "length": 2380, "sku": "LLP-4450.42M.48F" },
        "4.3": { "length": 2445, "sku": "LLP-4450.43M.48F" },
        "4.4": { "length": 2505, "sku": "LLP-4450.44M.48F" },
        "5": { "length": 2820, "sku": "LLP-4450.5ML.48F" },
        "5.3": { "length": 3005, "sku": "LLP-4450.53M.48F" },
        "5.4": { "length": 3070, "sku": "LLP-4450.54M.48F" },
        "5.6": { "length": 3195, "sku": "LLP-4450.56M.48F" },
        "6": { "length": 3380, "sku": "LLP-4450.6ML.48F" },
      },
    }
  },
  "LLA-4450": {
    "name": "EASY H PLUS",
    "code": "LLA-4450",
    "installType": "ARANDELA",
    "allowD1": true,
    "allowD2": true,
    "allowD1D2": true,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLA-4450.1IN.58F" },
        "2": { "length": 1135, "sku": "LLA-4450.2IN.58F" },
        "2.6": { "length": 1510, "sku": "LLA-4450.26I.58F" },
        "3": { "length": 1700, "sku": "LLA-4450.3IN.58F" },
        "3.6": { "length": 2075, "sku": "LLA-4450.20I.58F" },
        "4": { "length": 2260, "sku": "LLA-4450.4IN.58F" },
        "5": { "length": 2825, "sku": "LLA-4450.5IN.58F" },
        "5.5": { "length": 3135, "sku": "LLA-4450.55I.58F" },
        "6": { "length": 3385, "sku": "LLA-4450.6IN.58F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLA-4450.1IF.58F" },
        "2": { "length": 1135, "sku": "LLA-4450.2IF.58F" },
        "3": { "length": 1700, "sku": "LLA-4450.3IF.58F" },
        "4": { "length": 2260, "sku": "LLA-4450.4IF.58F" },
        "4.1": { "length": 2325, "sku": "LLA-4450.41F.58F" },
        "5": { "length": 2825, "sku": "LLA-4450.5IF.58F" },
        "6": { "length": 3385, "sku": "LLA-4450.6IF.58F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLA-4450.1ML.58F" },
        "2": { "length": 1130, "sku": "LLA-4450.2ML.58F" },
        "3": { "length": 1695, "sku": "LLA-4450.3ML.58F" },
        "4": { "length": 2255, "sku": "LLA-4450.4ML.58F" },
        "5": { "length": 2820, "sku": "LLA-4450.5ML.58F" },
        "6": { "length": 3380, "sku": "LLA-4450.6ML.58F" },
      },
    }
  },
  "LLP-4451": {
    "name": "SHARP",
    "code": "LLP-4451",
    "installType": "PENDENTE",
    "allowD1": true,
    "allowD2": true,
    "allowD1D2": true,
    "hasDiffuser": true,
    "modules": {
      "IN": {
        "1": { "length": 577, "sku": "LLP-4451.1IN.47F" },
        "2": { "length": 1140, "sku": "LLP-4451.2IN.47F" },
        "2.1": { "length": 1202, "sku": "LLP-4451.21I.47F" },
        "2.6": { "length": 1515, "sku": "LLP-4451.26I.47F" },
        "3": { "length": 1702, "sku": "LLP-4451.3IN.47F" },
        "3.4": { "length": 1952, "sku": "LLP-4451-34I.47F" },
        "4": { "length": 2265, "sku": "LLP-4451.4IN.47F" },
        "4.3": { "length": 2452, "sku": "LLP-4451.43I.47F" },
        "5": { "length": 2827, "sku": "LLP-4451.5IN.47F" },
        "5.2": { "length": 2952, "sku": "LLP-4451.52I.47F" },
        "6": { "length": 3390, "sku": "LLP-4451.6IN.47F" },
      },
      "IF": {
        "1": { "length": 577, "sku": "LLP-4451.1IF.47F" },
        "2": { "length": 1140, "sku": "LLP-4451.2IF.47F" },
        "3": { "length": 1702, "sku": "LLP-4451.3IF.47F" },
        "4": { "length": 2265, "sku": "LLP-4451.4IF.47F" },
        "5": { "length": 2827, "sku": "LLP-4451.5IF.47F" },
        "5.2": { "length": 2952, "sku": "LLP-4451.52F.47F" },
        "6": { "length": 3390, "sku": "LLP-4451.6IF.47F" },
      },
      "ML": {
        "1": { "length": 577, "sku": "LLP-4451.1ML.47F" },
        "2": { "length": 1140, "sku": "LLP-4451.2ML.47F" },
        "3": { "length": 1702, "sku": "LLP-4451.3ML.47F" },
        "4": { "length": 2265, "sku": "LLP-4451.4ML.47F" },
        "5": { "length": 2827, "sku": "LLP-4451.5ML.47F" },
        "6": { "length": 3390, "sku": "LLP-4451.6ML.47F" },
      },
    }
  },
  "LLA-4451": {
    "name": "SHARP",
    "code": "LLA-4451",
    "installType": "ARANDELA",
    "allowD1": true,
    "allowD2": true,
    "allowD1D2": true,
    "hasDiffuser": true,
    "modules": {
      "IN": {
        "1": { "length": 577, "sku": "LLA-4451.1IN.58F" },
        "1.7": { "length": 1015, "sku": "LLA-4451.17I.58F" },
        "1.8": { "length": 1077, "sku": "LLA-4451.18I.47F" },
        "2": { "length": 1140, "sku": "LLA-4451.2IN.58F" },
        "2.2": { "length": 1265, "sku": "LLA-4451.22F.58F" },
        "3.5": { "length": 2015, "sku": "LLA-4451.35I.58F" },
        "5.3": { "length": 3015, "sku": "LLA-4451.53I.58F" },
      },
      "IF": {},
      "ML": {},
    }
  },
  "LLP-4825": {
    "name": "FLOW",
    "code": "LLP-4825",
    "installType": "PENDENTE",
    "allowD1": false,
    "allowD2": true,
    "allowD1D2": false,
    "modules": {
      "IN": {
        "2.6": { "length": 1510, "sku": "LLP-4825.26I.48F" },
        "3.3": { "length": 1885, "sku": "LLP-4825.33I.48F" },
        "3.4": { "length": 1950, "sku": "LLP-4825.34I.48F" },
        "5": { "length": 2825, "sku": "LLP-4825.5IN.48F" },
        "5.3": { "length": 3010, "sku": "LLP-4825.53I.48F" },
        "5.6": { "length": 3200, "sku": "LLP-4825.320.45F" },
      },
      "IF": {},
      "ML": {},
    }
  },
  "LLP-4452": {
    "name": "SOFT",
    "code": "LLP-4452",
    "installType": "PENDENTE",
    "allowD1": true,
    "allowD2": false,
    "allowD1D2": false,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLP-4452.1IN.48F" },
        "2": { "length": 1135, "sku": "LLP-4452.2IN.48F" },
        "2.1": { "length": 1200, "sku": "LLP-4452.21I.48F" },
        "2.7": { "length": 1575, "sku": "LLP-4452.27I.48F" },
        "3": { "length": 1700, "sku": "LLP-4452.3IN.48F" },
        "3.1": { "length": 1760, "sku": "LLP-4452.31I.48F" },
        "3.4": { "length": 1950, "sku": "LLP-4452.34I.48F" },
        "4": { "length": 2260, "sku": "LLP-4452.4IN.48F" },
        "4.5": { "length": 2575, "sku": "LLP-4452.45I.48F" },
        "5": { "length": 2825, "sku": "LLP-4452.5IN.48F" },
        "5.6": { "length": 3200, "sku": "LLP-4452.56I.48F" },
        "6": { "length": 3385, "sku": "LLP-4452.6IN.48F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLP-4452.1IF.48F" },
        "2": { "length": 1135, "sku": "LLP-4452.2IF.48F" },
        "3": { "length": 1700, "sku": "LLP-4452.3IF.48F" },
        "4": { "length": 2260, "sku": "LLP-4452.4IF.48F" },
        "4.5": { "length": 2575, "sku": "LLP-4452.45F.48F" },
        "5": { "length": 2825, "sku": "LLP-4452.5IF.48F" },
        "6": { "length": 3385, "sku": "LLP-4452.6IF.48F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLP-4452.1ML.48F" },
        "2": { "length": 1130, "sku": "LLP-4452.2ML.48F" },
        "3": { "length": 1695, "sku": "LLP-4452.3ML.48F" },
        "4": { "length": 2255, "sku": "LLP-4452.4ML.48F" },
        "4.3": { "length": 2445, "sku": "LLP-4452.43M.48F" },
        "5": { "length": 2820, "sku": "LLP-4452.5ML.48F" },
        "6": { "length": 3380, "sku": "LLP-4452.6ML.48F" },
      },
    }
  },
  "LLP-3435": {
    "name": "SMART MINI",
    "code": "LLP-3435",
    "installType": "PENDENTE",
    "allowD1": true,
    "allowD2": true,
    "allowD1D2": false,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLP-3435.1IN.38F" },
        "1.5": { "length": 885, "sku": "LLP-3435.15I.38F" },
        "1.6": { "length": 950, "sku": "LLP-3435.16I.38F" },
        "1.7": { "length": 1010, "sku": "LLP-3435.17I.38F" },
        "2": { "length": 1135, "sku": "LLP-3435.2IN.38F" },
        "2.2": { "length": 1260, "sku": "LLP-3435.22I.38F" },
        "2.4": { "length": 1385, "sku": "LLP-3435.24I.38F" },
        "2.7": { "length": 1575, "sku": "LLP-3435.27I.38F" },
        "3": { "length": 1700, "sku": "LLP-3435.3IN.38F" },
        "3.4": { "length": 1950, "sku": "LLP-3435.34I.38F" },
        "3.5": { "length": 2010, "sku": "LLP-3435.35I.38F" },
        "4": { "length": 2260, "sku": "LLP-3435.4IN.38F" },
        "4.2": { "length": 2385, "sku": "LLP-3435.42I.38F" },
        "4.3": { "length": 2450, "sku": "LLP-3435.43I.38F" },
        "4.4": { "length": 2510, "sku": "LLP-3435.44I.38F" },
        "4.7": { "length": 2700, "sku": "LLP-3435.47I.38F" },
        "4.8": { "length": 2760, "sku": "LLP-3435.48I.38F" },
        "5": { "length": 2825, "sku": "LLP-3435.5IN.38F" },
        "5.3": { "length": 3010, "sku": "LLP-3435.53I.38F" },
        "6": { "length": 3385, "sku": "LLP-3435.6IN.38F" },
        "2.6": { "length": 1510, "sku": "LLP-3435.26I.39F" },
        "3.1": { "length": 1760, "sku": "LLS-3400.31I.38F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLP-3435.1IF.38F" },
        "2": { "length": 1135, "sku": "LLP-3435.2IF.38F" },
        "2.1": { "length": 1200, "sku": "LLP-3435.21F.38F" },
        "3": { "length": 1700, "sku": "LLP-3435.3IF.38F" },
        "3.1": { "length": 1760, "sku": "LLP-3435.31F.38F" },
        "3.3": { "length": 1885, "sku": "LLP-3435.33F.38F" },
        "3.4": { "length": 1950, "sku": "LLP-3435.34F.38F" },
        "3.6": { "length": 2075, "sku": "LLP-3435.36F.38F" },
        "3.7": { "length": 2135, "sku": "LLP-3435.37F.38F" },
        "3.8": { "length": 2200, "sku": "LLP-3435.38F.38F" },
        "4": { "length": 2260, "sku": "LLP-3435.4IF.38F" },
        "4.2": { "length": 2385, "sku": "LLP-3435.42F.38F" },
        "4.3": { "length": 2450, "sku": "LLP-3435.43F.38F" },
        "4.4": { "length": 2510, "sku": "LLP-3435.44F.38F" },
        "4.5": { "length": 2575, "sku": "LLP-3435.45F.38F" },
        "4.7": { "length": 2700, "sku": "LLP-3435.47F.38F" },
        "4.8": { "length": 2760, "sku": "LLP-3435.48F.38F" },
        "5": { "length": 2825, "sku": "LLP-3435.5IF.38F" },
        "5.1": { "length": 2885, "sku": "LLP-3435.51F.38F" },
        "5.2": { "length": 2950, "sku": "LLP-3435.52F.38F" },
        "5.3": { "length": 3010, "sku": "LLP-3435.53F.38F" },
        "5.4": { "length": 3075, "sku": "LLP-3435.54F.38F" },
        "5.5": { "length": 3135, "sku": "LLP-3435.55F.38F" },
        "6": { "length": 3385, "sku": "LLP-3435.6IF.38F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLP-3435.1ML.38F" },
        "2": { "length": 1130, "sku": "LLP-3435.2ML.38F" },
        "2.1": { "length": 1195, "sku": "LLP-3435.21M.38F" },
        "2.3": { "length": 1320, "sku": "LLP-3435.23M.38F" },
        "2.6": { "length": 1505, "sku": "LLP-3435.26M.38F" },
        "3": { "length": 1695, "sku": "LLP-3435.3ML.38F" },
        "3.1": { "length": 1755, "sku": "LLP-3435.31M.38F" },
        "3.2": { "length": 1820, "sku": "LLP-3435.32M.38F" },
        "3.6": { "length": 2070, "sku": "LLP-3435.36M.39F" },
        "4": { "length": 2255, "sku": "LLP-3435.4ML.38F" },
        "4.1": { "length": 2320, "sku": "LLP-3435.41M.38F" },
        "4.2": { "length": 2380, "sku": "LLP-3435.42M.38F" },
        "4.5": { "length": 2570, "sku": "LLP-3435.45M.38F" },
        "4.6": { "length": 2630, "sku": "LLP-3435.46M.38F" },
        "5": { "length": 2820, "sku": "LLP-3435.5ML.38F" },
        "5.3": { "length": 3005, "sku": "LLP-3435.53M.38F" },
        "5.5": { "length": 3130, "sku": "LLP-3435.55M.38F" },
        "6": { "length": 3380, "sku": "LLP-3435.6ML.38F" },
        "4.8": { "length": 2755, "sku": "LLP-3435.48M.39F" },
      },
    }
  },
  "LLS-3400": {
    "name": "SMART MINI",
    "code": "LLS-3400",
    "installType": "SOBREPOR",
    "allowD1": true,
    "allowD2": false,
    "allowD1D2": false,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLS--3400.1IN.38F" },
        "1.5": { "length": 885, "sku": "LLS-3400.15I.38F" },
        "2": { "length": 1135, "sku": "LLS--3400.2IN.38F" },
        "2.5": { "length": 1450, "sku": "LLS-3400.25I.38F" },
        "3": { "length": 1700, "sku": "LLS--3400.3IN.38F" },
        "3.3": { "length": 1885, "sku": "LLS-3400.33I.38F" },
        "3.4": { "length": 1950, "sku": "LLS-3400.34I.38F" },
        "4": { "length": 2260, "sku": "LLS-3400.4IN.38F" },
        "4.1": { "length": 2325, "sku": "LLS-3400.41I.38F" },
        "4.2": { "length": 2385, "sku": "LLS-3400.42I.38F" },
        "4.8": { "length": 2760, "sku": "LLS-3400.48I.38F" },
        "5": { "length": 2825, "sku": "LLS-.3400.5IN.38F" },
        "5.2": { "length": 2950, "sku": "LLS-3400.52I.38F" },
        "5.3": { "length": 3010, "sku": "LLS-3400.53I.38F" },
        "6": { "length": 3385, "sku": "LLS--3400.6IN.38F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLS--3400.1IF.38F" },
        "1.7": { "length": 1010, "sku": "LLS-3400.17F.38F" },
        "2": { "length": 1135, "sku": "LLS--3400.2IF.38F" },
        "2.5": { "length": 1450, "sku": "LLS-3400.25F.38F" },
        "3": { "length": 1700, "sku": "LLS--3400.3IF.38F" },
        "3.3": { "length": 1885, "sku": "LLS-3400.33F.38F" },
        "3.8": { "length": 2200, "sku": "LLS-3400.38F.38F" },
        "4": { "length": 2260, "sku": "LLS-3400.4IF.38F" },
        "4.3": { "length": 2450, "sku": "LLS-3400.43F.38F" },
        "4.4": { "length": 2510, "sku": "LLS-3400.44F.38F" },
        "4.6": { "length": 2635, "sku": "LLS-3200.46F.38F" },
        "5": { "length": 2825, "sku": "LLS-.3400.5IF.38F" },
        "5.3": { "length": 3010, "sku": "LLS-3400.53F.38F" },
        "6": { "length": 3385, "sku": "LLS--3400.6IF.38F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLS--3400.1ML.38F" },
        "2": { "length": 1130, "sku": "LLS--3400.2ML.38F" },
        "3": { "length": 1695, "sku": "LLS--3400.3ML.38F" },
        "4": { "length": 2255, "sku": "LLS-3400.4ML.38F" },
        "4.1": { "length": 2320, "sku": "LLS-3400.41M.38F" },
        "5": { "length": 2820, "sku": "LLS-.3400.5ML.38F" },
        "5.5": { "length": 3130, "sku": "LLS-3400.55M.38F" },
        "6": { "length": 3380, "sku": "LLS--3400.6ML.38F" },
      },
    }
  },
  "LLA-5010": {
    "name": "SMART MINI",
    "code": "LLA-5010",
    "installType": "ARANDELA",
    "allowD1": true,
    "allowD2": true,
    "allowD1D2": false,
    "modules": {
      "IN": {
        "1": { "length": 575, "sku": "LLA-5010.1IN.58F" },
        "2": { "length": 1135, "sku": "LLA-5010.2IN.58F" },
        "3": { "length": 1700, "sku": "LLA-5010.3IN.58F" },
        "4": { "length": 2260, "sku": "LLA-5010.4IN.58F" },
        "5": { "length": 2825, "sku": "LLA-5010.5IN.58F" },
        "6": { "length": 3385, "sku": "LLA-5010.6IN.58F" },
      },
      "IF": {
        "1": { "length": 575, "sku": "LLA-5010.1IF.58F" },
        "2": { "length": 1135, "sku": "LLA-5010.2IF.58F" },
        "3": { "length": 1700, "sku": "LLA-5010.3IF.58F" },
        "4": { "length": 2260, "sku": "LLA-5010.4IF.58F" },
        "5": { "length": 2825, "sku": "LLA-5010.5IF.58F" },
        "6": { "length": 3385, "sku": "LLA-5010.6IF.58F" },
      },
      "ML": {
        "1": { "length": 570, "sku": "LLA-5010.1ML.58F" },
        "2": { "length": 1130, "sku": "LLA-5010.2ML.58F" },
        "3": { "length": 1695, "sku": "LLA-5010.3ML.58F" },
        "4": { "length": 2255, "sku": "LLA-5010.4ML.58F" },
        "5": { "length": 2820, "sku": "LLA-5010.5ML.58F" },
        "6": { "length": 3380, "sku": "LLA-5010.6ML.58F" },
      },
    }
  },
};

/**
 * Retorna todas as variantes de um perfil pelo nome.
 */
export function getVariantsByProfileName(name: string): ProfileVariant[] {
  return Object.values(LED_CATALOG).filter(v => v.name === name);
}

/**
 * Retorna todos os nomes de perfis únicos disponíveis.
 */
export function getProfileNames(): string[] {
  const names = new Set(Object.values(LED_CATALOG).map(v => v.name));
  return Array.from(names);
}

/**
 * Retorna os tipos de instalação disponíveis para um perfil.
 */
export function getInstallTypesForProfile(profileName: string): InstallType[] {
  const variants = getVariantsByProfileName(profileName);
  const types = new Set(variants.map(v => v.installType));
  return Array.from(types);
}

/**
 * Retorna a variante específica dado nome do perfil e tipo de instalação.
 */
export function getVariant(profileName: string, installType: InstallType): ProfileVariant | undefined {
  return Object.values(LED_CATALOG).find(v => v.name === profileName && v.installType === installType);
}

// ── Catálogo ativo (pode ser sobrescrito pelo catálogo dinâmico da API) ────────
// O ledEngine.ts usa ACTIVE_CATALOG em vez de LED_CATALOG diretamente,
// permitindo que o catálogo dinâmico da API seja injetado sem alterar o estático.
let _activeCatalog: Record<string, ProfileVariant> = LED_CATALOG;

/**
 * Retorna o catálogo ativo (estático ou dinâmico, se injetado via setActiveCatalog).
 */
export function getActiveCatalog(): Record<string, ProfileVariant> {
  return _activeCatalog;
}

/**
 * Injeta um catálogo dinâmico (ex: vindo da API Alfalux) como catálogo ativo.
 * O motor de cálculo usará este catálogo para todos os cálculos subsequentes.
 * Deve ser chamado assim que os dados da API estiverem disponíveis.
 *
 * @param catalog - Catálogo dinâmico retornado por adaptProfileProducts()
 */
export function setActiveCatalog(catalog: Record<string, ProfileVariant>): void {
  _activeCatalog = catalog;
}

/**
 * Restaura o catálogo ativo para o catálogo estático padrão.
 */
export function resetActiveCatalog(): void {
  _activeCatalog = LED_CATALOG;
}
