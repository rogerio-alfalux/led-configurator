import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getPrecoForControle } from "./Home";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("precificação de Balizadores", () => {
  it("forma o preço da FRIZZ pelo custo oficial de R$ 83,48 e markup 3", () => {
    expect(getPrecoForControle({
      precoOnOff220: null,
      custoCorpoOnoff220v: 83.48,
      markupPadraoOnoff220v: 3,
    }, "ON/OFF", "220V")).toBe(250.44);
  });

  it("calcula a FRIZZ pelo custo e markup oficiais quando a API não retorna preço direto", () => {
    expect(homeSource).toContain("const bTensao = bProd.driverBivolt?.model ? 'Bivolt' : (bProd.tensaoEmbutida ?? '220V');");
    expect(homeSource).toContain("const bPreco = getPrecoForControle(bProd, 'ON/OFF', bTensao);");
    expect(homeSource).not.toContain("const bPreco = bProd.precoOnOff220 ?? null;");
  });

  it("mantém a mesma tensão comercial ao enviar o Balizador ao carrinho", () => {
    expect(homeSource).toContain("buildLumDriverLines(bProd.sku ?? \"\", 'ON/OFF', bTensao");
  });
});
