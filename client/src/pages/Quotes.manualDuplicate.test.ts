import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("duplicidade manual de orçamentos", () => {
  it("oferece o controle na listagem e aplica a marcação manual à seleção comercial", async () => {
    const source = await readFile(new URL("./Quotes.tsx", import.meta.url), "utf8");
    expect(source).toContain("setManualDuplicate");
    expect(source).toContain("selectQuotesWithoutDuplicates");
    expect(source).toContain("manualDuplicateOverrides");
    expect(source).toContain("await utils.quotes.list.refetch()");
    expect(source).toContain("isAutomaticallyDuplicate");
  });

  it("oferece o controle no cabeçalho do orçamento", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain("Duplicado manual");
    expect(source).toContain("setManualDuplicateMutation");
  });

  it("exclui duplicados dos indicadores padrão e mantém apenas o valor informativo", async () => {
    const source = await readFile(new URL("./Quotes.tsx", import.meta.url), "utf8");
    expect(source).toContain("duplicateValue: true");
    expect(source).not.toContain("valueWithoutDuplicates: true");
    expect(source).toContain("ldProspecting: false");
    expect(source).toContain('label: "Valor dos Duplicados"');
    expect(source).not.toContain('label: "Valor sem duplicados"');
    expect(source).toContain("selectQuotesWithoutDuplicates(rawCommercialRows, isManuallyDuplicate)");
    expect(source).toContain("Personalizar caixas");
    expect(source).toContain("localStorage.setItem(QUOTE_METRIC_PREFERENCES_KEY");
    expect(source).toContain("userPreferences.quoteMetricVisibility");
    expect(source).toContain("saveQuoteMetricVisibility");
  });

  it("usa o conjunto comercial sem duplicados para os cards e para a exportação padrão", async () => {
    const source = await readFile(new URL("./Quotes.tsx", import.meta.url), "utf8");
    expect(source).toContain("const total = rowsWithoutDuplicates.length;");
    expect(source).toContain("const exportRowsBeforeDuplicateSelection");
    expect(source).toContain("selectQuotesWithoutDuplicates(exportRowsBeforeDuplicateSelection, isManuallyDuplicate)");
    expect(source).toContain("Duplicados excluídos por padrão");
  });

  it("aplica o intervalo mensal pela data comercial e usa a data de faturamento para registros faturados", async () => {
    const source = await readFile(new URL("./Quotes.tsx", import.meta.url), "utf8");
    expect(source).toContain("const isWithinSelectedDateRange");
    expect(source).toContain("const referenceDate = toBrasiliaFileDate(value as string | Date);");
    expect(source).toContain('if (quote.status === "invoiced") return quote.invoicedAt ?? quote.updatedAt ?? quote.createdAt;');
    expect(source).toContain('q.status === "invoiced" ? <>');
  });
});
