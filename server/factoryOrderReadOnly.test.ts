import { describe, expect, it } from "vitest";
import { isFactoryOrderReadOnlyForQuoteStatus } from "../shared/factoryOrderReadOnly";

describe("isFactoryOrderReadOnlyForQuoteStatus", () => {
  it("preserva pedido de fábrica faturado para consulta sem permitir alterações", () => {
    expect(isFactoryOrderReadOnlyForQuoteStatus("invoiced")).toBe(true);
  });

  it("não bloqueia os estados produtivos que permanecem editáveis", () => {
    expect(isFactoryOrderReadOnlyForQuoteStatus("approved")).toBe(false);
    expect(isFactoryOrderReadOnlyForQuoteStatus("open")).toBe(false);
    expect(isFactoryOrderReadOnlyForQuoteStatus(null)).toBe(false);
  });
});
