import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("Editar Itens: equipamentos especiais e markup", () => {
  it("atualiza o MKP do corpo e sinaliza sem bloquear preço abaixo do mínimo da API", () => {
    const source = read("client/src/pages/QuoteDetail.tsx");

    expect(source).toContain("getBodyUnitPriceMarkup");
    expect(source).toContain("mkpCustom: markup.markup");
    expect(source).toContain("Atenção: preço abaixo do mínimo da API");
    expect(source).toContain("MKP praticado:");
    expect(source).toContain("border-destructive text-destructive");
    expect(source).not.toContain("Nenhuma alteração foi aplicada.");
    expect(source).toContain("MKP atual:");
  });

  it("mantém equipamentos especiais como sublinhas incluídas na prévia e no PDF", () => {
    const preview = read("client/src/components/ExcelPreviewModal.tsx");
    const pdf = read("client/src/lib/quotePdfGenerator.ts");

    expect(preview).toContain("special-equipment-");
    expect(preview).toContain("↳ Equipamento:");
    expect(preview).toContain("incluído no preço");
    expect(pdf).toContain("isEquipmentRow");
    expect(pdf).toContain("↳ Equipamento:");
    expect(pdf).toContain("incluído no preço");
  });
});
