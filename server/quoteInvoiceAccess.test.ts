import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("acesso administrativo ao faturamento", () => {
  it("concede faturamento ao administrador e mantém a permissão nominal para a responsável designada", async () => {
    const source = await readFile(new URL("./routers.ts", import.meta.url), "utf8");
    expect(source).toContain('ctx.user.role === "admin"\n          || await hasExplicitUserPermission(ctx.user.id, PERMISSIONS.FATURAR_ORCAMENTOS)');
  });

  it("não remove a exigência de o orçamento estar aprovado", async () => {
    const source = await readFile(new URL("./quoteStatusPolicy.ts", import.meta.url), "utf8");
    expect(source).toContain('currentStatus !== "approved"');
  });
});
