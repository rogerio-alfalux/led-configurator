import { describe, it, expect } from "vitest";
import {
  BAGEO_CATALOG,
  getBageoAvailableInstalacoes,
  getBageoProductsByInstalacao,
  getBageoAvailableControles,
  calculateBageo,
  parseAplicacaoFromName,
  parseInstalacaoFromApi,
  formatBRL,
} from "./bageoCatalog";
import type { BageoProduct } from "./bageoCatalog";

// ─── Catálogo de teste ────────────────────────────────────────────────────────

const mockCatalog: BageoProduct[] = [
  {
    familia: "BAGEO",
    sku: "LDP-4910",
    name: "BAGEO SINUOSA P D1 20W/M",
    instalacao: "PENDENTE",
    aplicacao: "D1",
    ledModule: "2x FITA LED HOPELUMI 24V 10W/M [CCT]",
    ledModuleQtd: 2,
    ccts: ["2700K", "3000K", "4000K"],
    driver220: { model: "FONTE 60W 24V IP20", code: "EQ00112" },
    driverBivolt: { model: "FONTE 60W 24V IP20 BIV", code: "EQ00112" },
    driverDim110v: { model: "FONTE 60W 24V DIM 0-10V", code: "EQ00583" },
    driverDimDali: { model: "FONTE 72W 24V DIM DALI", code: "EQ00666" },
    precoOnOff220: 300,
    precoOnOffBivolt: 320,
    precoDim110v: 350,
    precoDimDali: 380,
    fotoUrl: null,
  },
  {
    familia: "BAGEO",
    sku: "LDP-4910",
    name: "BAGEO SINUOSA P D1+D2 40W/M",
    instalacao: "PENDENTE",
    aplicacao: "D1+D2",
    ledModule: "FITA LED HOPELUMI 24V 10W/M [CCT]",
    ledModuleQtd: 1,
    ccts: ["2700K", "3000K", "4000K"],
    driver220: { model: "FONTE 60W 24V IP20", code: "EQ00112" },
    driverBivolt: { model: "FONTE 60W 24V IP20 BIV", code: "EQ00112" },
    driverDim110v: { model: "FONTE 60W 24V DIM 0-10V", code: "EQ00583" },
    driverDimDali: { model: "FONTE 72W 24V DIM DALI", code: "EQ00666" },
    precoOnOff220: 500,
    precoOnOffBivolt: 520,
    precoDim110v: null,
    precoDimDali: null,
    fotoUrl: null,
  },
  {
    familia: "BAGEO",
    sku: "LDP-5000",
    name: "BAGEO SINUOSA S D1 20W/M",
    instalacao: "SOBREPOR",
    aplicacao: "D1",
    ledModule: "FITA LED HOPELUMI 24V 10W/M [CCT]",
    ledModuleQtd: 1,
    ccts: ["3000K", "4000K"],
    driver220: { model: "FONTE 60W 24V IP20", code: "EQ00112" },
    driverBivolt: null,
    driverDim110v: null,
    driverDimDali: null,
    precoOnOff220: 250,
    precoOnOffBivolt: null,
    precoDim110v: null,
    precoDimDali: null,
    fotoUrl: null,
  },
];

// ─── Testes de helpers ────────────────────────────────────────────────────────

describe("parseAplicacaoFromName", () => {
  it("parseia D1+D2 corretamente", () => {
    expect(parseAplicacaoFromName("BAGEO SINUOSA P D1+D2 40W/M")).toBe("D1+D2");
  });
  it("parseia D1 corretamente (sem D2)", () => {
    expect(parseAplicacaoFromName("BAGEO SINUOSA P D1 20W/M")).toBe("D1");
  });
  it("retorna null para nome sem D1 ou D1+D2", () => {
    expect(parseAplicacaoFromName("BAGEO SINUOSA")).toBeNull();
  });
  it("não confunde D1+D2 com D1", () => {
    expect(parseAplicacaoFromName("BAGEO D1+D2 40W")).toBe("D1+D2");
  });
});

describe("parseInstalacaoFromApi", () => {
  it("parseia PENDENTE", () => {
    expect(parseInstalacaoFromApi("PENDENTE")).toBe("PENDENTE");
  });
  it("parseia SOBREPOR", () => {
    expect(parseInstalacaoFromApi("SOBREPOR")).toBe("SOBREPOR");
  });
  it("parseia EMBUTIR", () => {
    expect(parseInstalacaoFromApi("EMBUTIR")).toBe("EMBUTIR");
  });
  it("retorna PENDENTE para valor desconhecido", () => {
    expect(parseInstalacaoFromApi("")).toBe("PENDENTE");
    expect(parseInstalacaoFromApi("OUTRO")).toBe("PENDENTE");
  });
  it("é case-insensitive", () => {
    expect(parseInstalacaoFromApi("sobrepor")).toBe("SOBREPOR");
    expect(parseInstalacaoFromApi("Embutir")).toBe("EMBUTIR");
  });
});

