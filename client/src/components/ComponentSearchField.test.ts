import { describe, expect, it } from "vitest";
import { parseDecimalQuantity } from "./ComponentSearchField";

describe("parseDecimalQuantity", () => {
  it("aceita quantidades decimais digitadas com vírgula", () => {
    expect(parseDecimalQuantity("1,2")).toBe(1.2);
    expect(parseDecimalQuantity("3,4")).toBe(3.4);
  });

  it("mantém a digitação parcial separada de uma quantidade válida", () => {
    expect(parseDecimalQuantity("1,")).toBe(1);
    expect(parseDecimalQuantity("")).toBeNull();
  });
});
