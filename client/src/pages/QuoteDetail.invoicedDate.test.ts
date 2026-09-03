import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("data de faturamento no detalhe do orçamento", () => {
  it("preenche a data vigente de Brasília, permite edição e envia somente ao faturar", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain("const [invoicedDateInput, setInvoicedDateInput] = useState(\"\")");
    expect(source).toContain('setInvoicedDateInput(v === "invoiced" ? toBrasiliaFileDate(new Date()) : "")');
    expect(source).toContain('id="invoiced-date"');
    expect(source).toContain('invoicedDate: newStatus === "invoiced" ? invoicedDateInput : undefined');
  });
});
