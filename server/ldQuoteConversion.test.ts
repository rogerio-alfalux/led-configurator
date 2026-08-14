import { describe, expect, it } from "vitest";
import { buildLdQuoteConversion } from "./ldQuoteConversion";

describe("conversão de solicitação LD em orçamento", () => {
  it("preserva Obra, Cliente, contato, e-mail e cálculo fiscal da localidade", () => {
    const result = buildLdQuoteConversion({
      officeName: "Ateliê Norte", finalClientName: "Residência Aurora", contactName: "Marina", contactPhone: "11999999999", guestName: "Login LD", guestEmail: "marina@atelie.com", workState: "RJ", workCity: "Niterói",
    }, 1_000);
    expect(result.clientName).toBe("Ateliê Norte");
    expect(result.projectName).toBe("Residência Aurora");
    expect(result.clientContact).toBe("Marina");
    expect(result.clientEmail).toBe("marina@atelie.com");
    expect(result.difalEnabled).toBe(true);
    expect(result.fcpEnabled).toBe(true);
    expect(result.totalFinal).toBeGreaterThan(1_000);
  });
});
