import { describe, expect, it } from "vitest";
import { recoverCustomizadosAfterApiFailure } from "./alfaluxApiService";

describe("recuperação de Customizados após falha da API", () => {
  it("preserva apenas produtos obtidos anteriormente da API", () => {
    const apiProducts = [{
      sku: "CUST-001",
      name: "Customizado API",
      descricao: null,
      fotoUrl: null,
      familia: "CUSTOMIZADOS",
      precoVenda: null,
      clienteEspecifico: null,
      observacoes: null,
    }];
    expect(recoverCustomizadosAfterApiFailure({ data: apiProducts, fetchedAt: Date.now() })).toEqual(apiProducts);
  });

  it("não inventa itens quando ainda não houve resposta válida da API", () => {
    expect(recoverCustomizadosAfterApiFailure(null)).toEqual([]);
  });
});
