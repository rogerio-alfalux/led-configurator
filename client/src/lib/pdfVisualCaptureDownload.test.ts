import { describe, expect, it, vi } from "vitest";
import { downloadPdfBlob } from "./pdfVisualCapture";

describe("download do PDF visual oficial", () => {
  it("cria e aciona um arquivo PDF baixável", () => {
    const click = vi.fn();
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const documentRef = {
      body: { appendChild, removeChild },
      createElement: vi.fn(() => ({ href: "", download: "", style: {}, click })),
    } as unknown as Document;
    const createObjectUrl = vi.fn(() => "blob:orcamento");
    const revoke = vi.fn();
    downloadPdfBlob(new Blob(["pdf"], { type: "application/pdf" }), "ORC-1.pdf", documentRef, createObjectUrl, revoke);
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(appendChild).toHaveBeenCalledOnce();
    expect(removeChild).toHaveBeenCalledOnce();
  });

  it("recusa um arquivo vazio", () => {
    expect(() => downloadPdfBlob(new Blob([]), "vazio.pdf")).toThrow("vazio");
  });
});
