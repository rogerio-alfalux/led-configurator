/**
 * Guest Authentication — login por e-mail + senha para usuários convidados.
 * Também expõe endpoints admin para criar/editar/excluir usuários com senha.
 */
import { Router } from "express";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ENV } from "./_core/env";
import { getSessionCookieOptions } from "./_core/cookies";

const router = Router();

// ─── Login por senha ─────────────────────────────────────────────────────────
router.post("/api/guest/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const { getDb } = await import("./db");
    const { users } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Banco de dados indisponível." });

    // Buscar usuário por e-mail
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    // Verificar senha
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    // Criar session token (mesmo formato do OAuth)
    const secretKey = new TextEncoder().encode(ENV.cookieSecret);
    const expiresInMs = ONE_YEAR_MS;
    const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);

    const token = await new SignJWT({
      openId: user.openId,
      appId: ENV.appId,
      name: user.name || "",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);

    // Setar cookie de sessão
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    // Atualizar lastSignedIn
    const signedInAt = new Date().toISOString().slice(0, 19).replace("T", " ");
    await db.update(users).set({ lastSignedIn: signedInAt }).where(eq(users.id, user.id));

    return res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[GuestAuth] Login error:", err);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

export default router;
