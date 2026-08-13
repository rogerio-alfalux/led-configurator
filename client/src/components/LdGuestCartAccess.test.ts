import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LdGuestCartAccess } from "./LdGuestCartAccess";
import { LdGuestTechnicalSummary } from "./LdGuestTechnicalSummary";

describe("CTA e resumos renderizáveis do LD Convidado", () => {
  it("renderiza a ação do carrinho com rota direta e sem valores comerciais", () => {
    const markup = renderToStaticMarkup(createElement(LdGuestCartAccess, { cartCount: 2 }));
    expect(markup).toContain('href="/carrinho"');
    expect(markup).toContain("Enviar ao carrinho");
    expect(markup).not.toMatch(/R\$|PREÇO|CUSTO|TOTAL:/);
  });

  it.each([
    "LUNA G LED 17W RE 3000K 220V\nLUMINÁRIAS: R$ 166,50\nDRIVERS: R$ 54,00\nTOTAL: R$ 220,50",
    "LED BAR 3000K BIVOLT\nPREÇO: R$ 900,00\nTOTAL: R$ 900,00\nMONTADO COM DRIVER",
  ])("renderiza resumo técnico sem dados monetários", (summary) => {
    const markup = renderToStaticMarkup(createElement(LdGuestTechnicalSummary, { summary }));
    expect(markup).not.toMatch(/R\$|PREÇO|LUMINÁRIAS:|DRIVERS:|TOTAL:/);
  });
});
