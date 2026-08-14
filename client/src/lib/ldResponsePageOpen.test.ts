import { describe, expect, it, vi } from "vitest";
import { markLdResponsesOnPageOpen } from "./ldResponsePageOpen";

describe("abertura de Minhas solicitações LD", () => {
  it("marca as respostas como vistas e baixa o badge após visualizar uma resposta pronta", async () => {
    const markViewed = vi.fn().mockResolvedValue(undefined);
    const invalidateBadge = vi.fn().mockResolvedValue(undefined);
    await expect(markLdResponsesOnPageOpen({ role: "convidado", requests: [{ status: "quote_ready" }], markViewed, invalidateBadge })).resolves.toBe(true);
    expect(markViewed).toHaveBeenCalledOnce();
    expect(invalidateBadge).toHaveBeenCalledOnce();
  });

  it("não altera o badge quando não há resposta pronta", async () => {
    const markViewed = vi.fn().mockResolvedValue(undefined);
    const invalidateBadge = vi.fn().mockResolvedValue(undefined);
    await expect(markLdResponsesOnPageOpen({ role: "convidado", requests: [{ status: "in_review" }], markViewed, invalidateBadge })).resolves.toBe(false);
    expect(markViewed).not.toHaveBeenCalled();
  });
});
