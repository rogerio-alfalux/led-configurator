import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const detailSource = readFileSync(new URL("./QuoteDetail.tsx", import.meta.url), "utf8");
const cartSource = readFileSync(new URL("./Cart.tsx", import.meta.url), "utf8");
const routerSource = readFileSync(new URL("../../../server/routers.ts", import.meta.url), "utf8");

describe("reedição de custo estimado de Produtos Especiais", () => {
  it("não classifica admin nem Departamento de Custos como editor limitado", () => {
    expect(detailSource).toContain("!isAdmin && !isCostDepartment && Array.isArray");
  });

  it("sincroniza custo especial do carrinho e do Dashboard sem tocar no preço de venda", () => {
    expect(cartSource).toContain("patch.custoManual = !isNaN(custoVal) && custoVal > 0 ? custoVal : null;");
    expect(routerSource).toContain("data.specialCustoUnitario = input.custoManual;");
    expect(routerSource).toContain("data.custoManual ?? (isSpecialItem ? data.specialCustoUnitario : null)");
  });
});
