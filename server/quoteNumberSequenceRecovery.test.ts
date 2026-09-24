import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const generator = source.slice(
  source.indexOf("export async function generateQuoteNumber"),
  source.indexOf("export interface SaveQuoteInput"),
);
const peek = source.slice(
  source.indexOf("export async function peekQuoteNumber"),
  source.indexOf("// ─── Auditoria"),
);

describe("recuperação da sequência automática de orçamentos", () => {
  it("consulta a última sequência válida do vendedor antes de reservar o próximo", () => {
    expect(generator).toContain("sellerId?: number | null");
    expect(generator).toContain("eq(quotes.seller1Id, sellerId)");
    expect(generator).toContain("orderBy(desc(quotes.createdAt), desc(quotes.id))");
    expect(generator).toContain("getCommercialQuoteSequence(row.quoteNumber, vendorCode, year)");
    expect(generator).toContain("const firstAvailableSeq = lastValidSeq != null ? lastValidSeq + 1 : 1");
  });

  it("reserva o número em transação e corrige uma sequência atrasada", () => {
    expect(generator).toContain("return db.transaction(async (tx) =>");
    expect(generator).toContain("GREATEST(${quoteNumberSequences.nextSeq}, ${firstAvailableSeq}) + 1");
    expect(generator).toContain("const reservedSeq = (reservedRows[0]?.nextSeq ?? firstAvailableSeq + 1) - 1");
    expect(generator).toContain("if (reservedSeq > 9_999)");
  });

  it("não reutiliza mais diretamente o nextSeq sem conferir os números existentes", () => {
    expect(generator).not.toContain("const currentSeq = seqRows[0].nextSeq");
    expect(generator).not.toContain("return `${vendorCode}.${String(currentSeq).padStart(4, \"0\")}-${year}`");
  });

  it("sugere a partir do último número válido do vendedor escolhido, sem absorver outro vendedor", () => {
    expect(peek).toContain("sellerId?: number | null");
    expect(peek).toContain("eq(quotes.seller1Id, sellerId)");
    expect(peek).toContain("orderBy(desc(quotes.createdAt), desc(quotes.id))");
    expect(peek).toContain("getCommercialQuoteSequence(row.quoteNumber, vendorCode, year)");
    expect(peek).toContain("where(eq(quotes.quoteNumber, candidate))");
  });
});
