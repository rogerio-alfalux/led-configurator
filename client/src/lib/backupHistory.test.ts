import { describe, expect, it } from "vitest";
import { mergeConfirmedBackupRows } from "./backupHistory";

describe("histórico após backup manual", () => {
  it("mostra imediatamente os dois registros confirmados pelo servidor", () => {
    const existing = [{ id: 1, createdAt: "2026-08-27T13:12:36.000Z", fileName: "antigo.sql" }];
    const confirmed = [
      { id: 3, createdAt: "2026-08-27T17:20:10.000Z", fileName: "novo.tsv" },
      { id: 2, createdAt: "2026-08-27T17:20:10.000Z", fileName: "novo.sql" },
    ];

    expect(mergeConfirmedBackupRows(existing, confirmed).map(row => row.id)).toEqual([3, 2, 1]);
  });

  it("não duplica registros quando o refetch já retornou o mesmo backup", () => {
    const rows = [{ id: 2, createdAt: "2026-08-27T17:20:10.000Z" }];
    expect(mergeConfirmedBackupRows(rows, rows)).toHaveLength(1);
  });
});
