import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { redactGuestQuoteSummary } from "./guestQuoteSummary";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const cssSource = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

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
    expect(homeSource).toContain('title="Carrinho de orçamento"');
    expect(homeSource).toContain('id="downlight-add-cart"');
    expect(homeSource).toContain('id="arandela-add-cart"');
    expect(homeSource).toContain('id="spot-add-cart"');
    expect(homeSource).toContain('id="profile-add-cart"');
    expect(homeSource).toContain('Resumo da Configuração');
    expect(homeSource).toContain("LdProfileCartControls");
    expect(homeSource).toContain("ResultTechnicalCartControls");
    expect(homeSource).toContain("onClick={() => handleAddRevendaItem");
    expect(homeSource).toContain("onClick={handleAddCustomizadoItem}");
  });

  it("oculta os resumos comerciais e a produção no modo LD, sem removê-los dos outros perfis", () => {
    expect(homeSource).toContain('className="ld-commercial-only shadow-sm border-blue-500/30"');
    expect(homeSource).toContain('<div className="ld-commercial-only">');
  });

  it("oculta explicitamente os resumos de Arandela e Spot no modo LD Convidado", () => {
    const arandelaSection = homeSource.slice(homeSource.indexOf("Resultado — Arandela"), homeSource.indexOf("Resultado — Spot"));
    const spotSection = homeSource.slice(homeSource.indexOf("Resultado — Spot"));
    const guestHiddenCard = 'className={isConvidado ? "hidden" : "shadow-sm border-';
    expect(arandelaSection).toContain(`${guestHiddenCard}blue-500/30"}`);
    expect(arandelaSection).toContain(`${guestHiddenCard}green-500/30"}`);
    expect(spotSection).toContain(`${guestHiddenCard}blue-500/30"}`);
    expect(spotSection).toContain(`${guestHiddenCard}green-500/30"}`);
    expect(cssSource).toContain('.convidado-mode .border-blue-500\\/30');
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
