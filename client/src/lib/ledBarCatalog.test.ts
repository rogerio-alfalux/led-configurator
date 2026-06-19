/**
 * ledBarCatalog.test.ts
 * Testes unitários para a engine de cálculo LED BAR.
 */

import { describe, it, expect } from "vitest";
import {
  calculateLedBar,
  getAvailableVoltages,
  parsePotenciaFromName,
  parseDifusorFromName,
  dim010vIsBivolt,
  daliIsBivolt,
  LED_BAR_CATALOG,
  LED_BAR_MAX_LENGTH_MM,
} from "./ledBarCatalog";
import type { LedBarProduct } from "./ledBarCatalog";

// Produto de teste
const mockProduct: LedBarProduct = {
  familia: "LED BAR U",
  sku: "LED BAR U DB",
  name: "LED BAR U DB 10W/M",
  potencia: 10,
  difusor: "DB",
  ledModule: "FITA LED HOPELUMI 24V 10W/M",
  ccts: ["2700K", "3000K", "4000K", "5000K"],
  driver220: { model: "FONTE 60W 24V IP20 BIV DIP SLIM", code: "EQ00112" },
  driverBivolt: { model: "FONTE 60W 24V IP20 BIV DIP SLIM", code: "EQ00112" },
  driverDim010v: { model: "FONTE 60W 24V IP20 220V DIM TRIAC 0-10V", code: "EQ00583" },
  driverDimDali: { model: "FONTE 72W 24V IP67 BIV DIM DALI/0-10V/1-10V/PUSH DT6", code: "EQ00666" },
  fotoUrl: null,
};

describe("parsePotenciaFromName", () => {
  it("extrai 5W/m", () => expect(parsePotenciaFromName("LED BAR U DB 5W/M")).toBe(5));
  it("extrai 10W/m", () => expect(parsePotenciaFromName("LED BAR U DB 10W/M")).toBe(10));
  it("extrai 25W/m", () => expect(parsePotenciaFromName("LED BAR U DB 25W/M")).toBe(25));
  it("retorna null para nome sem potência", () => expect(parsePotenciaFromName("LED BAR U DB")).toBeNull());
  it("retorna null para potência desconhecida", () => expect(parsePotenciaFromName("LED BAR U DB 15W/M")).toBeNull());
});

describe("parseDifusorFromName", () => {
  it("extrai DA", () => expect(parseDifusorFromName("LED BAR U DA 10W/M")).toBe("DA"));
  it("extrai DB", () => expect(parseDifusorFromName("LED BAR U DB 10W/M")).toBe("DB"));
  it("extrai DC", () => expect(parseDifusorFromName("LED BAR U DC 10W/M")).toBe("DC"));
  it("retorna null para nome sem difusor", () => expect(parseDifusorFromName("LED BAR U 10W/M")).toBeNull());
});

describe("dim010vIsBivolt", () => {
  it("retorna false para driver monovolt", () => {
    expect(dim010vIsBivolt(mockProduct)).toBe(false);
  });
  it("retorna true para driver com 'biv' no modelo", () => {
    const p: LedBarProduct = { ...mockProduct, driverDim010v: { model: "FONTE 60W 24V BIV DIM 0-10V", code: "EQ99999" } };
    expect(dim010vIsBivolt(p)).toBe(true);
  });
  it("retorna false quando driverDim010v é null", () => {
    const p: LedBarProduct = { ...mockProduct, driverDim010v: null };
    expect(dim010vIsBivolt(p)).toBe(false);
  });
});

describe("daliIsBivolt", () => {
  it("retorna true para driver DALI com 'BIV' no modelo", () => {
    expect(daliIsBivolt(mockProduct)).toBe(true);
  });
  it("retorna false para driver DALI sem 'biv'", () => {
    const p: LedBarProduct = { ...mockProduct, driverDimDali: { model: "FONTE 72W 24V 220V DIM DALI", code: "EQ99998" } };
    expect(daliIsBivolt(p)).toBe(false);
  });
});

describe("getAvailableVoltages", () => {
  it("ON/OFF: retorna 220V e Bivolt quando driverBivolt existe", () => {
    const voltages = getAvailableVoltages(mockProduct, "ON/OFF");
    expect(voltages).toContain("220V");
    expect(voltages).toContain("Bivolt");
    expect(voltages).not.toContain("110V");
  });
  it("ON/OFF: retorna apenas 220V quando driverBivolt é null", () => {
    const p: LedBarProduct = { ...mockProduct, driverBivolt: null };
    const voltages = getAvailableVoltages(p, "ON/OFF");
    expect(voltages).toEqual(["220V"]);
  });
  it("DIM 0-10V: retorna apenas 220V (monovolt 220V)", () => {
    const voltages = getAvailableVoltages(mockProduct, "DIM 0-10V");
    expect(voltages).toEqual(["220V"]);
    expect(voltages).not.toContain("110V");
    expect(voltages).not.toContain("Bivolt");
  });
  it("DIM DALI: retorna 220V e Bivolt quando DALI é bivolt", () => {
    const voltages = getAvailableVoltages(mockProduct, "DIM DALI");
    expect(voltages).toContain("220V");
    expect(voltages).toContain("Bivolt");
  });
});

