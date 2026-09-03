import type { CartItemData } from "./cartTypes";

export type CatalogPhotoCandidate = {
  sku?: string | null;
  name?: string | null;
  fotoUrl?: string | null;
};

type PhotoResolvableItem = {
  sku?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  specialPhotoUrl?: string | null;
};

function normalizePhotoIdentity(value: string | null | undefined): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[º°]/g, " GRAUS ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalPhotoUrl(url: string): string {
  return url.split("?")[0] ?? url;
}

/**
 * A foto manual do Item Especial é a fonte prioritária e permanece no JSON do
 * carrinho/orçamento. O fallback mantém compatibilidade com itens já salvos.
 */
export function getPersistedItemPhotoUrl(
  item: Pick<CartItemData, "photoUrl" | "specialPhotoUrl">,
): string | undefined {
  return item.specialPhotoUrl?.trim() || item.photoUrl?.trim() || undefined;
}

/**
 * Índice de fotos frescas somente para SKUs sem ambiguidade no catálogo. Um SKU
 * duplicado pode representar potências ou versões distintas; nesses casos a tela
 * deve usar a correspondência de descrição ou a foto já persistida no item.
 */
export function buildUnambiguousCatalogPhotoMap(candidates: CatalogPhotoCandidate[]): Map<string, string> {
  const photosBySku = new Map<string, Map<string, string>>();
  for (const candidate of candidates) {
    const sku = candidate.sku?.trim();
    const photo = candidate.fotoUrl?.trim();
    if (!sku || !photo) continue;
    const current = photosBySku.get(sku) ?? new Map<string, string>();
    current.set(canonicalPhotoUrl(photo), photo);
    photosBySku.set(sku, current);
  }

  const result = new Map<string, string>();
  for (const [sku, photos] of Array.from(photosBySku.entries())) {
    if (photos.size === 1) result.set(sku, photos.values().next().value!);
  }
  return result;
}

/**
 * Retorna a foto certa para o item. A foto manual de Item Especial é soberana;
 * para catálogo, a API só substitui a foto gravada quando SKU e nome técnico
 * coincidem. Isso evita que a última variante com um SKU reutilizado troque a
 * imagem de outra potência/abertura do mesmo produto.
 */
export function resolveCatalogItemPhoto(
  item: PhotoResolvableItem,
  candidates: CatalogPhotoCandidate[],
): string | undefined {
  const specialPhoto = item.specialPhotoUrl?.trim();
  if (specialPhoto) return specialPhoto;

  const savedPhoto = item.photoUrl?.trim() || undefined;
  const sku = item.sku?.trim();
  if (!sku) return savedPhoto;

  const sameSku = candidates.filter(candidate => candidate.sku?.trim() === sku && candidate.fotoUrl?.trim());
  const normalizedDescription = normalizePhotoIdentity(item.description);
  const matched = sameSku.find(candidate => {
    const normalizedName = normalizePhotoIdentity(candidate.name);
    return normalizedName.length > 0 && normalizedDescription.includes(normalizedName);
  });
  if (matched?.fotoUrl?.trim()) return matched.fotoUrl.trim();

  const distinctPhotos = new Map<string, string>();
  for (const candidate of sameSku) {
    const photo = candidate.fotoUrl?.trim();
    if (photo) distinctPhotos.set(canonicalPhotoUrl(photo), photo);
  }
  if (distinctPhotos.size === 1) return distinctPhotos.values().next().value;

  return savedPhoto;
}
