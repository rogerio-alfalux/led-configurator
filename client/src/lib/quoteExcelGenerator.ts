/**
 * Gerador de orçamento em Excel — fiel ao template TEMPLATEVIVIAN28.05.2026.xlsx
 *
 * Layout:
 *   Linhas 1-2  : espaço
 *   Linhas 3-4  : telefone e endereço (C3:N3 e C4:N4) — logo ALFALUX à direita (G1:N14)
 *   Linha  6    : número do orçamento (C6:D6) — fundo azul
 *   Linhas 7-13 : VENDEDOR, OBRA, CLIENTE, CONTATO/TEL, E-MAIL, ARQUITEURA/LD, REFERÊNCIA
 *   Linha  14   : DATA (C14:D14) — fundo azul
 *   Linha  15   : proposta comercial
 *   Linha  16   : espaço
 *   Linha  17   : título da obra (C17:N17) — fundo azul
 *   Linha  18   : cabeçalho da tabela (azul)
 *   Linhas 19+  : produtos
 *   Rodapé      : prazo, total, pagamento, frete, observação, vendedor, condições, assinatura
 *
 * Sem RT, Margem ou Assistente — arquivo enviado ao cliente.
 */

import ExcelJS from "exceljs";
import type { CartItemData, QuoteFormData } from "./cartTypes";

// ── Cores do template ────────────────────────────────────────────────────────
const BLUE       = "FF5B9BD5"; // Azul do template (cabeçalho tabela, número, data)
const WHITE_TXT  = "FFFFFFFF";
const RED_TXT    = "FFFF0000";
const DARK_BLUE  = "FF1F3864"; // Azul escuro para título da obra
const TOTAL_BG   = "FFE2EFF8"; // Fundo do total

// ── Borda medium (fiel ao template) ─────────────────────────────────────────
const BORDER_MEDIUM: Partial<ExcelJS.Border> = { style: "medium" };
const BORDER_THIN:   Partial<ExcelJS.Border> = { style: "thin" };

function mediumBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top:    BORDER_MEDIUM,
    bottom: BORDER_MEDIUM,
    left:   BORDER_MEDIUM,
    right:  BORDER_MEDIUM,
  };
}

function thinBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top:    BORDER_THIN,
    bottom: BORDER_THIN,
    left:   BORDER_THIN,
    right:  BORDER_THIN,
  };
}

// ── Helpers de extração de dados do produto ──────────────────────────────────
function extractPower(description: string): string {
  const m = description.match(/(\d+(?:[,.]\d+)?\s*W(?:\/m)?)/i);
  return m ? m[1].replace(/\s+/g, "") : "-";
}

function extractLength(description: string): string {
  const m = description.match(/(\d{3,5})\s*mm/i);
  return m ? m[1] : "-";
}

function extractVoltage(description: string): string {
  if (/bivolt/i.test(description)) return "BIVOLT";
  const m = description.match(/(\d{2,3}[Vv])/);
  return m ? m[1].toUpperCase() : "-";
}

function extractDim(description: string): string {
  if (/dali/i.test(description)) return "DALI";
  if (/dim\s*110/i.test(description)) return "DIM 110V";
  if (/dim/i.test(description)) return "DIM";
  return "ON/OFF";
}

function buildFreteText(formData: QuoteFormData, totalBase: number): string {
  const { freteType, freteIsento, freteLocalidade } = formData;
  if (freteIsento) return "Frete isento (conforme negociação)";
  if (freteType === "free") return "CIF - Para faturamento acima de R$ 1.500,00 São Paulo/ SP (Capital). Demais localidades sob consulta";
  if (freteType === "night") return "Frete noturno — R$ 2.000,00";
  if (freteType === "paid") {
    if (freteLocalidade === "sp") {
      return totalBase >= 1500
        ? "CIF - Para faturamento acima de R$ 1.500,00 São Paulo/ SP (Capital). Demais localidades sob consulta"
        : "Frete a cobrar — São Paulo/SP Capital (faturamento abaixo de R$ 1.500,00)";
    }
    return "Frete sob consulta — localidade fora de São Paulo/SP Capital";
  }
  if (freteType === "consult") return "Frete sob consulta";
  return "CIF - Para faturamento acima de R$ 1.500,00 São Paulo/ SP (Capital). Demais localidades sob consulta";
}

