import { describe, expect, it } from "vitest";
import { buildSampleCommercialProjection, sampleChargeBaseAmount } from "./sampleCommercialAdjustment";

describe("sample commercial adjustment", () => {
  it("keeps a charged sample at its original final amount after destination markup and discount", () => {
    const base = sampleChargeBaseAmount(3954.89, { rtPercent: 0.1, marginPercent: 0.2, discountPercent: 0.05 });
    const final = base / (1 - 0.1) / (1 - 0.2) * (1 - 0.05);
    expect(final).toBeCloseTo(3954.89, 2);
  });

  it("creates a visible commercial charge only for cobrar and a hidden base amount for diluir", () => {
    const projection = buildSampleCommercialProjection({
      links: [
        { linkId: 1, linkType: "cobrar", sourceQuoteNumber: "33.9995-26", amount: "3954.89", productDescriptions: ["BLAZE H 9605mm"] },
        { linkId: 2, linkType: "diluir", sourceQuoteNumber: "33.9994-26", amount: "100.00", productDescriptions: ["Produto anterior"] },
        { linkId: 3, linkType: "associar", sourceQuoteNumber: "33.9993-26", amount: "200.00", productDescriptions: [] },
      ],
    });
    expect(projection.chargeItems).toHaveLength(1);
    expect(projection.chargeItems[0]).toMatchObject({ isCommercialSampleCharge: true, sampleChargeFinalAmount: 3954.89 });
    expect(projection.dilutionBaseAmount).toBeCloseTo(100, 2);
    expect(projection.dilutionFinalAmount).toBe(100);
  });
});
