/**
 * Catálogo de módulos EM L para perfis Alfalux.
 *
 * Cada entrada define o canto 1x1 disponível (e cantos maiores quando existem).
 * Apenas módulos marcados em amarelo na planilha MEDIDASPERFIL são listados aqui.
 *
 * Estrutura do SKU de canto:
 *   LLP-XXXX.1L{N}.{CCT}{VOLT}
 *   onde N = número de barras do lado mais longo do canto
 *         E = ESQUERDO (espelho), F = FRENTE (padrão)
 *
 * Dimensões do canto 1x1: ambos os lados têm o mesmo comprimento (quadrado).
 * Cantos 1xN: um lado tem N barras, o outro tem 1 barra.
 *
 * ─── MEDIDA DE CABECEIRA (embutir) ──────────────────────────────────────────
 * Para perfis de embutir (LLE-*), o módulo EM L funciona como um módulo ML:
 * quando conectado a módulos retos (IF/ML), a cabeceira já está incluída no IF.
 * Quando o canto EM L é instalado SOZINHO (sem módulos retos em nenhum lado),
 * é necessário somar 2× cabeceira ao comprimento de cada lado.
 *
 * Cabeceiras por perfil embutir (planilha MEDIDASPERFIL):
 *   LLE-2580 (EASY PRIME):  7mm
 *   LLE-2052 (SKYLINE):     7mm
 *   LLE-2810 (BLAZE):      10mm
 *
 * Perfis não-embutir (pendente, sobrepor, arandela) não têm cabeceira.
 */

export type LCornerModule = {
  /** SKU do módulo de canto */
  sku: string;
  /** Número de barras no lado longo (N em 1xN) */
  barsLong: number;
  /** Número de barras no lado curto (sempre 1 para 1xN) */
  barsShort: number;
  /** Comprimento do lado longo em mm */
  lengthLong: number;
  /** Comprimento do lado curto em mm */
  lengthShort: number;
  /** Orientação: F = frente/direito, E = espelho/esquerdo */
  orientation: "F" | "E";
  /** Tensão de alimentação */
  voltage: "220V" | "Bivolt";
};

export type LProfileConfig = {
  /** ProfileCode do perfil reto correspondente */
  profileCode: string;
  /** Comprimento de uma barra em mm (usado para calcular lados retos) */
  barLength: number;
  /** Módulos de canto disponíveis */
  corners: LCornerModule[];
  /**
   * Medida de cabeceira em mm (apenas para perfis embutir LLE-*).
   * Quando o canto EM L é instalado SOZINHO (sem módulos retos em nenhum lado),
   * soma-se 2× cabeceira ao comprimento de cada lado.
   * Quando há módulos retos (IF/ML) em qualquer lado, a cabeceira já está
   * incluída no IF e não deve ser somada novamente.
   * Perfis não-embutir: undefined (sem cabeceira).
   */
  cabeceiraMm?: number;
};

/**
 * Mapeamento de profileCode → configuração EM L.
 * Apenas perfis com módulos EM L disponíveis na planilha.
 *
 * Nota: o barLength é o comprimento de 1 barra do perfil reto correspondente.
 * Para calcular lados retos entre cantos, usamos os módulos IF/ML do ledCatalog.
 */
