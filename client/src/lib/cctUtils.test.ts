import { describe, it, expect } from "vitest";
import { applyQtyChange, applyUnitPriceChange, applyCCTChange } from "./cctUtils";
import type { CartItemData } from "./cartTypes";

// Item base simulando BLAZE 45700mm com 1 luminária e 17 drivers
const blazeItem: CartItemData = {
  sku: "LLS-3945",
  description: "BLAZE Sobrepor 18W 3000K ON/OFF 220Vac 45700mm",
  qty: 1,
  unitPrice: 30561.88,
  totalPrice: 30561.88,
  unitPriceLuminaria: 30561.88,
  priceWithoutDriver: 30561.88,
  unitPriceDriver: 54,
  driverQtyPerUnit: 17,
  driverLines: [
    {
      driverModel: "LED DRIVER 44W 200-350MA 70-125VDC 230V",
      driverCode: "EQ00396",
      driverQty: 17,
      driverUnitPrice: 54,
      driverTotalPrice: 918,
      corrente: null,
    },
  ],
  cct: "3000K",
  category: "Perfis",
};

describe("applyQtyChange", () => {
  it("recalcula driverQty corretamente ao mudar qty de 1 para 12 (BLAZE 45700mm)", () => {
    const patch = applyQtyChange(blazeItem, 12);
    expect(patch.qty).toBe(12);
    expect(patch.driverLines).toBeDefined();
    expect(patch.driverLines![0].driverQty).toBe(204); // 17 drivers × 12 luminárias
    expect(patch.driverLines![0].driverTotalPrice).toBeCloseTo(11016, 0); // 54 × 204
  });

  it("usa driverQtyPerUnit quando disponível (não divide pelo oldQty)", () => {
    // Item com qty=3 e driverQty=51 (17×3) — ao mudar para 6, deve ser 17×6=102
    const item3: CartItemData = {
      ...blazeItem,
      qty: 3,
      driverLines: [{ ...blazeItem.driverLines![0], driverQty: 51, driverTotalPrice: 2754 }],
    };
    const patch = applyQtyChange(item3, 6);
    expect(patch.driverLines![0].driverQty).toBe(102); // 17 × 6
  });

  it("usa fallback (driverQty/oldQty) quando driverQtyPerUnit não está disponível", () => {
    // Item legado sem driverQtyPerUnit
    const legacyItem: CartItemData = {
      ...blazeItem,
      driverQtyPerUnit: undefined,
      qty: 2,
      driverLines: [{ ...blazeItem.driverLines![0], driverQty: 34, driverTotalPrice: 1836 }],
    };
    const patch = applyQtyChange(legacyItem, 6);
    // fallback: 34/2 = 17 por unidade → 17×6 = 102
    expect(patch.driverLines![0].driverQty).toBe(102);
  });

  it("recalcula priceWithoutDriver ao mudar qty", () => {
    const patch = applyQtyChange(blazeItem, 12);
    expect(patch.priceWithoutDriver).toBeCloseTo(30561.88 * 12, 0);
  });

  it("recalcula totalPrice incluindo luminária + driver ao mudar qty", () => {
    const patch = applyQtyChange(blazeItem, 12);
    const expectedLum = 30561.88 * 12;
    const expectedDrv = 54 * 204;
    expect(patch.totalPrice).toBeCloseTo(expectedLum + expectedDrv, 0);
  });

  it("não altera driverLines para itens sem driverLines", () => {
    const simpleItem: CartItemData = {
      sku: "LED-BAR",
      description: "LED BAR",
      qty: 1,
      unitPrice: 100,
      totalPrice: 100,
      cct: "3000K",
      category: "LED BAR",
    };
    const patch = applyQtyChange(simpleItem, 5);
    expect(patch.driverLines).toBeUndefined();
    expect(patch.totalPrice).toBe(500);
  });
});

describe("applyCCTChange", () => {
  it("substitui CCT na description", () => {
    const patch = applyCCTChange(blazeItem, "4000K");
    expect(patch.description).toContain("4000K");
    expect(patch.description).not.toContain("3000K");
  });
});

describe("applyUnitPriceChange", () => {
  it("atualiza unitPrice e totalPrice", () => {
    const patch = applyUnitPriceChange(blazeItem, 35000, 12);
    expect(patch.unitPrice).toBe(35000);
    expect(patch.totalPrice).toBe(35000 * 12);
  });

  it("sincroniza unitPriceLuminaria e priceWithoutDriver para itens com driverLines", () => {
    const patch = applyUnitPriceChange(blazeItem, 35000, 12);
    expect(patch.unitPriceLuminaria).toBe(35000);
    expect(patch.priceWithoutDriver).toBe(35000 * 12);
    expect(patch.luminariaHasApiPrice).toBe(false);
  });
});
