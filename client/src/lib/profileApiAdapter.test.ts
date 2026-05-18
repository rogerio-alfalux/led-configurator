/**
 * profileApiAdapter.test.ts
 * Testes unitários para o adaptador de perfis da API Alfalux.
 * Usa o novo formato ApiProduct do /api/products/all:
 *   - name (em vez de produto)
 *   - ledModule (em vez de moduloLed)
 *   - driver220, driverBivolt, driverDim110v, driverDimDali: { model, code } | null
 *   - temperaturasCor: string[] (em vez de JSON string)
 */
import { describe, it, expect } from "vitest";
import { adaptProfileProducts } from "./profileApiAdapter";
import type { ApiProduct, DriverInfo } from "./alfaluxApiAdapter";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDriver(model: string, code: string | null = null): DriverInfo {
  return { model, code };
}

function makePerfilProduct(overrides: Partial<ApiProduct> = {}): ApiProduct {
  return {
    categoria: "PERFIS",
    instalacao: "EMBUTIR",
    familia: "EASY PRIME",
    sku: "LLE-2580.1IF.18F",
    name: "EASY PRIME E IF 1B 582MM",
    ledModule: "18W STRIPFLEX 350MA 25V",
    otica: null,
    holder: null,
    dissipador: null,
    fotoUrl: null,
    temperaturasCor: ["2700", "3000", "4000", "5000"],
    driver220: makeDriver("PHILIPS XITANIUM 19W 350MA"),
    driverBivolt: makeDriver("LIFUD 13W 350MA BIVOLT"),
    driverDim110v: null,
    driverDimDali: null,
    custoLuminaria: null,
    custoDriver220: null,
    custoDriverBivolt: null,
    custoDriverDim110v: null,
    custoDriverDimDali: null,
    ...overrides,
  };
}

// ── Testes ───────────────────────────────────────────────────────────────────

