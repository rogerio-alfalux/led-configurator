import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/FactoryOrderDetail.tsx"), "utf8");

describe("programação de driver na ficha de produção", () => {
  it("reidrata a programação pelo cadastro da luminária e avisa sem bloquear quando ausente", () => {
    expect(source).toContain("enrichDriverProgrammingFromProductApi(normalizeStoredQuoteSnapshot(raw), productSkuMapFO)");
    expect(source).toContain("Programação não retornada pela API — preencha se necessário.");
    expect(source).toContain("sem programação retornada pela API ou preenchida manualmente");
    expect(source).not.toContain("componenteCorrenteMapFO");
  });
});
