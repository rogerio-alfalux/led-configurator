import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { redactGuestQuoteSummary } from "./guestQuoteSummary";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("auditoria da Home para LD Convidado", () => {
  it("sanitiza os dois resumos comerciais que podem conter preço", () => {
    const renderedGuestSummaries = homeSource.match(/<LdGuestTechnicalSummary summary=\{orcamento\}/g) ?? [];
    const sanitizedCopies = homeSource.match(/isConvidado \? redactGuestQuoteSummary\(orcamento\) : orcamento/g) ?? [];
    expect(renderedGuestSummaries).toHaveLength(2);
    expect(sanitizedCopies).toHaveLength(2);
    expect(homeSource).toContain("!isConvidado && lbDetail !== null");
    expect(homeSource).toContain("!isConvidado && lbPreco === null");
  });

  it("mantém o carrinho e os botões de adicionar itens visíveis para o LD", () => {
    expect(homeSource).toContain('Link href="/carrinho"');
    expect(homeSource).toContain("LdGuestCartAccess cartCount={cartCount}");
    expect(homeSource).toContain("onClick={() => handleAddRevendaItem");
    expect(homeSource).toContain("onClick={handleAddCustomizadoItem}");
  });

  it("remove valores de resumos de luminária, LED BAR e produto com driver", () => {
    for (const summary of [
      "LUNA G 17W\nLUMINÁRIAS: R$ 166,50\nDRIVERS: R$ 54,00\nTOTAL: R$ 220,50",
      "LED BAR 3000K\nPREÇO: R$ 900,00\nTOTAL: R$ 900,00",
      "PERFIL TÉCNICO\nDRIVERS: R$ 45,00\nMONTADO COM MÓDULO LED",
    ]) {
      expect(redactGuestQuoteSummary(summary)).not.toMatch(/R\$/);
    }
  });
});
