import { describe, expect, it } from "vitest";
import {
  QUOTE_PREVIEW_COLUMN_COUNT,
  QUOTE_PREVIEW_COLUMN_WIDTHS,
  QUOTE_PREVIEW_SUBITEM_BLANK_COLUMN_COUNT,
} from "./quotePreviewLayout";

describe("layout da prévia comercial", () => {
  it("mantém 12 colunas e seis células vazias entre descrição e valores de subitens", () => {
    expect(QUOTE_PREVIEW_COLUMN_COUNT).toBe(12);
    expect(QUOTE_PREVIEW_SUBITEM_BLANK_COLUMN_COUNT).toBe(6);
    expect(3 + QUOTE_PREVIEW_SUBITEM_BLANK_COLUMN_COUNT + 3).toBe(QUOTE_PREVIEW_COLUMN_COUNT);
  });

  it("reserva 10% para a foto de 64px e mantém preços unitário e total legíveis", () => {
    expect(QUOTE_PREVIEW_COLUMN_WIDTHS).toHaveLength(QUOTE_PREVIEW_COLUMN_COUNT);
    expect(QUOTE_PREVIEW_COLUMN_WIDTHS.reduce((sum, width) => sum + width, 0)).toBe(100);
    expect(QUOTE_PREVIEW_COLUMN_WIDTHS[1]).toBe(10);
    expect(QUOTE_PREVIEW_COLUMN_WIDTHS[10]).toBeGreaterThanOrEqual(9);
    expect(QUOTE_PREVIEW_COLUMN_WIDTHS[11]).toBeGreaterThanOrEqual(9);
  });
});
