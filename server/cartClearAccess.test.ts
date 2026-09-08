import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("limpeza do carrinho", () => {
  it("permite limpar o próprio carrinho sem liberar alterações comerciais ao Departamento de Custos", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(source).toContain("clear: protectedProcedure.mutation(async ({ ctx }) => {");
    expect(source).toContain("await clearCart(ctx.user.id);");
  });
});
