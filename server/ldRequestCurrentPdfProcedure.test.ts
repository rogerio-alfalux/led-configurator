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

describe("dados comerciais do orçamento para LD", () => {
  it("bloqueia o payload da revisão vigente e não consulta itens ou valores do orçamento", async () => {
    await expect(appRouter.createCaller(context()).ldRequests.currentPdfData({ requestId: 12 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.getGuestQuoteRequestById).not.toHaveBeenCalled();
    expect(dbMocks.getQuoteById).not.toHaveBeenCalled();
    expect(dbMocks.markGuestQuoteResponseViewed).not.toHaveBeenCalled();
  });

  it("libera exclusivamente o PDF validado da resposta pertencente ao LD", async () => {
    dbMocks.getGuestQuoteRequestById.mockResolvedValue({
      id: 12,
      guestUserId: 77,
      status: "quote_ready",
      validatedPdfUrl: "/api/assets/ld-quotes/77/12/orcamento.pdf",
    });

    await expect(appRouter.createCaller(context()).ldRequests.myPdf({ requestId: 12 }))
      .resolves.toEqual({ url: "/api/assets/ld-quotes/77/12/orcamento.pdf" });
  });

  it("não libera PDF de resposta pertencente a outro LD", async () => {
    dbMocks.getGuestQuoteRequestById.mockResolvedValue({
      id: 12,
      guestUserId: 99,
      status: "quote_ready",
      validatedPdfUrl: "/api/assets/ld-quotes/99/12/orcamento.pdf",
    });

    await expect(appRouter.createCaller(context()).ldRequests.myPdf({ requestId: 12 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
