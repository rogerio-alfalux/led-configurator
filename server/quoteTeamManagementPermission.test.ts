import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Gerenciar Orçamentos no servidor", () => {
  it("autoriza qualquer orçamento e não reimpõe a equipe do usuário autorizado", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

    expect(source).toContain("if (userId && await hasUserPermission(userId, userRole, PERMISSIONS.GERENCIAR_ORCAMENTOS)) return true;");
    expect(source).toContain("const canManageQuotes = user.id != null && await hasUserPermission(");
    expect(source).toContain("if (!shouldBindCommercialQuoteTeam(user.role, canManageQuotes)) {");
    expect(source).toContain("const identityTeam = await getIdentityBoundTeam(ctx.user, existingForRevision.quote);");
  });

  it("não restringe a lista nem o detalhe ao vendedor vinculado quando a assistente pode gerenciar orçamentos", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

    expect(source).toContain('const canManageAnyQuote = ctx.user.role === "admin"\n          || await hasUserPermission(ctx.user.id, ctx.user.role, PERMISSIONS.GERENCIAR_ORCAMENTOS);');
    expect(source).toContain("if (!canInvoiceAnyQuote && !canManageAnyQuote && ctx.user.role === 'assistente' && ctx.user.email)");
  });
});
