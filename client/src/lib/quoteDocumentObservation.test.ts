import { describe, expect, it } from "vitest";
import { appendQuoteGeneralObservation } from "./quoteDocumentObservation";

describe("appendQuoteGeneralObservation", () => {
  it("mantém o texto padrão quando não há observação geral", () => {
    expect(appendQuoteGeneralObservation("Texto padrão", "   ")).toBe("Texto padrão");
  });

  it("acrescenta a observação geral preenchida no orçamento", () => {
    expect(appendQuoteGeneralObservation("Texto padrão", "Entregar em horário agendado"))
      .toBe("Texto padrão · Entregar em horário agendado");
  });
});
