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
  isLedBarFitaFamily,
  isLedBarFamilyWithoutDifusor,
  getLedBarAvailableInstallations,
  calcLedBarPrice,
  calcLedBarPriceDetail,
  getLedBarDriverQuantityPerCut,
  dim010vIsBivolt,
  daliIsBivolt,
  LED_BAR_CATALOG,
  LED_BAR_MAX_LENGTH_MM,
  formatLinearCutDescription,
  getLedBarCctOptions,
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
  it("extrai 7,5W/m com vírgula", () => expect(parsePotenciaFromName("LED BAR U DB 7,5W/M AMBAR")).toBe(7.5));
  it("extrai 10W/m", () => expect(parsePotenciaFromName("LED BAR U DB 10W/M")).toBe(10));
  it("extrai 14,4W/m com vírgula", () => expect(parsePotenciaFromName("LED BAR 45 NEW 14,4W/M")).toBe(14.4));
  it("extrai 25W/m", () => expect(parsePotenciaFromName("LED BAR U DB 25W/M")).toBe(25));
  it("retorna null para nome sem potência", () => expect(parsePotenciaFromName("LED BAR U DB")).toBeNull());
  it("retorna null para potência desconhecida", () => expect(parsePotenciaFromName("LED BAR U DB 15W/M")).toBeNull());
});

describe("LED BAR U 7,5W/m", () => {
  const amberProduct: LedBarProduct = {
    ...mockProduct,
    name: "LED BAR U DB 7,5W/M AMBAR",
    potencia: 7.5,
    ccts: ["1700K"],
    ledModule: "FITA LED HOPELUMI 24V 10W/M [CCT]",
    driver220: null,
    driverBivolt: { model: "FONTE DE TENSÃO ALFALUX 36W 24V IP20 BIVOLT", code: "EQ00801" },
    custoCorpoOnoffBivolt: 72.335,
    markupPadraoOnoffBivolt: 3,
    custoDriverBivolt: 29.99,
  };

  it("preserva o CCT 1700K e calcula pelo custo e markup oficiais", () => {
    const result = calculateLedBar({
      product: amberProduct,
      comprimentoMm: 1000,
      nCortes: 1,
      controle: "ON/OFF",
      voltage: "Bivolt",
      cct: "1700K",
    });

    expect(result.errors).toEqual([]);
    expect(result.cct).toBe("1700K");
    expect(result.ledModuleWithCCT).toContain("1700K");
    expect(result.trechos[0].driver.code).toBe("EQ00801");
    expect(calcLedBarPrice(7.5, 1000, 1, "LED BAR U", null, 29.99, 3, 72.335, 3)).toBe(306.98);
  });
});

describe("quantidade oficial de driver por corte", () => {
  const flProduct: LedBarProduct = {
    ...mockProduct,
    familia: "MINI BLAZE FL",
    sku: "LLP-3336",
    name: "MINI BLAZE P FL 10W/M",
    difusor: "NF",
    driver220: null,
    driverBivolt: { model: "FONTE 36W BIVOLT", code: "EQ00801" },
    driverQtdBivolt: 1,
    custoCorpoOnoffBivolt: 198.92,
    markupPadraoOnoffBivolt: 3,
    custoDriverBivolt: 29.99,
    markupPadraoDriverOnoffBivolt: 3,
  };

  it("lê da API uma fonte por corte e nunca gera quantidade zero para driver selecionado", () => {
    expect(getLedBarDriverQuantityPerCut(flProduct, "ON/OFF", "Bivolt")).toBe(1);
    const result = calculateLedBar({ product: flProduct, comprimentoMm: 4000, nCortes: 2, controle: "ON/OFF", voltage: "Bivolt", cct: "3000K" });
    expect(result.driverQtyPerCut).toBe(1);
    expect(result.driverQtyPerUnit).toBe(2);
  });

  it("multiplica o preço pela quantidade oficial de driver por corte", () => {
    const detail = calcLedBarPriceDetail(10, 2000, 1, "MINI BLAZE FL", null, 29.99, 3, 198.92, 3, 2);
    expect(detail?.driverQtyPerCut).toBe(2);
    expect(detail?.totalDriverQty).toBe(2);
    expect(detail?.totalDrivers).toBe(179.94);
  });
});

