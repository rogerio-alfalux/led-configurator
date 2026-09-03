import { describe, expect, it } from "vitest";
import { normalizeFreteForDestination } from "./db";

describe("política de frete interestadual", () => {
  it("converte frete gratuito inválido no RJ em frete a calcular sem valor incluso", () => {
    const result = normalizeFreteForDestination({
      freteType: "free" as const,
      freteIsento: false,
      freteLocalidade: "sp" as const,
      freteValue: 125,
      freteState: "rj",
      destState: "RJ",
      freteIncluded: true,
    });

    expect(result).toMatchObject({
      freteType: "paid",
      freteIsento: false,
      freteLocalidade: "other",
      freteValue: 0,
      freteIncluded: false,
    });
  });

  it("mantém a condição gratuita quando o destino efetivo é SP", () => {
    const result = normalizeFreteForDestination({
      freteType: "free" as const,
      freteIsento: false,
      freteLocalidade: "sp" as const,
      freteValue: 0,
      freteState: "SP",
      freteIncluded: false,
    });

    expect(result).toMatchObject({
      freteType: "free",
      freteIsento: false,
      freteLocalidade: "sp",
      freteValue: 0,
    });
  });

  it("usa o estado de destino como fallback quando a aba frete ainda não foi preenchida", () => {
    const result = normalizeFreteForDestination({
      freteType: "free" as const,
      freteIsento: true,
      freteLocalidade: "sp" as const,
      freteValue: 20,
      destState: "RJ",
      freteIncluded: true,
    });

    expect(result).toMatchObject({
      freteType: "paid",
      freteIsento: false,
      freteLocalidade: "other",
      freteValue: 0,
      freteIncluded: false,
    });
  });
});
