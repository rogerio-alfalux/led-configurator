import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("disponibilidade do catálogo Alfalux", () => {
  it("valida o catálogo completo, responde antes do cliente e preserva o último snapshot oficial", async () => {
    const source = await readFile(new URL("./alfaluxApiService.ts", import.meta.url), "utf8");
    expect(source).toContain("PRODUCT_CATALOG_API_TIMEOUT_MS = 45_000");
    expect(source).toContain("isValidOfficialProductCatalog(body.products)");
    expect(source).toContain("loadPersistedAlfaluxProductCatalogSnapshot()");
    expect(source).toContain("persistAlfaluxProductCatalogSnapshot(all, now)");
    expect(source).toContain("const componentesPromise = fetchComponentes(");
    expect(source).toContain("await componentesPromise");
    expect(source).toContain("AVAILABILITY_CACHE_TTL_MS");
    expect(source).toContain("componentesFetchInFlight");
  });

  it("mantém o configurador de perfis exclusivamente no catálogo da API", async () => {
    const source = await readFile(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    expect(source).toContain("return apiCatalog ?? {}");
    expect(source).toContain("catalog: activeProfileCatalog");
    expect(source).toContain("Catálogo da API indisponível");
    expect(source).not.toContain("variantes • Catálogo local");
  });

  it("mantém os filtros de módulos SHIFT e produtos Customizados baseados nos dados da API", async () => {
    const source = await readFile(new URL("./routers.ts", import.meta.url), "utf8");
    expect(source).toContain("p.sku.startsWith(\"S01\")");
    expect(source).toContain("fetchCustomizadosProducts()");
  });
});
