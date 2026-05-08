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
  "LLE-2810": "/manus-storage/BLAZE E_901a6c4f.png",    // BLAZE Embutir
  "LLS-3945": "/manus-storage/BLAZE S_25e46271.png",    // BLAZE Sobrepor
  "LLA-5945": "/manus-storage/BLAZE A_ded7a45f.png",    // BLAZE Arandela
  "LLP-6060": "/manus-storage/BLAZE H P_468b213f.png",  // BLAZE H Pendente
  // MINI BLAZE
  "LLP-3336": "/manus-storage/MINI BLAZE P_333ec35d.png", // MINI BLAZE Pendente
  "LLS-3336": "/manus-storage/MINI BLAZE S_8e8fdfdd.png", // MINI BLAZE Sobrepor
  // HIT
  "LLP-4251": "/manus-storage/HIT P_c72518fe.png",  // HIT Pendente
  "LLA-3395": "/manus-storage/HIT A_eaba548f.png",  // HIT Arandela
  // EASY H PLUS
  "LLP-4450": "/manus-storage/EASY H PLUS P_7721c8ae.png", // EASY H PLUS Pendente
  // EASY PRIME
  "LLE-2580": "/manus-storage/EASY PRIME E_14641589.png",  // EASY PRIME Embutir
  // SKYLINE
  "LLE-2052": "/manus-storage/SKYLINE E_55ffd251.png", // SKYLINE Embutir
  "LLP-4536": "/manus-storage/SKYLINE P_fff59672.png", // SKYLINE Pendente
};

// ─── SHARP: mapeamento por código + difusor D1 + difusor D2 ──────────────────
// Chave: "CÓDIGO|D1|D2"  (D2 vazio para aplicação simples)
const SHARP_PHOTOS: Record<string, string> = {
  // SHARP ARANDELA (LLA-4451) — D1 simples
  "LLA-4451|DA|":  "/manus-storage/SHARP A DA1_4d7f6935.png",
  "LLA-4451|DB|":  "/manus-storage/SHARP A DB1_56ba8ad4.png",
  "LLA-4451|DC|":  "/manus-storage/SHARP A DC1_23d6abd1.png",
  // SHARP ARANDELA — D2 simples
  "LLA-4451||DA":  "/manus-storage/SHARP A DA2_5dd23c83.png",
  "LLA-4451||DB":  "/manus-storage/SHARP A DA2_5dd23c83.png",
  "LLA-4451||DC":  "/manus-storage/SHARP A DC2 DB1_b11b9062.png",
  // SHARP ARANDELA — D1+D2
  "LLA-4451|DA|DA": "/manus-storage/SHARP A DA1 + DA2_91ba4939.png",
  "LLA-4451|DA|DB": "/manus-storage/SHARP A DA1 + DB2_d7465943.png",
  "LLA-4451|DA|DC": "/manus-storage/SHARP A DA1 + DA2_91ba4939.png",
  "LLA-4451|DB|DA": "/manus-storage/SHARP A DB1 + DA2_2f992206.png",
  "LLA-4451|DB|DB": "/manus-storage/SHARP A DB1 + DB2_7e7dec47.png",
  "LLA-4451|DB|DC": "/manus-storage/SHARP A DB1 + DA2_2f992206.png",
  "LLA-4451|DC|DA": "/manus-storage/SHARP A DC2 DB1_b11b9062.png",
  "LLA-4451|DC|DB": "/manus-storage/SHARP A DC1 DC2_1624837d.png",
  "LLA-4451|DC|DC": "/manus-storage/SHARP A DC1 DC2_1624837d.png",
  // SHARP PENDENTE (LLP-4451) — D1 simples
  "LLP-4451|DA|":  "/manus-storage/SHARP P DA1_7f560b01.png",
  "LLP-4451|DB|":  "/manus-storage/SHARP P DB1_c22800f0.png",
  "LLP-4451|DC|":  "/manus-storage/SHARP P DC1_9bbfa61c.png",
  // SHARP PENDENTE — D2 simples
  "LLP-4451||DA":  "/manus-storage/SHARP P DA2_d2b3812c.png",
  "LLP-4451||DB":  "/manus-storage/SHARP P DB2_a70b92f2.png",
  "LLP-4451||DC":  "/manus-storage/SHARP P DC2 DB1_43e3de38.png",
  // SHARP PENDENTE — D1+D2
  "LLP-4451|DA|DA": "/manus-storage/SHARP P DA1 + DA2_a096fd5e.png",
  "LLP-4451|DA|DB": "/manus-storage/SHARP P DA1 + DB2_e74e2d95.png",
  "LLP-4451|DA|DC": "/manus-storage/SHARP P DA1 + DA2_a096fd5e.png",
  "LLP-4451|DB|DA": "/manus-storage/SHARP P DB1 + DA2_e655e7ab.png",
  "LLP-4451|DB|DB": "/manus-storage/SHARP P DB1 + DB2_72d7809b.png",
  "LLP-4451|DB|DC": "/manus-storage/SHARP P DB1 + DA2_e655e7ab.png",
  "LLP-4451|DC|DA": "/manus-storage/SHARP P DC2 DB1_43e3de38.png",
  "LLP-4451|DC|DB": "/manus-storage/SHARP P DC1 DC2_1e16ca07.png",
  "LLP-4451|DC|DC": "/manus-storage/SHARP P DC1 DC2_1e16ca07.png",
};

// ─── Downlights: mapeamento por família e por produto ────────────────────────
// Chave: "FAMÍLIA|PRODUTO" — produto é o nome exato do produto no catálogo
export const DOWNLIGHT_PRODUCT_PHOTOS: Record<string, string> = {
  "EASY LED POINT|EASY LED POINT 1X1": "/manus-storage/EASY LED POINT 1X1_6380e52e.png",
  "EASY LED POINT|EASY LED POINT 1X3": "/manus-storage/EASY LED POINT 1X3_2f5720f7.png",
  "EASY LED POINT|EASY LED POINT 1X6": "/manus-storage/EASY LED POINT 1X6_473e0a8f.png",
  "EASY LED POINT|EASY LED POINT 2X6": "/manus-storage/EASY LED POINT 2X6_92b5c277.png",
  "EASY LED POINT|EASY LED POINT 3X3": "/manus-storage/EASY LED POINT 3X3_9dff5776.png",
  "EASY LED POINT|EASY LED POINT 3X6": "/manus-storage/EASY LED POINT 3X6_b961b708.png",
  "EASY LED POINT|EASY LED POINT 4X6": "/manus-storage/EASY LED POINT 4X6_60d469e5.png",
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
