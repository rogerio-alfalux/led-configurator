import type { Express, Request, Response } from "express";
import { Readable } from "stream";

const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
const ALLOWED_DOCUMENT_HOSTS = [
  "alfaluxprod-c8zmg2fn.manus.space",
  "d36hbw14aib5lz.cloudfront.net",
];

export function isAllowedProductDocumentUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "https:"
      && !parsed.username
      && !parsed.password
      && ALLOWED_DOCUMENT_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function encodeContentDispositionValue(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function buildProductDocumentContentDisposition(apiFileName: string): string {
  const safeName = apiFileName.replace(/[\r\n]/g, "");
  const asciiFallback = safeName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/["\\]/g, "_") || "documento";
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeContentDispositionValue(safeName)}`;
}

export function registerProductDocumentProxy(app: Express) {
  app.get("/api/product-document-download", async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
    const apiFileName = typeof req.query.filename === "string" ? req.query.filename : "";

    if (!rawUrl || !apiFileName) {
      res.status(400).json({ error: "Parâmetros url e filename são obrigatórios" });
      return;
    }
    if (apiFileName.length > 255 || /[\r\n]/.test(apiFileName)) {
      res.status(400).json({ error: "Nome de arquivo inválido" });
      return;
    }
    if (!isAllowedProductDocumentUrl(rawUrl)) {
      res.status(403).json({ error: "URL de documento não permitida" });
      return;
    }

    try {
      const upstream = await fetch(rawUrl, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(60_000),
      });
      if (!upstream.ok || !upstream.body) {
        res.status(upstream.status || 502).json({ error: "Falha ao obter documento da API" });
        return;
      }

      const contentLength = Number(upstream.headers.get("content-length") || 0);
      if (contentLength > MAX_DOCUMENT_BYTES) {
        await upstream.body.cancel();
        res.status(413).json({ error: "Documento excede o limite permitido" });
        return;
      }

      res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
      res.setHeader("Content-Disposition", buildProductDocumentContentDisposition(apiFileName));
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (contentLength > 0) res.setHeader("Content-Length", contentLength);

      Readable.fromWeb(upstream.body as never).pipe(res);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("[ProductDocumentProxy]", message);
      if (!res.headersSent) res.status(502).json({ error: "Falha ao baixar documento" });
    }
  });
}
