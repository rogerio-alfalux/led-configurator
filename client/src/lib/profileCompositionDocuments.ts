import {
  hasProductDocuments,
  normalizeProductDocuments,
  type ProductDocument,
  type ProductDocumentSource,
} from "./productDocuments";

export interface ProfileDocumentProduct extends ProductDocumentSource {
  sku: string;
}

export interface ProfileTechnicalDocuments {
  datasheet: ProductDocument | null;
  fotometria: ProductDocument | null;
  manualInstalacao: ProductDocument | null;
  desenhosTecnicos: Array<{ sku: string; document: ProductDocument }>;
}

const normalizeSku = (sku: string) => sku.trim().toLocaleUpperCase("pt-BR");

/**
 * Consolida os anexos de uma composição usando exclusivamente os documentos da
 * API. DS e IES são únicos para a composição; DT é mantido uma vez por SKU.
 */
export function getProfileTechnicalDocuments(
  products: readonly ProfileDocumentProduct[] | null | undefined,
  compositionSkus: readonly string[],
): ProfileTechnicalDocuments {
  const productsBySku = new Map(
    (products ?? []).map((product) => [normalizeSku(product.sku), product]),
  );
  const skus = Array.from(new Set(
    compositionSkus.map(normalizeSku).filter(Boolean),
  ));

  let datasheet: ProductDocument | null = null;
  let fotometria: ProductDocument | null = null;
  let manualInstalacao: ProductDocument | null = null;
  const desenhosTecnicos: ProfileTechnicalDocuments["desenhosTecnicos"] = [];

  for (const sku of skus) {
    const product = productsBySku.get(sku);
    if (!product) continue;

    const documents = normalizeProductDocuments(product);
    if (!hasProductDocuments(documents)) continue;

    datasheet ??= documents.datasheet;
    fotometria ??= documents.fotometria;
    manualInstalacao ??= documents.manualInstalacao;
    if (documents.desenhoTecnico) {
      desenhosTecnicos.push({ sku, document: documents.desenhoTecnico });
    }
  }

  return { datasheet, fotometria, manualInstalacao, desenhosTecnicos };
}

export function hasProfileTechnicalDocuments(documents: ProfileTechnicalDocuments): boolean {
  return Boolean(documents.datasheet || documents.fotometria || documents.manualInstalacao || documents.desenhosTecnicos.length > 0);
}
