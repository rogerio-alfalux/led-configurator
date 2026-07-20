/**
 * Gerador de Pedido de Produção Alfalux v.03
 * Regra definitiva: 1 driver por peça/SKU individual.
 * Exibe "Barras por peça" e "Barras totais" separadamente.
 * NÃO exibe circuitos elétricos.
 */

import type { CompositionResult, SkuDriverEntry } from "./ledEngine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBarName(stripMethod: string, _cct: string, stripflexName?: string, stripflexEq?: string | null): string {
  // Usar SEMPRE o nome canônico da API (result.stripflexName) que já inclui CCT.
  // O ledEngine resolve o nome correto baseado no stripMethod + CCT + dados da API.
  const name = stripflexName || `(módulo LED não identificado)`;
  return stripflexEq ? `${name} (${stripflexEq})` : name;
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
  moduleQty: number,
  label?: string
): string {
  const lines: string[] = [];
  const barName = getBarName(result.stripMethod, result.cct, result.stripflexName, result.stripflexEq);

  lines.push(`Módulo: ${sku}${label ? ` [${label}]` : ""}`);
  lines.push(`Comprimento: ${length}mm`);

  // Barras por peça (barsTotal = barras da peça individual)
  if (result.powerD1 === 36 && result.stripMethod === "STRIPFLEX") {
    // Fileira dupla: barsTotal = barras × 2 (lado a lado)
    lines.push(`Barras por peça: ${barsTotal}x ${barName} (${barras} seções × 2 fileiras)`);
    lines.push(`Barras totais: ${barsTotal * moduleQty}x ${barName}`);
  } else {
    lines.push(`Barras por peça: ${barsTotal}x ${barName}`);
    lines.push(`Barras totais: ${barsTotal * moduleQty}x ${barName}`);
  }

  // Consolidar drivers: 1 driver por peça × quantidade de módulos
  // Suporte a combos (ex: Stripline 3 barras = 44W + 65W)
  const driverMap = new Map<string, { model: string; code?: string; total: number }>();

  const addToDriverMap = (model: string, code: string | undefined, qty: number) => {
    const key = `${code ?? model}`;
    const existing = driverMap.get(key);
    if (existing) {
      existing.total += qty;
    } else {
      driverMap.set(key, { model, code, total: qty });
    }
  };

  for (const e of drivers) {
    if (e.driver.combo && e.driver.combo.length > 0) {
      // Driver composto: cada item do combo é adicionado separadamente
      for (const item of e.driver.combo) {
        addToDriverMap(item.model, item.code, item.quantity * moduleQty);
      }
    } else {
      // Driver simples: driver.quantity = multiplicador interno (ex: 26W CERTADRIVE = qty de barras)
      const driverQty = (e.driver.quantity ?? 1) * moduleQty;
      addToDriverMap(e.driver.model, e.driver.code, driverQty);
    }
  }

  const driverLines = Array.from(driverMap.values())
    .map((d) => `${d.total}x ${d.model}${d.code ? ` (${d.code})` : ""}`)
    .join(" + ");

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
  const moduleQtyMap = new Map<string, number>();
  for (const item of result.composition) {
    moduleQtyMap.set(item.sku, (moduleQtyMap.get(item.sku) ?? 0) + item.quantity);
  }

  for (const mod of sortedModules) {
    const qty = moduleQtyMap.get(mod.sku) ?? 1;
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
      qty,
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
        qty,
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
