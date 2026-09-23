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

  it("preenche, permite corrigir e envia a data de aprovação somente ao aprovar", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain('const [approvedDateInput, setApprovedDateInput] = useState("")');
    expect(source).toContain('setApprovedDateInput(v === "approved" ? toBrasiliaFileDate(new Date()) : "")');
    expect(source).toContain('id="approved-date"');
    expect(source).toContain('approvedDate: newStatus === "approved" ? approvedDateInput : undefined');
    expect(source).toContain('toast.error("Informe a data de aprovação.")');
  });

  it("permite reabrir o editor de data de um orçamento já faturado", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain('open && quote.status === "invoiced" && canInvoice');
    expect(source).toContain('toBrasiliaFileDate((quote as any).invoicedAt)');
    expect(source).toContain('disabled={quote.status !== "approved" && quote.status !== "invoiced"}');
    expect(source).toContain('"Faturado (editar data)"');
  });

  it("permite reabrir o editor de data de um orçamento já aprovado", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain('open && quote.status === "approved"');
    expect(source).toContain('toBrasiliaFileDate((quote as any).approvedAt)');
    expect(source).toContain("Data atual de aprovação. Altere-a para corrigir a data efetiva do fechamento.");
  });
});
