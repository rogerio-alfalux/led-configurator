import { describe, it, expect } from "vitest";
import { calculateComposition, selectDrivers } from "./ledEngine";
import type { ConfigInput } from "./ledEngine";

// ─── Testes de selectDrivers ──────────────────────────────────────────────────

describe("selectDrivers — 220Vac — 350mA (18W)", () => {
  it("1 barra → Philips 19W 350mA", () => {
    const drivers = selectDrivers(1, 18, "220Vac");
    expect(drivers.length).toBeGreaterThan(0);
    expect(drivers[0].model).toContain("19W");
    expect(drivers[0].current).toBe("350mA");
  });

  it("2 barras → Philips 44W 350mA", () => {
    const drivers = selectDrivers(2, 18, "220Vac");
    expect(drivers[0].model).toContain("44W");
    expect(drivers[0].current).toBe("350mA");
  });

  it("5 barras → Philips 44W 350mA", () => {
    const drivers = selectDrivers(5, 18, "220Vac");
    expect(drivers[0].model).toContain("44W");
    expect(drivers[0].quantity).toBe(1);
  });
});

describe("selectDrivers — 220Vac — 350mA (36W)", () => {
  it("6 barras → Philips 65W 350mA", () => {
    const drivers = selectDrivers(6, 36, "220Vac");
    expect(drivers[0].model).toContain("65W");
    expect(drivers[0].model).toContain("350mA");
  });

  it("12 barras → 2x Philips 65W 350mA", () => {
    const drivers = selectDrivers(12, 36, "220Vac");
    expect(drivers[0].model).toContain("65W");
    expect(drivers[0].quantity).toBe(2);
  });
});

describe("selectDrivers — 220Vac — 500mA (26W)", () => {
  it("1 barra → Philips 21W 500mA", () => {
    const drivers = selectDrivers(1, 26, "220Vac");
    expect(drivers[0].model).toContain("21W");
    expect(drivers[0].current).toBe("500mA");
  });

  it("3 barras → Element 75W 500mA", () => {
    const drivers = selectDrivers(3, 26, "220Vac");
    expect(drivers[0].model).toContain("75W");
    expect(drivers[0].current).toBe("500mA");
  });
});

describe("selectDrivers — Bivolt — 350mA (18W)", () => {
  it("1 barra → LIFUD 20W 350mA", () => {
    const drivers = selectDrivers(1, 18, "Bivolt");
    expect(drivers[0].model).toContain("LIFUD 20W");
    expect(drivers[0].current).toBe("350mA");
  });

  it("4 barras → LIFUD 40W 350mA", () => {
    const drivers = selectDrivers(4, 18, "Bivolt");
    expect(drivers[0].model).toContain("LIFUD 40W");
  });

  it("6 barras → LIFUD 60W 350mA", () => {
    const drivers = selectDrivers(6, 18, "Bivolt");
    expect(drivers[0].model).toContain("LIFUD 60W");
    expect(drivers[0].quantity).toBe(1);
  });
});

// ─── Testes de Composição ─────────────────────────────────────────────────────

describe("calculateComposition — HIT (LLP-4251) — 18W", () => {
  const baseInput: ConfigInput = {
    profileCode: "LLP-4251",
    application: "D1",
    powerD1: 18,
    cct: "4000K",
    voltage: "220Vac",
    lengthD1: 2000,
    moduleType: "IN",
    allowLongModules: false,
    independentLighting: false,
  };

  it("comprimento realizado deve ser <= solicitado e > 0", () => {
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

  it("18W deve usar corrente 350mA (não 500mA)", () => {
    const result = calculateComposition(baseInput);
    const drivers = result.sections[0].drivers;
    drivers.forEach((d) => expect(d.current).toBe("350mA"));
  });

  it("deve ter notas de engenharia", () => {
    const result = calculateComposition(baseInput);
    expect(result.engineeringNotes.length).toBeGreaterThan(0);
  });
});

describe("calculateComposition — 36W — Barra Dupla", () => {
  it("deve usar 2 barras por módulo para potência 36W", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 36,
      cct: "4000K",
      voltage: "220Vac",
      lengthD1: 1200,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: false,
    };
    const result = calculateComposition(input);
    const section = result.sections[0];
    if (section.composition.length > 0) {
      const totalModuleBars = section.composition.reduce((sum, item) => sum + item.barras, 0);
      // totalBars deve ser totalModuleBars * 2 (barra dupla)
      expect(section.totalBars).toBeCloseTo(totalModuleBars * 2, 1);
    }
  });

  it("36W deve usar corrente 350mA", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 36,
      cct: "4000K",
      voltage: "220Vac",
      lengthD1: 1135,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: false,
    };
    const result = calculateComposition(input);
    const drivers = result.sections[0].drivers;
    drivers.forEach((d) => expect(d.current).toBe("350mA"));
  });
});

