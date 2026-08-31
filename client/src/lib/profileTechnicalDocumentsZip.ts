import JSZip from "jszip";
import { createProductDocumentDownloadUrl } from "./productDocumentDownload";
import type { ProductDocument } from "./productDocuments";
import type { ProfileTechnicalDocuments } from "./profileCompositionDocuments";

export interface ProfileDocumentZipEntry {
  path: string;
  document: ProductDocument;
}

function sanitizePathSegment(value: string, fallback: string): string {
  const normalized = value.trim().replace(/[\\/]/g, "-").replace(/\.\.+/g, ".");
  return normalized || fallback;
}

/**
 * Usa o mesmo conjunto consolidado da tela: DS/IES únicos e um DT por SKU.
 * Arquivos com a mesma origem remota são incluídos apenas uma vez.
 */
export function getProfileTechnicalDocumentsZipEntries(documents: ProfileTechnicalDocuments): ProfileDocumentZipEntry[] {
  const entries: ProfileDocumentZipEntry[] = [];
  const includedUrls = new Set<string>();

  const add = (folder: string, document: ProductDocument | null, sku?: string) => {
    if (!document || includedUrls.has(document.url)) return;
    includedUrls.add(document.url);
    const filename = sanitizePathSegment(document.nome, "documento");
    const path = sku
      ? `${folder}/${sanitizePathSegment(sku, "SKU")}/${filename}`
      : `${folder}/${filename}`;
    entries.push({ path, document });
  };

  add("Datasheet", documents.datasheet);
  add("Fotometria Base", documents.fotometria);
  for (const { sku, document } of documents.desenhosTecnicos) {
    add("Desenhos Tecnicos", document, sku);
  }
  return entries;
}

export function getProfileTechnicalDocumentsZipFilename(): string {
  return "documentos-tecnicos-alfalux.zip";
}

/** Busca os arquivos pelo proxy seguro já utilizado pelos links individuais e monta o ZIP no navegador. */
export async function downloadProfileTechnicalDocumentsZip(
  documents: ProfileTechnicalDocuments,
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  const entries = getProfileTechnicalDocumentsZipEntries(documents);
  if (entries.length === 0) throw new Error("Nenhum documento técnico disponível para baixar.");

  const zip = new JSZip();
  for (const entry of entries) {
    const response = await fetchImpl(createProductDocumentDownloadUrl(entry.document));
    if (!response.ok) throw new Error(`Não foi possível baixar ${entry.document.nome}.`);
    zip.file(entry.path, await response.arrayBuffer());
  }

  const archive = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(archive);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getProfileTechnicalDocumentsZipFilename();
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return entries.length;
}