describe("preço do Perfil Flexível pelo custo oficial", () => {
  it("prioriza custo de R$ 107,80 vezes markup 3 sobre o fallback legado de R$ 157,00/m", () => {
    expect(calcLedBarPrice(10, 1000, 1, "PERFIL FLEXIVEL", null, null, null, 107.8, 3)).toBe(323.4);
    const detail = calcLedBarPriceDetail(10, 1000, 1, "PERFIL FLEXIVEL", null, 39.24, 3, 107.8, 3, 1);
    expect(detail).toMatchObject({
      precoPerfil: 323.4,
      precoDriverPorCorte: 117.72,
      totalDriverQty: 1,
      total: 441.12,
      corpoFromApi: true,
      driverFromApi: true,
    });
  });

  it("mantém preço direto por metro acima do custo vezes markup", () => {
    expect(calcLedBarPrice(10, 1000, 1, "PERFIL FLEXIVEL", 350, null, null, 107.8, 3)).toBe(350);
  });
});

describe("parseDifusorFromName", () => {
  it("extrai DA", () => expect(parseDifusorFromName("LED BAR U DA 10W/M")).toBe("DA"));
  it("extrai DB", () => expect(parseDifusorFromName("LED BAR U DB 10W/M")).toBe("DB"));
  it("extrai DC", () => expect(parseDifusorFromName("LED BAR U DC 10W/M")).toBe("DC"));
  it("retorna null para nome sem difusor", () => expect(parseDifusorFromName("LED BAR U 10W/M")).toBeNull());
});

describe("isLedBarFamilyWithoutDifusor", () => {
  it("reconhece SKYLINE FL sem difusor comercial", () => {
    expect(isLedBarFamilyWithoutDifusor("SKYLINE FL")).toBe(true);
  });

  it("reconhece BLAZE FL sem difusor comercial", () => {
    expect(isLedBarFamilyWithoutDifusor("BLAZE FL")).toBe(true);
  });

  it("reconhece MINI BLAZE FL sem difusor comercial", () => {
    expect(isLedBarFamilyWithoutDifusor("MINI BLAZE FL")).toBe(true);
  });

  it("reconhece futuras famílias FL sem difusor comercial", () => {
    expect(isLedBarFamilyWithoutDifusor("NOVA FAMÍLIA FL")).toBe(true);
  });

  it("mantém famílias LED BAR convencionais com seleção de difusor", () => {
    expect(isLedBarFamilyWithoutDifusor("LED BAR U")).toBe(false);
  });
});

describe("isLedBarFitaFamily", () => {
  it("reconhece as famílias FL atuais e futuras", () => {
    expect(isLedBarFitaFamily("SKYLINE FL")).toBe(true);
    expect(isLedBarFitaFamily("MINI BLAZE FL")).toBe(true);
    expect(isLedBarFitaFamily("PERFIL FUTURO FL")).toBe(true);
  });

  it("não inclui perfis sem o sufixo FL", () => {
    expect(isLedBarFitaFamily("LED BAR 45")).toBe(false);
  });
});

