import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeStoredQuoteSnapshot, type CartItemData } from "./cartTypes";

describe("snapshot histórico de orçamento", () => {
  it("preserva o EQ00496 e seu preço no LUMIGRID E já salvo", () => {
    const savedItem: CartItemData = {
      category: "Painéis",
      sku: "NÃO APLICÁVEL",
      description: "LUMIGRID E 36W 4000K ON/OFF 220V",
      qty: 10,
      unitPriceLuminaria: 302.13,
      priceWithoutDriver: 3021.3,
      totalPrice: 3892.5,
      photoUrl: null,
      driverLines: [{
        driverCode: "EQ00496",
        driverModel: "LED DRIVER 40W 1000MA 30-40VDC BIV (PL6262)",
        driverQty: 10,
        driverUnitPrice: 87.12,
        driverTotalPrice: 871.2,
      }],
    };

    const normalized = normalizeStoredQuoteSnapshot(savedItem);

    expect(normalized.driverLines?.[0]).toMatchObject({
      driverCode: "EQ00496",
      driverQty: 10,
      driverUnitPrice: 87.12,
      driverTotalPrice: 871.2,
    });
    expect(normalized.totalPrice).toBe(3892.5);
  });

  it("mantém orçamento, documentos e ficha baseados no snapshot salvo", () => {
    const quoteDetail = readFileSync(new URL("../pages/QuoteDetail.tsx", import.meta.url), "utf8");
    const factoryOrder = readFileSync(new URL("../pages/FactoryOrderDetail.tsx", import.meta.url), "utf8");

    expect(quoteDetail).toContain("normalizeStoredQuoteSnapshot(parsed)");
    expect(quoteDetail).toContain("const totalRecalculado = storedCustomerTotal > 0 ? storedCustomerTotal");
    expect(quoteDetail.match(/totalFinalOverride: totalRecalculado/g)).toHaveLength(3);
    expect(factoryOrder.match(/normalizeStoredQuoteSnapshot\(/g)?.length).toBeGreaterThanOrEqual(3);
    expect(factoryOrder).not.toMatch(/migrateItemDrivers\s*\(/);
  });
});
