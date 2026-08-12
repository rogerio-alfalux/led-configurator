import type { CartItemData } from "./cartTypes";

/**
 * A foto manual do Item Especial é a fonte prioritária e permanece no JSON do
 * carrinho/orçamento. O fallback mantém compatibilidade com itens já salvos.
 */
export function getPersistedItemPhotoUrl(
  item: Pick<CartItemData, "photoUrl" | "specialPhotoUrl">,
): string | undefined {
  return item.specialPhotoUrl?.trim() || item.photoUrl?.trim() || undefined;
}
