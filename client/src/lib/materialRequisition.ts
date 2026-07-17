/**
 * materialRequisition.ts
 * Agrega todos os materiais (módulos LED, drivers, fontes, lentes, refletores, suportes)
 * de todos os itens do pedido de fábrica para gerar a Requisição de Materiais.
 *
 * Regras:
 * - Itens com mesmo código (EQ/CP) são somados
 * - Cada material deve ter código EQ ou CP obrigatório
 * - Materiais sem código são agrupados em "SEM CÓDIGO" para revisão
 * - A lista é ordenada por tipo (Módulos LED, Drivers, Fontes, Lentes, Refletores, Suportes, Outros)
 */

import type { CartItemData, ProfileSegment, DriverLine } from "./cartTypes";

export interface MaterialEntry {
  /** Código EQ ou CP do material (ex: "EQ00347", "CP00526") */
  codigo: string;
  /** Descrição completa do material */
  descricao: string;
  /** Quantidade total necessária */
  qty: number;
  /** Tipo/família do material para agrupamento */
  tipo: MaterialTipo;
}

export type MaterialTipo =
  | "MÓDULOS LED"
  | "DRIVERS"
  | "FONTES DE TENSÃO"
  | "LENTES"
  | "REFLETORES"
  | "SUPORTES"
  | "ACESSÓRIOS"
  | "OUTROS";

/** Ordem de exibição dos tipos */
const TIPO_ORDER: MaterialTipo[] = [
  "MÓDULOS LED",
  "DRIVERS",
  "FONTES DE TENSÃO",
  "LENTES",
  "REFLETORES",
  "SUPORTES",
  "ACESSÓRIOS",
  "OUTROS",
];

function detectTipo(descricao: string, codigo: string): MaterialTipo {
  const d = descricao.toUpperCase();
  const c = codigo.toUpperCase();

  // Módulos LED: Stripflex, Stripline, módulo LED, fita LED
  if (
    d.includes("STRIPFLEX") ||
    d.includes("STRIPLINE") ||
    d.includes("FITA LED") ||
    d.includes("MÓDULO LED") ||
    d.includes("MODULO LED") ||
    (d.includes("LED") && (d.includes("BARRA") || d.includes("BAR")))
  ) {
    return "MÓDULOS LED";
  }

  // Fontes de tensão: fonte 24V, fonte de tensão
  if (
    d.includes("FONTE") ||
    d.includes("POWER SUPPLY") ||
    d.includes("24V") ||
    d.includes("12V")
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
 */
export function buildMaterialRequisition(items: CartItemData[]): MaterialEntry[] {
  // Map: codigo → MaterialEntry
  const map = new Map<string, MaterialEntry>();

  function add(codigo: string, descricao: string, qty: number, tipo?: MaterialTipo) {
    if (!codigo || !descricao || qty <= 0) return;
    const resolvedTipo = tipo ?? detectTipo(descricao, codigo);
    const existing = map.get(codigo);
    if (existing) {
      map.set(codigo, { ...existing, qty: existing.qty + qty });
    } else {
      map.set(codigo, { codigo, descricao, qty, tipo: resolvedTipo });
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
        // Módulo LED (Stripflex/Stripline)
        const barName = isStripline
          ? `Stripline 562,5 x 15mm 108L ${cct}`
          : `Stripflex 562,5 x 10mm 36L ${cct}`;
        const ledCode = (seg as any).ledModuleCode ?? "";
        const totalBars = seg.qty * seg.barsPerPiece * itemQty;
        if (ledCode) {
          add(ledCode, barName, totalBars, "MÓDULOS LED");
        }

        // Driver
        if (seg.driverCode && seg.driverCode !== "ERRO" && !seg.driverModel.includes(" + ")) {
          const totalDrivers = seg.qty * seg.driverQtyPerPiece * itemQty;
          const correnteSuffix = seg.corrente ? ` - PROG: ${seg.corrente}` : "";
          add(seg.driverCode, `${seg.driverModel}${correnteSuffix}`, totalDrivers, "DRIVERS");
        }

        // Driver combo: "1 x MODEL1 (CODE1) + 1 x MODEL2 (CODE2)"
        if (seg.driverModel.includes(" + ")) {
          // Extrair cada driver do combo
          const parts = seg.driverModel.split(" + ");
          for (const part of parts) {
            const match = part.match(/^(\d+)\s*x\s*(.+?)\s*\(([^)]+)\)$/);
            if (match) {
              const drvQtyPerPiece = parseInt(match[1], 10) || 1;
              const drvModel = match[2].trim();
              const drvCode = match[3].trim();
              const totalDrivers = seg.qty * drvQtyPerPiece * itemQty;
              add(drvCode, drvModel, totalDrivers, "DRIVERS");
            }
          }
        }
      }
    }

    // ── LUMINÁRIAS COM driverLines (downlights, painéis, spots) ──────────
    if (item.driverLines && item.driverLines.length > 0) {
      for (const dl of item.driverLines) {
        if (!dl.driverCode) continue;
        // drvQtyPerUnit = qty por unidade; se não existir, usar driverQty / itemQty
        const qtyPerUnit = (dl as any).drvQtyPerUnit ?? Math.round(dl.driverQty / itemQty) ?? 1;
        const totalDrivers = qtyPerUnit * itemQty;
        const isDriverFonte = dl.driverModel.toUpperCase().includes("FONTE 24V");
        const tipo: MaterialTipo = isDriverFonte ? "FONTES DE TENSÃO" : "DRIVERS";
        const correnteSuffix = dl.corrente && !isDriverFonte ? ` - PROG: ${dl.corrente}` : "";
        add(dl.driverCode, `${dl.driverModel}${correnteSuffix}`, totalDrivers, tipo);
      }

      // Módulo LED para luminárias (moduloLed)
      if (item.moduloLed) {
        // Sem código EQ disponível para moduloLed em luminárias — não adicionar sem código
        // (o código EQ do módulo só está disponível para perfis via ledModuleCode)
      }
    }

    // ── LED BAR ──────────────────────────────────────────────────────────
    if (item.category === "LED BAR" && item.ledBarNCortes !== undefined) {
      // Fonte de tensão
      if (item.ledBarDriverCode && item.ledBarDriverModel) {
        const nCortes = item.ledBarNCortes ?? 1;
        add(
          item.ledBarDriverCode,
          item.ledBarDriverModel,
          nCortes * itemQty,
          "FONTES DE TENSÃO"
        );
      }
      // Módulo LED (fita): sem código EQ disponível na estrutura atual
    }

    // ── ITEM ESPECIAL: specialEquipments ─────────────────────────────────
    if (item.category === "Item Especial" && item.specialEquipments && item.specialEquipments.length > 0) {
      for (const eq of item.specialEquipments) {
        if (!eq.codigo) continue;
        const tipo = detectTipo(eq.descricao, eq.codigo);
        add(eq.codigo, eq.descricao, eq.qty * itemQty, tipo);
      }
    }

    // ── ACESSÓRIOS VINCULADOS ─────────────────────────────────────────────
    if (item.accessories && item.accessories.length > 0) {
      for (const acc of item.accessories) {
        if (!acc.codigo) continue;
        add(acc.codigo, acc.descricao, acc.qty * itemQty, "ACESSÓRIOS");
      }
    }
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
