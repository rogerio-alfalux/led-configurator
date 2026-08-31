import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadProfileTechnicalDocumentsZip, getProfileTechnicalDocumentsZipEntries, getProfileTechnicalDocumentsZipFilename } from "./profileTechnicalDocumentsZip";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("getProfileTechnicalDocumentsZipEntries", () => {
  it("mantém DS, manual e IES únicos e separa desenhos por SKU sem mudar os nomes da API", () => {
    const entries = getProfileTechnicalDocumentsZipEntries({
      datasheet: { nome: "BLAZE P LED.pdf", mimeType: "application/pdf", url: "https://docs.example/ds" },
      manualInstalacao: { nome: "Manual-Instalacao_Sistema_Lume.pdf", mimeType: "application/pdf", url: "https://docs.example/manual" },
      fotometria: { nome: "BLAZE P LED.ies", mimeType: "application/octet-stream", url: "https://docs.example/ies" },
      desenhosTecnicos: [
        { sku: "LLP-6060.3IF.48F", document: { nome: "LLP-6060.3IF.48F.pdf", mimeType: "application/pdf", url: "https://docs.example/dt-if" } },
        { sku: "LLP-6060.5ML.48F", document: { nome: "LLP-6060.5ML.48F.pdf", mimeType: "application/pdf", url: "https://docs.example/dt-ml" } },
      ],
    });

    expect(entries.map(entry => entry.path)).toEqual([
      "Datasheet/BLAZE P LED.pdf",
      "Manual de Instalacao/Manual-Instalacao_Sistema_Lume.pdf",
      "Fotometria Base/BLAZE P LED.ies",
      "Desenhos Tecnicos/LLP-6060.3IF.48F/LLP-6060.3IF.48F.pdf",
      "Desenhos Tecnicos/LLP-6060.5ML.48F/LLP-6060.5ML.48F.pdf",
    ]);
    expect(getProfileTechnicalDocumentsZipFilename()).toBe("documentos-tecnicos-alfalux.zip");
  });

  it("não inclui duas vezes o mesmo arquivo remoto", () => {
    const repeated = { nome: "desenho.pdf", mimeType: "application/pdf", url: "https://docs.example/same" };
    const entries = getProfileTechnicalDocumentsZipEntries({
      datasheet: null,
      manualInstalacao: null,
      fotometria: null,
      desenhosTecnicos: [
        { sku: "SKU-1", document: repeated },
        { sku: "SKU-2", document: repeated },
      ],
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.path).toBe("Desenhos Tecnicos/SKU-1/desenho.pdf");
  });

  it("busca cada arquivo pelo proxy seguro e inicia um único download ZIP", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode("conteúdo técnico").buffer,
    });
    const createObjectURL = vi.fn(() => "blob:documentos-tecnicos");
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("window", { setTimeout: vi.fn((callback: () => void) => callback()) });
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({ href: "", download: "", click, remove })),
      body: { appendChild: vi.fn() },
    });

    const count = await downloadProfileTechnicalDocumentsZip({
      datasheet: { nome: "Datasheet.pdf", mimeType: "application/pdf", url: "https://docs.example/ds" },
      manualInstalacao: { nome: "Manual.pdf", mimeType: "application/pdf", url: "https://docs.example/manual" },
      fotometria: { nome: "Fotometria.ies", mimeType: "application/octet-stream", url: "https://docs.example/ies" },
      desenhosTecnicos: [{ sku: "SKU-1", document: { nome: "Desenho.pdf", mimeType: "application/pdf", url: "https://docs.example/dt" } }],
    }, fetchMock);

    expect(count).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/product-document-download?");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("filename=Datasheet.pdf");
    expect(click).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });
});
