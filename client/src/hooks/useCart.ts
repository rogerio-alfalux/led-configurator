import { trpc } from "@/lib/trpc";
import { CartItemData, parseCartItemData } from "@/lib/cartTypes";
import { useCallback, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export interface CartEntry {
  id: number;
  data: CartItemData;
  createdAt: string;
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

  const updateItemDataMutation = trpc.cart.updateItemData.useMutation({
    // Optimistic: não invalida imediatamente para não causar re-render durante digitação
    onSuccess: () => utils.cart.list.invalidate(),
  });

  // Debounce map: itemId -> timeout ref
  const debounceMap = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const updateItemField = useCallback(
    (id: number, patch: Record<string, unknown>, debounceMs = 600) => {
      // Cancelar debounce anterior para este item
      if (debounceMap.current[id]) clearTimeout(debounceMap.current[id]);
      debounceMap.current[id] = setTimeout(() => {
        updateItemDataMutation.mutate({ id, patch });
        delete debounceMap.current[id];
      }, debounceMs);
    },
    [updateItemDataMutation]
  );

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
    updateItemField,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
