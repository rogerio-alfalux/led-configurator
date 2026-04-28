/**
 * orderSummary.ts
 * Gera o texto resumo técnico no formato da ficha de pedido Alfalux.
 *
 * Formato (por módulo/peça):
 *   [PRODUTO] [APLICAÇÃO] COM [COMPRIMENTO]MM [POTÊNCIA/M] ([SKU])
 *   MONTADO COM [BARRAS POR PEÇA] BARRAS [TIPO BARRA] [CCT] + [NX DRIVER (EQ)]
 *
 * Exemplo:
 *   BLAZE H D1 PENDENTE COM 4520MM 18W/M (LLP-6060.4IF.48F)
 *   MONTADO COM 8 BARRAS STRIPFLEX 562,5 10MM 3000K + 2X PHILIPS XITANIUM 44W 350MA (EQ00347)
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
 * Formato: "NX MODELO (EQ00XXX)"
 */
function buildDriverSummaryPerPiece(entries: SkuDriverEntry[]): string {
  const driverMap = new Map<string, { model: string; code: string; total: number }>();

  for (const e of entries) {
    // e.quantity = número de módulos na linha — NÃO usar para o resumo por peça
    if (e.driver.combo && e.driver.combo.length > 0) {
      for (const item of e.driver.combo) {
        // item.quantity já é por peça
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
      // driver.quantity = multiplicador interno por peça (ex: split D1+D2 = 2)
      const driverQtyPerPiece = e.driver.quantity ?? 1;
      const key = e.driver.code || e.driver.model.toUpperCase();
      const existing = driverMap.get(key);
      if (existing) {
        existing.total += driverQtyPerPiece;
      } else {
        driverMap.set(key, {
          model: e.driver.model.toUpperCase(),
          code: e.driver.code || "",
          total: driverQtyPerPiece,
        });
      }
    }
  }

  return Array.from(driverMap.values())
    .map((d) => {
      const eqSuffix = d.code && d.code !== "ERRO" ? ` (${d.code})` : "";
      return `${d.total}X ${d.model}${eqSuffix}`;
    })
    .join(" + ");
}

/**
 * Gera o texto resumo para uma linha de pedido no formato da ficha Alfalux.
 * Barras e drivers são POR MÓDULO (por peça), não totais da linha.
 * Para D1+D2 independente, retorna duas linhas (uma para D1, outra para D2).
 */
export function generateOrderSummary(result: CompositionResult): string {
  const installLabel = INSTALL_LABELS_PT[result.installType] ?? result.installType;
  const productName = result.profileName.toUpperCase();
  const lengthMM = result.realizedLength;
  const cct = result.cct;

  // Nome da barra (tipo + dimensões)
  const barTypeName =
    result.stripMethod === "STRIPFLEX"
      ? "BARRAS STRIPFLEX 562,5 10MM"
      : "BARRAS STRIPLINE 562,5 15MM";

  const isDual = result.application === "D1+D2";
  const isIndependent = isDual && (result.independentLighting || result.forcedIndependent);

  // SKU principal da composição (primeiro item)
  const mainSku = result.composition.length > 0 ? result.composition[0].sku : "";
  const skuSuffix = mainSku ? ` (${mainSku})` : "";

  if (!isDual || !isIndependent) {
    // ── Caso simples: D1, D2 ou D1+D2 conjunto ──
    const powerLabel = isDual
      ? `${result.powerD1}W/M + ${result.powerD2}W/M`
      : `${result.powerD1}W/M`;

    // Barras por peça: usar barsPerPiece do primeiro entry de drivers
    const driverEntries =
      isDual && !isIndependent && result.combinedDrivers
        ? result.combinedDrivers
        : result.driversD1;

    // barsPerPiece já está em SkuDriverEntry — pegar do primeiro entry
    const barsPerPiece = driverEntries.length > 0 ? driverEntries[0].barsPerPiece : 0;

    const driverSummary = buildDriverSummaryPerPiece(driverEntries);

    const line1 = `${productName} ${installLabel} COM ${lengthMM}MM ${powerLabel}${skuSuffix}`;
    const line2 = `MONTADO COM ${fmtBR(barsPerPiece)} ${barTypeName} ${cct} + ${driverSummary}`;
    return `${line1}\n${line2}`;
  }

  // ── D1+D2 Independente: duas linhas ──
  const powerD1 = result.powerD1;
  const powerD2 = result.powerD2;

  const barsPerPieceD1 = result.driversD1.length > 0 ? result.driversD1[0].barsPerPiece : 0;
  const barsPerPieceD2 = result.driversD2.length > 0 ? result.driversD2[0].barsPerPiece : 0;

  const driverSummaryD1 = buildDriverSummaryPerPiece(result.driversD1);
  const driverSummaryD2 = buildDriverSummaryPerPiece(result.driversD2);

  const lineD1_1 = `${productName} ${installLabel} D1 COM ${lengthMM}MM ${powerD1}W/M${skuSuffix}`;
  const lineD1_2 = `MONTADO COM ${fmtBR(barsPerPieceD1)} ${barTypeName} ${cct} + ${driverSummaryD1}`;

  const lineD2_1 = `${productName} ${installLabel} D2 COM ${lengthMM}MM ${powerD2}W/M${skuSuffix}`;
  const lineD2_2 = `MONTADO COM ${fmtBR(barsPerPieceD2)} ${barTypeName} ${cct} + ${driverSummaryD2}`;

  return `${lineD1_1}\n${lineD1_2}\n\n${lineD2_1}\n${lineD2_2}`;
}
