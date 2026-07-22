/**
 * materialRequisition.ts
 * Agrega todos os materiais de todos os itens do pedido de fábrica
 * para gerar a Requisição de Materiais.
 *
 * Regras:
 * - Itens com mesmo código (EQ/CP) são somados
 * - Cada material deve ter código EQ, CP ou SKU de perfil
 * - A lista é ordenada por tipo (Perfis, Fitas LED, Módulos LED, Drivers, Fontes, Lentes, ...)
 * - Perfis são agrupados por código-base (ex: LLE-2810, LLS-3945) com metragem total
 * - LED BAR também é contabilizado como perfil (metragem)
 * - Fitas LED (LED BAR U DA e Perfil Flexível) são medidas em METROS (m)
 * - Módulos LED (Stripflex, Stripline, Lux Round, etc.) são medidos em UNIDADES (un)
 * - Drivers e demais componentes em UNIDADES (un)
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
 * Extrai o código-base de um SKU de perfil.
 * Ex: "LLE-2810.35F.18F" → "LLE-2810"
 *     "LLS-3945.22I.38F" → "LLS-3945"
 *     "LLP-6060.5ML.48F" → "LLP-6060"
 *     "LLA-4450.3IF.18F" → "LLA-4450"
 */
function extractPerfilBase(sku: string): string {
  // Padrão: 3 letras + "-" + 4 dígitos (ex: LLE-2810, LLS-3945, LLP-6060)
  const match = sku.match(/^([A-Z]{2,3}-\d{4})/i);
  return match ? match[1].toUpperCase() : sku.toUpperCase();
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
  // Mapa reverso: descrição (uppercase) → código EQ para resolver fitas LED BAR sem moduloLedCode
  const reverseDescMap = new Map<string, string>();
  if (descMap) {
    descMap.forEach((desc, code) => {
      if (code.startsWith("EQ") && desc) {
        reverseDescMap.set(desc.toUpperCase().trim(), code);
      }
    });
  }

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
      for (const seg of item.profileSegments) {
        // 1. Perfil em metros — AGRUPADO POR CÓDIGO-BASE
        if (seg.sku && seg.lengthMm > 0) {
          const totalMetros = (seg.qty * seg.lengthMm / 1000) * itemQty;
          const perfilBase = extractPerfilBase(seg.sku);
          add(perfilBase, perfilBase, totalMetros, "m", "PERFIS");
        }

        // 2. Módulo LED (Stripflex/Stripline) — contabilizado por UNIDADE
        let ledCode = (seg as any).ledModuleCode ?? "";
        // Fallback: se ledCode vazio mas item tem moduloLed, tentar resolver via reverseDescMap
        if (!ledCode && item.moduloLed) {
          ledCode = reverseDescMap.get(item.moduloLed.toUpperCase().trim()) ?? "";
        }
        if (ledCode) {
          // Cada barra é 1 unidade de módulo LED
          const totalUnidades = seg.qty * seg.barsPerPiece * itemQty;
          // Para 36W Stripflex dupla: barras × 2 (fileira dupla)
          const isStripflexDupla = item.stripMethod === "STRIPFLEX" && (item.power === "36" || item.power === "36W");
          const finalUnidades = isStripflexDupla ? totalUnidades * 2 : totalUnidades;
          // Usar SEMPRE a descrição canônica da API pelo código EQ
          const barName = descMap?.get(ledCode) ?? item.moduloLed ?? "";
          if (!barName) continue;
          add(ledCode, barName, finalUnidades, "un", "MÓDULOS LED");
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

    // ── MÓDULO LED (fonte de luz) para itens com driverLines ─────────────
    // Downlights, spots, painéis e arandelas salvam o módulo LED em item.moduloLed
    // (campo preenchido ao adicionar ao carrinho). Adicionar à lista de materiais
    // como FONTES DE LUZ, agrupado pelo código EQ (moduloLedCode).
    // IMPORTANTE: itens de perfil (profileSegments) já contam o módulo LED via
    // profileSegments[].ledModuleCode — não contar novamente aqui para evitar duplicata.
    const hasProfileSegments = item.profileSegments && item.profileSegments.length > 0;
    if (!hasProfileSegments && item.driverLines && item.driverLines.length > 0 && item.moduloLed) {
      const ledCode =
        item.moduloLedCode ??
        reverseDescMap.get(item.moduloLed.toUpperCase().trim()) ??
        `MODULO_${item.moduloLed}`;
      add(ledCode, item.moduloLed, itemQty, "un", "MÓDULOS LED");
    }

    // ── LED BAR ──────────────────────────────────────────────────────────
    if (item.category === "LED BAR" && item.ledBarNCortes !== undefined) {
      // LED BAR como PERFIL: contabilizar metragem do perfil agrupado por código-base
      if (item.sku && item.ledBarComprimentoTotalMm) {
        const totalMetros = (item.ledBarComprimentoTotalMm / 1000) * itemQty;
        const perfilBase = extractPerfilBase(item.sku);
        add(perfilBase, perfilBase, totalMetros, "m", "PERFIS");
      }

      // Driver do LED BAR
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

      // Fita LED do LED BAR: unificar por código EQ da fita (vindo da API)
      if (item.moduloLed && item.ledBarComprimentoTotalMm) {
        const totalMetros = (item.ledBarComprimentoTotalMm / 1000) * itemQty;
        // Resolver código EQ: 1) moduloLedCode do item, 2) reverseDescMap pela descrição, 3) fallback descrição
        const fitaCode = item.moduloLedCode
          ?? reverseDescMap.get(item.moduloLed.toUpperCase().trim())
          ?? `FITA_LEDBAR_${item.moduloLed}`;
        add(fitaCode, item.moduloLed, totalMetros, "m", "FITAS LED");
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
