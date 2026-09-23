import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("numeração automática de novos orçamentos", () => {
  it("não expõe mais o campo editável e envia a criação sem quoteNumber", () => {
    const source = read("client/src/pages/Cart.tsx");
    const clientTab = source.slice(
      source.indexOf("{/* ─── Aba Cliente ─── */}"),
      source.indexOf("{/* ─── Aba Equipe ─── */}"),
    );
    const saveMutation = source.slice(
      source.indexOf("saveQuoteMutation.mutate({"),
      source.indexOf("saveQuoteMutation.mutate({") + 1_500,
    );

    expect(clientTab).not.toContain("Número do Orçamento");
    expect(clientTab).not.toContain("formatCommercialQuoteNumberInput");
    expect(saveMutation).not.toContain("quoteNumber:");
    expect(source).toContain("O servidor atribui o");
  });

  it("remove o número da entrada pública de quotes.save", () => {
    const source = read("server/routers.ts");
    const saveRoute = source.slice(source.indexOf("save: commercialQuoteProcedure"), source.indexOf("addRevision: commercialQuoteProcedure"));

    expect(saveRoute).not.toContain("quoteNumber: z.string().optional()");
    expect(saveRoute).not.toContain("input.quoteNumber?.trim()");
  });
});
