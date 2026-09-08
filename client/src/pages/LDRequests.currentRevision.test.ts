import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("resposta de solicitações LD sem valores comerciais", () => {
  it("não monta preview comercial nem busca dados comerciais do orçamento", async () => {
    const source = await readFile(new URL("./LDRequests.tsx", import.meta.url), "utf8");
    expect(source).not.toContain("ExcelPreviewModal");
    expect(source).not.toContain("currentPdfData");
    expect(source).toContain("markResponseViewed");
  });

  it("inclui o desconto nos Dados Internos do orçamento", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain("Desconto aplicado:");
  });
});
