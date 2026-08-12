import { describe, expect, it } from "vitest";
import { canAccessCommercialQuotes } from "../shared/guestCommercialAccess";

describe("commercial quote access for LD Convidado", () => {
  it("blocks every commercial quote route for LD Convidado", () => {
    expect(canAccessCommercialQuotes("convidado")).toBe(false);
  });

  it("preserves commercial access for the existing internal profiles", () => {
    expect(canAccessCommercialQuotes("admin")).toBe(true);
    expect(canAccessCommercialQuotes("assistente")).toBe(true);
    expect(canAccessCommercialQuotes("vendedor")).toBe(true);
  });
});
