import { describe, expect, it } from "vitest";
import { canEditProductionEquipments } from "./factoryEquipmentPolicy";

describe("canEditProductionEquipments", () => {
  it("permite equipamentos em todas as categorias técnicas", () => {
    expect(canEditProductionEquipments("Downlights")).toBe(true);
    expect(canEditProductionEquipments("Perfis")).toBe(true);
    expect(canEditProductionEquipments("Item Especial")).toBe(true);
  });

  it("bloqueia somente Revenda e Acessórios", () => {
    expect(canEditProductionEquipments("Revenda")).toBe(false);
    expect(canEditProductionEquipments("Acessórios")).toBe(false);
  });
});
