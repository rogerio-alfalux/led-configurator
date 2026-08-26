import { describe, expect, it } from "vitest";
import { hasProductDocuments, normalizeProductDocuments } from "./productDocuments";

describe("normalizeProductDocuments", () => {
  it("prioriza nome, MIME type e URL da seção documentos", () => {
    const documents = normalizeProductDocuments({
      documentos: {
        datasheet: { nome: "LUNA G RE.pdf", mimeType: "application/pdf", url: "https://api.example/ds.pdf" },
        fotometria: { nome: "LUNA G RE.ies", mimeType: "application/octet-stream", url: "https://api.example/luna.ies" },
        desenhoTecnico: null,
      },
      datasheetUrl: "https://api.example/fallback.pdf",
    });

    expect(documents.datasheet).toMatchObject({ nome: "LUNA G RE.pdf", url: "https://api.example/ds.pdf" });
    expect(documents.fotometria?.nome).toBe("LUNA G RE.ies");
    expect(documents.desenhoTecnico).toBeNull();
    expect(hasProductDocuments(documents)).toBe(true);
  });

  it("aceita os aliases de URL como compatibilidade sem inventar documentos ausentes", () => {
    const documents = normalizeProductDocuments({
      datasheetUrl: "https://api.example/ds.pdf",
      fotometriaIesUrl: null,
      desenhoTecnicoUrl: "https://api.example/dt.pdf",
    });

    expect(documents.datasheet?.nome).toBe("Datasheet.pdf");
    expect(documents.fotometria).toBeNull();
    expect(documents.desenhoTecnico?.url).toBe("https://api.example/dt.pdf");
  });
});
