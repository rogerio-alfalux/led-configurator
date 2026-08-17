import { describe, expect, it } from "vitest";
import {
  QUOTE_PREVIEW_COLUMN_COUNT,
  QUOTE_PREVIEW_SUBITEM_BLANK_COLUMN_COUNT,
} from "./quotePreviewLayout";

describe("layout da prévia comercial", () => {
  it("mantém 12 colunas e seis células vazias entre descrição e valores de subitens", () => {
    expect(QUOTE_PREVIEW_COLUMN_COUNT).toBe(12);
    expect(QUOTE_PREVIEW_SUBITEM_BLANK_COLUMN_COUNT).toBe(6);
    expect(3 + QUOTE_PREVIEW_SUBITEM_BLANK_COLUMN_COUNT + 3).toBe(QUOTE_PREVIEW_COLUMN_COUNT);
  });
});
