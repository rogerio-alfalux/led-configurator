/**
 * imageProxy.ts
 * Proxy server-side para imagens da API Alfalux.
 * Baixa a imagem completamente no servidor (seguindo redirects) e
 * a repassa ao browser — sem expor URLs assinadas do CloudFront.
 *
 * Uso: GET /api/image-proxy?url=<encoded_url>
 */

import type { Express, Request, Response } from "express";
import https from "https";
import http from "http";

const ALLOWED_HOSTS = [
  "alfaluxprod-c8zmg2fn.manus.space",
  "files.manuscdn.com",
  "cloudfront.net",           // manus-storage redirects
  "manuscdn.com",             // CDN alternativo
];

function isAllowedUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return ALLOWED_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

/** Faz GET seguindo até 5 redirects e retorna o response final */
function fetchFollowRedirects(
  url: string,
  maxRedirects = 5
): Promise<{ statusCode: number; headers: Record<string, string | string[] | undefined>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    let redirectsLeft = maxRedirects;

    function doRequest(currentUrl: string) {
      const protocol = currentUrl.startsWith("https://") ? https : http;
      const req = protocol.get(
        currentUrl,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; LEDConfigurator/1.0)",
            Accept: "image/*,*/*",
          },
        },
        (res) => {
          const statusCode = res.statusCode || 0;

          // Seguir redirect
          if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
            if (redirectsLeft <= 0) {
              reject(new Error("Too many redirects"));
              return;
            }
            redirectsLeft--;
            res.resume(); // Descartar body do redirect
            doRequest(res.headers.location);
            return;
          }

          // Coletar body
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => {
            resolve({
              statusCode,
              headers: res.headers as Record<string, string | string[] | undefined>,
              body: Buffer.concat(chunks),
            });
          });
          res.on("error", reject);
        }
      );

      req.on("error", reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });
    }

    doRequest(url);
  });
}

export function registerImageProxy(app: Express) {
  app.get("/api/image-proxy", async (req: Request, res: Response) => {
    const rawUrl = req.query.url as string;

    if (!rawUrl) {
      res.status(400).json({ error: "Missing url parameter" });
      return;
    }

    let targetUrl: string;
    try {
      targetUrl = decodeURIComponent(rawUrl);
    } catch {
      res.status(400).json({ error: "Invalid url encoding" });
      return;
    }

    if (!isAllowedUrl(targetUrl)) {
      res.status(403).json({ error: "URL not allowed" });
      return;
    }

    try {
      const { statusCode, headers, body } = await fetchFollowRedirects(targetUrl);

      if (statusCode !== 200) {
        res.status(statusCode || 502).end();
        return;
      }

      const contentType = (headers["content-type"] as string) || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Length", body.length);
      res.status(200).end(body);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[ImageProxy] Error:", message);
      if (!res.headersSent) {
        res.status(502).json({ error: "Proxy error", detail: message });
      }
    }
  });
}
