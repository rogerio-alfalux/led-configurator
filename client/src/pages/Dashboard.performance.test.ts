import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("carregamento progressivo do Dashboard", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/pages/Dashboard.tsx"), "utf8");

  it("mantém a inteligência comercial disponível sob demanda, sem bloquear o dashboard inicial", () => {
    expect(source).toContain('const [insightsRequested, setInsightsRequested] = useState(false)');
    expect(source).toContain('enabled: !!user && isAdmin && !managerLoading && insightsRequested');
    expect(source).toContain('Carregar análise detalhada');
  });
});
