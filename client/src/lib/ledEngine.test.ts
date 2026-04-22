import { describe, it, expect } from "vitest";
import { calculateComposition, selectDrivers, buildComposition, isRemoteDriverRequired, IN_MAX_BARS_STANDARD, IN_MAX_BARS_LONG } from "./ledEngine";
import type { ConfigInput } from "./ledEngine";
import { getProfileNames, getInstallTypesForProfile, getVariant, LED_CATALOG } from "./ledCatalog";

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
  it("12 barras → Philips 65W 350mA (1 driver por SKU)", () => {
    const drivers = selectDrivers(12, 36, "220Vac");
    expect(drivers[0].model).toContain("65W");
    expect(drivers[0].current).toBe("350mA");
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

// ─── Constantes de limite de barras ──────────────────────────────────────────

describe("Constantes de limite de barras para IN", () => {
  it("IN_MAX_BARS_STANDARD deve ser 5", () => {
    expect(IN_MAX_BARS_STANDARD).toBe(5);
  });

  it("IN_MAX_BARS_LONG deve ser 6", () => {
    expect(IN_MAX_BARS_LONG).toBe(6);
  });
});

// ─── buildComposition — Lógica IN/IF+ML ──────────────────────────────────────

describe("buildComposition — linha curta → deve usar IN como peça única", () => {
  it("585mm (1 barra) → modo IN_SINGLE, apenas módulos IN", () => {
    const r = buildComposition("LLP-4251", 585, 18, "220Vac", false, "STRIPFLEX");
    expect(r.compositionMode).toBe("IN_SINGLE");
    expect(r.composition.every(i => i.moduleType === "IN")).toBe(true);
    expect(r.realizedLength).toBeLessThanOrEqual(585);
    expect(r.composition.length).toBe(1);
  });

  it("1135mm (2 barras) → modo IN_SINGLE", () => {
    const r = buildComposition("LLP-4251", 1135, 18, "220Vac", false, "STRIPFLEX");
    expect(r.compositionMode).toBe("IN_SINGLE");
    expect(r.composition.every(i => i.moduleType === "IN")).toBe(true);
  });

  it("2825mm (5 barras) → modo IN_SINGLE (no limite padrão)", () => {
    const r = buildComposition("LLP-4251", 2825, 18, "220Vac", false, "STRIPFLEX");
    expect(r.compositionMode).toBe("IN_SINGLE");
    expect(r.composition.every(i => i.moduleType === "IN")).toBe(true);
  });
});

describe("buildComposition — linha longa → deve usar IF+ML, nunca IN", () => {
  it("5000mm → modo IF_ML_LINE, apenas IF e ML", () => {
    const r = buildComposition("LLP-4251", 5000, 18, "220Vac", false, "STRIPFLEX");
    expect(r.compositionMode).toBe("IF_ML_LINE");
    expect(r.composition.every(i => i.moduleType === "IF" || i.moduleType === "ML")).toBe(true);
    expect(r.realizedLength).toBeLessThanOrEqual(5000);
  });

  it("10000mm → modo IF_ML_LINE, sem módulos IN", () => {
    const r = buildComposition("LLP-4251", 10000, 18, "220Vac", false, "STRIPFLEX");
    expect(r.compositionMode).toBe("IF_ML_LINE");
    expect(r.composition.some(i => i.moduleType === "IN")).toBe(false);
    expect(r.realizedLength).toBeLessThanOrEqual(10000);
  });

  it("IF deve aparecer exatamente 2 vezes e ser iguais entre si (mesmo SKU)", () => {
    const r = buildComposition("LLP-4251", 10000, 18, "220Vac", false, "STRIPFLEX");
    const ifItems = r.composition.filter(i => i.moduleType === "IF");
    const totalIfQty = ifItems.reduce((s, i) => s + i.quantity, 0);
    expect(totalIfQty).toBe(2);
    expect(ifItems.length).toBe(1);
  });
});

describe("buildComposition — regras gerais", () => {
  it("comprimento realizado deve ser <= solicitado", () => {
    const { realizedLength } = buildComposition("LLP-4251", 2000, 18, "220Vac", false, "STRIPFLEX");
    expect(realizedLength).toBeLessThanOrEqual(2000);
    expect(realizedLength).toBeGreaterThan(0);
  });

  it("36W deve usar 2 barras por seção (barra dupla)", () => {
    const { composition } = buildComposition("LLP-4251", 1135, 36, "220Vac", false, "STRIPFLEX");
    composition.forEach((item) => {
      expect(item.barsTotal).toBeCloseTo(item.barras * 2, 1);
    });
  });
});

// ─── calculateComposition — Interface unificada ───────────────────────────────

describe("calculateComposition — HIT Pendente (LLP-4251) — D1 — 18W", () => {
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

  it("retorna installType PENDENTE", () => {
    const r = calculateComposition(base);
    expect(r.installType).toBe("PENDENTE");
  });

  it("18W deve usar drivers 350mA", () => {
    const r = calculateComposition(base);
    r.driversD1.forEach((d) => expect(d.driver.current).toBe("350mA"));
  });

  it("driversD2 deve ser vazio para aplicação D1", () => {
    const r = calculateComposition(base);
    expect(r.driversD2).toHaveLength(0);
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

  it("D1+D2 conjunto deve ter combinedDrivers", () => {
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
  });
});

describe("calculateComposition — EASY H PLUS (LLP-4450) — Driver sempre integrado", () => {
  it("EASY H PLUS nunca é driver remoto, mesmo com múltiplos SKUs", () => {
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
    expect(r.isRemoteDriver).toBe(false);
    expect(r.hasAlert).toBe(false);
  });
});

describe("calculateComposition — BLAZE — Restrição D1+D2", () => {
  it("BLAZE Sobrepor (LLS-3945) deve rejeitar D1+D2 com erro", () => {
    expect(() => calculateComposition({
      profileCode: "LLS-3945",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "3000K",
      voltage: "220Vac",
      totalLength: 1000,
      allowLongModules: false,
      independentLighting: false,
    })).toThrow();
  });

  it("BLAZE Arandela (LLA-5945) deve rejeitar D1+D2 com erro", () => {
    expect(() => calculateComposition({
      profileCode: "LLA-5945",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "3000K",
      voltage: "220Vac",
      totalLength: 1000,
      allowLongModules: false,
      independentLighting: false,
    })).toThrow();
  });

  it("BLAZE Sobrepor (LLS-3945) deve aceitar D1 normalmente", () => {
    expect(() => calculateComposition({
      profileCode: "LLS-3945",
      application: "D1",
      powerD1: 18,
      cct: "3000K",
      voltage: "220Vac",
      totalLength: 1000,
      allowLongModules: false,
      independentLighting: false,
    })).not.toThrow();
  });

  it("BLAZE Arandela (LLA-5945) deve aceitar D2 normalmente", () => {
    expect(() => calculateComposition({
      profileCode: "LLA-5945",
      application: "D2",
      powerD2: 18,
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

describe("calculateComposition — FLOW (LLP-4825) — apenas D2", () => {
  it("FLOW deve rejeitar D1 com erro", () => {
    expect(() => calculateComposition({
      profileCode: "LLP-4825",
      application: "D1",
      powerD1: 18,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 1000,
      allowLongModules: false,
      independentLighting: false,
    })).toThrow();
  });

  it("FLOW deve aceitar D2", () => {
    expect(() => calculateComposition({
      profileCode: "LLP-4825",
      application: "D2",
      powerD1: 18,
      cct: "4000K",
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
    expect(r.driversD1[0].driver.model).toContain("LIFUD");
    expect(r.driversD1[0].driver.current).toBe("350mA");
  });
});

// ─── Catálogo — funções helper ────────────────────────────────────────────────

describe("Catálogo — funções helper", () => {
  it("getProfileNames não contém EASY G", () => {
    const names = getProfileNames();
    expect(names).not.toContain("EASY G");
    expect(names.length).toBeGreaterThan(0);
  });

  it("HIT tem instalações PENDENTE e ARANDELA", () => {
    const types = getInstallTypesForProfile("HIT");
    expect(types).toContain("PENDENTE");
    expect(types).toContain("ARANDELA");
  });

  it("EASY PRIME tem apenas EMBUTIR", () => {
    const types = getInstallTypesForProfile("EASY PRIME");
    expect(types).toEqual(["EMBUTIR"]);
  });

  it("BLAZE H tem apenas PENDENTE", () => {
    const types = getInstallTypesForProfile("BLAZE H");
    expect(types).toEqual(["PENDENTE"]);
  });

  it("SHARP Pendente tem hasDiffuser=true", () => {
    const variant = getVariant("SHARP", "PENDENTE");
    expect(variant?.hasDiffuser).toBe(true);
  });

  it("EASY H PLUS Pendente nunca é driver remoto (sempre integrado ao perfil)", () => {
    const remote = isRemoteDriverRequired("LLP-4450", "PENDENTE", "D1");
    expect(remote).toBe(false);
  });

  it("FLOW Pendente permite apenas D2", () => {
    const variant = getVariant("FLOW", "PENDENTE");
    expect(variant?.allowD1).toBe(false);
    expect(variant?.allowD2).toBe(true);
    expect(variant?.allowD1D2).toBe(false);
  });

  it("SOFT Pendente permite apenas D1", () => {
    const variant = getVariant("SOFT", "PENDENTE");
    expect(variant?.allowD1).toBe(true);
    expect(variant?.allowD2).toBe(false);
    expect(variant?.allowD1D2).toBe(false);
  });

  it("LED_CATALOG não contém EASY G", () => {
    const hasEasyG = Object.values(LED_CATALOG).some(v => v.name === "EASY G");
    expect(hasEasyG).toBe(false);
  });

  it("SKYLINE tem instalações PENDENTE e EMBUTIR", () => {
    const types = getInstallTypesForProfile("SKYLINE");
    expect(types).toContain("PENDENTE");
    expect(types).toContain("EMBUTIR");
  });

  it("SKYLINE Pendente não permite D1+D2", () => {
    const variant = getVariant("SKYLINE", "PENDENTE");
    expect(variant?.allowD1D2).toBe(false);
  });

  it("MINI BLAZE Pendente permite apenas D1", () => {
    const variant = getVariant("MINI BLAZE", "PENDENTE");
    expect(variant?.allowD1).toBe(true);
    expect(variant?.allowD2).toBe(false);
    expect(variant?.allowD1D2).toBe(false);
  });
});

// ─── isRemoteDriverRequired — cobertura completa ─────────────────────────────

describe("isRemoteDriverRequired — todos os casos especificados", () => {
  // Embutir → sempre remoto
  it("EASY PRIME Embutir (LLE-2580) → remoto", () => {
    expect(isRemoteDriverRequired("LLE-2580", "EMBUTIR", "D1")).toBe(true);
  });
  it("BLAZE Embutir (LLE-2810) → remoto", () => {
    expect(isRemoteDriverRequired("LLE-2810", "EMBUTIR", "D1")).toBe(true);
  });
  it("SKYLINE Embutir (LLE-2052) → remoto", () => {
    expect(isRemoteDriverRequired("LLE-2052", "EMBUTIR", "D1")).toBe(true);
  });

  // SKYLINE Pendente → sempre remoto
  it("SKYLINE Pendente (LLP-4536) D1 → remoto", () => {
    expect(isRemoteDriverRequired("LLP-4536", "PENDENTE", "D1")).toBe(true);
  });
  it("SKYLINE Pendente (LLP-4536) D2 → remoto", () => {
    expect(isRemoteDriverRequired("LLP-4536", "PENDENTE", "D2")).toBe(true);
  });

  // MINI BLAZE → sempre remoto
  it("MINI BLAZE Pendente (LLP-3336) → remoto", () => {
    expect(isRemoteDriverRequired("LLP-3336", "PENDENTE", "D1")).toBe(true);
  });
  it("MINI BLAZE Sobrepor (LLS-3336) → remoto", () => {
    expect(isRemoteDriverRequired("LLS-3336", "SOBREPOR", "D1")).toBe(true);
  });

  // SHARP → sempre remoto
  it("SHARP Pendente (LLP-4451) → remoto", () => {
    expect(isRemoteDriverRequired("LLP-4451", "PENDENTE", "D1")).toBe(true);
  });
  it("SHARP Arandela (LLA-4451) → remoto", () => {
    expect(isRemoteDriverRequired("LLA-4451", "ARANDELA", "D1")).toBe(true);
  });

  // SOFT → sempre remoto
  it("SOFT Pendente (LLP-4452) → remoto", () => {
    expect(isRemoteDriverRequired("LLP-4452", "PENDENTE", "D1")).toBe(true);
  });

  // BLAZE H D1+D2 → remoto
  it("BLAZE H (LLP-6060) D1+D2 → remoto", () => {
    expect(isRemoteDriverRequired("LLP-6060", "PENDENTE", "D1+D2")).toBe(true);
  });
  it("BLAZE H (LLP-6060) D1 → NÃO remoto", () => {
    expect(isRemoteDriverRequired("LLP-6060", "PENDENTE", "D1")).toBe(false);
  });

  // EASY H PLUS → nunca remoto
  it("EASY H PLUS Pendente (LLP-4450) D1 → NÃO remoto", () => {
    expect(isRemoteDriverRequired("LLP-4450", "PENDENTE", "D1")).toBe(false);
  });
  it("EASY H PLUS Pendente (LLP-4450) D1+D2 → NÃO remoto", () => {
    expect(isRemoteDriverRequired("LLP-4450", "PENDENTE", "D1+D2")).toBe(false);
  });
  it("EASY H PLUS Arandela (LLA-4450) D2 → NÃO remoto", () => {
    expect(isRemoteDriverRequired("LLA-4450", "ARANDELA", "D2")).toBe(false);
  });

  // HIT → não remoto
  it("HIT Pendente (LLP-4251) D1+D2 → NÃO remoto", () => {
    expect(isRemoteDriverRequired("LLP-4251", "PENDENTE", "D1+D2")).toBe(false);
  });
});

// ─── Drivers por SKU — sem otimização entre SKUs ──────────────────────────────

describe("Drivers por SKU — sem compartilhamento entre módulos", () => {
  it("D1+D2 com HIT acendimento conjunto: combinedDrivers por SKU", () => {
    const r = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "3000K",
      voltage: "220Vac",
      totalLength: 3000,
      allowLongModules: false,
      independentLighting: false,
    });
    // combinedDrivers deve ter entradas individuais por SKU (acendimento conjunto)
    expect(r.combinedDrivers).toBeDefined();
    expect(r.combinedDrivers!.length).toBeGreaterThan(0);
    // Cada entrada deve ter sku e driver definidos
    r.combinedDrivers!.forEach((entry) => {
      expect(entry.sku).toBeTruthy();
      expect(entry.driver).toBeDefined();
      expect(entry.driver.model).toBeTruthy();
    });
  });

  it("D1+D2 com HIT acendimento independente: driversD1 e driversD2 por SKU", () => {
    const r = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1+D2",
      powerD1: 18,
      powerD2: 18,
      cct: "3000K",
      voltage: "220Vac",
      totalLength: 3000,
      allowLongModules: false,
      independentLighting: true,
    });
    // driversD1 e driversD2 separados por SKU
    expect(r.driversD1.length).toBeGreaterThan(0);
    expect(r.driversD2.length).toBeGreaterThan(0);
    r.driversD1.forEach((entry) => {
      expect(entry.sku).toBeTruthy();
      expect(entry.driver.model).toBeTruthy();
    });
    r.driversD2.forEach((entry) => {
      expect(entry.sku).toBeTruthy();
      expect(entry.driver.model).toBeTruthy();
    });
  });

  it("D1 com múltiplos módulos: cada módulo tem seu próprio driver", () => {
    const r = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      powerD2: 18,
      cct: "3000K",
      voltage: "220Vac",
      totalLength: 6000,
      allowLongModules: false,
      independentLighting: false,
    });
    // driversD1 deve ter uma entrada por módulo SKU
    expect(r.driversD1.length).toBeGreaterThan(0);
    r.driversD1.forEach((entry) => {
      expect(entry.sku).toBeTruthy();
      expect(entry.driver.model).toBeTruthy();
    });
  });
});
