import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { LdCommercialOnly } from "./LdCommercialOnly";

describe("LdCommercialOnly", () => {
  it("não renderiza cartões comerciais para LD Convidado", () => {
    const html = renderToStaticMarkup(createElement(LdCommercialOnly, { isGuest: true }, createElement("section", null, "Resumo Para Orçamento")));
    expect(html).toBe("");
  });

  it("mantém cartões comerciais para perfis internos", () => {
    const html = renderToStaticMarkup(createElement(LdCommercialOnly, { isGuest: false }, createElement("section", null, "Resumo Para Pedido")));
    expect(html).toContain("Resumo Para Pedido");
  });
});
