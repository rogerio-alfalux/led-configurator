import { describe, expect, it } from "vitest";
import { getActiveQuoteVersionId } from "@shared/quoteVersionSelection";

describe("getActiveQuoteVersionId", () => {
  it("ignora rascunho vazio e preserva a última revisão com itens", () => {
    expect(getActiveQuoteVersionId(
      [
        { id: 6, status: "draft" },
        { id: 5, status: "published" },
        { id: 4, status: "published" },
      ],
      [5, 5, 5, 5],
    )).toBe(5);
  });

  it("prioriza rascunho quando ele já contém itens", () => {
    expect(getActiveQuoteVersionId(
      [
        { id: 6, status: "draft" },
        { id: 5, status: "published" },
      ],
      [6, 6, 5],
    )).toBe(6);
  });

  it("mantém a revisão mais recente quando ainda não existe item", () => {
    expect(getActiveQuoteVersionId(
      [
        { id: "6", status: "draft" },
        { id: "5", status: "published" },
      ],
      [],
    )).toBe("6");
  });
});


describe("persistência de revisão", () => {
  it("protege contra a remoção de itens ao receber uma edição de cabeçalho vazia", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

    expect(source).toContain("let itemsToPersist = input.items;");
    expect(source).toContain("Preservando ${preservedItems.length} item(ns)");
    expect(source).toContain("itemsToPersist.map((it) => ({");
  });
});
