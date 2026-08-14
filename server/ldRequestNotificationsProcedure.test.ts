import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  countPendingGuestQuoteRequests: vi.fn(),
  countGuestUnseenQuoteResponses: vi.fn(),
  markGuestQuoteResponsesViewed: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => ({ ...(await importOriginal<typeof import("./db")>()), ...dbMocks }));
vi.mock("./permissionsService", async (importOriginal) => ({ ...(await importOriginal<typeof import("./permissionsService")>()), hasUserPermission: vi.fn().mockResolvedValue(true) }));
vi.mock("./alfaluxApiService", async (importOriginal) => ({ ...(await importOriginal<typeof import("./alfaluxApiService")>()), fetchAllAlfaluxProducts: vi.fn().mockResolvedValue([]), fetchComponentes: vi.fn().mockResolvedValue({ items: [] }), fetchAcessoriosProducts: vi.fn().mockResolvedValue([]) }));

import { appRouter } from "./routers";

function context(role: "admin" | "convidado"): TrpcContext {
  return { user: { id: 77, openId: `ld-${role}`, email: `${role}@alfalux.com`, name: role, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("notificações de solicitações LD", () => {
  it("retorna pendências reais ao administrador", async () => {
    dbMocks.countPendingGuestQuoteRequests.mockResolvedValue(4);
    await expect(appRouter.createCaller(context("admin")).ldRequests.notifications()).resolves.toEqual({ adminPendingCount: 4, guestReadyCount: 0 });
  });

  it("retorna e baixa respostas do LD após visualização", async () => {
    dbMocks.countGuestUnseenQuoteResponses.mockResolvedValue(2);
    const caller = appRouter.createCaller(context("convidado"));
    await expect(caller.ldRequests.notifications()).resolves.toEqual({ adminPendingCount: 0, guestReadyCount: 2 });
    await expect(caller.ldRequests.markResponsesViewed()).resolves.toEqual({ success: true });
    expect(dbMocks.markGuestQuoteResponsesViewed).toHaveBeenCalledWith(77);
  });
});
