import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("filtros administrativos de origem LD", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/pages/Quotes.tsx"), "utf8");

  it("permite filtrar orçamentos por origem LD e status de envio do PDF", () => {
    expect(source).toContain('const [ldOriginFilter, setLdOriginFilter]');
    expect(source).toContain('const [ldResponseFilter, setLdResponseFilter]');
    expect(source).toContain('ldRequest?.status !== "in_review"');
    expect(source).toContain('ldRequest?.status !== "quote_ready"');
    expect(source).toContain("Somente solicitações LD");
  });
});
