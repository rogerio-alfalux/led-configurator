import { describe, expect, it } from "vitest";
import { profileCartTechnicalFields } from "./profileCartTechnicalFields";

describe("profileCartTechnicalFields", () => {
  it("preserva Item em planta e Quantidade para o item de perfil enviado ao carrinho", () => {
    expect(profileCartTechnicalFields(3, "L1")).toEqual({ qty: 3, itemEmPlanta: "L1" });
  });

  it("normaliza quantidade inválida e item vazio", () => {
    expect(profileCartTechnicalFields(0, "  ")).toEqual({ qty: 1, itemEmPlanta: "" });
  });
});
