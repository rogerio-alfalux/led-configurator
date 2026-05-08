/**
 * Mapeamento de fotos dos perfis de LED e Downlights.
 * URLs públicas permanentes via CDN (files.manuscdn.com).
 *
 * Para adicionar uma nova foto:
 * 1. Faça upload com: manus-upload-file caminho/da/imagem.png  (SEM --webdev)
 * 2. Adicione a entrada abaixo com a URL retornada.
 */

// ─── Perfis: mapeamento simples por código ────────────────────────────────────
const PROFILE_PHOTOS_SIMPLE: Record<string, string> = {
  // BLAZE
  "LLE-2810": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/vmGSTNLHjVCoVILp.png", // BLAZE Embutir
  "LLS-3945": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/bIRMniTCBfhRaGac.png", // BLAZE Sobrepor
  "LLA-5945": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/LJnUryUdBKQEmGLC.png", // BLAZE Arandela
  "LLP-6060": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/pdTGCQYrZGJilKKe.png", // BLAZE H Pendente
  // MINI BLAZE
  "LLP-3336": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/lihiQeClDNRvoGxC.png", // MINI BLAZE Pendente
  "LLS-3336": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/DSqdioYWejvYDEeD.png", // MINI BLAZE Sobrepor
  // HIT
  "LLP-4251": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/DcUAlMSZOeuYoyEP.png", // HIT Pendente
  "LLA-3395": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/wCZvbpprpyHYWvxc.png", // HIT Arandela
  // EASY H PLUS
  "LLP-4450": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/TtwikAuQTlPNptHP.png", // EASY H PLUS Pendente
  // EASY PRIME
  "LLE-2580": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/kqvDoVsaaZDHYCwT.png", // EASY PRIME Embutir
  // SKYLINE
  "LLE-2052": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/TVPsMQrEflnFoCgH.png", // SKYLINE Embutir
  "LLP-4536": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/jwQfZJCnOHMYPobB.png", // SKYLINE Pendente
};

// ─── SHARP: mapeamento por código + difusor D1 + difusor D2 ──────────────────
// Chave: "CÓDIGO|D1|D2"  (D2 vazio para aplicação simples)
const SHARP_PHOTOS: Record<string, string> = {
  // SHARP ARANDELA (LLA-4451) — D1 simples
  "LLA-4451|DA|":  "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/uXWUvgNAVmhugXlN.png", // SHARPADA1
  "LLA-4451|DB|":  "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/nfTTqmpSXPpAPvtM.png", // SHARPADB1
  "LLA-4451|DC|":  "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/ZtOaAkdKcKfVyBlz.png", // SHARPADC1
  // SHARP ARANDELA — D2 simples
  "LLA-4451||DA":  "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/YNsSutJnWbFKnJij.png", // SHARPADA2
  "LLA-4451||DB":  "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/YNsSutJnWbFKnJij.png", // SHARPADA2 (fallback)
  "LLA-4451||DC":  "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/kyJXDDhOyFozxDAX.png", // SHARPADC2DB1
  // SHARP ARANDELA — D1+D2
  "LLA-4451|DA|DA": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/XMqBMWzdOlGvhWmk.png", // SHARPADA1+DA2
  "LLA-4451|DA|DB": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/vLTrArXVuyJgdlKd.png", // SHARPADA1+DB2
  "LLA-4451|DA|DC": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/XMqBMWzdOlGvhWmk.png", // SHARPADA1+DA2 (fallback)
  "LLA-4451|DB|DA": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/BKmcVTVxbyEUIgiZ.png", // SHARPADB1+DA2
  "LLA-4451|DB|DB": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/sbyQUzISEpzjExSQ.png", // SHARPADB1+DB2
  "LLA-4451|DB|DC": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/BKmcVTVxbyEUIgiZ.png", // SHARPADB1+DA2 (fallback)
  "LLA-4451|DC|DA": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/kyJXDDhOyFozxDAX.png", // SHARPADC2DB1
  "LLA-4451|DC|DB": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/AiIaYVLnzEocudzC.png", // SHARPADC1DC2
  "LLA-4451|DC|DC": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/AiIaYVLnzEocudzC.png", // SHARPADC1DC2
  // SHARP PENDENTE (LLP-4451) — D1 simples
  "LLP-4451|DA|":  "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/mfDtKryMIKArMYTK.png", // SHARPPDA1
  "LLP-4451|DB|":  "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/MhKVbBwOTJWOdSGY.png", // SHARPPDB1
  "LLP-4451|DC|":  "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/wxGnzTxpUbbklchT.png", // SHARPPDC1
  // SHARP PENDENTE — D2 simples
  "LLP-4451||DA":  "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/qpFkpEUKoXovCeWC.png", // SHARPPDA2
  "LLP-4451||DB":  "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/xDRcqBCELxePbzbV.png", // SHARPPDB2
  "LLP-4451||DC":  "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/nrdxumeouhfCUNeE.png", // SHARPPDC2DB1
  // SHARP PENDENTE — D1+D2
  "LLP-4451|DA|DA": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/TINSeKcqdADwVHPi.png", // SHARPPDA1+DA2
  "LLP-4451|DA|DB": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/RQJiahzdXjVGLQFz.png", // SHARPPDA1+DB2
  "LLP-4451|DA|DC": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/TINSeKcqdADwVHPi.png", // SHARPPDA1+DA2 (fallback)
  "LLP-4451|DB|DA": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/RbPEZWhQifMxCLQa.png", // SHARPPDB1+DA2
  "LLP-4451|DB|DB": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/RVseQCPYwNcmPBFt.png", // SHARPPDB1+DB2
  "LLP-4451|DB|DC": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/RbPEZWhQifMxCLQa.png", // SHARPPDB1+DA2 (fallback)
  "LLP-4451|DC|DA": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/nrdxumeouhfCUNeE.png", // SHARPPDC2DB1
  "LLP-4451|DC|DB": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/zoziTfTcLxPSkZQh.png", // SHARPPDC1DC2
  "LLP-4451|DC|DC": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/zoziTfTcLxPSkZQh.png", // SHARPPDC1DC2
};

// ─── Downlights: mapeamento por família e por produto ────────────────────────
// Chave: "FAMÍLIA|PRODUTO" — produto é o nome exato do produto no catálogo
export const DOWNLIGHT_PRODUCT_PHOTOS: Record<string, string> = {
  // EASY LED POINT
  "EASY LED POINT|EASY LED POINT 1X1": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/JGVmddYRFwcgIByN.png",
  "EASY LED POINT|EASY LED POINT 1X3": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/LioBSEgyHECreJNX.png",
  "EASY LED POINT|EASY LED POINT 1X6": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/bTaGnQXMomGWsIWJ.png",
  "EASY LED POINT|EASY LED POINT 2X6": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/xKlDzZjlgQpUFzDB.png",
  "EASY LED POINT|EASY LED POINT 3X3": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/PjeRDIrLePZkOGFH.png",
  "EASY LED POINT|EASY LED POINT 3X6": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/szTcSyDGixJKfWgG.png",
  "EASY LED POINT|EASY LED POINT 4X6": "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542/CbixYsjnPtcNiBMP.png",
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
