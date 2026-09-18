import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { generateBackupMock, createMarkerMock } = vi.hoisted(() => ({
  generateBackupMock: vi.fn(),
  createMarkerMock: vi.fn(),
}));

vi.mock("./backupService", async importOriginal => ({
  ...(await importOriginal<typeof import("./backupService")>()),
  generateAndStoreCompleteBackup: generateBackupMock,
  createBackupRunMarker: createMarkerMock,
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
    createMarkerMock.mockReset();
    generateBackupMock.mockResolvedValue({ ok: true });
    createMarkerMock.mockResolvedValue(999);
  });

  it("inicia o backup assíncrono para não manter a requisição aberta durante uploads grandes", async () => {
    const result = await appRouter.createCaller(createContext("admin")).backup.runNow();
    expect(createMarkerMock).toHaveBeenCalledWith(expect.stringMatching(/^manual-/));
    expect(generateBackupMock).toHaveBeenCalledWith(expect.objectContaining({
      trigger: "manual",
      cronTaskUid: expect.stringMatching(/^manual-/),
    }));
    expect(result).toMatchObject({ ok: true, queued: true });
    expect(result.queuedAt).toEqual(expect.any(String));
    expect(result.executionId).toMatch(/^manual-/);
  });

  it("impede usuários não administradores de executar o backup", async () => {
    await expect(appRouter.createCaller(createContext("user")).backup.runNow()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(generateBackupMock).not.toHaveBeenCalled();
  });
});
