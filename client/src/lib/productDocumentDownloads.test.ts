import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ProductDocumentDownloads } from "../components/ProductDocumentDownloads";

describe("ProductDocumentDownloads", () => {
  it("exibe somente os documentos disponíveis com links diretos da API", () => {
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
    expect(html).toContain('href="https://api.example/luna-ds.pdf"');
    expect(html).toContain('href="https://api.example/luna.ies"');
  });

  it("não cria espaço no resumo quando o produto não possui documentos", () => {
    const html = renderToStaticMarkup(createElement(ProductDocumentDownloads, {
      documents: { datasheet: null, fotometria: null, desenhoTecnico: null },
    }));
    expect(html).toBe("");
  });
});