describe("adaptProfileProducts", () => {
  it("retorna null quando não há produtos PERFIS", () => {
    const result = adaptProfileProducts([]);
    expect(result).toBeNull();
  });

  it("retorna null quando todos os produtos são de outras categorias", () => {
    const products = [
      makePerfilProduct({ categoria: "DOWNLIGHTS" }),
      makePerfilProduct({ categoria: "SPOTS" }),
    ];
    const result = adaptProfileProducts(products);
    expect(result).toBeNull();
  });

  it("converte um produto IF corretamente", () => {
    const products = [makePerfilProduct()];
    const result = adaptProfileProducts(products);
    expect(result).not.toBeNull();
    expect(result!["LLE-2580"]).toBeDefined();
    const variant = result!["LLE-2580"];
    expect(variant.name).toBe("EASY PRIME");
    expect(variant.code).toBe("LLE-2580");
    expect(variant.installType).toBe("EMBUTIR");
    expect(variant.allowD1).toBe(true);
    expect(variant.allowD2).toBe(false);
    expect(variant.allowD1D2).toBe(false);
  });

  it("popula o módulo IF com barras e comprimento corretos", () => {
    const products = [makePerfilProduct()];
    const result = adaptProfileProducts(products);
    const variant = result!["LLE-2580"];
    expect(variant.modules.IF["1"]).toEqual({ length: 582, sku: "LLE-2580.1IF.18F" });
    expect(variant.modules.IN).toEqual({});
    expect(variant.modules.ML).toEqual({});
  });

  it("popula módulos ML corretamente", () => {
    const products = [
      makePerfilProduct({
        sku: "LLE-2580.1ML.18F",
        name: "EASY PRIME E ML 1B 570MM",
      }),
    ];
    const result = adaptProfileProducts(products);
    const variant = result!["LLE-2580"];
    expect(variant.modules.ML["1"]).toEqual({ length: 570, sku: "LLE-2580.1ML.18F" });
  });

  it("popula módulos IN com barras decimais", () => {
    const products = [
      makePerfilProduct({
        sku: "LLE-2580.14I.18F",
        name: "EASY PRIME E IN 1.4B 839MM",
      }),
    ];
    const result = adaptProfileProducts(products);
    const variant = result!["LLE-2580"];
    expect(variant.modules.IN["1.4"]).toEqual({ length: 839, sku: "LLE-2580.14I.18F" });
  });

  it("agrupa múltiplos módulos do mesmo perfil", () => {
    const products = [
      makePerfilProduct({ sku: "LLE-2580.1IF.18F", name: "EASY PRIME E IF 1B 582MM" }),
      makePerfilProduct({ sku: "LLE-2580.2IF.18F", name: "EASY PRIME E IF 2B 1142MM" }),
      makePerfilProduct({ sku: "LLE-2580.1ML.18F", name: "EASY PRIME E ML 1B 570MM" }),
      makePerfilProduct({ sku: "LLE-2580.1IN.18F", name: "EASY PRIME E IN 1B 589MM" }),
    ];
    const result = adaptProfileProducts(products);
    const variant = result!["LLE-2580"];
    expect(Object.keys(variant.modules.IF)).toHaveLength(2);
    expect(Object.keys(variant.modules.ML)).toHaveLength(1);
    expect(Object.keys(variant.modules.IN)).toHaveLength(1);
  });

  it("cria variantes separadas para diferentes instalações do mesmo perfil", () => {
    const products = [
      makePerfilProduct({ sku: "LLE-2810.1IF.18F", name: "BLAZE E IF 1B 575MM", instalacao: "EMBUTIR", familia: "BLAZE" }),
      makePerfilProduct({ sku: "LLS-3945.1IF.39F", name: "BLAZE S IF 1B 575MM", instalacao: "SOBREPOR", familia: "BLAZE" }),
    ];
    const result = adaptProfileProducts(products);
    expect(result!["LLE-2810"]).toBeDefined();
    expect(result!["LLS-3945"]).toBeDefined();
    expect(result!["LLE-2810"].installType).toBe("EMBUTIR");
    expect(result!["LLS-3945"].installType).toBe("SOBREPOR");
  });

  it("aplica hasDiffuser=true para SHARP", () => {
    const products = [
      makePerfilProduct({
        sku: "LLP-4451.1IF.58F",
        name: "SHARP P IF 1B 575MM",
        instalacao: "PENDENTE",
        familia: "SHARP",
      }),
    ];
    const result = adaptProfileProducts(products);
    const variant = result!["LLP-4451"];
    expect(variant.hasDiffuser).toBe(true);
    expect(variant.allowD1D2).toBe(true);
  });

  it("aplica allowD1=false para FLOW", () => {
    const products = [
      makePerfilProduct({
        sku: "LLP-4825.1IF.48F",
        name: "FLOW P IF 1B 575MM",
        instalacao: "PENDENTE",
        familia: "FLOW",
      }),
    ];
    const result = adaptProfileProducts(products);
    const variant = result!["LLP-4825"];
    expect(variant.allowD1).toBe(false);
    expect(variant.allowD2).toBe(true);
  });

  it("ignora produtos com código de perfil desconhecido", () => {
    const products = [
      makePerfilProduct({ sku: "LLX-9999.1IF.18F", name: "DESCONHECIDO E IF 1B 500MM" }),
    ];
    const result = adaptProfileProducts(products);
    expect(result).toBeNull();
  });

  it("ignora produtos com tipo de instalação desconhecido", () => {
    const products = [
      makePerfilProduct({ instalacao: "TETO" }),
    ];
    const result = adaptProfileProducts(products);
    expect(result).toBeNull();
  });

  it("ignora produtos com nome que não segue o padrão IF/ML/IN", () => {
    const products = [
      makePerfilProduct({ name: "EASY PRIME E ESPECIAL 500MM" }),
    ];
    const result = adaptProfileProducts(products);
    expect(result).toBeNull();
  });

  it("popula driverDimDali como objeto DriverInfo quando disponível", () => {
    const products = [
      makePerfilProduct({
        sku: "LLE-2810.1IF.18F",
        name: "BLAZE E IF 1B 575MM",
        instalacao: "EMBUTIR",
        familia: "BLAZE",
        driverDimDali: makeDriver("OSRAM ETI 75W DALI (EQ00221 )", "EQ00221"),
      }),
    ];
    const result = adaptProfileProducts(products);
    const variant = result!["LLE-2810"];
    expect(variant.driverDimDali).not.toBeNull();
    expect(variant.driverDimDali?.model).toBe("OSRAM ETI 75W DALI (EQ00221 )");
    expect(variant.driverDimDali?.code).toBe("EQ00221");
  });

  it("mantém driverDimDali como null quando não disponível", () => {
    const products = [makePerfilProduct({ driverDimDali: null })];
    const result = adaptProfileProducts(products);
    const variant = result!["LLE-2580"];
    expect(variant.driverDimDali).toBeNull();
  });

  it("usa o primeiro produto com driverDimDali não nulo ao agrupar módulos", () => {
    const products = [
      makePerfilProduct({ sku: "LLE-2810.1IF.18F", name: "BLAZE E IF 1B 575MM", instalacao: "EMBUTIR", familia: "BLAZE", driverDimDali: null }),
      makePerfilProduct({ sku: "LLE-2810.2IF.18F", name: "BLAZE E IF 2B 1145MM", instalacao: "EMBUTIR", familia: "BLAZE", driverDimDali: makeDriver("OSRAM ETI 75W DALI", "EQ00221") }),
    ];
    const result = adaptProfileProducts(products);
    const variant = result!["LLE-2810"];
    expect(variant.driverDimDali?.model).toBe("OSRAM ETI 75W DALI");
  });

  it("retorna catálogo com todos os 20 perfis quando dados completos são fornecidos", () => {
    const profileCodes = [
      "LLE-2580", "LLP-4536", "LLE-2052", "LLS-3945", "LLA-5945",
      "LLE-2810", "LLP-6060", "LLP-3336", "LLS-3336", "LLP-4251",
      "LLA-3395", "LLP-4450", "LLA-4450", "LLP-4451", "LLA-4451",
      "LLP-4825", "LLP-4452", "LLP-3435", "LLS-3400", "LLA-5010",
    ];
    const installMap: Record<string, string> = {
      "LLE-2580": "EMBUTIR", "LLP-4536": "PENDENTE", "LLE-2052": "EMBUTIR",
      "LLS-3945": "SOBREPOR", "LLA-5945": "ARANDELA", "LLE-2810": "EMBUTIR",
      "LLP-6060": "PENDENTE", "LLP-3336": "PENDENTE", "LLS-3336": "SOBREPOR",
      "LLP-4251": "PENDENTE", "LLA-3395": "ARANDELA", "LLP-4450": "PENDENTE",
      "LLA-4450": "ARANDELA", "LLP-4451": "PENDENTE", "LLA-4451": "ARANDELA",
      "LLP-4825": "PENDENTE", "LLP-4452": "PENDENTE", "LLP-3435": "PENDENTE",
      "LLS-3400": "SOBREPOR", "LLA-5010": "ARANDELA",
    };
    const products = profileCodes.map((code) =>
      makePerfilProduct({
        sku: `${code}.1IF.18F`,
        name: `PERFIL IF 1B 575MM`,
        instalacao: installMap[code],
      })
    );
    const result = adaptProfileProducts(products);
    expect(result).not.toBeNull();
    expect(Object.keys(result!)).toHaveLength(20);
  });
});
