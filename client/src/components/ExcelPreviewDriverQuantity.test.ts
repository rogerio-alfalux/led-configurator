import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("pré-visualização: quantidade individual dos drivers", () => {
  it("não aplica a quantidade agregada do item a cada modelo do P07", () => {
    const source = readFileSync(
      resolve(process.cwd(), "client/src/components/ExcelPreviewModal.tsx"),
      "utf8",
    );

    expect(source).toContain("getEffectiveDriverLineQuantity(item, drv)");
    expect(source).not.toContain("_drvQtyPerUnitPreview");
  });
});
