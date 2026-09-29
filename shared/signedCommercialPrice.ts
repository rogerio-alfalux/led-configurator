/**
 * Regras compartilhadas para valores comerciais que podem representar devoluções.
 * Campos vazios continuam significando preço não definido; zero é preço definido.
 */
export const NEGATIVE_PRICE_FIELDS = [
  "unitPrice",
  "totalPrice",
  "unitPriceLuminaria",
  "priceWithoutDriver",
  "unitPriceDriver",
  "specialUnitPrice",
] as const;

export function toFiniteCommercialNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isNegativeCommercialPrice(value: unknown): boolean {
  const parsed = toFiniteCommercialNumber(value);
  return parsed !== null && parsed < 0;
}

/** Detecta somente campos comerciais permitidos; custos, quantidades, taxas e frete não participam. */
export function hasNegativeCommercialPrice(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const record = item as Record<string, unknown>;

  if (NEGATIVE_PRICE_FIELDS.some(field => isNegativeCommercialPrice(record[field]))) return true;

  const drivers = Array.isArray(record.driverLines) ? record.driverLines : [];
  if (drivers.some(driver => driver && typeof driver === "object" && (
    isNegativeCommercialPrice((driver as Record<string, unknown>).driverUnitPrice)
    || isNegativeCommercialPrice((driver as Record<string, unknown>).driverTotalPrice)
  ))) return true;

  const accessories = Array.isArray(record.accessories) ? record.accessories : [];
  return accessories.some(accessory => accessory && typeof accessory === "object"
    && isNegativeCommercialPrice((accessory as Record<string, unknown>).unitPrice));
}

/**
 * Marca valores negativos recebidos por um fluxo autorizado para que normalizadores
 * legados não os confundam com snapshots antigos corrompidos.
 */
export function markIntentionalNegativeCommercialPrices<T extends Record<string, unknown>>(item: T): T {
  const next: Record<string, unknown> = { ...item };
  if (NEGATIVE_PRICE_FIELDS.some(field => isNegativeCommercialPrice(next[field]))) {
    next.negativePriceManual = true;
  }

  if (Array.isArray(next.driverLines)) {
    next.driverLines = next.driverLines.map((driver) => {
      if (!driver || typeof driver !== "object") return driver;
      const line = { ...(driver as Record<string, unknown>) };
      if (isNegativeCommercialPrice(line.driverUnitPrice) || isNegativeCommercialPrice(line.driverTotalPrice)) {
        line.negativePriceManual = true;
        line.driverPriceManual = true;
      }
      return line;
    });
  }

  if (Array.isArray(next.accessories)) {
    next.accessories = next.accessories.map((accessory) => {
      if (!accessory || typeof accessory !== "object") return accessory;
      const line = { ...(accessory as Record<string, unknown>) };
      if (isNegativeCommercialPrice(line.unitPrice)) line.negativePriceManual = true;
      return line;
    });
  }

  return next as T;
}
