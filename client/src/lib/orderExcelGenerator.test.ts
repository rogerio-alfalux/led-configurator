import { describe, expect, it } from "vitest";
import { addBusinessDays, buildProfileSkuText } from "./orderExcelGenerator";

describe("buildProfileSkuText", () => {
  it("informa a quantidade de cada SKU da composição na ficha de produção", () => {
    const text = buildProfileSkuText({
      sku: "LLP-6060",
      profileSegments: [
        { sku: "LLP-6060.2IF.48F", qty: 2 },
        { sku: "LLP-6060.5ML.48F", qty: 4 },
        { sku: "LLP-6060.2IF.48F", qty: 1 },
      ],
    } as any);

    expect(text).toBe("3 x LLP-6060.2IF.48F\n4 x LLP-6060.5ML.48F");
  });

  it("mantém o SKU simples quando não há composição de perfil", () => {
    expect(buildProfileSkuText({ sku: "LDE-7035", profileSegments: [] } as any)).toBe("LDE-7035");
  });

  it("assume uma unidade por segmento em composições históricas sem qty", () => {
    const text = buildProfileSkuText({
      sku: "LLP-6060",
      profileSegments: [
        { sku: "LLP-6060.2IF.48F" },
        { sku: "LLP-6060.2IF.48F" },
        { sku: "LLP-6060.5ML.48F" },
      ],
    } as any);

    expect(text).toBe("2 x LLP-6060.2IF.48F\n1 x LLP-6060.5ML.48F");
  });
});

describe("addBusinessDays", () => {
  it("conta integralmente o prazo informado e ignora sábados e domingos", () => {
    const start = new Date("2026-08-07T12:00:00-03:00"); // sexta-feira
    const delivery = addBusinessDays(start, 20);

    // 20º dia útil após sexta, 07/08/2026, é sexta, 04/09/2026.
    expect(delivery.toISOString().slice(0, 10)).toBe("2026-09-04");
  });

  it("ignora feriados informados além dos fins de semana", () => {
    const start = new Date("2026-08-06T12:00:00-03:00"); // quinta-feira
    const holidays = new Set(["2026-08-07"]); // sexta-feira
    const delivery = addBusinessDays(start, 1, holidays);

    // Sexta é feriado e o fim de semana é ignorado: próximo dia útil é segunda.
    expect(delivery.toISOString().slice(0, 10)).toBe("2026-08-10");
  });
});
