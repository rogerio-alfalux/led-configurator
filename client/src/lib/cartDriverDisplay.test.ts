import { describe, expect, it } from "vitest";
import { getCartDriverDisplayDetails } from "./cartDriverDisplay";

describe("getCartDriverDisplayDetails", () => {
  it("mostra uma fonte por corte para o perfil linear, mesmo sem driverLines", () => {
    expect(getCartDriverDisplayDetails({
      category: "LED BAR",
      sku: "LLE-2052",
      description: "SKYLINE E FL 10W/M 3000K ON/OFF Bivolt 5000MM (2 x 2500mm)",
      qty: 10,
      unitPrice: 1000.95,
      totalPrice: 10009.5,
      photoUrl: null,
      ledBarNCortes: 2,
      ledBarDriverCode: "EQ00801",
      ledBarDriverModel: "FONTE DE TENSÃO ALFALUX 36W 24V IP20 BIVOLT",
      unitPriceDriver: 24.5,
    })).toEqual([{
      quantity: 20,
      model: "FONTE DE TENSÃO ALFALUX 36W 24V IP20 BIVOLT",
      code: "EQ00801",
      unitPrice: 24.5,
      totalPrice: 490,
    }]);
  });

  it("mantém os drivers estruturados para itens que não são lineares", () => {
    expect(getCartDriverDisplayDetails({
      category: "Downlights",
      sku: "LUNA-G",
      description: "LUNA G",
      qty: 4,
      unitPrice: 100,
      totalPrice: 400,
      photoUrl: null,
      driverLines: [{ driverCode: "EQ00347", driverModel: "LED DRIVER XITANIUM 44W", driverQty: 4, driverUnitPrice: null, driverTotalPrice: null }],
    })).toEqual([{
      quantity: 4,
      model: "LED DRIVER XITANIUM 44W",
      code: "EQ00347",
      unitPrice: null,
      totalPrice: null,
    }]);
  });

  it("usa o preço oficial do catálogo apenas como fallback visual para itens legados", () => {
    const officialPrices = new Map([["EQ00801", 24.5]]);
    expect(getCartDriverDisplayDetails({
      category: "LED BAR",
      sku: "LLE-2052",
      description: "SKYLINE E FL",
      qty: 10,
      unitPrice: 1000.95,
      totalPrice: 10009.5,
      photoUrl: null,
      ledBarNCortes: 2,
      ledBarDriverCode: "EQ00801",
      ledBarDriverModel: "FONTE DE TENSÃO ALFALUX 36W",
    }, officialPrices)).toEqual([{
      quantity: 20,
      model: "FONTE DE TENSÃO ALFALUX 36W",
      code: "EQ00801",
      unitPrice: 24.5,
      totalPrice: 490,
    }]);
  });
});
