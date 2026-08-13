import { describe, expect, it } from "vitest";
import { normalizeQuoteNumberForLookup } from "../shared/quoteNumberLookup";
import { getSampleLinkValidationError } from "../shared/sampleLinkValidation";

describe("sample and maintenance quote linking", () => {
  it("normalizes the accepted budget number formats", () => {
    expect(normalizeQuoteNumberForLookup("20.0428-26")).toBe("20042826");
    expect(normalizeQuoteNumberForLookup(" ORC 20.0428-26 ")).toBe("20042826");
    expect(normalizeQuoteNumberForLookup("ORC-20 0428 26")).toBe("20042826");
  });

  it("prevents self-links and repeated links while allowing a new target", () => {
    expect(getSampleLinkValidationError({ sourceQuoteId: 5, targetQuoteId: 5, existingLinkedQuoteIds: [] }))
      .toContain("próprio orçamento");
    expect(getSampleLinkValidationError({ sourceQuoteId: 5, targetQuoteId: 8, existingLinkedQuoteIds: [8] }))
      .toContain("já está vinculado");
    expect(getSampleLinkValidationError({ sourceQuoteId: 5, targetQuoteId: 8, existingLinkedQuoteIds: [9] })).toBeNull();
  });
});
