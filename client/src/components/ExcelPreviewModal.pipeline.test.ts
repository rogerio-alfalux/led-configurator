import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("pipeline visual do PDF oficial e LD", () => {
  const previewSource = readFileSync(resolve(process.cwd(), "client/src/components/ExcelPreviewModal.tsx"), "utf8");
  const quoteDetailSource = readFileSync(resolve(process.cwd(), "client/src/pages/QuoteDetail.tsx"), "utf8");
  const cartSource = readFileSync(resolve(process.cwd(), "client/src/pages/Cart.tsx"), "utf8");

  it("anexa automaticamente ao LD a mesma prévia oficial sem abrir diálogo de arquivo", () => {
    expect(previewSource).toContain("const captureVisiblePreviewPdf");
    expect(previewSource).toContain("await captureCallbacksRef.current.onCapturePdf?.(blob)");
    expect(quoteDetailSource).toContain("setLdPdfCaptureOpen(true)");
    expect(quoteDetailSource).toContain("onCapturePdf={ldPdfCaptureOpen ? handleOfficialPdfCapturedForLd : undefined}");
    expect(quoteDetailSource).toContain("open={pdfPrintOpen || ldPdfCaptureOpen}");
    expect(quoteDetailSource).not.toContain("officialLdPdfInputRef");
    expect(previewSource).toContain("attempt === 0");
    expect(previewSource).toContain("crossorigin\", \"anonymous");
    expect(previewSource).toContain("const previewPageRef");
    expect(previewSource).toContain("const deadline = Date.now() + 8_000");
    expect(previewSource).toContain("ref={previewPageRef}");
    expect(previewSource).toContain("allowTaint: false");
    expect(previewSource).toContain("useCORS: true");
    expect(previewSource).toContain('orientation: "portrait"');
    expect(previewSource).toContain("layout alternativo");
    expect(previewSource).toContain("formData.freteValue != null && formData.freteValue > 0");
  });

  it("usa window.print() para o download oficial do PDF", () => {
    expect(previewSource).toContain("window.print()");
    expect(previewSource).toContain("document.title = buildFileName()");
  });

  it("usa autoPrint no Cart para disparar impressão automática", () => {
    expect(cartSource).toContain("autoPrint");
    expect(cartSource).toContain("setPdfPrintOpen(true)");
  });

  it("usa autoPrint no QuoteDetail para disparar impressão automática", () => {
    expect(quoteDetailSource).toContain("autoPrint={pdfPrintOpen}");
    expect(quoteDetailSource).toContain("setPdfPrintOpen(true)");
  });

  it("mantém os campos de cabeçalho Obra, Cliente e E-mail na prévia", () => {
    expect(previewSource).toContain('["OBRA", formData.obra || ""]');
    expect(previewSource).toContain('["CLIENTE", formData.cliente || ""]');
    expect(previewSource).toContain('["E-MAIL", formData.email || ""]');
  });
});
