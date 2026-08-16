import { describe, expect, it } from "vitest";
import { buildLdRequestPayload } from "./ldRequestForm";

describe("payload da solicitação LD", () => {
  it("preserva contato, localidade, observações, prazos e anexos técnicos", () => {
    const payload = buildLdRequestPayload({ officeName: " Ateliê ", finalClientName: " Obra Azul ", constructorName: "", contactName: " Marina ", contactPhone: " 11999999999 ", workState: "rj", workCity: " Niterói ", generalObservation: " Priorizar a sala principal ", desiredQuoteDate: "2026-08-30", estimatedDeliveryDate: "2026-10-15", attachments: [{ fileName: "planta.dwg", mimeType: "application/acad", size: 100, base64: "ZGF0YQ==" }] });
    expect(payload).toMatchObject({ officeName: "Ateliê", finalClientName: "Obra Azul", contactName: "Marina", contactPhone: "11999999999", workState: "RJ", workCity: "Niterói" });
    expect(payload.attachments).toHaveLength(1);
    expect(payload.constructorName).toBeUndefined();
    expect(payload.generalObservation).toBe("Priorizar a sala principal");
    expect(payload.desiredQuoteDate).toBe("2026-08-30");
    expect(payload.estimatedDeliveryDate).toBe("2026-10-15");
  });
});
