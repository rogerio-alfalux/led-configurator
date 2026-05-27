/**
 * Catálogo estático de preços por metro linear para perfis modulares.
 *
 * Fonte: Comparativolineares25.05.26Dennisfinal.xlsx
 *
 * Lógica de controle:
 *   - ON/OFF 220V = ON/OFF Bivolt = preço base da planilha
 *   - DIM DALI = DIM 1-10V = preço base + R$ 160,00/m
 *
 * Chave: profileCode (ex: "LLP-6060") → wattagem → preços
 *
 * Wattagens disponíveis: 18W, 26W, 36W
 */

const DIM_SURCHARGE = 160; // R$/m adicional para DIM DALI e DIM 1-10V

export interface ProfilePriceEntry {
  /** Preço base por metro (ON/OFF 220V e ON/OFF Bivolt) */
  onoff: number;
  /** Preço por metro para DIM DALI (onoff + 160) */
  dimDali: number;
  /** Preço por metro para DIM 1-10V (onoff + 160) */
  dim110v: number;
}

/** Mapa de preços: profileCode → wattagem → preços */
export type ProfilePriceByWatt = Record<number, ProfilePriceEntry>;
export type StaticProfilePriceMap = Record<string, ProfilePriceByWatt>;

function entry(base: number): ProfilePriceEntry {
  return {
    onoff: base,
    dimDali: base + DIM_SURCHARGE,
    dim110v: base + DIM_SURCHARGE,
  };
}

/**
 * Catálogo estático de preços.
 *
 * Mapeamento planilha → profileCodes:
 *
 * BLAZE E (embutir)          → LLE-2810
 * EASY PRIME E (embutir)     → LLE-2580
 * SKYLINE E (embutir)        → LLE-2052
 * BLAZE H P D1 (pendente)    → LLP-6060  (D1)
 * BLAZE H P D1+D2 (pendente) → LLP-6060  (D1+D2)
 * MINI BLAZE P/S             → LLP-3336, LLS-3336
 * EASY H PLUS D1             → LLP-4450, LLA-4450  (D1)
 * EASY H PLUS D1+D2          → LLP-4450, LLA-4450  (D1+D2)
 * HIT P D1                   → LLP-4251, LLA-3395  (D1)
 * HIT P D1+D2                → LLP-4251, LLA-3395  (D1+D2)
 * BLAZE S D1 (sobrepor)      → LLS-3945, LLA-5945  (D1 sobrepor)
 *
 * Perfis sem preço na planilha (SHARP, FLOW, SOFT, SMART MINI, BLAZE pendente/sobrepor genérico):
 * não incluídos — preço não exibido.
 */
export const STATIC_PROFILE_PRICES: StaticProfilePriceMap = {
  // ── BLAZE E (embutir) ────────────────────────────────────────────────────
  "LLE-2810": {
    18: entry(330),
    26: entry(340),
    36: entry(360),
  },

  // ── EASY PRIME E (embutir) ───────────────────────────────────────────────
  "LLE-2580": {
    18: entry(310),
    26: entry(320),
    36: entry(340),
  },

  // ── SKYLINE E (embutir) ──────────────────────────────────────────────────
  "LLE-2052": {
    18: entry(270),
    26: entry(280),
    36: entry(300),
  },

  // ── BLAZE H P (pendente) — D1 e D1+D2 têm preços diferentes ─────────────
  // D1 simples
  "LLP-6060-D1": {
    18: entry(410),
    26: entry(420),
    36: entry(440),
  },
  // D1+D2
  "LLP-6060-D1D2": {
    18: entry(460),
    26: entry(480),
    36: entry(520),
  },

  // ── MINI BLAZE P/S (pendente e sobrepor) ─────────────────────────────────
  "LLP-3336": {
    18: entry(310),
    26: entry(320),
    36: entry(340),
  },
  "LLS-3336": {
    18: entry(310),
    26: entry(320),
    36: entry(340),
  },

  // ── EASY H PLUS (pendente) — D1 e D1+D2 têm preços diferentes ───────────
  // D1 simples
  "LLP-4450-D1": {
    18: entry(470),
    26: entry(480),
    36: entry(500),
  },
  "LLA-4450-D1": {
    18: entry(470),
    26: entry(480),
    36: entry(500),
  },
  // D1+D2
  "LLP-4450-D1D2": {
    18: entry(600),
    26: entry(620),
    36: entry(660),
  },
  "LLA-4450-D1D2": {
    18: entry(600),
    26: entry(620),
    36: entry(660),
  },

  // ── HIT P (pendente) — D1 e D1+D2 têm preços diferentes ─────────────────
  // D1 simples
  "LLP-4251-D1": {
    18: entry(410),
    26: entry(420),
    36: entry(440),
  },
  "LLA-3395-D1": {
    18: entry(410),
    26: entry(420),
    36: entry(440),
  },
  // D1+D2
  "LLP-4251-D1D2": {
    18: entry(520),
    26: entry(550),
    36: entry(600),
  },
  "LLA-3395-D1D2": {
    18: entry(520),
    26: entry(550),
    36: entry(600),
  },

  // ── BLAZE S D1 (sobrepor) ────────────────────────────────────────────────
  "LLS-3945": {
    18: entry(370),
    26: entry(380),
    36: entry(400),
  },
  "LLA-5945": {
    18: entry(370),
    26: entry(380),
    36: entry(400),
  },

  // ── SKYLINE P (pendente) — mesmo código LLP-4536 ─────────────────────────
  // Não consta na planilha; sem preço estático.
};

/**
 * Retorna o preço por metro para um perfil/wattagem/controle/aplicação.
 *
 * @param profileCode  Código do perfil (ex: "LLP-6060")
 * @param powerW       Potência em W (18, 26 ou 36)
 * @param controlType  "onoff" | "dimDali" | "dim110v"
 * @param isDual       true quando a configuração é D1+D2
 * @returns preço por metro ou null se não cadastrado
 */
export function getStaticPricePerMeter(
  profileCode: string,
  powerW: number,
  controlType: "onoff" | "dimDali" | "dim110v",
  isDual: boolean
): number | null {
  // Normalizar wattagem para a mais próxima disponível (18/26/36)
  const normalizedW = powerW <= 18 ? 18 : powerW <= 26 ? 26 : 36;

  // Tentar chave com sufixo D1D2 ou D1 primeiro (para perfis com preços distintos)
  const suffix = isDual ? "-D1D2" : "-D1";
  const keyWithSuffix = profileCode + suffix;
  const keyPlain = profileCode;

  const byWatt =
    STATIC_PROFILE_PRICES[keyWithSuffix] ??
    STATIC_PROFILE_PRICES[keyPlain] ??
    null;

  if (!byWatt) return null;

  const priceEntry = byWatt[normalizedW] ?? null;
  if (!priceEntry) return null;

  return priceEntry[controlType];
}
