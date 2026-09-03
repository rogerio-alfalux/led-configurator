import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

async function source(relativePath: string) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

describe("linha destacada de desconto nos documentos", () => {
  it("coloca o desconto em verde antes do prazo na pré-visualização", async () => {
    const preview = await source("../components/ExcelPreviewModal.tsx");
    expect(preview.indexOf("Desconto aplicado")).toBeLessThan(preview.indexOf("Prazo de fabricação e entrega:"));
    expect(preview).toContain('color: "#006600"');
  });

  it("coloca o desconto antes do prazo no PDF e no Excel", async () => {
    const pdf = await source("./quotePdfGenerator.ts");
    const excel = await source("./quoteExcelGenerator.ts");
    expect(pdf.indexOf("Desconto aplicado")).toBeLessThan(pdf.indexOf("Prazo de fabricação e entrega:"));
    expect(excel.indexOf("Desconto aplicado")).toBeLessThan(excel.indexOf("Prazo de fabricação e entrega:"));
    expect(excel).toContain('color: { argb: "FF006600" }');
  });
});

describe("frete não cotado nos documentos comerciais", () => {
  it("declara frete sob consulta para frete a calcular sem valor nos três documentos", async () => {
    const preview = await source("../components/ExcelPreviewModal.tsx");
    const pdf = await source("./quotePdfGenerator.ts");
    const excel = await source("./quoteExcelGenerator.ts");

    for (const document of [preview, pdf, excel]) {
      expect(document).toContain('if (!formData.freteValue || formData.freteValue <= 0)');
      expect(document).toContain('Frete sob consulta${localSuffix}');
      expect(document).toContain('freteType === "free" || freteIsento');
    }
  });

  it("mantém a menção ao frete no total com DIFAL/FCP somente quando há frete cotado", async () => {
    const preview = await source("../components/ExcelPreviewModal.tsx");
    const pdf = await source("./quotePdfGenerator.ts");
    const excel = await source("./quoteExcelGenerator.ts");

    expect(preview).toContain('hasFreteCotadoNoTotalPreview ? "FRETE + " : ""');
    expect(pdf).toContain('pdfHasFreteCotadoNoTotal ? "FRETE + " : ""');
    expect(excel).toContain('_temFretePagoNaBase\n        ? "TOTAL GERAL\\n(com FRETE + DIFAL/FCP):"\n        : "TOTAL GERAL\\n(com DIFAL/FCP):"');
  });
});
