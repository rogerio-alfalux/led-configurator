import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const state = { status: "pending" as "pending" | "in_review" | "quote_ready", viewed: false };
const dbMocks = vi.hoisted(() => ({
  countPendingGuestQuoteRequests: vi.fn(),
  countGuestUnseenQuoteResponses: vi.fn(),
  markGuestQuoteResponseViewed: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => ({ ...(await importOriginal<typeof import("./db")>()), ...dbMocks }));
vi.mock("./permissionsService", async (importOriginal) => ({ ...(await importOriginal<typeof import("./permissionsService")>()), hasUserPermission: vi.fn().mockResolvedValue(true) }));
vi.mock("./alfaluxApiService", async (importOriginal) => ({ ...(await importOriginal<typeof import("./alfaluxApiService")>()), fetchAllAlfaluxProducts: vi.fn().mockResolvedValue([]), fetchComponentes: vi.fn().mockResolvedValue({ items: [] }), fetchAcessoriosProducts: vi.fn().mockResolvedValue([]) }));

import { appRouter } from "./routers";

function context(role: "admin" | "convidado"): TrpcContext {
  return { user: { id: 77, openId: `ld-${role}`, email: `${role}@alfalux.com`, name: role, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("fluxo completo de badges LD", () => {
  it("transfere a pendência do administrador ao LD e a baixa após o download", async () => {
    state.status = "pending"; state.viewed = false;
    dbMocks.countPendingGuestQuoteRequests.mockImplementation(async () => (["pending", "in_review"].includes(state.status) ? 1 : 0));
    dbMocks.countGuestUnseenQuoteResponses.mockImplementation(async () => (state.status === "quote_ready" && !state.viewed ? 1 : 0));
    dbMocks.markGuestQuoteResponseViewed.mockImplementation(async () => { state.viewed = true; });
    const admin = appRouter.createCaller(context("admin"));
    const guest = appRouter.createCaller(context("convidado"));
    await expect(admin.ldRequests.notifications()).resolves.toEqual({ adminPendingCount: 1, guestReadyCount: 0 });
    state.status = "in_review";
    await expect(admin.ldRequests.notifications()).resolves.toEqual({ adminPendingCount: 1, guestReadyCount: 0 });
    state.status = "quote_ready";
    await expect(admin.ldRequests.notifications()).resolves.toEqual({ adminPendingCount: 0, guestReadyCount: 0 });
    await expect(guest.ldRequests.notifications()).resolves.toEqual({ adminPendingCount: 0, guestReadyCount: 1 });
    await guest.ldRequests.markResponseViewed({ requestId: 1 });
    await expect(guest.ldRequests.notifications()).resolves.toEqual({ adminPendingCount: 0, guestReadyCount: 0 });
  });
});
