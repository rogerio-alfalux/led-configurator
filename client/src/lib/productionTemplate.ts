/**
 * Gerador de Pedido de Produção Alfalux v.03
 * Gera um bloco de texto estruturado pronto para cópia no sistema de produção.
 */

import type { CompositionResult, SkuDriverEntry } from "./ledEngine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDriver(entry: SkuDriverEntry): string {
  const driverQty = entry.driver.quantity ?? 1;
  const skuQty = entry.quantity;
  const total = driverQty * skuQty;
  const code = entry.driver.code ? ` (${entry.driver.code})` : "";
  return `${total}x ${entry.driver.model}${code}`;
}

function formatBars(
  barras: number,
  barsTotal: number,
  power: number,
  stripMethod: string,
  stripflexName: string,
  cct: string
): string {
  const isStripline = stripMethod === "STRIPLINE";
  const barName = isStripline
    ? "Stripline 562,5mm 105L"
    : stripflexName || "Stripflex 562,5mm 36L";

  if (power === 36 && !isStripline) {
    // Fileira Dupla: barsTotal = barras × 2
    return `${barsTotal}x ${barName} ${cct} (${barras} seções × 2 fileiras)`;
  }
  return `${barsTotal}x ${barName} ${cct}`;
}

function buildMountingNotes(result: CompositionResult): string[] {
  const notes: string[] = [];

  if (result.isRemoteDriver) {
    notes.push("Driver Remoto (instalação em ponto externo ao perfil)");
  } else {
    notes.push("Driver Integrado ao perfil");
  }

  if (result.powerD1 === 36 && result.stripMethod === "STRIPFLEX") {
    notes.push("Fileira Dupla — barras fixadas lado a lado no mesmo perfil");
  }

  if (result.stripMethod === "STRIPLINE") {
    notes.push("Barra Stripline 562,5 × 15mm 105L — apenas barras inteiras");
  }

  if (result.independentLighting || result.forcedIndependent) {
    notes.push("Acendimento Independente — D1 e D2 com drivers separados");
  }

  if (result.compositionMode === "IF_ML_LINE") {
    notes.push("Ligação em Série Pura — módulos IF nas pontas + ML no centro");
  }

  return notes;
}

function buildModuleBlock(
  result: CompositionResult,
  sku: string,
  length: number,
  barras: number,
  barsTotal: number,
  drivers: SkuDriverEntry[],
  label?: string
): string {
  const lines: string[] = [];

  lines.push(`Módulo: ${sku}${label ? ` [${label}]` : ""}`);
  lines.push(`Comprimento: ${length}mm`);
  lines.push(
    `Barras: ${formatBars(
      barras,
      barsTotal,
      result.powerD1,
      result.stripMethod,
      result.stripflexName,
      result.cct
    )}`
  );

  // Consolidar drivers por modelo para este módulo
  const driverMap = new Map<string, { model: string; code?: string; total: number }>();
  for (const e of drivers) {
    const key = e.driver.model;
    const existing = driverMap.get(key);
    const driverQty = e.driver.quantity ?? 1;
    const total = driverQty * e.quantity;
    if (existing) {
      existing.total += total;
    } else {
      driverMap.set(key, { model: e.driver.model, code: e.driver.code, total });
    }
  }

  const driverLines = Array.from(driverMap.values())
    .map((d) => `${d.total}x ${d.model}${d.code ? ` (${d.code})` : ""}`)
    .join("\n    ");

  lines.push(`Drivers: ${driverLines}`);

  return lines.join("\n");
}

// ─── Gerador Principal ────────────────────────────────────────────────────────

