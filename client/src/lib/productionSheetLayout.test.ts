import { describe, expect, it } from "vitest";
import {
  PRODUCTION_SHEET_ENHANCED_LAYOUT_FROM,
  resolveProductionSheetLayoutVersion,
} from "./productionSheetLayout";

describe("productionSheetLayout", () => {
  it("preserva o layout legado de orçamentos criados antes da mudança", () => {
    expect(resolveProductionSheetLayoutVersion(PRODUCTION_SHEET_ENHANCED_LAYOUT_FROM - 1)).toBe("legacy");
  });

  it("aplica o layout ampliado a novos orçamentos e pedidos diretos", () => {
    expect(resolveProductionSheetLayoutVersion(PRODUCTION_SHEET_ENHANCED_LAYOUT_FROM)).toBe("enhanced");
    expect(resolveProductionSheetLayoutVersion(undefined)).toBe("enhanced");
  });
});
