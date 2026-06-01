import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { getDb } from "./db";
import { apiKeys } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Gera um hash SHA-256 da chave bruta para armazenamento seguro.
 */
export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Gera uma nova API Key aleatória no formato: alf_<32 chars hex>
 */
export function generateApiKey(): string {
  const { randomBytes } = require("crypto");
  return `alf_${randomBytes(16).toString("hex")}`;
}

/**
 * Middleware Express que valida o Bearer token no header Authorization.
 * Injeta req.apiKeyId quando válido.
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Provide a valid API key in the Authorization: Bearer <key> header." });
    return;
  }

  const raw = authHeader.slice(7).trim();
  const hash = hashApiKey(raw);

  try {
    const db = await getDb();
    if (!db) {
      res.status(503).json({ error: "Service Unavailable", message: "Database not available." });
      return;
    }

    const rows = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.active, true)))
      .limit(1);

    if (rows.length === 0) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid or revoked API key." });
      return;
    }

    // Atualiza lastUsedAt de forma assíncrona (não bloqueia a resposta)
    db.update(apiKeys)
      .set({ lastUsedAt: new Date().toISOString().slice(0, 19).replace("T", " ") })
      .where(eq(apiKeys.id, rows[0].id))
      .execute()
      .catch(() => {});

    (req as any).apiKeyId = rows[0].id;
    next();
  } catch (err) {
    console.error("[apiKeyAuth] DB error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
