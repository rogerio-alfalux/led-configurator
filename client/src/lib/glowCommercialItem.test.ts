import { describe, expect, it } from "vitest";
import { buildGlowCommercialItem } from "./glowCommercialItem";

describe("buildGlowCommercialItem", () => {
  it("preserva DALI e soma corpo e driver como valores comerciais distintos", () => {
    const result = buildGlowCommercialItem({
      productName: "GLOW S 54W 1154MM",
      sku: "LLS-9465.115.65F",
      cct: "3000K",
      controle: "DIM DALI",
      tensao: "220V",
      quantity: 1,
      apiUnitPrice: 345.21,
      priceWithoutDriver: 345.21,
      driverLines: [{
        driverModel: "LED DRIVER 100W 150-500MA 100-300VDC 220V DALI",
        driverCode: "EQ00179",
        driverQty: 1,
        driverUnitPrice: 479.52,
        driverTotalPrice: 479.52,
        corrente: "500mA",
      }],
      hasApiPricing: true,
      driverModel: "LED DRIVER 100W 150-500MA 100-300VDC 220V DALI",
      driverCode: "EQ00179",
    });

    expect(result.description).toContain("DIM DALI 220V");
    expect(result.quoteSummary).toContain("DIM DALI 220V");
    expect(result.orderSummary).toContain("DIM DALI");
    expect(result.totalPrice).toBe(824.73);
    expect(result.priceFromApi).toBe(true);
  });

  it("usa a quantidade do item ao formar o total quando não há corpo calculado separado", () => {
    const result = buildGlowCommercialItem({
      productName: "GLOW S 37W 577MM",
      sku: "LLS-9465.577.65F",
      cct: "3000K",
      controle: "ON/OFF",
      tensao: "220V",
      quantity: 2,
      apiUnitPrice: 120,
      priceWithoutDriver: null,
      driverLines: [{
        driverModel: "LED DRIVER 50W",
        driverCode: "EQ00001",
        driverQty: 2,
        driverUnitPrice: 30,
        driverTotalPrice: 60,
      }],
      hasApiPricing: true,
      driverModel: "LED DRIVER 50W",
      driverCode: "EQ00001",
    });

    expect(result.totalPrice).toBe(300);
    expect(result.description).toBe("GLOW S 37W 577MM 3000K ON/OFF 220V");
  });
});
