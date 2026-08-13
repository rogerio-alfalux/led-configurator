import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("controles técnicos nos resultados", () => {
  it("insere controles compartilhados no cabeçalho de resultado para categorias configuráveis", () => {
    expect(homeSource).toContain("ResultTechnicalCartControls");
    expect(homeSource).toContain('id="downlight-add-cart"');
    expect(homeSource).toContain('id="area-externa-add-cart"');
    expect(homeSource).toContain('id="decorativa-add-cart"');
    expect(homeSource).toContain('id="balizador-add-cart"');
    expect(homeSource).toContain('id="led-bar-add-cart"');
    expect(homeSource).toContain('id="bageo-add-cart"');
    expect(homeSource).toContain('id="glow-add-cart"');
    expect(homeSource).toContain('id="tube-light-add-cart"');
  });

  it("mantém Painéis com controles e ação de carrinho próprios no cartão de resultado", () => {
    expect(homeSource).toContain('id="panel-add-cart"');
    expect(homeSource).toContain('document.getElementById("panel-add-cart")?.click()');
    expect(homeSource).toContain("Resultado — Painél");
  });
});
