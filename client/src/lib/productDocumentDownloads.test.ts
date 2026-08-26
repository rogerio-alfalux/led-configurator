import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ProductDocumentDownloads } from "../components/ProductDocumentDownloads";

describe("ProductDocumentDownloads", () => {
  it("exibe somente os documentos disponíveis com download pelo nome exato da API", () => {
    const html = renderToStaticMarkup(createElement(
      ProductDocumentDownloads,
      {
        documents: {
          datasheet: { nome: "Ficha LUNA.pdf", mimeType: "application/pdf", url: "https://api.example/luna-ds.pdf" },
          fotometria: { nome: "LUNA.ies", mimeType: "application/octet-stream", url: "https://api.example/luna.ies" },
          desenhoTecnico: null,
        },
      },
    ));

    expect(html).toContain("Documentos do produto");
    expect(html).toContain("Datasheet");
    expect(html).toContain("Fotometria");
    expect(html).not.toContain("Desenho técnico");
    expect(html).toContain("/api/product-document-download?");
    expect(html).toContain("filename=Ficha+LUNA.pdf");
    expect(html).toContain("filename=LUNA.ies");
    expect(html).toContain('download="Ficha LUNA.pdf"');
  });

  it("não cria espaço no resumo quando o produto não possui documentos", () => {
    const html = renderToStaticMarkup(createElement(ProductDocumentDownloads, {
      documents: { datasheet: null, fotometria: null, desenhoTecnico: null },
    }));
    expect(html).toBe("");
  });
});
