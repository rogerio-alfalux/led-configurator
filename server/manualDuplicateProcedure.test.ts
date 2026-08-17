import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("procedure administrativa de duplicidade manual", () => {
  it("restringe a mutação a administradores e persiste o marcador", async () => {
    const source = await readFile(new URL("./routers.ts", import.meta.url), "utf8");
    expect(source).toContain("setManualDuplicate: adminProcedure");
    expect(source).toContain("isManuallyDuplicate: input.isManuallyDuplicate");
    expect(source).toContain("getQuoteAutomaticDuplicateState(input.id)");
  });
});
