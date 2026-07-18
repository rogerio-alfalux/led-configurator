/**
 * orderGrouping.ts
 * Agrupa itens idênticos do pedido de fábrica para facilitar a produção.
 *
 * Dois itens são considerados "iguais" quando compartilham os mesmos dados técnicos
 * (produto, SKU, CCT, cor da peça, drivers, módulo LED, segmentos de perfil etc.).
 * Itens Especiais NUNCA são agrupados — cada um é único.
 *
 * Resultado do agrupamento:
 * - qty = soma das quantidades de todos os itens agrupados
 * - itemEmPlanta = uma linha por pavimento, com quantidade:
 *     "L05 - 1°PAV = 05 pçs\nL05 - 2°PAV = 06 pçs\nL05 - 3°PAV = 02 pçs"
 * - accessories = acessórios somados (mesmos códigos têm qtys somadas)
 */

import type { CartItemData, LinkedAccessory } from "./cartTypes";

/** Entrada interna para acumular etiquetas e quantidades por pavimento */
interface EtiquetaEntry {
  label: string;  // "L05 - 1°PAV"
  qty: number;    // quantidade de peças nesse pavimento
}

/** Tipo interno para acumular etiquetas durante o agrupamento */
type GroupedItem = CartItemData & { _groupEntries: EtiquetaEntry[] };

/**
 * Gera uma chave de agrupamento para um item.
 * Itens com a mesma chave são considerados tecnicamente idênticos e podem ser agrupados.
 */
function buildGroupKey(item: CartItemData): string {
  // Itens Especiais: agrupar por descrição + cor + equipamentos
  // (permite agrupar BAGEO, BLAZE E etc. de múltiplos pavimentos)
  if (item.isSpecialItem) {
    const specialEquips = item.specialEquipments
      ? JSON.stringify(
          [...item.specialEquipments]
            .sort((a, b) => a.codigo.localeCompare(b.codigo))
            .map(e => ({ codigo: e.codigo, qty: e.qty }))
        )
      : "";
    return [
      "__special__",
      item.sku ?? "",
      item.description ?? "",
      item.specialDescription ?? "",
      item.corPeca ?? "",
      item.specialColor ?? "",
      item.specialPower ?? "",
      item.specialDim ?? "",
      item.specialVoltage ?? "",
      item.specialColorTemp ?? "",
      specialEquips,
    ].join("|");
  }

  // Normaliza profileSegments: ordena por sku para evitar falsos negativos por ordem
  const segments = item.profileSegments
    ? JSON.stringify(
        [...item.profileSegments].sort((a, b) => a.sku.localeCompare(b.sku)).map(s => ({
          sku: s.sku,
          qty: s.qty,
          lengthMm: s.lengthMm,
          barsPerPiece: s.barsPerPiece,
          driverQtyPerPiece: s.driverQtyPerPiece,
          driverModel: s.driverModel,
          driverCode: s.driverCode,
        }))
      )
    : "";

  // Normaliza driverLines: ordena por driverCode para evitar falsos negativos por ordem
  const driverLines = item.driverLines
    ? JSON.stringify(
        [...item.driverLines].sort((a, b) => (a.driverCode ?? "").localeCompare(b.driverCode ?? "")).map(dl => ({
          driverModel: dl.driverModel,
          driverCode: dl.driverCode,
          corrente: dl.corrente ?? null,
        }))
      )
    : "";

  return [
    item.category ?? "",
    item.sku ?? "",
    item.description ?? "",
    item.cct ?? "",
    item.corPeca ?? "",
    item.stripMethod ?? "",
    item.moduloLed ?? "",
    item.drivers ?? "",
    item.ledBarDriverModel ?? "",
    item.ledBarDriverCode ?? "",
    String(item.ledBarNCortes ?? ""),
    String(item.ledBarComprimentoPorTrechoMm ?? ""),
    String(item.ledBarComprimentoTotalMm ?? ""),
    segments,
    driverLines,
  ].join("|__|");
}

/**
 * Formata a etiqueta de um item com o nome do pavimento.
 * Ex: itemEmPlanta="L05", floorName="1°PAV" → "L05 - 1°PAV"
 * Se não houver etiqueta nem pavimento, retorna string vazia.
 */
