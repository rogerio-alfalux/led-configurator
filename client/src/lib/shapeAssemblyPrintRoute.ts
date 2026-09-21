import type { ShapeResult } from "./lCatalog";

export type ShapeAssemblyPrintPayload = Pick<
  ShapeResult,
  "shape" | "assemblyEdges" | "profileName" | "profileCode"
>;

const PRINT_ROUTE = "/guia-montagem/imprimir";

/**
 * Usa navegação nativa em vez de window.open: o navegador trata o guia como
 * uma página normal em nova aba, sem depender de permissões de pop-up.
 */
export function createShapeAssemblyPrintHref(payload: ShapeAssemblyPrintPayload): string {
  return `${PRINT_ROUTE}?data=${encodeURIComponent(JSON.stringify(payload))}`;
}

export function parseShapeAssemblyPrintPayload(search: string): ShapeAssemblyPrintPayload | null {
  try {
    const raw = new URLSearchParams(search).get("data");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ShapeAssemblyPrintPayload>;
    if (
      !parsed ||
      !["L_SHAPE", "U_SHAPE", "SQUARE", "RECTANGLE"].includes(String(parsed.shape)) ||
      !Array.isArray(parsed.assemblyEdges) ||
      typeof parsed.profileName !== "string" ||
      typeof parsed.profileCode !== "string"
    ) return null;
    return parsed as ShapeAssemblyPrintPayload;
  } catch {
    return null;
  }
}
