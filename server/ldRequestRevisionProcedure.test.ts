import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  loadGuestQuoteRequestRevisionIntoCart: vi.fn(),
  insertAuditLog: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => ({ ...(await importOriginal<typeof import("./db")>()), ...dbMocks }));
vi.mock("./permissionsService", async (importOriginal) => ({ ...(await importOriginal<typeof import("./permissionsService")>()), hasUserPermission: vi.fn().mockResolvedValue(true) }));
vi.mock("./alfaluxApiService", async (importOriginal) => ({ ...(await importOriginal<typeof import("./alfaluxApiService")>()), fetchAllAlfaluxProducts: vi.fn().mockResolvedValue([]), fetchComponentes: vi.fn().mockResolvedValue({ items: [] }), fetchAcessoriosProducts: vi.fn().mockResolvedValue([]) }));

import { appRouter } from "./routers";

function context(role: "admin" | "convidado"): TrpcContext {
  return {
    user: { id: 77, openId: `ld-${role}`, email: `${role}@alfalux.com`, name: role, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("revisão de solicitações LD", () => {
  it("copia somente o snapshot técnico da resposta pronta para o carrinho do LD e preserva sua referência", async () => {
    dbMocks.loadGuestQuoteRequestRevisionIntoCart.mockResolvedValue({
      id: 41, requestNumber: "LD-0041-26", adminQuoteId: 90, officeName: "Escritório", finalClientName: "Cliente",
      constructorName: "Construtora", contactName: "Ana", contactPhone: "11999999999", workState: "SP", workCity: "São Paulo", generalObservation: "Ajustar perfil",
    });

    await expect(appRouter.createCaller(context("convidado")).ldRequests.startRevision({ requestId: 41 })).resolves.toEqual({
      requestId: 41, requestNumber: "LD-0041-26", officeName: "Escritório", finalClientName: "Cliente",
      constructorName: "Construtora", contactName: "Ana", contactPhone: "11999999999", workState: "SP", workCity: "São Paulo", generalObservation: "Ajustar perfil",
    });
    expect(dbMocks.loadGuestQuoteRequestRevisionIntoCart).toHaveBeenCalledWith(77, 41);
    expect(dbMocks.insertAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "ld_quote_revision_started", entityId: 41 }));
  });

  it("recusa iniciar revisão de um usuário que não seja LD convidado", async () => {
    await expect(appRouter.createCaller(context("admin")).ldRequests.startRevision({ requestId: 41 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
