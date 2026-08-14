import { describe, expect, it } from "vitest";
import { countsForAdminBadge, countsForGuestBadge } from "./ldRequestBadgeStatus";

describe("transições de badges LD", () => {
  it("move a pendência do administrador para o LD ao enviar o PDF", () => {
    expect(countsForAdminBadge("pending")).toBe(true);
    expect(countsForAdminBadge("in_review")).toBe(true);
    expect(countsForAdminBadge("quote_ready")).toBe(false);
    expect(countsForGuestBadge("pending", null)).toBe(false);
    expect(countsForGuestBadge("in_review", null)).toBe(false);
    expect(countsForGuestBadge("quote_ready", null)).toBe(true);
  });

  it("remove somente a resposta cujo PDF foi baixado do badge do LD", () => {
    expect(countsForGuestBadge("quote_ready", "2026-08-14 10:00:00")).toBe(false);
    expect(countsForGuestBadge("cancelled", null)).toBe(false);
  });
});
