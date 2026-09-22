import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("pipeline visual do PDF oficial e LD", () => {
  const previewSource = readFileSync(resolve(process.cwd(), "client/src/components/ExcelPreviewModal.tsx"), "utf8");
  const quoteDetailSource = readFileSync(resolve(process.cwd(), "client/src/pages/QuoteDetail.tsx"), "utf8");
  const cartSource = readFileSync(resolve(process.cwd(), "client/src/pages/Cart.tsx"), "utf8");

  it("gera um único Blob vetorial determinístico para download e entrega ao LD", () => {
    expect(quoteDetailSource).toContain("const buildOfficialPdf = async (showIpi: boolean)");
    expect(quoteDetailSource).toContain("generateQuotePdfBlob(commercialQuoteItems, formData)");
    expect(quoteDetailSource.match(/await buildOfficialPdf\(showIpi\)/g)).toHaveLength(2);
    expect(quoteDetailSource).toContain("downloadPdfBlob(blob, buildQuotePdfFileName(formData))");
    expect(quoteDetailSource).toContain("pdfBase64: btoa(binary)");
    expect(quoteDetailSource).toContain("fileName: buildQuotePdfFileName(formData)");
    expect(quoteDetailSource).not.toContain("ldPdfCaptureOpen");
    expect(quoteDetailSource).not.toContain("onCapturePdf=");
  });

  it("não rasteriza a prévia HTML para nenhum PDF comercial", () => {
    expect(previewSource).toContain("const handleDownloadPDF = useCallback(async () => {");
    expect(previewSource).toContain("generateQuotePdfBlob(items, { ...formData, showIpi })");
    expect(previewSource).not.toContain("html2canvas");
    expect(previewSource).not.toContain("captureVisiblePreviewPdf");
    expect(previewSource).not.toContain("onCapturePdf");
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
