/**
 * Gerador de orçamento em Excel fiel ao template Alfalux.
 * Usa ExcelJS para criar um workbook com o mesmo layout visual do template.
 *
 * Colunas relevantes (conforme template):
 *   C = ITEM
 *   D = FOTO (imagem do produto)
 *   E = MODELO ALFALUX (SKU/código)
 *   F = DESCRIÇÃO
 *   G = POTÊNCIA
 *   H = TEMPERATURA DE COR
 *   I = QTD
 *   K = PREÇO UNITÁRIO
 *   L = PREÇO TOTAL
 */

import ExcelJS from "exceljs";
import type { CartItemData, QuoteFormData } from "./cartTypes";

// Cor azul do cabeçalho da tabela (igual ao template)
const HEADER_BLUE = "FF5B9BD5";
const HEADER_TEXT_WHITE = "FFFFFFFF";
const BORDER_GRAY = "FFD9D9D9";
const ROW_ALT = "FFF2F7FD"; // azul muito claro para linhas alternadas
const TOTAL_BG = "FFE2EFF8";

function applyBorder(cell: ExcelJS.Cell, style: Partial<ExcelJS.Border> = { style: "thin", color: { argb: BORDER_GRAY } }) {
  cell.border = { top: style, bottom: style, left: style, right: style };
}

function applyHeaderStyle(cell: ExcelJS.Cell) {
  cell.font = { name: "Calibri", size: 12, bold: true, color: { argb: HEADER_TEXT_WHITE } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BLUE } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  applyBorder(cell, { style: "thin", color: { argb: "FF4472C4" } });
}

