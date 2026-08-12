import { describe, expect, it } from "vitest";
import { buildProfileSkuText } from "./orderPreviewGenerator";

describe("buildProfileSkuText — prévia de ficha técnica", () => {
  it("mostra a quantidade por SKU também para orçamentos históricos", () => {
    const text = buildProfileSkuText({
      sku: "LLP-6060",
      profileSegments: [
        { sku: "LLP-6060.2IF.48F", qty: 2 },
        { sku: "LLP-6060.5ML.48F", qty: 2 },
        { sku: "LLP-6060.3ML.48F", qty: 1 },
      ],
    } as any);

    expect(text).toBe("2 x LLP-6060.2IF.48F<br>2 x LLP-6060.5ML.48F<br>1 x LLP-6060.3ML.48F");
  });
});

