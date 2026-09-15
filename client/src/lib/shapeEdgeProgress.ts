import type { ProfileShape } from "./lCatalog";

export type ShapeEdgeProgress = {
  label: string;
  requestedMm: number;
  achievedMm: number;
  percentage: number;
  withinTolerance: boolean;
};

const labelsByShape: Record<ProfileShape, [string, string]> = {
  STRAIGHT: ["Comprimento", "Comprimento"],
  L_SHAPE: ["Horizontal", "Vertical"],
  SQUARE: ["Cada lado", "Cada lado"],
  RECTANGLE: ["Largura", "Altura"],
  U_SHAPE: ["Base", "Profundidade"],
};

/**
 * Compara cada aresta geométrica com sua própria meta. O comprimento total de
 * material nunca é usado como alvo de atingimento.
 */
export function getShapeEdgeProgress(
  shape: Exclude<ProfileShape, "STRAIGHT">,
  achieved: [number, number],
  requested?: [number, number],
): ShapeEdgeProgress[] {
  if (!requested) return [];
  const labels = labelsByShape[shape];
  const indexes = shape === "SQUARE" ? [0] : [0, 1];

  return indexes.map((index) => {
    const requestedMm = Math.max(0, Number(requested[index]) || 0);
    const achievedMm = Math.max(0, Number(achieved[index]) || 0);
    const percentage = requestedMm > 0 ? Math.round((achievedMm / requestedMm) * 100) : 0;
    const deviationRate = requestedMm > 0 ? Math.abs(achievedMm - requestedMm) / requestedMm : 1;
    return {
      label: labels[index],
      requestedMm,
      achievedMm,
      percentage,
      withinTolerance: requestedMm > 0 && deviationRate <= 0.05,
    };
  });
}