function formatBRLValue(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function generateQuoteExcel(
  items: CartItemData[],
  formData: QuoteFormData
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Alfalux LED Configurator";
  wb.created = new Date();

  const ws = wb.addWorksheet("Alfalux");

  // ── Configurar larguras das colunas (igual ao template) ──────────────────
  ws.columns = [
    { key: "A", width: 2.1 },   // A - margem
    { key: "B", width: 2.3 },   // B - margem
    { key: "C", width: 8 },     // C - ITEM
    { key: "D", width: 22 },    // D - FOTO
    { key: "E", width: 22 },    // E - MODELO ALFALUX
    { key: "F", width: 32 },    // F - DESCRIÇÃO
    { key: "G", width: 16 },    // G - POTÊNCIA
    { key: "H", width: 18 },    // H - TEMPERATURA DE COR
    { key: "I", width: 8 },     // I - QTD
    { key: "J", width: 2.4 },   // J - espaço
    { key: "K", width: 18 },    // K - PREÇO UNITÁRIO
    { key: "L", width: 18 },    // L - PREÇO TOTAL
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

  // ── Linha 9: espaço ──────────────────────────────────────────────────────
  ws.getRow(9).height = 15;

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
  ws.mergeCells("C13:L14");
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
  ws.mergeCells("C16:L16");
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
    { col: "K", label: "PREÇO\nUNITÁRIO" },
    { col: "L", label: "PREÇO\nTOTAL" },
  ];
  for (const h of headers) {
    const cell = ws.getCell(`${h.col}17`);
    cell.value = h.label;
    applyHeaderStyle(cell);
  }

  // ── Linhas de dados (a partir da linha 18) ───────────────────────────────
  let currentRow = 18;
  const IMAGE_ROW_HEIGHT = 90; // altura das linhas com foto

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = currentRow + i;
    const row = ws.getRow(rowNum);
    row.height = IMAGE_ROW_HEIGHT;

    const isAlt = i % 2 === 1;
    const rowBg = isAlt ? ROW_ALT : "FFFFFFFF";

    // Aplicar estilo de fundo e borda em todas as colunas da linha
    for (const col of ["C", "D", "E", "F", "G", "H", "I", "K", "L"]) {
      const cell = ws.getCell(`${col}${rowNum}`);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      applyBorder(cell, { style: "thin", color: { argb: BORDER_GRAY } });
      cell.font = { name: "Calibri", size: 11 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }

    // C = ITEM (número sequencial)
    const cItem = ws.getCell(`C${rowNum}`);
    cItem.value = i + 1;
    cItem.font = { name: "Calibri", size: 12, bold: true };

    // D = FOTO — inserir imagem se disponível
    if (item.photoUrl) {
      try {
        // Buscar a imagem via fetch e converter para base64
        const response = await fetch(item.photoUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          // Detectar tipo de imagem pelo magic bytes
          let ext: "png" | "jpeg" | "gif" = "jpeg";
          if (uint8[0] === 0x89 && uint8[1] === 0x50) ext = "png";
          else if (uint8[0] === 0x47 && uint8[1] === 0x49) ext = "gif";

          const imgId = wb.addImage({
            buffer: arrayBuffer,
            extension: ext,
          });
          // Posicionar a imagem na célula D (col index 3 = D)
          // Usar formato de range string para compatibilidade
          ws.addImage(imgId, `D${rowNum}:D${rowNum}`);
        }
      } catch {
        // Ignorar erros de imagem — célula ficará vazia
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
    cPow.value = item.power || "-";

    // H = TEMPERATURA DE COR
    const cCct = ws.getCell(`H${rowNum}`);
    cCct.value = item.cct || "-";

    // I = QTD
    const cQty = ws.getCell(`I${rowNum}`);
    cQty.value = item.qty;
    cQty.font = { name: "Calibri", size: 12, bold: true };

    // K = PREÇO UNITÁRIO
    const cUnit = ws.getCell(`K${rowNum}`);
    if (item.unitPrice !== null && item.unitPrice !== undefined) {
      cUnit.value = item.unitPrice;
      cUnit.numFmt = '"R$"#,##0.00';
    } else {
      cUnit.value = "-";
    }

    // L = PREÇO TOTAL
    const cTotal = ws.getCell(`L${rowNum}`);
    if (item.totalPrice !== null && item.totalPrice !== undefined) {
      cTotal.value = item.totalPrice;
      cTotal.numFmt = '"R$"#,##0.00';
      cTotal.font = { name: "Calibri", size: 11, bold: true };
    } else {
      cTotal.value = "-";
    }
  }

  // ── Linha de total geral ──────────────────────────────────────────────────
  const totalRow = currentRow + items.length;
  ws.getRow(totalRow).height = 30;

  const totalGeral = items.reduce((sum, it) => sum + (it.totalPrice ?? 0), 0);

  ws.mergeCells(`C${totalRow}:K${totalRow}`);
  const cTotalLabel = ws.getCell(`C${totalRow}`);
  cTotalLabel.value = "VALOR TOTAL DOS PRODUTOS (sem frete):";
  cTotalLabel.font = { name: "Calibri", size: 12, bold: true };
  cTotalLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
  cTotalLabel.alignment = { horizontal: "right", vertical: "middle" };
  applyBorder(cTotalLabel, { style: "medium", color: { argb: "FF4472C4" } });

  const cTotalVal = ws.getCell(`L${totalRow}`);
  cTotalVal.value = totalGeral;
  cTotalVal.numFmt = '"R$"#,##0.00';
  cTotalVal.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FF1F497D" } };
  cTotalVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
  cTotalVal.alignment = { horizontal: "center", vertical: "middle" };
  applyBorder(cTotalVal, { style: "medium", color: { argb: "FF4472C4" } });

  // ── Espaço ────────────────────────────────────────────────────────────────
  const sepRow = totalRow + 2;
  ws.getRow(sepRow).height = 18;

  // ── Condições comerciais ──────────────────────────────────────────────────
  const condRow = sepRow + 1;
  ws.getRow(condRow).height = 28;

  const addCondRow = (rowNum: number, label: string, value: string) => {
    ws.getRow(rowNum).height = 28;
    const cLabel = ws.getCell(`C${rowNum}`);
    cLabel.value = label;
    cLabel.font = { name: "Calibri", size: 11, bold: true };
    cLabel.alignment = { horizontal: "left", vertical: "middle" };

    ws.mergeCells(`E${rowNum}:L${rowNum}`);
    const cVal = ws.getCell(`E${rowNum}`);
    cVal.value = value;
    cVal.font = { name: "Calibri", size: 11 };
    cVal.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  };

  addCondRow(condRow, "Prazo de fabricação e entrega:", "PRAZO A SER PREENCHIDO");
  addCondRow(condRow + 2, "Condição de pagto:", "30% Sinal e 70% a 28DDF (mediante a aprovação de cadastro)");
  addCondRow(condRow + 4, "Frete:", "CIF - Para faturamento acima de R$ 1.500,00 São Paulo / SP (Capital). Demais localidades sob consulta.");
  addCondRow(condRow + 6, "Observação:", "Pode ser acrescido o valor de DIFAL, de acordo com o Estado e classificação fiscal da empresa.");

  // ── Rodapé ────────────────────────────────────────────────────────────────
  const footerRow = condRow + 9;
  ws.getRow(footerRow).height = 35;
  ws.mergeCells(`C${footerRow}:L${footerRow}`);
  const cFooter = ws.getCell(`C${footerRow}`);
  cFooter.value = "Estamos à disposição para quaisquer esclarecimentos,";
  cFooter.font = { name: "Calibri", size: 12, italic: true };
  cFooter.alignment = { horizontal: "center", vertical: "middle" };

  const vendRow = footerRow + 2;
  ws.getRow(vendRow).height = 20;
  ws.getCell(`C${vendRow}`).value = "VENDEDOR";
  ws.getCell(`C${vendRow}`).font = { name: "Calibri", size: 11, bold: true };

  ws.getRow(vendRow + 1).height = 20;
  ws.getCell(`C${vendRow + 1}`).value = "E-MAIL VENDEDOR";
  ws.getCell(`C${vendRow + 1}`).font = { name: "Calibri", size: 11 };

  ws.getRow(vendRow + 2).height = 40;
  ws.mergeCells(`C${vendRow + 2}:F${vendRow + 2}`);
  ws.getCell(`C${vendRow + 2}`).value = "CONTATO:   (11) 5666.9272 | (11) CELULAR VENDEDOR";
  ws.getCell(`C${vendRow + 2}`).font = { name: "Calibri", size: 11 };

  // ── Rodapé endereço ───────────────────────────────────────────────────────
  const addrRow = vendRow + 6;
  ws.getRow(addrRow).height = 22;
  ws.mergeCells(`C${addrRow}:L${addrRow}`);
  const cAddr = ws.getCell(`C${addrRow}`);
  cAddr.value = "R. Agostino Togneri, nº 617 - Jurubatuba - São Paulo/SP";
  cAddr.font = { name: "Calibri", size: 10, color: { argb: "FF595959" } };
  cAddr.alignment = { horizontal: "center", vertical: "middle" };
  cAddr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BLUE } };
  cAddr.font = { name: "Calibri", size: 10, bold: true, color: { argb: HEADER_TEXT_WHITE } };

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
