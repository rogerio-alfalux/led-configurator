import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/QuoteDetail.tsx"), "utf8");

describe("PDF do orçamento quando a publicação da revisão falha", () => {
  it("não bloqueia o PDF por uma falha de arquivamento", () => {
    const handler = source.slice(
      source.indexOf("const handleGeneratePdf"),
      source.indexOf("const handleSendPdfToLd"),
    );

    expect(handler).toContain("let revisionForPdf = exportRevisionCount");
    expect(handler).toContain("revisionForPdf = published.revisionCount");
    expect(handler).toContain("PDF gerado. A revisão atual permanece como rascunho");
    expect(handler).toContain("setPdfRevisionCount(revisionForPdf)");
    expect(handler).toContain("setPdfPrintOpen(true)");
    expect(handler).not.toContain('toast.error("Não foi possível arquivar a revisão antes de gerar o PDF.")');
  });

  it("mantém no PDF o número da revisão efetivamente arquivada", () => {
    expect(source).toContain("const [pdfRevisionCount, setPdfRevisionCount] = useState<number | null>(null)");
    expect(source).toContain("revisionCount: pdfRevisionCount ?? exportRevisionCount");
    expect(source).toContain("setPdfRevisionCount(null)");
  });
});
