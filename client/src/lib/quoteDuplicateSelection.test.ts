import { describe, expect, it } from "vitest";
import { selectQuotesWithoutDuplicates } from "./quoteDuplicateSelection";

describe("selectQuotesWithoutDuplicates", () => {
  it("mantém uma referência de cada grupo automático e descarta duplicados manuais", () => {
    const quotes = [
      { id: 1, duplicateKey: "obra-a|1000", isDuplicate: true },
      { id: 2, duplicateKey: "obra-a|1000", isDuplicate: true },
      { id: 3, duplicateKey: "obra-b|2000", isDuplicate: true },
      { id: 4, duplicateKey: "obra-b|2000", isDuplicate: true },
      { id: 5, isManuallyDuplicate: true },
      { id: 6 },
    ];

    expect(selectQuotesWithoutDuplicates(quotes).map((quote) => quote.id)).toEqual([1, 3, 6]);
  });

  it("aceita a marcação manual transitória da tela antes da consulta ser atualizada", () => {
    const quotes = [
      { id: 10 },
      { id: 11 },
    ];

    const manualOverrides = new Set([11]);
    expect(selectQuotesWithoutDuplicates(quotes, (quote) => manualOverrides.has(quote.id)).map((quote) => quote.id)).toEqual([10]);
  });
});
