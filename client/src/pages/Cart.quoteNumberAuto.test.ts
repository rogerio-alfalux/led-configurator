import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("número manual de novos orçamentos", () => {
  it("expõe o campo na aba Cliente com máscara e validação do formato comercial", () => {
    const source = read("client/src/pages/Cart.tsx");
    const clientTab = source.slice(
      source.indexOf("{/* ─── Aba Cliente ─── */}"),
      source.indexOf("{/* ─── Aba Equipe ─── */}"),
    );
    const saveMutation = source.slice(
      source.indexOf("saveQuoteMutation.mutate({"),
      source.indexOf("saveQuoteMutation.mutate({") + 1_700,
    );

    expect(clientTab).toContain("Número do Orçamento");
    expect(clientTab).toContain("formatCommercialQuoteNumberInput(e.target.value)");
    expect(clientTab).toContain("inputMode=\"numeric\"");
    expect(clientTab).toContain("Complete o formato xx.xxxx-xx.");
    expect(saveMutation).toContain("quoteNumber: saveForm.quoteNumber.trim()");
    expect(source).toContain("if (!isCommercialQuoteNumber(saveForm.quoteNumber))");
  });

  it("mantém a sugestão automática somente como preenchimento inicial e preserva a edição manual", () => {
    const source = read("client/src/pages/Cart.tsx");

    expect(source).toContain("prev.quoteNumber.trim()");
    expect(source).toContain("saveForm.quoteNumber || suggestQuery.data?.suggested");
  });

  it("valida formato e duplicidade no servidor antes de criar e protege contra corrida", () => {
    const source = read("server/routers.ts");
    const saveRoute = source.slice(source.indexOf("save: commercialQuoteProcedure"), source.indexOf("addRevision: commercialQuoteProcedure"));

    expect(saveRoute).toContain("quoteNumber: z.string().optional()");
    expect(saveRoute).toContain("!isCommercialQuoteNumber(requestedQuoteNumber)");
    expect(saveRoute).toContain("await checkDuplicateQuoteNumber(requestedQuoteNumber)");
    expect(saveRoute).toContain("if (isDuplicateKeyError(error))");
  });
});
