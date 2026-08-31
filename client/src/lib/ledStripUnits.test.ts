import { describe, expect, it } from "vitest";
import {
  addStripflexQuantities,
  convertProductionEquipmentToMaterial,
  formatStripflexQuantity,
  formatProductionEquipmentPrefix,
  formatProductionEquipmentQuantity,
  getProductionEquipmentUnit,
  isLedStripDescription,
  multiplyStripflexQuantity,
  normalizeStripflexQuantity,
  stripflexQuantityToNinths,
  stripflexQuantityToPhysicalBars,
} from "./ledStripUnits";

describe("unidades de FITA LED", () => {
  it("identifica qualquer modelo descrito como FITA LED, mas preserva módulos discretos", () => {
    expect(isLedStripDescription("FITA LED 2835 128LEDS 24V 10W/M")).toBe(true);
    expect(isLedStripDescription("Fita de LED COB 24V")).toBe(true);
    expect(isLedStripDescription("MÓDULO LED", "FITAS LED", "MODULO_LED")).toBe(true);
    expect(isLedStripDescription("STRIPFLEX 562.5 X 10MM - 36 LEDS")).toBe(false);
    expect(isLedStripDescription("STRIPLINE 3000K")).toBe(false);
  });

  it("usa mm no gerenciamento e converte somente uma vez para metros no material", () => {
    const fita = { descricao: "FITA LED 2835 24V", qty: 2000 };
    expect(getProductionEquipmentUnit(fita)).toBe("mm");
    expect(formatProductionEquipmentQuantity(fita)).toBe("2000 mm");
    expect(formatProductionEquipmentPrefix(fita)).toBe("2000 mm");
    expect(convertProductionEquipmentToMaterial(fita, 3)).toEqual({ qty: 6, unidade: "m" });
  });

  it("mantém drivers e módulos discretos em unidades", () => {
    const driver = { descricao: "FONTE DE TENSÃO 60W 24V", qty: 2 };
    expect(getProductionEquipmentUnit(driver)).toBe("un");
    expect(formatProductionEquipmentPrefix(driver)).toBe("2x");
    expect(convertProductionEquipmentToMaterial(driver, 3)).toEqual({ qty: 6, unidade: "un" });
  });

  it("interpreta a casa decimal da STRIPFLEX como trechos de uma divisão em nove partes", () => {
    expect(stripflexQuantityToNinths(4.4)).toBe(40);
    expect(stripflexQuantityToPhysicalBars(4.4)).toBeCloseTo(40 / 9, 8);
    expect(normalizeStripflexQuantity(1.9)).toBe(2);
    expect(formatStripflexQuantity(1.9)).toBe("2");
  });

  it("soma e multiplica STRIPFLEX em nonos antes de voltar à notação técnica", () => {
    expect(addStripflexQuantities(4.4, 4.4)).toBe(8.8);
    expect(addStripflexQuantities(4.7, 4.7)).toBe(9.5);
    expect(multiplyStripflexQuantity(4.4, 60)).toBe(266.6);
  });

  it("converte equipamento STRIPFLEX para barras físicas antes de multiplicar o pedido", () => {
    const stripflex = { descricao: "STRIPFLEX 562.5 X 10MM 3000K", qty: 4.4 };
    expect(formatProductionEquipmentQuantity(stripflex)).toBe("4,4 un");
    expect(convertProductionEquipmentToMaterial(stripflex, 60)).toEqual({ qty: (40 / 9) * 60, unidade: "un" });
  });
});
