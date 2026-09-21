import { describe, expect, it } from "vitest";
import { createShapeAssemblyPrintHref, parseShapeAssemblyPrintPayload } from "./shapeAssemblyPrintRoute";

const payload = {
  shape: "RECTANGLE" as const,
  profileName: "BLAZE H",
  profileCode: "LLP-6060",
  assemblyEdges: [{
    id: "superior",
    label: "Superior",
    requestedLength: 4600,
    achievedLength: 4590,
    modules: [{ type: "ML" as const, sku: "LLP-6060.3ML.48F", length: 1695, bars: 3 }],
  }],
};

describe("rota nativa de impressão do guia", () => {
  it("serializa o guia em um link de nova aba e o recupera sem perda", () => {
    const href = createShapeAssemblyPrintHref(payload);
    expect(href.startsWith("/guia-montagem/imprimir?data=")).toBe(true);
    const query = href.slice(href.indexOf("?"));
    expect(parseShapeAssemblyPrintPayload(query)).toEqual(payload);
  });

  it("rejeita payload ausente ou inválido", () => {
    expect(parseShapeAssemblyPrintPayload("")).toBeNull();
    expect(parseShapeAssemblyPrintPayload("?data=not-json")).toBeNull();
    expect(parseShapeAssemblyPrintPayload(`?data=${encodeURIComponent(JSON.stringify({ shape: "STRAIGHT", assemblyEdges: [] }))}`)).toBeNull();
  });
});
