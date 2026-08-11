import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { userPermissions } from "../drizzle/schema";
import { ALL_PERMISSIONS, PERMISSIONS, type Permission } from "../shared/permissions";

/** Retorna todas as permissões efetivas do usuário. A gestão de amostras é sempre explícita. */
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
  if (role !== "admin") return explicit;
  // Administradores mantêm permissões amplas, mas amostras/manutenções só são
  // liberadas para quem recebeu a autorização individual definida pela empresa.
  return Array.from(new Set([
    ...ALL_PERMISSIONS.filter((item) => item.key !== PERMISSIONS.GERENCIAR_AMOSTRAS).map((item) => item.key),
    ...explicit,
  ]));
}

/** Verifica uma única permissão, sempre consultando a fonte de verdade no banco. */
export async function hasUserPermission(
  userId: number,
  role: string | null | undefined,
  permission: Permission | string,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  if (role === "admin" && permission !== PERMISSIONS.GERENCIAR_AMOSTRAS) return true;

  const rows = await db
    .select({ permission: userPermissions.permission })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));

  return rows.some((row) => row.permission === permission);
}
