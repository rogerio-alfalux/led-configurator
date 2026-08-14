import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("primeira edição comercial de orçamento LD", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/pages/QuoteDetail.tsx"), "utf8");

  it("sugere o número após escolher vendedor e preserva edição manual", () => {
    expect(source).toContain("editSuggestedNumberQuery");
    expect(source).toContain("setEditNumberWasManuallyChanged(true)");
    expect(source).toContain("número informado por você é soberano");
    expect(source).toContain("const isLdProvisionalQuoteNumber");
    expect(source).toContain("quoteNumber: isLdProvisionalQuoteNumber ? \"\" : quote.quoteNumber");
  });
});
