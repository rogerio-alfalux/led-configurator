/**
 * Mapeamento de fotos dos perfis de LED e Downlights.
 *
 * Para adicionar uma nova foto:
 * 1. Faça upload com: manus-upload-file --webdev caminho/da/imagem.png
 * 2. Adicione a entrada abaixo com o Storage Path retornado.
 */

// ─── Perfis: mapeamento simples por código ────────────────────────────────────
const PROFILE_PHOTOS_SIMPLE: Record<string, string> = {
  // BLAZE
  "LLE-2810": "/manus-storage/BLAZE E_caab70ef.png",   // BLAZE Embutir
  "LLS-3945": "/manus-storage/BLAZE S_c74e8ecb.png",   // BLAZE Sobrepor
  "LLA-5945": "/manus-storage/BLAZE A_a0102c11.png",   // BLAZE Arandela
  "LLP-6060": "/manus-storage/BLAZE H P_1b4d0ded.png", // BLAZE H Pendente

  // MINI BLAZE
  "LLP-3336": "/manus-storage/MINI BLAZE P_5d706601.png", // MINI BLAZE Pendente
  "LLS-3336": "/manus-storage/MINI BLAZE S_e04f5433.png", // MINI BLAZE Sobrepor

  // HIT
  "LLP-4251": "/manus-storage/HIT P_46616eea.png", // HIT Pendente
  "LLA-3395": "/manus-storage/HIT A_0c38b608.png", // HIT Arandela

  // EASY H PLUS
  "LLP-4450": "/manus-storage/EASY H PLUS P_106716f7.png", // EASY H PLUS Pendente

  // EASY PRIME
  "LLE-2580": "/manus-storage/EASY PRIME E_77236f85.png", // EASY PRIME Embutir

  // SKYLINE
  "LLE-2052": "/manus-storage/SKYLINE E_41accdd5.png", // SKYLINE Embutir
  "LLP-4536": "/manus-storage/SKYLINE P_abf1505e.png", // SKYLINE Pendente
};

// ─── SHARP: mapeamento por código + difusor D1 + difusor D2 ──────────────────
// Chave: "CÓDIGO|D1|D2"  (D2 vazio para aplicação simples)
const SHARP_PHOTOS: Record<string, string> = {
  // SHARP ARANDELA (LLA-4451) — D1 simples
  "LLA-4451|DA|":   "/manus-storage/SHARP A DA1_e7e6d2c2.png",
  "LLA-4451|DB|":   "/manus-storage/SHARP A DB1_f2e9c973.png",
  "LLA-4451|DC|":   "/manus-storage/SHARP A DC1_e29fa9c2.png",
  // SHARP ARANDELA — D2 simples
  "LLA-4451||DA":   "/manus-storage/SHARP A DA2_75c9ee6d.png",
  // SHARP ARANDELA — D1+D2
  "LLA-4451|DA|DA": "/manus-storage/SHARP A DA1 + DA2_592f0db4.png",
  "LLA-4451|DA|DB": "/manus-storage/SHARP A DA1 + DB2_fcf62874.png",
  "LLA-4451|DB|DA": "/manus-storage/SHARP A DB1 + DA2_2ed284e3.png",
  "LLA-4451|DB|DB": "/manus-storage/SHARP A DB1 + DB2_57bb8b6e.png",
  "LLA-4451|DC|DC": "/manus-storage/SHARP A DC1 DC2_ffb20e5c.png",
  "LLA-4451|DC|DB": "/manus-storage/SHARP A DC2 DB1_7196b479.png",

  // SHARP PENDENTE (LLP-4451) — D1 simples
  "LLP-4451|DA|":   "/manus-storage/SHARP P DA1_7df175f7.png",
  "LLP-4451|DB|":   "/manus-storage/SHARP P DB1_84f50269.png",
  "LLP-4451|DC|":   "/manus-storage/SHARP P DC1_cc4ca6ac.png",
  // SHARP PENDENTE — D2 simples
  "LLP-4451||DA":   "/manus-storage/SHARP P DA2_fc25f744.png",
  "LLP-4451||DB":   "/manus-storage/SHARP P DB2_fc1f5bdf.png",
  // SHARP PENDENTE — D1+D2
  "LLP-4451|DA|DA": "/manus-storage/SHARP P DA1 + DA2_e630a749.png",
  "LLP-4451|DA|DB": "/manus-storage/SHARP P DA1 + DB2_50011040.png",
  "LLP-4451|DB|DA": "/manus-storage/SHARP P DB1 + DA2_282c8fb7.png",
  "LLP-4451|DB|DB": "/manus-storage/SHARP P DB1 + DB2_d354270b.png",
  "LLP-4451|DC|DC": "/manus-storage/SHARP P DC1 DC2_74d5e9bd.png",
  "LLP-4451|DC|DB": "/manus-storage/SHARP P DC2 DB1_30a34b43.png",
};

// ─── Downlights: mapeamento por família e por produto ────────────────────────
// Chave: "FAMÍLIA|PRODUTO" — produto é o nome exato do produto no catálogo
export const DOWNLIGHT_PRODUCT_PHOTOS: Record<string, string> = {
  "EASY LED POINT|EASY LED POINT 1X1": "/manus-storage/EASY LED POINT 1X1_58586de2.png",
  "EASY LED POINT|EASY LED POINT 1X3": "/manus-storage/EASY LED POINT 1X3_43e026f2.png",
  "EASY LED POINT|EASY LED POINT 1X6": "/manus-storage/EASY LED POINT 1X6_ae26d255.png",
  "EASY LED POINT|EASY LED POINT 2X6": "/manus-storage/EASY LED POINT 2X6_553d9bdc.png",
  "EASY LED POINT|EASY LED POINT 3X3": "/manus-storage/EASY LED POINT 3X3_85df6d0a.png",
  "EASY LED POINT|EASY LED POINT 3X6": "/manus-storage/EASY LED POINT 3X6_ce45b356.png",
  "EASY LED POINT|EASY LED POINT 4X6": "/manus-storage/EASY LED POINT 4X6_edd8a2fc.png",
};

// ─── Funções públicas ─────────────────────────────────────────────────────────

/**
 * Retorna a URL da foto do perfil, ou null se não houver foto cadastrada.
 * Para o SHARP, passa também os difusores D1 e D2 para selecionar a foto correta.
 */
export function getProfilePhoto(
  profileCode: string,
  diffuserD1?: string,
  diffuserD2?: string,
): string | null {
  if (profileCode === "LLP-4451" || profileCode === "LLA-4451") {
    const key = `${profileCode}|${diffuserD1 ?? ""}|${diffuserD2 ?? ""}`;
    return SHARP_PHOTOS[key] ?? null;
  }
  return PROFILE_PHOTOS_SIMPLE[profileCode] ?? null;
}

/**
 * Retorna a URL da foto do Downlight pelo produto selecionado.
 * Tenta primeiro por família+produto, depois retorna null.
 */
export function getDownlightPhoto(
  familia: string,
  produto: string,
): string | null {
  const key = `${familia}|${produto}`;
  return DOWNLIGHT_PRODUCT_PHOTOS[key] ?? null;
}
