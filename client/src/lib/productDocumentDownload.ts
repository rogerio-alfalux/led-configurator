import type { ProductDocument } from "./productDocuments";

export function createProductDocumentDownloadUrl(document: ProductDocument): string {
  const params = new URLSearchParams({
    url: document.url,
    filename: document.nome,
  });
  return `/api/product-document-download?${params.toString()}`;
}
