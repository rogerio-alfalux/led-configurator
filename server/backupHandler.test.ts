import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const { authenticateRequestMock, generateBackupMock } = vi.hoisted(() => ({
  authenticateRequestMock: vi.fn(),
  generateBackupMock: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: authenticateRequestMock },
}));
vi.mock("./backupService", () => ({
  generateAndStoreCompleteBackup: generateBackupMock,
}));

import { dailyBackupHandler } from "./backupHandler";

function createResponse() {
  const response = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };
  return response as typeof response & Response;
}

describe("dailyBackupHandler", () => {
  beforeEach(() => {
    authenticateRequestMock.mockReset();
    generateBackupMock.mockReset();
  });

  it("executa a rotina completa para uma chamada autenticada do Heartbeat", async () => {
    authenticateRequestMock.mockResolvedValue({ isCron: true, taskUid: "cron-backup-1" });
    generateBackupMock.mockResolvedValue({
      ok: true,
      elapsedMs: 42,
      counts: { totalTables: 27, totalRows: 35303 },
    });
    const req = { originalUrl: "/api/scheduled/daily-backup" } as Request;
    const res = createResponse();

    await dailyBackupHandler(req, res);

    expect(generateBackupMock).toHaveBeenCalledWith({
      cronTaskUid: "cron-backup-1",
      trigger: "automatic",
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ ok: true });
  });

  it("recusa chamadas que não pertencem ao Heartbeat", async () => {
    authenticateRequestMock.mockResolvedValue({ isCron: false, taskUid: null });
    const req = { originalUrl: "/api/scheduled/daily-backup" } as Request;
    const res = createResponse();

    await dailyBackupHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(generateBackupMock).not.toHaveBeenCalled();
  });

  it("responde 403 quando a autenticação do agendamento falha", async () => {
    authenticateRequestMock.mockRejectedValue(new Error("sessão inválida"));
    const req = { originalUrl: "/api/scheduled/daily-backup" } as Request;
    const res = createResponse();

    await dailyBackupHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ error: "sessão inválida" });
    expect(generateBackupMock).not.toHaveBeenCalled();
  });
});
