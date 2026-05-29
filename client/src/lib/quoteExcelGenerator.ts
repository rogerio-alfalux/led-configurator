/**
 * Gerador de orçamento em Excel fiel ao template Alfalux (v8).
 * Usa ExcelJS para criar um workbook com o mesmo layout visual do template.
 *
 * Colunas da tabela de produtos:
 *   C = ITEM
 *   D = FOTO (imagem do produto)
 *   E = MODELO ALFALUX (SKU/código)
 *   F = DESCRIÇÃO
 *   G = POTÊNCIA
 *   H = TEMPERATURA DE COR
 *   I = QTD
 *   J = COR DA PEÇA
 *   K = ITEM EM PLANTA
 *   L = PREÇO UNITÁRIO
 *   M = PREÇO TOTAL
 */

import ExcelJS from "exceljs";
import type { CartItemData, QuoteFormData } from "./cartTypes";

// Cores do template
const HEADER_BLUE = "FF5B9BD5";
const HEADER_TEXT_WHITE = "FFFFFFFF";
const BORDER_GRAY = "FFD9D9D9";
const ROW_ALT = "FFF2F7FD";
const TOTAL_BG = "FFE2EFF8";
const LABEL_GRAY = "FFF5F5F5";

function applyBorder(cell: ExcelJS.Cell, style: Partial<ExcelJS.Border> = { style: "thin", color: { argb: BORDER_GRAY } }) {
  cell.border = { top: style, bottom: style, left: style, right: style };
}

function applyHeaderStyle(cell: ExcelJS.Cell) {
  cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: HEADER_TEXT_WHITE } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BLUE } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  applyBorder(cell, { style: "thin", color: { argb: "FF4472C4" } });
}

/** Extrai a potência (ex: "17W") da descrição do produto usando regex. */
function extractPowerFromDescription(description: string): string {
  const match = description.match(/(\d+(?:[,.]\d+)?\s*W(?:\/m)?)/i);
  return match ? match[1].replace(/\s+/g, "") : "-";
}

/** Formata número como moeda BRL */
function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Calcula o total final aplicando RT e margem */
function calcTotalFinal(totalBase: number, rtPercent?: number, marginPercent?: number): number {
  let total = totalBase;
  if (rtPercent && rtPercent > 0) total = total / (1 - rtPercent);
  if (marginPercent && marginPercent > 0) total = total / (1 - marginPercent);
  return total;
}

/** Retorna o texto de frete para o Excel */
function buildFreteText(formData: QuoteFormData, totalBase: number): string {
  const { freteType, freteIsento, freteLocalidade } = formData;
  if (freteIsento) return "Frete isento (conforme negociação)";
  if (freteType === "free") return "CIF - Frete grátis (faturamento acima de R$1.500,00 — São Paulo/SP Capital)";
  if (freteType === "night") return "Frete noturno — R$2.000,00";
  if (freteType === "paid") {
    if (freteLocalidade === "sp") {
      return totalBase >= 1500
        ? "CIF - Frete grátis (faturamento acima de R$1.500,00 — São Paulo/SP Capital)"
        : "Frete a cobrar — São Paulo/SP Capital (faturamento abaixo de R$1.500,00)";
    }
    return "Frete sob consulta — localidade fora de São Paulo/SP Capital";
  }
  if (freteType === "consult") return "Frete sob consulta";
  return "CIF - Para faturamento acima de R$1.500,00 São Paulo/SP (Capital). Demais localidades sob consulta.";
}

