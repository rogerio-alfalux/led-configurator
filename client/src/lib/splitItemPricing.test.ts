import { describe, expect, it } from "vitest";
import type { CartItemData } from "./cartTypes";
import {
  buildSplitBodyPricePatch,
  cloneCartItemData,
  getEditableBodyUnitPrice,
} from "./splitItemPricing";

const itemWithDriver: CartItemData = {
  category: "Downlights",
  sku: "LDS-3410.500.38F",
  description: "MUNDIAL 500 LED RS",
  qty: 14,
  unitPrice: 917.72,
  totalPrice: 11_200,
  photoUrl: null,
  unitPriceLuminaria: 800,
  priceWithoutDriver: 11_200,
  unitPriceDriver: 117.72,
  driverQtyPerUnit: 1,
  driverLines: [{
    driverCode: "EQ00802",
    driverModel: "FONTE DE TENSÃO ALFALUX 60W 24V IP20 BIVOLT",
    driverQty: 14,
    driverUnitPrice: 117.72,
    driverTotalPrice: 1_648.08,
  }],
};

describe("preço desmembrado ao duplicar e editar itens", () => {
  it("usa o preço exclusivo da peça no editor, mesmo se unitPrice legado contém o driver", () => {
    expect(getEditableBodyUnitPrice(itemWithDriver)).toBe(800);
  });

  it("não soma o driver novamente em edições sucessivas da duplicata", () => {
    const firstPatch = buildSplitBodyPricePatch(itemWithDriver, 800, 14);
    const afterFirstSave = { ...itemWithDriver, ...firstPatch };
    const secondPatch = buildSplitBodyPricePatch(afterFirstSave, getEditableBodyUnitPrice(afterFirstSave)!, 14);

    expect(firstPatch.unitPrice).toBe(800);
    expect(secondPatch.unitPrice).toBe(800);
    expect(secondPatch.unitPriceLuminaria).toBe(800);
    expect(secondPatch.priceWithoutDriver).toBe(11_200);
    expect(afterFirstSave.driverLines).toEqual(itemWithDriver.driverLines);
  });

  it("isola os dados aninhados da duplicata", () => {
    const duplicate = cloneCartItemData(itemWithDriver);
    duplicate.driverLines![0].driverUnitPrice = 200;

    expect(itemWithDriver.driverLines![0].driverUnitPrice).toBe(117.72);
    expect(duplicate.driverLines![0].driverUnitPrice).toBe(200);
  });
});
