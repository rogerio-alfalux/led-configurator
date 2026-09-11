import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(relativePath: string) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

describe("propagação comercial do preço de driver", () => {
  it("usa o preço persistido na linha de driver na pré-visualização e no PDF", async () => {
    const [preview, pdf] = await Promise.all([
      source("../components/ExcelPreviewModal.tsx"),
      source("./quotePdfGenerator.ts"),
    ]);

    expect(preview).toContain("drv.driverUnitPrice");
    expect(preview).toContain("_drvTotalPrice");
    expect(pdf).toContain("(drv.driverUnitPrice ?? 0) * drvQty");
    expect(pdf).toContain("↳ Driver: ${drv.driverModel || drv.driverCode || \"\"}");
  });
});
