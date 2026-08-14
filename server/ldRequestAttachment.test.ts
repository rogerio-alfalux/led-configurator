import { describe, expect, it } from "vitest";
import { sanitizeLdAttachmentFileName, validateLdTechnicalAttachments } from "./ldRequestAttachment";

describe("anexos técnicos de solicitação LD", () => {
  const attachment = { fileName: "planta da obra.dwg", mimeType: "application/acad", size: 2_048, base64: "ZGF0YQ==" };

  it("aceita DWG e PDF dentro do limite", () => {
    expect(() => validateLdTechnicalAttachments([attachment, { ...attachment, fileName: "caderno.pdf" }])).not.toThrow();
  });

  it("recusa um formato não técnico", () => {
    expect(() => validateLdTechnicalAttachments([{ ...attachment, fileName: "script.exe" }])).toThrow("Formato de anexo");
  });

  it("normaliza o nome armazenado sem alterar sua extensão", () => {
    expect(sanitizeLdAttachmentFileName("planta térreo (revisão).dwg")).toBe("planta_t_rreo__revis_o_.dwg");
  });
});
