import { describe, expect, it } from "vitest";
import { formatProfileSkuLines } from "./profileSkuFormatter";

describe("formatProfileSkuLines", () => {
  it("consolida quantidades de SKU da composição atual", () => {
    expect(formatProfileSkuLines([
      { sku: "LLP-6060.2IF.48F", qty: 2 },
      { sku: "LLP-6060.5ML.48F", qty: 2 },
      { sku: "LLP-6060.3ML.48F", qty: 1 },
    ])).toEqual([
      "2 x LLP-6060.2IF.48F",
      "2 x LLP-6060.5ML.48F",
      "1 x LLP-6060.3ML.48F",
    ]);
  });

  it("trata segmentos históricos sem qty como uma unidade", () => {
    expect(formatProfileSkuLines([
      { sku: "LLP-6060.2IF.48F" },
      { sku: "LLP-6060.2IF.48F" },
      { sku: "LLP-6060.5ML.48F" },
    ])).toEqual(["2 x LLP-6060.2IF.48F", "1 x LLP-6060.5ML.48F"]);
  });
});