export async function generateQuoteExcel(
  items: CartItemData[],
  formData: QuoteFormData
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Alfalux LED Configurator";
  wb.created = new Date();

  const ws = wb.addWorksheet("Alfalux");

  // ── Configurar larguras das colunas ──────────────────────────────────────
  ws.columns = [
    { key: "A", width: 2.1 },   // A - margem
    { key: "B", width: 2.3 },   // B - margem
    { key: "C", width: 8 },     // C - ITEM
    { key: "D", width: 22 },    // D - FOTO
    { key: "E", width: 22 },    // E - MODELO ALFALUX
    { key: "F", width: 32 },    // F - DESCRIÇÃO
    { key: "G", width: 14 },    // G - POTÊNCIA
    { key: "H", width: 16 },    // H - TEMPERATURA DE COR
    { key: "I", width: 7 },     // I - QTD
    { key: "J", width: 20 },    // J - COR DA PEÇA
    { key: "K", width: 14 },    // K - ITEM EM PLANTA
    { key: "L", width: 18 },    // L - PREÇO UNITÁRIO
    { key: "M", width: 18 },    // M - PREÇO TOTAL
  ];

  // ── Linha 1: espaço ──────────────────────────────────────────────────────
  ws.getRow(1).height = 18.75;

  // ── Linha 2: espaço ──────────────────────────────────────────────────────
  ws.getRow(2).height = 10.2;

  // ── Linha 3: DATA ────────────────────────────────────────────────────────
  ws.getRow(3).height = 19.8;
  {
    const cLabel = ws.getCell("C3");
    cLabel.value = "DATA:";
    cLabel.font = { name: "Calibri", size: 13, bold: true };
    cLabel.alignment = { horizontal: "left", vertical: "middle" };

    ws.mergeCells("E3:H3");
    const cData = ws.getCell("E3");
    cData.value = formData.data || new Date().toLocaleDateString("pt-BR");
    cData.font = { name: "Calibri", size: 13 };
    cData.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 4: espaço ──────────────────────────────────────────────────────
  ws.getRow(4).height = 19.8;
  ws.mergeCells("C4:H4");

  // ── Linha 5: CLIENTE ─────────────────────────────────────────────────────
  ws.getRow(5).height = 24.9;
  {
    const cLabel = ws.getCell("C5");
    cLabel.value = "CLIENTE:";
    cLabel.font = { name: "Calibri", size: 13, bold: true };
    cLabel.alignment = { horizontal: "left", vertical: "middle" };

    ws.mergeCells("E5:H5");
    const cVal = ws.getCell("E5");
    cVal.value = formData.cliente;
    cVal.font = { name: "Calibri", size: 13 };
    cVal.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 6: CONTATO ─────────────────────────────────────────────────────
  ws.getRow(6).height = 24.9;
  {
    const cLabel = ws.getCell("C6");
    cLabel.value = "CONTATO:";
    cLabel.font = { name: "Calibri", size: 13, bold: true };
    cLabel.alignment = { horizontal: "left", vertical: "middle" };
    const cVal = ws.getCell("E6");
    cVal.value = formData.contato;
    cVal.font = { name: "Calibri", size: 13 };
  }

  // ── Linha 7: TEL ─────────────────────────────────────────────────────────
  ws.getRow(7).height = 24.9;
  {
    const cLabel = ws.getCell("C7");
    cLabel.value = "TEL.:";
    cLabel.font = { name: "Calibri", size: 13, bold: true };
    cLabel.alignment = { horizontal: "left", vertical: "middle" };
    const cVal = ws.getCell("E7");
    cVal.value = formData.tel;
    cVal.font = { name: "Calibri", size: 13 };
  }

  // ── Linha 8: E-MAIL ──────────────────────────────────────────────────────
  ws.getRow(8).height = 24.9;
  {
    const cLabel = ws.getCell("C8");
    cLabel.value = "E-MAIL:";
    cLabel.font = { name: "Calibri", size: 13, bold: true };
    cLabel.alignment = { horizontal: "left", vertical: "middle" };
    const cVal = ws.getCell("E8");
    cVal.value = formData.email;
    cVal.font = { name: "Calibri", size: 13 };
  }

  // ── Linha 9: VENDEDOR ────────────────────────────────────────────────────
  ws.getRow(9).height = 24.9;
  {
    const cLabel = ws.getCell("C9");
    cLabel.value = "VENDEDOR:";
    cLabel.font = { name: "Calibri", size: 13, bold: true };
    cLabel.alignment = { horizontal: "left", vertical: "middle" };
    const cVal = ws.getCell("E9");
    const vendedorText = [formData.seller1Name, formData.seller2Name].filter(Boolean).join(" / ") || formData.contato || "";
    cVal.value = vendedorText;
    cVal.font = { name: "Calibri", size: 13 };
  }

  // ── Linha 10: REFERÊNCIA ─────────────────────────────────────────────────
  ws.getRow(10).height = 19.8;
  {
    const cLabel = ws.getCell("C10");
    cLabel.value = "REFERÊNCIA:";
    cLabel.font = { name: "Calibri", size: 13, bold: true };
    cLabel.alignment = { horizontal: "left", vertical: "middle" };
    const cVal = ws.getCell("E10");
    cVal.value = formData.referencia || "Referência: Fornecimento de luminárias";
    cVal.font = { name: "Calibri", size: 13 };
  }

  // ── Linha 11: OBRA ───────────────────────────────────────────────────────
  ws.getRow(11).height = 24.9;
  {
    const cLabel = ws.getCell("C11");
    cLabel.value = "OBRA:";
    cLabel.font = { name: "Calibri", size: 13, bold: true };
    cLabel.alignment = { horizontal: "left", vertical: "middle" };
    const cVal = ws.getCell("E11");
    cVal.value = formData.obra;
    cVal.font = { name: "Calibri", size: 13 };
  }

  // ── Linha 12: espaço ─────────────────────────────────────────────────────
  ws.getRow(12).height = 24.9;

  // ── Linha 13: Proposta Comercial ─────────────────────────────────────────
  ws.getRow(13).height = 24.9;
  ws.mergeCells("C13:M14");
  {
    const cProp = ws.getCell("C13");
    cProp.value = "Proposta Comercial para fornecimento dos produtos abaixo especificados, com validade de 3 dias:";
    cProp.font = { name: "Calibri", size: 12, italic: true };
    cProp.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  }

  // ── Linha 15: espaço ─────────────────────────────────────────────────────
  ws.getRow(15).height = 13.5;

  // ── Linha 16: linha separadora ───────────────────────────────────────────
  ws.getRow(16).height = 18.6;
  ws.mergeCells("C16:M16");
  {
    const cSep = ws.getCell("C16");
    cSep.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BLUE } };
  }

  // ── Linha 17: Cabeçalho da tabela ────────────────────────────────────────
  ws.getRow(17).height = 45;
  const headers: Array<{ col: string; label: string }> = [
    { col: "C", label: "ITEM" },
    { col: "D", label: "FOTO" },
    { col: "E", label: "MODELO\nALFALUX" },
    { col: "F", label: "DESCRIÇÃO" },
    { col: "G", label: "POTÊNCIA" },
    { col: "H", label: "TEMPERATURA\nDE COR" },
    { col: "I", label: "QTD" },
    { col: "J", label: "COR DA\nPEÇA" },
    { col: "K", label: "ITEM EM\nPLANTA" },
    { col: "L", label: "PREÇO\nUNITÁRIO" },
    { col: "M", label: "PREÇO\nTOTAL" },
  ];
  for (const h of headers) {
    const cell = ws.getCell(`${h.col}17`);
    cell.value = h.label;
    applyHeaderStyle(cell);
  }

  // ── Linhas de dados (a partir da linha 18) ───────────────────────────────
  let currentRow = 18;
  const IMAGE_ROW_HEIGHT = 90;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = currentRow + i;
    const row = ws.getRow(rowNum);
    row.height = IMAGE_ROW_HEIGHT;

    const isAlt = i % 2 === 1;
    const rowBg = isAlt ? ROW_ALT : "FFFFFFFF";

    for (const col of ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"]) {
      const cell = ws.getCell(`${col}${rowNum}`);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      applyBorder(cell, { style: "thin", color: { argb: BORDER_GRAY } });
      cell.font = { name: "Calibri", size: 11 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }

    // C = ITEM
    const cItem = ws.getCell(`C${rowNum}`);
    cItem.value = i + 1;
    cItem.font = { name: "Calibri", size: 12, bold: true };

    // D = FOTO
    if (item.photoUrl) {
      try {
        let fetchUrl: string;
        if (item.photoUrl.startsWith("/manus-storage/")) {
          fetchUrl = item.photoUrl;
        } else {
          fetchUrl = `/api/image-proxy?url=${encodeURIComponent(item.photoUrl)}`;
        }
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          let ext: "png" | "jpeg" | "gif" = "jpeg";
          if (uint8[0] === 0x89 && uint8[1] === 0x50) ext = "png";
          else if (uint8[0] === 0x47 && uint8[1] === 0x49) ext = "gif";

          const blob = new Blob([arrayBuffer]);
          const blobUrl = URL.createObjectURL(blob);
          const imgEl = await new Promise<HTMLImageElement>((resolve) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => resolve(el);
            el.src = blobUrl;
          });
          URL.revokeObjectURL(blobUrl);

          const cellW = 22 * 7.5;  // 165px
          const cellH = IMAGE_ROW_HEIGHT;
          const PAD = 6;
          const maxW = cellW - PAD * 2;
          const maxH = cellH - PAD * 2;

          let drawW = maxW;
          let drawH = maxH;
          if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
            const ratio = imgEl.naturalWidth / imgEl.naturalHeight;
            if (ratio > maxW / maxH) {
              drawW = maxW;
              drawH = maxW / ratio;
            } else {
              drawH = maxH;
              drawW = maxH * ratio;
            }
          }

          const offsetX = (cellW - drawW) / 2;
          const offsetY = (cellH - drawH) / 2;

          const imgId = wb.addImage({ buffer: arrayBuffer, extension: ext });
          ws.addImage(imgId, {
            tl: {
              col: 3 + offsetX / cellW,
              row: rowNum - 1 + offsetY / cellH,
            },
            ext: { width: drawW, height: drawH },
            editAs: "oneCell",
          } as ExcelJS.ImagePosition & { editAs: string });
        }
      } catch {
        // Ignorar erros de imagem
      }
    }

    // E = MODELO ALFALUX (SKU)
    const cSku = ws.getCell(`E${rowNum}`);
    cSku.value = item.sku || "-";
    cSku.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF1F497D" } };

    // F = DESCRIÇÃO
    const cDesc = ws.getCell(`F${rowNum}`);
    cDesc.value = item.description;
    cDesc.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

    // G = POTÊNCIA
    const cPow = ws.getCell(`G${rowNum}`);
    cPow.value = (item.power && item.power.trim()) ? item.power : extractPowerFromDescription(item.description);

    // H = TEMPERATURA DE COR
    const cCct = ws.getCell(`H${rowNum}`);
    cCct.value = item.cct || "-";

    // I = QTD
    const cQty = ws.getCell(`I${rowNum}`);
    cQty.value = item.qty;
    cQty.font = { name: "Calibri", size: 12, bold: true };

    // J = COR DA PEÇA
    const cCor = ws.getCell(`J${rowNum}`);
    cCor.value = item.corPeca || "-";
    cCor.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

    // K = ITEM EM PLANTA
    const cPlanta = ws.getCell(`K${rowNum}`);
    cPlanta.value = item.itemEmPlanta || "-";

    // L = PREÇO UNITÁRIO
    const cUnit = ws.getCell(`L${rowNum}`);
    if (item.unitPrice !== null && item.unitPrice !== undefined) {
      cUnit.value = item.unitPrice;
      cUnit.numFmt = '"R$"#,##0.00';
    } else {
      cUnit.value = "-";
    }

    // M = PREÇO TOTAL
    const cTotal = ws.getCell(`M${rowNum}`);
    if (item.totalPrice !== null && item.totalPrice !== undefined) {
      cTotal.value = item.totalPrice;
      cTotal.numFmt = '"R$"#,##0.00';
      cTotal.font = { name: "Calibri", size: 11, bold: true };
    } else {
      cTotal.value = "-";
    }
  }

  // ── Linhas de totais ──────────────────────────────────────────────────────
  const totalBase = items.reduce((sum, it) => sum + (it.totalPrice ?? 0), 0);
  const rtPct = formData.rtPercent ?? 0;
  const marginPct = formData.marginPercent ?? 0;
  const totalFinal = calcTotalFinal(totalBase, rtPct, marginPct);

  let nextRow = currentRow + items.length;

  // Linha: VALOR TOTAL DOS PRODUTOS (sem frete)
  ws.getRow(nextRow).height = 28;
  ws.mergeCells(`C${nextRow}:L${nextRow}`);
  {
    const cLabel = ws.getCell(`C${nextRow}`);
    cLabel.value = "VALOR TOTAL DOS PRODUTOS (sem frete):";
    cLabel.font = { name: "Calibri", size: 12, bold: true };
    cLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
    cLabel.alignment = { horizontal: "right", vertical: "middle" };
    applyBorder(cLabel, { style: "medium", color: { argb: "FF4472C4" } });

    const cVal = ws.getCell(`M${nextRow}`);
    cVal.value = totalBase;
    cVal.numFmt = '"R$"#,##0.00';
    cVal.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FF1F497D" } };
    cVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
    cVal.alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(cVal, { style: "medium", color: { argb: "FF4472C4" } });
  }
  nextRow++;

  // Linha: RT (se aplicável)
  if (rtPct > 0) {
    ws.getRow(nextRow).height = 22;
    ws.mergeCells(`C${nextRow}:L${nextRow}`);
    const activeDestinos = [
      formData.rtDest1Active ? formData.rtDest1 : null,
      formData.rtDest2Active ? formData.rtDest2 : null,
      formData.rtDest3Active ? formData.rtDest3 : null,
    ].filter(Boolean);
    const destinoText = activeDestinos.length > 0 ? ` (${activeDestinos.join(", ")})` : "";
    const cLabel = ws.getCell(`C${nextRow}`);
    cLabel.value = `Reserva Técnica (${(rtPct * 100).toFixed(1)}%)${destinoText}:`;
    cLabel.font = { name: "Calibri", size: 11, italic: true };
    cLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LABEL_GRAY } };
    cLabel.alignment = { horizontal: "right", vertical: "middle" };
    applyBorder(cLabel, { style: "thin", color: { argb: BORDER_GRAY } });

    const rtValue = totalBase / (1 - rtPct) - totalBase;
    const cVal = ws.getCell(`M${nextRow}`);
    cVal.value = rtValue;
    cVal.numFmt = '"R$"#,##0.00';
    cVal.font = { name: "Calibri", size: 11 };
    cVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LABEL_GRAY } };
    cVal.alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(cVal, { style: "thin", color: { argb: BORDER_GRAY } });
    nextRow++;
  }

  // Linha: Margem de Negociação (se aplicável)
  if (marginPct > 0) {
    ws.getRow(nextRow).height = 22;
    ws.mergeCells(`C${nextRow}:L${nextRow}`);
    const cLabel = ws.getCell(`C${nextRow}`);
    cLabel.value = `Margem de Negociação (${(marginPct * 100).toFixed(1)}%):`;
    cLabel.font = { name: "Calibri", size: 11, italic: true };
    cLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LABEL_GRAY } };
    cLabel.alignment = { horizontal: "right", vertical: "middle" };
    applyBorder(cLabel, { style: "thin", color: { argb: BORDER_GRAY } });

    const baseAfterRt = rtPct > 0 ? totalBase / (1 - rtPct) : totalBase;
    const marginValue = baseAfterRt / (1 - marginPct) - baseAfterRt;
    const cVal = ws.getCell(`M${nextRow}`);
    cVal.value = marginValue;
    cVal.numFmt = '"R$"#,##0.00';
    cVal.font = { name: "Calibri", size: 11 };
    cVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LABEL_GRAY } };
    cVal.alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(cVal, { style: "thin", color: { argb: BORDER_GRAY } });
    nextRow++;
  }

  // Linha: VALOR TOTAL FINAL (se RT ou margem foram aplicados)
  if (rtPct > 0 || marginPct > 0) {
    ws.getRow(nextRow).height = 30;
    ws.mergeCells(`C${nextRow}:L${nextRow}`);
    const cLabel = ws.getCell(`C${nextRow}`);
    cLabel.value = "VALOR TOTAL FINAL (com RT e margem):";
    cLabel.font = { name: "Calibri", size: 12, bold: true };
    cLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6E4F0" } };
    cLabel.alignment = { horizontal: "right", vertical: "middle" };
    applyBorder(cLabel, { style: "medium", color: { argb: "FF4472C4" } });

    const cVal = ws.getCell(`M${nextRow}`);
    cVal.value = totalFinal;
    cVal.numFmt = '"R$"#,##0.00';
    cVal.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FF1F497D" } };
    cVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6E4F0" } };
    cVal.alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(cVal, { style: "medium", color: { argb: "FF4472C4" } });
    nextRow++;
  }

  // ── Espaço ────────────────────────────────────────────────────────────────
  nextRow++;
  ws.getRow(nextRow).height = 18;

  // ── Condições comerciais ──────────────────────────────────────────────────
  const addCondRow = (rowNum: number, label: string, value: string) => {
    ws.getRow(rowNum).height = 28;
    const cLabel = ws.getCell(`C${rowNum}`);
    cLabel.value = label;
    cLabel.font = { name: "Calibri", size: 11, bold: true };
    cLabel.alignment = { horizontal: "left", vertical: "middle" };

    ws.mergeCells(`E${rowNum}:M${rowNum}`);
    const cVal = ws.getCell(`E${rowNum}`);
    cVal.value = value;
    cVal.font = { name: "Calibri", size: 11 };
    cVal.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  };

  const condRow = nextRow + 1;
  addCondRow(condRow, "Prazo de fabricação e entrega:", "PRAZO A SER PREENCHIDO");
  addCondRow(condRow + 2, "Condição de pagto:", "30% Sinal e 70% a 28DDF (mediante a aprovação de cadastro)");
  addCondRow(condRow + 4, "Frete:", buildFreteText(formData, totalBase));
  addCondRow(condRow + 6, "Observação:", "Pode ser acrescido o valor de DIFAL, de acordo com o Estado e classificação fiscal da empresa.");

  // ── Rodapé ────────────────────────────────────────────────────────────────
  const footerRow = condRow + 9;
  ws.getRow(footerRow).height = 35;
  ws.mergeCells(`C${footerRow}:M${footerRow}`);
  const cFooter = ws.getCell(`C${footerRow}`);
  cFooter.value = "Estamos à disposição para quaisquer esclarecimentos,";
  cFooter.font = { name: "Calibri", size: 12, italic: true };
  cFooter.alignment = { horizontal: "center", vertical: "middle" };

  const vendRow = footerRow + 2;
  ws.getRow(vendRow).height = 20;
  const vendedorNome = [formData.seller1Name, formData.seller2Name].filter(Boolean).join(" / ") || "";
  ws.getCell(`C${vendRow}`).value = vendedorNome || "VENDEDOR";
  ws.getCell(`C${vendRow}`).font = { name: "Calibri", size: 11, bold: true };

  ws.getRow(vendRow + 2).height = 40;
  ws.mergeCells(`C${vendRow + 2}:F${vendRow + 2}`);
  ws.getCell(`C${vendRow + 2}`).value = "CONTATO:   (11) 5666.9272";
  ws.getCell(`C${vendRow + 2}`).font = { name: "Calibri", size: 11 };

  // ── Rodapé endereço ───────────────────────────────────────────────────────
  const addrRow = vendRow + 6;
  ws.getRow(addrRow).height = 22;
  ws.mergeCells(`C${addrRow}:M${addrRow}`);
  const cAddr = ws.getCell(`C${addrRow}`);
  cAddr.value = "R. Agostino Togneri, nº 617 - Jurubatuba - São Paulo/SP";
  cAddr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BLUE } };
  cAddr.font = { name: "Calibri", size: 10, bold: true, color: { argb: HEADER_TEXT_WHITE } };
  cAddr.alignment = { horizontal: "center", vertical: "middle" };

  // ── Gerar e baixar o arquivo ──────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const numero = formData.numero ? `_${formData.numero}` : "";
  const clienteSlug = formData.cliente
    ? `_${formData.cliente.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20)}`
    : "";
  a.href = url;
  a.download = `Orcamento${numero}${clienteSlug}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
