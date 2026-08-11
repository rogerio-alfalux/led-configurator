import { describe, it, expect } from "vitest";
import { migrateItemDrivers, parseCartItemData } from "./cartTypes";

describe("parseCartItemData - correção de driverQty para perfis", () => {
  it("corrige driverQty quando está salvo apenas por luminária (BLAZE 45700mm, 12 lum, 17 drv/lum)", () => {
    const item = {
      sku: "LLS-3945",
      description: "BLAZE Sobrepor 18W 3000K ON/OFF 220Vac 45700mm",
      qty: 12,
      totalPrice: 183371.28,
      driverLines: [
        {
          driverCode: "EQ00396",
          driverModel: "PHILIPS XITANIUM 44W",
          driverQty: 17, // ERRADO: só por luminária, sem multiplicar por 12
          driverUnitPrice: 54,
          driverTotalPrice: 918, // ERRADO: 54 × 17 = 918
        },
      ],
      profileSegments: [
        { qty: 2, driverCode: "EQ00396", driverQtyPerPiece: 1, driverModel: "PHILIPS XITANIUM 44W" },
        { qty: 15, driverCode: "EQ00396", driverQtyPerPiece: 1, driverModel: "PHILIPS XITANIUM 44W" },
      ],
    };

    const result = parseCartItemData(JSON.stringify(item));
    expect(result).not.toBeNull();
    const dl = result!.driverLines![0];
    // 17 drivers/lum × 12 lum = 204 drivers
    expect(dl.driverQty).toBe(204);
    // 54 × 204 = 11016
    expect(dl.driverTotalPrice).toBe(11016);
    expect(dl.driverUnitPrice).toBe(54); // unitPrice não muda
  });

  it("corrige driverQty para BLAZE 3965mm (26 lum, 3 drv/lum)", () => {
    const item = {
      sku: "LLS-3945",
      qty: 26,
      totalPrice: 65395.20,
      driverLines: [
        { driverCode: "EQ00396", driverQty: 3, driverUnitPrice: 108, driverTotalPrice: 324 },
      ],
      profileSegments: [
        { qty: 2, driverCode: "EQ00396", driverQtyPerPiece: 1 },
        { qty: 1, driverCode: "EQ00396", driverQtyPerPiece: 1 },
      ],
    };

    const result = parseCartItemData(JSON.stringify(item));
    expect(result!.driverLines![0].driverQty).toBe(78); // 3 × 26 = 78
    expect(result!.driverLines![0].driverTotalPrice).toBe(8424); // 108 × 78 = 8424
  });

  it("NÃO altera driverQty quando já está correto (BLAZE 31600mm, 4 lum, 12 drv/lum = 48 total)", () => {
    const item = {
      sku: "LLS-3945",
      qty: 4,
      totalPrice: 84416.32,
      driverLines: [
        { driverCode: "EQ00396", driverQty: 48, driverUnitPrice: 54, driverTotalPrice: 2592 },
      ],
      profileSegments: [
        { qty: 2, driverCode: "EQ00396", driverQtyPerPiece: 1 },
        { qty: 10, driverCode: "EQ00396", driverQtyPerPiece: 1 },
      ],
    };

    const result = parseCartItemData(JSON.stringify(item));
    // 12 drv/lum × 4 lum = 48 — já correto, não deve alterar
    expect(result!.driverLines![0].driverQty).toBe(48);
    expect(result!.driverLines![0].driverTotalPrice).toBe(2592);
  });

  it("NÃO altera driverLines de itens sem profileSegments (downlights, spots, etc.)", () => {
    const item = {
      sku: "DL-001",
      qty: 5,
      totalPrice: 1000,
      driverLines: [
        { driverCode: "EQ00100", driverQty: 5, driverUnitPrice: 50, driverTotalPrice: 250 },
      ],
      // sem profileSegments
    };

    const result = parseCartItemData(JSON.stringify(item));
    expect(result!.driverLines![0].driverQty).toBe(5);
    expect(result!.driverLines![0].driverTotalPrice).toBe(250);
  });

  it("retorna null para JSON inválido", () => {
    expect(parseCartItemData("invalid json")).toBeNull();
  });
});

describe("migrateItemDrivers - itens não-perfil consultam a API", () => {
  it("corrige CCT/quantidade de módulo e total de drivers com os campos da API", () => {
    const item = {
      category: "Spots",
      sku: "SP-API",
      description: "SPOT TESTE 4000K 220Vac",
      cct: "4000K",
      qty: 145,
      moduloLed: "MÓDULO ANTIGO 3000K (EQOLD)",
      moduloLedCode: "EQOLD",
      driverLines: [{ driverCode: "EQOLD-DRV", driverModel: "DRIVER ANTIGO", driverQty: 83, driverUnitPrice: 10, driverTotalPrice: 830 }],
    } as any;
    const productMap = new Map([[
      "SP-API",
      {
        sku: "SP-API",
        driver220: { code: "EQDRIVER", model: "DRIVER API 20W" },
        driverBivolt: null,
        driverQtd220: 1,
        driverQtdBivolt: null,
        ledModuleEq4000: "EQMOD4000",
        ledModuleQtd4000: 2,
      },
    ]]);
    const descMap = new Map([
      ["EQDRIVER", "DRIVER API 20W 400MA"],
      ["EQMOD4000", "MÓDULO LED API 4000K"],
    ]);

    const result = migrateItemDrivers(item, new Map([["EQDRIVER", 10]]), descMap, productMap);

    expect(result.driverQtyPerUnit).toBe(1);
    expect(result.driverLines).toEqual(expect.arrayContaining([
      expect.objectContaining({ driverCode: "EQDRIVER", driverQty: 145, driverModel: "DRIVER API 20W 400MA" }),
    ]));
    expect(result.moduloLedCode).toBe("EQMOD4000");
    expect(result.moduloLed).toContain("2x MÓDULO LED API 4000K (EQMOD4000)");
  });
});
