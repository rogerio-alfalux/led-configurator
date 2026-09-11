import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("hierarquia comercial de status", () => {
  it("filtra aprovados incluindo faturados na listagem e na API legada", () => {
    const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const apiSource = readFileSync(resolve(process.cwd(), "server/apiV1Router.ts"), "utf8");

    expect(dbSource).toContain('inArray(quotes.status, ["approved", "invoiced"])');
    expect(dbSource).toContain("status IN ('approved', 'invoiced')");
    expect(apiSource).toContain('inArray(quotes.status, ["approved", "invoiced"])');
  });
});
