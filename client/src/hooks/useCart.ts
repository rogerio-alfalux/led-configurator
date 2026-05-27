import { trpc } from "@/lib/trpc";
import { CartItemData, parseCartItemData } from "@/lib/cartTypes";
import { useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export interface CartEntry {
  id: number;
  data: CartItemData;
  createdAt: Date;
}

export function useCart() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const listQuery = trpc.cart.list.useQuery(undefined, {
    enabled: !!user,
    staleTime: 0,
  });

  const addMutation = trpc.cart.add.useMutation({
    onSuccess: () => utils.cart.list.invalidate(),
  });

  const removeMutation = trpc.cart.remove.useMutation({
    onSuccess: () => utils.cart.list.invalidate(),
  });

  const clearMutation = trpc.cart.clear.useMutation({
    onSuccess: () => utils.cart.list.invalidate(),
  });

  const entries: CartEntry[] = (listQuery.data ?? [])
    .map(item => {
      const data = parseCartItemData(item.itemData);
      if (!data) return null;
      return { id: item.id, data, createdAt: item.createdAt };
    })
    .filter((e): e is CartEntry => e !== null);

  const addItem = useCallback(
    (itemData: CartItemData) => {
      return addMutation.mutateAsync({ itemData: JSON.stringify(itemData) });
    },
    [addMutation]
  );

  const removeItem = useCallback(
    (id: number) => removeMutation.mutateAsync({ id }),
    [removeMutation]
  );

  const clearCart = useCallback(
    () => clearMutation.mutateAsync(),
    [clearMutation]
  );

  return {
    entries,
    count: entries.length,
    isLoading: listQuery.isLoading,
    addItem,
    removeItem,
    clearCart,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
