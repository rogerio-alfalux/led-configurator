import { describe, it, expect } from "vitest";
import { calculateComposition, selectDrivers, buildComposition, isRemoteDriverRequired, IN_MAX_BARS_STANDARD, IN_MAX_BARS_LONG } from "./ledEngine";
import type { ConfigInput } from "./ledEngine";
import { getProfileNames, getInstallTypesForProfile, getVariant, LED_CATALOG } from "./ledCatalog";

// ─── selectDrivers — 220Vac — 350mA (18W) ────────────────────────────────────

describe("selectDrivers — 220Vac — 350mA (18W)", () => {
  // Faixas: 1-2 barras → Philips 19W | 3-5 barras → Philips 44W | 6-7 barras → Philips 65W | 8+ → Philips 100W
  // OSRAM IT FIT 75W NUNCA deve aparecer para 18W
  it("1 barra → Philips 19W 350mA", () => {
    const drivers = selectDrivers(1, 18, "220Vac");
    expect(drivers[0].model).toContain("19W");
    expect(drivers[0].current).toBe("350mA");
  });

  it("2 barras → Philips 19W 350mA (faixa 1-2)", () => {
    const drivers = selectDrivers(2, 18, "220Vac");
    expect(drivers[0].model).toContain("19W");
    expect(drivers[0].current).toBe("350mA");
  });

  it("3 barras → Philips 44W 350mA (faixa 3-5)", () => {
    const drivers = selectDrivers(3, 18, "220Vac");
    expect(drivers[0].model).toContain("44W");
    expect(drivers[0].current).toBe("350mA");
  });

  it("5 barras → Philips 44W 350mA (1 driver)", () => {
    const drivers = selectDrivers(5, 18, "220Vac");
    expect(drivers[0].model).toContain("44W");
    expect(drivers[0].quantity).toBe(1);
  });

  it("6 barras → Philips 65W 350mA (faixa 6-7)", () => {
    const drivers = selectDrivers(6, 18, "220Vac");
    expect(drivers[0].model).toContain("65W");
    expect(drivers[0].current).toBe("350mA");
  });

  it("8 barras → Philips 65W 350mA (sem módulos longos, nunca OSRAM nem 100W)", () => {
    // selectDrivers não passa allowLongModules, então o fallback usa false por padrão
    // Resultado esperado: Philips 65W (melhor opção sem módulos longos)
    const drivers = selectDrivers(8, 18, "220Vac");
    expect(drivers[0].model).toContain("65W");
    expect(drivers[0].current).toBe("350mA");
    expect(drivers[0].model).not.toContain("OSRAM");
    expect(drivers[0].model).not.toContain("100W");
  });

  it("OSRAM não deve aparecer para 18W em nenhuma quantidade de barras", () => {
    for (const bars of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const drivers = selectDrivers(bars, 18, "220Vac");
      expect(drivers[0].model).not.toContain("OSRAM");
    }
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
  it("1 barra → CERTADRIVE 20W 500mA (1 barra = 25V, dentro da faixa do CERTADRIVE ≤42V)", () => {
    // Lógica v00: 1 barra 26W = 25V ≤ 42V → CERTADRIVE 20W
    const drivers = selectDrivers(1, 26, "220Vac");
    expect(drivers[0].model).toContain("CERTADRIVE");
    expect(drivers[0].current).toBe("500mA");
  });

  it("3 barras → CERTADRIVE 20W 500mA x3 (lógica v01: 1-3 barras = CERTADRIVE, qty=barras)", () => {
    const drivers = selectDrivers(3, 26, "220Vac");
    expect(drivers[0].model).toContain("CERTADRIVE");
    expect(drivers[0].current).toBe("500mA");
    expect(drivers[0].quantity).toBe(3); // 3 barras = 3x CERTADRIVE
  });

  it("4 barras → CERTADRIVE qty=3 (nova lógica: 3.3-4.0 = ×3 Certadrive)", () => {
    const drivers = selectDrivers(4, 26, "220Vac");
    expect(drivers[0].model).toContain("CERTADRIVE");
    expect(drivers[0].current).toBe("500mA");
    expect(drivers[0].quantity).toBe(3);
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

// ─── Testes de integração com drivers da planilha (código EQ) ────────────────
import { selectDriverFromSheet, selectDriverFallback } from "./driverSelector";
import type { SheetDriver } from "./driverSelector";

describe("selectDriverFromSheet — código EQ e descrição completa", () => {
  const mockDrivers: SheetDriver[] = [
    {
      code: "EQ00347",
      model: "PHILIPS XITANIUM 44W 0.35A I 220-240V S10",
      currents: [350],
      outputRanges: [{ current: 350, vMin: 54, vMax: 165 }],
      inputVoltage: "220V",
      priority: 1,
      available: true,
    },
    {
      code: "EQ00346",
      model: "PHILIPS XITANIUM 19W 0.35A I 220-240V S10",
      currents: [350],
      outputRanges: [{ current: 350, vMin: 20, vMax: 54 }],
      inputVoltage: "220V",
      priority: 1,
      available: true,
    },
    {
      code: "EQ00580",
      model: "LIFUD LF-FMR020YS0350U(S) 20W 350mA BIVOLT",
      currents: [350],
      outputRanges: [{ current: 350, vMin: 10, vMax: 57 }],
      inputVoltage: "BIVOLT",
      priority: 1,
      available: true,
    },
  ];

  it("retorna código EQ correto para 18W/350mA/220Vac com 3.4 barras", () => {
    const result = selectDriverFromSheet(mockDrivers, 3.4, 18, "220Vac", "STRIPFLEX");
    expect(result).not.toBeNull();
    expect(result!.code).toBe("EQ00347");
    expect(result!.model).toBe("PHILIPS XITANIUM 44W 0.35A I 220-240V S10");
    expect(result!.current).toBe("350mA");
  });

  it("retorna código EQ correto para 18W/350mA/220Vac com 1.4 barras (driver menor)", () => {
    const result = selectDriverFromSheet(mockDrivers, 1.4, 18, "220Vac", "STRIPFLEX");
    expect(result).not.toBeNull();
    expect(result!.code).toBe("EQ00346");
    expect(result!.model).toBe("PHILIPS XITANIUM 19W 0.35A I 220-240V S10");
  });

  it("retorna código EQ correto para Bivolt com 1.4 barras", () => {
    const result = selectDriverFromSheet(mockDrivers, 1.4, 18, "Bivolt", "STRIPFLEX");
    expect(result).not.toBeNull();
    expect(result!.code).toBe("EQ00580");
    expect(result!.model).toContain("LIFUD");
  });

  it("retorna null quando nenhum driver atende os critérios", () => {
    const result = selectDriverFromSheet(mockDrivers, 100, 18, "220Vac", "STRIPFLEX");
    expect(result).toBeNull();
  });

  it("calculateComposition com sheetDrivers usa código EQ da planilha", () => {
    const r = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      powerD2: 18,
      cct: "3000K",
      voltage: "220Vac",
      totalLength: 2000,
      allowLongModules: false,
      independentLighting: false,
      sheetDrivers: mockDrivers,
    });
    expect(r.driversD1.length).toBeGreaterThan(0);
    const firstEntry = r.driversD1[0];
    // Quando sheetDrivers fornecido, o driver deve ter código EQ
    expect(firstEntry.driver.code).toBeTruthy();
    expect(firstEntry.driver.model).toContain("PHILIPS XITANIUM");
  });
});

// ─── Testes v1.8 — Restrições da coluna OBSERVAÇÕES ────────────────────────────────────────────────
import { parseObservations } from "@shared/driverRestrictions";

describe("parseObservations — extração de restrições da coluna OBSERVAÇÕES", () => {
  it("parseia 'PRIORIDADE 18W DE 1 ATÉ 2 BARRAS'", () => {
    const r = parseObservations("PRIORIDADE 18W DE 1 ATÉ 2 BARRAS");
    expect(r.onlyPowerW).toBe(18);
    expect(r.preferredMinBars).toBe(1);
    expect(r.preferredMaxBars).toBe(2);
  });

  it("parseia 'PRIORIDADE 18W DE 3 ATÉ 5 BARRAS'", () => {
    const r = parseObservations("PRIORIDADE 18W DE 3 ATÉ 5 BARRAS");
    expect(r.onlyPowerW).toBe(18);
    expect(r.preferredMinBars).toBe(3);
    expect(r.preferredMaxBars).toBe(5);
  });

  it("parseia 'SÓ USAR EM CASOS DE 26W, QUE NECESSITA USO DE 500MA'", () => {
    const r = parseObservations("SÓ USAR EM CASOS DE 26W, QUE NECESSITA USO DE 500MA");
    expect(r.onlyPowerW).toBe(26);
  });

  it("parseia restrições do CERTADRIVE: 26W, 1 barra, não BLAZE H, embutir/remoto", () => {
    const obs = "SÓ USAR EM CASOS DE 26W, QUE NECESSITA USO DE 500MA - LIGA APENAS 1 BARRA 26W - USAR EM PERFIS DE EMBUTIR OU CASOS DE PONTO REMOTO, NÃO USAR NO BLAZE H";
    const r = parseObservations(obs);
    expect(r.onlyPowerW).toBe(26);
    expect(r.maxBars).toBe(1);
    expect(r.notBlazeH).toBe(true);
    expect(r.onlyEmbutirOrRemote).toBe(true);
  });

  it("parseia 'SÓ USAR EM CASO DE BIVOLT, COM 18W BFILEIRA SIMPLES OU 36W BARRA DUPLA'", () => {
    const r = parseObservations("SÓ USAR EM CASO DE BIVOLT, COM 18W BFILEIRA SIMPLES OU 36W BARRA DUPLA");
    expect(r.onlyVoltage).toBe("BIVOLT");
    expect(r.onlyStripMethod).toBe("STRIPFLEX");
  });

  it("retorna objeto vazio para observação vazia", () => {
    const r = parseObservations("");
    expect(Object.keys(r).length).toBe(0);
  });
});

describe("selectDriverFromSheet — restrições v1.8", () => {
  // Nota: 1 barra 18W STRIPFLEX = 25V, 2 barras = 50V, 3 barras = 75V, 4 barras = 100V, 5 barras = 125V, 6 barras = 150V
  // Os drivers Philips têm faixas: 19W (30-54V), 44W (70-125V), 65W (120-185V)
  // Para testar a seleção por faixa de barras, usamos faixas de Vout que cobrem as tensões reais
  const mockDrivers18W: SheetDriver[] = [
    {
      code: "EQ00346",
      model: "PHILIPS XITANIUM 19W",
      currents: [350],
      outputRanges: [{ current: 350, vMin: 20, vMax: 54 }], // cobre 1-2 barras (25V-50V)
      inputVoltage: "220V",
      priority: 1,
      available: true,
      restrictions: { onlyPowerW: 18, preferredMinBars: 1, preferredMaxBars: 2 },
    },
    {
      code: "EQ00347",
      model: "PHILIPS XITANIUM 44W",
      currents: [350],
      outputRanges: [{ current: 350, vMin: 55, vMax: 125 }], // cobre 3-5 barras (75V-125V)
      inputVoltage: "220V",
      priority: 1,
      available: true,
      restrictions: { onlyPowerW: 18, preferredMinBars: 3, preferredMaxBars: 5 },
    },
    {
      code: "EQ00393",
      model: "PHILIPS XITANIUM 65W",
      currents: [350],
      outputRanges: [{ current: 350, vMin: 126, vMax: 185 }], // cobre 6-7 barras (150V-175V)
      inputVoltage: "220V",
      priority: 1,
      available: true,
      restrictions: { onlyPowerW: 18, preferredMinBars: 6, preferredMaxBars: 7 },
    },
  ];

  it("18W/2 barras → EQ00346 (Philips 19W, faixa 1-2, Vout=50V)", () => {
    // 2 barras × 25V = 50V, dentro da faixa 20-54V do EQ00346
    const r = selectDriverFromSheet(mockDrivers18W, 2, 18, "220Vac", "STRIPFLEX");
    expect(r?.code).toBe("EQ00346");
  });

  it("18W/4 barras → EQ00347 (Philips 44W, faixa 3-5, Vout=100V)", () => {
    // 4 barras × 25V = 100V, dentro da faixa 55-125V do EQ00347
    const r = selectDriverFromSheet(mockDrivers18W, 4, 18, "220Vac", "STRIPFLEX");
    expect(r?.code).toBe("EQ00347");
  });

  it("18W/6 barras → EQ00393 (Philips 65W, faixa 6-7, Vout=150V)", () => {
    // 6 barras × 25V = 150V, dentro da faixa 126-185V do EQ00393
    const r = selectDriverFromSheet(mockDrivers18W, 6, 18, "220Vac", "STRIPFLEX");
    expect(r?.code).toBe("EQ00393");
  });

  it("driver com onlyPowerW=26 não é selecionado para 18W", () => {
    const driversWithOsram: SheetDriver[] = [
      ...mockDrivers18W,
      {
        code: "EQ00220",
        model: "OSRAM IT FIT 75W",
        currents: [350, 500],
        outputRanges: [
          { current: 350, vMin: 90, vMax: 216 },
          { current: 500, vMin: 90, vMax: 150 },
        ],
        inputVoltage: "220V",
        priority: 1,
        available: true,
        restrictions: { onlyPowerW: 26 },
      },
    ];
    // Para 18W, OSRAM não deve ser selecionado mesmo que Vout seja compatível
    const r = selectDriverFromSheet(driversWithOsram, 6, 18, "220Vac", "STRIPFLEX");
    expect(r?.code).not.toBe("EQ00220");
  });

  it("CERTADRIVE não é selecionado para BLAZE H (LLP-6060)", () => {
    const driversCertadrive: SheetDriver[] = [
      {
        code: "EQ00353",
        model: "PHILIPS CERTADRIVE 20W",
        currents: [500],
        outputRanges: [{ current: 500, vMin: 30, vMax: 42 }],
        inputVoltage: "220V",
        priority: 2,
        available: true,
        restrictions: { onlyPowerW: 26, maxBars: 1, notBlazeH: true, onlyEmbutirOrRemote: true },
      },
      {
        code: "EQ00220",
        model: "OSRAM IT FIT 75W",
        currents: [500],
        outputRanges: [{ current: 500, vMin: 90, vMax: 150 }],
        inputVoltage: "220V",
        priority: 1,
        available: true,
        restrictions: { onlyPowerW: 26 },
      },
    ];
    // CERTADRIVE não deve ser selecionado para BLAZE H
    const r = selectDriverFromSheet(driversCertadrive, 1, 26, "220Vac", "STRIPFLEX", {
      profileCode: "LLP-6060",
      isRemoteDriver: true,
    });
    expect(r?.code).not.toBe("EQ00353");
  });

  it("CERTADRIVE é selecionado para Embutir com 1 barra 26W (não BLAZE H)", () => {
    // 26W STRIPFLEX: 1 barra = 25V. CERTADRIVE tem faixa 30-42V.
    // Para cobrir 1 barra (25V), usamos uma faixa mais ampla no mock.
    const driversCertadrive: SheetDriver[] = [
      {
        code: "EQ00353",
        model: "PHILIPS CERTADRIVE 20W",
        currents: [500],
        outputRanges: [{ current: 500, vMin: 20, vMax: 42 }], // faixa ampliada para cobrir 1 barra (25V)
        inputVoltage: "220V",
        priority: 2,
        available: true,
        restrictions: { onlyPowerW: 26, maxBars: 1, notBlazeH: true, onlyEmbutirOrRemote: true },
      },
    ];
    // CERTADRIVE deve ser selecionado para Embutir com 1 barra 26W
    const r = selectDriverFromSheet(driversCertadrive, 1, 26, "220Vac", "STRIPFLEX", {
      profileCode: "LLE-2052",
      isRemoteDriver: true,
      installType: "EMBUTIR",
    });
    expect(r?.code).toBe("EQ00353");
  });

  it("LIFUD Bivolt não é selecionado para 26W (500mA)", () => {
    const driversLifud: SheetDriver[] = [
      {
        code: "EQ00580",
        model: "LIFUD 20W LF-FMR020YS0350U(S)",
        currents: [200, 250, 300, 350],
        outputRanges: [
          { current: 200, vMin: 25, vMax: 75 },
          { current: 250, vMin: 25, vMax: 75 },
          { current: 300, vMin: 25, vMax: 57 },
          { current: 350, vMin: 25, vMax: 57 },
        ],
        inputVoltage: "BIVOLT",
        priority: 1,
        available: true,
        restrictions: { onlyVoltage: "BIVOLT", onlyStripMethod: "STRIPFLEX" },
      },
    ];
    // LIFUD não deve ser selecionado para 26W (500mA) mesmo sendo Bivolt
    const r = selectDriverFromSheet(driversLifud, 1, 26, "Bivolt", "STRIPFLEX");
    expect(r).toBeNull();
  });

  it("driver indisponível (available=false) não é selecionado", () => {
    const driversWithUnavailable: SheetDriver[] = [
      {
        code: "EQ00236",
        model: "LIFUD 13W LF/GIR013YS0350BU",
        currents: [350],
        outputRanges: [{ current: 350, vMin: 25, vMax: 38 }],
        inputVoltage: "BIVOLT",
        priority: 2,
        available: false, // INDISPONÍVEL
        restrictions: {},
      },
      {
        code: "EQ00580",
        model: "LIFUD 20W LF-FMR020YS0350U(S)",
        currents: [350],
        outputRanges: [{ current: 350, vMin: 25, vMax: 57 }],
        inputVoltage: "BIVOLT",
        priority: 1,
        available: true,
        restrictions: { onlyVoltage: "BIVOLT", onlyStripMethod: "STRIPFLEX" },
      },
    ];
    // EQ00236 indisponível não deve ser selecionado; EQ00580 deve ser
    const r = selectDriverFromSheet(driversWithUnavailable, 1, 18, "Bivolt", "STRIPFLEX");
    expect(r?.code).toBe("EQ00580");
    expect(r?.code).not.toBe("EQ00236");
  });
});

// ─── Testes v1.9 — Restrição de Módulos Longos (Philips 100W e 150W) ──────────

describe("parseObservations — restrição onlyLongModules", () => {
  it("parseia 'PERFIS COM 18W DE 4 ATÉ 8 BARRAS - USAR SOMENTE EM CASO DE HABILITADO O BOTÃO DE MÓDULOS LONGOS'", () => {
    const obs = "PERFIS COM 18W DE 4 ATÉ 8 BARRAS - USAR SOMENTE EM CASO DE HABILITADO O BOTÃO DE MÓDULOS LONGOS";
    const r = parseObservations(obs);
    expect(r.onlyPowerW).toBe(18);
    expect(r.preferredMinBars).toBe(4);
    expect(r.preferredMaxBars).toBe(8);
    expect(r.onlyLongModules).toBe(true);
  });

  it("parseia 'PERFIS COM 18W DE 6 ATÉ 8 BARRAS - USAR SOMENTE EM CASO DE HABILITADO O BOTÃO DE MÓDULOS LONGOS'", () => {
    const obs = "PERFIS COM 18W DE 6 ATÉ 8 BARRAS - USAR SOMENTE EM CASO DE HABILITADO O BOTÃO DE MÓDULOS LONGOS";
    const r = parseObservations(obs);
    expect(r.onlyPowerW).toBe(18);
    expect(r.preferredMinBars).toBe(6);
    expect(r.preferredMaxBars).toBe(8);
    expect(r.onlyLongModules).toBe(true);
  });

  it("drivers de prioridade 1 (Philips 19W/44W/65W) NÃO têm onlyLongModules", () => {
    const obs1 = "PRIORIDADE 18W DE 1 ATÉ 2 BARRAS";
    const obs2 = "PRIORIDADE 18W DE 3 ATÉ 5 BARRAS";
    const obs3 = "PRIORIDADE 18W DE 6 ATÉ 7 BARRAS";
    expect(parseObservations(obs1).onlyLongModules).toBeUndefined();
    expect(parseObservations(obs2).onlyLongModules).toBeUndefined();
    expect(parseObservations(obs3).onlyLongModules).toBeUndefined();
  });
});

describe("selectDriverFromSheet — restrição onlyLongModules", () => {
  // Mock com Philips 65W (prioridade 1, sem restrição) e Philips 100W (prioridade 2, onlyLongModules)
  const mockDriversLong: SheetDriver[] = [
    {
      code: "EQ00393",
      model: "PHILIPS XITANIUM 65W",
      currents: [350],
      outputRanges: [{ current: 350, vMin: 120, vMax: 185 }],
      inputVoltage: "220V",
      priority: 1,
      available: true,
      restrictions: { onlyPowerW: 18, preferredMinBars: 6, preferredMaxBars: 7 },
    },
    {
      code: "EQ00349",
      model: "PHILIPS XITANIUM 100W",
      currents: [350],
      outputRanges: [{ current: 350, vMin: 100, vMax: 200 }],
      inputVoltage: "220V",
      priority: 2,
      available: true,
      restrictions: { onlyPowerW: 18, preferredMinBars: 4, preferredMaxBars: 8, onlyLongModules: true },
    },
  ];

  it("Philips 100W NÃO é selecionado quando allowLongModules=false (8 barras, 200V)", () => {
    // 8 barras × 25V = 200V → dentro da faixa do 100W (100-200V)
    // Mas onlyLongModules=true e allowLongModules=false → deve ser bloqueado
    const r = selectDriverFromSheet(mockDriversLong, 8, 18, "220Vac", "STRIPFLEX", {
      allowLongModules: false,
    });
    // Sem módulos longos, o 100W é bloqueado; o 65W cobre 120-185V mas 200V está fora
    // Portanto nenhum driver deve ser retornado
    expect(r?.code).not.toBe("EQ00349");
  });

  it("Philips 100W É selecionado quando allowLongModules=true (8 barras, 200V)", () => {
    // 8 barras × 25V = 200V → dentro da faixa do 100W (100-200V)
    // Com allowLongModules=true → deve ser selecionado
    const r = selectDriverFromSheet(mockDriversLong, 8, 18, "220Vac", "STRIPFLEX", {
      allowLongModules: true,
    });
    expect(r?.code).toBe("EQ00349");
  });

  it("Philips 65W é selecionado normalmente sem restrição de módulos longos (6 barras, 150V)", () => {
    // 6 barras × 25V = 150V → dentro da faixa do 65W (120-185V)
    // Sem restrição onlyLongModules → deve ser selecionado independente do flag
    const r = selectDriverFromSheet(mockDriversLong, 6, 18, "220Vac", "STRIPFLEX", {
      allowLongModules: false,
    });
    expect(r?.code).toBe("EQ00393");
  });
});

describe("selectDrivers — fallback hardcoded respeita allowLongModules", () => {
  it("8 barras 18W 220V sem módulos longos → Philips 65W (não 100W)", () => {
    // O fallback hardcoded deve retornar 65W quando allowLongModules=false
    const r = selectDriverFallback(8, 18, "220Vac", "STRIPFLEX", false);
    expect(r.model).toContain("65W");
    expect(r.model).not.toContain("100W");
  });

  it("8 barras 18W 220V com módulos longos → Philips 65W (lógica v00 máximo 7 barras, sem 100W)", () => {
    // Lógica v00: máximo definido é 6-7 barras → 65W. Acima de 7 também retorna 65W.
    const r = selectDriverFallback(8, 18, "220Vac", "STRIPFLEX", true);
    expect(r.model).toContain("65W");
  });
});

// ─── Testes v2.1 — Filtro obrigatório de faixa de barras ─────────────────────

describe("selectDriverFromSheet — preferredMinBars/MaxBars como filtro obrigatório", () => {
  // Mock com todos os drivers Philips com faixas de barras definidas
  const mockAllPhilips: SheetDriver[] = [
    {
      code: "EQ00346",
      model: "PHILIPS XITANIUM 19W",
      currents: [350],
      outputRanges: [{ current: 350, vMin: 30, vMax: 54 }],
      inputVoltage: "220V",
      priority: 1,
      available: true,
      restrictions: { onlyPowerW: 18, preferredMinBars: 1, preferredMaxBars: 2 },
    },
    {
      code: "EQ00347",
      model: "PHILIPS XITANIUM 44W",
      currents: [350],
      outputRanges: [{ current: 350, vMin: 70, vMax: 125 }],
      inputVoltage: "220V",
      priority: 1,
      available: true,
      restrictions: { onlyPowerW: 18, preferredMinBars: 3, preferredMaxBars: 5 },
    },
    {
      code: "EQ00393",
      model: "PHILIPS XITANIUM 65W",
      currents: [350],
      outputRanges: [{ current: 350, vMin: 120, vMax: 185 }],
      inputVoltage: "220V",
      priority: 1,
      available: true,
      restrictions: { onlyPowerW: 18, preferredMinBars: 6, preferredMaxBars: 7 },
    },
    {
      code: "EQ00349",
      model: "PHILIPS XITANIUM 100W",
      currents: [350],
      outputRanges: [{ current: 350, vMin: 100, vMax: 200 }],
      inputVoltage: "220V",
      priority: 2,
      available: true,
      restrictions: { onlyPowerW: 18, preferredMinBars: 4, preferredMaxBars: 8 },
    },
  ];

  it("4 barras (100V) → EQ00347 Philips 44W (não 65W, não 100W)", () => {
    // 4 barras × 25V = 100V
    // EQ00347 (44W, prioridade 1, faixa 3-5): cobre 100V e está na faixa → selecionado
    // EQ00393 (65W, prioridade 1, faixa 6-7): fora da faixa de barras → bloqueado
    // EQ00349 (100W, prioridade 2, faixa 4-8): cobre 100V mas prioridade inferior → não selecionado
    const r = selectDriverFromSheet(mockAllPhilips, 4, 18, "220Vac", "STRIPFLEX");
    expect(r?.code).toBe("EQ00347");
    expect(r?.model).toContain("44W");
  });

  it("6 barras (150V) → EQ00393 Philips 65W (não 44W)", () => {
    // 6 barras × 25V = 150V
    // EQ00347 (44W, faixa 3-5): fora da faixa de barras → bloqueado
    // EQ00393 (65W, faixa 6-7): cobre 150V e está na faixa → selecionado
    const r = selectDriverFromSheet(mockAllPhilips, 6, 18, "220Vac", "STRIPFLEX");
    expect(r?.code).toBe("EQ00393");
    expect(r?.model).toContain("65W");
  });

  it("5 barras (125V) → EQ00347 Philips 44W (faixa 3-5, não 65W)", () => {
    // 5 barras × 25V = 125V
    // EQ00347 (44W, faixa 3-5): cobre 125V e está na faixa → selecionado
    // EQ00393 (65W, faixa 6-7): fora da faixa de barras → bloqueado
    const r = selectDriverFromSheet(mockAllPhilips, 5, 18, "220Vac", "STRIPFLEX");
    expect(r?.code).toBe("EQ00347");
    expect(r?.model).toContain("44W");
  });

  it("8 barras (200V) → EQ00349 Philips 100W (único que cobre, faixa 4-8)", () => {
    // 8 barras × 25V = 200V
    // EQ00393 (65W, faixa 6-7): fora da faixa de barras → bloqueado
    // EQ00349 (100W, faixa 4-8): cobre 200V e está na faixa → selecionado (único candidato)
    const r = selectDriverFromSheet(mockAllPhilips, 8, 18, "220Vac", "STRIPFLEX");
    expect(r?.code).toBe("EQ00349");
    expect(r?.model).toContain("100W");
  });

  it("Philips 65W NUNCA é selecionado para 4 barras mesmo com Vout compatível", () => {
    // Garantia explícita: 65W não pode aparecer para 4 barras
    const r = selectDriverFromSheet(mockAllPhilips, 4, 18, "220Vac", "STRIPFLEX");
    expect(r?.code).not.toBe("EQ00393");
    expect(r?.model).not.toContain("65W");
  });
});

// ─── Testes v2.2 — Lógica definitiva v00 (23/04/2026) ────────────────────────

describe("Lógica v00 — 18W 220V STRIPFLEX", () => {
  it("1 barra → EQ00346 PHILIPS XITANIUM 19W 350mA", () => {
    const r = selectDriverFallback(1, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00346");
    expect(r.model).toContain("19W");
    expect(r.current).toBe("350mA");
  });
  it("2 barras → EQ00346 PHILIPS XITANIUM 19W 350mA", () => {
    const r = selectDriverFallback(2, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00346");
    expect(r.model).toContain("19W");
  });
  it("3 barras → EQ00347 PHILIPS XITANIUM 44W 350mA", () => {
    const r = selectDriverFallback(3, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00347");
    expect(r.model).toContain("44W");
  });
  it("5 barras → EQ00347 PHILIPS XITANIUM 44W 350mA", () => {
    const r = selectDriverFallback(5, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00347");
    expect(r.model).toContain("44W");
  });
  it("6 barras → EQ00393 PHILIPS XITANIUM 65W 350mA", () => {
    const r = selectDriverFallback(6, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00393");
    expect(r.model).toContain("65W");
  });
  it("7 barras → EQ00393 PHILIPS XITANIUM 65W 350mA", () => {
    const r = selectDriverFallback(7, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00393");
    expect(r.model).toContain("65W");
  });
});

describe("Lógica v00 — 18W Bivolt STRIPFLEX", () => {
  it("1 barra → EQ00580 LIFUD 20W 350mA", () => {
    const r = selectDriverFallback(1, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00580");
    expect(r.model).toContain("20W");
    expect(r.current).toBe("350mA");
  });
  it("2 barras → EQ00580 LIFUD 20W 350mA", () => {
    const r = selectDriverFallback(2, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00580");
  });
  it("3 barras → EQ00581 LIFUD 40W 350mA", () => {
    const r = selectDriverFallback(3, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00581");
    expect(r.model).toContain("40W");
  });
  it("4 barras → EQ00581 LIFUD 40W 350mA", () => {
    const r = selectDriverFallback(4, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00581");
  });
  it("5 barras → EQ00582 LIFUD 60W 350mA", () => {
    const r = selectDriverFallback(5, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00582");
    expect(r.model).toContain("60W");
  });
  it("6 barras → EQ00582 LIFUD 60W 350mA", () => {
    const r = selectDriverFallback(6, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00582");
  });
});

describe("Lógica v00 — 36W 220V STRIPFLEX dupla (mesma lógica do 18W 220V)", () => {
  it("1 barra → EQ00346 PHILIPS XITANIUM 19W (mesma lógica do 18W)", () => {
    const r = selectDriverFallback(1, 36, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00346");
    expect(r.model).toContain("19W");
  });
  it("3 barras → EQ00347 PHILIPS XITANIUM 44W", () => {
    const r = selectDriverFallback(3, 36, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00347");
    expect(r.model).toContain("44W");
  });
  it("6 barras → EQ00393 PHILIPS XITANIUM 65W", () => {
    const r = selectDriverFallback(6, 36, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00393");
    expect(r.model).toContain("65W");
  });
});

describe("Lógica v.01 — 36W 220V STRIPLINE (barras inteiras, 250mA)", () => {
  it("1 barra → EQ00347 PHILIPS XITANIUM 44W 250mA (Cenário 03)", () => {
    const r = selectDriverFallback(1, 36, "220Vac", "STRIPLINE");
    expect(r.code).toBe("EQ00347");
    expect(r.model).toContain("44W");
    expect(r.current).toBe("250mA"); // Stripline usa 250mA (v.01)
  });
  it("2 barras → EQ00393 PHILIPS XITANIUM 65W 250mA (Cenário 03)", () => {
    const r = selectDriverFallback(2, 36, "220Vac", "STRIPLINE");
    expect(r.code).toBe("EQ00393");
    expect(r.model).toContain("65W");
    expect(r.current).toBe("250mA"); // Stripline usa 250mA (v.01)
  });
});

describe("Lógica v00 — 36W Bivolt STRIPLINE (barras inteiras)", () => {
  it("1 barra → EQ00581 LIFUD 40W 250mA", () => {
    const r = selectDriverFallback(1, 36, "Bivolt", "STRIPLINE");
    expect(r.code).toBe("EQ00581");
    expect(r.model).toContain("40W");
    expect(r.current).toBe("250mA");
  });
  it("2 barras → EQ00582 LIFUD 60W 250mA", () => {
    const r = selectDriverFallback(2, 36, "Bivolt", "STRIPLINE");
    expect(r.code).toBe("EQ00582");
    expect(r.model).toContain("60W");
    expect(r.current).toBe("250mA");
  });
});

// ─── Testes v2.3 — Instrução Técnica Alfalux v.01 ────────────────────────────

describe("v.01 — TRAVA DE SEGURANÇA: 65W nunca para ≤5 barras (Cenário 01)", () => {
  it("5 barras 18W 220V → EQ00347 44W (TRAVA: 65W proibido para ≤5)", () => {
    const r = selectDriverFallback(5, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00347");
    expect(r.model).not.toContain("65W");
    expect(r.model).toContain("44W");
  });
  it("5 barras 36W 220V STRIPFLEX → EQ00347 44W (TRAVA: 65W proibido para ≤5)", () => {
    const r = selectDriverFallback(5, 36, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00347");
    expect(r.model).not.toContain("65W");
  });
  it("6 barras 18W 220V → EQ00393 65W (primeiro caso válido para 65W)", () => {
    const r = selectDriverFallback(6, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00393");
    expect(r.model).toContain("65W");
  });
  it("4 barras 18W 220V → EQ00347 44W (TRAVA: 65W proibido para ≤5)", () => {
    const r = selectDriverFallback(4, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00347");
    expect(r.model).not.toContain("65W");
  });
});

describe("v.01 — Stripline: arredondamento para inteiro superior (Cenário 03)", () => {
  it("1.5 barras Stripline 220V → ceil(1.5)=2 → EQ00393 65W 250mA", () => {
    const r = selectDriverFallback(1.5, 36, "220Vac", "STRIPLINE");
    expect(r.code).toBe("EQ00393");
    expect(r.model).toContain("65W");
    expect(r.current).toBe("250mA");
  });
  it("0.5 barras Stripline 220V → ceil(0.5)=1 → EQ00347 44W 250mA", () => {
    const r = selectDriverFallback(0.5, 36, "220Vac", "STRIPLINE");
    expect(r.code).toBe("EQ00347");
    expect(r.model).toContain("44W");
    expect(r.current).toBe("250mA");
  });
  it("1.1 barras Stripline 220V → round(1.1)=1 → EQ00347 44W 250mA (Versão Final 02: inteiro mais próximo)", () => {
    const r = selectDriverFallback(1.1, 36, "220Vac", "STRIPLINE");
    expect(r.code).toBe("EQ00347"); // round(1.1)=1 → 1 barra → 44W
    expect(r.current).toBe("250mA");
  });
  it("1.5 barras Stripline Bivolt → round(1.5)=2 → EQ00582 LIFUD 60W 250mA", () => {
    const r = selectDriverFallback(1.5, 36, "Bivolt", "STRIPLINE");
    expect(r.code).toBe("EQ00582"); // round(1.5)=2 → 2 barras → 60W
    expect(r.model).toContain("60W");
    expect(r.current).toBe("250mA");
  });
  it("0.5 barras Stripline Bivolt → ceil(0.5)=1 → EQ00581 LIFUD 40W 250mA", () => {
    const r = selectDriverFallback(0.5, 36, "Bivolt", "STRIPLINE");
    expect(r.code).toBe("EQ00581");
    expect(r.model).toContain("40W");
    expect(r.current).toBe("250mA");
  });
});

describe("v.01 — Cenário 01: matriz completa 220V STRIPFLEX", () => {
  it("1 barra → EQ00346 19W (limite inferior)", () => {
    expect(selectDriverFallback(1, 18, "220Vac", "STRIPFLEX").code).toBe("EQ00346");
  });
  it("2 barras → EQ00346 19W (limite superior do 19W)", () => {
    expect(selectDriverFallback(2, 18, "220Vac", "STRIPFLEX").code).toBe("EQ00346");
  });
  it("3 barras → EQ00347 44W (início da faixa 44W)", () => {
    expect(selectDriverFallback(3, 18, "220Vac", "STRIPFLEX").code).toBe("EQ00347");
  });
  it("5 barras → EQ00347 44W (limite superior do 44W, trava 65W)", () => {
    expect(selectDriverFallback(5, 18, "220Vac", "STRIPFLEX").code).toBe("EQ00347");
  });
  it("6 barras → EQ00393 65W (início da faixa 65W)", () => {
    expect(selectDriverFallback(6, 18, "220Vac", "STRIPFLEX").code).toBe("EQ00393");
  });
  it("7 barras → EQ00393 65W (limite superior do 65W)", () => {
    expect(selectDriverFallback(7, 18, "220Vac", "STRIPFLEX").code).toBe("EQ00393");
  });
});

describe("v.01 — Cenário 02: matriz completa Bivolt STRIPFLEX", () => {
  it("1 barra → EQ00580 LIFUD 20W", () => {
    expect(selectDriverFallback(1, 18, "Bivolt", "STRIPFLEX").code).toBe("EQ00580");
  });
  it("2 barras → EQ00580 LIFUD 20W (limite superior)", () => {
    expect(selectDriverFallback(2, 18, "Bivolt", "STRIPFLEX").code).toBe("EQ00580");
  });
  it("3 barras → EQ00581 LIFUD 40W", () => {
    expect(selectDriverFallback(3, 18, "Bivolt", "STRIPFLEX").code).toBe("EQ00581");
  });
  it("4 barras → EQ00581 LIFUD 40W (limite superior)", () => {
    expect(selectDriverFallback(4, 18, "Bivolt", "STRIPFLEX").code).toBe("EQ00581");
  });
  it("5 barras → EQ00582 LIFUD 60W", () => {
    expect(selectDriverFallback(5, 18, "Bivolt", "STRIPFLEX").code).toBe("EQ00582");
  });
  it("6 barras → EQ00582 LIFUD 60W (limite superior)", () => {
    expect(selectDriverFallback(6, 18, "Bivolt", "STRIPFLEX").code).toBe("EQ00582");
  });
});

// ─── Testes v2.4 — Lógica de Drivers Alfalux Versão Final 02 (24/04/2026) ────

describe("v.02 — Gatilhos de faixa precisos: 220V STRIPFLEX (Cenário A)", () => {
  it("2.0 barras → EQ00346 19W (limite superior do 19W)", () => {
    const r = selectDriverFallback(2.0, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00346");
    expect(r.model).toContain("19W");
  });
  it("2.01 barras → EQ00347 44W (gatilho imediato acima de 2.0)", () => {
    const r = selectDriverFallback(2.01, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00347");
    expect(r.model).toContain("44W");
  });
  it("2.1 barras → EQ00347 44W (confirmação do gatilho 2.1)", () => {
    const r = selectDriverFallback(2.1, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00347");
  });
  it("5.0 barras → EQ00347 44W (limite superior do 44W)", () => {
    const r = selectDriverFallback(5.0, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00347");
    expect(r.model).toContain("44W");
  });
  it("5.01 barras → EQ00393 65W (gatilho imediato acima de 5.0)", () => {
    const r = selectDriverFallback(5.01, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00393");
    expect(r.model).toContain("65W");
  });
  it("5.1 barras → EQ00393 65W (confirmação do gatilho 5.1)", () => {
    const r = selectDriverFallback(5.1, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00393");
  });
});

describe("v.02 — Gatilhos de faixa precisos: Bivolt STRIPFLEX (Cenário B)", () => {
  it("2.0 barras → EQ00580 LIFUD 20W (limite superior)", () => {
    const r = selectDriverFallback(2.0, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00580");
  });
  it("2.1 barras → EQ00581 LIFUD 40W (gatilho imediato)", () => {
    const r = selectDriverFallback(2.1, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00581");
  });
  it("4.0 barras → EQ00581 LIFUD 40W (limite superior)", () => {
    const r = selectDriverFallback(4.0, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00581");
  });
  it("4.1 barras → EQ00582 LIFUD 60W (gatilho imediato)", () => {
    const r = selectDriverFallback(4.1, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00582");
  });
});

describe("v.02 — Piso mínimo de 1.0 barra", () => {
  it("0.5 barras 18W 220V → piso 1.0 → EQ00346 19W", () => {
    const r = selectDriverFallback(0.5, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00346");
  });
  it("0.1 barras 18W Bivolt → piso 1.0 → EQ00580 LIFUD 20W", () => {
    const r = selectDriverFallback(0.1, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00580");
  });
  it("0 barras 18W 220V → piso 1.0 → EQ00346 19W", () => {
    const r = selectDriverFallback(0, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00346");
  });
});

describe("v.02 — Stripline: apenas inteiros via Math.round", () => {
  it("1.4 barras Stripline 220V → round=1 → EQ00347 44W", () => {
    const r = selectDriverFallback(1.4, 36, "220Vac", "STRIPLINE");
    expect(r.code).toBe("EQ00347");
  });
  it("1.6 barras Stripline 220V → round=2 → EQ00393 65W", () => {
    const r = selectDriverFallback(1.6, 36, "220Vac", "STRIPLINE");
    expect(r.code).toBe("EQ00393");
  });
  it("1.4 barras Stripline Bivolt → round=1 → EQ00581 LIFUD 40W", () => {
    const r = selectDriverFallback(1.4, 36, "Bivolt", "STRIPLINE");
    expect(r.code).toBe("EQ00581");
  });
  it("1.6 barras Stripline Bivolt → round=2 → EQ00582 LIFUD 60W", () => {
    const r = selectDriverFallback(1.6, 36, "Bivolt", "STRIPLINE");
    expect(r.code).toBe("EQ00582");
  });
});

// ─── Testes v2.5 — Lógica v01 (24/04/2026) ────────────────────────────────────

describe("v01 — 26W 220V: CERTADRIVE 1-3 barras, OSRAM 4-6 barras", () => {
  it("1 barra → CERTADRIVE qty=1", () => {
    const r = selectDriverFallback(1, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00353");
    expect(r.quantity).toBe(1);
  });
  it("2 barras → CERTADRIVE qty=2", () => {
    const r = selectDriverFallback(2, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00353");
    expect(r.quantity).toBe(2);
  });
  it("3 barras → CERTADRIVE qty=3", () => {
    const r = selectDriverFallback(3, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00353");
    expect(r.quantity).toBe(3);
  });
  it("4 barras → CERTADRIVE qty=3 (3.3-4.0 = ×3 Certadrive)", () => {
    const r = selectDriverFallback(4, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00353");
    expect(r.quantity).toBe(3);
  });
  it("5 barras → OSRAM qty=1", () => {
    const r = selectDriverFallback(5, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00220");
    expect(r.quantity).toBe(1);
  });
  it("6 barras → OSRAM qty=1", () => {
    const r = selectDriverFallback(6, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00220");
    expect(r.quantity).toBe(1);
  });
});

describe("v2.8 — 26W: medidas quebradas (lógica oficial)", () => {
  it("1.1 barras → 1.1 ≤ 1.6 → CERTADRIVE qty=1", () => {
    const r = selectDriverFallback(1.1, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00353");
    expect(r.quantity).toBe(1);
  });
  it("1.6 barras → 1.6 ≤ 1.6 → CERTADRIVE qty=1", () => {
    const r = selectDriverFallback(1.6, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00353");
    expect(r.quantity).toBe(1);
  });
  it("1.7 barras → NÃO EXISTE → OSRAM (fallback segurança)", () => {
    const r = selectDriverFallback(1.7, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00220"); // placeholder de segurança
  });
  it("1.9 barras → 1.9 < 3.0 → CERTADRIVE qty=2", () => {
    const r = selectDriverFallback(1.9, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00353");
    expect(r.quantity).toBe(2);
  });
  it("2.5 barras → 2.5 < 3.0 → CERTADRIVE qty=2", () => {
    const r = selectDriverFallback(2.5, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00353");
    expect(r.quantity).toBe(2);
  });
  it("3.0 barras → 3.0 ≤ 3.2 → CERTADRIVE qty=3", () => {
    const r = selectDriverFallback(3.0, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00353");
    expect(r.quantity).toBe(3);
  });
  it("3.1 barras → 3.1 ≤ 3.2 → CERTADRIVE qty=3", () => {
    const r = selectDriverFallback(3.1, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00353");
    expect(r.quantity).toBe(3);
  });
  it("3.5 barras → 3.5 ≤ 4.0 → CERTADRIVE qty=3", () => {
    const r = selectDriverFallback(3.5, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00353");
    expect(r.quantity).toBe(3);
  });
  it("4.9 barras → ceil=5 → OSRAM qty=1", () => {
    const r = selectDriverFallback(4.9, 26, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00220");
    expect(r.quantity).toBe(1);
  });
});

describe("v01 — 18W 220V: medidas quebradas (Math.ceil para faixa)", () => {
  it("1.3 barras → ceil=2 → EQ00346 19W", () => {
    const r = selectDriverFallback(1.3, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00346");
  });
  it("2.1 barras → ceil=3 → EQ00347 44W", () => {
    const r = selectDriverFallback(2.1, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00347");
  });
  it("5.1 barras → ceil=6 → EQ00393 65W", () => {
    const r = selectDriverFallback(5.1, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00393");
  });
  it("5.0 barras → ceil=5 → EQ00347 44W (limite exato)", () => {
    const r = selectDriverFallback(5.0, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00347");
  });
  it("2.0 barras → ceil=2 → EQ00346 19W (limite exato)", () => {
    const r = selectDriverFallback(2.0, 18, "220Vac", "STRIPFLEX");
    expect(r.code).toBe("EQ00346");
  });
});

describe("v01 — 18W Bivolt: medidas quebradas (Math.ceil para faixa)", () => {
  it("1.5 barras → ceil=2 → EQ00580 LIFUD 20W", () => {
    const r = selectDriverFallback(1.5, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00580");
  });
  it("2.1 barras → ceil=3 → EQ00581 LIFUD 40W", () => {
    const r = selectDriverFallback(2.1, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00581");
  });
  it("4.1 barras → ceil=5 → EQ00582 LIFUD 60W", () => {
    const r = selectDriverFallback(4.1, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00582");
  });
  it("4.0 barras → ceil=4 → EQ00581 LIFUD 40W (limite exato)", () => {
    const r = selectDriverFallback(4.0, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00581");
  });
  it("2.0 barras → ceil=2 → EQ00580 LIFUD 20W (limite exato)", () => {
    const r = selectDriverFallback(2.0, 18, "Bivolt", "STRIPFLEX");
    expect(r.code).toBe("EQ00580");
  });
});

// --- Testes v3.0 --- Driver por peca/SKU individual (sem circuitos) ---

import { buildComposition } from "./ledEngine";

describe("v3.0 --- Driver por peca/SKU individual (regra definitiva)", () => {
  it("3375mm 18W 220V cada modulo tem 1 driver calculado por suas barras", () => {
    const result = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 3375,
      allowLongModules: false,
      stripMethod: "STRIPFLEX",
      independentLighting: false,
    });
    // Cada SkuDriverEntry tem exatamente 1 driver (sem circuitos)
    result.driversD1.forEach(e => {
      expect(e.driver).toBeDefined();
      // barsPerPiece deve estar definido
      expect(e.barsPerPiece).toBeGreaterThan(0);
    });
    // Nao deve usar 65W para modulos com 3 barras (superdimensionamento proibido)
    result.driversD1.forEach(e => {
      if (e.barsPerPiece <= 5) {
        expect(e.driver.code).not.toBe("EQ00393");
      }
    });
  });

  it("2700mm 18W 220V modulos com 3 barras usam 44W, modulos com 2 barras usam 19W", () => {
    const result = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 2700,
      allowLongModules: false,
      stripMethod: "STRIPFLEX",
      independentLighting: false,
    });
    // Verificar que drivers sao corretos por peca
    result.driversD1.forEach(e => {
      if (e.barsPerPiece <= 2) {
        expect(e.driver.code).toBe("EQ00346"); // 19W para 1-2 barras
      } else if (e.barsPerPiece <= 5) {
        expect(e.driver.code).toBe("EQ00347"); // 44W para 3-5 barras
      }
    });
  });

  it("600mm 18W 220V 1 barra por peca usa 19W (EQ00346)", () => {
    const result = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 600,
      allowLongModules: false,
      stripMethod: "STRIPFLEX",
      independentLighting: false,
    });
    result.driversD1.forEach(e => {
      expect(e.driver.code).toBe("EQ00346"); // 1 barra usa 19W
    });
  });

  it("26W 220V 1 driver por modulo, sem circuitos", () => {
    const result = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 26,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 1000,
      allowLongModules: false,
      stripMethod: "STRIPFLEX",
      independentLighting: false,
    });
    // 26W: 1 driver por peca, barsPerPiece definido
    result.driversD1.forEach(e => {
      expect(e.driver).toBeDefined();
      expect(e.barsPerPiece).toBeGreaterThan(0);
    });
  });

  it("Stripline 36W 1 driver por modulo, sem circuitos", () => {
    const result = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 36,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 1125,
      allowLongModules: false,
      stripMethod: "STRIPLINE",
      independentLighting: false,
    });
    result.driversD1.forEach(e => {
      expect(e.driver).toBeDefined();
      expect(e.barsPerPiece).toBeGreaterThan(0);
    });
  });

  it("5000mm 18W 220V modulos com 6 barras usam 65W (por peca)", () => {
    const result = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 5000,
      allowLongModules: false,
      stripMethod: "STRIPFLEX",
      independentLighting: false,
    });
    // Cada modulo tem seu proprio driver calculado por suas barras
    result.driversD1.forEach(e => {
      expect(e.driver).toBeDefined();
      if (e.barsPerPiece >= 6) {
        expect(e.driver.code).toBe("EQ00393"); // 65W para 6-7 barras
      } else if (e.barsPerPiece >= 3) {
        expect(e.driver.code).toBe("EQ00347"); // 44W para 3-5 barras
      } else {
        expect(e.driver.code).toBe("EQ00346"); // 19W para 1-2 barras
      }
    });
  });
});

// --- Testes v3.1 --- Regra de Otimizacao de Modulos (Prioridade Absoluta) ---

describe("v3.1 --- Regra de Otimizacao de Modulos: menor quantidade vence sempre", () => {
  // Regra fundamental: solucao com MENOS modulos SEMPRE vence,
  // mesmo que a diferenca de comprimento seja maior.
  //
  // Para LLP-4251 com 4000mm:
  //   - 2x IF 1885mm = 3770mm (2 modulos) <- VENCEDOR (mais proximo com 2 modulos)
  //   - 2x IF 1700mm = 3400mm (2 modulos) <- tambem valido mas menos proximo
  //   - 2x IF 1135mm + 1x ML 1695mm = 3965mm (3 modulos) <- DESCARTADO (mais modulos)
  it("4000mm LLP-4251 18W -> 2 modulos (2x IF), NAO 3 modulos (2x IF + 1x ML)", () => {
    const result = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 4000,
      allowLongModules: false,
      stripMethod: "STRIPFLEX",
      independentLighting: false,
    });
    // Deve ter exatamente 2 modulos (2x IF) - nao 3 modulos
    const totalModules = result.composition.reduce((sum, item) => sum + item.quantity, 0);
    expect(totalModules).toBe(2);
    // Comprimento realizado deve ser 3770mm (2x IF 1885mm - o maior IF que cabe em 4000mm/2)
    expect(result.realizedLength).toBe(3770);
    // Todos os modulos devem ser IF
    result.composition.forEach(item => {
      expect(item.moduleType).toBe("IF");
    });
  });

  it("Solucao com 2 modulos vence mesmo com diferenca de comprimento maior", () => {
    // 4000mm: 2x IF 1885 = 3770mm (diferenca 230mm, 2 modulos) <- VENCE
    // vs 2x IF 1135 + 1x ML 1695 = 3965mm (diferenca 35mm, 3 modulos) <- PERDE
    // A solucao com 2 modulos DEVE vencer independente da diferenca de comprimento
    const result = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 4000,
      allowLongModules: false,
      stripMethod: "STRIPFLEX",
      independentLighting: false,
    });
    const totalModules = result.composition.reduce((sum, item) => sum + item.quantity, 0);
    // Deve usar no maximo 2 modulos (nunca 3 quando existe solucao de 2)
    expect(totalModules).toBeLessThanOrEqual(2);
  });

  it("Nao ultrapassar comprimento solicitado e minimizar modulos", () => {
    // Para qualquer comprimento, a composicao nao pode ultrapassar o solicitado
    const testLengths = [2000, 3000, 4000, 5000, 6000];
    for (const length of testLengths) {
      const result = calculateComposition({
        profileCode: "LLP-4251",
        application: "D1",
        powerD1: 18,
        cct: "4000K",
        voltage: "220Vac",
        totalLength: length,
        allowLongModules: false,
        stripMethod: "STRIPFLEX",
        independentLighting: false,
      });
      expect(result.realizedLength).toBeLessThanOrEqual(length);
    }
  });

  it("IF iguais nas pontas quando usa IF+ML", () => {
    // Quando usa IF+ML, os 2 IFs das pontas devem ser iguais (mesmo SKU)
    const result = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 7000,
      allowLongModules: false,
      stripMethod: "STRIPFLEX",
      independentLighting: false,
    });
    // Filtrar apenas modulos IF
    const ifItems = result.composition.filter(item => item.moduleType === "IF");
    if (ifItems.length > 0) {
      // Todos os IFs devem ter o mesmo SKU (IFs iguais nas pontas)
      const ifSkus = ifItems.map(item => item.sku);
      expect(new Set(ifSkus).size).toBe(1);
    }
  });

  it("2x IF sem ML quando 2x IF cabe exato no comprimento", () => {
    // 3770mm: 2x IF 1885mm = 3770mm exato -> deve usar 2x IF sem ML (2 modulos)
    const result = calculateComposition({
      profileCode: "LLP-4251",
      application: "D1",
      powerD1: 18,
      cct: "4000K",
      voltage: "220Vac",
      totalLength: 3770,
      allowLongModules: false,
      stripMethod: "STRIPFLEX",
      independentLighting: false,
    });
    const totalModules = result.composition.reduce((sum, item) => sum + item.quantity, 0);
    expect(totalModules).toBe(2);
    expect(result.realizedLength).toBe(3770);
  });

  it("Prioridade absoluta: 2 modulos sempre vence sobre 3 modulos mais proximos", () => {
    // Para varios comprimentos, verificar que nunca usa 3 modulos quando 2 sao possiveis
    const testCases = [
      { length: 3500, maxModules: 2 },  // 2x IF 1760 = 3520 > 3500, entao 2x IF 1700 = 3400 (2 mod)
      { length: 4000, maxModules: 2 },  // 2x IF 1885 = 3770 (2 mod)
      { length: 4500, maxModules: 2 },  // 2x IF 2200 = 4400 (2 mod)
    ];
    for (const tc of testCases) {
      const result = calculateComposition({
        profileCode: "LLP-4251",
        application: "D1",
        powerD1: 18,
        cct: "4000K",
        voltage: "220Vac",
        totalLength: tc.length,
        allowLongModules: false,
        stripMethod: "STRIPFLEX",
        independentLighting: false,
      });
      const totalModules = result.composition.reduce((sum, item) => sum + item.quantity, 0);
      expect(totalModules).toBeLessThanOrEqual(tc.maxModules);
      expect(result.realizedLength).toBeLessThanOrEqual(tc.length);
    }
  });
});
