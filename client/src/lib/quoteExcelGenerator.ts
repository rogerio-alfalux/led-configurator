/**
 * Gerador de orçamento em Excel fiel ao template Alfalux (TEMPLATEVIVIAN28.05.2026).
 * Usa ExcelJS para criar um workbook com o mesmo layout visual do template.
 *
 * Colunas da tabela de produtos (linha 18 em diante):
 *   C = ITEM EM PLANTA
 *   D = FOTO (imagem do produto)
 *   E = MODELO ALFALUX (SKU + descrição)
 *   F = COMPRIMENTO (mm)
 *   G = POTÊNCIA (W)
 *   H = DIM (dimmer)
 *   I = TENSÃO (V)
 *   J = COR
 *   K = TEMPERATURA DE COR (K)
 *   L = QTD
 *   M = PREÇO UNITÁRIO
 *   N = PREÇO TOTAL
 */

import ExcelJS from "exceljs";
import type { CartItemData, QuoteFormData } from "./cartTypes";

// ── Cores do template ────────────────────────────────────────────────────────
const HEADER_BLUE = "FF5B9BD5";       // Azul do cabeçalho da tabela
const HEADER_TEXT_WHITE = "FFFFFFFF"; // Branco para texto do cabeçalho
const BORDER_GRAY = "FFD9D9D9";       // Cinza para bordas
const ROW_ALT = "FFF2F7FD";           // Azul muito claro para linhas alternadas
const TOTAL_BG = "FFE2EFF8";          // Fundo da linha de total
const LABEL_GRAY = "FFF5F5F5";        // Fundo de linhas de label

