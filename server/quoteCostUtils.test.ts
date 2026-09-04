import { describe, expect, it } from "vitest";
import { calculateDashboardProductCost, getActiveQuoteVersionId, getManualUnitCost, selectActiveQuoteItems, selectApiProductForQuoteItem } from "./quoteCostUtils";

describe("selectActiveQuoteItems", () => {
  it("nunca soma itens de revisões históricas ao custo da revisão ativa", () => {
    const items = selectActiveQuoteItems(
      [
        { id: 22050001, status: "draft" },
        { id: 22020002, status: "published" },
      ],
      [
        { quoteVersionId: 22050001, item: "revisão ativa" },
        { quoteVersionId: 22020002, item: "histórico" },
      ],
    );

    expect(items).toEqual([{ quoteVersionId: 22050001, item: "revisão ativa" }]);
  });

  it("usa a revisão mais recente quando não há rascunho", () => {
    const items = selectActiveQuoteItems(
      [{ id: 2, status: "published" }, { id: 1, status: "published" }],
      [{ quoteVersionId: 2 }, { quoteVersionId: 1 }],
    );

    expect(items).toEqual([{ quoteVersionId: 2 }]);
  });

  it("identifica a revisão ativa usada para gravar ajustes manuais", () => {
    expect(getActiveQuoteVersionId([
      { id: 9, status: "published" },
      { id: 12, status: "draft" },
    ])).toBe(12);
  });

  it("resolve BAGEO pela potência da descrição quando o SKU é compartilhado", () => {
    const product = selectApiProductForQuoteItem(
      [
        { sku: "LDE-7035", name: "BAGEO SINUOSA E 20W/M", custo: 346.53 },
        { sku: "LDE-7035", name: "BAGEO SINUOSA E 40W/M", custo: 381.01 },
      ],
      "LDE-7035",
      "BAGEO SINUOSA E 20W/M 3000K ON/OFF 220V 12700MM",
    );

    expect(product?.custo).toBe(346.53);
  });

  it("não escolhe custo arbitrário quando um SKU compartilhado não tem descrição compatível", () => {
    const product = selectApiProductForQuoteItem(
      [
        { sku: "LDE-7035", name: "BAGEO SINUOSA E 20W/M", custo: 346.53 },
        { sku: "LDE-7035", name: "BAGEO SINUOSA E 40W/M", custo: 381.01 },
      ],
      "LDE-7035",
      "BAGEO SINUOSA E — VARIANTE INCOMPLETA",
    );

    expect(product).toBeUndefined();
  });

  it("encontra o LUNA mesmo quando o SKU salvo usa espaços e a API usa hífens", () => {
    const product = selectApiProductForQuoteItem(
      [{ sku: "LDE-6450.140.18B", name: "LUNA G LED 17W RE", custo: 66.6 }],
      "LDE 6450.140.18B",
      "LUNA G LED 17W RE 3000K ON/OFF 220V",
    );

    expect(product?.custo).toBe(66.6);
  });

  it("mostra somente o custo do corpo da BAGEO por metro no dashboard", () => {
    const result = calculateDashboardProductCost({
      category: "BAGEO",
      bodyCost: 346.53,
      driverCost: 29.99,
      qty: 1,
      driverQty: 7,
      lengthMm: 12700,
    });

    expect(result).toEqual({
      custoCorpo: 4400.93,
      custoDriver: 0,
      subtotal: 4400.93,
    });
  });
});

describe("getManualUnitCost", () => {
  it("preserva um custo manual positivo como substituição explícita", () => {
    expect(getManualUnitCost(190.46)).toBe(190.46);
  });

  it("não converte valores ausentes ou inválidos em custo manual", () => {
    expect(getManualUnitCost(null)).toBe(0);
    expect(getManualUnitCost("não informado")).toBe(0);
  });
});
