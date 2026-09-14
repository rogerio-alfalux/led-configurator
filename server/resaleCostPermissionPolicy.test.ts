import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const detailSource = readFileSync(new URL("../client/src/pages/QuoteDetail.tsx", import.meta.url), "utf8");

describe("política de custos oficiais de Revenda e acesso limitado", () => {
  it("prioriza o custo oficial de Revenda antes de custo manual ou estimativa", () => {
    const officialCostIndex = routerSource.indexOf("const officialResaleCost");
    const manualCostIndex = routerSource.indexOf("const custoManual = getManualUnitCost", officialCostIndex);
    expect(officialCostIndex).toBeGreaterThan(0);
    expect(manualCostIndex).toBeGreaterThan(officialCostIndex);
    expect(routerSource).toContain("source: 'api_revenda'");

    const dashboardStart = dbSource.indexOf("for (const quote of approvedQuotes)");
    const dashboardOfficialCostIndex = dbSource.indexOf("const custoRevenda =", dashboardStart);
    const dashboardManualCostIndex = dbSource.indexOf("const custoManual = getManualUnitCost", dashboardStart);
    expect(dashboardOfficialCostIndex).toBeGreaterThan(dashboardStart);
    expect(dashboardManualCostIndex).toBeGreaterThan(dashboardOfficialCostIndex);
  });

  it("mantém o custo protegido no servidor sem substituir o preço de venda", () => {
    expect(routerSource).not.toContain("custo: p.custo");
    expect(homeSource).not.toContain("custoApiConfirmado: Number(product.custo)");
    expect(homeSource).toContain("unitPrice: precoVenda");
  });

  it("aplica no servidor e na interface a permissão limitada a Especial e Revenda", () => {
    expect(routerSource).toContain("PERMISSIONS.EDITAR_CUSTOS_ESPECIAIS_REVENDA");
    expect(routerSource).toContain("isSpecialOrResaleEligibleForManualCost(data)");
    expect(detailSource).toContain("limitedManualCostItemNumbers");
    expect(detailSource).toContain("!isLimitedCostEditor");
    expect(detailSource).toContain("hasQuotePermission(PERMISSIONS.EDITAR_CUSTOS_ESPECIAIS_REVENDA)");
  });
});
