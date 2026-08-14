const MAX_ATTACHMENT_COUNT = 6;
const MAX_ATTACHMENT_SIZE_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 30 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "dwg", "dxf", "zip", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg",
]);

export type LdTechnicalAttachment = {
  fileName: string;
  mimeType: string;
  size: number;
  base64: string;
};

export function validateLdTechnicalAttachments(attachments: LdTechnicalAttachment[]) {
  if (attachments.length > MAX_ATTACHMENT_COUNT) {
    throw new Error(`Envie no máximo ${MAX_ATTACHMENT_COUNT} arquivos técnicos.`);
  }
  let totalSize = 0;
  for (const attachment of attachments) {
    const fileName = attachment.fileName.trim();
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!fileName || !ALLOWED_EXTENSIONS.has(extension)) {
      throw new Error("Formato de anexo não permitido. Envie DWG, PDF ou documento técnico compatível.");
    }
    if (!Number.isInteger(attachment.size) || attachment.size <= 0 || attachment.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new Error("Cada anexo deve ter até 12 MB.");
    }
    totalSize += attachment.size;
  }
  if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
    throw new Error("O total dos anexos deve ter até 30 MB.");
  }
}

export function sanitizeLdAttachmentFileName(fileName: string) {
  return fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "anexo-tecnico";
}
