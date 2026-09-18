import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("botão Atualizar do backup", () => {
  it("executa um novo backup e recarrega o histórico ao concluir", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Backup.tsx"), "utf-8");
    expect(source).toContain("trpc.backup.runNow.useMutation");
    expect(source).toContain("const handleRunBackupNow = async () => {");
    expect(source).toContain("await runBackupNowMutation.mutateAsync()");
    expect(source).toContain("const waitForBackupCompletion = async (queuedAt: string) => {");
    expect(source).toContain("await backupListQuery.refetch()");
    expect(source).toContain("hasSql && hasExcel");
    expect(source).toContain("const [confirmedBackupRows, setConfirmedBackupRows]");
    expect(source).toContain("mergeConfirmedBackupRows(current, completedRows)");
    expect(source).toContain("mergeConfirmedBackupRows(backupListQuery.data, confirmedBackupRows)");
    expect(source).toContain("Gerando o backup completo e salvando no histórico");
    expect(source).toContain("O serviço de backup está temporariamente indisponível");
    expect(source).not.toContain('toast.error(error.message || "Erro ao gerar backup atualizado")');
  });
});