describe("getBageoAvailableInstalacoes", () => {
  it("retorna instalações únicas em ordem", () => {
    const result = getBageoAvailableInstalacoes(mockCatalog);
    expect(result).toEqual(["PENDENTE", "SOBREPOR"]);
  });
  it("retorna apenas PENDENTE para catálogo padrão", () => {
    const result = getBageoAvailableInstalacoes(BAGEO_CATALOG);
    expect(result).toEqual(["PENDENTE"]);
  });
  it("retorna array vazio para catálogo vazio", () => {
    expect(getBageoAvailableInstalacoes([])).toEqual([]);
  });
});

describe("getBageoProductsByInstalacao", () => {
  it("filtra produtos por instalação PENDENTE", () => {
    const result = getBageoProductsByInstalacao(mockCatalog, "PENDENTE");
    expect(result).toHaveLength(2);
    expect(result.every(p => p.instalacao === "PENDENTE")).toBe(true);
  });
  it("filtra produtos por instalação SOBREPOR", () => {
    const result = getBageoProductsByInstalacao(mockCatalog, "SOBREPOR");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("BAGEO SINUOSA S D1 20W/M");
  });
  it("retorna array vazio para instalação sem produtos", () => {
    const result = getBageoProductsByInstalacao(mockCatalog, "EMBUTIR");
    expect(result).toHaveLength(0);
  });
});

describe("getBageoAvailableControles", () => {
  it("retorna todos os controles quando todos os drivers estão disponíveis", () => {
    const product = mockCatalog[0];
    const result = getBageoAvailableControles(product);
    expect(result).toEqual(["ON/OFF 220V", "ON/OFF Bivolt", "DIM 1-10V", "DIM DALI"]);
  });
  it("retorna apenas ON/OFF 220V quando só driver220 está disponível", () => {
    const product = mockCatalog[2]; // SOBREPOR — só driver220
    const result = getBageoAvailableControles(product);
    expect(result).toEqual(["ON/OFF 220V"]);
  });
});

// ─── Testes do engine de cálculo ──────────────────────────────────────────────