// ── Função principal ─────────────────────────────────────────────────────────
export async function generateQuoteExcel(
  items: CartItemData[],
  formData: QuoteFormData
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Alfalux LED Configurator";
  wb.created = new Date();

  const ws = wb.addWorksheet("Alfalux");

  // ── Larguras das colunas (fiel ao template) ──────────────────────────────
  // A=2.1, B=2.3, C=25.1, D=41.4, E=62.7, F=26.4, G=22.4, H=18.1,
  // I=sem width (col I não tem width definida no template), J=24.6, K=29, L=23.8, M=16.8, N=18.2
  ws.columns = [
    { key: "A", width: 2.1  },
    { key: "B", width: 2.3  },
    { key: "C", width: 13   },  // ITEM EM PLANTA
    { key: "D", width: 22   },  // FOTO
    { key: "E", width: 38   },  // MODELO ALFALUX
    { key: "F", width: 14   },  // COMPRIMENTO
    { key: "G", width: 12   },  // POTÊNCIA
    { key: "H", width: 10   },  // DIM
    { key: "I", width: 12   },  // TENSÃO
    { key: "J", width: 16   },  // COR
    { key: "K", width: 16   },  // TEMPERATURA DE COR
    { key: "L", width: 8    },  // QTD
    { key: "M", width: 14   },  // PREÇO UNITÁRIO
    { key: "N", width: 15   },  // PREÇO TOTAL
  ];

  // ── Linhas 1-2: espaço para o logo ──────────────────────────────────────
  ws.getRow(1).height = 19.8;
  ws.getRow(2).height = 19.8;

  // ── Linha 3: Telefone ────────────────────────────────────────────────────
  ws.getRow(3).height = 21.0;
  ws.mergeCells("C3:N3");
  {
    const c = ws.getCell("C3");
    c.value = "          (11) 5666.9272 / 5666.4856";
    c.font = { name: "Calibri", size: 16, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ── Linha 4: Endereço ────────────────────────────────────────────────────
  ws.getRow(4).height = 21.6;
  ws.mergeCells("C4:N4");
  {
    const c = ws.getCell("C4");
    c.value = "Rua Agostino Togneri, n° 617 - Jurubatuba - São Paulo/ SP";
    c.font = { name: "Calibri", size: 16, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ── Linha 5: espaço ──────────────────────────────────────────────────────
  ws.getRow(5).height = 20.4;

  // ── Linha 6: Número do orçamento (fundo azul, bold grande) ──────────────
  ws.getRow(6).height = 31.2;
  ws.mergeCells("C6:D6");
  {
    const c = ws.getCell("C6");
    c.value = formData.numero || "";
    c.font = { name: "Calibri", size: 24, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ── Linha 7: VENDEDOR ────────────────────────────────────────────────────
  ws.getRow(7).height = 25.8;
  {
    const c = ws.getCell("C7");
    const vendedorText = [formData.seller1Name, formData.seller2Name].filter(Boolean).join(" / ") || "";
    c.value = `VENDEDOR: ${vendedorText}`;
    c.font = { name: "Calibri", size: 15, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 8: OBRA ────────────────────────────────────────────────────────
  ws.getRow(8).height = 19.8;
  {
    const c = ws.getCell("C8");
    c.value = `OBRA: ${formData.obra || ""}`;
    c.font = { name: "Calibri", size: 15, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 9: CLIENTE ─────────────────────────────────────────────────────
  ws.getRow(9).height = 20.4;
  {
    const c = ws.getCell("C9");
    c.value = `CLIENTE: ${formData.cliente || ""}`;
    c.font = { name: "Calibri", size: 15, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 10: CONTATO/TEL ────────────────────────────────────────────────
  ws.getRow(10).height = 20.4;
  {
    const c = ws.getCell("C10");
    const contactText = [formData.contato, formData.tel].filter(Boolean).join(" — ");
    c.value = `CONTATO/TEL: ${contactText}`;
    c.font = { name: "Calibri", size: 15, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 11: E-MAIL ─────────────────────────────────────────────────────
  ws.getRow(11).height = 20.4;
  {
    const c = ws.getCell("C11");
    c.value = `E-MAIL: ${formData.email || ""}`;
    c.font = { name: "Calibri", size: 15, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 12: ARQUITEURA/LD ──────────────────────────────────────────────
  ws.getRow(12).height = 19.8;
  {
    const c = ws.getCell("C12");
    c.value = "ARQUITEURA/LD:";
    c.font = { name: "Calibri", size: 15, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 13: REFERÊNCIA ─────────────────────────────────────────────────
  ws.getRow(13).height = 19.8;
  {
    const c = ws.getCell("C13");
    c.value = `REFERÊNCIA: ${formData.referencia || "FORNECIMENTO DE LUMINÁRIAS"}`;
    c.font = { name: "Calibri", size: 15, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 14: DATA (fundo azul) ──────────────────────────────────────────
  ws.getRow(14).height = 31.2;
  ws.mergeCells("C14:D14");
  {
    const c = ws.getCell("C14");
    c.value = formData.data || new Date().toLocaleDateString("pt-BR");
    c.font = { name: "Calibri", size: 24, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ── Linha 15: Proposta Comercial ─────────────────────────────────────────
  ws.getRow(15).height = 28.8;
  ws.mergeCells("C15:N15");
  {
    const c = ws.getCell("C15");
    c.value = "PROPOSTA COMERCIAL PARA FORNECIMENTO DOS PRODUTOS ABAIXO ESPECIFICADOS, COM VALIDADE DE 3 (TRÊS) DIAS.";
    c.font = { name: "Calibri", size: 18, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }

  // ── Linha 16: espaço ─────────────────────────────────────────────────────
  ws.getRow(16).height = 18.0;

  // ── Linha 17: Título da obra (azul escuro, texto branco) ─────────────────
  ws.getRow(17).height = 39.6;
  ws.mergeCells("C17:N17");
  {
    const c = ws.getCell("C17");
    c.value = `OBRA ${(formData.obra || formData.cliente || "ORÇAMENTO").toUpperCase()}`;
    c.font = { name: "Calibri", size: 28, bold: true, color: { argb: WHITE_TXT } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_BLUE } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ── Linha 18: Cabeçalho da tabela (azul, texto branco) ───────────────────
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
    cell.font = { name: "Calibri", size: 14, bold: true, color: { argb: WHITE_TXT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    mediumBorder(cell);
  }

  // ── Linhas de dados (a partir da linha 19) ───────────────────────────────
  let currentRow = 19;
  const IMAGE_ROW_HEIGHT = 100; // altura generosa para fotos

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = currentRow + i;
    const row = ws.getRow(rowNum);
    row.height = IMAGE_ROW_HEIGHT;

    // Aplicar bordas medium e alinhamento em todas as colunas da tabela
    for (const col of ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"]) {
      const cell = ws.getCell(`${col}${rowNum}`);
      mediumBorder(cell);
      cell.font = { name: "Calibri", size: 14, bold: false };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }

    // C = ITEM EM PLANTA
    const cPlanta = ws.getCell(`C${rowNum}`);
    cPlanta.value = item.itemEmPlanta || String(i + 1);
    cPlanta.font = { name: "Calibri", size: 26, bold: true };
    cPlanta.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    // D = FOTO (imagem do produto)
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

          const cellW = 22 * 7.5;
          const cellH = IMAGE_ROW_HEIGHT;
          const PAD = 8;
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
    cSku.font = { name: "Calibri", size: 14, bold: false };
    cSku.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    // F = COMPRIMENTO (mm)
    ws.getCell(`F${rowNum}`).value = extractLength(item.description);

    // G = POTÊNCIA (W)
    ws.getCell(`G${rowNum}`).value = (item.power && item.power.trim()) ? item.power : extractPower(item.description);

    // H = DIM
    ws.getCell(`H${rowNum}`).value = extractDim(item.description);

    // I = TENSÃO (V)
    ws.getCell(`I${rowNum}`).value = extractVoltage(item.description);

    // J = COR
    ws.getCell(`J${rowNum}`).value = item.corPeca || "-";

    // K = TEMPERATURA DE COR (K)
    ws.getCell(`K${rowNum}`).value = item.cct || "-";

    // L = QTD
    const cQty = ws.getCell(`L${rowNum}`);
    cQty.value = item.qty;
    cQty.font = { name: "Calibri", size: 14, bold: true };

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
      cTotal.font = { name: "Calibri", size: 14, bold: false };
    } else {
      cTotal.value = "-";
    }
  }

  // ── Calcular total dos produtos ──────────────────────────────────────────
  const totalBase = items.reduce((sum, it) => sum + (it.totalPrice ?? 0), 0);
  let nextRow = currentRow + items.length;

  // Espaço após a tabela
  nextRow++;
  ws.getRow(nextRow).height = 10;
  nextRow++;

  // ── Prazo de fabricação e entrega ────────────────────────────────────────
  ws.getRow(nextRow).height = 29.4;
  ws.mergeCells(`C${nextRow}:D${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Prazo de fabricação e entrega:";
    c.font = { name: "Calibri", size: 15, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells(`E${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`E${nextRow}`);
    c.value = "20 dias úteis";
    c.font = { name: "Calibri", size: 15, bold: true, color: { argb: RED_TXT } };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow++;

  // ── Valor total dos produtos (sem o frete) ───────────────────────────────
  ws.getRow(nextRow).height = 42.6;
  ws.mergeCells(`C${nextRow}:D${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Valor total dos produtos\n(sem o frete):";
    c.font = { name: "Calibri", size: 15, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  }
  ws.mergeCells(`E${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`E${nextRow}`);
    c.value = totalBase;
    c.numFmt = '"R$"#,##0.00';
    c.font = { name: "Calibri", size: 16, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
    c.alignment = { horizontal: "left", vertical: "middle" };
    mediumBorder(c);
  }
  nextRow++;

  // Espaço
  nextRow++;
  ws.getRow(nextRow).height = 10;
  nextRow++;

  // ── Condição de pagamento ────────────────────────────────────────────────
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:D${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Condição de pagto:";
    c.font = { name: "Calibri", size: 15, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells(`E${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`E${nextRow}`);
    c.value = "30% Sinal e 70% a 28DDF (mediante a aprovação de cadastro)";
    c.font = { name: "Calibri", size: 14 };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow++;

  // ── Frete ────────────────────────────────────────────────────────────────
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:D${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Frete dedicado:";
    c.font = { name: "Calibri", size: 15, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells(`E${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`E${nextRow}`);
    c.value = buildFreteText(formData, totalBase);
    c.font = { name: "Calibri", size: 14 };
    c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  }
  nextRow++;

  // ── Observação ───────────────────────────────────────────────────────────
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:D${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Observação:";
    c.font = { name: "Calibri", size: 14, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow++;
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Pode ser acrescido o valor de DIFAL, de acordo com o Estado e classificação fiscal da empresa.";
    c.font = { name: "Calibri", size: 14 };
    c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  }
  nextRow++;

  // Espaço
  nextRow++;
  ws.getRow(nextRow).height = 10;
  nextRow++;

  // ── Estamos à disposição / Vendedor ──────────────────────────────────────
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Estamos à disposição para quaisquer esclarecimentos,";
    c.font = { name: "Calibri", size: 13 };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow++;

  // Nome do vendedor
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:D${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    const vendedorName = [formData.seller1Name, formData.seller2Name].filter(Boolean).join(" / ") || "";
    c.value = vendedorName;
    c.font = { name: "Calibri", size: 15, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow++;

  // Contato do vendedor
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "CONTATO:   (11) 5666.9272 | (11) 9 8221.9581";
    c.font = { name: "Calibri", size: 14 };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow++;

  // Espaço
  nextRow++;
  ws.getRow(nextRow).height = 10;
  nextRow++;

  // ── CONDIÇÕES GERAIS DE FORNECIMENTO ─────────────────────────────────────
  ws.getRow(nextRow).height = 28.8;
  ws.mergeCells(`C${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "CONDIÇÕES GERAIS DE FORNECIMENTO";
    c.font = { name: "Calibri", size: 22, bold: true, color: { argb: RED_TXT } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }
  nextRow++;

  const conditions = [
    { num: "1) ", text: "Os materiais especificados nesta proposta comercial estão de acordo com os dados fornecidos pelo cliente ou por profissional(is) por ele autorizados. Assim, não nos responsabilizamos por informações incompatíveis que possam ocasionar problemas com instalação ou aplicação do produto;" },
    { num: "2)", text: "Nossos produtos são fabricados sob encomenda, por esse motivo, as trocas somente serão realizadas por motivo de defeito de fabricação, após a análise da(s) peça(s) em fábrica e constatação do efetivo defeito;" },
    { num: "3)", text: "Pagamentos de sinal e/ou antecipado poderão ser efetuados num prazo de 5 dias úteis após a aprovação da proposta. O faturamento será realizado mediante a aprovação do cadastro;" },
    { num: "4)", text: "As luminárias ALFALUX possuem 01 (um) ano de garantia contra defeitos de fabricação. Para equipamentos (lâmpadas, drivers, reatores, transformadores, ignitores e capacitores), é repassada a garantia do fabricante;" },
    { num: "5) ", text: "A ALFALUX não realiza instalação de luminárias;" },
    { num: "6)", text: "Em caso de qualquer problema em nossos produtos, nossa assistência técnica deverá ser acionada. A manipulação incorreta ou alteração do produto ocasionará a perda da garantia. Serviços de assistência técnica que envolvam substituição de peças ou componentes das luminárias deverão ser realizados em nossa fábrica;" },
    { num: "7) ", text: "A conferência do material deverá ser efetuada no ato da entrega, havendo qualquer irregularidade ou avaria, está deverá ser comunicada e notificado no recebimento. Em caso de não conferência a ALFALUX não se responsabiliza por eventuais divergências ou danos às mercadorias;" },
    { num: "8)", text: "A responsabilidade sobre problemas ocasionados durante o transporte é da transportadora, orientamos que realizem anotação no conhecimento, como forma de comprovação do dano e o futuro ressarcimento pelo responsável. Não nos responsabilizamos por danos ocasionados pelo transporte incorreto da mercadoria, por terceiros;" },
    { num: "9)", text: "Cancelamento total ou parcial, será aceito somente no período de 48 horas da aprovação do pedido, após haverá a cobrança de 10% sobre o valor dos itens cancelados, em função da interrupção do processo fabril e ressarcimento de despesas geradas com a compra de matéria prima e mão de obra. Não aceitamos o cancelamento de produtos especiais, nesta hipótese haverá a cobrança do valor integral do produto." },
  ];

  for (const cond of conditions) {
    ws.getRow(nextRow).height = 16.8;
    {
      const c = ws.getCell(`C${nextRow}`);
      c.value = cond.num;
      c.font = { name: "Calibri", size: 14, bold: true };
      c.alignment = { horizontal: "right", vertical: "top" };
    }
    ws.mergeCells(`D${nextRow}:N${nextRow}`);
    {
      const c = ws.getCell(`D${nextRow}`);
      c.value = cond.text;
      c.font = { name: "Calibri", size: 12 };
      c.alignment = { horizontal: "left", vertical: "top", wrapText: true };
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
    c.font = { name: "Calibri", size: 24, bold: true, color: { argb: RED_TXT } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }
  nextRow += 3;

  // ── Data e Assinatura ─────────────────────────────────────────────────────
  ws.getRow(nextRow).height = 33.6;
  ws.mergeCells(`D${nextRow}:E${nextRow}`);
  {
    const c = ws.getCell(`D${nextRow}`);
    c.value = "Data:  ____/___/_____";
    c.font = { name: "Calibri", size: 26, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells(`F${nextRow}:H${nextRow}`);
  {
    const c = ws.getCell(`F${nextRow}`);
    c.value = "De acordo: _____________________________________";
    c.font = { name: "Calibri", size: 26, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow += 4;

  // ── Rodapé endereço (fundo azul) ─────────────────────────────────────────
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "R. Agostino Togneri, nº 617 - Jurubatuba - São Paulo/SP  - CEP: 04690-090";
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    c.font = { name: "Calibri", size: 11, color: { argb: WHITE_TXT } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ── Inserir logo ALFALUX (canto superior direito, linhas 1-14, colunas G-N) ──
  // O logo é inserido como imagem no canto direito do cabeçalho
  try {
    const logoUrl = "/manus-storage/alfalux-logo-v2_e9782715.png";
    const logoResponse = await fetch(logoUrl);
    if (logoResponse.ok) {
      const logoBuffer = await logoResponse.arrayBuffer();
      const logoId = wb.addImage({ buffer: logoBuffer, extension: "png" });
      // Posicionar logo: coluna G (índice 6) até N (índice 13), linhas 1-14
      // Usando posicionamento em pixels para fidelidade ao template
      // Calcular tamanho do logo: colunas G-N (~8 colunas * 7.5px/char * 12chars = ~720px), linhas 1-14 (~14 * 15px = ~210px)
      ws.addImage(logoId, {
        tl: { col: 6.2, row: 0.5 },
        ext: { width: 560, height: 200 },
        editAs: "oneCell",
      } as ExcelJS.ImagePosition & { editAs: string });
    }
  } catch {
    // Ignorar erro de logo
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
