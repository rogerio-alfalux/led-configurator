import { describe, it, expect } from "vitest";
import { getPricePerMeter, calculateTotalPrice, formatBRL, PRICE_TABLE } from "./priceCatalog";

// ─── PRICE_TABLE ──────────────────────────────────────────────────────────────

describe("PRICE_TABLE", () => {
  it("deve ter entradas para todos os perfis da planilha", () => {
    // Perfis esperados na tabela
    const expectedPrefixes = [
      "LLE-2810", // BLAZE E
      "LLE-2580", // EASY PRIME E
      "LLE-2052", // SKYLINE E
      "LLP-3336", // MINI BLAZE P
      "LLS-3336", // MINI BLAZE S
      "LLP-4450", // EASY H PLUS
      "LLA-4450", // EASY H PLUS Arandela
      "LLP-4251", // HIT P
      "LLA-3395", // HIT Arandela
      "LLS-3945", // BLAZE S
    ];
    for (const prefix of expectedPrefixes) {
      const hasEntry = Object.keys(PRICE_TABLE).some((k) => k.startsWith(prefix));
      expect(hasEntry, `Esperado preço para ${prefix}`).toBe(true);
    }
  });

  it("todos os preços devem ser números positivos", () => {
    for (const [key, price] of Object.entries(PRICE_TABLE)) {
      expect(price, `Preço inválido para ${key}`).toBeGreaterThan(0);
    }
  });
});

// ─── getPricePerMeter ─────────────────────────────────────────────────────────

describe("getPricePerMeter", () => {
  it("retorna preço correto para BLAZE E 18W 220Vac D1", () => {
    expect(getPricePerMeter("LLE-2810", 18, "220Vac", "D1")).toBe(330);
  });

  it("retorna preço correto para BLAZE E 26W 220Vac D1", () => {
    expect(getPricePerMeter("LLE-2810", 26, "220Vac", "D1")).toBe(340);
  });

  it("retorna preço correto para BLAZE E 36W 220Vac D1", () => {
    expect(getPricePerMeter("LLE-2810", 36, "220Vac", "D1")).toBe(360);
  });

  it("retorna preço correto para EASY PRIME E 18W 220Vac", () => {
    expect(getPricePerMeter("LLE-2580", 18, "220Vac", "D1")).toBe(310);
  });

  it("retorna preço correto para SKYLINE E 26W 220Vac", () => {
    expect(getPricePerMeter("LLE-2052", 26, "220Vac", "D1")).toBe(280);
  });

  it("retorna preço correto para EASY H PLUS D1+D2 36W 220Vac", () => {
    expect(getPricePerMeter("LLP-4450", 36, "220Vac", "D1+D2")).toBe(600);
  });

  it("retorna preço correto para HIT P D1+D2 52W 220Vac", () => {
    expect(getPricePerMeter("LLP-4251", 52, "220Vac", "D1+D2")).toBe(550);
  });

  it("retorna preço correto para BLAZE S 36W 220Vac", () => {
    expect(getPricePerMeter("LLS-3945", 36, "220Vac", "D1")).toBe(400);
  });

  it("retorna null para Bivolt (preço não disponível)", () => {
    expect(getPricePerMeter("LLE-2810", 18, "Bivolt", "D1")).toBeNull();
  });

  it("retorna null para perfil sem preço cadastrado", () => {
    expect(getPricePerMeter("LLP-6060", 18, "220Vac", "D1")).toBeNull();
  });

  it("retorna null para potência não cadastrada", () => {
    expect(getPricePerMeter("LLE-2810", 99 as never, "220Vac", "D1")).toBeNull();
  });
});

// ─── calculateTotalPrice ──────────────────────────────────────────────────────

describe("calculateTotalPrice", () => {
  it("calcula corretamente para BLAZE E 18W 220Vac 5000mm", () => {
    // 5000mm = 5m × R$330/m = R$1650
    const result = calculateTotalPrice("LLE-2810", 18, "220Vac", "D1", 5000);
    expect(result).toBe(1650);
  });

  it("calcula corretamente para BLAZE E 36W 220Vac 2000mm", () => {
    // 2000mm = 2m × R$360/m = R$720
    const result = calculateTotalPrice("LLE-2810", 36, "220Vac", "D1", 2000);
    expect(result).toBe(720);
  });

  it("calcula corretamente para EASY H PLUS D1+D2 36W 220Vac 3000mm", () => {
    // 3000mm = 3m × R$600/m = R$1800
    const result = calculateTotalPrice("LLP-4450", 36, "220Vac", "D1+D2", 3000);
    expect(result).toBe(1800);
  });

  it("retorna null para Bivolt", () => {
    expect(calculateTotalPrice("LLE-2810", 18, "Bivolt", "D1", 5000)).toBeNull();
  });

  it("retorna null para perfil sem preço", () => {
    expect(calculateTotalPrice("LLP-6060", 18, "220Vac", "D1", 5000)).toBeNull();
  });
});

// ─── formatBRL ────────────────────────────────────────────────────────────────

describe("formatBRL", () => {
  it("formata valor inteiro corretamente", () => {
    expect(formatBRL(1650)).toBe("R$\u00a01.650,00");
  });

  it("formata valor com centavos corretamente", () => {
    expect(formatBRL(1234.56)).toBe("R$\u00a01.234,56");
  });

  it("formata zero corretamente", () => {
    expect(formatBRL(0)).toBe("R$\u00a00,00");
  });
});
