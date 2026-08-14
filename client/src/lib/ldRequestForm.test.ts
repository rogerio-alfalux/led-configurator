import { describe, expect, it } from "vitest";
import { buildLdRequestPayload } from "./ldRequestForm";

describe("payload da solicitação LD", () => {
  it("preserva contato, localidade e anexos técnicos", () => {
    const payload = buildLdRequestPayload({ officeName: " Ateliê ", finalClientName: " Obra Azul ", constructorName: "", contactName: " Marina ", contactPhone: " 11999999999 ", workState: "rj", workCity: " Niterói ", attachments: [{ fileName: "planta.dwg", mimeType: "application/acad", size: 100, base64: "ZGF0YQ==" }] });
    expect(payload).toMatchObject({ officeName: "Ateliê", finalClientName: "Obra Azul", contactName: "Marina", contactPhone: "11999999999", workState: "RJ", workCity: "Niterói" });
    expect(payload.attachments).toHaveLength(1);
    expect(payload.constructorName).toBeUndefined();
  });
});
