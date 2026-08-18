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
 * - Fitas LED (somente itens com "FITA LED" na descrição, ex: EQ00586) são medidas em METROS (m)
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
  /** Números dos itens do pedido que usam este material */
  sourceItems: number[];
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

  // Fitas LED: SOMENTE itens com "FITA LED" na descrição (ex: EQ00586 "FITA LED 2835...")
  // Stripflex/Stripline NÃO são fitas — são módulos LED
  if (
    (d.includes("FITA") && d.includes("LED")) &&
    !d.includes("STRIPFLEX") &&
    !d.includes("STRIPLINE") &&
    !d.includes("STRIPLUX")
  ) {
    return "FITAS LED";
  }

  // Módulos LED: Stripflex, Stripline, Striplux, módulo LED, barra LED, Lux Round, etc.
  // Todos medidos em UNIDADES (un), nunca em metros
  if (
    d.includes("STRIPFLEX") ||
    d.includes("STRIPLINE") ||
    d.includes("STRIPLUX") ||
    d.includes("MÓDULO LED") ||
    d.includes("MODULO LED") ||
    d.includes("MÓDULO LUX") ||
    d.includes("MODULO LUX") ||
    (d.includes("LED") && (d.includes("BARRA") || d.includes("BAR"))) ||
    d.includes("TRACE") ||
    d.includes("COB")
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

  // Suportes / Holders
  if (
    d.includes("SUPORTE") ||
    d.includes("BRACKET") ||
    d.includes("FIXAÇÃO") ||
    d.includes("FIXACAO") ||
    d.includes("CLIP") ||
    d.includes("TRILHO") ||
    d.includes("HOLDER")
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
  // Mapa reverso: descrição (uppercase) → código EQ para resolver itens sem moduloLedCode
  const reverseDescMap = new Map<string, string>();
  if (descMap) {
    descMap.forEach((desc, code) => {
      if ((code.startsWith("EQ") || code.startsWith("CP") || code.startsWith("PT")) && desc) {
        const normalized = desc.toUpperCase().trim().replace(/\s+/g, " ");
        reverseDescMap.set(normalized, code);
      }
    });
  }

  /**
   * Normaliza string para busca fuzzy: remove caracteres especiais,
   * unifica variações de diâmetro (Ø80MM → 80MM, D80MM → 80MM),
   * e remove códigos de fornecedor entre parênteses (PT...).
   */
  function normForSearch(s: string): string {
    return s
      .replace(/\s*\((PT|P|REF)\d+\)\s*/gi, " ") // Remove (PTxxxxx)
      .replace(/\s*\((EQ|CP)\d+\)\s*/gi, " ") // Remove (EQxxxxx)
      .replace(/Ø(\d)/g, "$1") // Ø80MM → 80MM
      .replace(/\bD(\d+\s*MM)/gi, "$1") // D80MM → 80MM
      .replace(/[^A-Z0-9\s\/\-\.]/g, "") // Remove caracteres especiais restantes
      .replace(/\s+/g, " ")
      .trim();
  }

  function resolveEqFromDesc(rawDesc: string): string | null {
    if (!rawDesc) return null;
    const normalized = rawDesc.toUpperCase().trim().replace(/\s+/g, " ");
    // 1. Busca exata
    const exact = reverseDescMap.get(normalized);
    if (exact) return exact;
    // 2. Remover código EQ entre parênteses no final (ex: "STRIPFLEX ... (EQ00125)" → "STRIPFLEX ...")
    const withoutEqSuffix = normalized.replace(/\s*\([A-Z]{2}\d+\)\s*$/, "").trim();
    if (withoutEqSuffix !== normalized) {
      const fromNoEq = reverseDescMap.get(withoutEqSuffix);
      if (fromNoEq) return fromNoEq;
    }
    // 3. Extrair código EQ diretamente se presente na string — APENAS EQ e CP (não PT)
    const eqMatch = rawDesc.match(/\((EQ\d+|CP\d+)\)/i);
    if (eqMatch) return eqMatch[1].toUpperCase();
    // 4. Busca normalizada (fuzzy): remove PT, Ø/D antes de números, etc.
    const inputNorm = normForSearch(normalized);
    for (const [key, code] of Array.from(reverseDescMap.entries())) {
      const keyNorm = normForSearch(key);
      if (keyNorm === inputNorm) return code;
    }
    // 5. Busca parcial normalizada: verificar se uma contém a outra
    for (const [key, code] of Array.from(reverseDescMap.entries())) {
      const keyNorm = normForSearch(key);
      if (keyNorm.includes(inputNorm) || inputNorm.includes(keyNorm)) {
        return code;
      }
    }
    // 6. Busca por tokens em comum: se 80%+ dos tokens coincidem (ignora ordem)
    const inputTokens = new Set(inputNorm.split(/[\s\-\/]+/).filter(t => t.length > 1));
    let bestMatch: string | null = null;
    let bestScore = 0;
    for (const [key, code] of Array.from(reverseDescMap.entries())) {
      const keyNorm = normForSearch(key);
      const keyTokens = new Set(keyNorm.split(/[\s\-\/]+/).filter(t => t.length > 1));
      // Contar tokens em comum
      let common = 0;
      for (const t of Array.from(inputTokens)) {
        if (keyTokens.has(t)) common++;
      }
      const maxLen = Math.max(inputTokens.size, keyTokens.size);
      if (maxLen === 0) continue;
      const score = common / maxLen;
      if (score > bestScore && score >= 0.8) {
        bestScore = score;
        bestMatch = code;
      }
    }
    if (bestMatch) return bestMatch;
    return null;
  }

  // Map: codigo → MaterialEntry
  const map = new Map<string, MaterialEntry>();

  function add(
    codigo: string,
    descricao: string,
    qty: number,
    unidade: "un" | "m",
    tipo?: MaterialTipo,
    itemNumber?: number
  ) {
    if (!codigo || !descricao || qty <= 0) return;
    // Usar descrição canônica da API se disponível
    const canonicalDesc = descMap?.get(codigo) ?? descricao;
    const resolvedTipo = tipo ?? detectTipo(canonicalDesc, codigo);
    const key = `${codigo}||${unidade}`;
    const existing = map.get(key);
    if (existing) {
      const newSourceItems = itemNumber != null && !existing.sourceItems.includes(itemNumber)
        ? [...existing.sourceItems, itemNumber]
        : existing.sourceItems;
      map.set(key, { ...existing, qty: existing.qty + qty, sourceItems: newSourceItems });
    } else {
      map.set(key, { codigo, descricao: canonicalDesc, qty, unidade, tipo: resolvedTipo, sourceItems: itemNumber != null ? [itemNumber] : [] });
    }
  }

  for (const item of items) {
    // Ignorar itens sem categoria ou "Não Orçamos"
    if (!item.category || item.category === "Não Orçamos") continue;

    const itemQty = item.qty ?? 1;
    // Número do item no pedido (1-based, baseado na posição no array + 1)
    const itemIdx = items.indexOf(item) + 1;

    // ── PERFIS: profileSegments ──────────────────────────────────────────
    if (item.profileSegments && item.profileSegments.length > 0) {
      for (const seg of item.profileSegments) {
        // 1. Perfil em metros — AGRUPADO POR CÓDIGO-BASE
        if (seg.sku && seg.lengthMm > 0) {
          const totalMetros = (seg.qty * seg.lengthMm / 1000) * itemQty;
          const perfilBase = extractPerfilBase(seg.sku);
          add(perfilBase, perfilBase, totalMetros, "m", "PERFIS", itemIdx);
        }

        // 2. Módulo LED (Stripflex/Stripline/Fita LED/Lux Round)
        // O tipo e unidade são determinados automaticamente pela descrição:
        //   - FITAS LED (somente "FITA LED" na descrição, ex: EQ00586): unidade = "m", qty em metros
        //   - MÓDULOS LED (Stripflex, Stripline, Lux Round, etc.): unidade = "un", qty em unidades
        let ledCode = (seg as any).ledModuleCode ?? "";
        // Fallback: se ledCode vazio, tentar resolver via resolveEqFromDesc
        if (!ledCode && item.moduloLed) {
          ledCode = resolveEqFromDesc(item.moduloLed) ?? "";
        }
        if (ledCode) {
          // Usar SEMPRE a descrição canônica da API pelo código EQ
          const barName = descMap?.get(ledCode) ?? item.moduloLed ?? "";
          if (!barName) continue;
          const ledTipo = detectTipo(barName, ledCode);

          if (ledTipo === "FITAS LED") {
            // Fitas LED: contabilizar em METROS (comprimento do perfil = comprimento da fita)
            // Cada peça tem barsPerPiece fitas, cada uma com comprimento seg.lengthMm
            const totalBarras = seg.qty * seg.barsPerPiece * itemQty;
            const isStripflexDupla = item.stripMethod === "STRIPFLEX" && (item.power === "36" || item.power === "36W");
            const finalBarras = isStripflexDupla ? totalBarras * 2 : totalBarras;
            // Cada barra de fita cobre o comprimento do perfil (seg.lengthMm)
            const totalMetros = finalBarras * (seg.lengthMm / 1000);
            add(ledCode, barName, totalMetros, "m", "FITAS LED", itemIdx);
          } else {
            // Módulos LED (Lux Round, etc.): contabilizar em UNIDADES
            const totalUnidades = seg.qty * seg.barsPerPiece * itemQty;
            const isStripflexDupla = item.stripMethod === "STRIPFLEX" && (item.power === "36" || item.power === "36W");
            const finalUnidades = isStripflexDupla ? totalUnidades * 2 : totalUnidades;
            add(ledCode, barName, finalUnidades, "un", ledTipo, itemIdx);
          }
        }

        // 3. Driver
        if (seg.driverCode && seg.driverCode !== "ERRO" && !seg.driverModel.includes(" + ")) {
          const totalDrivers = seg.qty * seg.driverQtyPerPiece * itemQty;
          const correnteSuffix = seg.corrente ? ` - PROG: ${seg.corrente}` : "";
          add(seg.driverCode, `${seg.driverModel}${correnteSuffix}`, totalDrivers, "un", "DRIVERS", itemIdx);
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
              add(drvCode, drvModel, totalDrivers, "un", "DRIVERS", itemIdx);
            }
          }
        }
      }
    }

    // Componentes internos do perfil, persistidos separadamente para não
    // aparecerem na ficha de produção. O SHIFT usa este caminho para o seu
    // módulo LED único, sem CCT, mantendo o código e a quantidade da API.
    if (item.profileSegments && item.profileMaterialComponents && item.profileMaterialComponents.length > 0) {
      for (const component of item.profileMaterialComponents) {
        if (!component.codigo) continue;
        const canonicalDesc = descMap?.get(component.codigo) ?? component.descricao;
        add(component.codigo, canonicalDesc, component.qty * itemQty, "un", detectTipo(canonicalDesc, component.codigo), itemIdx);
      }
    }

    // ── LUMINÁRIAS COM driverLines (downlights, painéis, spots) ──────────
    // Apenas para itens SEM profileSegments (perfis já contabilizam drivers via seg.driverCode)
    const hasProfileSegs = item.profileSegments && item.profileSegments.length > 0;
    const isLedBarItem = item.category === "LED BAR";
    if (!item.withoutEquipment && !hasProfileSegs && !isLedBarItem && item.driverLines && item.driverLines.length > 0) {
      for (const dl of item.driverLines) {
        if (!dl.driverCode) continue;
        const qtyPerUnit = item.driverLines.length === 1 && item.driverQtyPerUnit != null
          ? item.driverQtyPerUnit
          : (itemQty > 0 ? dl.driverQty / itemQty : dl.driverQty);
        const totalDrivers = qtyPerUnit * itemQty;
        const isDriverFonte = dl.driverModel.toUpperCase().includes("FONTE 24V");
        const tipo: MaterialTipo = isDriverFonte ? "FONTES DE TENSÃO" : "DRIVERS";
        const correnteSuffix = dl.corrente && !isDriverFonte ? ` - PROG: ${dl.corrente}` : "";
        add(dl.driverCode, `${dl.driverModel}${correnteSuffix}`, totalDrivers, "un", tipo, itemIdx);
      }
    }

    // ── COMPONENTES (fonte de luz) para itens com driverLines ─────────────
    // Downlights, spots, painéis e arandelas salvam TODOS os componentes no campo
    // item.moduloLed concatenados com " + " como separador. Exemplo:
    //   "MÓDULO LED LUX ROUND 7W 3000K (EQ00123) + LENTE 24° (EQ00456) + HOLDER (EQ00789) + DISSIPADOR (EQ00999)"
    // Cada componente é extraído individualmente com seu código EQ/CP e adicionado
    // à requisição de materiais com o tipo correto (MÓDULOS LED, LENTES, DISSIPADORES, SUPORTES).
    //
    // IMPORTANTE: itens de perfil (profileSegments) já contam o módulo LED via
    // profileSegments[].ledModuleCode — não contar novamente aqui para evitar duplicata.
    const hasProfileSegments = item.profileSegments && item.profileSegments.length > 0;
    const isLedBar = item.category === "LED BAR";
    const hasModuloLedComponents = !item.withoutEquipment && !hasProfileSegments && !isLedBar && item.moduloLed;
    if (hasModuloLedComponents) {
      // Separar componentes pelo " + " e processar cada um individualmente
      const componentParts = item.moduloLed!.split(" + ").map(p => p.trim()).filter(Boolean);

      for (let partIdx = 0; partIdx < componentParts.length; partIdx++) {
        const rawPart = componentParts[partIdx];

        // Extrair quantidade prefixada (ex: "2x MÓDULO LED..." → qty=2)
        const qtyPrefixMatch = rawPart.match(/^(\d+)x\s+/i);
        const componentQtyPerUnit = qtyPrefixMatch ? parseInt(qtyPrefixMatch[1], 10) : 1;
        const partWithoutQty = qtyPrefixMatch ? rawPart.slice(qtyPrefixMatch[0].length) : rawPart;

        // Extrair código EQ/CP entre parênteses (ex: "(EQ00123)" ou "(CP00456)")
        const codeMatch = partWithoutQty.match(/\((EQ\d+|CP\d+)\)\s*$/i);
        let componentCode: string | null = codeMatch ? codeMatch[1].toUpperCase() : null;
        const descWithoutCode = codeMatch
          ? partWithoutQty.slice(0, partWithoutQty.lastIndexOf("(")).trim()
          : partWithoutQty.trim();

        // Para o primeiro componente, usar moduloLedCode como preferência (mais confiável)
        if (partIdx === 0 && item.moduloLedCode) {
          componentCode = item.moduloLedCode;
        }

        // Se não encontrou código, tentar resolver via descrição
        if (!componentCode) {
          componentCode = resolveEqFromDesc(descWithoutCode);
        }

        // Se ainda não tem código, pular (não podemos adicionar sem código)
        if (!componentCode) continue;

        // Usar descrição canônica da API quando disponível
        const canonicalDesc = descMap?.get(componentCode) ?? descWithoutCode;
        const componentTipo = detectTipo(canonicalDesc, componentCode);

        if (componentTipo === "FITAS LED") {
          // Fitas LED em luminárias: contabilizar em METROS
          const lengthMatch = item.description?.match(/(\d+)\s*mm/i);
          const lengthMm = lengthMatch ? parseInt(lengthMatch[1], 10) : 0;
          if (lengthMm > 0) {
            const totalMetros = (lengthMm / 1000) * componentQtyPerUnit * itemQty;
            add(componentCode, canonicalDesc, totalMetros, "m", "FITAS LED", itemIdx);
          } else {
            add(componentCode, canonicalDesc, componentQtyPerUnit * itemQty, "un", "FITAS LED", itemIdx);
          }
        } else {
          // Módulos LED, Lentes, Dissipadores, Suportes, etc.: contabilizar em UNIDADES
          add(componentCode, canonicalDesc, componentQtyPerUnit * itemQty, "un", componentTipo, itemIdx);
        }
      }
    }

    // ── LED BAR ──────────────────────────────────────────────────────────
    if (item.category === "LED BAR" && item.ledBarNCortes !== undefined) {
      // LED BAR como PERFIL: contabilizar metragem do perfil agrupado por código-base
      if (item.sku && item.ledBarComprimentoTotalMm) {
        const totalMetros = (item.ledBarComprimentoTotalMm / 1000) * itemQty;
        const perfilBase = extractPerfilBase(item.sku);
        add(perfilBase, perfilBase, totalMetros, "m", "PERFIS", itemIdx);
      }

      // Driver do LED BAR
      if (item.ledBarDriverCode && item.ledBarDriverModel) {
        const nCortes = item.ledBarNCortes ?? 1;
        add(
          item.ledBarDriverCode,
          item.ledBarDriverModel,
          nCortes * itemQty,
          "un",
          "FONTES DE TENSÃO",
          itemIdx
        );
      }

      // Fita LED do LED BAR: unificar por código EQ da fita (vindo da API)
      if (item.moduloLed && item.ledBarComprimentoTotalMm) {
        const totalMetros = (item.ledBarComprimentoTotalMm / 1000) * itemQty;
        // Resolver código EQ: 1) moduloLedCode do item, 2) resolveEqFromDesc, 3) fallback descrição
        const fitaCode = item.moduloLedCode
          ?? resolveEqFromDesc(item.moduloLed)
          ?? item.moduloLed; // fallback: usar descrição como código (sem prefixo)
        add(fitaCode, item.moduloLed, totalMetros, "m", "FITAS LED", itemIdx);
      }
    }

    // ── ITEM ESPECIAL: specialEquipments ─────────────────────────────────
    const isSpecialItemCheck = item.isSpecialItem || item.category === "Item Especial" || (item.category ?? "").toLowerCase() === "especial";
    if (isSpecialItemCheck && item.specialEquipments && item.specialEquipments.length > 0) {
      for (const eq of item.specialEquipments) {
        if (!eq.codigo) continue;
        const tipo = detectTipo(eq.descricao, eq.codigo);
        add(eq.codigo, eq.descricao, eq.qty * itemQty, "un", tipo, itemIdx);
      }
    }

    // ── ACESSÓRIOS VINCULADOS ─────────────────────────────────────────────
    if (item.accessories && item.accessories.length > 0) {
      for (const acc of item.accessories) {
        if (!acc.codigo) continue;
        const tipo = detectTipo(acc.descricao, acc.codigo);
        // Acessórios do carrinho são quantificados por luminária. Já os
        // acessórios inseridos no gerenciamento do pedido de fábrica são
        // preenchidos como quantidade total do pedido e não podem ser
        // multiplicados novamente por item.qty.
        const materialQty = acc.quantityScope === "order_total"
          ? acc.qty
          : acc.qty * itemQty;
        add(acc.codigo, acc.descricao, materialQty, "un", tipo, itemIdx);
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
