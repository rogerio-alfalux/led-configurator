import { describe, expect, it } from "vitest";
import { deriveDriverQuantityPerUnit, selectDriverVariantByDescription } from "./driverRehydration";

describe("reidratação de drivers", () => {
  it("recupera um driver por luminária de uma linha totalizada", () => {
    expect(deriveDriverQuantityPerUnit([{ driverQty: 15 }], 15)).toBe(1);
  });

  it("soma várias linhas de driver antes de calcular a quantidade por luminária", () => {
    expect(deriveDriverQuantityPerUnit([{ driverQty: 30 }, { driverQty: 15 }], 15)).toBe(3);
  });

  it("escolhe a variante correta quando a API reutiliza o SKU", () => {
    const variant = selectDriverVariantByDescription([
      { name: "FOCO M 50L RE 6.5W 36°", driverCode: "EQ00236" },
      { name: "FOCO M 50L RE 4.5W 36°", driverCode: "EQ00775" },
    ], "FOCO M 50L RE 4.5W 36° 3000K ON/OFF 220V");
    expect(variant?.driverCode).toBe("EQ00775");
  });
});
