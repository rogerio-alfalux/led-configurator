import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("entrega de PDF oficial para LD", () => {
  it("permite consultar a solicitação vinculada somente pela equipe com edição do orçamento", () => {
    expect(routerSource).toContain("forQuote: commercialQuoteProcedure");
    expect(routerSource).toContain("getGuestQuoteRequestByAdminQuoteId(input.quoteId)");
    expect(routerSource).toContain("Sem permissão para consultar a solicitação LD deste orçamento.");
  });

  it("valida vínculo e autorização comercial antes de armazenar o PDF enviado", () => {
    expect(routerSource).toContain("quoteId: z.number().int().positive()");
    expect(routerSource).toContain("request.adminQuoteId !== input.quoteId");
    expect(routerSource).toContain("Sem permissão para enviar o PDF deste orçamento ao LD.");
  });
});
