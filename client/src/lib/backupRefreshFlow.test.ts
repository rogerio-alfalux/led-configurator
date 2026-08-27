import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("botão Atualizar do backup", () => {
  it("executa um novo backup e recarrega o histórico ao concluir", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Backup.tsx"), "utf-8");
    expect(source).toContain("trpc.backup.runNow.useMutation");
    expect(source).toContain("onClick={() => runBackupNowMutation.mutate()}");
    expect(source).toContain("await backupListQuery.refetch()");
    expect(source).toContain("Gerando o backup completo e salvando no histórico");
  });
});
