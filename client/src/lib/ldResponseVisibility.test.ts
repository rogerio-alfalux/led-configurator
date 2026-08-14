import { describe, expect, it } from "vitest";
import { shouldMarkLdResponsesViewed } from "./ldResponseVisibility";

describe("visualização de respostas LD", () => {
  it("baixa o badge somente quando o LD visualiza uma resposta pronta", () => {
    expect(shouldMarkLdResponsesViewed("convidado", [{ status: "quote_ready" }])).toBe(true);
    expect(shouldMarkLdResponsesViewed("convidado", [{ status: "in_review" }])).toBe(false);
    expect(shouldMarkLdResponsesViewed("admin", [{ status: "quote_ready" }])).toBe(false);
  });
});