describe("getLedBarAvailableInstallations", () => {
  it("lista somente instalações SKYLINE FL disponibilizadas pela API", () => {
    const catalog: LedBarProduct[] = [
      { ...mockProduct, familia: "SKYLINE FL", instalacao: "EMBUTIR", difusor: "NF" },
      { ...mockProduct, familia: "SKYLINE FL", instalacao: "PENDENTE", difusor: "NF" },
      { ...mockProduct, familia: "LED BAR U", instalacao: "SOBREPOR" },
    ];

    expect(getLedBarAvailableInstallations(catalog, "SKYLINE FL")).toEqual(["EMBUTIR", "PENDENTE"]);
  });

  it("lista somente instalações BLAZE FL disponibilizadas pela API", () => {
    const catalog: LedBarProduct[] = [
      { ...mockProduct, familia: "BLAZE FL", instalacao: "EMBUTIR", difusor: "NF" },
      { ...mockProduct, familia: "BLAZE FL", instalacao: "PENDENTE", difusor: "NF" },
      { ...mockProduct, familia: "LED BAR U", instalacao: "SOBREPOR" },
    ];

    expect(getLedBarAvailableInstallations(catalog, "BLAZE FL")).toEqual(["EMBUTIR", "PENDENTE"]);
  });
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

  it("calcula SKYLINE FL com FITA LED, CCT e um driver por trecho", () => {
    const skyline: LedBarProduct = {
      ...mockProduct,
      familia: "SKYLINE FL",
      sku: "LLE-2052",
      name: "SKYLINE E FL 10W/M",
      difusor: "NF",
      ledModule3000: "FITA LED 2835 128LEDS 24V 10W/M IP20 IRC80 3000K 1500LM/M",
      ledModuleEq3000: "EQ00587",
      ccts: ["2700K", "3000K", "4000K", "5000K"],
      driver220: null,
      driverBivolt: { model: "FONTE DE TENSÃO ALFALUX 36W 24V IP20 BIVOLT", code: "EQ00801" },
    };

    const res = calculateLedBar({ product: skyline, comprimentoMm: 6000, nCortes: 2, controle: "ON/OFF", voltage: "Bivolt", cct: "3000K" });

    expect(res.errors).toHaveLength(0);
    expect(res.ledModuleWithCCT).toMatch(/^FITA LED/);
    expect(res.ledModuleEqCode).toBe("EQ00587");
    expect(res.trechos).toHaveLength(2);
    expect(res.trechos.every((trecho) => trecho.driver.code === "EQ00801")).toBe(true);
  });

  it("calcula BLAZE FL com FITA LED, CCT e uma fonte por trecho", () => {
    const blazeFl: LedBarProduct = {
      ...mockProduct,
      familia: "BLAZE FL",
      sku: "LLP-6060",
      name: "BLAZE H P FL 25W/M",
      potencia: 25,
      difusor: "NF",
      instalacao: "PENDENTE",
      ledModule3000: "FITA LED 2835 240LEDS/M 24V 25W/M IP20 IRC90 3000K 2650LM/M",
      ledModuleEq3000: "EQ00732",
      ccts: ["3000K", "4000K"],
      driver220: null,
      driverBivolt: { model: "FONTE DE TENSÃO ALFALUX 100W 24V IP20 BIVOLT", code: "EQ00803" },
    };

    const res = calculateLedBar({ product: blazeFl, comprimentoMm: 6000, nCortes: 2, controle: "ON/OFF", voltage: "Bivolt", cct: "3000K" });

    expect(res.errors).toHaveLength(0);
    expect(res.ledModuleWithCCT).toMatch(/^FITA LED/);
    expect(res.ledModuleEqCode).toBe("EQ00732");
    expect(res.trechos).toHaveLength(2);
    expect(res.trechos.every((trecho) => trecho.driver.code === "EQ00803")).toBe(true);
  });

  it("não usa tabela comercial estática quando SKYLINE FL não tem preço API", () => {
    expect(calcLedBarPrice(10, 1000, 1, "SKYLINE FL")).toBeNull();
  });

  it("não usa tabela comercial estática quando BLAZE FL não tem preço API", () => {
    expect(calcLedBarPrice(25, 1000, 1, "BLAZE FL")).toBeNull();
  });

  it("não usa tabela comercial estática quando MINI BLAZE FL não tem preço API", () => {
    expect(calcLedBarPrice(10, 1000, 1, "MINI BLAZE FL")).toBeNull();
  });

  it("não usa tabela comercial estática para futuras famílias FL sem preço API", () => {
    expect(calcLedBarPrice(10, 1000, 1, "NOVA FAMÍLIA FL")).toBeNull();
  });
});

describe("famílias lineares RGBW", () => {
  it("reconhece uma família FL RGBW no fluxo de perfis com fita", () => {
    expect(isLedBarFitaFamily("BLAZE FL RGBW")).toBe(true);
  });

  it("restringe a família RGBW a RGBW, sem permitir A definir", () => {
    expect(getLedBarCctOptions({ ccts: ["RGBW"] })).toEqual(["RGBW"]);
  });

  it("mantém A definir nos perfis lineares não RGBW", () => {
    expect(getLedBarCctOptions({ ccts: ["2700K", "3000K"] })).toEqual(["2700K", "3000K", "A definir"]);
  });
});

describe("formatLinearCutDescription", () => {
  it("exibe número de cortes e comprimento por trecho na descrição comercial", () => {
    expect(formatLinearCutDescription(
      "SKYLINE E FL 10W/M 3000K ON/OFF Bivolt 4000MM",
      2,
      2000,
    )).toBe("SKYLINE E FL 10W/M 3000K ON/OFF Bivolt 4000MM (2 x 2000mm)");
  });

  it("substitui um sufixo de corte antigo em vez de duplicá-lo", () => {
    expect(formatLinearCutDescription(
      "MILANO 10W/M 5000MM (1 x 5000mm)",
      2,
      2500,
    )).toBe("MILANO 10W/M 5000MM (2 x 2500mm)");
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
