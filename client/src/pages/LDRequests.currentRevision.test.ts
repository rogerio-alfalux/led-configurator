import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("pré-visualização LD na revisão vigente", () => {
  it("usa a revisão selecionada pelo servidor em vez do currentVersion legado", async () => {
    const source = await readFile(new URL("./LDRequests.tsx", import.meta.url), "utf8");
    expect(source).toContain("payload.selectedVersion ?? quote.currentVersion");
  });

  it("inclui o desconto nos Dados Internos do orçamento", async () => {
    const source = await readFile(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
    expect(source).toContain("Desconto aplicado:");
  });
});
