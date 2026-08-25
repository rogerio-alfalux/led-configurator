import { describe, expect, it } from "vitest";
import { getLumPriceMapKeys, resolveLumPriceMapEntry } from "./lumPriceMapKeys";

describe("getLumPriceMapKeys", () => {
  it("resolve um painel sem SKU pelo nome, preservando os preços API", () => {
    expect(getLumPriceMapKeys(null, "LUMIGRID E 36W")).toEqual(["||LUMIGRID E 36W"]);
  });

  it("prioriza a chave composta e mantém o SKU como fallback", () => {
    expect(getLumPriceMapKeys("LLE-123", "PAINEL TESTE")).toEqual([
      "LLE-123||PAINEL TESTE",
      "LLE-123",
    ]);
  });

  it("usa o custo e markup API do driver LUMIGRID E 36W mesmo sem SKU", () => {
    const entry = resolveLumPriceMapEntry({
      "||LUMIGRID E 36W": { custoDriverBivolt: 21.76, markupPadraoDriverOnoffBivolt: 3 },
    }, null, "LUMIGRID E 36W");

    expect(entry).toEqual({ custoDriverBivolt: 21.76, markupPadraoDriverOnoffBivolt: 3 });
    expect(Math.round(entry!.custoDriverBivolt * entry!.markupPadraoDriverOnoffBivolt * 100) / 100).toBe(65.28);
  });
});
