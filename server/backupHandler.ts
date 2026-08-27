/**
 * Handler do Heartbeat agendado para backup automático diário.
 * Rota: POST /api/scheduled/daily-backup
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { generateAndStoreCompleteBackup } from "./backupService";

export async function dailyBackupHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }
    taskUid = user.taskUid;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(403).json({ error: message });
  }

  try {
    const result = await generateAndStoreCompleteBackup({
      cronTaskUid: taskUid,
      trigger: "automatic",
    });
    console.log(
      `[Backup] Concluído em ${result.elapsedMs}ms — ${result.counts.totalTables} tabelas · ${result.counts.totalRows} registros`,
    );
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[Backup] Erro:", message);
    return res.status(500).json({
      error: message,
      stack,
      context: { url: req.originalUrl, taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
