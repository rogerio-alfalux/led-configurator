import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("acesso ao carrinho do LD Convidado", () => {
  it("mantém o carrinho padrão no cabeçalho e um CTA no resultado", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    expect(source).toContain('Link href="/carrinho"');
    expect(source).toContain('title="Carrinho de orçamento"');
    expect(source).toContain('downlight-add-cart');
    expect(source).toContain('arandela-add-cart');
    expect(source).toContain('spot-add-cart');
    expect(source).toContain('ld-result-cart-action');
  });
});
