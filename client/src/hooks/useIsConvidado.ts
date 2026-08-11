import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Hook que retorna true se o usuário logado tem role "convidado" (LD Convidado).
 * Convidados não podem ver preços, custos, ou acessar o carrinho.
 */
export function useIsConvidado(): boolean {
  const { user } = useAuth();
  return (user as any)?.role === "convidado";
}
