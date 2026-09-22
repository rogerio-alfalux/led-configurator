import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("pipeline visual do PDF oficial e LD", () => {
  const previewSource = readFileSync(resolve(process.cwd(), "client/src/components/ExcelPreviewModal.tsx"), "utf8");
  const quoteDetailSource = readFileSync(resolve(process.cwd(), "client/src/pages/QuoteDetail.tsx"), "utf8");
  const cartSource = readFileSync(resolve(process.cwd(), "client/src/pages/Cart.tsx"), "utf8");

  it("anexa ao LD o mesmo arquivo oficial gerado pelo fluxo de download", () => {
    expect(previewSource).toContain("const captureVisiblePreviewPdf");
    expect(previewSource).toContain("await captureCallbacksRef.current.onCapturePdf?.(blob)");
    expect(previewSource).toContain('downloadPdfBlob(blob, `${buildFileName()}.pdf`)');
    expect(quoteDetailSource).toContain("setLdPdfCaptureOpen(true)");
    expect(quoteDetailSource).toContain("onCapturePdf={ldPdfCaptureOpen ? handleOfficialPdfCapturedForLd : undefined}");
    expect(quoteDetailSource).toContain("open={pdfPrintOpen || ldPdfCaptureOpen}");
    expect(quoteDetailSource).toContain("autoDownload={pdfPrintOpen}");
    expect(quoteDetailSource).toContain("showIpi: (pdfPrintOpen || ldPdfCaptureOpen) ? pdfShowIpi : false");
    expect(quoteDetailSource).not.toContain("officialLdPdfInputRef");
    expect(previewSource).toContain("attempt === 0");
    expect(previewSource).toContain("crossorigin\", \"anonymous");
    expect(previewSource).toContain("const previewPageRef");
    expect(previewSource).toContain("const deadline = Date.now() + 8_000");
    expect(previewSource).toContain("ref={previewPageRef}");
    expect(previewSource).toContain("html2canvas ainda não interpreta funções CSS OKLCH");
    expect(previewSource).toContain("--primary: #1a2b4a");
    expect(previewSource).toContain("cloneNodes.forEach");
    expect(previewSource).toContain("fallback(\"background-color\", \"transparent\")");
    expect(previewSource).toContain("computed.boxShadow.includes(\"oklch(\")");
    expect(previewSource).toContain("Aplicar ao clone a mesma geometria da regra @media print");
    expect(previewSource).toContain("margins: { top: 22.68, right: 22.68, bottom: 22.68, left: 22.68 }");
    expect(previewSource).toContain("allowTaint: false");
    expect(previewSource).toContain("useCORS: true");
    expect(previewSource).toContain('orientation: "portrait"');
    expect(previewSource).toContain("layout alternativo");
    expect(previewSource).toContain("formData.freteValue != null && formData.freteValue > 0");
  });

  it("usa o Blob visual oficial para download, em vez de um layout de impressão separado", () => {
    expect(previewSource).toContain("const handleDownloadPDF = useCallback(async () => {");
    expect(previewSource).toContain("const blob = await captureVisiblePreviewPdf()");
    expect(previewSource).toContain("if (!open || !autoDownload) return");
  });

  it("mostra em tela a prévia na proporção A4 retrato sem alterar a escala da impressão", () => {
    expect(previewSource).toContain("zoom: 0.721");
    const printSource = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
    expect(printSource).toContain("zoom: 1 !important");
    expect(printSource).toContain("size: A4 portrait");
  });

  it("usa autoPrint no Cart para disparar impressão automática", () => {
    expect(cartSource).toContain("autoPrint");
    expect(cartSource).toContain("setPdfPrintOpen(true)");
  });

  it("usa autoDownload no QuoteDetail para gerar o mesmo arquivo oficial", () => {
    expect(quoteDetailSource).toContain("autoDownload={pdfPrintOpen}");
    expect(quoteDetailSource).toContain("setPdfPrintOpen(true)");
  });

  it("permite o envio do PDF à solicitação LD pela equipe que edita o orçamento", () => {
    expect(quoteDetailSource).toContain("trpc.ldRequests.forQuote.useQuery");
    expect(quoteDetailSource).toContain("{canEdit && linkedLdRequest && (");
    expect(quoteDetailSource).toContain('setExportOptions({ format: "PDF", run: handleSendPdfToLd })');
  });

  it("mantém os campos de cabeçalho Obra, Cliente e E-mail na prévia", () => {
    expect(previewSource).toContain('["OBRA", formData.obra || ""]');
    expect(previewSource).toContain('["CLIENTE", formData.cliente || ""]');
    expect(previewSource).toContain('["E-MAIL", formData.email || ""]');
  });

  it("encaminha os contatos do vendedor ativo selecionado do carrinho à prévia", () => {
    expect(cartSource).toContain("const sellersQuery = trpc.sellers.list.useQuery()");
    expect(cartSource).toContain("const visibleSellers = isSellerLogin ? (ownSeller ? [ownSeller] : []) : sellers");
    expect(cartSource).toContain("{visibleSellers.map(s => (");
    expect(cartSource).toContain("seller1Phone: sellers.find(s => String(s.id) === saveForm.seller1Id)?.phone || undefined");
    expect(cartSource).toContain("seller1Email: sellers.find(s => String(s.id) === saveForm.seller1Id)?.email || undefined");
    expect(previewSource).toContain("{formData.seller1Phone && <div>CONTATO: {formData.seller1Phone}</div>}");
    expect(previewSource).toContain("{formData.seller1Email && <div>E-MAIL: {formData.seller1Email}</div>}");
  });
});
