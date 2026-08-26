import { describe, expect, it } from "vitest";
import { createProductDocumentDownloadUrl } from "./productDocumentDownload";

describe("createProductDocumentDownloadUrl", () => {
  it("preserva exatamente espaços, acentos e extensão do nome recebido da API", () => {
    const apiName = "Desenho Técnico LUNA G revisão 02.pdf";
    const result = createProductDocumentDownloadUrl({
      nome: apiName,
      mimeType: "application/pdf",
      url: "https://d36hbw14aib5lz.cloudfront.net/documento.pdf?Signature=abc",
    });
    const parsed = new URL(result, "https://sistema-luna.example");
    expect(parsed.pathname).toBe("/api/product-document-download");
    expect(parsed.searchParams.get("filename")).toBe(apiName);
    expect(parsed.searchParams.get("url")).toBe("https://d36hbw14aib5lz.cloudfront.net/documento.pdf?Signature=abc");
  });
});
