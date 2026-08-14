import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  deleteGuestQuoteRequestForGuest: vi.fn(),
  insertAuditLog: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => ({ ...(await importOriginal<typeof import("./db")>()), ...dbMocks }));
vi.mock("./permissionsService", async (importOriginal) => ({ ...(await importOriginal<typeof import("./permissionsService")>()), hasUserPermission: vi.fn().mockResolvedValue(true) }));
vi.mock("./alfaluxApiService", async (importOriginal) => ({ ...(await importOriginal<typeof import("./alfaluxApiService")>()), fetchAllAlfaluxProducts: vi.fn().mockResolvedValue([]), fetchComponentes: vi.fn().mockResolvedValue({ items: [] }), fetchAcessoriosProducts: vi.fn().mockResolvedValue([]) }));

import { appRouter } from "./routers";

function context(role: "admin" | "convidado"): TrpcContext {
  return { user: { id: 77, openId: `ld-${role}`, email: `${role}@alfalux.com`, name: role, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("exclusão de solicitações LD", () => {
  it("permite ao LD excluir somente sua própria solicitação e registra auditoria", async () => {
    dbMocks.deleteGuestQuoteRequestForGuest.mockResolvedValue({ id: 12, requestNumber: "LD-0002-26", adminQuoteId: 90 });
    await expect(appRouter.createCaller(context("convidado")).ldRequests.deleteMine({ requestId: 12 })).resolves.toEqual({ success: true, requestId: 12 });
    expect(dbMocks.deleteGuestQuoteRequestForGuest).toHaveBeenCalledWith(77, 12);
    expect(dbMocks.insertAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "ld_quote_request_deleted", entityId: 12 }));
  });

  it("impede que administradores usem o endpoint de exclusão do convidado", async () => {
    await expect(appRouter.createCaller(context("admin")).ldRequests.deleteMine({ requestId: 12 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
