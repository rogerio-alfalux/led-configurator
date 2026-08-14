import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getGuestQuoteRequestById: vi.fn(),
  getQuoteById: vi.fn(),
  markGuestQuoteResponseViewed: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => ({ ...(await importOriginal<typeof import("./db")>()), ...dbMocks }));
vi.mock("./permissionsService", async (importOriginal) => ({ ...(await importOriginal<typeof import("./permissionsService")>()), hasUserPermission: vi.fn().mockResolvedValue(true) }));
vi.mock("./alfaluxApiService", async (importOriginal) => ({ ...(await importOriginal<typeof import("./alfaluxApiService")>()), fetchAllAlfaluxProducts: vi.fn().mockResolvedValue([]), fetchComponentes: vi.fn().mockResolvedValue({ items: [] }), fetchAcessoriosProducts: vi.fn().mockResolvedValue([]) }));

import { appRouter } from "./routers";

function context(): TrpcContext {
  return { user: { id: 77, openId: "ld", email: "ld@office.com", name: "LD", loginMethod: "manus", role: "convidado", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("dados atuais de PDF para LD", () => {
  it("retorna somente a revisão vigente do orçamento vinculado à solicitação do próprio LD", async () => {
    dbMocks.getGuestQuoteRequestById.mockResolvedValue({ id: 12, guestUserId: 77, status: "quote_ready", adminQuoteId: 90 });
    dbMocks.getQuoteById.mockResolvedValue({
      quote: { id: 90, currentVersion: 2, seller1Id: null, seller2Id: null },
      versions: [{ id: 1, version: 1, status: "published" }, { id: 2, version: 2, status: "published" }],
      items: [{ id: 1, quoteVersionId: 1, itemData: "antigo" }, { id: 2, quoteVersionId: 2, itemData: "vigente" }],
    });
    const result = await appRouter.createCaller(context()).ldRequests.currentPdfData({ requestId: 12 });
    expect(result.items).toEqual([{ id: 2, quoteVersionId: 2, itemData: "vigente" }]);
    expect(dbMocks.markGuestQuoteResponseViewed).toHaveBeenCalledWith(77, 12);
  });

  it("usa os itens existentes de orçamentos legados quando a revisão vigente não possui itens persistidos", async () => {
    dbMocks.getGuestQuoteRequestById.mockResolvedValue({ id: 13, guestUserId: 77, status: "quote_ready", adminQuoteId: 91 });
    dbMocks.getQuoteById.mockResolvedValue({
      quote: { id: 91, currentVersion: 2, seller1Id: null, seller2Id: null },
      versions: [{ id: 1, version: 0, status: "published" }, { id: 2, version: 2, status: "published" }],
      items: [{ id: 1, quoteVersionId: 1, itemData: "legado" }],
    });
    const result = await appRouter.createCaller(context()).ldRequests.currentPdfData({ requestId: 13 });
    expect(result.items).toEqual([{ id: 1, quoteVersionId: 1, itemData: "legado" }]);
  });
});
