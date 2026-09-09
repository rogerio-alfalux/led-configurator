import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { userPermissions } from "../drizzle/schema";
import { ALL_PERMISSIONS, PERMISSIONS, type Permission } from "../shared/permissions";
import { isCostDepartmentRole } from "../shared/costDepartmentAccess";

/** Administradores têm acesso a todas as funções administrativas, inclusive amostras. */
export function roleGrantsAllPermissions(role?: string | null): boolean {
  return role === "admin";
}

/** Permissões mínimas inerentes a cargos não administrativos. */
export function getRoleDefaultPermissions(role?: string | null): Permission[] {
  if (isCostDepartmentRole(role)) return [PERMISSIONS.VER_CUSTOS];
  return [];
}

/** Retorna todas as permissões efetivas do usuário. Administradores têm acesso completo. */
export async function getEffectivePermissions(
  userId: number,
  role?: string | null,
): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  const explicit = rows.map((row) => row.permission);
  const roleDefaults = getRoleDefaultPermissions(role);
  if (!roleGrantsAllPermissions(role)) return Array.from(new Set([...roleDefaults, ...explicit]));
  return Array.from(new Set([...ALL_PERMISSIONS.map((item) => item.key), ...roleDefaults, ...explicit]));
}

/** Verifica uma única permissão, sempre consultando a fonte de verdade no banco. */
export async function hasUserPermission(
  userId: number,
  role: string | null | undefined,
  permission: Permission | string,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  if (roleGrantsAllPermissions(role)) return true;
  if (getRoleDefaultPermissions(role).includes(permission as Permission)) return true;

  const rows = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  return rows.some((row) => row.permission === permission);
}

/**
 * Verifica uma permissão atribuída nominalmente, sem o acesso implícito do papel
 * administrativo. Pode complementar permissões de cargos específicos; funções
 * de administrador continuam disponíveis ao próprio administrador.
 */
export async function hasExplicitUserPermission(
  userId: number,
  permission: Permission | string,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const rows = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  return rows.some((row) => row.permission === permission);
}
