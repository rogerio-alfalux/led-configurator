import type { CartItemData } from "./cartTypes";

export type LinkedSampleCommercialAdjustment = {
  linkId: number;
  linkType: "cobrar" | "diluir" | "associar";
  sourceQuoteNumber: string;
  amount: number | string | null;
  productDescriptions: string[];
};

type ProjectionInput = {
  links: LinkedSampleCommercialAdjustment[];
  rtPercent?: number | null;
  marginPercent?: number | null;
  discountPercent?: number | null;
};

const clampPercent = (value?: number | null) => Math.min(Math.max(Number(value) || 0, 0), 0.99);
const asAmount = (value: number | string | null) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

/** Converte um valor final fixo no valor-base necessário para que o markup do destino não o altere. */
export function sampleChargeBaseAmount(finalAmount: number, input: Omit<ProjectionInput, "links">): number {
  const rt = clampPercent(input.rtPercent);
  const margin = clampPercent(input.marginPercent);
  const discount = clampPercent(input.discountPercent);
  return finalAmount * (1 - rt) * (1 - margin) / (1 - discount);
}

/** Separa vínculos em cobrança explícita e diluição invisível no orçamento comercial de destino. */
export function buildSampleCommercialProjection(input: ProjectionInput) {
  const chargeItems: CartItemData[] = [];
  let dilutionBaseAmount = 0;
  let dilutionFinalAmount = 0;

  for (const link of input.links) {
    const finalAmount = asAmount(link.amount);
    if (finalAmount <= 0 || link.linkType === "associar") continue;
    const baseAmount = sampleChargeBaseAmount(finalAmount, input);
    if (link.linkType === "diluir") {
      dilutionBaseAmount += baseAmount;
      dilutionFinalAmount += finalAmount;
      continue;
    }
    const products = link.productDescriptions.filter(Boolean).join(" + ");
    chargeItems.push({
      category: "Amostra cobrada",
      sku: "AMOSTRA",
      description: products
        ? `AMOSTRA JÁ ENTREGUE — ${products}`
        : `AMOSTRA JÁ ENTREGUE — ORÇAMENTO ${link.sourceQuoteNumber}`,
      qty: 1,
      unitPrice: baseAmount,
      totalPrice: baseAmount,
      photoUrl: null,
      itemObs: `Amostra fornecida anteriormente no orçamento ${link.sourceQuoteNumber}. Não gerar ficha de produção.`,
      itemObsShowInExcel: true,
      isCommercialSampleCharge: true,
      sampleChargeFinalAmount: finalAmount,
      sampleSourceQuoteNumber: link.sourceQuoteNumber,
    });
  }

  return { chargeItems, dilutionBaseAmount, dilutionFinalAmount };
}
