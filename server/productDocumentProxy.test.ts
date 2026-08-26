import express from "express";
import { createServer } from "http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildProductDocumentContentDisposition, isAllowedProductDocumentUrl, registerProductDocumentProxy } from "./productDocumentProxy";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("productDocumentProxy", () => {
  it("gera Content-Disposition com o nome UTF-8 exato da API", () => {
    const header = buildProductDocumentContentDisposition("Desenho Técnico LUNA G revisão 02.pdf");
    expect(header).toContain("attachment;");
    expect(header).toContain("filename*=UTF-8''Desenho%20T%C3%A9cnico%20LUNA%20G%20revis%C3%A3o%2002.pdf");
  });

  it("aceita somente HTTPS dos hosts documentais autorizados", () => {
    expect(isAllowedProductDocumentUrl("https://d36hbw14aib5lz.cloudfront.net/doc.pdf?Signature=abc")).toBe(true);
    expect(isAllowedProductDocumentUrl("https://alfaluxprod-c8zmg2fn.manus.space/manus-storage/doc.pdf")).toBe(true);
    expect(isAllowedProductDocumentUrl("http://d36hbw14aib5lz.cloudfront.net/doc.pdf")).toBe(false);
    expect(isAllowedProductDocumentUrl("https://example.com/doc.pdf")).toBe(false);
  });

  it("entrega o arquivo com Content-Disposition baseado exatamente no nome da API", async () => {
    const realFetch = globalThis.fetch;
    const apiFileName = "Ficha Técnica LUNA G revisão 02.pdf";
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("http://127.0.0.1:")) return realFetch(input, init);
      return new Response(new Uint8Array([37, 80, 68, 70]), {
        status: 200,
        headers: { "content-type": "application/pdf", "content-length": "4" },
      });
    }));

    const app = express();
    registerProductDocumentProxy(app);
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Servidor de teste sem porta");
      const params = new URLSearchParams({
        url: "https://d36hbw14aib5lz.cloudfront.net/documento.pdf?Signature=abc",
        filename: apiFileName,
      });
      const response = await realFetch(`http://127.0.0.1:${address.port}/api/product-document-download?${params}`);

      expect(response.status).toBe(200);
      expect((await response.arrayBuffer()).byteLength).toBe(4);
      expect(response.headers.get("content-disposition")).toContain(
        "filename*=UTF-8''Ficha%20T%C3%A9cnica%20LUNA%20G%20revis%C3%A3o%2002.pdf",
      );
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
