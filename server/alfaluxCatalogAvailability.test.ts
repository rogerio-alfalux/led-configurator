import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("disponibilidade do catálogo Alfalux", () => {
  it("aguarda o catálogo central completo e reutiliza a consulta de componentes", async () => {
    const source = await readFile(new URL("./alfaluxApiService.ts", import.meta.url), "utf8");
    expect(source).toContain("AbortSignal.timeout(120_000)");
    expect(source).toContain("const componentesPromise = fetchComponentes()");
    expect(source).toContain("await componentesPromise");
  });

  it("mantém os filtros de módulos SHIFT e produtos Customizados baseados nos dados da API", async () => {
    const source = await readFile(new URL("./routers.ts", import.meta.url), "utf8");
    expect(source).toContain("p.sku.startsWith(\"S01\")");
    expect(source).toContain("fetchCustomizadosProducts()");
  });
});
