/**
 * materialRequisition.ts
 * Agrega todos os materiais de todos os itens do pedido de fábrica
 * para gerar a Requisição de Materiais.
 *
 * Regras:
 * - Itens com mesmo código (EQ/CP) são somados
 * - Cada material deve ter código EQ, CP ou SKU de perfil
 * - A lista é ordenada por tipo (Perfis, Módulos LED, Drivers, Fontes, Lentes, ...)
 * - Perfis e fitas LED são medidos em METROS (m); demais em UNIDADES (un)
 */

import type { CartItemData, ProfileSegment } from "./cartTypes";

export interface MaterialEntry {
  /** Código EQ, CP ou SKU do material */
  codigo: string;
  /** Descrição completa do material */
  descricao: string;
  /** Quantidade total necessária */
  qty: number;
  /** Unidade de medida: "un" para peças, "m" para metros */
  unidade: "un" | "m";
  /** Tipo/família do material para agrupamento */
  tipo: MaterialTipo;
}

export type MaterialTipo =
  | "PERFIS"
  | "FITAS LED"
  | "MÓDULOS LED"
  | "DRIVERS"
  | "FONTES DE TENSÃO"
  | "LENTES"
  | "REFLETORES"
  | "DISSIPADORES"
  | "SUPORTES"
  | "ACESSÓRIOS"
  | "OUTROS";

/** Ordem de exibição dos tipos */
const TIPO_ORDER: MaterialTipo[] = [
  "PERFIS",
  "FITAS LED",
  "MÓDULOS LED",
  "DRIVERS",
  "FONTES DE TENSÃO",
  "LENTES",
  "REFLETORES",
  "DISSIPADORES",
  "SUPORTES",
  "ACESSÓRIOS",
  "OUTROS",
];

function detectTipo(descricao: string, codigo: string): MaterialTipo {
  const d = descricao.toUpperCase();
  const c = codigo.toUpperCase();

  // Perfis: SKUs de perfil (LLE-, LLS-, ALE-, ALS-, etc.)
  if (
    c.startsWith("LLE-") || c.startsWith("LLS-") ||
    c.startsWith("ALE-") || c.startsWith("ALS-") ||
    c.startsWith("LLE") || c.startsWith("LLS") ||
    d.includes("PERFIL") || d.includes("CALHA")
  ) {
    return "PERFIS";
  }

  // Fitas LED: Stripflex, Stripline, fita LED
  if (
    d.includes("STRIPFLEX") ||
    d.includes("STRIPLINE") ||
    d.includes("STRIPLUX") ||
    (d.includes("FITA") && d.includes("LED"))
  ) {
    return "FITAS LED";
  }

  // Módulos LED: módulo LED, barra LED
  if (
    d.includes("MÓDULO LED") ||
    d.includes("MODULO LED") ||
    d.includes("MÓDULO LUX") ||
    d.includes("MODULO LUX") ||
    (d.includes("LED") && (d.includes("BARRA") || d.includes("BAR")))
  ) {
    return "MÓDULOS LED";
  }

  // Fontes de tensão: fonte 24V, fonte de tensão
  if (
    d.includes("FONTE") ||
    d.includes("POWER SUPPLY") ||
    (d.includes("24V") && !d.includes("DRIVER")) ||
    (d.includes("12V") && !d.includes("DRIVER"))
  ) {
    return "FONTES DE TENSÃO";
  }

  // Drivers: driver, xitanium, certadrive, lifud, meanwell
  if (
    d.includes("DRIVER") ||
    d.includes("XITANIUM") ||
    d.includes("CERTADRIVE") ||
    d.includes("LIFUD") ||
    d.includes("MEANWELL") ||
    d.includes("TRIDONIC") ||
    d.includes("OSRAM")
  ) {
    return "DRIVERS";
  }

  // Lentes
  if (d.includes("LENTE") || d.includes("LENS") || d.includes("ÓPTICA") || d.includes("OPTICA")) {
    return "LENTES";
  }

  // Refletores
  if (d.includes("REFLETOR") || d.includes("REFLECTOR") || d.includes("CONE")) {
    return "REFLETORES";
  }

  // Dissipadores
  if (d.includes("DISSIPADOR") || d.includes("HEATSINK") || d.includes("HEAT SINK")) {
    return "DISSIPADORES";
  }

  // Suportes
  if (
    d.includes("SUPORTE") ||
    d.includes("BRACKET") ||
    d.includes("FIXAÇÃO") ||
    d.includes("FIXACAO") ||
    d.includes("CLIP") ||
    d.includes("TRILHO")
  ) {
    return "SUPORTES";
  }

  // Acessórios (CP codes geralmente)
  if (c.startsWith("CP")) {
    return "ACESSÓRIOS";
  }

  return "OUTROS";
}

