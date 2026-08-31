import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProfileTechnicalDocuments } from "../components/ProfileTechnicalDocuments";

describe("ProfileTechnicalDocuments", () => {
  it("apresenta DS e IES consolidados e desenhos técnicos identificados por SKU", () => {
    const html = renderToStaticMarkup(createElement(ProfileTechnicalDocuments, {
      documents: {
        datasheet: { nome: "Perfil.pdf", mimeType: "application/pdf", url: "https://api.example/ds.pdf" },
        fotometria: { nome: "Perfil.ies", mimeType: "application/octet-stream", url: "https://api.example/ies.ies" },
        desenhosTecnicos: [{ sku: "LLP-1000.1IF", document: { nome: "DT IF.pdf", mimeType: "application/pdf", url: "https://api.example/dt.pdf" } }],
      },
    }));

    expect(html).toContain("Datasheet da composição");
    expect(html).toContain("Fotometria Base");
    expect(html).toContain("Desenhos técnicos por SKU");
    expect(html).toContain("LLP-1000.1IF");
    expect(html).toContain("Baixar todos os 3 documentos técnicos em ZIP");
  });
});
