import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { userPermissions } from "../drizzle/schema";
import { ALL_PERMISSIONS, PERMISSIONS, type Permission } from "../shared/permissions";

/** Administradores têm acesso a todas as funções administrativas, inclusive amostras. */
export function roleGrantsAllPermissions(role?: string | null): boolean {
  return role === "admin";
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
  if (!roleGrantsAllPermissions(role)) return explicit;
  return Array.from(new Set([...ALL_PERMISSIONS.map((item) => item.key), ...explicit]));
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

  const rows = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  return rows.some((row) => row.permission === permission);
}

/**
 * Verifica uma permissão atribuída nominalmente, sem o acesso implícito do papel
 * administrativo. Usada para funções deliberadamente exclusivas, como faturar.
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