describe("calculateLedBar", () => {
  it("comprimento ≤ 3000mm → 1 trecho", () => {
    const res = calculateLedBar({ product: mockProduct, comprimentoMm: 2500, nCortes: 1, controle: "ON/OFF", voltage: "220V", cct: "3000K" });
    expect(res.errors).toHaveLength(0);
    expect(res.nCortes).toBe(1);
    expect(res.trechos).toHaveLength(1);
    expect(res.trechos[0].comprimentoMm).toBe(2500);
  });

  it("comprimento > 3000mm com 2 cortes → 2 trechos iguais", () => {
    const res = calculateLedBar({ product: mockProduct, comprimentoMm: 5000, nCortes: 2, controle: "ON/OFF", voltage: "220V", cct: "3000K" });
    expect(res.errors).toHaveLength(0);
    expect(res.nCortes).toBe(2);
    expect(res.trechos).toHaveLength(2);
    expect(res.trechos[0].comprimentoMm).toBe(2500);
    expect(res.trechos[1].comprimentoMm).toBe(2500);
  });

  it("comprimento > 3000mm sem cortes → erro de validação", () => {
    const res = calculateLedBar({ product: mockProduct, comprimentoMm: 4000, nCortes: 1, controle: "ON/OFF", voltage: "220V", cct: "3000K" });
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toMatch(/3000mm/);
  });

  it("DIM 0-10V usa driverDim010v", () => {
    const res = calculateLedBar({ product: mockProduct, comprimentoMm: 2000, nCortes: 1, controle: "DIM 0-10V", voltage: "220V", cct: "3000K" });
    expect(res.errors).toHaveLength(0);
    expect(res.trechos[0].driver.code).toBe("EQ00583");
  });

  it("DIM DALI usa driverDimDali", () => {
    const res = calculateLedBar({ product: mockProduct, comprimentoMm: 2000, nCortes: 1, controle: "DIM DALI", voltage: "Bivolt", cct: "3000K" });
    expect(res.errors).toHaveLength(0);
    expect(res.trechos[0].driver.code).toBe("EQ00666");
  });

  it("ON/OFF Bivolt usa driverBivolt", () => {
    const res = calculateLedBar({ product: mockProduct, comprimentoMm: 1000, nCortes: 1, controle: "ON/OFF", voltage: "Bivolt", cct: "4000K" });
    expect(res.errors).toHaveLength(0);
    expect(res.trechos[0].driver.code).toBe("EQ00112");
  });

  it("substitui [CCT] no ledModule", () => {
    const p: LedBarProduct = { ...mockProduct, ledModule: "FITA LED 24V [CCT]" };
    const res = calculateLedBar({ product: p, comprimentoMm: 1000, nCortes: 1, controle: "ON/OFF", voltage: "220V", cct: "4000K" });
    expect(res.ledModuleWithCCT).toBe("FITA LED 24V 4000K");
  });

  it("ledModule sem [CCT] não é alterado", () => {
    const res = calculateLedBar({ product: mockProduct, comprimentoMm: 1000, nCortes: 1, controle: "ON/OFF", voltage: "220V", cct: "3000K" });
    expect(res.ledModuleWithCCT).toBe("FITA LED HOPELUMI 24V 10W/M");
  });

  it("cada trecho tem sua própria fonte", () => {
    const res = calculateLedBar({ product: mockProduct, comprimentoMm: 6000, nCortes: 3, controle: "ON/OFF", voltage: "220V", cct: "3000K" });
    expect(res.trechos).toHaveLength(3);
    res.trechos.forEach((t) => {
      expect(t.driver.code).toBe("EQ00112");
      expect(t.comprimentoMm).toBe(2000);
    });
  });

  it("comprimento 0 → erro de validação", () => {
    const res = calculateLedBar({ product: mockProduct, comprimentoMm: 0, nCortes: 1, controle: "ON/OFF", voltage: "220V", cct: "3000K" });
    expect(res.errors.length).toBeGreaterThan(0);
  });
});

describe("LED_BAR_CATALOG (catálogo estático)", () => {
  it("tem 3 produtos", () => expect(LED_BAR_CATALOG).toHaveLength(3));
  it("todos têm potência válida", () => {
    LED_BAR_CATALOG.forEach((p) => expect([5, 10, 25]).toContain(p.potencia));
  });
  it("todos têm difusor válido", () => {
    LED_BAR_CATALOG.forEach((p) => expect(["DA", "DB", "DC"]).toContain(p.difusor));
  });
  it("nenhum tem [CCT] no ledModule", () => {
    LED_BAR_CATALOG.forEach((p) => expect(p.ledModule).not.toMatch(/\[CCT\]/i));
  });
  it("todos têm driver220", () => {
    LED_BAR_CATALOG.forEach((p) => expect(p.driver220).not.toBeNull());
  });
  it("LED_BAR_MAX_LENGTH_MM é 3000", () => expect(LED_BAR_MAX_LENGTH_MM).toBe(3000));
});
