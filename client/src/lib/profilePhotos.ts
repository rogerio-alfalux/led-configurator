/**
 * Mapeamento de fotos dos perfis de LED.
 * Chave: código do perfil (ex: "LLE-2810")
 * Valor: URL da imagem no storage do projeto
 *
 * Para adicionar uma nova foto:
 * 1. Faça upload com: manus-upload-file --webdev caminho/da/imagem.png
 * 2. Adicione a entrada abaixo com o Storage Path retornado.
 */
export const PROFILE_PHOTOS: Record<string, string> = {
  "LLE-2810": "/manus-storage/BLAZEE_58697a4b.png", // BLAZE de embutir
  // "LLP-4251": "/manus-storage/...",  // exemplo para próximos perfis
};

/**
 * Retorna a URL da foto do perfil, ou null se não houver foto cadastrada.
 */
export function getProfilePhoto(profileCode: string): string | null {
  return PROFILE_PHOTOS[profileCode] ?? null;
}
