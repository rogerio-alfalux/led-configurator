import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const generator = source.slice(
  source.indexOf("export async function generateQuoteNumber"),
  source.indexOf("export interface SaveQuoteInput"),
);

describe("recuperação da sequência automática de orçamentos", () => {
  it("consulta o maior número real antes de reservar o próximo", () => {
    expect(generator).toContain("orderBy(desc(quotes.quoteNumber))");
    expect(generator).toContain("const firstAvailableSeq = latestMatch ? Number(latestMatch[1]) + 1 : 1");
  });

  it("reserva o número em transação e corrige uma sequência atrasada", () => {
    expect(generator).toContain("return db.transaction(async (tx) =>");
    expect(generator).toContain("GREATEST(${quoteNumberSequences.nextSeq}, ${firstAvailableSeq}) + 1");
    expect(generator).toContain("const reservedSeq = (reservedRows[0]?.nextSeq ?? firstAvailableSeq + 1) - 1");
  });

  it("não reutiliza mais diretamente o nextSeq sem conferir os números existentes", () => {
    expect(generator).not.toContain("const currentSeq = seqRows[0].nextSeq");
    expect(generator).not.toContain("return `${vendorCode}.${String(currentSeq).padStart(4, \"0\")}-${year}`");
  });
});
