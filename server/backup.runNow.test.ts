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

describe("backup.runNow", () => {
  beforeEach(() => {
    generateBackupMock.mockReset();
    generateBackupMock.mockResolvedValue({
      ok: true,
      generatedAt: "2026-08-27T15:30:00.000Z",
      counts: { totalTables: 27, totalRows: 33512 },
      files: {
        sql: { key: "backups/test.sql", url: "/api/assets/backups/test.sql", bytes: 100, fileName: "test.sql" },
        excel: { key: "backups/test.tsv", url: "/api/assets/backups/test.tsv", bytes: 80, fileName: "test.tsv" },
      },
      historyRows: [
        { id: 2, type: "sql", fileName: "test.sql" },
        { id: 3, type: "excel", fileName: "test.tsv" },
      ],
      elapsedMs: 50,
    });
  });

  it("permite ao administrador gerar e persistir o backup imediatamente", async () => {
    const result = await appRouter.createCaller(createContext("admin")).backup.runNow();
    expect(generateBackupMock).toHaveBeenCalledWith({ trigger: "manual" });
    expect(result).toMatchObject({
      ok: true,
      counts: { totalTables: 27, totalRows: 33512 },
      historyRows: [{ id: 2, type: "sql" }, { id: 3, type: "excel" }],
    });
  });

  it("impede usuários não administradores de executar o backup", async () => {
    await expect(appRouter.createCaller(createContext("user")).backup.runNow()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(generateBackupMock).not.toHaveBeenCalled();
  });
});
