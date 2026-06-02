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
  "LLE-2580": {
    profileCode: "LLE-2580",
    barLength: 560, // 1 barra EASY PRIME ≈ 560mm (589mm com emenda)
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

  // ─── BLAZE (LLE-2052 / LLS-3945 / LLA-5945) ─────────────────────────────
  // O BLAZE tem cantos maiores disponíveis (1x1, 1x2, 1x3, 1x4)
  // SKU base: LLP-4945.1L{N}.48F (direito) / LLP-4945.1L{N}.48E (esquerdo)
  // Nota: na planilha o código é LLP-4945, mas no catálogo interno o BLAZE usa LLE-2052/LLS-3945/LLA-5945
  // Mapeamos para todos os códigos de perfil BLAZE
  "LLE-2052": {
    profileCode: "LLE-2052",
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

  // ─── BLAZE H (LLE-2810 / LLP-6060) ──────────────────────────────────────
  "LLE-2810": {
    profileCode: "LLE-2810",
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

  // ─── HIT (LLP-4251 / LLS-3395 / LLA-3395) ───────────────────────────────
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
 * Tipos de formato de perfil disponíveis.
 */
export type ProfileShape = "STRAIGHT" | "L_SHAPE" | "SQUARE" | "RECTANGLE";

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
};

export type ShapePiece = {
  sku: string;
  quantity: number;
  description: string;
  /** Comprimento da peça em mm (para peças retas) */
  length?: number;
  /** Tipo de peça */
  type: "CORNER" | "STRAIGHT_IN" | "STRAIGHT_IF" | "STRAIGHT_ML";
};
