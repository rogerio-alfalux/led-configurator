import type { CartItemData } from "./cartTypes";
import type { ShapeAssemblyEdge, ShapeAssemblyModule, ShapeResult } from "./lCatalog";

export type ShapeAssemblySnapshot = Pick<
  CartItemData,
  "profileShape" | "shapeAssemblyEdges" | "description" | "sku" | "itemEmPlanta" | "assemblyItemNumber" | "qty"
>;

export interface ShapeAssemblyDocumentEntry {
  itemNumber: number;
  item: ShapeAssemblySnapshot;
  shape: NonNullable<ShapeAssemblySnapshot["profileShape"]>;
  edges: ShapeAssemblyEdge[];
  title: string;
  reference: string;
}

export const SHAPE_LABELS: Record<Exclude<ShapeResult["shape"], "STRAIGHT">, string> = {
  L_SHAPE: "Formato L",
  U_SHAPE: "Formato U",
  SQUARE: "Formato quadrado",
  RECTANGLE: "Formato retangular",
};

export const ASSEMBLY_TYPE_LABELS: Record<ShapeAssemblyModule["type"], string> = {
  CORNER: "Canto 1L1",
  IF: "Acabamento IF",
  ML: "Módulo ML",
};

export function getShapeAssemblyDocumentEntries(items: CartItemData[]): ShapeAssemblyDocumentEntry[] {
  return items.flatMap((item, index) => {
    const shape = item.profileShape;
    const edges = item.shapeAssemblyEdges;
    if (!shape || !edges || edges.length === 0) return [];
    return [{
      itemNumber: item.assemblyItemNumber != null ? Number(item.assemblyItemNumber) : index + 1,
      item,
      shape,
      edges,
      title: item.description || item.sku || `Item ${index + 1}`,
      reference: item.itemEmPlanta?.trim() || `Item ${index + 1}`,
    }];
  });
}

export function getShapeAssemblyDirection(shape: ShapeAssemblyDocumentEntry["shape"]): string {
  switch (shape) {
    case "L_SHAPE":
      return "Siga primeiro a aresta Vertical e depois a Horizontal, conforme o desenho.";
    case "U_SHAPE":
      return "Siga Esquerda → Base → Direita, conforme o desenho.";
    case "SQUARE":
    case "RECTANGLE":
      return "Siga Superior → Direita → Inferior → Esquerda, no sentido horário.";
  }
}

export function getAssemblyModuleLine(module: ShapeAssemblyModule, position: number): string {
  const bars = Number.isInteger(module.bars) ? String(module.bars) : module.bars.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${position}. ${ASSEMBLY_TYPE_LABELS[module.type]} — ${module.sku} — ${module.length} mm — ${bars} barra${module.bars === 1 ? "" : "s"}`;
}

export function getAssemblyEdgeSequence(edge: ShapeAssemblyEdge): string {
  return edge.modules.map((module, index) => getAssemblyModuleLine(module, index + 1)).join("\n");
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function topologyHtml(shape: ShapeAssemblyDocumentEntry["shape"]): string {
  if (shape === "L_SHAPE") {
    return `<svg viewBox="0 0 360 150" role="img" aria-label="Esquema do formato L"><path d="M65 24 V118 H300" fill="none" stroke="#1f3864" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><text x="6" y="75">Vertical</text><text x="180" y="145">Horizontal</text></svg>`;
  }
  if (shape === "U_SHAPE") {
    return `<svg viewBox="0 0 360 170" role="img" aria-label="Esquema do formato U"><path d="M52 24 V135 H308 V24" fill="none" stroke="#1f3864" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><text x="2" y="82">Esquerda</text><text x="165" y="162">Base</text><text x="286" y="82">Direita</text></svg>`;
  }
  const height = shape === "SQUARE" ? 122 : 92;
  return `<svg viewBox="0 0 380 170" role="img" aria-label="Esquema do formato fechado"><rect x="80" y="28" width="220" height="${height}" rx="4" fill="none" stroke="#1f3864" stroke-width="12"/><text x="166" y="18">Superior</text><text x="166" y="${height + 162 > 170 ? 165 : height + 52}">Inferior</text><text x="4" y="88">Esquerda</text><text x="305" y="88">Direita</text></svg>`;
}

/**
 * Página independente, preparada para visualização e impressão dentro da ficha.
 * Cada item especial ocupa uma folha separada, sem depender de rolagem horizontal.
 */
export function buildShapeAssemblyGuideHtml(items: CartItemData[]): string {
  const entries = getShapeAssemblyDocumentEntries(items);
  if (entries.length === 0) return "";

  return entries.map(entry => {
    const achievedDimensions = entry.edges.slice(0, 2).map(edge => edge.achievedLength).filter(value => Number.isFinite(value));
    const dimensionLabel = achievedDimensions.length >= 2
      ? `${SHAPE_LABELS[entry.shape]} ${achievedDimensions[0].toLocaleString("pt-BR")} mm × ${achievedDimensions[1].toLocaleString("pt-BR")} mm`
      : SHAPE_LABELS[entry.shape];
    const itemLabel = `Item ${entry.itemNumber}`;
    const plantaLabel = entry.item.itemEmPlanta?.trim() ? `Item em planta: ${entry.item.itemEmPlanta.trim()}` : "";
    const edgeRows = entry.edges.map((edge, edgeIndex) => `
      <section class="assembly-edge">
        <div class="assembly-edge-title">
          <strong>${edgeIndex + 1}. ${escapeHtml(edge.label)}</strong>
          <span>Meta ${edge.requestedLength} mm · Atingido ${edge.achievedLength} mm</span>
        </div>
        <ol class="assembly-modules">
          ${edge.modules.map((module, moduleIndex) => `
            <li class="assembly-module assembly-${module.type.toLowerCase()}">
              <span class="assembly-position">${moduleIndex + 1}</span>
              <span class="assembly-type">${escapeHtml(ASSEMBLY_TYPE_LABELS[module.type])}</span>
              <strong>${escapeHtml(module.sku)}</strong>
              <span>${module.length} mm · ${Number.isInteger(module.bars) ? module.bars : module.bars.toFixed(1)} barra${module.bars === 1 ? "" : "s"}</span>
            </li>`).join("")}
        </ol>
      </section>`).join("");

    return `
      <section class="assembly-sheet">
        <header class="assembly-header">
          <p>INSTRUÇÃO DE MONTAGEM</p>
          <h2>${escapeHtml(entry.title)}</h2>
          <div class="assembly-header-details"><strong>${escapeHtml(dimensionLabel)}</strong><span>${escapeHtml(itemLabel)}${plantaLabel ? ` · ${escapeHtml(plantaLabel)}` : ""}</span></div>
        </header>
        <div class="assembly-layout">
          <div class="assembly-topology">
            ${topologyHtml(entry.shape)}
            <p>${escapeHtml(getShapeAssemblyDirection(entry.shape))}</p>
            <div class="assembly-legend"><span>Canto 1L1</span><span>Acabamento IF</span><span>Módulo ML</span></div>
          </div>
          <div class="assembly-edges">${edgeRows}</div>
        </div>
        <footer class="assembly-note">Monte as peças na ordem numerada de cada aresta. Códigos e quantidades comerciais permanecem consolidados na ficha técnica e na requisição de materiais.</footer>
      </section>`;
  }).join("");
}
