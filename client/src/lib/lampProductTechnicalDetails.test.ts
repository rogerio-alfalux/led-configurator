import { describe, expect, it } from "vitest";
import {
  buildFixtureCommercialDescription,
  isLampBasedProduct,
} from "./lampProductTechnicalDetails";

describe("lampProductTechnicalDetails", () => {
  const lampFixture = {
    name: "SPOT PARA LÂMPADA GU10",
    isLamp: true,
    productStructure: { lightingMode: "LAMP" },
  } as const;

  it("identifica produtos cujo CCT e tensão pertencem à lâmpada", () => {
    expect(isLampBasedProduct(lampFixture)).toBe(true);
    expect(isLampBasedProduct({ name: "LUMINÁRIA LED", isLamp: false })).toBe(false);
  });

  it("não leva CCT, controle ou tensão da lâmpada para a descrição da luminária", () => {
    expect(buildFixtureCommercialDescription(lampFixture, {
      cct: "3000K",
      control: "ON/OFF",
      voltage: "220V",
    })).toBe("SPOT PARA LÂMPADA GU10");
  });

  it("mantém os dados técnicos em luminárias com LED integrado", () => {
    expect(buildFixtureCommercialDescription({ name: "LUNA LED" }, {
      cct: "3000K",
      control: "DIM DALI",
      voltage: "Bivolt",
    })).toBe("LUNA LED 3000K DIM DALI Bivolt");
  });
});
