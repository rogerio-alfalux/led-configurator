import { describe, expect, it } from "vitest";
import {
  buildBackupCounts,
  buildCompleteSqlBackup,
  buildCompleteTsvBackup,
  escapeBackupSqlValue,
  getBrasiliaBackupStamp,
  type BackupTableSnapshot,
} from "./backupService";

const tables: BackupTableSnapshot[] = [
  {
    name: "quote_additional_costs",
    createStatement: "CREATE TABLE `quote_additional_costs` (`id` int NOT NULL, `descricao` text)",
    rows: [{ id: 1, descricao: "Frete d'água\nurgente" }],
  },
  {
    name: "driver_price_overrides",
    createStatement: "CREATE TABLE `driver_price_overrides` (`id` int NOT NULL, `customCusto` decimal(10,2))",
    rows: [{ id: 2, customCusto: "21.76" }],
  },
  {
    name: "quotes",
    createStatement: "CREATE TABLE `quotes` (`id` int NOT NULL)",
    rows: [{ id: 10 }, { id: 11 }],
  },
  {
    name: "quote_items",
    createStatement: "CREATE TABLE `quote_items` (`id` int NOT NULL)",
    rows: [{ id: 20 }],
  },
];

describe("backupService", () => {
  it("gera estrutura e INSERTs de todas as tabelas recebidas, sem LIMIT", () => {
    const sql = buildCompleteSqlBackup(tables, new Date("2026-08-27T15:30:00.000Z"));
    expect(sql).toContain("CREATE TABLE `quote_additional_costs`");
    expect(sql).toContain("INSERT INTO `driver_price_overrides`");
    expect(sql).toContain("INSERT INTO `quotes`");
    expect(sql).not.toMatch(/\bLIMIT\b/i);
    expect(sql).toContain("Frete d\\'água\\nurgente");
  });

  it("mantém todas as tabelas e linhas no backup tabular", () => {
    const tsv = buildCompleteTsvBackup(tables).toString("utf-8");
    expect(tsv).toContain("=== TABELA: quote_additional_costs ===");
    expect(tsv).toContain("=== TABELA: driver_price_overrides ===");
    expect(tsv).toContain("Frete d'água urgente");
  });

  it("expõe contagens completas e aliases usados pela tela", () => {
    expect(buildBackupCounts(tables)).toMatchObject({
      quote_additional_costs: 1,
      driver_price_overrides: 1,
      quotes: 2,
      quote_items: 1,
      items: 1,
      totalTables: 4,
      totalRows: 5,
    });
  });

  it("gera nomes no horário de Brasília e escapa binários", () => {
    expect(getBrasiliaBackupStamp(new Date("2026-08-27T15:30:45.000Z"))).toBe("2026-08-27-12-30-45");
    expect(escapeBackupSqlValue(Buffer.from([0xde, 0xad]))).toBe("0xdead");
  });
});
