import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  findQuoteByNumber: vi.fn(),
  getSampleOrderById: vi.fn(),
  getQuoteById: vi.fn(),
  listSampleLinks: vi.fn(),
  createSampleLink: vi.fn(),
  updateSampleOrder: vi.fn(),
  insertAuditLog: vi.fn(),
}));

vi.mock("./permissionsService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./permissionsService")>()),
  hasUserPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  ...dbMocks,
}));

import { appRouter } from "./routers";

function createContext(): TrpcContext {
  return {
    user: {
      id: 44,
      openId: "sample-link-admin",
      email: "admin@grupoalfalux.com.br",
      name: "Administrador",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("samples.findQuoteByNumber and samples.link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.insertAuditLog.mockResolvedValue(undefined);
    dbMocks.updateSampleOrder.mockResolvedValue(undefined);
  });

  it("resolves a valid formatted number through the server procedure and returns null when it is invalid", async () => {
    const caller = appRouter.createCaller(createContext());
    dbMocks.findQuoteByNumber.mockResolvedValueOnce({ id: 8, quoteNumber: "20.0428-26", projectName: "Obra", clientName: "Cliente", status: "open" });

    await expect(caller.samples.findQuoteByNumber({ quoteNumber: "ORC 20.0428-26" })).resolves.toMatchObject({ id: 8, quoteNumber: "20.0428-26" });
    expect(dbMocks.findQuoteByNumber).toHaveBeenCalledWith("ORC 20.0428-26");

    dbMocks.findQuoteByNumber.mockResolvedValueOnce(null);
    await expect(caller.samples.findQuoteByNumber({ quoteNumber: "ORC 99.9999-99" })).resolves.toBeNull();
  });

  it.each(["sample", "maintenance"] as const)("links a %s order to the resolved commercial quote", async (kind) => {
    const caller = appRouter.createCaller(createContext());
    dbMocks.getSampleOrderById.mockResolvedValue({ id: 71, quoteId: 5, kind });
    dbMocks.getQuoteById.mockResolvedValue({ quote: { id: 8, status: "open" }, items: [], versions: [] });
    dbMocks.listSampleLinks.mockResolvedValue([]);
    dbMocks.createSampleLink.mockResolvedValue({ id: 90 });

    await expect(caller.samples.link({ sampleOrderId: 71, linkedQuoteId: 8, linkType: "associar" })).resolves.toEqual({ id: 90 });
    expect(dbMocks.createSampleLink).toHaveBeenCalledWith(expect.objectContaining({ sampleOrderId: 71, linkedQuoteId: 8, linkType: "associar", createdByUserId: 44 }));
    expect(dbMocks.updateSampleOrder).toHaveBeenCalledWith(71, { status: "linked" });
  });

  it("rejects self-links and duplicate links before writing anything", async () => {
    const caller = appRouter.createCaller(createContext());
    dbMocks.getSampleOrderById.mockResolvedValue({ id: 71, quoteId: 8, kind: "maintenance" });
    dbMocks.getQuoteById.mockResolvedValue({ quote: { id: 8, status: "open" }, items: [], versions: [] });
    dbMocks.listSampleLinks.mockResolvedValue([]);

    await expect(caller.samples.link({ sampleOrderId: 71, linkedQuoteId: 8, linkType: "associar" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(dbMocks.createSampleLink).not.toHaveBeenCalled();

    dbMocks.getSampleOrderById.mockResolvedValue({ id: 71, quoteId: 5, kind: "sample" });
    dbMocks.listSampleLinks.mockResolvedValue([{ linkedQuoteId: 8 }]);
    await expect(caller.samples.link({ sampleOrderId: 71, linkedQuoteId: 8, linkType: "associar" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(dbMocks.createSampleLink).not.toHaveBeenCalled();
  });
});
