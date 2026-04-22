import { describe, it, expect } from "vitest";
import { calculateComposition, selectDrivers, buildComposition } from "./ledEngine";
import type { ConfigInput } from "./ledEngine";

// ─── selectDrivers — 220Vac — 350mA (18W) ────────────────────────────────────

describe("selectDrivers — 220Vac — 350mA (18W)", () => {
  it("1 barra → Philips 19W 350mA", () => {
    const drivers = selectDrivers(1, 18, "220Vac");
    expect(drivers[0].model).toContain("19W");
    expect(drivers[0].current).toBe("350mA");
  });

  it("2 barras → Philips 44W 350mA", () => {
    const drivers = selectDrivers(2, 18, "220Vac");
    expect(drivers[0].model).toContain("44W");
    expect(drivers[0].current).toBe("350mA");
  });

  it("5 barras → Philips 44W 350mA (1 driver)", () => {
    const drivers = selectDrivers(5, 18, "220Vac");
    expect(drivers[0].model).toContain("44W");
    expect(drivers[0].quantity).toBe(1);
  });

  it("6 barras → Philips 65W 350mA", () => {
    const drivers = selectDrivers(6, 18, "220Vac");
    expect(drivers[0].model).toContain("65W");
    expect(drivers[0].current).toBe("350mA");
  });
});

describe("selectDrivers — 220Vac — 350mA (36W)", () => {
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

// ─── buildComposition — Seleção automática de módulos ────────────────────────

describe("buildComposition — seleção automática de módulos", () => {
  it("comprimento realizado deve ser <= solicitado", () => {
    const { realizedLength } = buildComposition("LLP-4251", 2000, 18, false);
    expect(realizedLength).toBeLessThanOrEqual(2000);
    expect(realizedLength).toBeGreaterThan(0);
  });

  it("deve retornar pelo menos um módulo", () => {
    const { composition } = buildComposition("LLP-4251", 1135, 18, false);
    expect(composition.length).toBeGreaterThan(0);
  });

  it("sem módulos longos, nenhum módulo deve exceder 2825mm", () => {
    const { composition } = buildComposition("LLP-4251", 5000, 18, false);
    composition.forEach((item) => expect(item.length).toBeLessThanOrEqual(2825));
  });

  it("cada item deve ter SKU, tipo de módulo e label corretos", () => {
    const { composition } = buildComposition("LLP-4251", 1135, 18, false);
    composition.forEach((item) => {
      expect(item.sku).toBeTruthy();
      expect(["IN", "IF", "ML"]).toContain(item.moduleType);
      expect(item.moduleTypeLabel).toBeTruthy();
    });
  });

  it("36W deve usar 2 barras por seção (barra dupla)", () => {
    const { composition } = buildComposition("LLP-4251", 1135, 36, false);
    composition.forEach((item) => {
      // barsTotal = barras * 2 (barsPerSection para 36W)
      expect(item.barsTotal).toBe(item.barras * 2);
    });
  });
});

// ─── calculateComposition — Interface unificada ───────────────────────────────

describe("calculateComposition — HIT (LLP-4251) — D1 — 18W", () => {
  const base: ConfigInput = {
    profileCode: "LLP-4251",
    application: "D1",
    powerD1: 18,
    cct: "4000K",
    voltage: "220Vac",
    totalLength: 2000,
    allowLongModules: false,
    independentLighting: false,
  };

  it("deve retornar composição com módulos", () => {
    const r = calculateComposition(base);
    expect(r.composition.length).toBeGreaterThan(0);
  });

  it("comprimento realizado <= solicitado", () => {
    const r = calculateComposition(base);
    expect(r.realizedLength).toBeLessThanOrEqual(2000);
  });

  it("18W deve usar drivers 350mA", () => {
    const r = calculateComposition(base);
    r.driversD1.forEach((d) => expect(d.current).toBe("350mA"));
  });

  it("deve ter notas de engenharia", () => {
    const r = calculateComposition(base);
    expect(r.engineeringNotes.length).toBeGreaterThan(0);
  });

  it("driversD2 deve ser vazio para aplicação D1", () => {
    const r = calculateComposition(base);
    expect(r.driversD2).toHaveLength(0);
  });
});

describe("calculateComposition — 36W — Barra Dupla", () => {
  it("36W deve usar corrente 350mA nos drivers", () => {
    const r = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 36,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 1135,
      allowLongModules: false,
      independentLighting: false,
    });
    r.driversD1.forEach((d) => expect(d.current).toBe("350mA"));
  });
});

