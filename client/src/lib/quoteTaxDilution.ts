export interface QuoteTaxDilutionInput {
  enabled?: boolean;
  included?: boolean;
  taxableBase: number;
  combinedRatePercent: number;
}

export function calculateCombinedTaxAmount(taxableBase: number, combinedRatePercent: number): number {
  const base = Number.isFinite(taxableBase) ? Math.max(0, taxableBase) : 0;
  const rate = Number.isFinite(combinedRatePercent)
    ? Math.min(Math.max(combinedRatePercent, 0), 99.99)
    : 0;
  if (base <= 0 || rate <= 0) return 0;
  return base / (1 - rate / 100) - base;
}

export function getDifalFcpDilutionAmount(input: QuoteTaxDilutionInput): number {
  if (!input.enabled || !input.included) return 0;
  return calculateCombinedTaxAmount(input.taxableBase, input.combinedRatePercent);
}

export function allocateDilutedAmount(amount: number, lineWeight: number, totalWeight: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (!Number.isFinite(lineWeight) || lineWeight <= 0) return 0;
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) return 0;
  return amount * (lineWeight / totalWeight);
}
