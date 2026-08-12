import { describe, expect, it } from "vitest";
import { selectActiveQuoteItems } from "./quoteCostUtils";

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
});
