import { describe, expect, it } from "vitest";
import { hydrateFactoryOrderItemData } from "../shared/factoryOrderItemHydration";

describe("hydrateFactoryOrderItemData", () => {
  it("copia a observação por item do orçamento para a ficha quando ela ainda não foi preenchida", () => {
    const hydrated = JSON.parse(hydrateFactoryOrderItemData(JSON.stringify({
      description: "Luminária de teste",
      itemObs: "Confirmar acabamento de cor",
    })));

    expect(hydrated.productionObservation).toBe("Confirmar acabamento de cor");
  });

  it("preserva uma observação técnica já editada na ficha", () => {
    const hydrated = JSON.parse(hydrateFactoryOrderItemData(JSON.stringify({
      itemObs: "Observação comercial",
      productionObservation: "Montar com cabo de 2 metros",
    })));

    expect(hydrated.productionObservation).toBe("Montar com cabo de 2 metros");
  });
});
