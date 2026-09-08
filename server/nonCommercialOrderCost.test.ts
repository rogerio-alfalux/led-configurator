import { describe, expect, it } from "vitest";
import { getConfirmedNonCommercialOrderCost } from "./nonCommercialOrderCost";

describe("getConfirmedNonCommercialOrderCost", () => {
  it("uses manual cost, never the sale price, for a special maintenance item", () => {
    const result = getConfirmedNonCommercialOrderCost([{
      itemNumber: 1,
      itemData: JSON.stringify({
        category: "Item Especial",
        qty: 1,
        unitPrice: 72,
        totalPrice: 72,
        custoManual: 24,
      }),
    }]);

    expect(result).toEqual({ amount: 24, isComplete: true, missingItemNumbers: [] });
  });

  it("marks the order incomplete rather than deriving cost from a sale price", () => {
    const result = getConfirmedNonCommercialOrderCost([{
      itemNumber: 4,
      itemData: JSON.stringify({ qty: 1, unitPrice: 200, totalPrice: 200 }),
    }]);

    expect(result).toEqual({ amount: 0, isComplete: false, missingItemNumbers: [4] });
  });

  it("includes the body and the persisted driver cost when both are confirmed", () => {
    const result = getConfirmedNonCommercialOrderCost([{
      itemNumber: 2,
      itemData: JSON.stringify({
        qty: 2,
        custoCorpoBase: 100,
        custoDriverBase: 20,
        driverLines: [{ driverQty: 2 }],
      }),
    }]);

    expect(result).toEqual({ amount: 240, isComplete: true, missingItemNumbers: [] });
  });
});
