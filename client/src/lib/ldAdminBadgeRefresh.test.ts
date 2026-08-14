import { describe, expect, it, vi } from "vitest";
import { handleLdPdfSent, refreshLdAdminBadge } from "./ldAdminBadgeRefresh";

describe("atualização do badge administrativo LD", () => {
  it("refaz a consulta de notificações assim que o PDF é enviado", async () => {
    const invalidate = vi.fn().mockResolvedValue(undefined);
    await refreshLdAdminBadge(invalidate);
    expect(invalidate).toHaveBeenCalledOnce();
  });

  it("usa a mesma atualização após a confirmação do envio administrativo", async () => {
    const invalidate = vi.fn().mockResolvedValue(undefined);
    await handleLdPdfSent(invalidate);
    expect(invalidate).toHaveBeenCalledOnce();
  });
});
