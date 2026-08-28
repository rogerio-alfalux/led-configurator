import { describe, expect, it } from "vitest";
import { buildSuggestions, filterSuggestions, type ProductSearchCatalogs } from "./ProductSearch";

const catalogs: ProductSearchCatalogs = {
  profiles: {
    "LLE-2142.618.20F": {
      code: "LLE-2142.618.20F",
      name: "ALE-2142 18W 4000K ON/OFF 220V",
      installType: "EMBUTIR",
    },
    "LLE-2142.618.20F-P": {
      code: "LLE-2142.618.20F-P",
      name: "ALE-2142 18W 4000K PENDENTE",
      installType: "PENDENTE",
    },
  } as ProductSearchCatalogs["profiles"],
  ledBars: [],
  bageos: [],
  downlights: [],
  paineis: [],
  spots: [],
  arandelas: [],
  areaExterna: [],
  balizadores: [],
  decorativas: [],
  revenda: [],
  acessorios: [],
};

describe("ProductSearch", () => {
  it("preserva cada SKU de perfil como uma sugestão pesquisável", () => {
    const suggestions = buildSuggestions(catalogs);

    expect(suggestions.map(suggestion => suggestion.code)).toEqual([
      "LLE-2142.618.20F",
      "LLE-2142.618.20F-P",
    ]);
  });

  it("encontra um SKU completo ou parcial, com ou sem separadores", () => {
    const suggestions = buildSuggestions(catalogs);

    expect(filterSuggestions(suggestions, "LLE-2142.618.20F")).toHaveLength(2);
    expect(filterSuggestions(suggestions, "2142.618")).toHaveLength(2);
    expect(filterSuggestions(suggestions, "lle214261820fp")).toEqual([
      expect.objectContaining({ code: "LLE-2142.618.20F-P" }),
    ]);
  });

  it("preserva a busca textual por nome", () => {
    const suggestions = buildSuggestions(catalogs);

    expect(filterSuggestions(suggestions, "pendente")).toEqual([
      expect.objectContaining({ code: "LLE-2142.618.20F-P" }),
    ]);
  });
});
