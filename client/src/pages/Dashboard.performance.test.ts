import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("carregamento completo do Dashboard", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/pages/Dashboard.tsx"), "utf8");

  it("carrega automaticamente a inteligência comercial sem depender dos dados gerenciais", () => {
    expect(source).not.toContain("insightsRequested");
    expect(source).toContain('enabled: !!user && isAdmin');
    expect(source).not.toContain('Carregar análise detalhada');
  });

  it("expõe recuperação independente para falhas dos dados gerenciais e analíticos", () => {
    expect(source).toContain("managerError");
    expect(source).toContain("productAnalyticsError");
    expect(source).toContain("refetchManagerData");
    expect(source).toContain("refetchProductAnalytics");
    expect(source).toContain("refetchInterval: (query) => ((query.state.data as any)?.catalogUnavailable?.length ? 30_000 : false)");
  });

  it("apresenta faturamento por empresa somente a partir dos dados filtrados do Dashboard gerencial", () => {
    expect(source).toContain("invoicedByCompany");
    expect(source).toContain("Faturamento por Empresa");
    expect(source).toContain("Notas faturadas");
  });
});
