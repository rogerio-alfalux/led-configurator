export type ProductDocumentType = "datasheet" | "fotometria" | "desenhoTecnico" | "manualInstalacao";

export interface ProductDocument {
  nome: string;
  mimeType: string;
  url: string;
}

export interface ProductDocuments {
  datasheet: ProductDocument | null;
  fotometria: ProductDocument | null;
  desenhoTecnico: ProductDocument | null;
  manualInstalacao: ProductDocument | null;
}

export interface ProductDocumentSource {
  documentos?: Partial<Record<ProductDocumentType, ProductDocument | null>> | null;
  datasheetUrl?: string | null;
  fotometriaIesUrl?: string | null;
  fotometriaUrl?: string | null;
  iesUrl?: string | null;
  desenhoTecnicoUrl?: string | null;
  manualInstalacaoUrl?: string | null;
  manualUrl?: string | null;
}

const ALFALUX_DOCUMENT_BASE_URL = "https://alfaluxprod-c8zmg2fn.manus.space";

/** Converte caminhos da API em URLs absolutas aceitas pelo proxy seguro de download. */
export function normalizeProductDocumentUrl(value: string): string {
  const url = value.trim();
  if (!url || /^https?:\/\//i.test(url)) return url;
  return `${ALFALUX_DOCUMENT_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
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
    url: normalizeProductDocumentUrl(url),
  };
}

/** Prioriza a seção `documentos` e mantém os aliases de URL apenas como compatibilidade. */
export function normalizeProductDocuments(source: ProductDocumentSource): ProductDocuments {
  return {
    datasheet: normalizeDocument(source.documentos?.datasheet, source.datasheetUrl, "Datasheet.pdf", "application/pdf"),
    fotometria: normalizeDocument(source.documentos?.fotometria, source.fotometriaIesUrl ?? source.fotometriaUrl ?? source.iesUrl, "Fotometria.ies", "application/octet-stream"),
    desenhoTecnico: normalizeDocument(source.documentos?.desenhoTecnico, source.desenhoTecnicoUrl, "Desenho técnico.pdf", "application/pdf"),
    manualInstalacao: normalizeDocument(source.documentos?.manualInstalacao, source.manualInstalacaoUrl ?? source.manualUrl, "Manual de instalação.pdf", "application/pdf"),
  };
}

export function hasProductDocuments(documents: ProductDocuments | null | undefined): boolean {
  return Boolean(documents?.datasheet || documents?.fotometria || documents?.desenhoTecnico || documents?.manualInstalacao);
}
