import { describe, expect, it } from "vitest";
import { isCctSelectionAvailable } from "./cctSelection";

describe("isCctSelectionAvailable", () => {
  it("mantém A Definir mesmo quando a API só retorna CCTs específicos", () => {
    expect(isCctSelectionAvailable("A definir", ["2700K", "3000K", "4000K"])).toBe(true);
  });

  it("aceita CCTs presentes no catálogo do produto", () => {
    expect(isCctSelectionAvailable("3500K", ["3000K", "3500K", "4000K"])).toBe(true);
  });

  it("permite o reset apenas para CCTs inexistentes", () => {
    expect(isCctSelectionAvailable("6500K", ["2700K", "3000K"])).toBe(false);
  });
});
