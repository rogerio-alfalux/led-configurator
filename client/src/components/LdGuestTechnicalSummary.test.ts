import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LdGuestTechnicalSummary } from "./LdGuestTechnicalSummary";

describe("LdGuestTechnicalSummary", () => {
  it("renderiza somente especificações técnicas e uma rota de carrinho", () => {
    const markup = renderToStaticMarkup(createElement(LdGuestTechnicalSummary, {
      summary: "LUNA G LED 17W RE 3000K 220V\nLUMINÁRIAS: R$ 166,50\nDRIVERS: R$ 54,00\nTOTAL: R$ 220,50",
    }));

    expect(markup).toContain("LUNA G LED 17W RE 3000K 220V");
    expect(markup).toContain('href="/carrinho"');
    expect(markup).not.toMatch(/R\$|LUMINÁRIAS:|DRIVERS:|TOTAL:/);
  });
});
