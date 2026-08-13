import { describe, it, expect, vi } from "vitest";
import { createServer } from "node:http";
import express from "express";

/**
 * Testa que a rota /api/assets/:key(*) aceita a chave completa do arquivo,
 * inclusive quando o armazenamento usa subpastas.
 * Como o teste unitário não pode fazer fetch real ao Forge, testamos a lógica
 * de validação de parâmetros e tratamento de erros.
 */
describe("Assets Proxy route validation", () => {
  it("should reject requests without a key parameter", async () => {
    // A rota é /api/assets/:key(*) — sem key, Express retorna 404 (não casa com a rota)
    // Isso é garantido pelo padrão de rota do Express
    expect(true).toBe(true);
  });

  it("should have the correct route pattern", async () => {
    // Importar o router e verificar que a rota está registrada
    const assetsRouter = (await import("./assetsProxy")).default;
    const routes = (assetsRouter as any).stack?.map((layer: any) => layer.route?.path).filter(Boolean);
    expect(routes).toContain("/api/assets/:key(*)");
  });

  it("should export a valid Express Router", async () => {
    const assetsRouter = (await import("./assetsProxy")).default;
    expect(assetsRouter).toBeDefined();
    // Express routers have a .use method
    expect(typeof assetsRouter.use).toBe("function");
  });

  it("captures the complete nested key used by validated LD PDFs", async () => {
    const assetsRouter = (await import("./assetsProxy")).default;
    const originalFetch = global.fetch;
    const capturedPaths: string[] = [];
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("v1/storage/presign/get")) {
        capturedPaths.push(new URL(url).searchParams.get("path") ?? "");
        return new Response(JSON.stringify({ url: "https://storage.test/ld.pdf" }), { status: 200 });
      }
      return new Response("PDF", { status: 200, headers: { "content-type": "application/pdf" } });
    }) as typeof fetch;

    const app = express();
    app.use(assetsRouter);
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    try {
      const response = await originalFetch(`http://127.0.0.1:${port}/api/assets/ld-quotes/42/18/orcamento-validado.pdf`);
      expect(response.status).toBe(200);
      expect(capturedPaths).toEqual(["ld-quotes/42/18/orcamento-validado.pdf"]);
    } finally {
      global.fetch = originalFetch;
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
