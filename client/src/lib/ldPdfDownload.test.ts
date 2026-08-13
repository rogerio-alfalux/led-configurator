import { describe, expect, it, vi } from "vitest";
import { getLdPdfDownloadUrl, openLdValidatedPdf } from "./ldPdfDownload";

describe("download de PDF para LD Convidado", () => {
  it("preserva o caminho aninhado retornado pelo PDF validado", () => {
    const url = "/api/assets/ld-quotes/42/18/1723580000-orcamento.pdf";
    expect(getLdPdfDownloadUrl(url)).toBe(url);
  });

  it("recusa uma URL que não é entregue pelo proxy de ativos", () => {
    expect(() => getLdPdfDownloadUrl("/orcamentos/18.pdf")).toThrow("URL de download compatível");
  });

  it("abre a URL validada retornada por myPdf no clique do LD", async () => {
    const getPdf = vi.fn(async () => ({ url: "/api/assets/ld-quotes/42/18/orcamento-validado.pdf" }));
    const openWindow = vi.fn();
    await openLdValidatedPdf(18, getPdf, openWindow);
    expect(getPdf).toHaveBeenCalledWith({ requestId: 18 });
    expect(openWindow).toHaveBeenCalledWith(
      "/api/assets/ld-quotes/42/18/orcamento-validado.pdf",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