describe("calculateComposition — D1+D2 — Acendimento Independente Forçado", () => {
  it("D1 (18W) ≠ D2 (36W) deve forçar independente", () => {
    const r = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 36,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 1500,
      allowLongModules: false,
      independentLighting: false,
    });
    expect(r.independentLighting).toBe(true);
    expect(r.forcedIndependent).toBe(true);
  });

  it("D1+D2 com potências iguais e independente=false não força", () => {
    const r = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 1500,
      allowLongModules: false,
      independentLighting: false,
    });
    expect(r.forcedIndependent).toBe(false);
  });

  it("D1+D2 independente deve ter driversD1 e driversD2 preenchidos", () => {
    const r = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 36,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 1500,
      allowLongModules: false,
      independentLighting: false,
    });
    expect(r.driversD1.length).toBeGreaterThan(0);
    expect(r.driversD2.length).toBeGreaterThan(0);
    expect(r.combinedDrivers).toBeUndefined();
  });

  it("D1+D2 conjunto deve ter combinedDrivers e driversD1/D2 vazios", () => {
    const r = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 1500,
      allowLongModules: false,
      independentLighting: false,
    });
    expect(r.combinedDrivers).toBeDefined();
    expect(r.combinedDrivers!.length).toBeGreaterThan(0);
    expect(r.driversD1).toHaveLength(0);
    expect(r.driversD2).toHaveLength(0);
  });

  it("D1+D2 deve ter composição unificada (um único bloco de módulos)", () => {
    const r = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 1500,
      allowLongModules: false,
      independentLighting: false,
    });
    // Composição unificada — não há seções separadas
    expect(r.composition.length).toBeGreaterThan(0);
  });
});

describe("calculateComposition — EASY H PLUS (LLP-4450) — Alerta Driver Remoto", () => {
  it("múltiplos drivers deve ativar alerta", () => {
    const r = calculateComposition({
      profileCode: "LLP-4450",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 4000,
      allowLongModules: false,
      independentLighting: true,
    });
    expect(r.hasAlert).toBe(true);
    expect(r.alertMessage).toContain("DRIVER REMOTO");
  });
});

describe("calculateComposition — BLAZE (LLP-4945) — Restrição D1+D2", () => {
  it("BLAZE deve rejeitar D1+D2 com erro", () => {
    expect(() => calculateComposition({
      profileCode: "LLP-4945",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "3000K",
      voltage: "220Vac",
      totalLength: 1000,
      allowLongModules: false,
      independentLighting: false,
    })).toThrow(/não suporta aplicação D1\+D2/);
  });

  it("BLAZE deve aceitar D1 normalmente", () => {
    expect(() => calculateComposition({
      profileCode: "LLP-4945",
      application: "D1",
      powerD1: 18,
      cct: "3000K",
      voltage: "220Vac",
      totalLength: 1000,
      allowLongModules: false,
      independentLighting: false,
    })).not.toThrow();
  });

  it("BLAZE H (LLP-6060) deve aceitar D1+D2", () => {
    expect(() => calculateComposition({
      profileCode: "LLP-6060",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "3000K",
      voltage: "220Vac",
      totalLength: 1000,
      allowLongModules: false,
      independentLighting: false,
    })).not.toThrow();
  });
});

describe("calculateComposition — Bivolt", () => {
  it("18W Bivolt deve usar LIFUD", () => {
    const r = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      cct: "3000K",
      voltage: "Bivolt",
      totalLength: 570,
      allowLongModules: false,
      independentLighting: false,
    });
    expect(r.driversD1[0].model).toContain("LIFUD");
    expect(r.driversD1[0].current).toBe("350mA");
  });
});
