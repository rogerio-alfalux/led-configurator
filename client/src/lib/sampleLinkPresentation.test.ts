import { describe, expect, it } from "vitest";
import { formatLinkedCommercialQuote } from "./sampleLinkPresentation";

describe("sampleLinkPresentation", () => {
  it("exibe o número comercial escolhido pelo usuário, sem usar o ID interno", () => {
    expect(formatLinkedCommercialQuote("33.9996-26", "cobrar")).toBe("Orç. 33.9996-26 — Cobrar");
  });

  it("preserva a indicação correta para manutenção diluída e vínculo simples", () => {
    expect(formatLinkedCommercialQuote("04.0173-26", "diluir")).toBe("Orç. 04.0173-26 — Diluir");
    expect(formatLinkedCommercialQuote("20.0428-26", "associar")).toBe("Orç. 20.0428-26 — Associar");
  });
});
