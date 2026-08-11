import { useAuth } from "@/_core/hooks/useAuth";
import type { Permission } from "@shared/permissions";

/**
 * Hook que retorna as permissões do usuário logado e funções auxiliares.
 * Admin tem todas as permissões implicitamente.
 */
export function usePermissions() {
  const { user } = useAuth();
  const permissions: string[] = (user as any)?.permissions ?? [];
  const isAdmin = (user as any)?.role === "admin";

  function hasPermission(perm: Permission | string): boolean {
    if (isAdmin) return true;
    return permissions.includes(perm);
  }

  function hasAnyPermission(...perms: (Permission | string)[]): boolean {
    if (isAdmin) return true;
    return perms.some(p => permissions.includes(p));
  }

  return { permissions, hasPermission, hasAnyPermission, isAdmin };
}
