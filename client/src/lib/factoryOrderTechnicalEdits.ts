import type { DriverLine } from "./cartTypes";

/** Cria a linha manual de driver persistida pela ficha, com quantidade por luminária. */
export function buildManualDriverLines(
  description: string,
  code: string,
  qtyPerUnit: number,
  itemQty: number,
  previous?: Pick<DriverLine, "driverUnitPrice"> | null,
): DriverLine[] {
  if (!description.trim()) return [];

  return [{
    driverCode: code,
    driverModel: description,
    driverQty: qtyPerUnit * itemQty,
    driverUnitPrice: previous?.driverUnitPrice ?? null,
    driverTotalPrice: null,
    driverManual: true,
  }];
}
