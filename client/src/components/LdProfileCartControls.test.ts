import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LdProfileCartControls, normalizeLdProfileQuantity } from "./LdProfileCartControls";

describe("LdProfileCartControls", () => {
  it("renderiza Item em planta, Quantidade e CTA verde para LD", () => {
    const html = renderToStaticMarkup(createElement(LdProfileCartControls, { itemEmPlanta: "L1", quantity: 2, onItemEmPlantaChange: () => undefined, onQuantityChange: () => undefined, onSendToCart: () => undefined }));
    expect(html).toContain('aria-label="Item em planta do perfil"');
    expect(html).toContain('aria-label="Quantidade do perfil"');
    expect(html).toContain("Enviar ao carrinho");
  });

  it.each([["", 1], ["0", 1], ["3", 3], ["invalido", 1]])("normaliza quantidade %s para %i", (input, expected) => {
    expect(normalizeLdProfileQuantity(input)).toBe(expected);
  });
});
