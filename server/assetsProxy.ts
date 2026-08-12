import { Router } from "express";
import { ENV } from "./_core/env";

const assetsRouter = Router();

/**
 * Rota pública que serve arquivos de storage diretamente pelo corpo da resposta.
 * Diferente de /manus-storage/ (interceptado pela plataforma de deploy com 307),
 * esta rota é processada pela aplicação e entrega o binário com HTTP 200.
 */
assetsRouter.get("/api/assets/:key", async (req, res) => {
  const key = req.params.key;
  if (!key) {
    res.status(400).send("Missing asset key");
    return;
  }

  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    res.status(500).send("Storage not configured");
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
      res.status(502).send("Storage backend error");
      return;
    }

    const { url } = (await forgeResp.json()) as { url: string };
    if (!url) {
      res.status(502).send("Empty signed URL");
      return;
    }

    const assetResp = await fetch(url);
    if (!assetResp.ok) {
      res.status(502).send("Asset unavailable");
      return;
    }

    const contentType = assetResp.headers.get("content-type");
    const contentLength = assetResp.headers.get("content-length");
    if (contentType) res.set("Content-Type", contentType);
    if (contentLength) res.set("Content-Length", contentLength);
    res.set("Cache-Control", "public, max-age=86400");
    res.set("X-Content-Type-Options", "nosniff");

    const data = Buffer.from(await assetResp.arrayBuffer());
    res.status(200).send(data);
  } catch (err) {
    console.error("[AssetsProxy] failed:", err);
    res.status(502).send("Asset proxy error");
  }
});

export default assetsRouter;
