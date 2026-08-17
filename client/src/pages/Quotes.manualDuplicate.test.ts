import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("duplicidade manual de orçamentos", () => {
  it("oferece o controle na listagem e exclui duplicados manuais do valor sem duplicados", async () => {
    const source = await readFile(new URL("./Quotes.tsx", import.meta.url), "utf8");
    expect(source).toContain("setManualDuplicate");
    expect(source).toContain("if (isManuallyDuplicate(q)) return false;");
    expect(source).toContain("manualDuplicateOverrides");
    expect(source).toContain("await utils.quotes.list.refetch()");
    expect(source).toContain("isAutomaticallyDuplicate");
  });

  it("oferece o controle no cabeçalho do orçamento", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain("Duplicado manual");
    expect(source).toContain("setManualDuplicateMutation");
  });

  it("oferece caixas configuráveis com Valor dos Duplicados no padrão atual", async () => {
    const source = await readFile(new URL("./Quotes.tsx", import.meta.url), "utf8");
    expect(source).toContain("duplicateValue: true");
    expect(source).toContain("ldProspecting: false");
    expect(source).toContain('label: "Valor dos Duplicados"');
    expect(source).toContain("Personalizar caixas");
    expect(source).toContain("localStorage.setItem(QUOTE_METRIC_PREFERENCES_KEY");
    expect(source).toContain("userPreferences.quoteMetricVisibility");
    expect(source).toContain("saveQuoteMetricVisibility");
  });
});