export const L_CATALOG: Record<string, LProfileConfig> = {
  // ─── EASY PRIME (LLE-2580) ───────────────────────────────────────────────
  // Cabeceira: 7mm (planilha MEDIDASPERFIL, aba EASY PRIME, linha 54)
  "LLE-2580": {
    profileCode: "LLE-2580",
    barLength: 560, // 1 barra EASY PRIME ≈ 560mm (589mm com emenda)
    cabeceiraMm: 7,
    corners: [
      {
        sku: "LLE-2580.1L1.18F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 595,
        lengthShort: 595,
        orientation: "F",
        voltage: "220V",
      },
    ],
  },

  // ─── SKYLINE (LLP-4536) ──────────────────────────────────────────────────
  // Pendente: sem cabeceira
  "LLP-4536": {
    profileCode: "LLP-4536",
    barLength: 560,
    corners: [
      {
        sku: "LLP-4536.1L1.48F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 590,
        lengthShort: 590,
        orientation: "F",
        voltage: "220V",
      },
    ],
  },

  // ─── SKYLINE EMBUTIR (LLE-2052) ──────────────────────────────────────────
  // Cabeceira: 7mm (planilha MEDIDASPERFIL, aba SKYLINE, linha 54, coluna 16)
  "LLE-2052": {
    profileCode: "LLE-2052",
    barLength: 560,
    cabeceiraMm: 7,
    corners: [
      {
        sku: "LLE-2052.1L1.18F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 590,
        lengthShort: 590,
        orientation: "F",
        voltage: "220V",
      },
      {
        sku: "LLE-2052.1L2.18D",
        barsLong: 2,
        barsShort: 1,
        lengthLong: 1150,
        lengthShort: 590,
        orientation: "F",
        voltage: "220V",
      },
    ],
  },

  // ─── BLAZE (LLS-3945 / LLA-5945) ─────────────────────────────────────────
  // Pendente/Sobrepor/Arandela: sem cabeceira
  "LLS-3945": {
    profileCode: "LLS-3945",
    barLength: 560,
    corners: [
      {
        sku: "LLP-4945.1L1.48F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 600,
        lengthShort: 600,
        orientation: "F",
        voltage: "220V",
      },
      {
        sku: "LLP-4945.1L1.49F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 600,
        lengthShort: 600,
        orientation: "F",
        voltage: "Bivolt",
      },
      {
        sku: "LLP-4945.1L2.48E",
        barsLong: 2,
        barsShort: 1,
        lengthLong: 1170,
        lengthShort: 600,
        orientation: "E",
        voltage: "220V",
      },
      {
        sku: "LLP-4945.1L3.48E",
        barsLong: 3,
        barsShort: 1,
        lengthLong: 1730,
        lengthShort: 600,
        orientation: "E",
        voltage: "220V",
      },
      {
        sku: "LLP-4945.1L4.48E",
        barsLong: 4,
        barsShort: 1,
        lengthLong: 2290,
        lengthShort: 600,
        orientation: "E",
        voltage: "220V",
      },
    ],
  },
  "LLA-5945": {
    profileCode: "LLA-5945",
    barLength: 560,
    corners: [
      {
        sku: "LLP-4945.1L1.48F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 600,
        lengthShort: 600,
        orientation: "F",
        voltage: "220V",
      },
      {
        sku: "LLP-4945.1L1.49F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 600,
        lengthShort: 600,
        orientation: "F",
        voltage: "Bivolt",
      },
      {
        sku: "LLP-4945.1L2.48E",
        barsLong: 2,
        barsShort: 1,
        lengthLong: 1170,
        lengthShort: 600,
        orientation: "E",
        voltage: "220V",
      },
      {
        sku: "LLP-4945.1L3.48E",
        barsLong: 3,
        barsShort: 1,
        lengthLong: 1730,
        lengthShort: 600,
        orientation: "E",
        voltage: "220V",
      },
      {
        sku: "LLP-4945.1L4.48E",
        barsLong: 4,
        barsShort: 1,
        lengthLong: 2290,
        lengthShort: 600,
        orientation: "E",
        voltage: "220V",
      },
    ],
  },

  // ─── BLAZE EMBUTIR (LLE-2810) ────────────────────────────────────────────
  // Cabeceira: 10mm (planilha MEDIDASPERFIL, aba BLAZE, linha 54, coluna 26)
  "LLE-2810": {
    profileCode: "LLE-2810",
    barLength: 560,
    cabeceiraMm: 10,
    corners: [
      {
        sku: "LLE-2810.1L1.18F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 615,
        lengthShort: 615,
        orientation: "F",
        voltage: "220V",
      },
      {
        sku: "LLE-2810.1L2.18E",
        barsLong: 2,
        barsShort: 1,
        lengthLong: 1175,
        lengthShort: 615,
        orientation: "E",
        voltage: "220V",
      },
      {
        sku: "LLE-2810.1L3.18E",
        barsLong: 3,
        barsShort: 1,
        lengthLong: 1735,
        lengthShort: 615,
        orientation: "E",
        voltage: "220V",
      },
      {
        sku: "LLE-2810.1L4.18E",
        barsLong: 4,
        barsShort: 1,
        lengthLong: 2300,
        lengthShort: 615,
        orientation: "E",
        voltage: "220V",
      },
    ],
  },

  // ─── BLAZE H (LLP-6060) ──────────────────────────────────────────────────
  // Pendente: sem cabeceira
  "LLP-6060": {
    profileCode: "LLP-6060",
    barLength: 560,
    corners: [
      {
        sku: "LLP-6060.1L1.48F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 600,
        lengthShort: 600,
        orientation: "F",
        voltage: "220V",
      },
    ],
  },

  // ─── MINI BLAZE (LLP-3336 / LLS-3336) ───────────────────────────────────
  // Pendente/Sobrepor: sem cabeceira
  "LLP-3336": {
    profileCode: "LLP-3336",
    barLength: 555,
    corners: [
      {
        sku: "LLP-3336.1L1.48F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 590,
        lengthShort: 590,
        orientation: "F",
        voltage: "220V",
      },
    ],
  },
  "LLS-3336": {
    profileCode: "LLS-3336",
    barLength: 555,
    corners: [
      {
        sku: "LLP-3336.1L1.48F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 590,
        lengthShort: 590,
        orientation: "F",
        voltage: "220V",
      },
    ],
  },

  // ─── HIT (LLP-4251 / LLA-3395) ───────────────────────────────────────────
  // Pendente/Arandela: sem cabeceira
  "LLP-4251": {
    profileCode: "LLP-4251",
    barLength: 555,
    corners: [
      {
        sku: "LLP-4251.1L1.48F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 590,
        lengthShort: 590,
        orientation: "F",
        voltage: "220V",
      },
    ],
  },
  "LLA-3395": {
    profileCode: "LLA-3395",
    barLength: 555,
    corners: [
      {
        sku: "LLP-4251.1L1.48F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 590,
        lengthShort: 590,
        orientation: "F",
        voltage: "220V",
      },
    ],
  },

  // ─── EASY H PLUS (LLP-4450 / LLA-4450) ──────────────────────────────────
  // Pendente/Arandela: sem cabeceira
  "LLP-4450": {
    profileCode: "LLP-4450",
    barLength: 560,
    corners: [
      {
        sku: "LLP-4450.1L1.48F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 610,
        lengthShort: 610,
        orientation: "F",
        voltage: "220V",
      },
    ],
  },
  "LLA-4450": {
    profileCode: "LLA-4450",
    barLength: 560,
    corners: [
      {
        sku: "LLP-4450.1L1.48F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 610,
        lengthShort: 610,
        orientation: "F",
        voltage: "220V",
      },
    ],
  },

  // ─── SMART MINI (LLP-3435 / LLS-3400) ───────────────────────────────────
  // Pendente/Sobrepor: sem cabeceira
  "LLP-3435": {
    profileCode: "LLP-3435",
    barLength: 560,
    corners: [
      {
        sku: "LLP-3435.1L1.38F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 600,
        lengthShort: 600,
        orientation: "F",
        voltage: "220V",
      },
    ],
  },
  "LLS-3400": {
    profileCode: "LLS-3400",
    barLength: 560,
    corners: [
      {
        sku: "LLP-3435.1L1.38F",
        barsLong: 1,
        barsShort: 1,
        lengthLong: 600,
        lengthShort: 600,
        orientation: "F",
        voltage: "220V",
      },
    ],
  },
};

