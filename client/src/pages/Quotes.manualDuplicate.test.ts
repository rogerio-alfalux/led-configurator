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

  it("usa o mesmo conjunto filtrado para o card Total e para a exportação", async () => {
    const source = await readFile(new URL("./Quotes.tsx", import.meta.url), "utf8");
    expect(source).toContain("const total = rows.length;");
    expect(source).toContain("const exportRows = (filteredAllData?.rows ?? []).filter(matchesClientFilters).sort(byReferenceDateDescending);");
  });

  it("aplica o intervalo mensal pela data comercial e usa a data de faturamento para registros faturados", async () => {
    const source = await readFile(new URL("./Quotes.tsx", import.meta.url), "utf8");
    expect(source).toContain("const isWithinSelectedDateRange");
    expect(source).toContain("const referenceDate = toBrasiliaFileDate(getQuoteReferenceDate(quote));");
    expect(source).toContain('if (quote.status === "invoiced") return quote.invoicedAt ?? quote.updatedAt ?? quote.createdAt;');
    expect(source).toContain('q.status === "invoiced" ? "Faturado em"');
  });
});
