export type ResolvedLinkQuote = { id: number } | null;

export type SampleLinkPayload = {
  sampleOrderId: number;
  linkedQuoteId: number;
  linkType: "cobrar" | "diluir" | "associar";
  notes?: string;
};

/** Resolve o número e só então cria o vínculo, evitando depender de um cache ou de uma consulta ainda em curso. */
export async function linkSampleOrderByQuoteNumber(input: {
  quoteNumber: string;
  sampleOrderId: number;
  linkType: SampleLinkPayload["linkType"];
  notes?: string;
  resolveQuote: (quoteNumber: string) => Promise<ResolvedLinkQuote>;
  createLink: (payload: SampleLinkPayload) => Promise<unknown>;
}): Promise<unknown> {
  const quoteNumber = input.quoteNumber.trim();
  if (!quoteNumber) throw new Error("Informe o número do orçamento.");
  const target = await input.resolveQuote(quoteNumber);
  if (!target) throw new Error("Orçamento não encontrado. Verifique o número informado.");
  return input.createLink({
    sampleOrderId: input.sampleOrderId,
    linkedQuoteId: target.id,
    linkType: input.linkType,
    notes: input.notes,
  });
}
