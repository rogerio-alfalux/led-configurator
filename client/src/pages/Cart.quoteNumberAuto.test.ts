import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("número manual de novos orçamentos", () => {
  it("expõe prefixo e ano travados com sequência central editável", () => {
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
    expect(clientTab).toContain("formatCommercialQuoteSequenceInput(e.target.value)");
    expect(clientTab).toContain("buildCommercialQuoteNumber(");
    expect(clientTab).toContain("Prefixo ${selectedSellerPrefix} e ano ${commercialQuoteYear}");
    expect(clientTab).toContain("inputMode=\"numeric\"");
    expect(clientTab).toContain("Informe os quatro dígitos da sequência.");
    expect(saveMutation).toContain("quoteNumber: saveForm.quoteNumber.trim()");
    expect(source).toContain("if (!isCommercialQuoteNumber(saveForm.quoteNumber))");
  });

  it("sugere apenas com Vendedor 1 selecionado e usa o próximo número do código dele", () => {
    const source = read("client/src/pages/Cart.tsx");

    expect(source).toContain("{ enabled: saveDialogOpen && seller1IdNum != null, staleTime: 0 }");
    expect(source).toContain("sellerId: seller1IdNum");
    expect(source).toContain("selectedSellerCode");
    expect(source).toContain("suggestedNumberMatchesSelectedSeller");
    expect(source).toContain("isCommercialQuoteNumberForSeller(");
    expect(source).toContain("prev.quoteNumberManuallyEdited");
    expect(source).toContain("quoteNumber: \"\", quoteNumberManuallyEdited: false");
    expect(source).toContain("Selecione o Vendedor 1 na aba Equipe para liberar a sequência.");
  });

  it("limpa a sequência anterior ao trocar o vendedor para nunca carregar outro prefixo", () => {
    const source = read("client/src/pages/Cart.tsx");

    expect(source).toContain("quoteNumberManuallyEdited: sequence.length > 0");
    expect(source).toContain("O prefixo é exclusivo do Vendedor 1.");
    expect(source).toContain("quoteNumber: \"\",\n                                    quoteNumberManuallyEdited: false");
  });

  it("mantém a sequência livre para assistentes, sem liberar o prefixo", () => {
    const source = read("client/src/pages/Cart.tsx");
    const clientTab = source.slice(
      source.indexOf("{/* ─── Aba Cliente ─── */}"),
      source.indexOf("{/* ─── Aba Equipe ─── */}"),
    );

    expect(clientTab).not.toContain("disabled={isAssistantLogin}");
    expect(clientTab).toContain("disabled={!selectedSellerPrefix}");
    expect(clientTab).toContain("quoteNumberManuallyEdited: sequence.length > 0");
    expect(clientTab).toContain("Ao apagar a sequência");
    expect(source).toContain("suggestQuery.isError");
    expect(source).toContain("Informe o número manualmente.");
  });

  it("valida formato, prefixo do vendedor e duplicidade no servidor", () => {
    const source = read("server/routers.ts");
    const saveRoute = source.slice(source.indexOf("save: commercialQuoteProcedure"), source.indexOf("addRevision: commercialQuoteProcedure"));

    expect(saveRoute).toContain("quoteNumber: z.string().optional()");
    expect(saveRoute).toContain("!isCommercialQuoteNumber(requestedQuoteNumber)");
    expect(saveRoute).toContain("await assertQuoteNumberUsesSellerPrefix(requestedQuoteNumber, saveInput.seller1Id)");
    expect(saveRoute).toContain("await checkDuplicateQuoteNumber(requestedQuoteNumber)");
    expect(saveRoute).toContain("if (isDuplicateKeyError(error))");
    expect(source).toContain("async function assertQuoteNumberUsesSellerPrefix");
    expect(source).toContain("isCommercialQuoteNumberForSeller(quoteNumber, seller?.code)");
  });
});