describe("calculateBageo", () => {
  it("calcula corretamente para 1000mm (1 metro) com ON/OFF 220V", () => {
    const result = calculateBageo(mockCatalog, {
      product: mockCatalog[0],
      controle: "ON/OFF 220V",
      cct: "3000K",
      comprimento: 1000,
    });
    expect(result).not.toBeNull();
    expect(result!.comprimento).toBe(1000);
    expect(result!.comprimentoMetros).toBe(1);
    expect(result!.precoPorMetro).toBe(300);
    expect(result!.precoTotal).toBe(300);
    expect(result!.driver.code).toBe("EQ00112");
    expect(result!.ledModuleWithCCT).toContain("3000K");
    expect(result!.ledModuleQtd).toBe(2); // 2 por metro (do produto)
    expect(result!.fitaMetros).toBe(2); // 2 por metro × 1 metro
    expect(result!.driverQtd).toBe(1); // ceil(1000 / 2300) = 1
  });

  it("calcula corretamente para 2500mm (2.5 metros)", () => {
    const result = calculateBageo(mockCatalog, {
      product: mockCatalog[0],
      controle: "ON/OFF 220V",
      cct: "3000K",
      comprimento: 2500,
    });
    expect(result).not.toBeNull();
    expect(result!.comprimentoMetros).toBe(2.5);
    expect(result!.precoTotal).toBe(750); // 300 × 2.5
    expect(result!.ledModuleQtd).toBe(2); // 2 por metro (do produto)
    expect(result!.fitaMetros).toBe(5); // 2 × 2.5
    expect(result!.driverQtd).toBe(2); // ceil(2500 / 2300) = 2
  });

  it("seleciona driver DIM DALI corretamente", () => {
    const result = calculateBageo(mockCatalog, {
      product: mockCatalog[0],
      controle: "DIM DALI",
      cct: "2700K",
      comprimento: 1000,
    });
    expect(result).not.toBeNull();
    expect(result!.driver.code).toBe("EQ00666");
    expect(result!.precoPorMetro).toBe(380);
    expect(result!.precoTotal).toBe(380);
  });

  it("retorna precoTotal null quando precoPorMetro é null", () => {
    const result = calculateBageo(mockCatalog, {
      product: mockCatalog[1], // D1+D2 com precoDim110v=null
      controle: "DIM 1-10V",
      cct: "3000K",
      comprimento: 1000,
    });
    expect(result).not.toBeNull();
    expect(result!.precoPorMetro).toBeNull();
    expect(result!.precoTotal).toBeNull();
  });

  it("retorna null para comprimento menor que 100mm", () => {
    const result = calculateBageo(mockCatalog, {
      product: mockCatalog[0],
      controle: "ON/OFF 220V",
      cct: "3000K",
      comprimento: 50,
    });
    expect(result).toBeNull();
  });

  it("retorna null quando produto não existe no catálogo", () => {
    const fakeProduct = { ...mockCatalog[0], sku: "INEXISTENTE" };
    const result = calculateBageo(mockCatalog, {
      product: fakeProduct,
      controle: "ON/OFF 220V",
      cct: "3000K",
      comprimento: 1000,
    });
    expect(result).toBeNull();
  });

  it("substitui [CCT] no ledModule corretamente", () => {
    const result = calculateBageo(mockCatalog, {
      product: mockCatalog[0],
      controle: "ON/OFF 220V",
      cct: "4000K",
      comprimento: 1000,
    });
    expect(result!.ledModuleWithCCT).toBe("2x FITA LED HOPELUMI 24V 10W/M 4000K");
    expect(result!.ledModuleWithCCT).not.toContain("[CCT]");
  });

  it("calcula corretamente para 10000mm (10 metros) com preço por metro", () => {
    const result = calculateBageo(mockCatalog, {
      product: mockCatalog[0],
      controle: "ON/OFF Bivolt",
      cct: "3000K",
      comprimento: 10000,
    });
    expect(result).not.toBeNull();
    expect(result!.comprimentoMetros).toBe(10);
    expect(result!.precoPorMetro).toBe(320);
    expect(result!.precoTotal).toBe(3200); // 320 × 10
    expect(result!.ledModuleQtd).toBe(2); // 2 por metro (do produto)
    expect(result!.fitaMetros).toBe(20); // 2 × 10
    expect(result!.driverQtd).toBe(5); // ceil(10000 / 2300) = 5
  });

  it("calcula corretamente para 56000mm (56 metros)", () => {
    const result = calculateBageo(mockCatalog, {
      product: mockCatalog[0],
      controle: "ON/OFF 220V",
      cct: "3000K",
      comprimento: 56000,
    });
    expect(result).not.toBeNull();
    expect(result!.comprimentoMetros).toBe(56);
    expect(result!.fitaMetros).toBe(112); // 2 por metro × 56 metros
    expect(result!.driverQtd).toBe(25); // ceil(56000 / 2300) = ceil(24.35) = 25
    expect(result!.precoTotal).toBe(16800); // 300 × 56
  });
});

// ─── Testes de formatBRL ──────────────────────────────────────────────────────

describe("formatBRL", () => {
  it("formata valor em reais corretamente", () => {
    const result = formatBRL(300);
    expect(result).toContain("300");
    expect(result).toContain("R$");
  });
  it("formata valor com decimais", () => {
    const result = formatBRL(1234.56);
    expect(result).toContain("1");
    expect(result).toContain("234");
  });
});

// ─── Testes do catálogo estático de fallback ──────────────────────────────────

describe("BAGEO_CATALOG (fallback)", () => {
  it("tem pelo menos 2 produtos", () => {
    expect(BAGEO_CATALOG.length).toBeGreaterThanOrEqual(2);
  });
  it("todos os produtos têm instalação PENDENTE", () => {
    expect(BAGEO_CATALOG.every(p => p.instalacao === "PENDENTE")).toBe(true);
  });
  it("tem produto D1 e D1+D2", () => {
    const aplicacoes = BAGEO_CATALOG.map(p => p.aplicacao);
    expect(aplicacoes).toContain("D1");
    expect(aplicacoes).toContain("D1+D2");
  });
  it("campos de preço são null ou number", () => {
    // Produtos podem ter preço null (aguardando API) ou number (cadastrado)
    for (const p of BAGEO_CATALOG) {
      expect(p.precoOnOff220 === null || typeof p.precoOnOff220 === "number").toBe(true);
      expect(p.precoOnOffBivolt === null || typeof p.precoOnOffBivolt === "number").toBe(true);
      expect(p.precoDim110v === null || typeof p.precoDim110v === "number").toBe(true);
      expect(p.precoDimDali === null || typeof p.precoDimDali === "number").toBe(true);
    }
  });
});
