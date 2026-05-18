/**
 * orderSummary.ts
 * Gera o texto resumo técnico no formato da ficha de pedido Alfalux.
 *
 * Um bloco por tipo de módulo (SKU), com quantidade na frente:
 *
 *   Item 1
 *   2 x BLAZE H PENDENTE COM 2260MM 18W/M (LLP-6060.4IF.48F)
 *   MONTADO COM 4 BARRAS STRIPFLEX 562,5 10MM 3000K + 1X PHILIPS XITANIUM 44W 350MA (EQ00347)
 *
 *   Item 2
 *   1 x BLAZE H PENDENTE COM 1950MM 18W/M (LLP-6060.1IN.48F)
 *   MONTADO COM 3,4 BARRAS STRIPFLEX 562,5 10MM 3000K + 1X PHILIPS XITANIUM 65W 350MA (EQ00393)
 */

import type { CompositionResult, SkuDriverEntry } from "./ledEngine";

const INSTALL_LABELS_PT: Record<string, string> = {
  EMBUTIR: "DE EMBUTIR",
  SOBREPOR: "DE SOBREPOR",
  PENDENTE: "PENDENTE",
};

/** Formata número com vírgula decimal no estilo BR, sem zeros desnecessários */
function fmtBR(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return rounded.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

/**
 * Constrói a lista de drivers POR PEÇA para exibição no resumo.
 * Usa driver.quantity e combo[i].quantity — que já são por peça individual.
 * NÃO multiplica por e.quantity (que é o número de módulos na linha).
 */
function buildDriverSummaryPerPiece(entries: SkuDriverEntry[], sku: string): string {
  // Filtrar apenas o entry do SKU específico
  const entry = entries.find((e) => e.sku === sku);
  if (!entry) return "";

  const driverMap = new Map<string, { model: string; code: string; total: number }>();

  if (entry.driver.combo && entry.driver.combo.length > 0) {
    for (const item of entry.driver.combo) {
      const key = item.code || item.model.toUpperCase();
      const existing = driverMap.get(key);
      if (existing) {
        existing.total += item.quantity;
      } else {
        driverMap.set(key, {
          model: item.model.toUpperCase(),
          code: item.code || "",
          total: item.quantity,
        });
      }
    }
  } else {
    const driverQtyPerPiece = entry.driver.quantity ?? 1;
    const key = entry.driver.code || entry.driver.model.toUpperCase();
    driverMap.set(key, {
      model: entry.driver.model.toUpperCase(),
      code: entry.driver.code || "",
      total: driverQtyPerPiece,
    });
  }

  return Array.from(driverMap.values())
    .map((d) => {
      const eqSuffix = d.code && d.code !== "ERRO" ? ` (${d.code})` : "";
      return `${d.total}X ${d.model}${eqSuffix}`;
    })
    .join(" + ");
}

/**
 * Gera o texto resumo para todos os módulos da composição, um bloco por SKU.
 * Para D1+D2 independente, cada bloco tem duas sub-linhas (D1 e D2).
 */
export function generateOrderSummary(result: CompositionResult): string {
  const installLabel = INSTALL_LABELS_PT[result.installType] ?? result.installType;
  const productName = result.profileName.toUpperCase();
  const cct = result.cct;

  const barTypeName =
    result.stripMethod === "STRIPFLEX"
      ? "BARRAS STRIPFLEX 562,5 10MM"
      : "BARRAS STRIPLINE 562,5 15MM";

  const isDual = result.application === "D1+D2";
  const isIndependent = isDual && (result.independentLighting || result.forcedIndependent);

  // Rótulo de aplicação — exibir apenas para PENDENTE e ARANDELA
  const showApplication = result.installType === "PENDENTE" || result.installType === "ARANDELA";
  const applicationLabel = showApplication
    ? isDual
      ? "D1 + D2"
      : result.application === "D2"
      ? "D2"
      : "D1"
    : "";

  // Sufixo de acendimento — apenas quando D1+D2 em Pendente ou Arandela
  const acendimentoSuffix =
    isDual && showApplication
      ? isIndependent
        ? " - Acendimento Independente"
        : " - Acendimento Simultâneo"
      : "";

  // Construir mapa de SKUs únicos preservando a ordem da composição
  const skuOrder: string[] = [];
  const skuMap = new Map<string, { length: number; quantity: number; barsPerPiece: number }>();

  for (const item of result.composition) {
    if (!skuMap.has(item.sku)) {
      skuOrder.push(item.sku);
      skuMap.set(item.sku, {
        length: item.length,
        quantity: item.quantity,
        barsPerPiece: item.barsPerModule,
      });
    }
  }

  // Para D1+D2 simultâneo, barsPerPiece deve ser dobrado (já está em barsPerPiece do SkuDriverEntry)
  // Usar barsPerPiece do SkuDriverEntry quando disponível (mais preciso)
  const driverEntriesD1 =
    isDual && !isIndependent && result.combinedDrivers
      ? result.combinedDrivers
      : result.driversD1;

  // Driver DIM DALI / DIM 1-10V: substitui o driver ON/OFF no texto do pedido
  const isDimControl = result.controlType !== "onoff" && result.driverDimSelected;
  const dimDriverLabel = isDimControl
    ? `1X ${result.driverDimSelected!.model.toUpperCase()}${
        result.driverDimSelected!.code ? ` (${result.driverDimSelected!.code})` : ""
      }`
    : null;

  const blocks: string[] = [];

  skuOrder.forEach((sku, index) => {
    const info = skuMap.get(sku)!;
    const itemLabel = `Item ${index + 1}`;

    // barsPerPiece: preferir o valor do SkuDriverEntry (já considera D1+D2 simultâneo)
    const d1Entry = driverEntriesD1.find((e) => e.sku === sku);
    const barsPerPiece = d1Entry ? d1Entry.barsPerPiece : info.barsPerPiece;

    const qty = info.quantity;
    const qtyPrefix = qty > 1 ? `${qty} x ` : `1 x `;

    if (!isIndependent) {
      // ── D1 simples ou D1+D2 conjunto ──
      const powerLabel = isDual
        ? `${result.powerD1}W/M + ${result.powerD2}W/M`
        : `${result.powerD1}W/M`;

      // Usar driver DIM quando selecionado, senão usar driver ON/OFF dimensional
      const driverSummary = dimDriverLabel ?? buildDriverSummaryPerPiece(driverEntriesD1, sku);

      const appPart = applicationLabel ? ` ${applicationLabel}` : "";
      const line1 = `${qtyPrefix}${productName}${appPart} ${installLabel} COM ${info.length}MM ${powerLabel} (${sku})`;
      const line2 = `MONTADO COM ${fmtBR(barsPerPiece)} ${barTypeName} ${cct} + ${driverSummary}${acendimentoSuffix}`;
      blocks.push(`${itemLabel}\n${line1}\n${line2}`);
    } else {
      // ── D1+D2 Independente: bloco único com barras e drivers somados (D1 + D2) ──
      const d2Entry = result.driversD2.find((e) => e.sku === sku);
      const barsPerPieceD2 = d2Entry ? d2Entry.barsPerPiece : info.barsPerPiece;
      const totalBars = barsPerPiece + barsPerPieceD2;

      // Somar drivers D1 e D2 por modelo/código
      const combinedDriverMap = new Map<string, { model: string; code: string; total: number }>();
      const addDriversToMap = (entries: typeof result.driversD1) => {
        const entry = entries.find((e) => e.sku === sku);
        if (!entry) return;
        if (entry.driver.combo && entry.driver.combo.length > 0) {
          for (const item of entry.driver.combo) {
            const key = item.code || item.model.toUpperCase();
            const existing = combinedDriverMap.get(key);
            if (existing) existing.total += item.quantity;
            else combinedDriverMap.set(key, { model: item.model.toUpperCase(), code: item.code || "", total: item.quantity });
          }
        } else {
          const qty = entry.driver.quantity ?? 1;
          const key = entry.driver.code || entry.driver.model.toUpperCase();
          const existing = combinedDriverMap.get(key);
          if (existing) existing.total += qty;
          else combinedDriverMap.set(key, { model: entry.driver.model.toUpperCase(), code: entry.driver.code || "", total: qty });
        }
      };
      addDriversToMap(result.driversD1);
      addDriversToMap(result.driversD2);

      const combinedDriverSummary = Array.from(combinedDriverMap.values())
        .map((d) => {
          const eqSuffix = d.code && d.code !== "ERRO" ? ` (${d.code})` : "";
          return `${d.total}X ${d.model}${eqSuffix}`;
        })
        .join(" + ");

      const powerLabel = `${result.powerD1}W/M + ${result.powerD2}W/M`;
      const line1 = `${qtyPrefix}${productName} D1 + D2 ${installLabel} COM ${info.length}MM ${powerLabel} (${sku})`;
      const line2 = `MONTADO COM ${fmtBR(totalBars)} ${barTypeName} ${cct} + ${combinedDriverSummary}${acendimentoSuffix}`;
      blocks.push(`${itemLabel}\n${line1}\n${line2}`);
    }
  });

  return blocks.join("\n\n");
}