describe("calculateComposition — Acendimento Independente Forçado", () => {
  it("D1 (18W) ≠ D2 (36W) deve forçar independente", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4251",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 36,
      cct: "4000K",
      voltage: "220Vac",
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

  it("D1 (18W) = D2 (18W) não deve forçar independente", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4251",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "4000K",
      voltage: "220Vac",
      lengthD1: 1500,
      lengthD2: 1500,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: false,
    };
    const result = calculateComposition(input);
    expect(result.forcedIndependent).toBe(false);
  });

  it("D1+D2 deve retornar 2 seções", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4251",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "4000K",
      voltage: "220Vac",
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

describe("calculateComposition — EASY H PLUS (LLP-4450) — Alerta Driver Remoto", () => {
  it("múltiplos drivers deve ativar alerta de driver remoto", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4450",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "4000K",
      voltage: "220Vac",
      lengthD1: 2000,
      lengthD2: 2000,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: true,
    };
    const result = calculateComposition(input);
    expect(result.hasAlert).toBe(true);
    expect(result.alertMessage).toContain("DRIVER REMOTO");
  });
});

describe("calculateComposition — Bivolt", () => {
  it("18W Bivolt deve usar LIFUD para 1 barra", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      cct: "3000K",
      voltage: "Bivolt",
      lengthD1: 570,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: false,
    };
    const result = calculateComposition(input);
    const drivers = result.sections[0].drivers;
    expect(drivers[0].model).toContain("LIFUD");
    expect(drivers[0].current).toBe("350mA");
  });
});

describe("calculateComposition — BLAZE (LLP-4945) — Restrição D1+D2", () => {
  it("BLAZE deve rejeitar aplicação D1+D2 com erro", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4945",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "3000K",
      voltage: "220Vac",
      lengthD1: 1000,
      lengthD2: 1000,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: false,
    };
    expect(() => calculateComposition(input)).toThrow(/não suporta aplicação D1\+D2/);
  });

  it("BLAZE deve aceitar aplicação D1 normalmente", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4945",
      application: "D1",
      powerD1: 18,
      cct: "3000K",
      voltage: "220Vac",
      lengthD1: 1000,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: false,
    };
    expect(() => calculateComposition(input)).not.toThrow();
  });

  it("BLAZE H (LLP-6060) deve aceitar D1+D2", () => {
    const input: ConfigInput = {
      profileCode: "LLP-6060",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "3000K",
      voltage: "220Vac",
      lengthD1: 1000,
      lengthD2: 1000,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: false,
    };
    expect(() => calculateComposition(input)).not.toThrow();
  });
});

describe("calculateComposition — Módulos Longos", () => {
  it("sem módulos longos, comprimento máximo por módulo é 2825mm", () => {
    const input: ConfigInput = {
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      cct: "4000K",
      voltage: "220Vac",
      lengthD1: 5000,
      moduleType: "IN",
      allowLongModules: false,
      independentLighting: false,
    };
    const result = calculateComposition(input);
    result.sections[0].composition.forEach((item) => {
      expect(item.length).toBeLessThanOrEqual(2825);
    });
  });
});
