import { describe, expect, it } from "vitest";
import type { CartItemData } from "./cartTypes";
import {
  buildSplitBodyPricePatch,
  buildSplitDriverPricePatch,
  cloneCartItemData,
  getCommercialBodyTotal,
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
    expect(secondPatch.totalPrice).toBe(12_848.08);
    expect(afterFirstSave.driverLines).toEqual(itemWithDriver.driverLines);
  });

  it("atualiza somente o driver e recompõe o total sem alterar a luminária", () => {
    const patch = buildSplitDriverPricePatch(itemWithDriver, 0, 200);

    expect(patch.unitPrice).toBeUndefined();
    expect(patch.priceWithoutDriver).toBe(11_200);
    expect(patch.driverLines![0].driverUnitPrice).toBe(200);
    expect(patch.driverLines![0].driverTotalPrice).toBe(2_800);
    expect(patch.driverLines![0].driverPriceManual).toBe(true);
    expect(patch.totalPrice).toBe(14_000);
  });

  it("não exibe preço negativo legado quando o corpo possui preço comercial válido", () => {
    const corruptedLegacyItem = {
      ...itemWithDriver,
      qty: 298,
      unitPrice: 193.42,
      unitPriceLuminaria: -1.579999999999883,
      priceWithoutDriver: -470.8399999999651,
      custoCorpoBase: 69.08,
      markupPadraoApi: 2.8,
    };

    expect(getEditableBodyUnitPrice(corruptedLegacyItem)).toBe(193.42);
    expect(getCommercialBodyTotal(corruptedLegacyItem)).toBe(57_639.16);
  });

  it("ao editar o driver preserva 193,42 na luminária mesmo se o campo separado legado estiver negativo", () => {
    const corruptedLegacyItem: CartItemData = {
      ...itemWithDriver,
      qty: 298,
      unitPrice: 193.42,
      unitPriceLuminaria: -1.579999999999883,
      priceWithoutDriver: -470.8399999999651,
      driverLines: [{
        driverCode: "EQ00509",
        driverModel: "LED DRIVER DALI",
        driverQty: 298,
        driverUnitPrice: 54,
        driverTotalPrice: 16_092,
      }],
    };

    const patch = buildSplitDriverPricePatch(corruptedLegacyItem, 0, 195);

    expect(patch.unitPrice).toBeUndefined();
    expect(patch.priceWithoutDriver).toBe(57_639.16);
    expect(patch.driverLines![0].driverUnitPrice).toBe(195);
    expect(patch.driverLines![0].driverTotalPrice).toBe(58_110);
    expect(patch.totalPrice).toBe(115_749.16);
  });

  it("arredonda o preço editado do driver sem alterar o preço do corpo", () => {
    const patch = buildSplitDriverPricePatch(itemWithDriver, 0, 195.009999999);

    expect(patch.driverLines![0].driverUnitPrice).toBe(195.01);
    expect(patch.driverLines![0].driverTotalPrice).toBe(2_730.14);
    expect(patch.priceWithoutDriver).toBe(11_200);
    expect(patch.unitPrice).toBeUndefined();
  });

  it("isola os dados aninhados da duplicata", () => {
    const duplicate = cloneCartItemData(itemWithDriver);
    duplicate.driverLines![0].driverUnitPrice = 200;

    expect(itemWithDriver.driverLines![0].driverUnitPrice).toBe(117.72);
    expect(duplicate.driverLines![0].driverUnitPrice).toBe(200);
  });
});
