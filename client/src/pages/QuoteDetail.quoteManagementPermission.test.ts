import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { shouldBindCommercialQuoteTeam } from "@shared/quoteOwnership";

describe("Gerenciar Orçamentos no detalhe", () => {
  it("não restringe os controles de equipe para vendedor ou assistente com a permissão", () => {
    expect(shouldBindCommercialQuoteTeam("assistente", true)).toBe(false);
    expect(shouldBindCommercialQuoteTeam("vendedor", true)).toBe(false);
    expect(shouldBindCommercialQuoteTeam("assistente", false)).toBe(true);
    expect(shouldBindCommercialQuoteTeam("vendedor", false)).toBe(true);
  });

  it("usa a permissão Gerenciar Orçamentos ao definir bloqueio e lista de equipe", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/QuoteDetail.tsx"), "utf8");

    expect(source).toContain("const canManageQuoteTeam = hasQuotePermission(PERMISSIONS.GERENCIAR_ORCAMENTOS)");
    expect(source).toContain('const isSellerEditing = quoteUserRole === "vendedor" && shouldBindCommercialQuoteTeam(quoteUserRole, canManageQuoteTeam)');
    expect(source).toContain('const isAssistantEditing = quoteUserRole === "assistente" && shouldBindCommercialQuoteTeam(quoteUserRole, canManageQuoteTeam)');
    expect(source).toContain("const visibleEditSellers = isSellerEditing && !isOwnDuplicatedQuote");
    expect(source).toContain("const visibleEditAssistants = isAssistantEditing && !isOwnDuplicatedQuote");
  });
});
