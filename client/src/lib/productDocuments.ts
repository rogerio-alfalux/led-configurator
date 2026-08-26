export type ProductDocumentType = "datasheet" | "fotometria" | "desenhoTecnico";

export interface ProductDocument {
  nome: string;
  mimeType: string;
  url: string;
}

export interface ProductDocuments {
  datasheet: ProductDocument | null;
  fotometria: ProductDocument | null;
  desenhoTecnico: ProductDocument | null;
}

export interface ProductDocumentSource {
  documentos?: Partial<Record<ProductDocumentType, ProductDocument | null>> | null;
  datasheetUrl?: string | null;
  fotometriaIesUrl?: string | null;
  desenhoTecnicoUrl?: string | null;
}

function normalizeDocument(
  document: ProductDocument | null | undefined,
  fallbackUrl: string | null | undefined,
  fallbackName: string,
  fallbackMimeType: string,
): ProductDocument | null {
  const url = document?.url?.trim() || fallbackUrl?.trim();
  if (!url) return null;
  return {
    nome: document?.nome?.trim() || fallbackName,
    mimeType: document?.mimeType?.trim() || fallbackMimeType,
    url,
  };
}

/** Prioriza a seção `documentos` e mantém os aliases de URL apenas como compatibilidade. */
export function normalizeProductDocuments(source: ProductDocumentSource): ProductDocuments {
  return {
    datasheet: normalizeDocument(source.documentos?.datasheet, source.datasheetUrl, "Datasheet.pdf", "application/pdf"),
    fotometria: normalizeDocument(source.documentos?.fotometria, source.fotometriaIesUrl, "Fotometria.ies", "application/octet-stream"),
    desenhoTecnico: normalizeDocument(source.documentos?.desenhoTecnico, source.desenhoTecnicoUrl, "Desenho técnico.pdf", "application/pdf"),
  };
}

export function hasProductDocuments(documents: ProductDocuments | null | undefined): boolean {
  return Boolean(documents?.datasheet || documents?.fotometria || documents?.desenhoTecnico);
}
