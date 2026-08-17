import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("dados atuais de orçamento para LD", () => {
  it("prioriza a versão mais recente ao montar o payload do LD", async () => {
    const source = await readFile(new URL("./routers.ts", import.meta.url), "utf8");
    expect(source).toContain("const currentVersion = [...quoteData.versions]");
    expect(source).toContain("selectedVersion: currentVersion?.version");
  });
});