export function generateProductionTemplate(result: CompositionResult): string {
  const lines: string[] = [];

  // ── Cabeçalho ──
  lines.push("═══════════════════════════════════════════════════");
  lines.push("  PEDIDO DE PRODUÇÃO — ALFALUX ILUMINAÇÃO");
  lines.push("═══════════════════════════════════════════════════");
  lines.push("");

  // ── Dados da Luminária ──
  lines.push("DADOS DA LUMINÁRIA:");

  const powerLabel =
    result.application === "D1+D2"
      ? `D1: ${result.powerD1}W/m · D2: ${result.powerD2}W/m`
      : `${result.powerD1}W/m`;

  lines.push(`Modelo: ${result.profileName}`);
  lines.push(`Instalação: ${result.installType}`);
  lines.push(`Aplicação: ${result.application}`);
  lines.push(
    `Acendimento: ${result.independentLighting || result.forcedIndependent ? "Independente" : "Simultâneo"}`
  );
  lines.push(`Potência: ${powerLabel} | CCT: ${result.cct}`);
  lines.push(
    `Comprimento Solicitado: ${result.requestedLength}mm | Comprimento Realizado: ${result.realizedLength}mm`
  );
  if (result.remainingLength > 0) {
    lines.push(`Sobra de Comprimento: ${result.remainingLength}mm`);
  }
  lines.push("");

  // ── Composição Técnica ──
  lines.push("COMPOSIÇÃO TÉCNICA (ITENS DE PRODUÇÃO):");
  lines.push("───────────────────────────────────────────────────");

  // Agrupar por módulo único (sku + moduleType)
  const moduleGroups = new Map<
    string,
    {
      sku: string;
      length: number;
      barras: number;
      barsTotal: number;
      moduleTypeLabel: string;
      driversD1: SkuDriverEntry[];
      driversD2: SkuDriverEntry[];
    }
  >();

  for (const item of result.composition) {
    if (!moduleGroups.has(item.sku)) {
      const d1 = result.driversD1.filter((e) => e.sku === item.sku);
      const d2 = result.driversD2.filter((e) => e.sku === item.sku);
      const combined = result.combinedDrivers?.filter((e) => e.sku === item.sku) ?? [];
      moduleGroups.set(item.sku, {
        sku: item.sku,
        length: item.length,
        barras: item.barras,
        barsTotal: item.barsTotal,
        moduleTypeLabel: item.moduleTypeLabel,
        driversD1: d1.length > 0 ? d1 : combined,
        driversD2: d2,
      });
    }
  }

  // Ordenar: IF primeiro, ML depois, IN por último
  const order: Record<string, number> = { IF: 0, ML: 1, IN: 2 };
  const sortedModules = Array.from(moduleGroups.values()).sort((a, b) => {
    const aType = a.sku.includes(".IF.") ? "IF" : a.sku.includes(".ML.") ? "ML" : "IN";
    const bType = b.sku.includes(".IF.") ? "IF" : b.sku.includes(".ML.") ? "ML" : "IN";
    return (order[aType] ?? 2) - (order[bType] ?? 2);
  });

  // Calcular quantidade de cada módulo na composição
  const moduleQty = new Map<string, number>();
  for (const item of result.composition) {
    moduleQty.set(item.sku, (moduleQty.get(item.sku) ?? 0) + item.quantity);
  }

  for (const mod of sortedModules) {
    const qty = moduleQty.get(mod.sku) ?? 1;
    const hasD2 = mod.driversD2.length > 0;

    if (qty > 1) {
      lines.push(`[${qty}x] ${mod.moduleTypeLabel}`);
    } else {
      lines.push(`[${mod.moduleTypeLabel}]`);
    }

    // D1 (ou combinado)
    const d1Block = buildModuleBlock(
      result,
      mod.sku,
      mod.length,
      mod.barras,
      mod.barsTotal,
      mod.driversD1,
      hasD2 ? "D1" : undefined
    );
    lines.push(d1Block);

    // D2 (se independente)
    if (hasD2) {
      const d2Block = buildModuleBlock(
        result,
        mod.sku,
        mod.length,
        mod.barras,
        mod.barsTotal,
        mod.driversD2,
        "D2"
      );
      lines.push(d2Block);
    }

    lines.push("───────────────────────────────────────────────────");
  }

  // ── Notas de Montagem ──
  const notes = buildMountingNotes(result);
  if (notes.length > 0) {
    lines.push("");
    lines.push("NOTAS DE MONTAGEM:");
    for (const note of notes) {
      lines.push(`  • ${note}`);
    }
  }

  // ── Notas de Engenharia ──
  if (result.engineeringNotes.length > 0) {
    lines.push("");
    lines.push("NOTAS DE ENGENHARIA:");
    for (const note of result.engineeringNotes) {
      lines.push(`  • ${note}`);
    }
  }

  lines.push("");
  lines.push("═══════════════════════════════════════════════════");

  return lines.join("\n");
}
