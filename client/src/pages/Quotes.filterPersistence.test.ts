import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Meus Orçamentos: retorno com filtros preservados", () => {
  it("restaura os filtros da sessão e os remove somente ao limpar todos", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Quotes.tsx"), "utf8");

    expect(source).toContain("const [initialFilters] = useState(readQuoteListFilterState);");
    expect(source).toContain("persistQuoteListFilterState({");
    expect(source).toContain("clearQuoteListFilterState();");
    expect(source).toContain("const [page, setPage] = useState(initialFilters.page);");
  });
});
