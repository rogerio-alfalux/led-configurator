export type NonCommercialLinkType = "cobrar" | "diluir" | "associar" | "custo_adicional" | string;

const LINK_TYPE_LABELS: Record<string, string> = {
  cobrar: "Cobrar",
  diluir: "Diluir",
  associar: "Associar",
  custo_adicional: "Custo adicional",
};

/** Usa exclusivamente o número comercial do orçamento, nunca o ID interno da vinculação. */
export function formatLinkedCommercialQuote(number: string | null | undefined, linkType: NonCommercialLinkType): string {
  const commercialNumber = String(number ?? "").trim() || "Número indisponível";
  return `Orç. ${commercialNumber} — ${LINK_TYPE_LABELS[linkType] ?? "Associar"}`;
}
