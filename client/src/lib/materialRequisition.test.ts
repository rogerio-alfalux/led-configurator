import { describe, it, expect } from "vitest";
import { buildMaterialRequisition } from "./materialRequisition";
import type { CartItemData } from "./cartTypes";

describe("materialRequisition", () => {
  // Simular descMap da API
  const descMap = new Map<string, string>([
    ["EQ00121", "MODULO LUX ROUND Ø80MM 36 LEDS 830-3000K 1800LM (LC) 36V"],
    ["EQ00586", "FITA LED 2835 60LEDS/M 24V 5W/M IP20 IRC90 3000K 500LM/M"],
    ["EQ00125", "STRIPFLEX 562.5 X 10MM - 36 LEDS 830 - 3000K (LC) 25V"],
    ["EQ00347", "LED DRIVER XITANIUM 44W 200-350MA 70-125VDC DIP SWITCH 230V"],
  ]);

  it("deve resolver PT001050 para EQ00121 via busca normalizada (D80MM vs Ø80MM)", () => {
    const items: CartItemData[] = [
      {
        sku: "DL-100",
        description: "DOWNLIGHT 18W 3000K 220V 1260mm",
        category: "Downlight",
        qty: 2,
        moduloLed: "MODULO LUX ROUND 36 LEDS 830-3000K 1800LM D80MM (LC) (PT001050) 36V",
        moduloLedCode: null as any,
        driverLines: [{ driverModel: "LED DRIVER XITANIUM 44W (EQ00347)", driverCode: "EQ00347", driverQty: 1 }],
      } as any,
    ];

    const result = buildMaterialRequisition(items, descMap);
    const moduloEntry = result.find(e => e.codigo === "EQ00121");
    expect(moduloEntry).toBeDefined();
    expect(moduloEntry!.descricao).toBe("MODULO LUX ROUND Ø80MM 36 LEDS 830-3000K 1800LM (LC) 36V");
    expect(moduloEntry!.tipo).toBe("MÓDULOS LED");
    expect(moduloEntry!.unidade).toBe("un");
    expect(moduloEntry!.qty).toBe(2); // 2 peças × 1 módulo por peça
  });

  it("deve agrupar EQ00586 como FITAS LED em metros (profileSegments)", () => {
    const items: CartItemData[] = [
      {
        sku: "LLS-3945",
        description: "BLAZE SOBREPOR 18W 3000K ON/OFF 220Vac 1260mm",
        category: "Perfil",
        qty: 2,
        moduloLed: "FITA LED 2835 60LEDS/M 24V 5W/M IP20 IRC90 3000K 500LM/M",
        moduloLedCode: "EQ00586",
        stripMethod: "STRIPFLEX",
        power: "18",
        profileSegments: [
          {
            sku: "LLS-3945.22I.38F",
            lengthMm: 1260,
            qty: 1,
            barsPerPiece: 2,
            driverModel: "LED DRIVER XITANIUM 44W (EQ00347)",
            driverCode: "EQ00347",
            driverQtyPerPiece: 1,
            ledModuleCode: "EQ00586",
          },
        ],
        driverLines: [{ driverModel: "LED DRIVER XITANIUM 44W (EQ00347)", driverCode: "EQ00347", driverQty: 1 }],
      } as any,
    ];

    const result = buildMaterialRequisition(items, descMap);
    const fitaEntry = result.find(e => e.codigo === "EQ00586");
    expect(fitaEntry).toBeDefined();
    expect(fitaEntry!.tipo).toBe("FITAS LED");
    expect(fitaEntry!.unidade).toBe("m");
    // 1 seg × 2 barsPerPiece × 2 itemQty = 4 barras × 1.26m = 5.04m
    // Nota: pode ter pequena variação se há arredondamento interno
    expect(fitaEntry!.qty).toBeGreaterThanOrEqual(5.0);
    expect(fitaEntry!.qty).toBeLessThanOrEqual(5.2);
  });

  it("NÃO deve duplicar EQ00586 em FITAS LED e MÓDULOS LED", () => {
    const items: CartItemData[] = [
      {
        sku: "LLS-3945",
        description: "BLAZE SOBREPOR 18W 3000K ON/OFF 220Vac 1260mm",
        category: "Perfil",
        qty: 19,
        moduloLed: "FITA LED 2835 60LEDS/M 24V 5W/M IP20 IRC90 3000K 500LM/M",
        moduloLedCode: "EQ00586",
        stripMethod: "STRIPFLEX",
        power: "18",
        profileSegments: [
          {
            sku: "LLS-3945.22I.38F",
            lengthMm: 1260,
            qty: 1,
            barsPerPiece: 2,
            driverModel: "LED DRIVER XITANIUM 44W (EQ00347)",
            driverCode: "EQ00347",
            driverQtyPerPiece: 1,
            ledModuleCode: "EQ00586",
          },
        ],
        driverLines: [{ driverModel: "LED DRIVER XITANIUM 44W (EQ00347)", driverCode: "EQ00347", driverQty: 1 }],
      } as any,
    ];

    const result = buildMaterialRequisition(items, descMap);
    const fitaEntries = result.filter(e => e.codigo === "EQ00586");
    // Deve haver apenas UMA entrada para EQ00586 (como FITAS LED em metros)
    expect(fitaEntries.length).toBe(1);
    expect(fitaEntries[0].tipo).toBe("FITAS LED");
    expect(fitaEntries[0].unidade).toBe("m");
  });
});
