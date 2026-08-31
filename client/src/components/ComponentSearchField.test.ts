import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
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

  it("mantém a quantidade local durante a digitação e confirma no blur", async () => {
    const source = await readFile(new URL("./ComponentSearchField.tsx", import.meta.url), "utf8");
    const inputBlock = source.slice(
      source.indexOf("{/* Campo de quantidade */"),
      source.indexOf("{/* Campo de descrição com autocomplete */"),
    );
    expect(source).toContain("const commitQuantity = () =>");
    expect(source).toContain("onQtyChange(parsed)");
    expect(inputBlock).toContain("setQtyDraft(next)");
    expect(inputBlock).toContain("onBlur={commitQuantity}");
    expect(inputBlock).not.toContain("onQtyChange(parsed)");
  });
});
