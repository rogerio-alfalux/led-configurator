import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("documentos técnicos da BAGEO sinuosa", () => {
  it("mostra os anexos retornados pela API no cartão de resultado BAGEO", () => {
    const bageoResultStart = homeSource.indexOf("{/* ── Resultado BAGEO");
    const bageoFixedStart = homeSource.indexOf("{/* ── Resultado BAGEO fixo");
    const bageoResultSource = homeSource.slice(bageoResultStart, bageoFixedStart);

    expect(bageoResultStart).toBeGreaterThan(-1);
    expect(bageoFixedStart).toBeGreaterThan(bageoResultStart);
    expect(bageoResultSource).toContain("<ProductDocumentDownloads documents={bgResult.product.documentos} />");
  });

  it("mantém a seção genérica de documentos como download direto da API", () => {
    expect(homeSource).toContain('import { ProductDocumentDownloads } from "@/components/ProductDocumentDownloads";');
  });
});