// ── Helpers de estilo ────────────────────────────────────────────────────────
function applyBorder(
  cell: ExcelJS.Cell,
  style: Partial<ExcelJS.Border> = { style: "thin", color: { argb: BORDER_GRAY } }
) {
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

/** Extrai comprimento em mm da descrição (ex: "1000mm", "2400mm") */
function extractLengthFromDescription(description: string): string {
  const match = description.match(/(\d{3,5})\s*mm/i);
  return match ? match[1] : "-";
}

/** Extrai tensão da descrição (ex: "220V", "BIVOLT") */
function extractVoltageFromDescription(description: string): string {
  const bivolt = /bivolt/i.test(description);
  if (bivolt) return "BIVOLT";
  const match = description.match(/(\d{2,3}[Vv])/);
  return match ? match[1].toUpperCase() : "-";
}

/** Extrai DIM (dimmer) da descrição */
function extractDimFromDescription(description: string): string {
  if (/dali/i.test(description)) return "DALI";
  if (/dim\s*110/i.test(description)) return "DIM 110V";
  if (/dim/i.test(description)) return "DIM";
  return "ON/OFF";
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

  // ── Configurar larguras das colunas (fiel ao template) ───────────────────
  ws.columns = [
    { key: "A", width: 2.1 },    // A - margem
    { key: "B", width: 2.3 },    // B - margem
    { key: "C", width: 14 },     // C - ITEM EM PLANTA
    { key: "D", width: 22 },     // D - FOTO
    { key: "E", width: 38 },     // E - MODELO ALFALUX
    { key: "F", width: 14 },     // F - COMPRIMENTO (mm)
    { key: "G", width: 12 },     // G - POTÊNCIA (W)
    { key: "H", width: 10 },     // H - DIM
    { key: "I", width: 12 },     // I - TENSÃO (V)
    { key: "J", width: 16 },     // J - COR
    { key: "K", width: 16 },     // K - TEMPERATURA DE COR (K)
    { key: "L", width: 8 },      // L - QTD
    { key: "M", width: 18 },     // M - PREÇO UNITÁRIO
    { key: "N", width: 18 },     // N - PREÇO TOTAL
  ];

  // ── Linha 1-2: Espaço / Logo ─────────────────────────────────────────────
  ws.getRow(1).height = 19.8;
  ws.getRow(2).height = 19.8;

  // ── Linha 3: Telefone (fiel ao template) ─────────────────────────────────
  ws.getRow(3).height = 21.0;
  ws.mergeCells("C3:N3");
  {
    const c = ws.getCell("C3");
    c.value = "          (11) 5666.9272 / 5666.4856";
    c.font = { name: "Calibri", size: 13, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ── Linha 4: Endereço ─────────────────────────────────────────────────────
  ws.getRow(4).height = 21.6;
  ws.mergeCells("C4:N4");
  {
    const c = ws.getCell("C4");
    c.value = "Rua Agostino Togneri, n° 617 - Jurubatuba - São Paulo/ SP";
    c.font = { name: "Calibri", size: 13, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ── Linha 5: VENDEDOR ─────────────────────────────────────────────────────
  ws.getRow(5).height = 20.4;
  ws.mergeCells("C5:D5");
  {
    const c = ws.getCell("C5");
    c.value = "VENDEDOR:";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells("E5:N5");
  {
    const c = ws.getCell("E5");
    const vendedorText = [formData.seller1Name, formData.seller2Name].filter(Boolean).join(" / ") || "";
    c.value = vendedorText;
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 6: Número do orçamento ─────────────────────────────────────────
  ws.getRow(6).height = 31.2;
  ws.mergeCells("C6:D6");
  {
    const c = ws.getCell("C6");
    c.value = formData.numero || "";
    c.font = { name: "Calibri", size: 20, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 7: OBRA ─────────────────────────────────────────────────────────
  ws.getRow(7).height = 25.8;
  {
    const c = ws.getCell("C7");
    c.value = "OBRA:";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells("E7:N7");
  {
    const c = ws.getCell("E7");
    c.value = formData.obra || "";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 8: CLIENTE ─────────────────────────────────────────────────────
  ws.getRow(8).height = 19.8;
  {
    const c = ws.getCell("C8");
    c.value = "CLIENTE:";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells("E8:N8");
  {
    const c = ws.getCell("E8");
    c.value = formData.cliente;
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 9: CONTATO/TEL ─────────────────────────────────────────────────
  ws.getRow(9).height = 20.4;
  {
    const c = ws.getCell("C9");
    c.value = "CONTATO/TEL:";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells("E9:N9");
  {
    const c = ws.getCell("E9");
    const contactText = [formData.contato, formData.tel].filter(Boolean).join(" — ");
    c.value = contactText;
    c.font = { name: "Calibri", size: 12 };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 10: E-MAIL ─────────────────────────────────────────────────────
  ws.getRow(10).height = 20.4;
  {
    const c = ws.getCell("C10");
    c.value = "E-MAIL:";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells("E10:N10");
  {
    const c = ws.getCell("E10");
    c.value = formData.email || "";
    c.font = { name: "Calibri", size: 12 };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 11: ARQUITETURA/LD ─────────────────────────────────────────────
  ws.getRow(11).height = 20.4;
  {
    const c = ws.getCell("C11");
    c.value = "ARQUITETURA/LD:";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells("E11:N11");
  {
    const c = ws.getCell("E11");
    c.value = formData.assistantName || "";
    c.font = { name: "Calibri", size: 12 };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 12: REFERÊNCIA ─────────────────────────────────────────────────
  ws.getRow(12).height = 19.8;
  {
    const c = ws.getCell("C12");
    c.value = "REFERÊNCIA:";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells("E12:N12");
  {
    const c = ws.getCell("E12");
    c.value = formData.referencia || "FORNECIMENTO DE LUMINÁRIAS";
    c.font = { name: "Calibri", size: 12 };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 13: espaço ─────────────────────────────────────────────────────
  ws.getRow(13).height = 19.8;

  // ── Linha 14: DATA ───────────────────────────────────────────────────────
  ws.getRow(14).height = 31.2;
  ws.mergeCells("C14:D14");
  {
    const c = ws.getCell("C14");
    c.value = formData.data || new Date().toLocaleDateString("pt-BR");
    c.font = { name: "Calibri", size: 20, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ── Linha 15: Proposta Comercial ─────────────────────────────────────────
  ws.getRow(15).height = 28.8;
  ws.mergeCells("C15:N15");
  {
    const c = ws.getCell("C15");
    c.value = "PROPOSTA COMERCIAL PARA FORNECIMENTO DOS PRODUTOS ABAIXO ESPECIFICADOS, COM VALIDADE DE 3 (TRÊS) DIAS.";
    c.font = { name: "Calibri", size: 13, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }

  // ── Linha 16: espaço ─────────────────────────────────────────────────────
  ws.getRow(16).height = 18.0;

  // ── Linha 17: Título da obra (header da tabela) ──────────────────────────
  ws.getRow(17).height = 39.6;
  ws.mergeCells("C17:N17");
  {
    const c = ws.getCell("C17");
    c.value = formData.obra || formData.cliente || "ORÇAMENTO";
    c.font = { name: "Calibri", size: 22, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
    c.font = { name: "Calibri", size: 22, bold: true, color: { argb: "FFFFFFFF" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ── Linha 18: Cabeçalho da tabela ────────────────────────────────────────
  ws.getRow(18).height = 48.6;
  const tableHeaders: Array<{ col: string; label: string }> = [
    { col: "C", label: "ITEM EM\nPLANTA" },
    { col: "D", label: "FOTO" },
    { col: "E", label: "MODELO ALFALUX" },
    { col: "F", label: "COMPRIMENTO\n(mm)" },
    { col: "G", label: "POTÊNCIA\n(W)" },
    { col: "H", label: "DIM" },
    { col: "I", label: "TENSÃO\n(V)" },
    { col: "J", label: "COR" },
    { col: "K", label: "TEMPERATURA\nDE COR (K)" },
    { col: "L", label: "QTD" },
    { col: "M", label: "PREÇO\nUNITÁRIO" },
    { col: "N", label: "PREÇO\nTOTAL" },
  ];
  for (const h of tableHeaders) {
    const cell = ws.getCell(`${h.col}18`);
    cell.value = h.label;
    applyHeaderStyle(cell);
  }

  // ── Linhas de dados (a partir da linha 19) ───────────────────────────────
  let currentRow = 19;
  const IMAGE_ROW_HEIGHT = 90;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = currentRow + i;
    const row = ws.getRow(rowNum);
    row.height = IMAGE_ROW_HEIGHT;

    const isAlt = i % 2 === 1;
    const rowBg = isAlt ? ROW_ALT : "FFFFFFFF";

    for (const col of ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"]) {
      const cell = ws.getCell(`${col}${rowNum}`);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      applyBorder(cell, { style: "thin", color: { argb: BORDER_GRAY } });
      cell.font = { name: "Calibri", size: 11 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }

    // C = ITEM EM PLANTA
    const cPlanta = ws.getCell(`C${rowNum}`);
    cPlanta.value = item.itemEmPlanta || String(i + 1);
    cPlanta.font = { name: "Calibri", size: 12, bold: true };

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

          const cellW = 22 * 7.5;  // ~165px
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

    // E = MODELO ALFALUX (SKU + descrição)
    const cSku = ws.getCell(`E${rowNum}`);
    const modelText = item.sku ? `${item.sku}\n${item.description}` : item.description;
    cSku.value = modelText;
    cSku.font = { name: "Calibri", size: 11, bold: false };
    cSku.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

    // F = COMPRIMENTO (mm)
    const cLen = ws.getCell(`F${rowNum}`);
    cLen.value = extractLengthFromDescription(item.description);

    // G = POTÊNCIA (W)
    const cPow = ws.getCell(`G${rowNum}`);
    cPow.value = (item.power && item.power.trim()) ? item.power : extractPowerFromDescription(item.description);

    // H = DIM
    const cDim = ws.getCell(`H${rowNum}`);
    cDim.value = extractDimFromDescription(item.description);

    // I = TENSÃO (V)
    const cVolt = ws.getCell(`I${rowNum}`);
    cVolt.value = extractVoltageFromDescription(item.description);

    // J = COR
    const cCor = ws.getCell(`J${rowNum}`);
    cCor.value = item.corPeca || "-";

    // K = TEMPERATURA DE COR (K)
    const cCct = ws.getCell(`K${rowNum}`);
    cCct.value = item.cct || "-";

    // L = QTD
    const cQty = ws.getCell(`L${rowNum}`);
    cQty.value = item.qty;
    cQty.font = { name: "Calibri", size: 12, bold: true };

    // M = PREÇO UNITÁRIO
    const cUnit = ws.getCell(`M${rowNum}`);
    if (item.unitPrice !== null && item.unitPrice !== undefined) {
      cUnit.value = item.unitPrice;
      cUnit.numFmt = '"R$"#,##0.00';
    } else {
      cUnit.value = "-";
    }

    // N = PREÇO TOTAL
    const cTotal = ws.getCell(`N${rowNum}`);
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

  // Linha de espaço antes dos totais
  nextRow++;
  ws.getRow(nextRow).height = 10;
  nextRow++;

  // Linha: Prazo de fabricação e entrega
  ws.getRow(nextRow).height = 29.4;
  ws.mergeCells(`C${nextRow}:D${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Prazo de fabricação e entrega:";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells(`E${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`E${nextRow}`);
    c.value = "20 dias úteis";
    c.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFF0000" } };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow++;

  // Linha: Valor total dos produtos (sem frete)
  ws.getRow(nextRow).height = 42.6;
  ws.mergeCells(`C${nextRow}:D${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Valor total dos produtos\n(sem o frete):";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  }
  ws.mergeCells(`E${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`E${nextRow}`);
    c.value = totalBase;
    c.numFmt = '"R$"#,##0.00';
    c.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF1F497D" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
    c.alignment = { horizontal: "left", vertical: "middle" };
    applyBorder(c, { style: "medium", color: { argb: "FF4472C4" } });
  }
  nextRow++;

  // Linha: RT (se aplicável)
  if (rtPct > 0) {
    ws.getRow(nextRow).height = 22;
    ws.mergeCells(`C${nextRow}:D${nextRow}`);
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
    cLabel.alignment = { horizontal: "left", vertical: "middle" };
    applyBorder(cLabel, { style: "thin", color: { argb: BORDER_GRAY } });

    const rtValue = totalBase / (1 - rtPct) - totalBase;
    ws.mergeCells(`E${nextRow}:N${nextRow}`);
    const cVal = ws.getCell(`E${nextRow}`);
    cVal.value = rtValue;
    cVal.numFmt = '"R$"#,##0.00';
    cVal.font = { name: "Calibri", size: 11 };
    cVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LABEL_GRAY } };
    cVal.alignment = { horizontal: "left", vertical: "middle" };
    applyBorder(cVal, { style: "thin", color: { argb: BORDER_GRAY } });
    nextRow++;
  }

  // Linha: Margem de Negociação (se aplicável)
  if (marginPct > 0) {
    ws.getRow(nextRow).height = 22;
    ws.mergeCells(`C${nextRow}:D${nextRow}`);
    const cLabel = ws.getCell(`C${nextRow}`);
    cLabel.value = `Margem de Negociação (${(marginPct * 100).toFixed(1)}%):`;
    cLabel.font = { name: "Calibri", size: 11, italic: true };
    cLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LABEL_GRAY } };
    cLabel.alignment = { horizontal: "left", vertical: "middle" };
    applyBorder(cLabel, { style: "thin", color: { argb: BORDER_GRAY } });

    const baseAfterRt = rtPct > 0 ? totalBase / (1 - rtPct) : totalBase;
    const marginValue = baseAfterRt / (1 - marginPct) - baseAfterRt;
    ws.mergeCells(`E${nextRow}:N${nextRow}`);
    const cVal = ws.getCell(`E${nextRow}`);
    cVal.value = marginValue;
    cVal.numFmt = '"R$"#,##0.00';
    cVal.font = { name: "Calibri", size: 11 };
    cVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LABEL_GRAY } };
    cVal.alignment = { horizontal: "left", vertical: "middle" };
    applyBorder(cVal, { style: "thin", color: { argb: BORDER_GRAY } });
    nextRow++;
  }

  // Linha: VALOR TOTAL FINAL (se RT ou margem foram aplicados)
  if (rtPct > 0 || marginPct > 0) {
    ws.getRow(nextRow).height = 30;
    ws.mergeCells(`C${nextRow}:D${nextRow}`);
    const cLabel = ws.getCell(`C${nextRow}`);
    cLabel.value = "VALOR TOTAL FINAL (com RT e margem):";
    cLabel.font = { name: "Calibri", size: 12, bold: true };
    cLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6E4F0" } };
    cLabel.alignment = { horizontal: "left", vertical: "middle" };
    applyBorder(cLabel, { style: "medium", color: { argb: "FF4472C4" } });

    ws.mergeCells(`E${nextRow}:N${nextRow}`);
    const cVal = ws.getCell(`E${nextRow}`);
    cVal.value = totalFinal;
    cVal.numFmt = '"R$"#,##0.00';
    cVal.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF1F497D" } };
    cVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6E4F0" } };
    cVal.alignment = { horizontal: "left", vertical: "middle" };
    applyBorder(cVal, { style: "medium", color: { argb: "FF4472C4" } });
    nextRow++;
  }

  // ── Espaço ────────────────────────────────────────────────────────────────
  nextRow++;
  ws.getRow(nextRow).height = 10;
  nextRow++;

  // ── Condição de pagamento ─────────────────────────────────────────────────
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:D${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Condição de pagto:";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells(`E${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`E${nextRow}`);
    c.value = "30% Sinal e 70% a 28DDF (mediante a aprovação de cadastro)";
    c.font = { name: "Calibri", size: 11 };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow++;

  // ── Frete ─────────────────────────────────────────────────────────────────
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:D${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Frete dedicado:";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells(`E${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`E${nextRow}`);
    c.value = buildFreteText(formData, totalBase);
    c.font = { name: "Calibri", size: 11 };
    c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  }
  nextRow++;

  // ── Observação ────────────────────────────────────────────────────────────
  ws.getRow(nextRow).height = 18.0;
  ws.mergeCells(`C${nextRow}:D${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Observação:";
    c.font = { name: "Calibri", size: 11, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow++;
  ws.getRow(nextRow).height = 18.0;
  ws.mergeCells(`C${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Pode ser acrescido o valor de DIFAL, de acordo com o Estado e classificação fiscal da empresa.";
    c.font = { name: "Calibri", size: 11 };
    c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  }
  nextRow++;

  // ── Espaço ────────────────────────────────────────────────────────────────
  nextRow++;
  ws.getRow(nextRow).height = 10;
  nextRow++;

  // ── Condições Gerais ─────────────────────────────────────────────────────
  const conditions = [
    { num: "1)", text: "A validade desta proposta é de 3 (três) dias corridos a partir da data de emissão;" },
    { num: "2)", text: "Os preços praticados são os vigentes na data de emissão da proposta, podendo sofrer alterações sem aviso prévio;" },
    { num: "3)", text: "Pagamentos de sinal e/ou antecipado poderão ser efetuados num prazo de 5 dias úteis após a aprovação da proposta. O faturamento será realizado mediante a aprovação do cadastro;" },
    { num: "4)", text: "As luminárias ALFALUX possuem 01 (um) ano de garantia contra defeitos de fabricação. Para equipamentos (lâmpadas, drivers, reatores, transformadores, ignitores e capacitores), é repassada a garantia do fabricante;" },
    { num: "5)", text: "A ALFALUX não realiza instalação de luminárias;" },
    { num: "6)", text: "Em caso de qualquer problema em nossos produtos, nossa assistência técnica deverá ser acionada. A manipulação incorreta ou alteração do produto ocasionará a perda da garantia. Serviços de assistência técnica que envolvam substituição de peças ou componentes das luminárias deverão ser realizados em nossa fábrica;" },
    { num: "7)", text: "A conferência do material deverá ser efetuada no ato da entrega, havendo qualquer irregularidade ou avaria, está deverá ser comunicada e notificado no recebimento. Em caso de não conferência a ALFALUX não se responsabiliza por eventuais divergências ou danos às mercadorias;" },
    { num: "8)", text: "A responsabilidade sobre problemas ocasionados durante o transporte é da transportadora, orientamos que realizem anotação no conhecimento, como forma de comprovação do dano e o futuro ressarcimento pelo responsável. Não nos responsabilizamos por danos ocasionados pelo transporte incorreto da mercadoria, por terceiros;" },
    { num: "9)", text: "Cancelamento total ou parcial, será aceito somente no período de 48 horas da aprovação do pedido, após haverá a cobrança de 10% sobre o valor dos itens cancelados, em função da interrupção do processo fabril e ressarcimento de despesas geradas com a compra de matéria prima e mão de obra. Não aceitamos o cancelamento de produtos especiais, nesta hipótese haverá a cobrança do valor integral do produto." },
  ];

  for (const cond of conditions) {
    ws.getRow(nextRow).height = 16.8;
    {
      const c = ws.getCell(`C${nextRow}`);
      c.value = cond.num;
      c.font = { name: "Calibri", size: 11, bold: true };
      c.alignment = { horizontal: "left", vertical: "middle" };
    }
    ws.mergeCells(`D${nextRow}:N${nextRow}`);
    {
      const c = ws.getCell(`D${nextRow}`);
      c.value = cond.text;
      c.font = { name: "Calibri", size: 10 };
      c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    }
    nextRow++;
    nextRow++; // espaço entre condições
  }

  // ── Estou ciente ─────────────────────────────────────────────────────────
  ws.getRow(nextRow).height = 31.2;
  ws.mergeCells(`C${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Estou ciente das informações contidas neste documento.";
    c.font = { name: "Calibri", size: 18, bold: true, color: { argb: "FFFF0000" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }
  nextRow += 3;

  // ── Data e Assinatura ─────────────────────────────────────────────────────
  ws.getRow(nextRow).height = 33.6;
  {
    const c = ws.getCell(`D${nextRow}`);
    c.value = "Data:  ____/___/_____";
    c.font = { name: "Calibri", size: 14, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells(`F${nextRow}:H${nextRow}`);
  {
    const c = ws.getCell(`F${nextRow}`);
    c.value = "De acordo: _____________________________________";
    c.font = { name: "Calibri", size: 14, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow += 4;

  // ── Rodapé endereço ───────────────────────────────────────────────────────
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "R. Agostino Togneri, nº 617 - Jurubatuba - São Paulo/SP  - CEP: 04690-090";
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BLUE } };
    c.font = { name: "Calibri", size: 10, bold: false, color: { argb: HEADER_TEXT_WHITE } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

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
