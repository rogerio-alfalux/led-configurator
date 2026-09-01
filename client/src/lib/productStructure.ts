export type ProductLightingMode =
  | "LED_MODULE"
  | "RGBW"
  | "TUNABLE_WHITE"
  | "LAMP"
  | "NO_LED_MODULE";

export interface ProductStructureComponent {
  componentId?: number | string | null;
  description: string;
  code: string | null;
  type: string | null;
  /** Quantidade por unidade do produto, exatamente como retornada pela API. */
  quantity: number;
}

export interface ProductStructure {
  lightingMode: ProductLightingMode;
  lightSource: ProductStructureComponent | null;
  otherEquipments: ProductStructureComponent[];
}

export interface ApiProductStructureSource {
  modoIluminacao?: string | null;
  moduloSemLed?: boolean | null;
  semModuloLed?: boolean | null;
  moduloRgbw?: boolean | null;
  moduloLedRgbw?: string | null;
  moduloLedRgbwCode?: string | null;
  qtdModuloLedRgbw?: number | null;
  moduloTunableWhite?: boolean | null;
  moduloLedTunableWhite?: string | null;
  moduloLedTunableWhiteCode?: string | null;
  qtdModuloLedTunableWhite?: number | null;
  moduloLampada?: boolean | null;
  lampadaAcessorioId?: number | string | null;
  lampada?: unknown;
  outrosEquipamentos?: unknown;
}

function finiteQuantity(value: unknown, fallback = 1): number {
  const parsed = typeof value === "string"
    ? Number(value.replace(",", "."))
    : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeComponent(
  value: unknown,
  fallback: Partial<ProductStructureComponent> = {},
): ProductStructureComponent | null {
  if (typeof value === "string") {
    const description = text(value);
    if (!description) return null;
    return {
      componentId: fallback.componentId ?? null,
      description,
      code: fallback.code ?? null,
      type: fallback.type ?? null,
      quantity: finiteQuantity(fallback.quantity, 1),
    };
  }

  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const description = text(record.modelo)
    ?? text(record.descricao)
    ?? text(record.description)
    ?? text(record.nome)
    ?? text(record.name)
    ?? fallback.description
    ?? null;
  if (!description) return null;

  return {
    componentId: record.componentId as number | string | null | undefined
      ?? record.id as number | string | null | undefined
      ?? fallback.componentId
      ?? null,
    description,
    code: text(record.codigo)
      ?? text(record.code)
      ?? text(record.codigoEq)
      ?? fallback.code
      ?? null,
    type: text(record.tipo)
      ?? text(record.type)
      ?? fallback.type
      ?? null,
    quantity: finiteQuantity(
      record.qtd ?? record.qty ?? record.quantidade ?? fallback.quantity,
      1,
    ),
  };
}

function resolveLightingMode(source: ApiProductStructureSource): ProductLightingMode {
  const explicit = String(source.modoIluminacao ?? "").trim().toUpperCase();
  if (explicit.includes("TUNABLE") || explicit === "TW") return "TUNABLE_WHITE";
  if (explicit.includes("RGBW")) return "RGBW";
  if (explicit.includes("LAMP")) return "LAMP";
  if (explicit.includes("SEM_MODULO") || explicit.includes("SEM MÓDULO") || explicit.includes("NO_LED")) {
    return "NO_LED_MODULE";
  }
  if (source.moduloTunableWhite) return "TUNABLE_WHITE";
  if (source.moduloRgbw) return "RGBW";
  if (source.moduloLampada) return "LAMP";
  if (source.moduloSemLed || source.semModuloLed) return "NO_LED_MODULE";
  return "LED_MODULE";
}

export function adaptProductStructure(source: ApiProductStructureSource): ProductStructure {
  const lightingMode = resolveLightingMode(source);
  let lightSource: ProductStructureComponent | null = null;

  if (lightingMode === "TUNABLE_WHITE") {
    lightSource = normalizeComponent(source.moduloLedTunableWhite, {
      code: source.moduloLedTunableWhiteCode ?? null,
      type: "MODULO_LED",
      quantity: source.qtdModuloLedTunableWhite ?? 1,
    });
  } else if (lightingMode === "RGBW") {
    lightSource = normalizeComponent(source.moduloLedRgbw, {
      code: source.moduloLedRgbwCode ?? null,
      type: "MODULO_LED",
      quantity: source.qtdModuloLedRgbw ?? 1,
    });
  } else if (lightingMode === "LAMP") {
    lightSource = normalizeComponent(source.lampada, {
      componentId: source.lampadaAcessorioId ?? null,
      type: "LAMPADA",
      quantity: 1,
    });
  }

  const rawOtherEquipments = Array.isArray(source.outrosEquipamentos)
    ? source.outrosEquipamentos
    : [];
  const otherEquipments = rawOtherEquipments
    .map(component => normalizeComponent(component))
    .filter((component): component is ProductStructureComponent => component !== null);

  return { lightingMode, lightSource, otherEquipments };
}

export function withProductLightingCcts(
  ccts: string[],
  structure: ProductStructure,
): string[] {
  if (structure.lightingMode === "TUNABLE_WHITE") return ["TUNABLE WHITE"];
  if (structure.lightingMode === "RGBW") return ["RGBW"];
  if (structure.lightingMode === "LAMP" || structure.lightingMode === "NO_LED_MODULE") return [];
  return ccts;
}

export function productStructureCartFields(structure: ProductStructure | null | undefined): {
  productLightingMode?: ProductLightingMode;
  productLightSource?: ProductStructureComponent | null;
  apiOtherEquipments?: ProductStructureComponent[];
} {
  if (!structure) return {};
  return {
    productLightingMode: structure.lightingMode,
    productLightSource: structure.lightSource,
    apiOtherEquipments: structure.otherEquipments,
  };
}

export function aggregateProductStructureComponents(
  entries: Array<{ component: ProductStructureComponent; multiplier?: number }>,
): ProductStructureComponent[] {
  const consolidated = new Map<string, ProductStructureComponent>();
  for (const { component, multiplier = 1 } of entries) {
    const quantity = component.quantity * multiplier;
    const key = `${component.code ?? ""}|${component.description}|${component.type ?? ""}`;
    const current = consolidated.get(key);
    if (current) {
      current.quantity += quantity;
    } else {
      consolidated.set(key, { ...component, quantity });
    }
  }
  return Array.from(consolidated.values());
}

export function formatProductStructureSummaryLines(item: {
  productLightingMode?: ProductLightingMode;
  productLightSource?: ProductStructureComponent | null;
  apiOtherEquipments?: ProductStructureComponent[];
}): string[] {
  const lines: string[] = [];
  if (item.productLightSource) {
    const source = item.productLightSource;
    const label = item.productLightingMode === "LAMP" ? "LÂMPADA" : "FONTE DE LUZ";
    lines.push(`${label}: ${source.quantity}x ${source.description}${source.code ? ` (${source.code})` : ""}`);
  }
  for (const component of item.apiOtherEquipments ?? []) {
    lines.push(`EQUIPAMENTO: ${component.quantity}x ${component.description}${component.code ? ` (${component.code})` : ""}`);
  }
  return lines;
}
