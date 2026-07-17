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
 * - itemEmPlanta = "L05 - Térreo, L05 - 1º Andar" (etiqueta + pavimento de cada item original)
 * - accessories = acessórios somados (mesmos códigos têm qtys somadas)
 */

import type { CartItemData, LinkedAccessory } from "./cartTypes";

/** Tipo interno para acumular etiquetas durante o agrupamento */
type GroupedItem = CartItemData & { _groupEtiquetas: string[] };

/**
 * Gera uma chave de agrupamento para um item.
 * Itens com a mesma chave são considerados tecnicamente idênticos e podem ser agrupados.
 */
function buildGroupKey(item: CartItemData): string {
  // Itens Especiais nunca são agrupados
  if (item.isSpecialItem) {
    return `__special__${Math.random()}`; // chave única para cada especial
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
 * Ex: itemEmPlanta="L05", floorName="Térreo" → "L05 - Térreo"
 * Se não houver etiqueta nem pavimento, retorna string vazia.
 */
function formatEtiquetaComPavimento(item: CartItemData): string {
  const etiqueta = item.itemEmPlanta?.trim() ?? "";
  const pavimento = item.floorName?.trim() ?? "";
  if (etiqueta && pavimento) return `${etiqueta} - ${pavimento}`;
  if (etiqueta) return etiqueta;
  if (pavimento) return pavimento;
  return "";
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
 *          e itemEmPlanta concatenando etiqueta + pavimento de cada item original.
 */
export function groupOrderItems(items: CartItemData[]): CartItemData[] {
  const groups = new Map<string, GroupedItem>();
  const order: string[] = []; // preserva a ordem de aparecimento

  for (const item of items) {
    const key = buildGroupKey(item);

    if (!groups.has(key)) {
      // Primeiro item deste grupo: clonar e registrar
      const etiqueta = formatEtiquetaComPavimento(item);
      groups.set(key, {
        ...item,
        itemEmPlanta: etiqueta,
        _groupEtiquetas: etiqueta ? [etiqueta] : [],
      });
      order.push(key);
    } else {
      // Item igual já existe: somar qty, concatenar etiqueta, mesclar acessórios
      const existing = groups.get(key)!;
      const etiqueta = formatEtiquetaComPavimento(item);

      const newEtiquetas = etiqueta
        ? [...existing._groupEtiquetas, etiqueta]
        : existing._groupEtiquetas;

      groups.set(key, {
        ...existing,
        qty: existing.qty + item.qty,
        itemEmPlanta: newEtiquetas.join(", "),
        accessories: mergeAccessories(
          existing.accessories ?? [],
          item.accessories ?? []
        ),
        _groupEtiquetas: newEtiquetas,
      });
    }
  }

  // Remover campo auxiliar _groupEtiquetas antes de retornar
  return order.map(key => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _groupEtiquetas: _unused, ...clean } = groups.get(key)!;
    return clean as CartItemData;
  });
}
