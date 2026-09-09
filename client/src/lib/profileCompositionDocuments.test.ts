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

  it("encontra DS e IES na variante compatível quando o SKU calculado só possui desenho técnico", () => {
    const documents = getProfileTechnicalDocuments([
      {
        sku: "LLP-3336.2IN.48F", familia: "MINI BLAZE", instalacao: "PENDENTE", name: "MINI BLAZE P 2B 1135MM 36W",
        documentos: { desenhoTecnico: document("LLP-3336.2IN.48F.pdf", "https://api.example/dt.pdf") },
      },
      {
        sku: "LLP-3336.35I.48F", familia: "MINI BLAZE", instalacao: "PENDENTE", name: "MINI BLAZE P 3.5B 2010MM 18W",
        documentos: {
          datasheet: document("Ficha MINI BLAZE 18W.pdf", "https://api.example/ds.pdf"),
          fotometria: document("MINI BLAZE 18W 3000K.ies", "https://api.example/ies.ies"),
        },
      },
      {
        sku: "LLP-3336.35I.48F", familia: "MINI BLAZE", instalacao: "PENDENTE", name: "MINI BLAZE P 3.5B 2010MM 36W",
        documentos: { datasheet: document("Ficha MINI BLAZE 36W.pdf", "https://api.example/ds-36.pdf") },
      },
    ], ["LLP-3336.2IN.48F"], { familia: "MINI BLAZE", instalacao: "PENDENTE", potencia: 18 });

    expect(documents.datasheet?.nome).toBe("Ficha MINI BLAZE 18W.pdf");
    expect(documents.fotometria?.nome).toBe("MINI BLAZE 18W 3000K.ies");
    expect(documents.desenhosTecnicos).toEqual([
      expect.objectContaining({ sku: "LLP-3336.2IN.48F" }),
    ]);
  });

  it("prioriza o código-base do perfil quando seu nome comercial diverge do campo família da API", () => {
    const documents = getProfileTechnicalDocuments([
      {
        sku: "LLP-3336.2IN.48F", familia: "MINI BLAZE", instalacao: "PENDENTE", name: "MINI BLAZE P 2B 1135MM 18W",
        documentos: { desenhoTecnico: document("LLP-3336.2IN.48F.pdf", "https://api.example/dt.pdf") },
      },
      {
        sku: "LLP-3336.35I.48F", familia: "MINI BLAZE", instalacao: "PENDENTE", name: "MINI BLAZE P 3.5B 2010MM 18W",
        documentos: { datasheet: document("Ficha MINI BLAZE 18W.pdf", "https://api.example/ds.pdf") },
      },
    ], ["LLP-3336.2IN.48F"], { profileCode: "LLP-3336", familia: "MINI BLAZE P", instalacao: "PENDENTE", potencia: 18 });

    expect(documents.datasheet?.nome).toBe("Ficha MINI BLAZE 18W.pdf");
  });
});
