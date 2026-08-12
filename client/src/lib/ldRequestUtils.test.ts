import { describe, expect, it } from "vitest";
import { isLdRequestLinkedToQuote, isValidatedLdPdfAvailable } from "./ldRequestUtils";

describe("LD request safeguards", () => {
  it("only links a request to its exact converted quote", () => {
    expect(isLdRequestLinkedToQuote({ adminQuoteId: 42 }, 42)).toBe(true);
    expect(isLdRequestLinkedToQuote({ adminQuoteId: 42 }, 43)).toBe(false);
    expect(isLdRequestLinkedToQuote({ adminQuoteId: null }, 42)).toBe(false);
  });

  it("never exposes a PDF before the request is validated", () => {
    expect(isValidatedLdPdfAvailable("in_review", "/manus-storage/document.pdf")).toBe(false);
    expect(isValidatedLdPdfAvailable("quote_ready", null)).toBe(false);
    expect(isValidatedLdPdfAvailable("quote_ready", " /manus-storage/document.pdf ")).toBe(true);
  });
});
