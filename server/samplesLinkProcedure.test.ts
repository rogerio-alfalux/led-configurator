import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  findQuoteByNumber: vi.fn(),
  getSampleOrderById: vi.fn(),
  getQuoteById: vi.fn(),
  listSampleLinks: vi.fn(),
  createSampleLink: vi.fn(),
  applyNonCommercialRevenueTransfer: vi.fn(),
  reverseNonCommercialRevenueTransfer: vi.fn(),
  deleteSampleOrder: vi.fn(),
  getNonCommercialFinancialTransferBySourceQuoteId: vi.fn(),
  getNonCommercialFinancialTransfersByTargetQuoteId: vi.fn(),
  updateSampleOrder: vi.fn(),
  insertAuditLog: vi.fn(),
}));

vi.mock("./permissionsService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./permissionsService")>()),
  hasUserPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock("./alfaluxApiService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./alfaluxApiService")>()),
  fetchAllAlfaluxProducts: vi.fn().mockResolvedValue([]),
  fetchComponentes: vi.fn().mockResolvedValue({ items: [] }),
  fetchAcessoriosProducts: vi.fn().mockResolvedValue([]),
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
    dbMocks.applyNonCommercialRevenueTransfer.mockResolvedValue(undefined);
    dbMocks.reverseNonCommercialRevenueTransfer.mockResolvedValue(undefined);
    dbMocks.deleteSampleOrder.mockResolvedValue(undefined);
    dbMocks.getNonCommercialFinancialTransferBySourceQuoteId.mockResolvedValue(null);
    dbMocks.getNonCommercialFinancialTransfersByTargetQuoteId.mockResolvedValue([]);
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

  it.each(["cobrar", "diluir"] as const)("transfers revenue and cost when linking with %s", async (linkType) => {
    const caller = appRouter.createCaller(createContext());
    dbMocks.getSampleOrderById.mockResolvedValue({
      id: 71, quoteId: 5, kind: "sample", costAmount: "1270.65", originalTotalFinal: "3954.89",
    });
    dbMocks.getQuoteById.mockResolvedValue({ quote: { id: 8, status: "open" }, items: [], versions: [] });
    dbMocks.listSampleLinks.mockResolvedValue([]);
    dbMocks.createSampleLink.mockResolvedValue({ id: 90 });

    await caller.samples.link({ sampleOrderId: 71, linkedQuoteId: 8, linkType });

    expect(dbMocks.createSampleLink).toHaveBeenCalledWith(expect.objectContaining({
      transferredRevenue: 3954.89,
      transferredCost: 1270.65,
    }));
    expect(dbMocks.applyNonCommercialRevenueTransfer).toHaveBeenCalledWith(8, 3954.89);
  });

  it("does not transfer finance for a simple association", async () => {
    const caller = appRouter.createCaller(createContext());
    dbMocks.getSampleOrderById.mockResolvedValue({ id: 71, quoteId: 5, kind: "maintenance", costAmount: "400", originalTotalFinal: "900" });
    dbMocks.getQuoteById.mockResolvedValue({ quote: { id: 8, status: "open" }, items: [], versions: [] });
    dbMocks.listSampleLinks.mockResolvedValue([]);
    dbMocks.createSampleLink.mockResolvedValue({ id: 90 });

    await caller.samples.link({ sampleOrderId: 71, linkedQuoteId: 8, linkType: "associar" });

    expect(dbMocks.applyNonCommercialRevenueTransfer).not.toHaveBeenCalled();
  });

  it("reverts every financial transfer before cancelling the original order", async () => {
    const caller = appRouter.createCaller(createContext());
    dbMocks.getSampleOrderById.mockResolvedValue({ id: 71, quoteId: 5, kind: "sample" });
    dbMocks.listSampleLinks.mockResolvedValue([{ id: 90, linkedQuoteId: 8, transferredRevenue: "3954.89", financialTransferredAt: "2026-08-13 15:47:45" }]);

    await expect(caller.samples.cancel({ id: 71, quoteId: 5 })).resolves.toEqual({ success: true });

    expect(dbMocks.reverseNonCommercialRevenueTransfer).toHaveBeenCalledWith(8, 3954.89);
    expect(dbMocks.deleteSampleOrder).toHaveBeenCalledWith(71, 5);
  });

  it("zeros the transferred order cost and adds the cost to the destination quote", async () => {
    const caller = appRouter.createCaller(createContext());
    dbMocks.getQuoteById.mockResolvedValue({ quote: { id: 5, marginPercent: "0" }, items: [], versions: [] });
    dbMocks.getNonCommercialFinancialTransferBySourceQuoteId.mockResolvedValue({
      linkedQuoteId: 8, linkType: "cobrar", revenue: "3954.89", cost: "1270.65", transferredAt: "2026-08-13 15:47:45",
    });

    await expect(caller.quotes.calculateCost({ quoteId: 5 })).resolves.toMatchObject({
      custoProdutos: 0,
      transferredOut: { linkedQuoteId: 8, cost: 1270.65 },
    });

    dbMocks.getNonCommercialFinancialTransferBySourceQuoteId.mockResolvedValue(null);
    dbMocks.getNonCommercialFinancialTransfersByTargetQuoteId.mockResolvedValue([
      { linkId: 90, linkType: "cobrar", sourceQuoteNumber: "33.9995-26", cost: "1270.65" },
    ]);
    dbMocks.getQuoteById.mockResolvedValue({ quote: { id: 8, marginPercent: "0" }, items: [], versions: [] });

    await expect(caller.quotes.calculateCost({ quoteId: 8 })).resolves.toMatchObject({
      custoProdutos: 1270.65,
      transferredCost: 1270.65,
    });
  });

  it("keeps the original cost and adds no destination cost for a simple association", async () => {
    const caller = appRouter.createCaller(createContext());
    dbMocks.getQuoteById.mockResolvedValue({
      quote: { id: 5, marginPercent: "0" },
      versions: [{ id: "v1" }],
      items: [{ quoteVersionId: "v1", itemNumber: 1, itemData: JSON.stringify({ sku: "ESPECIAL", qty: 1, isSpecialItem: true, custoManual: 500 }) }],
    });

    await expect(caller.quotes.calculateCost({ quoteId: 5 })).resolves.toMatchObject({ custoProdutos: 500 });

    dbMocks.getQuoteById.mockResolvedValue({ quote: { id: 8, marginPercent: "0" }, items: [], versions: [] });
    await expect(caller.quotes.calculateCost({ quoteId: 8 })).resolves.toMatchObject({ custoProdutos: 0, transferredCost: 0 });
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
