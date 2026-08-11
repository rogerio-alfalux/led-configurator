import type { Express } from "express";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req: import('express').Request & { params: Record<string, string> }, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      // Entregar o arquivo pelo próprio domínio da aplicação. Isso evita que
      // navegadores bloqueiem a imagem por redirecionamento cross-origin em
      // contextos privados/convidados, mantendo a URL /manus-storage estável.
      const assetResp = await fetch(url);
      if (!assetResp.ok) {
        console.error(`[StorageProxy] asset error: ${assetResp.status}`);
        res.status(502).send("Storage asset unavailable");
        return;
      }

      const contentType = assetResp.headers.get("content-type");
      const contentLength = assetResp.headers.get("content-length");
      if (contentType) res.set("Content-Type", contentType);
      if (contentLength) res.set("Content-Length", contentLength);
      res.set("Cache-Control", "public, max-age=3600");
      res.set("X-Content-Type-Options", "nosniff");

      const data = Buffer.from(await assetResp.arrayBuffer());
      res.status(200).send(data);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
