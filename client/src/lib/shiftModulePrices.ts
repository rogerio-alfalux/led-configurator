/** Converte um preço digitado no padrão brasileiro ou decimal para número. */
export function parseShiftModuleManualPrice(rawValue: string): number | null {
  const raw = rawValue.trim();
  if (!raw) return null;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
