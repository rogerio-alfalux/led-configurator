/**
 * orderSummary.ts
 * Gera o texto resumo técnico no formato da ficha de pedido Alfalux.
 *
 * Formato:
 *   [PRODUTO] [APLICAÇÃO] COM APROXIMADAMENTE [COMPRIMENTO]MM [POTÊNCIA/M] (CONFORME PROJETO).
 *   MONTADO COM APROXIMADAMENTE [BARRAS TOTAIS] BARRAS [TIPO BARRA] [CCT] + [DRIVER(S)]
 *
 * Exemplos:
 *   BLAZE DE EMBUTIR COM APROXIMADAMENTE 1950MM 18W/M (CONFORME PROJETO).
 *   MONTADO COM APROXIMADAMENTE 3,4 BARRAS STRIPFLEX 562,5 10MM 3000K + APROXIMADAMENTE 1X PHILIPS XITANIUM 65W 350MA
 *
 *   HIT DE EMBUTIR COM APROXIMADAMENTE 2362MM 18W/M (CONFORME PROJETO).
 *   MONTADO COM APROXIMADAMENTE 8,4 BARRAS STRIPFLEX 562,5 10MM 4000K + APROXIMADAMENTE 2X PHILIPS XITANIUM 44W 350MA
 */

import type { CompositionResult, SkuDriverEntry } from "./ledEngine";

const INSTALL_LABELS_PT: Record<string, string> = {
  EMBUTIR: "DE EMBUTIR",
  SOBREPOR: "DE SOBREPOR",
  PENDENTE: "PENDENTE",
};

/** Formata número com vírgula decimal no estilo BR, sem zeros desnecessários */
function fmtBR(n: number): string {
  // Arredondar para 1 casa decimal
  const rounded = Math.round(n * 10) / 10;
  return rounded.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

/**
 * Constrói a lista de drivers consolidada para exibição no resumo.
 * Agrupa por modelo e soma quantidades, respeitando combos e splits.
 */
function buildDriverSummary(entries: SkuDriverEntry[]): string {
  const driverMap = new Map<string, { model: string; total: number }>();

  for (const e of entries) {
    const moduleQty = e.quantity;
    if (e.driver.combo && e.driver.combo.length > 0) {
      for (const item of e.driver.combo) {
        const key = item.model.toUpperCase();
        const existing = driverMap.get(key);
        if (existing) {
          existing.total += item.quantity * moduleQty;
        } else {
          driverMap.set(key, { model: item.model.toUpperCase(), total: item.quantity * moduleQty });
        }
      }
    } else {
      const driverQty = (e.driver.quantity ?? 1) * moduleQty;
      const key = e.driver.model.toUpperCase();
      const existing = driverMap.get(key);
      if (existing) {
        existing.total += driverQty;
      } else {
        driverMap.set(key, { model: e.driver.model.toUpperCase(), total: driverQty });
      }
    }
  }

  return Array.from(driverMap.values())
    .map((d) => `APROXIMADAMENTE ${d.total}X ${d.model}`)
    .join(" + ");
}

/**
 * Gera o texto resumo para uma linha de pedido no formato da ficha Alfalux.
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

  if (!isDual || !isIndependent) {
    // ── Caso simples: D1, D2 ou D1+D2 conjunto ──
    const powerLabel = isDual
      ? `${result.powerD1}W/M + ${result.powerD2}W/M`
      : `${result.powerD1}W/M`;

    // Barras totais: para D1+D2 conjunto, já estão dobradas em totalBars
    const totalBars = result.totalBars;

    // Drivers: usar combinedDrivers se D1+D2 conjunto, senão driversD1
    const driverEntries =
      isDual && !isIndependent && result.combinedDrivers
        ? result.combinedDrivers
        : result.driversD1;

    const driverSummary = buildDriverSummary(driverEntries);

    const line1 = `${productName} ${installLabel} COM APROXIMADAMENTE ${lengthMM}MM ${powerLabel} (CONFORME PROJETO).`;
    const line2 = `MONTADO COM APROXIMADAMENTE ${fmtBR(totalBars)} ${barTypeName} ${cct} + ${driverSummary}`;
    return `${line1}\n${line2}`;
  }

  // ── D1+D2 Independente: duas linhas ──
  const powerD1 = result.powerD1;
  const powerD2 = result.powerD2;

  // Barras por fileira (totalBars é de uma fileira apenas no modo independente)
  const barsPerSide = result.totalBars;

  const driverSummaryD1 = buildDriverSummary(result.driversD1);
  const driverSummaryD2 = buildDriverSummary(result.driversD2);

  const lineD1_1 = `${productName} ${installLabel} COM APROXIMADAMENTE ${lengthMM}MM ${powerD1}W/M (D1 — CONFORME PROJETO).`;
  const lineD1_2 = `MONTADO COM APROXIMADAMENTE ${fmtBR(barsPerSide)} ${barTypeName} ${cct} + ${driverSummaryD1}`;

  const lineD2_1 = `${productName} ${installLabel} COM APROXIMADAMENTE ${lengthMM}MM ${powerD2}W/M (D2 — CONFORME PROJETO).`;
  const lineD2_2 = `MONTADO COM APROXIMADAMENTE ${fmtBR(barsPerSide)} ${barTypeName} ${cct} + ${driverSummaryD2}`;

  return `${lineD1_1}\n${lineD1_2}\n\n${lineD2_1}\n${lineD2_2}`;
}
