import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("confirmação do backup manual", () => {
  it("aguarda a conclusão da mutation e insere no histórico os dois arquivos persistidos", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Backup.tsx"), "utf-8");

    expect(source).toContain("trpc.backup.runNow.useMutation");
    expect(source).toContain("const handleRunBackupNow = async () => {");
    expect(source).toContain("const result = await runBackupNowMutation.mutateAsync()");
    expect(source).toContain("result.historyRows");
    expect(source).toContain("mergeConfirmedBackupRows(current, result.historyRows)");
    expect(source).toContain("void backupListQuery.refetch()");
    expect(source).toContain("function isQueuedBackup");
    expect(source).toContain('refetchOnMount: "always"');
    expect(source).toContain("Gerando o backup completo e salvando no histórico");
    expect(source).toContain("O serviço de backup está temporariamente indisponível");
  });

  it("não depende de uma espera por tarefa solta depois da resposta HTTP", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Backup.tsx"), "utf-8");

    expect(source).not.toContain("waitForBackupCompletion");
    expect(source).not.toContain("backupWaiting");
  });
});
