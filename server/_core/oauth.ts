import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { isEmailAllowed, isAdminEmail, insertAuditLog } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      const email = userInfo.email ?? null;

      // ─── Verificação de domínio ─────────────────────────────────────────
      // Somente e-mails @grupoalfalux.* ou ADMINs explícitos podem acessar.
      if (!isEmailAllowed(email)) {
        // Registrar tentativa bloqueada no log de auditoria
        await insertAuditLog({
          userId: null,
          userEmail: email,
          userName: userInfo.name ?? null,
          action: "login_blocked",
          entityType: "user",
          entityId: null,
          details: JSON.stringify({
            reason: "email_domain_not_allowed",
            email,
            name: userInfo.name,
          }),
        });

        console.warn(`[OAuth] Login bloqueado para e-mail não autorizado: ${email}`);
        // Redirecionar para página de acesso negado
        res.redirect(302, "/?access=denied");
        return;
      }

      // Promover automaticamente ADMINs pelo e-mail
      const role = isAdminEmail(email) ? "admin" : undefined;

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
        ...(role ? { role } : {}),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
