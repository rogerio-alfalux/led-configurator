import { describe, it, expect } from "vitest";
import { calculateComposition, selectDrivers } from "./ledEngine";
import type { ConfigInput } from "./ledEngine";

// ─── Testes do Engine de Cálculo ──────────────────────────────────────────────

describe("selectDrivers", () => {
  // selectDrivers(totalBars: number, power: Power)
  it("deve selecionar Philips 44W 350mA para 2 barras (36W = 350mA)", () => {
    const drivers = selectDrivers(2, 36);
    expect(drivers.length).toBeGreaterThan(0);
    expect(drivers[0].model).toContain("Philips");
    expect(drivers[0].model).toContain("350mA");
  });

  it("deve selecionar Philips 65W 350mA para 6 barras (36W = 350mA)", () => {
    const drivers = selectDrivers(6, 36);
    expect(drivers.length).toBeGreaterThan(0);
    expect(drivers[0].model).toContain("65W");
    expect(drivers[0].model).toContain("350mA");
  });

  it("deve selecionar driver 500mA para 2 barras de 18W", () => {
    const drivers = selectDrivers(2, 18);
    expect(drivers.length).toBeGreaterThan(0);
    expect(drivers[0].model).toContain("500mA");
  });

  it("deve selecionar driver 500mA para 3 barras de 26W", () => {
    const drivers = selectDrivers(3, 26);
    expect(drivers.length).toBeGreaterThan(0);
    expect(drivers[0].model).toContain("500mA");
  });

  it("deve selecionar Philips 21W 500mA para 1 barra de 18W", () => {
    const drivers = selectDrivers(1, 18);
    expect(drivers.length).toBeGreaterThan(0);
    expect(drivers[0].model).toContain("21W");
    expect(drivers[0].model).toContain("500mA");
  });
});

describe("calculateComposition - perfil HIT (LLP-4251)", () => {
  const baseInput: ConfigInput = {
    profileCode: "LLP-4251",
    application: "D1",
    powerD1: 18,
    cct: "4000K",
    voltage: "220V",
    lengthD1: 2000,
    moduleType: "IN",
    allowLongModules: false,
    independentLighting: false,
  };

  it("deve retornar resultado com comprimento realizado <= solicitado", () => {
    const result = calculateComposition(baseInput);
    expect(result.sections[0].realizedLength).toBeLessThanOrEqual(2000);
    expect(result.sections[0].realizedLength).toBeGreaterThan(0);
  });

  it("deve retornar pelo menos um módulo na composição", () => {
    const result = calculateComposition(baseInput);
    expect(result.sections[0].composition.length).toBeGreaterThan(0);
  });

  it("deve retornar drivers para a seção", () => {
    const result = calculateComposition(baseInput);
    expect(result.sections[0].drivers.length).toBeGreaterThan(0);
  });

  it("deve ter notas de engenharia", () => {
    const result = calculateComposition(baseInput);
    expect(result.engineeringNotes.length).toBeGreaterThan(0);
  });
});

describe("calculateComposition - 36W barra dupla", () => {
  it("deve usar 2 barras por seção para potência 36W", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 36,
      cct: "4000K",
      voltage: "220V",
      lengthD1: 1200,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: false,
    };
    const result = calculateComposition(input);
    const section = result.sections[0];
    // Para 36W, o total de barras deve ser par (barra dupla = 2 barras por módulo)
    // Cada módulo contribui com barsTotal = barras * 2
    // Verificamos que o totalBars é o dobro do número de módulos
    if (section.composition.length > 0) {
      const totalModuleBars = section.composition.reduce((sum, item) => sum + item.barras, 0);
      // totalBars deve ser totalModuleBars * 2 (barra dupla)
      expect(section.totalBars).toBeCloseTo(totalModuleBars * 2, 1);
    }
  });
});

describe("calculateComposition - acendimento independente forçado", () => {
  it("deve forçar acendimento independente quando D1 e D2 têm potências diferentes", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4251",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 36,
      cct: "4000K",
      voltage: "220V",
      lengthD1: 1500,
      lengthD2: 1500,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: false,
    };
    const result = calculateComposition(input);
    expect(result.independentLighting).toBe(true);
    expect(result.forcedIndependent).toBe(true);
  });

  it("deve ter 2 seções para aplicação D1+D2", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4251",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "4000K",
      voltage: "220V",
      lengthD1: 1500,
      lengthD2: 1500,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: false,
    };
    const result = calculateComposition(input);
    expect(result.sections.length).toBe(2);
  });
});

describe("calculateComposition - alerta EASY H PLUS", () => {
  it("deve gerar alerta de driver remoto para EASY H PLUS com múltiplos drivers", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4450",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "4000K",
      voltage: "220V",
      lengthD1: 2000,
      lengthD2: 2000,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: true,
    };
    const result = calculateComposition(input);
    expect(result.hasAlert).toBe(true);
  });
});

describe("calculateComposition - módulos longos", () => {
  it("deve respeitar a restrição de módulos longos quando desabilitado", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      cct: "4000K",
      voltage: "220V",
      lengthD1: 5000,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: false,
    };
    const result = calculateComposition(input);
    // Todos os módulos devem ter comprimento <= 2825mm quando módulos longos desabilitados
    result.sections[0].composition.forEach((item) => {
      expect(item.length).toBeLessThanOrEqual(2825);
    });
  });
});
