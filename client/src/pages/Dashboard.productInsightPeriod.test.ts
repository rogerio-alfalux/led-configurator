import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("período da Inteligência de Produtos", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/pages/Dashboard.tsx"), "utf8");

  it("mantém um recorte próprio para a consulta analítica, sem reutilizar o filtro do topo", () => {
    expect(source).toContain("const productInsightQueryInput = useMemo(");
    expect(source).toContain("trpc.dashboard.productAnalytics.useQuery(\n    productInsightQueryInput,");
    expect(source).toContain("productInsightDateFrom");
    expect(source).toContain("productInsightDateTo");
    expect(source).toContain("productInsightYear");
    expect(source).toContain("productInsightMonth");
  });

  it("expõe o período da seção e o quarto consolidado de cliente", () => {
    expect(source).toContain("Período da Inteligência de Produtos");
    expect(source).toContain("Produtos, Famílias, Categorias, Clientes e Obras desta seção");
    expect(source).toContain('title="Em aberto" count={selectedClient.openQuoteCount} amount={selectedClient.openAmount}');
  });
});
