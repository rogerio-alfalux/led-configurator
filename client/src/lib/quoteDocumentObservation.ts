/** Acrescenta a observação geral editada ao texto padrão de documentos comerciais. */
export function appendQuoteGeneralObservation(baseObservation: string, notes?: string | null): string {
  const normalizedNotes = notes?.trim();
  return normalizedNotes ? `${baseObservation} · ${normalizedNotes}` : baseObservation;
}
