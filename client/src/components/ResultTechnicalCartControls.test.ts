import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResultTechnicalCartControls, normalizeResultQuantity } from "./ResultTechnicalCartControls";

describe("ResultTechnicalCartControls", () => {
  it("renderiza os controles técnicos e o envio ao carrinho para resultados de produto", () => {
    const html = renderToStaticMarkup(createElement(ResultTechnicalCartControls, { itemEmPlanta: "P2", quantity: 2, onItemEmPlantaChange: () => undefined, onQuantityChange: () => undefined, onSendToCart: () => undefined }));
    expect(html).toContain('aria-label="Item em planta do resultado"');
    expect(html).toContain('aria-label="Quantidade do resultado"');
    expect(html).toContain("Enviar ao carrinho");
  });

  it.each([["", 1], ["0", 1], ["4", 4]])("normaliza a quantidade %s", (input, expected) => {
    expect(normalizeResultQuantity(input)).toBe(expected);
  });
});
