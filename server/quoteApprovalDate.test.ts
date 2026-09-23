import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("data de aprovação ao alterar status", () => {
  it("aceita a data civil somente na transição para aprovado e a registra na auditoria", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

    expect(source).toContain('approvedDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/, "Data de aprovação inválida").optional()');
    expect(source).toContain('if (input.approvedDate && input.status !== "approved")');
    expect(source).toContain('"A data de aprovação só pode ser informada ao aprovar o orçamento."');
    expect(source).toContain("approvedDate: input.approvedDate,");
  });

  it("persiste a data escolhida no fuso de Brasília e mantém a data atual como contingência", () => {
    const source = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

    expect(source).toContain("approvedDate?: string;");
    expect(source).toContain("updateData.approvedAt = opts?.approvedDate");
    expect(source).toContain("? brasiliaDateToUtcSqlTimestamp(opts.approvedDate)");
    expect(source).toContain(": nowUtcStr();");
  });
});
