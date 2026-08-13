import { describe, expect, it, vi } from "vitest";
import { linkSampleOrderByQuoteNumber } from "./sampleLinkFlow";

describe("sample and maintenance linking by typed quote number", () => {
  it("resolves an ORC-prefixed number and then links the correct maintenance order", async () => {
    const resolveQuote = vi.fn().mockResolvedValue({ id: 812 });
    const createLink = vi.fn().mockResolvedValue({ id: 91 });

    await expect(linkSampleOrderByQuoteNumber({
      quoteNumber: "ORC 20.0428-26",
      sampleOrderId: 71,
      linkType: "associar",
      resolveQuote,
      createLink,
    })).resolves.toEqual({ id: 91 });

    expect(resolveQuote).toHaveBeenCalledWith("ORC 20.0428-26");
    expect(createLink).toHaveBeenCalledWith({ sampleOrderId: 71, linkedQuoteId: 812, linkType: "associar", notes: undefined });
  });

  it("stops the flow for a number not found and never writes a link", async () => {
    const createLink = vi.fn();
    await expect(linkSampleOrderByQuoteNumber({
      quoteNumber: "ORC 99.9999-99",
      sampleOrderId: 72,
      linkType: "associar",
      resolveQuote: vi.fn().mockResolvedValue(null),
      createLink,
    })).rejects.toThrow("Orçamento não encontrado");
    expect(createLink).not.toHaveBeenCalled();
  });
});
