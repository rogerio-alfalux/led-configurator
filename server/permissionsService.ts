import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { userPermissions } from "../drizzle/schema";
import { ALL_PERMISSIONS, type Permission } from "../shared/permissions";

/** Retorna todas as permissões efetivas do usuário. Administradores possuem todas implicitamente. */
export async function getEffectivePermissions(
  userId: number,
  role?: string | null,
): Promise<string[]> {
  if (role === "admin") return ALL_PERMISSIONS.map((item) => item.key);

  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  return rows.map((row) => row.permission);
}

/** Verifica uma única permissão, sempre consultando a fonte de verdade no banco. */
export async function hasUserPermission(
  userId: number,
  role: string | null | undefined,
  permission: Permission | string,
): Promise<boolean> {
  if (role === "admin") return true;

  const db = await getDb();
  if (!db) return false;

  const rows = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  return rows.some((row) => row.permission === permission);
}