/**
 * Agrega todos os materiais de todos os itens do pedido.
 * Retorna lista ordenada por tipo e depois por descrição.
 *
 * @param items - Lista de itens do pedido (já filtrados)
 * @param descMap - Mapa código EQ → descrição canônica da API (opcional, para normalizar nomes)
 */
export function buildMaterialRequisition(
  items: CartItemData[],
  descMap?: Map<string, string>
): MaterialEntry[] {
  // Map: codigo → MaterialEntry
  const map = new Map<string, MaterialEntry>();

  function add(
    codigo: string,
    descricao: string,
    qty: number,
    unidade: "un" | "m",
    tipo?: MaterialTipo
  ) {
    if (!codigo || !descricao || qty <= 0) return;
    // Usar descrição canônica da API se disponível
    const canonicalDesc = descMap?.get(codigo) ?? descricao;
    const resolvedTipo = tipo ?? detectTipo(canonicalDesc, codigo);
    const key = `${codigo}||${unidade}`;
    const existing = map.get(key);
    if (existing) {
      map.set(key, { ...existing, qty: existing.qty + qty });
    } else {
      map.set(key, { codigo, descricao: canonicalDesc, qty, unidade, tipo: resolvedTipo });
    }
  }

  for (const item of items) {
    // Ignorar itens sem categoria ou "Não Orçamos"
    if (!item.category || item.category === "Não Orçamos") continue;

    const itemQty = item.qty ?? 1;

    // ── PERFIS: profileSegments ──────────────────────────────────────────
    if (item.profileSegments && item.profileSegments.length > 0) {
      const isStripline = item.stripMethod === "STRIPLINE";
      const cct = item.cct ?? "";

      for (const seg of item.profileSegments) {
        // 1. Perfil em metros (SKU do perfil × comprimento × qty)
        if (seg.sku && seg.lengthMm > 0) {
          const totalMetros = (seg.qty * seg.lengthMm / 1000) * itemQty;
          const perfilDesc = descMap?.get(seg.sku) ?? seg.sku;
          add(seg.sku, perfilDesc, totalMetros, "m", "PERFIS");
        }

        // 2. Fita LED em metros (barsPerPiece × 562,5mm por barra = metros)
        const ledCode = (seg as any).ledModuleCode ?? "";
        if (ledCode) {
          // Cada barra de Stripflex = 562,5mm = 0,5625m; Stripline = 562,5mm também
          const metroPorBarra = 0.5625;
          const totalMetrosFita = seg.qty * seg.barsPerPiece * metroPorBarra * itemQty;
          const barName = isStripline
            ? `Stripline 562,5 x 15mm 108L ${cct}`
            : `Stripflex 562,5 x 10mm 36L ${cct}`;
          add(ledCode, barName, totalMetrosFita, "m", "FITAS LED");
        }

        // 3. Driver
        if (seg.driverCode && seg.driverCode !== "ERRO" && !seg.driverModel.includes(" + ")) {
          const totalDrivers = seg.qty * seg.driverQtyPerPiece * itemQty;
          const correnteSuffix = seg.corrente ? ` - PROG: ${seg.corrente}` : "";
          add(seg.driverCode, `${seg.driverModel}${correnteSuffix}`, totalDrivers, "un", "DRIVERS");
        }

        // 4. Driver combo: "1 x MODEL1 (CODE1) + 1 x MODEL2 (CODE2)"
        if (seg.driverModel.includes(" + ")) {
          const parts = seg.driverModel.split(" + ");
          for (const part of parts) {
            const match = part.match(/^(\d+)\s*x\s*(.+?)\s*\(([^)]+)\)$/);
            if (match) {
              const drvQtyPerPiece = parseInt(match[1], 10) || 1;
              const drvModel = match[2].trim();
              const drvCode = match[3].trim();
              const totalDrivers = seg.qty * drvQtyPerPiece * itemQty;
              add(drvCode, drvModel, totalDrivers, "un", "DRIVERS");
            }
          }
        }
      }
    }

    // ── LUMINÁRIAS COM driverLines (downlights, painéis, spots) ──────────
    if (item.driverLines && item.driverLines.length > 0) {
      for (const dl of item.driverLines) {
        if (!dl.driverCode) continue;
        const qtyPerUnit = (dl as any).drvQtyPerUnit ?? Math.round(dl.driverQty / itemQty) ?? 1;
        const totalDrivers = qtyPerUnit * itemQty;
        const isDriverFonte = dl.driverModel.toUpperCase().includes("FONTE 24V");
        const tipo: MaterialTipo = isDriverFonte ? "FONTES DE TENSÃO" : "DRIVERS";
        const correnteSuffix = dl.corrente && !isDriverFonte ? ` - PROG: ${dl.corrente}` : "";
        add(dl.driverCode, `${dl.driverModel}${correnteSuffix}`, totalDrivers, "un", tipo);
      }
    }

    // ── LED BAR ──────────────────────────────────────────────────────────
    if (item.category === "LED BAR" && item.ledBarNCortes !== undefined) {
      if (item.ledBarDriverCode && item.ledBarDriverModel) {
        const nCortes = item.ledBarNCortes ?? 1;
        add(
          item.ledBarDriverCode,
          item.ledBarDriverModel,
          nCortes * itemQty,
          "un",
          "FONTES DE TENSÃO"
        );
      }
      // Fita LED do LED BAR: ledBarComprimentoTotalMm em metros
      if (item.moduloLed && item.ledBarComprimentoTotalMm) {
        const totalMetros = (item.ledBarComprimentoTotalMm / 1000) * itemQty;
        // Sem código EQ disponível para fita do LED BAR — usar descrição como chave
        const fakeCode = `FITA_LEDBAR_${item.sku ?? item.description ?? ""}`;
        add(fakeCode, item.moduloLed, totalMetros, "m", "FITAS LED");
      }
    }

    // ── ITEM ESPECIAL: specialEquipments ─────────────────────────────────
    if (item.isSpecialItem && item.specialEquipments && item.specialEquipments.length > 0) {
      for (const eq of item.specialEquipments) {
        if (!eq.codigo) continue;
        const tipo = detectTipo(eq.descricao, eq.codigo);
        add(eq.codigo, eq.descricao, eq.qty * itemQty, "un", tipo);
      }
    }

    // ── ACESSÓRIOS VINCULADOS ─────────────────────────────────────────────
    if (item.accessories && item.accessories.length > 0) {
      for (const acc of item.accessories) {
        if (!acc.codigo) continue;
        const tipo = detectTipo(acc.descricao, acc.codigo);
        add(acc.codigo, acc.descricao, acc.qty * itemQty, "un", tipo);
      }
    }
  }

  // Arredondar quantidades para evitar erros de ponto flutuante
  // Metros: 1 decimal (arredondar para cima); unidades: inteiro
  for (const [key, entry] of Array.from(map.entries())) {
    let rounded: number;
    if (entry.unidade === "m") {
      // Arredondar para cima com 1 decimal
      rounded = Math.ceil(entry.qty * 10) / 10;
    } else {
      rounded = Math.ceil(entry.qty);
    }
    map.set(key, { ...entry, qty: rounded });
  }

  // Ordenar: primeiro por tipo (TIPO_ORDER), depois por descrição
  const entries = Array.from(map.values());
  entries.sort((a, b) => {
    const tipoA = TIPO_ORDER.indexOf(a.tipo);
    const tipoB = TIPO_ORDER.indexOf(b.tipo);
    if (tipoA !== tipoB) return tipoA - tipoB;
    return a.descricao.localeCompare(b.descricao, "pt-BR");
  });

  return entries;
}

/** Agrupa MaterialEntry[] por tipo para exibição em seções */
export function groupByTipo(entries: MaterialEntry[]): Map<MaterialTipo, MaterialEntry[]> {
  const map = new Map<MaterialTipo, MaterialEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.tipo) ?? [];
    list.push(entry);
    map.set(entry.tipo, list);
  }
  return map;
}
