import mysql, { type RowDataPacket } from "mysql2/promise";
import { backups } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";

export type BackupTableSnapshot = {
  name: string;
  createStatement: string;
  rows: Record<string, unknown>[];
};

export type BackupExecutionResult = {
  ok: true;
  generatedAt: string;
  counts: Record<string, number>;
  files: {
    sql: { key: string; url: string; bytes: number; fileName: string };
    excel: { key: string; url: string; bytes: number; fileName: string };
  };
  elapsedMs: number;
};

const BACKUP_TIME_ZONE = "America/Sao_Paulo";
const INSERT_BATCH_SIZE = 250;

function quoteIdentifier(identifier: string): string {
  return `\`${identifier.replace(/`/g, "``")}\``;
}

export function escapeBackupSqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return value.toString();
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return `0x${Buffer.from(value).toString("hex")}`;
  }
  const normalized = value instanceof Date
    ? value.toISOString().slice(0, 23).replace("T", " ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return `'${normalized
    .replace(/\\/g, "\\\\")
    .replace(/\0/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\x1a/g, "\\Z")
    .replace(/'/g, "\\'")}'`;
}

function buildInsertStatements(table: BackupTableSnapshot): string {
  if (table.rows.length === 0) return `-- ${table.name}: sem dados\n\n`;
  const columns = Object.keys(table.rows[0] ?? {});
  if (columns.length === 0) return `-- ${table.name}: sem colunas exportáveis\n\n`;
  const columnSql = columns.map(quoteIdentifier).join(", ");
  const statements: string[] = [];

  for (let offset = 0; offset < table.rows.length; offset += INSERT_BATCH_SIZE) {
    const batch = table.rows.slice(offset, offset + INSERT_BATCH_SIZE);
    const values = batch
      .map(row => `  (${columns.map(column => escapeBackupSqlValue(row[column])).join(", ")})`)
      .join(",\n");
    statements.push(`INSERT INTO ${quoteIdentifier(table.name)} (${columnSql}) VALUES\n${values};`);
  }

  return `-- Tabela: ${table.name} (${table.rows.length} registros)\n${statements.join("\n")}\n\n`;
}

export function buildCompleteSqlBackup(tables: BackupTableSnapshot[], generatedAt: Date): string {
  const sortedTables = [...tables].sort((a, b) => a.name.localeCompare(b.name));
  const header = [
    "-- Backup completo do Sistema Luna",
    `-- Gerado em: ${generatedAt.toLocaleString("pt-BR", { timeZone: BACKUP_TIME_ZONE })} (${BACKUP_TIME_ZONE})`,
    `-- Tabelas: ${sortedTables.length}`,
    "-- Grupo Alfalux Iluminação",
    "",
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS=0;",
    "",
  ].join("\n");

  const drops = [...sortedTables]
    .reverse()
    .map(table => `DROP TABLE IF EXISTS ${quoteIdentifier(table.name)};`)
    .join("\n");
  const schemas = sortedTables
    .map(table => `${table.createStatement.replace(/;\s*$/, "")};`)
    .join("\n\n");
  const data = sortedTables.map(buildInsertStatements).join("");

  return `${header}${drops}\n\n${schemas}\n\n${data}SET FOREIGN_KEY_CHECKS=1;\n`;
}

function normalizeTsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return Buffer.from(value).toString("base64");
  const normalized = value instanceof Date
    ? value.toISOString()
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return normalized.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

export function buildCompleteTsvBackup(tables: BackupTableSnapshot[]): Buffer {
  const parts: string[] = [];
  for (const table of [...tables].sort((a, b) => a.name.localeCompare(b.name))) {
    parts.push(`=== TABELA: ${table.name} ===`);
    if (table.rows.length === 0) {
      parts.push("(sem dados)", "");
      continue;
    }
    const columns = Object.keys(table.rows[0] ?? {});
    parts.push(columns.join("\t"));
    for (const row of table.rows) {
      parts.push(columns.map(column => normalizeTsvValue(row[column])).join("\t"));
    }
    parts.push("");
  }
  return Buffer.from(parts.join("\n"), "utf-8");
}

export function buildBackupCounts(tables: BackupTableSnapshot[]): Record<string, number> {
  const counts = Object.fromEntries(tables.map(table => [table.name, table.rows.length]));
  return {
    ...counts,
    quotes: counts.quotes ?? 0,
    versions: counts.quote_versions ?? 0,
    items: counts.quote_items ?? 0,
    sellers: counts.sellers ?? 0,
    assistants: counts.assistants ?? 0,
    users: counts.users ?? 0,
    goals: counts.sales_goals ?? 0,
    orders: counts.factory_orders ?? 0,
    orderItems: counts.factory_order_items ?? 0,
    totalTables: tables.length,
    totalRows: tables.reduce((total, table) => total + table.rows.length, 0),
  };
}

export function getBrasiliaBackupStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BACKUP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}-${values.hour}-${values.minute}-${values.second}`;
}

export async function collectCompleteDatabaseSnapshot(): Promise<BackupTableSnapshot[]> {
  if (!ENV.databaseUrl) throw new Error("DATABASE_URL não configurada");
  const connection = await mysql.createConnection(ENV.databaseUrl);
  try {
    const [tableRows] = await connection.query<RowDataPacket[]>("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    const tableNames = tableRows
      .map(row => String(Object.values(row)[0] ?? ""))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    const snapshots: BackupTableSnapshot[] = [];

    for (const tableName of tableNames) {
      const quotedName = quoteIdentifier(tableName);
      const [createRows] = await connection.query<RowDataPacket[]>(`SHOW CREATE TABLE ${quotedName}`);
      const createRow = createRows[0] ?? {};
      const createStatement = String(createRow["Create Table"] ?? Object.values(createRow)[1] ?? "");
      if (!createStatement) throw new Error(`Não foi possível obter a estrutura da tabela ${tableName}`);
      const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM ${quotedName}`);
      snapshots.push({
        name: tableName,
        createStatement,
        rows: rows.map(row => ({ ...row })),
      });
    }

    return snapshots;
  } finally {
    await connection.end();
  }
}

