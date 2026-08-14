import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("pipeline visual do PDF oficial e LD", () => {
  const previewSource = readFileSync(resolve(process.cwd(), "client/src/components/ExcelPreviewModal.tsx"), "utf8");
  const quoteDetailSource = readFileSync(resolve(process.cwd(), "client/src/pages/QuoteDetail.tsx"), "utf8");
  const cartSource = readFileSync(resolve(process.cwd(), "client/src/pages/Cart.tsx"), "utf8");

  it("usa a mesma captura visual para baixar o PDF oficial e para o PDF enviado ao LD", () => {
    expect(previewSource).toContain("const captureVisiblePreviewPdf");
    expect(previewSource).toContain("const blob = await captureVisiblePreviewPdf()");
    expect(previewSource).toContain("onCapturePdf(await captureVisiblePreviewPdf())");
    expect(quoteDetailSource).toContain("onCapturePdf={ldPdfCaptureOpen ? handleOfficialPdfCapturedForLd : undefined}");
  });

  it("usa autoPrint no Cart para disparar download automático", () => {
    expect(cartSource).toContain("autoPrint");
    expect(cartSource).toContain("setPdfPrintOpen(true)");
  });

  it("usa autoPrint no QuoteDetail para disparar download automático", () => {
    expect(quoteDetailSource).toContain("autoPrint={pdfPrintOpen}");
    expect(quoteDetailSource).toContain("setPdfPrintOpen(true)");
  });

  it("mantém os campos de cabeçalho Obra, Cliente e E-mail na prévia capturada", () => {
    expect(previewSource).toContain('["OBRA", formData.obra || ""]');
    expect(previewSource).toContain('["CLIENTE", formData.cliente || ""]');
    expect(previewSource).toContain('["E-MAIL", formData.email || ""]');
  });

  it("aguarda e inclui imagens da prévia antes da captura visual", () => {
    expect(previewSource).toContain('capturePreviewPagePdf({');
    expect(previewSource).toContain('html2canvas(node as HTMLElement');
    const captureSource = readFileSync(resolve(process.cwd(), "client/src/lib/pdfVisualCapture.ts"), "utf8");
    expect(captureSource).toContain('page.querySelectorAll("img")');
    expect(captureSource).toContain('await waitForPreviewImages(images)');
  });
});
