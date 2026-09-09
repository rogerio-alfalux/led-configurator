import {
  hasProductDocuments,
  normalizeProductDocuments,
  type ProductDocument,
  type ProductDocumentSource,
} from "./productDocuments";

export interface ProfileDocumentProduct extends ProductDocumentSource {
  sku: string;
  familia?: string | null;
  instalacao?: string | null;
  name?: string | null;
  potencia?: string | number | null;
}

export interface ProfileDocumentContext {
  profileCode?: string | null;
  familia?: string | null;
  instalacao?: string | null;
  potencia?: string | number | null;
}

export interface ProfileTechnicalDocuments {
  datasheet: ProductDocument | null;
  fotometria: ProductDocument | null;
  manualInstalacao: ProductDocument | null;
  desenhosTecnicos: Array<{ sku: string; document: ProductDocument }>;
}

const normalizeSku = (sku: string) => sku.trim().toLocaleUpperCase("pt-BR");
const normalizeText = (value: string | null | undefined) => String(value ?? "").trim().toLocaleUpperCase("pt-BR");

function hasExpectedPower(product: ProfileDocumentProduct, expectedPower: string | number | null | undefined): boolean {
  if (expectedPower == null || expectedPower === "") return true;
  const expected = String(expectedPower).replace(/\s*W$/i, "").trim();
  if (!expected) return true;
  if (String(product.potencia ?? "").replace(/\s*W$/i, "").trim() === expected) return true;
  return new RegExp(`\\b${expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*W\\b`, "i").test(product.name ?? "");
}

function isCompatibleProfileVariant(product: ProfileDocumentProduct, context: ProfileDocumentContext | undefined): boolean {
  if (!context) return true;
  const profileCode = normalizeSku(context.profileCode ?? "");
  const family = normalizeText(context.familia);
  const installation = normalizeText(context.instalacao);
  const sameProfileCode = Boolean(profileCode) && (
    normalizeSku(product.sku) === profileCode || normalizeSku(product.sku).startsWith(`${profileCode}.`)
  );
  const sameFamily = !family || normalizeText(product.familia) === family;
  return (profileCode ? sameProfileCode : sameFamily)
    && (!installation || normalizeText(product.instalacao) === installation)
    && hasExpectedPower(product, context.potencia);
}

/**
 * Consolida os anexos de uma composição usando exclusivamente os documentos da
 * API. DS e IES são únicos para a composição; DT é mantido uma vez por SKU.
 */
export function getProfileTechnicalDocuments(
  products: readonly ProfileDocumentProduct[] | null | undefined,
  compositionSkus: readonly string[],
  context?: ProfileDocumentContext,
): ProfileTechnicalDocuments {
  const availableProducts = products ?? [];
  const skus = Array.from(new Set(
    compositionSkus.map(normalizeSku).filter(Boolean),
  ));

  let datasheet: ProductDocument | null = null;
  let fotometria: ProductDocument | null = null;
  let manualInstalacao: ProductDocument | null = null;
  const desenhosTecnicos: ProfileTechnicalDocuments["desenhosTecnicos"] = [];

  for (const sku of skus) {
    const productsForSku = availableProducts.filter((product) => normalizeSku(product.sku) === sku);
    const compatibleProducts = productsForSku.filter((product) => isCompatibleProfileVariant(product, context));
    // O SKU pode ser compartilhado por versões de potência diferentes. A versão
    // compatível tem precedência, mas o desenho técnico comum continua elegível.
    const candidates = compatibleProducts.length > 0 ? compatibleProducts : productsForSku;

    for (const product of candidates) {
      const documents = normalizeProductDocuments(product);
      if (!hasProductDocuments(documents)) continue;

      datasheet ??= documents.datasheet;
      fotometria ??= documents.fotometria;
      manualInstalacao ??= documents.manualInstalacao;
      if (documents.desenhoTecnico && !desenhosTecnicos.some((entry) => entry.sku === sku)) {
        desenhosTecnicos.push({ sku, document: documents.desenhoTecnico });
      }
    }
  }

  // Datasheet, IES e manual são publicados uma vez por família/configuração em
  // diversos cadastros. Quando o SKU calculado contém apenas o desenho, procurar
  // o anexo na variante compatível sem associar documentos de outra potência.
  if (!datasheet || !fotometria || !manualInstalacao) {
    for (const product of availableProducts.filter((candidate) => isCompatibleProfileVariant(candidate, context))) {
      const documents = normalizeProductDocuments(product);
      datasheet ??= documents.datasheet;
      fotometria ??= documents.fotometria;
      manualInstalacao ??= documents.manualInstalacao;
      if (datasheet && fotometria && manualInstalacao) break;
    }
  }

  return { datasheet, fotometria, manualInstalacao, desenhosTecnicos };
}

export function hasProfileTechnicalDocuments(documents: ProfileTechnicalDocuments): boolean {
  return Boolean(documents.datasheet || documents.fotometria || documents.manualInstalacao || documents.desenhosTecnicos.length > 0);
}