function formatEtiquetaLabel(item: CartItemData): string {
  const etiqueta = item.itemEmPlanta?.trim() ?? "";
  const pavimento = item.floorName?.trim() ?? "";
  if (etiqueta && pavimento) return `${etiqueta} - ${pavimento}`;
  if (etiqueta) return etiqueta;
  if (pavimento) return pavimento;
  return "";
}

/**
 * Formata a string final de etiquetas para exibição no Excel/preview.
 * Cada pavimento em uma linha, com quantidade formatada:
 *   "L05 - 1°PAV = 05 pçs\nL05 - 2°PAV = 06 pçs"
 *
 * Se houver apenas um pavimento e a quantidade for 1, exibe só a etiqueta sem "= 01 pçs".
 */
function formatEtiquetasString(entries: EtiquetaEntry[]): string {
  if (entries.length === 0) return "";
  // Se só há uma entrada e qty=1, exibir apenas o label sem quantidade
  if (entries.length === 1 && entries[0].qty === 1) {
    return entries[0].label;
  }
  return entries
    .map(e => `${e.label} = ${String(e.qty).padStart(2, "0")} pçs`)
    .join("\n");
}

/**
 * Mescla listas de acessórios: acessórios com o mesmo código têm qtys somadas.
 */
function mergeAccessories(
  a: LinkedAccessory[],
  b: LinkedAccessory[]
): LinkedAccessory[] {
  const map = new Map<string, LinkedAccessory>();
  for (const acc of [...a, ...b]) {
    const key = acc.codigo ?? acc.descricao;
    const existing = map.get(key);
    if (existing) {
      map.set(key, { ...existing, qty: existing.qty + acc.qty });
    } else {
      map.set(key, { ...acc });
    }
  }
  return Array.from(map.values());
}

/**
 * Agrupa itens idênticos do pedido de fábrica.
 *
 * @param items - Lista de itens do pedido (já filtrados, sem "Não Orçamos")
 * @returns Lista agrupada, onde itens iguais são fundidos em um único com qty somada
 *          e itemEmPlanta com uma linha por pavimento mostrando etiqueta e quantidade.
 */
export function groupOrderItems(items: CartItemData[]): CartItemData[] {
  const groups = new Map<string, GroupedItem>();
  const order: string[] = []; // preserva a ordem de aparecimento

  for (const item of items) {
    const key = buildGroupKey(item);
    const label = formatEtiquetaLabel(item);

    if (!groups.has(key)) {
      // Primeiro item deste grupo: clonar e registrar
      const entries: EtiquetaEntry[] = label ? [{ label, qty: item.qty }] : [];
      groups.set(key, {
        ...item,
        itemEmPlanta: formatEtiquetasString(entries),
        _groupEntries: entries,
      });
      order.push(key);
    } else {
      // Item igual já existe: somar qty, atualizar entradas de etiquetas, mesclar acessórios
      const existing = groups.get(key)!;

      // Verificar se já existe uma entrada para este mesmo label (mesmo pavimento)
      let newEntries: EtiquetaEntry[];
      if (label) {
        const existingEntryIdx = existing._groupEntries.findIndex(e => e.label === label);
        if (existingEntryIdx >= 0) {
          // Mesmo pavimento: somar quantidade
          newEntries = existing._groupEntries.map((e, i) =>
            i === existingEntryIdx ? { ...e, qty: e.qty + item.qty } : e
          );
        } else {
          // Novo pavimento: adicionar nova entrada
          newEntries = [...existing._groupEntries, { label, qty: item.qty }];
        }
      } else {
        newEntries = existing._groupEntries;
      }

      groups.set(key, {
        ...existing,
        qty: existing.qty + item.qty,
        itemEmPlanta: formatEtiquetasString(newEntries),
        accessories: mergeAccessories(
          existing.accessories ?? [],
          item.accessories ?? []
        ),
        _groupEntries: newEntries,
      });
    }
  }

  // Remover campo auxiliar _groupEntries antes de retornar
  return order.map(key => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _groupEntries: _unused, ...clean } = groups.get(key)!;
    return clean as CartItemData;
  });
}