/**
 * Retorna a configuração EM L para um profileCode, ou null se não disponível.
 */
export function getLConfig(profileCode: string): LProfileConfig | null {
  return L_CATALOG[profileCode] ?? null;
}

/**
 * Retorna o canto 1x1 padrão (menor canto disponível) para um perfil.
 */
export function getCorner1x1(profileCode: string): LCornerModule | null {
  const config = getLConfig(profileCode);
  if (!config) return null;
  return config.corners.find(c => c.barsLong === 1 && c.barsShort === 1) ?? null;
}

/**
 * Retorna a medida de cabeceira em mm para um perfil embutir, ou 0 se não aplicável.
 */
export function getCabeceiraMm(profileCode: string): number {
  return L_CATALOG[profileCode]?.cabeceiraMm ?? 0;
}

/**
 * Tipos de formato de perfil disponíveis.
 */
export type ProfileShape = "STRAIGHT" | "L_SHAPE" | "SQUARE" | "RECTANGLE" | "U_SHAPE";

/**
 * Driver calculado para uma peça da composição EM L.
 */
export type ShapePieceDriver = {
  /** Código do driver (ex: "EQ00346") */
  code?: string;
  /** Modelo do driver (ex: "PHILIPS XITANIUM 44W 350MA") */
  model: string;
  /** Quantidade de drivers por peça */
  quantity: number;
  /** Drivers adicionais para combos */
  combo?: Array<{ code: string; model: string; quantity: number }>;
  /** Corrente de programação do driver (ex: "350MA"). Exibida na ficha de produção. */
  corrente?: string | null;
};

/**
 * Resultado do cálculo de uma forma.
 */
export type ShapeResult = {
  shape: ProfileShape;
  /** Dimensões externas em mm [largura, altura] */
  dimensions: [number, number];
  /** Lista de peças necessárias */
  pieces: ShapePiece[];
  /** Descrição textual da composição */
  summary: string;
  /** Potência em W usada no cálculo (para exibição e driver) */
  power?: number;
  /** Tensão usada no cálculo */
  voltage?: string;
  /** Método de barra usado no cálculo */
  stripMethod?: "STRIPFLEX" | "STRIPLINE";
  /** CCT selecionada */
  cct?: string;
  /** Nome do perfil */
  profileName?: string;
  /** Código do perfil pai (ex: "LLP-6060") */
  profileCode?: string;
  /** Comprimento total de todos os lados em mm (para cálculo de preço por metro linear) */
  totalLengthMm?: number;
  /** Nome da barra Stripflex/Stripline com CCT (ex: "STRIPFLEX 562.5 X 10MM - 36 LEDS 830 - 3000K (LC) 25V") */
  stripflexName?: string | null;
  /** Código EQ da barra Stripflex/Stripline para a CCT selecionada (ex: "EQ00125") */
  stripflexEq?: string | null;
};

export type ShapePiece = {
  sku: string;
  quantity: number;
  description: string;
  /** Comprimento da peça em mm (para peças retas) */
  length?: number;
  /** Tipo de peça */
  type: "CORNER" | "STRAIGHT_IN" | "STRAIGHT_IF" | "STRAIGHT_ML";
  /** Número de barras desta peça (para cálculo de driver) */
  bars?: number;
  /** Driver calculado para esta peça */
  driver?: ShapePieceDriver;
};
