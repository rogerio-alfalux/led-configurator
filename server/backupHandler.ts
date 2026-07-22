/**
 * backupHandler.ts
 * Handler do Heartbeat agendado para backup automático diário.
 * Rota: POST /api/scheduled/daily-backup
 *
 * Gera dois arquivos:
 *   1. SQL completo (INSERT INTO) de todas as tabelas principais
 *   2. Excel com todas as tabelas em abas separadas
 *
 * Ambos são salvos no S3 e registrados na tabela `backups`.
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { storagePut } from "./storage";
import {
  quotes, quoteVersions, quoteItems,
  sellers, assistants, users, salesGoals,
  factoryOrders, factoryOrderItems, backups,
} from "../drizzle/schema";
import { desc } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeSQL(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  return `'${String(v)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")}'`;
}

function tableToSQL(tableName: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return `-- ${tableName}: sem dados\n`;
  const cols = Object.keys(rows[0]);
  const header = `-- Tabela: ${tableName} (${rows.length} registros)\nINSERT INTO \`${tableName}\` (${cols.map(c => `\`${c}\``).join(", ")}) VALUES\n`;
  const values = rows.map(row => `  (${cols.map(c => escapeSQL(row[c])).join(", ")})`).join(",\n");
  return header + values + ";\n\n";
}

function buildExcelBuffer(sheets: { name: string; rows: Record<string, unknown>[] }[]): Buffer {
  // Gera CSV simples separado por aba (sem dependência de xlsx no runtime)
  // Cada aba é separada por "=== SHEET: name ===\n"
  // O frontend pode usar xlsx para renderizar, mas o backup raw é CSV multi-aba
  const parts: string[] = [];
  for (const sheet of sheets) {
    parts.push(`=== SHEET: ${sheet.name} ===`);
    if (sheet.rows.length === 0) {
      parts.push("(sem dados)");
    } else {
      const cols = Object.keys(sheet.rows[0]);
      parts.push(cols.join("\t"));
      for (const row of sheet.rows) {
        parts.push(cols.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return "";
          return String(v).replace(/\t/g, " ").replace(/\n/g, " ");
        }).join("\t"));
      }
    }
    parts.push("");
  }
  return Buffer.from(parts.join("\n"), "utf-8");
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function dailyBackupHandler(req: Request, res: Response) {
  // Autenticar: aceitar apenas chamadas do Heartbeat (cron) ou chamadas internas (sem cookie)
  // Chamadas diretas do sandbox (sem cookie) são permitidas para testes manuais
  const hasCookie = !!(req.headers.cookie && req.headers.cookie.includes("app_session_id"));
  if (hasCookie) {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) {
        return res.status(403).json({ error: "cron-only endpoint" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(403).json({ error: msg });
    }
  }

  const startedAt = new Date();
  const db = await getDb();
  if (!db) {
    return res.status(500).json({ error: "DB indisponível" });
  }

  try {
    // 1. Buscar todos os dados
    const [
      allQuotes, allVersions, allItems,
      allSellers, allAssistants, allUsers,
      allGoals, allOrders, allOrderItems,
    ] = await Promise.all([
      db.select().from(quotes).orderBy(desc(quotes.createdAt)),
      db.select().from(quoteVersions),
      db.select().from(quoteItems),
      db.select().from(sellers),
      db.select().from(assistants),
      db.select().from(users),
      db.select().from(salesGoals),
      db.select().from(factoryOrders).orderBy(desc(factoryOrders.createdAt)),
      db.select().from(factoryOrderItems),
    ]);

    const counts = {
      quotes: allQuotes.length,
      versions: allVersions.length,
      items: allItems.length,
      sellers: allSellers.length,
      assistants: allAssistants.length,
      users: allUsers.length,
      goals: allGoals.length,
      orders: allOrders.length,
      orderItems: allOrderItems.length,
    };

    const dateStr = startedAt.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = startedAt.toISOString().slice(11, 19).replace(/:/g, "-"); // HH-MM-SS

    // 2. Gerar SQL
    let sqlContent = `-- Backup completo do Sistema Luna\n-- Gerado em: ${startedAt.toISOString()}\n-- Grupo Alfalux Iluminação\n\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n`;
    sqlContent += tableToSQL("quotes", allQuotes as Record<string, unknown>[]);
    sqlContent += tableToSQL("quote_versions", allVersions as Record<string, unknown>[]);
    sqlContent += tableToSQL("quote_items", allItems as Record<string, unknown>[]);
    sqlContent += tableToSQL("sellers", allSellers as Record<string, unknown>[]);
    sqlContent += tableToSQL("assistants", allAssistants as Record<string, unknown>[]);
    sqlContent += tableToSQL("users", allUsers as Record<string, unknown>[]);
    sqlContent += tableToSQL("sales_goals", allGoals as Record<string, unknown>[]);
    sqlContent += tableToSQL("factory_orders", allOrders as Record<string, unknown>[]);
    sqlContent += tableToSQL("factory_order_items", allOrderItems as Record<string, unknown>[]);
    sqlContent += `\nSET FOREIGN_KEY_CHECKS=1;\n`;
    const sqlBuffer = Buffer.from(sqlContent, "utf-8");

    // 3. Gerar Excel (TSV multi-aba)
    const excelBuffer = buildExcelBuffer([
      { name: "Orçamentos", rows: allQuotes as Record<string, unknown>[] },
      { name: "Versões", rows: allVersions as Record<string, unknown>[] },
      { name: "Itens", rows: allItems as Record<string, unknown>[] },
      { name: "Pedidos Fábrica", rows: allOrders as Record<string, unknown>[] },
      { name: "Itens Pedidos", rows: allOrderItems as Record<string, unknown>[] },
      { name: "Vendedores", rows: allSellers as Record<string, unknown>[] },
      { name: "Assistentes", rows: allAssistants as Record<string, unknown>[] },
      { name: "Usuários", rows: allUsers as Record<string, unknown>[] },
      { name: "Metas", rows: allGoals as Record<string, unknown>[] },
    ]);

    // 4. Upload para S3
    const sqlKey = `backups/${dateStr}/backup-${dateStr}-${timeStr}.sql`;
    const excelKey = `backups/${dateStr}/backup-${dateStr}-${timeStr}.tsv`;

    const [sqlUpload, excelUpload] = await Promise.all([
      storagePut(sqlKey, sqlBuffer, "application/sql"),
      storagePut(excelKey, excelBuffer, "text/tab-separated-values"),
    ]);

    const countsJson = JSON.stringify(counts);

    // 5. Registrar no banco
    await db.insert(backups).values([
      {
        type: "sql",
        fileName: `backup-${dateStr}-${timeStr}.sql`,
        fileUrl: sqlUpload.url,
        fileKey: sqlUpload.key,
        fileSizeBytes: sqlBuffer.length,
        status: "success",
        recordCounts: countsJson,
        cronTaskUid: req.headers["x-manus-cron-task-uid"] as string | undefined ?? null,
      },
      {
        type: "excel",
        fileName: `backup-${dateStr}-${timeStr}.tsv`,
        fileUrl: excelUpload.url,
        fileKey: excelUpload.key,
        fileSizeBytes: excelBuffer.length,
        status: "success",
        recordCounts: countsJson,
        cronTaskUid: req.headers["x-manus-cron-task-uid"] as string | undefined ?? null,
      },
    ]);

    const elapsed = Date.now() - startedAt.getTime();
    console.log(`[Backup] Concluído em ${elapsed}ms — SQL: ${sqlBuffer.length} bytes, Excel: ${excelBuffer.length} bytes`);

    return res.json({
      ok: true,
      generatedAt: startedAt.toISOString(),
      counts,
      files: {
        sql: { key: sqlUpload.key, url: sqlUpload.url, bytes: sqlBuffer.length },
        excel: { key: excelUpload.key, url: excelUpload.url, bytes: excelBuffer.length },
      },
      elapsedMs: elapsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[Backup] Erro:", message);

    // Registrar falha no banco (melhor esforço)
    try {
      await db.insert(backups).values({
        type: "sql",
        fileName: `backup-error-${startedAt.toISOString().slice(0, 19).replace(/:/g, "-")}.sql`,
        fileUrl: "",
        fileKey: "",
        fileSizeBytes: 0,
        status: "error",
        errorMessage: message,
        cronTaskUid: req.headers["x-manus-cron-task-uid"] as string | undefined ?? null,
      });
    } catch (_) { /* silenciar erro secundário */ }

    return res.status(500).json({ error: message, stack, timestamp: startedAt.toISOString() });
  }
}
