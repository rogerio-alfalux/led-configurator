import { collectCompleteDatabaseSnapshot, buildCompleteSqlBackup, buildCompleteTsvBackup } from "../server/backupService.ts";

const started = Date.now();
const tables = await collectCompleteDatabaseSnapshot();
const collectedMs = Date.now() - started;
const sql = Buffer.from(buildCompleteSqlBackup(tables, new Date()), "utf8");
const tsv = buildCompleteTsvBackup(tables);
console.log(JSON.stringify({
  tables: tables.length,
  rows: tables.reduce((sum, table) => sum + table.rows.length, 0),
  collectedMs,
  sqlBytes: sql.length,
  tsvBytes: tsv.length,
  largestTables: tables
    .map(table => ({ name: table.name, rows: table.rows.length }))
    .sort((a, b) => b.rows - a.rows)
    .slice(0, 10),
}, null, 2));
