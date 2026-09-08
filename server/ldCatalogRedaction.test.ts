import { redactLdCatalogCommercialFields } from "./routers";
import { describe, expect, it } from "vitest";

describe("redacção de catálogo para LD convidado", () => {
  it("preserva estrutura técnica e remove preço, custo e margem em todos os níveis", () => {
    const result = redactLdCatalogCommercialFields({
      sku: "EQ00001",
      name: "Produto técnico",
      fotoUrl: "https://example.test/foto.jpg",
      precoVenda: 150,
      unitCost: 60,
      markupPadrao: 2.5,
      nested: { unitPrice: 25, driverTotalPrice: 50, descricao: "Driver" },
      variants: [{ price: 12, dimensao: "100 mm" }],
    }) as Record<string, any>;

    expect(result).toMatchObject({ sku: "EQ00001", name: "Produto técnico", fotoUrl: "https://example.test/foto.jpg" });
    expect(result).not.toHaveProperty("precoVenda");
    expect(result).not.toHaveProperty("unitCost");
    expect(result).not.toHaveProperty("markupPadrao");
    expect(result.nested).toEqual({ descricao: "Driver" });
    expect(result.variants).toEqual([{ dimensao: "100 mm" }]);
  });
});
