import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("abertura progressiva do orçamento salvo", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/pages/QuoteDetail.tsx"), "utf8");

  it("carrega a revisão persistida antes de iniciar os catálogos auxiliares", () => {
    const quoteQuery = source.indexOf("trpc.quotes.getById.useQuery(");
    const productCatalog = source.indexOf("trpc.alfalux.products.useQuery");
    expect(quoteQuery).toBeGreaterThan(-1);
    expect(productCatalog).toBeGreaterThan(quoteQuery);
    expect(source).toContain("enabled: Boolean(data), staleTime: 60_000");
  });
});
