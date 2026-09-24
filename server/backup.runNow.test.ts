import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { generateBackupMock } = vi.hoisted(() => ({
  generateBackupMock: vi.fn(),
}));

vi.mock("./backupService", async importOriginal => ({
  ...(await importOriginal<typeof import("./backupService")>()),
  generateAndStoreCompleteBackup: generateBackupMock,
}));

import { appRouter } from "./routers";

function createContext(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `backup-${role}`,
      email: `${role}@grupoalfalux.com.br`,
      name: role,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const completedBackup = {
  ok: true as const,
  generatedAt: "2026-09-24T17:00:00.000Z",
  elapsedMs: 5400,
  counts: { totalTables: 27, totalRows: 58_764 },
  files: {
    sql: { key: "backups/test.sql", url: "/api/assets/backups/test.sql", bytes: 1, fileName: "test.sql" },
    excel: { key: "backups/test.tsv", url: "/api/assets/backups/test.tsv", bytes: 1, fileName: "test.tsv" },
  },
  historyRows: [
    { id: 10, type: "sql", fileName: "test.sql", fileUrl: "/api/assets/backups/test.sql" },
    { id: 11, type: "excel", fileName: "test.tsv", fileUrl: "/api/assets/backups/test.tsv" },
  ],
};

describe("backup.runNow", () => {
  beforeEach(() => {
    generateBackupMock.mockReset();
    generateBackupMock.mockResolvedValue(completedBackup);
  });

  it("aguarda os arquivos persistidos antes de responder, sem marcador pendente", async () => {
    const result = await appRouter.createCaller(createContext("admin")).backup.runNow();

    expect(generateBackupMock).toHaveBeenCalledWith(expect.objectContaining({
      trigger: "manual",
      cronTaskUid: expect.stringMatching(/^manual-/),
    }));
    expect(result).toMatchObject({
      ok: true,
      historyRows: completedBackup.historyRows,
      elapsedMs: 5400,
    });
    expect(result.executionId).toMatch(/^manual-/);
  });

  it("propaga falhas de geração em vez de deixar o histórico em processamento", async () => {
    generateBackupMock.mockRejectedValueOnce(new Error("Falha no upload"));

    await expect(appRouter.createCaller(createContext("admin")).backup.runNow()).rejects.toThrow("Falha no upload");
  });

  it("impede usuários não administradores de executar o backup", async () => {
    await expect(appRouter.createCaller(createContext("user")).backup.runNow()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(generateBackupMock).not.toHaveBeenCalled();
  });
});
