import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("bloqueio de orçamento comercial para LD", () => {
  it("não mantém a montagem de revisão ou itens no endpoint acessível ao LD", async () => {
    const source = await readFile(new URL("./routers.ts", import.meta.url), "utf8");
    const endpoint = source.slice(source.indexOf("currentPdfData:"), source.indexOf("adminList:"));
    expect(endpoint).toContain("LD Convidado não possui acesso a dados comerciais do orçamento");
    expect(endpoint).not.toContain("getQuoteById(request.adminQuoteId)");
  });
});
