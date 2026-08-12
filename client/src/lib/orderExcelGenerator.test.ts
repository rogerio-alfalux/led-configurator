import { describe, expect, it } from "vitest";
import { buildProfileSkuText } from "./orderExcelGenerator";

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
