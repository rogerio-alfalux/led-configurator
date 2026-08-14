import { calculateDifal, getStateInfo } from "../client/src/lib/difalTable";

export type LdQuoteConversionSource = {
  officeName: string;
  finalClientName: string;
  constructorName?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  guestName: string;
  guestEmail?: string | null;
  workState?: string | null;
  workCity?: string | null;
};

export function buildLdQuoteConversion(source: LdQuoteConversionSource, totalAmount: number) {
  const state = source.workState?.trim().toUpperCase() ?? "";
  const city = source.workCity?.trim() ?? "";
  const fiscalInfo = getStateInfo(state);
  const fiscal = calculateDifal(totalAmount, state);
  const isSpCapital = state === "SP" && city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === "sao paulo";
  // Frete: se fora de SP, tipo "A Calcular" (consult)
  const freteType: "free" | "paid" | "night" | "consult" | "pickup" | undefined = state && state !== "SP" ? "consult" : undefined;
  return {
    clientName: source.officeName,
    projectName: source.finalClientName,
    clientContact: source.contactName ?? source.guestName,
    clientPhone: source.contactPhone ?? undefined,
    clientEmail: source.guestEmail ?? undefined,
    lightDesigner: source.contactName ?? source.guestName,
    freteType,
    freteState: state || undefined,
    freteCity: city || undefined,
    freteLocalidade: isSpCapital ? "sp" as const : "other" as const,
    destState: state || undefined,
    difalEnabled: Boolean(fiscalInfo?.difal),
    difalPercent: fiscalInfo?.difal ?? 0,
    difalValue: fiscal.difalValue,
    fcpEnabled: Boolean(fiscalInfo?.fcp),
    fcpPercent: fiscalInfo?.fcp ?? 0,
    fcpValue: fiscal.fcpValue,
    totalFinal: fiscal.totalWithTax,
    notes: `Solicitação LD Convidado\nEscritório: ${source.officeName}\nCliente final: ${source.finalClientName}${source.constructorName ? `\nConstrutora: ${source.constructorName}` : ""}\nObra: ${city}/${state}\nContato: ${source.contactName ?? source.guestName}${source.contactPhone ? ` · ${source.contactPhone}` : ""}${source.guestEmail ? ` · ${source.guestEmail}` : ""}`,
  };
}
