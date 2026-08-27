import { describe, expect, it } from "vitest";
import {
  convertProductionEquipmentToMaterial,
  formatProductionEquipmentPrefix,
  formatProductionEquipmentQuantity,
  getProductionEquipmentUnit,
  isLedStripDescription,
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
});
