import { describe, expect, it } from "vitest";
import { redactGuestQuoteSummary } from "./guestQuoteSummary";

describe("redactGuestQuoteSummary", () => {
  it("remove luminária, driver e total monetários sem perder os dados técnicos", () => {
    const summary = "LUNA G LED 17W RE 3000K 220V\nLUMINÁRIAS: R$ 166,50\nDRIVERS: R$ 54,00\nTOTAL: R$ 220,50";
    expect(redactGuestQuoteSummary(summary)).toBe("LUNA G LED 17W RE 3000K 220V");
  });

  it("mantém linhas sem valores comerciais", () => {
    expect(redactGuestQuoteSummary("CÓDIGO: LDE 6450\nMONTADA COM DRIVER BIVOLT")).toBe("CÓDIGO: LDE 6450\nMONTADA COM DRIVER BIVOLT");
  });
});
