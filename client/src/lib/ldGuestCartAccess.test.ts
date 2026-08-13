import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("acesso ao carrinho do LD Convidado", () => {
  it("mantém um atalho explícito para enviar configurações ao carrinho", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    expect(source).toContain('Link href="/carrinho"');
    expect(source).toContain('LdGuestCartAccess cartCount={cartCount}');
    expect(source).toContain('isConvidado ?');
  });
});
