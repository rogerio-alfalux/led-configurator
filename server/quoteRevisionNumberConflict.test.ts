import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isDuplicateKeyError } from "./databaseErrors";

describe("conflito de número ao salvar orçamento", () => {
  it("reconhece ER_DUP_ENTRY mesmo encapsulado pelo Drizzle", () => {
    const error = new Error("Failed query: update quotes");
    (error as Error & { cause?: unknown }).cause = {
      code: "ER_DUP_ENTRY",
      errno: 1062,
      sqlState: "23000",
      sqlMessage: "Duplicate entry '33.6666-26' for key 'quotes_quoteNumber_unique'",
    };

    expect(isDuplicateKeyError(error)).toBe(true);
    expect(isDuplicateKeyError(new Error("Connection timed out"))).toBe(false);
  });

  it("valida a disponibilidade antes do update e não regrava um número inalterado", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

    expect(source).toContain("await checkDuplicateQuoteNumber(requestedQuoteNumber, quoteId)");
    expect(source).toContain('code: "CONFLICT"');
    expect(source).toContain("requestedQuoteNumber !== existingForRevision.quote.quoteNumber");
    expect(source).toContain("quoteNumber: requestedQuoteNumber && requestedQuoteNumber !== existingForRevision.quote.quoteNumber");
    expect(source).toContain("if (isDuplicateKeyError(error))");
  });
});
