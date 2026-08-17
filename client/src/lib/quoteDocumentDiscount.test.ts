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