let activeBackupPromise: Promise<BackupExecutionResult> | null = null;

async function executeCompleteBackup(options?: {
  cronTaskUid?: string | null;
  trigger?: "automatic" | "manual";
  now?: Date;
}): Promise<BackupExecutionResult> {
  const startedAt = options?.now ?? new Date();
  const startedMs = Date.now();
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");

  try {
    const tables = await collectCompleteDatabaseSnapshot();
    const counts = buildBackupCounts(tables);
    const sqlBuffer = Buffer.from(buildCompleteSqlBackup(tables, startedAt), "utf-8");
    const excelBuffer = buildCompleteTsvBackup(tables);
    const stamp = getBrasiliaBackupStamp(startedAt);
    const dateFolder = stamp.slice(0, 10);
    const sqlFileName = `backup-${stamp}.sql`;
    const excelFileName = `backup-${stamp}.tsv`;
    const [sqlUpload, excelUpload] = await Promise.all([
      storagePut(`backups/${dateFolder}/${sqlFileName}`, sqlBuffer, "application/sql"),
      storagePut(`backups/${dateFolder}/${excelFileName}`, excelBuffer, "text/tab-separated-values"),
    ]);
    const countsJson = JSON.stringify({ ...counts, trigger: options?.trigger ?? "automatic" });

    await db.insert(backups).values([
      {
        type: "sql",
        fileName: sqlFileName,
        fileUrl: sqlUpload.url,
        fileKey: sqlUpload.key,
        fileSizeBytes: sqlBuffer.length,
        status: "success",
        recordCounts: countsJson,
        cronTaskUid: options?.cronTaskUid ?? null,
      },
      {
        type: "excel",
        fileName: excelFileName,
        fileUrl: excelUpload.url,
        fileKey: excelUpload.key,
        fileSizeBytes: excelBuffer.length,
        status: "success",
        recordCounts: countsJson,
        cronTaskUid: options?.cronTaskUid ?? null,
      },
    ]);

    return {
      ok: true,
      generatedAt: startedAt.toISOString(),
      counts,
      files: {
        sql: { key: sqlUpload.key, url: sqlUpload.url, bytes: sqlBuffer.length, fileName: sqlFileName },
        excel: { key: excelUpload.key, url: excelUpload.url, bytes: excelBuffer.length, fileName: excelFileName },
      },
      elapsedMs: Date.now() - startedMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stamp = getBrasiliaBackupStamp(startedAt);
    try {
      await db.insert(backups).values({
        type: "sql",
        fileName: `backup-error-${stamp}.sql`,
        fileUrl: "",
        fileKey: "",
        fileSizeBytes: 0,
        status: "error",
        errorMessage: message,
        recordCounts: JSON.stringify({ trigger: options?.trigger ?? "automatic" }),
        cronTaskUid: options?.cronTaskUid ?? null,
      });
    } catch {
      // O erro original é mais útil do que uma falha secundária ao registrar o histórico.
    }
    throw error;
  }
}

export function generateAndStoreCompleteBackup(options?: {
  cronTaskUid?: string | null;
  trigger?: "automatic" | "manual";
  now?: Date;
}): Promise<BackupExecutionResult> {
  if (activeBackupPromise) return activeBackupPromise;
  activeBackupPromise = executeCompleteBackup(options).finally(() => {
    activeBackupPromise = null;
  });
  return activeBackupPromise;
}
