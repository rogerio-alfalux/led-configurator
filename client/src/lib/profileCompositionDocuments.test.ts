import { describe, expect, it } from "vitest";
import { getProfileTechnicalDocuments } from "./profileCompositionDocuments";

const document = (nome: string, url: string) => ({ nome, url, mimeType: "application/pdf" });

describe("getProfileTechnicalDocuments", () => {
  it("mantém DS, manual e IES únicos da composição e DT para cada SKU", () => {
    const documents = getProfileTechnicalDocuments([
      {
        sku: "LLP-1000.1IF",
        documentos: {
          datasheet: document("Perfil 1000.pdf", "https://api.example/ds.pdf"),
          manualInstalacao: document("Manual Perfil.pdf", "https://api.example/manual.pdf"),
          fotometria: document("Perfil 1000.ies", "https://api.example/ies.ies"),
          desenhoTecnico: document("LLP-1000.1IF.pdf", "https://api.example/dt-if.pdf"),
        },
      },
      {
        sku: "LLP-1000.2ML",
        documentos: {
          datasheet: document("Perfil 1000.pdf", "https://api.example/ds.pdf"),
          manualInstalacao: document("Manual Perfil.pdf", "https://api.example/manual.pdf"),
          fotometria: document("Perfil 1000.ies", "https://api.example/ies.ies"),
          desenhoTecnico: document("LLP-1000.2ML.pdf", "https://api.example/dt-ml.pdf"),
        },
      },
    ], ["llp-1000.1if", "LLP-1000.2ML", "LLP-1000.1IF"]);

    expect(documents.datasheet?.nome).toBe("Perfil 1000.pdf");
    expect(documents.manualInstalacao?.nome).toBe("Manual Perfil.pdf");
    expect(documents.fotometria?.nome).toBe("Perfil 1000.ies");
    expect(documents.desenhosTecnicos).toEqual([
      expect.objectContaining({ sku: "LLP-1000.1IF" }),
      expect.objectContaining({ sku: "LLP-1000.2ML" }),
    ]);
  });

  it("não cria anexos quando os SKUs calculados não possuem documentos na API", () => {
    const documents = getProfileTechnicalDocuments([{ sku: "LLP-1000.1IF" }], ["LLP-1000.1IF"]);

    expect(documents).toEqual({ datasheet: null, manualInstalacao: null, fotometria: null, desenhosTecnicos: [] });
  });
});
