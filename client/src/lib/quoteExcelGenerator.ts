/**
 * Gerador de orçamento em Excel — fiel ao template TEMPLATEVIVIAN28.05.2026.xlsx
 *
 * Layout (colunas C-N visíveis ao cliente):
 *   Linhas 1-2  : espaço
 *   Linhas 3-4  : telefone e endereço (C3:N3 e C4:N4)
 *   Linhas 3-14 : logo ALFALUX à direita (colunas G-N)
 *   Linha  5    : espaço
 *   Linha  6    : número do orçamento (C6:D6) — fundo azul
 *   Linhas 7-13 : VENDEDOR, OBRA, CLIENTE, CONTATO/TEL, E-MAIL, ARQUITEURA/LD, REFERÊNCIA
 *   Linha  14   : DATA (C14:D14) — fundo azul
 *   Linha  15   : proposta comercial
 *   Linha  16   : espaço
 *   Linha  17   : título da obra (C17:N17) — fundo azul escuro
 *   Linha  18   : cabeçalho da tabela (azul)
 *   Linhas 19+  : produtos
 *   Rodapé      : prazo, total, pagamento, frete, observação, vendedor, condições, assinatura
 *
 * Sem RT, Margem ou Assistente — arquivo enviado ao cliente.
 */

import ExcelJS from "exceljs";
import type { CartItemData, LinkedAccessory, QuoteFormData } from "./cartTypes";

// ── Cores do template ────────────────────────────────────────────────────────
const BLUE      = "FF5B9BD5"; // Azul do template (cabeçalho tabela, número, data)
const WHITE_TXT = "FFFFFFFF";
const RED_TXT   = "FFFF0000";
const DARK_BLUE = "FF1F3864"; // Azul escuro para título da obra
const TOTAL_BG  = "FFE2EFF8"; // Fundo do total

// ── Borda medium (fiel ao template) ─────────────────────────────────────────
const BORDER_MEDIUM: Partial<ExcelJS.Border> = { style: "medium" };

function mediumBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top:    BORDER_MEDIUM,
    bottom: BORDER_MEDIUM,
    left:   BORDER_MEDIUM,
    right:  BORDER_MEDIUM,
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
  if (freteType === "night") {
    const val = formData.freteValue && formData.freteValue > 0
      ? formData.freteValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "2.000,00";
    return `Frete noturno — R$ ${val}`;
  }
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

//// ── Cache de fotos frescas da API Alfalux ───────────────────────────────
// A URL da foto no itemData pode expirar (CloudFront signed URL).
// Esta função busca uma URL fresca via API usando o SKU do produto.
let _freshPhotoCache: Map<string, string> | null = null;
async function getFreshPhotoUrl(sku: string, fallbackUrl?: string | null): Promise<string | null> {
  try {
    if (!_freshPhotoCache) {
      const res = await fetch("/api/trpc/alfalux.products", {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const json = await res.json();
        const products: Array<{ sku?: string; fotoUrl?: string }> =
          json?.result?.data?.json ?? json?.result?.data ?? [];
        _freshPhotoCache = new Map();
        for (const p of products) {
          if (p.sku && p.fotoUrl) _freshPhotoCache.set(p.sku, p.fotoUrl);
        }
      } else {
        _freshPhotoCache = new Map();
      }
    }
    return _freshPhotoCache.get(sku) ?? fallbackUrl ?? null;
  } catch {
    return fallbackUrl ?? null;
  }
}

// ── Cache de fotos frescas de acessórios ────────────────────────────────
let _freshAccPhotoCache: Map<string, string> | null = null;
async function getFreshAccPhotoUrl(codigo: string, fallbackUrl?: string | null): Promise<string | null> {
  try {
    if (!_freshAccPhotoCache) {
      const res = await fetch("/api/trpc/alfalux.acessoriosProducts", {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const json = await res.json();
        const products: Array<{ codigo?: string; sku?: string; fotoUrl?: string }> =
          json?.result?.data?.json ?? json?.result?.data ?? [];
        _freshAccPhotoCache = new Map();
        for (const p of products) {
          const key = p.codigo ?? p.sku;
          if (key && p.fotoUrl) _freshAccPhotoCache.set(key, p.fotoUrl);
        }
      } else {
        _freshAccPhotoCache = new Map();
      }
    }
    return _freshAccPhotoCache.get(codigo) ?? fallbackUrl ?? null;
  } catch {
    return fallbackUrl ?? null;
  }
}

// ── Função interna de geração (retorna buffer) ─────────────────────────────
async function _generateExcelBuffer(
  items: CartItemData[],
  formData: QuoteFormData
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Configurador Alfalux";
  wb.created = new Date();

  const ws = wb.addWorksheet("Alfalux");

  // ── Configurações de impressão (fiel ao template) ──────────────────────────────
  // Template: scale=51%, portrait, margens L/R=0.7", T/B=0.75", H/F=0.3"
  // Área de impressão: $C$1:$N$72 (colunas C-N)
  // fitToPage=true para garantir que cabe em 1 página
  // Configurações de impressão idênticas ao template:
  // <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  // <pageSetup scale="51" orientation="portrait" horizontalDpi="4294967295" verticalDpi="4294967295"/>
  // <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
  // definedName: _xlnm.Print_Area = 'Alfalux'!$C$1:$N$72
  ws.pageSetup.paperSize = 9;            // A4
  ws.pageSetup.orientation = "portrait";
  ws.pageSetup.fitToPage = true;         // ativa <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  ws.pageSetup.fitToWidth = 1;           // 1 página de largura
  ws.pageSetup.fitToHeight = 0;          // 0 = sem limite de altura (escala automática)
  ws.pageSetup.scale = 51;               // 51% igual ao template
  ws.pageSetup.horizontalDpi = 4294967295; // idêntico ao template
  ws.pageSetup.verticalDpi = 4294967295;   // idêntico ao template
  ws.pageSetup.printArea = "C1:N200";    // Área de impressão (colunas C-N)
  ws.pageSetup.margins = {
    left: 0.7,
    right: 0.7,
    top: 0.75,
    bottom: 0.75,
    header: 0.3,
    footer: 0.3,
  };

  // ── Larguras das colunas (fiel ao template) ──────────────────────────────────────────────
  // Template original: C=12, D=18, E=35, F=15.1, G=12, H=10, I=13, J=14, K=13, L=7, M=13, N=14
  ws.columns = [
    { key: "A", width: 2.1  },
    { key: "B", width: 2.3  },
    { key: "C", width: 12   },  // ITEM EM PLANTA
    { key: "D", width: 18   },  // FOTO — quadrado
    { key: "E", width: 35   },  // MODELO ALFALUX
    { key: "F", width: 14   },  // COMPRIMENTO (mm)
    { key: "G", width: 12   },  // POTÊNCIA (W)
    { key: "H", width: 10   },  // DIM
    { key: "I", width: 10   },  // TENSÃO (V)
    { key: "J", width: 14   },  // COR
    { key: "K", width: 14   },  // TEMPERATURA DE COR (K)
    { key: "L", width: 7    },  // QTD
    { key: "M", width: 13   },  // PREÇO UNITÁRIO
    { key: "N", width: 14   },  // PREÇO TOTAL
    { key: "O", width: 30   },  // OBS. INTERNA (item especial, não impresso)
    { key: "P", width: 35   },  // OBSERVAÇÃO DO ITEM (livre, não impresso)
    { key: "Q", width: 14   },  // RT (não impresso)
    { key: "R", width: 14   },  // MARGEM (não impresso)
  ];

  // ── Linhas 1-2: espaço para o logo ──────────────────────────────────────
  ws.getRow(1).height = 19.8;
  ws.getRow(2).height = 19.8;

  // ── Linha 3: Telefone (colunas C-J) — logo fica em K-N ─────────────────
  ws.getRow(3).height = 21.0;
  ws.mergeCells("C3:J3");
  {
    const c = ws.getCell("C3");
    c.value = "(11) 5666.9272 / 5666.4856";
    c.font = { name: "Calibri", size: 11, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 4: Endereço (colunas C-J) ─────────────────────────────────────
  ws.getRow(4).height = 21.6;
  ws.mergeCells("C4:J4");
  {
    const c = ws.getCell("C4");
    c.value = "Rua Agostino Togneri, n° 617 - Jurubatuba - São Paulo/ SP";
    c.font = { name: "Calibri", size: 11, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 5: espaço ──────────────────────────────────────────────────────
  ws.getRow(5).height = 20.4;
  // ── Linha 6: Número do orçamento (fundo azul) ────────────────────────────────────────
  // Sufixo de revisão: RV0 = sem revisões, RV1 = 1 revisão, etc.
  const revCount = formData.revisionCount ?? 0;
  const rvSuffix = ` (RV${revCount})`;
  ws.getRow(6).height = 31.2;
  ws.mergeCells("C6:D6");
  {
    const c = ws.getCell("C6");
    c.value = (formData.numero || "") + rvSuffix;
    c.font = { name: "Calibri", size: 16, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ── Colunas P-Q: RT, Margem e Assistente (não impressas, posição conforme template) ────────
  // Posição exata: P5=RT:, Q5=valor; P6=Margem:, Q6=valor; P7=Assistente:, Q7=nome
  const INTERNAL_LABEL_FONT: Partial<ExcelJS.Font> = { name: "Calibri", size: 10, bold: true, color: { argb: "FF7F7F7F" } };
  const INTERNAL_VALUE_FONT: Partial<ExcelJS.Font> = { name: "Calibri", size: 11, bold: true };
  // P5: label RT, Q5: valor RT
  { const c = ws.getCell("P5"); c.value = "RT:"; c.font = INTERNAL_LABEL_FONT; c.alignment = { horizontal: "right", vertical: "middle" }; }
  {
    const c = ws.getCell("Q5");
    const rtPct = formData.rtPercent ?? 0;
    c.value = rtPct > 0 ? `${(rtPct * 100).toFixed(1)}%` : "-";
    c.font = INTERNAL_VALUE_FONT;
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  // P6: label Margem, Q6: valor Margem
  { const c = ws.getCell("P6"); c.value = "Margem:"; c.font = INTERNAL_LABEL_FONT; c.alignment = { horizontal: "right", vertical: "middle" }; }
  {
    const c = ws.getCell("Q6");
    const marginPct = formData.marginPercent ?? 0;
    c.value = marginPct > 0 ? `${(marginPct * 100).toFixed(1)}%` : "-";
    c.font = INTERNAL_VALUE_FONT;
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  // P7: label Assistente, Q7: nome
  { const c = ws.getCell("P7"); c.value = "Assistente:"; c.font = INTERNAL_LABEL_FONT; c.alignment = { horizontal: "right", vertical: "middle" }; }
  {
    const c = ws.getCell("Q7");
    c.value = formData.assistantName || "-";
    c.font = INTERNAL_VALUE_FONT;
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 7: VENDEDOR ────────────────────────────────────────
  ws.getRow(7).height = 25.8;
  {
    const c = ws.getCell("C7");
    const vendedorText = [formData.seller1Name, formData.seller2Name].filter(Boolean).join(" / ") || "";
    c.value = `VENDEDOR: ${vendedorText}`;
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 8: OBRA ────────────────────────────────────────────────────────
  ws.getRow(8).height = 19.8;
  {
    const c = ws.getCell("C8");
    c.value = `OBRA: ${formData.obra || ""}`;
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 9: CLIENTE ─────────────────────────────────────────────────────
  ws.getRow(9).height = 20.4;
  {
    const c = ws.getCell("C9");
    c.value = `CLIENTE: ${formData.cliente || ""}`;
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 10: CONTATO/TEL ────────────────────────────────────────────────
  ws.getRow(10).height = 20.4;
  {
    const c = ws.getCell("C10");
    const contactText = [formData.contato, formData.tel].filter(Boolean).join(" — ");
    c.value = `CONTATO/TEL: ${contactText}`;
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 11: E-MAIL ─────────────────────────────────────────────────────
  ws.getRow(11).height = 20.4;
  {
    const c = ws.getCell("C11");
    c.value = `E-MAIL: ${formData.email || ""}`;
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 12: ARQUITEURA/LD ──────────────────────────────────────────────
  ws.getRow(12).height = 19.8;
  {
    const c = ws.getCell("C12");
    c.value = "ARQUITEURA/LD:";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 13: REFERÊNCIA ─────────────────────────────────────────────────
  ws.getRow(13).height = 19.8;
  {
    const c = ws.getCell("C13");
    c.value = `REFERÊNCIA: ${formData.referencia || "FORNECIMENTO DE LUMINÁRIAS"}`;
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Linha 14: DATA (fundo azul) ──────────────────────────────────────────
  ws.getRow(14).height = 31.2;
  ws.mergeCells("C14:D14");
  {
    const c = ws.getCell("C14");
    c.value = formData.data || new Date().toLocaleDateString("pt-BR");
    c.font = { name: "Calibri", size: 16, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ── Linha 15: Proposta Comercial ─────────────────────────────────────────
  ws.getRow(15).height = 28.8;
  ws.mergeCells("C15:N15");
  {
    const c = ws.getCell("C15");
    c.value = "PROPOSTA COMERCIAL PARA FORNECIMENTO DOS PRODUTOS ABAIXO ESPECIFICADOS, COM VALIDADE DE 3 (TRÊS) DIAS.";
    c.font = { name: "Calibri", size: 12, bold: true };
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
    c.font = { name: "Calibri", size: 20, bold: true, color: { argb: WHITE_TXT } };
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
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE_TXT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    mediumBorder(cell);
  }
  // ── Linhas de dados (a partir da linha 19) ───────────────────────────────────────
  let currentRow = 19;
  // Altura da linha de produto: quadrado para a foto
  // Coluna D tem 18 chars * ~7px = ~126px → usamos 90pt (1pt ≈ 1.33px → ~120px)
  const IMAGE_ROW_HEIGHT = 90;
  // Rastrear pavimento atual para inserir cabeçalho quando mudar
  let lastFloorId: string | undefined = undefined;
  let floorHeaderCount = 0; // número de linhas de cabeçalho de pavimento inseridas

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // Inserir cabeçalho de pavimento quando floorId muda
    if (item.floorId && item.floorId !== lastFloorId) {
      const fhRow = currentRow + i + floorHeaderCount;
      const fhRowObj = ws.getRow(fhRow);
      fhRowObj.height = 22;
      ws.mergeCells(`C${fhRow}:N${fhRow}`);
      const fhCell = ws.getCell(`C${fhRow}`);
      fhCell.value = item.floorName ? `${item.floorId} — ${item.floorName}` : item.floorId;
      fhCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      fhCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } };
      fhCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      mediumBorder(fhCell);
      lastFloorId = item.floorId;
      floorHeaderCount++;
    }
    const rowNum = currentRow + i + floorHeaderCount;
    const row = ws.getRow(rowNum);

    // ── Categoria Serviços: linha compacta sem foto nem colunas técnicas ──────────────
    if (item.category === 'Serviços') {
      row.height = 30;
      const SERV_BG = 'FFF5F5F5';
      const SERV_COLOR = 'FF333333';
      for (const col of ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']) {
        const cell = ws.getCell(`${col}${rowNum}`);
        mediumBorder(cell);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SERV_BG } };
        cell.font = { name: 'Calibri', size: 11, color: { argb: SERV_COLOR } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
      ws.getCell(`C${rowNum}`).value = item.itemEmPlanta || '';
      // Mesclar D:K para descrição
      ws.mergeCells(`D${rowNum}:K${rowNum}`);
      const dCell = ws.getCell(`D${rowNum}`);
      dCell.value = item.description || item.sku || 'Serviço';
      dCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: SERV_COLOR } };
      dCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      ws.getCell(`L${rowNum}`).value = item.qty;
      const _rtPctS = Math.min(Math.max(formData.rtPercent ?? 0, 0), 0.99);
      const _mPctS = Math.min(Math.max(formData.marginPercent ?? 0, 0), 0.99);
      const applyMarkupS = (b: number) => { const r = _rtPctS > 0 ? b / (1 - _rtPctS) : b; return _mPctS > 0 ? r / (1 - _mPctS) : r; };
      if (item.unitPrice && item.unitPrice > 0) {
        const mCell = ws.getCell(`M${rowNum}`);
        mCell.value = applyMarkupS(item.unitPrice);
        mCell.numFmt = '"R$"#,##0.00';
      }
      if (item.totalPrice && item.totalPrice > 0) {
        const nCell = ws.getCell(`N${rowNum}`);
        nCell.value = applyMarkupS(item.totalPrice);
        nCell.numFmt = '"R$"#,##0.00';
      }
      continue; // pular o restante do loop para este item
    }

    row.height = IMAGE_ROW_HEIGHT;

    // Aplicar bordas medium e alinhamento em todas as colunas da tabela
    for (const col of ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"]) {
      const cell = ws.getCell(`${col}${rowNum}`);
      mediumBorder(cell);
      cell.font = { name: "Calibri", size: 11, bold: false };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }

    // C = ITEM EM PLANTA — em branco se não preenchido
    const cPlanta = ws.getCell(`C${rowNum}`);
    if (item.itemEmPlanta && item.itemEmPlanta.trim()) {
      cPlanta.value = item.itemEmPlanta.trim();
      cPlanta.font = { name: "Calibri", size: 20, bold: true };
    } else {
      cPlanta.value = "";
    }
    cPlanta.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    // D = FOTO (imagem do produto — centralizada na célula quadrada)
    // Buscar URL fresca via API para evitar expiração de CloudFront signed URLs
    const freshPhotoUrl = await getFreshPhotoUrl(item.sku || "", item.photoUrl);
    if (freshPhotoUrl) {
      try {
        let fetchUrl: string;
        if (freshPhotoUrl.startsWith("/manus-storage/")) {
          fetchUrl = freshPhotoUrl;
        } else {
          fetchUrl = `/api/image-proxy?url=${encodeURIComponent(freshPhotoUrl)}`;
        }
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          let ext: "png" | "jpeg" | "gif" = "jpeg";
          if (uint8[0] === 0x89 && uint8[1] === 0x50) ext = "png";
          else if (uint8[0] === 0x47 && uint8[1] === 0x49) ext = "gif";

          // Carregar imagem para obter dimensões reais
          const blob = new Blob([arrayBuffer]);
          const blobUrl = URL.createObjectURL(blob);
          const imgEl = await new Promise<HTMLImageElement>((resolve) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => resolve(el);
            el.src = blobUrl;
          });
          URL.revokeObjectURL(blobUrl);

          // Célula D: largura 18 chars × 7px = 126px, altura 90pt × 1.33 = ~120px
          // Usamos pixels reais para posicionamento
          const cellWpx = 18 * 7;   // ~126px
          const cellHpx = 90 * 1.33; // ~120px
          const PAD = 8;
          const maxW = cellWpx - PAD * 2;  // ~110px
          const maxH = cellHpx - PAD * 2;  // ~104px

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

          // Centralizar dentro da célula D
          // Coluna D começa no índice 3 (0-based)
          // offsetX em fração de coluna, offsetY em fração de linha
          const colDWidthPx = cellWpx;
          const rowHeightPx = cellHpx;
          const offsetXfrac = (colDWidthPx - drawW) / 2 / colDWidthPx;
          const offsetYfrac = (rowHeightPx - drawH) / 2 / rowHeightPx;

          const imgId = wb.addImage({ buffer: arrayBuffer, extension: ext });
          ws.addImage(imgId, {
            tl: {
              col: 3 + offsetXfrac,
              row: (rowNum - 1) + offsetYfrac,
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
    cSku.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    // F = COMPRIMENTO (mm) — usa dimensões do item especial se disponível
    ws.getCell(`F${rowNum}`).value = (item.category === "Item Especial" && item.specialDimensions)
      ? item.specialDimensions
      : extractLength(item.description);

    // G = POTÊNCIA (W) — usa campo especial se disponível
    ws.getCell(`G${rowNum}`).value = (item.category === "Item Especial" && item.specialPower)
      ? item.specialPower
      : ((item.power && item.power.trim()) ? item.power : extractPower(item.description));

    // H = DIM — usa campo especial se disponível
    ws.getCell(`H${rowNum}`).value = (item.category === "Item Especial" && item.specialDim)
      ? item.specialDim
      : extractDim(item.description);

    // I = TENSÃO (V) — usa campo especial se disponível
    ws.getCell(`I${rowNum}`).value = (item.category === "Item Especial" && item.specialVoltage)
      ? item.specialVoltage
      : extractVoltage(item.description);

    // J = COR — usa corPeca (item especial não exibe cor)
    ws.getCell(`J${rowNum}`).value = item.category === "Item Especial" ? "-" : (item.corPeca || "-");

    // K = TEMPERATURA DE COR (K)
    ws.getCell(`K${rowNum}`).value = item.cct || "-";

    // L = QTD
    const cQty = ws.getCell(`L${rowNum}`);
    cQty.value = item.qty;
    cQty.font = { name: "Calibri", size: 11, bold: true };

    // M = PREÇO UNITÁRIO (já com RT e Margem aplicados — valor final ao cliente)
    const _rtPct    = Math.min(Math.max(formData.rtPercent    ?? 0, 0), 0.99);
    const _marginPct = Math.min(Math.max(formData.marginPercent ?? 0, 0), 0.99);
    const applyMarkup = (base: number) => {
      const comRT  = _rtPct    > 0 ? base   / (1 - _rtPct)    : base;
      const final  = _marginPct > 0 ? comRT  / (1 - _marginPct) : comRT;
      return final;
    };
    const cUnit = ws.getCell(`M${rowNum}`);
    if (item.unitPrice !== null && item.unitPrice !== undefined && item.unitPrice > 0) {
      cUnit.value = applyMarkup(item.unitPrice);
      cUnit.numFmt = '"R$"#,##0.00';
    } else {
      cUnit.value = "-";
    }

    // N = PREÇO TOTAL (já com RT e Margem aplicados — valor final ao cliente)
    const cTotal = ws.getCell(`N${rowNum}`);
    if (item.totalPrice !== null && item.totalPrice !== undefined && item.totalPrice > 0) {
      cTotal.value = applyMarkup(item.totalPrice);
      cTotal.numFmt = '"R$"#,##0.00';
      cTotal.font = { name: "Calibri", size: 11, bold: false };
    } else {
      cTotal.value = "-";
    }

    // O = OBSERVAÇÃO INTERNA do item especial (não impressa)
    const cObs = ws.getCell(`O${rowNum}`);
    const obsInterna = item.specialInternalNotes || "";
    cObs.value = obsInterna;
    cObs.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF7F7F7F" } };
    cObs.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

    // P = OBSERVAÇÃO LIVRE DO ITEM (não impressa — editada pelo vendedor ou preenchida automaticamente para Revenda)
    const cItemNote = ws.getCell(`P${rowNum}`);
    const itemNote = item.itemNote || "";
    cItemNote.value = itemNote;
    cItemNote.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF4472C4" } };
    cItemNote.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

    // ── Rabicho inline na coluna E (MODELO ALFALUX) ────────────────────────
    // O rabicho é exibido abaixo da descrição do produto na célula E, com separador tracejado
    // Igual ao ExcelPreviewModal: rabicho NÃO vai para a coluna D (FOTO)
    const rabichoAcc = item.accessories?.find(a => a.familia?.toLowerCase().includes('rabicho'));
    const nonRabichoAcc = item.accessories?.filter(a => !a.familia?.toLowerCase().includes('rabicho')) ?? [];
    if (rabichoAcc) {
      // Atualizar célula E com rabicho abaixo da descrição
      const eCell = ws.getCell(`E${rowNum}`);
      const currentModelText = typeof eCell.value === 'string' ? eCell.value : (item.sku ? `${item.sku}\n${item.description}` : item.description);
      const rabichoLine = `\n- - - - - - - - - - - - - - - -\n\u21B3 Rabicho: ${rabichoAcc.descricao}${rabichoAcc.dimensao ? ` ${rabichoAcc.dimensao}` : ''}`;
      eCell.value = currentModelText + rabichoLine;
      eCell.font = { name: 'Calibri', size: 11, bold: false };
      eCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }

    // ── Sub-linhas de acessórios vinculados (não-rabicho) ──────────────────────
    if (nonRabichoAcc.length > 0) {
      for (let accIdx = 0; accIdx < nonRabichoAcc.length; accIdx++) {
        const acc = nonRabichoAcc[accIdx];
        const accRowNum = rowNum + accIdx + 1;
        ws.spliceRows(accRowNum, 0, []);
        const accRow = ws.getRow(accRowNum);
        accRow.height = 40; // Altura maior para texto visível
        const ACC_BG = "FFE0F7FA";
        const ACC_COLOR = "FF006064";
        const thinCyan: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FF80DEEA" } };
        const accBorder = { top: thinCyan, bottom: thinCyan, left: thinCyan, right: thinCyan };
        const fillAcc = (cell: ExcelJS.Cell, value: string | number | null, bold = false) => {
          cell.value = value ?? "";
          cell.font = { name: "Calibri", size: 9, bold, italic: true, color: { argb: ACC_COLOR } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACC_BG } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = accBorder;
        };
        fillAcc(ws.getCell(`C${accRowNum}`), "");
        // D = foto do acessório (se disponível)
        const freshAccUrl = await getFreshAccPhotoUrl(acc.codigo ?? "", acc.fotoUrl);
        if (freshAccUrl) {
          try {
            let fetchUrl = freshAccUrl.startsWith("/manus-storage/")
              ? freshAccUrl
              : `/api/image-proxy?url=${encodeURIComponent(freshAccUrl)}`;
            const accImgRes = await fetch(fetchUrl);
            if (accImgRes.ok) {
              const accBuf = await accImgRes.arrayBuffer();
              const accU8 = new Uint8Array(accBuf);
              let accExt: "png" | "jpeg" | "gif" = "jpeg";
              if (accU8[0] === 0x89 && accU8[1] === 0x50) accExt = "png";
              const accImgId = wb.addImage({ buffer: accBuf, extension: accExt });
              // Célula D: 18 chars * 7px = 126px, altura 40pt * 1.33 = ~53px
              const accCellH = 40 * 1.33;
              const accCellW = 18 * 7;
              const accPad = 4;
              const accMaxW = accCellW - accPad * 2;
              const accMaxH = accCellH - accPad * 2;
              ws.addImage(accImgId, {
                tl: { col: 3 + accPad / accCellW, row: (accRowNum - 1) + accPad / accCellH },
                ext: { width: Math.min(accMaxW, accMaxH), height: Math.min(accMaxW, accMaxH) },
                editAs: "oneCell",
              } as ExcelJS.ImagePosition & { editAs: string });
            }
          } catch { /* ignorar erro de imagem de acessório */ }
        }
        const dCell = ws.getCell(`D${accRowNum}`);
        if (!freshAccUrl) {
          dCell.value = `↳ Acessório: ${acc.descricao}`;
          dCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: ACC_COLOR } };
          dCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACC_BG } };
          dCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
          dCell.border = accBorder;
        } else {
          dCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACC_BG } };
          dCell.border = accBorder;
        }
        fillAcc(ws.getCell(`E${accRowNum}`), `↳ ${acc.descricao}\n${acc.codigo ?? ""}`);
        for (const col of ["F", "G", "H", "I", "J", "K"]) {
          fillAcc(ws.getCell(`${col}${accRowNum}`), "");
        }
        fillAcc(ws.getCell(`L${accRowNum}`), acc.qty, true);
        if (acc.unitPrice && acc.unitPrice > 0) {
          const mCell = ws.getCell(`M${accRowNum}`);
          mCell.value = acc.unitPrice;
          mCell.numFmt = '"R$"#,##0.00';
          mCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: ACC_COLOR } };
          mCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACC_BG } };
          mCell.alignment = { horizontal: "center", vertical: "middle" };
          mCell.border = accBorder;
          const nCell = ws.getCell(`N${accRowNum}`);
          nCell.value = acc.unitPrice * acc.qty;
          nCell.numFmt = '"R$"#,##0.00';
          nCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: ACC_COLOR } };
          nCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACC_BG } };
          nCell.alignment = { horizontal: "center", vertical: "middle" };
          nCell.border = accBorder;
        } else {
          fillAcc(ws.getCell(`M${accRowNum}`), "-");
          fillAcc(ws.getCell(`N${accRowNum}`), "-");
        }
      }
      // Avançar currentRow para compensar as sub-linhas inseridas
      currentRow += nonRabichoAcc.length;
    }
  }

  // ── Calcular total dos produtos ──────────────────────────────────────────
  const totalBase = items.reduce((sum, it) => sum + (it.totalPrice ?? 0), 0);
  // Aplicar RT e Margem (mesma fórmula do Cart.tsx)
  const rtPct    = Math.min(Math.max(formData.rtPercent    ?? 0, 0), 0.99);
  const marginPct = Math.min(Math.max(formData.marginPercent ?? 0, 0), 0.99);
  const totalComRT   = rtPct    > 0 ? totalBase  / (1 - rtPct)    : totalBase;
  const totalFinal   = marginPct > 0 ? totalComRT / (1 - marginPct) : totalComRT;
  // Calcular DIFAL e FCP a partir dos valores do formData (já calculados na UI)
  const difalAmt = (formData.difalEnabled && formData.difalValue && formData.difalValue > 0) ? formData.difalValue : 0;
  const fcpAmt   = (formData.fcpEnabled && formData.fcpValue && formData.fcpValue > 0) ? formData.fcpValue : 0;
  const totalComDifal = totalFinal + difalAmt + fcpAmt;
  let nextRow = currentRow + items.length + floorHeaderCount;

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
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells(`E${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`E${nextRow}`);
    const prazo = formData.deliveryDays ?? 20;
    c.value = `${prazo} dias úteis`;
    c.font = { name: "Calibri", size: 12, bold: true, color: { argb: RED_TXT } };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow++;  // ── Valor total dos produtos (sem o frete) ───────────────────────────────────────
  ws.getRow(nextRow).height = 42.6;
  ws.mergeCells(`C${nextRow}:D${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = totalComDifal > totalFinal
      ? "Subtotal dos produtos\n(sem frete, sem DIFAL/FCP):"
      : "Valor total dos produtos\n(sem o frete):";
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  }
  ws.mergeCells(`E${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`E${nextRow}`);
    c.value = totalFinal;
    c.numFmt = '"R$"#,##0.00';
    c.font = { name: "Calibri", size: 14, bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
    c.alignment = { horizontal: "left", vertical: "middle" };
    mediumBorder(c);
  }
  nextRow++;

  // ── Linhas de DIFAL e FCP (quando aplicáveis) ──────────────────────────
  if (difalAmt > 0) {
    ws.getRow(nextRow).height = 24;
    ws.mergeCells(`C${nextRow}:D${nextRow}`);
    {
      const c = ws.getCell(`C${nextRow}`);
      c.value = `DIFAL (${(formData.difalPercent ?? 0).toFixed(1)}%) — ${formData.destState ?? ""}:`;
      c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFCC0000" } };
      c.alignment = { horizontal: "left", vertical: "middle" };
    }
    ws.mergeCells(`E${nextRow}:N${nextRow}`);
    {
      const c = ws.getCell(`E${nextRow}`);
      c.value = difalAmt;
      c.numFmt = '"R$"#,##0.00';
      c.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFCC0000" } };
      c.alignment = { horizontal: "left", vertical: "middle" };
    }
    nextRow++;
  }
  if (fcpAmt > 0) {
    ws.getRow(nextRow).height = 24;
    ws.mergeCells(`C${nextRow}:D${nextRow}`);
    {
      const c = ws.getCell(`C${nextRow}`);
      c.value = `FCP (${(formData.fcpPercent ?? 0).toFixed(1)}%) — ${formData.destState ?? ""}:`;
      c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFCC0000" } };
      c.alignment = { horizontal: "left", vertical: "middle" };
    }
    ws.mergeCells(`E${nextRow}:N${nextRow}`);
    {
      const c = ws.getCell(`E${nextRow}`);
      c.value = fcpAmt;
      c.numFmt = '"R$"#,##0.00';
      c.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFCC0000" } };
      c.alignment = { horizontal: "left", vertical: "middle" };
    }
    nextRow++;
  }
  // ── Total com DIFAL/FCP (quando aplicável) ────────────────────────────────
  if (totalComDifal > totalFinal) {
    ws.getRow(nextRow).height = 42.6;
    ws.mergeCells(`C${nextRow}:D${nextRow}`);
    {
      const c = ws.getCell(`C${nextRow}`);
      c.value = "TOTAL GERAL\n(com DIFAL/FCP, sem frete):";
      c.font = { name: "Calibri", size: 12, bold: true };
      c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    }
    ws.mergeCells(`E${nextRow}:N${nextRow}`);
    {
      const c = ws.getCell(`E${nextRow}`);
      c.value = totalComDifal;
      c.numFmt = '"R$"#,##0.00';
      c.font = { name: "Calibri", size: 14, bold: true };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4D6" } }; // laranja claro
      c.alignment = { horizontal: "left", vertical: "middle" };
      mediumBorder(c);
    }
    nextRow++;
  }

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
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  ws.mergeCells(`E${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`E${nextRow}`);
    c.value = formData.paymentTerm ?? "30% Sinal e 70% a 28DDF (mediante a aprovação de cadastro)";
    c.font = { name: "Calibri", size: 11 };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow++;

  // ── Frete ────────────────────────────────────────────────────────────────
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
    c.value = buildFreteText(formData, totalFinal);
    const isNight = formData.freteType === "night";
    c.font = { name: "Calibri", size: 11, bold: isNight, color: isNight ? { argb: "FFCC0000" } : undefined };
    c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  }
  // Também colorir o label "Frete dedicado:" em vermelho quando noturno
  if (formData.freteType === "night") {
    const labelCell = ws.getCell(`C${nextRow}`);
    labelCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFCC0000" } };
  }
  nextRow++;

  // ── Observação (linha única: label + texto) ──────────────────────────────
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    // Montar texto de observação com DIFAL/FCP se aplicado
    let obsText = "Pode ser acrescido o valor de DIFAL, de acordo com o Estado e classificação fiscal da empresa.";
    const difalParts: string[] = [];
    if (formData.difalEnabled && formData.difalValue && formData.difalValue > 0) {
      difalParts.push(`DIFAL (${(formData.difalPercent ?? 0).toFixed(1)}%): R$ ${formData.difalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
    }
    if (formData.fcpEnabled && formData.fcpValue && formData.fcpValue > 0) {
      difalParts.push(`FCP (${(formData.fcpPercent ?? 0).toFixed(1)}%): R$ ${formData.fcpValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
    }
    if (difalParts.length > 0) {
      obsText = `DIFAL/FCP aplicado para ${formData.destState ?? ""}: ${difalParts.join(" | ")}. Valores já incluídos na proposta.`;
    }
    // Usar rich text para ter "Observação:" em negrito + texto normal
    c.value = { richText: [
      { text: "Observação: ", font: { name: "Calibri", size: 11, bold: true } },
      { text: obsText, font: { name: "Calibri", size: 11, bold: false } },
    ]};
    c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  }
  nextRow++;

  // Espaço
  nextRow++;
  ws.getRow(nextRow).height = 10;
  nextRow++;

  // ── Fico à disposição / Vendedor + Logo ─────────────────────────────────
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Fico à disposição para quaisquer esclarecimentos,";
    c.font = { name: "Calibri", size: 11 };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  nextRow++;

  // Nome do vendedor (colunas C-H) — logo ficará em K-N
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:H${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    const vendedorName = [formData.seller1Name, formData.seller2Name].filter(Boolean).join(" / ") || "";
    c.value = vendedorName;
    c.font = { name: "Calibri", size: 12, bold: true };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  const vendorLogoRow = nextRow;
  nextRow++;

  // Contato do vendedor — usa os telefones cadastrados (seller1Phone / seller2Phone)
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:H${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    const phone = formData.seller1Phone || formData.seller2Phone || "(11) 5666.9272";
    c.value = `CONTATO: ${phone}`;
    c.font = { name: "Calibri", size: 11 };
    c.alignment = { horizontal: "left", vertical: "middle" };
  }
  const vendorLogoRow2 = nextRow;
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
    c.font = { name: "Calibri", size: 16, bold: true, color: { argb: RED_TXT } };
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
    // Estimar altura necessária: ~75 chars por linha, 14pt por linha
    const estimatedLines = Math.ceil(cond.text.length / 130) + 1;
    ws.getRow(nextRow).height = Math.max(30, estimatedLines * 14);
    {
      const c = ws.getCell(`C${nextRow}`);
      c.value = cond.num;
      c.font = { name: "Calibri", size: 10, bold: true };
      c.alignment = { horizontal: "right", vertical: "top" };
    }
    ws.mergeCells(`D${nextRow}:N${nextRow}`);
    {
      const c = ws.getCell(`D${nextRow}`);
      c.value = cond.text;
      c.font = { name: "Calibri", size: 10 };
      c.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    }
    nextRow++;
  }

  // ── Estou ciente ─────────────────────────────────────────────────────────
  ws.getRow(nextRow).height = 31.2;
  ws.mergeCells(`C${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "Estou ciente das informações contidas neste documento.";
    c.font = { name: "Calibri", size: 16, bold: true, color: { argb: RED_TXT } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }
  nextRow += 3;

  // ── Data e Assinatura ───────────────────────────────────────────────────────────
  const signatureRow = nextRow; // capturar para posicionar logo
  ws.getRow(nextRow).height = 33.6;
  ws.mergeCells(`D${nextRow}:E${nextRow}`);
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

  // ── Rodapé endereço (fundo azul) ─────────────────────────────────────────
  ws.getRow(nextRow).height = 19.8;
  ws.mergeCells(`C${nextRow}:N${nextRow}`);
  {
    const c = ws.getCell(`C${nextRow}`);
    c.value = "R. Agostino Togneri, nº 617 - Jurubatuba - São Paulo/SP  - CEP: 04690-090";
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    c.font = { name: "Calibri", size: 10, color: { argb: WHITE_TXT } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ── Inserir logo ALFALUX (posições exatas do template) ───────────────────────────────
  //
  // Template usa 4 imagens:
  //   1) Logo cabeçalho: OneCellAnchor col=4 colOff=1959760 row=6 rowOff=132479
  //      ext: cx=4000500 cy=923925 EMU  →  420 x 97 px
  //      (col=4 = coluna E, índice 4; row=6 = linha 7, índice 6)
  //   2) Logo rodapé vendedor: TwoCellAnchor col=11→13 row=33→36
  //   3) Logo rodapé assinatura: TwoCellAnchor col=11→13 row=67→70
  //
  // NOTA: col/row no ExcelJS são 0-based (col=0 = coluna A)
  //   col=4 = coluna E (5ª coluna), row=6 = linha 7
  //   Para o logo do cabeçalho: tl.col=4, tl.row=6 com offset
  //   Offset em EMU: colOff=1959760 EMU → 1959760/914400 = 2.14 polegadas
  //   rowOff=132479 EMU → 132479/914400 = 0.14 polegadas
  //   ext: 420x97px (fiel ao template)
  //
  // Para logos do rodapé: TwoCellAnchor col=11→13 row=33→36
  //   col=11 = coluna L (índice 11), row=33 = linha 34
  //   Mas como o número de linhas varia, usamos posição relativa ao vendorLogoRow
  //
  try {
    const logoUrl = "/manus-storage/alfalux-logo-excel_8e8ca9f4.png";
    const logoResponse = await fetch(logoUrl);
    if (logoResponse.ok) {
      const logoBuffer = await logoResponse.arrayBuffer();

      // ── Logo 1: cabeçalho ──
      // Template OneCellAnchor: col=4 colOff=1959760 EMU, row=6 rowOff=132479 EMU
      // ext: cx=4000500 EMU (420px), cy=923925 EMU (97px)
      // col E (idx=4) width=35 chars → (35*7+5)*9525=2381250 EMU → frac=1959760/2381250=0.823
      // row 7 (idx=6) height=24.9pt → 24.9*12700=316230 EMU → frac=132479/316230=0.419
      const logoId1 = wb.addImage({ buffer: logoBuffer, extension: "png" });
      ws.addImage(logoId1, {
        tl: { col: 4.823, row: 6.419 },
        ext: { width: 420, height: 97 },
        editAs: "oneCell",
      } as ExcelJS.ImagePosition & { editAs: string });

      // ── Logo 2: rodapé ao lado do vendedor ──
      // Template TwoCellAnchor: col=11 colOff=342901 EMU, row=33 rowOff=161925 EMU
      // xfrm size: cx=1543050 EMU (162px), cy=464344 EMU (49px)
      // col L (idx=11) width=7 chars → (7*7+5)*9525=514350 EMU → frac=342901/514350=0.667
      // row 34 (idx=33) height=15.9pt → 15.9*12700=201930 EMU → frac=161925/201930=0.802
      const logoId2 = wb.addImage({ buffer: logoBuffer, extension: "png" });
      ws.addImage(logoId2, {
        tl: { col: 11.667, row: vendorLogoRow - 1 + 0.802 },
        ext: { width: 162, height: 49 },
        editAs: "oneCell",
      } as ExcelJS.ImagePosition & { editAs: string });

      // ── Logo 3: ao lado da assinatura ──
      // Template TwoCellAnchor: col=11 colOff=367393 EMU, row=67 rowOff=238125 EMU
      // xfrm size: cx=1540329 EMU (162px), cy=476591 EMU (50px)
      // col L (idx=11) → frac=367393/514350=0.714
      // row 68 (idx=67) height=26.85pt → 26.85*12700=340995 EMU → frac=238125/340995=0.699
      // (mas como linhas variam, usamos signatureRow com offset fixo)
      const logoId3 = wb.addImage({ buffer: logoBuffer, extension: "png" });
      ws.addImage(logoId3, {
        tl: { col: 11.714, row: signatureRow - 1 + 0.699 },
        ext: { width: 162, height: 50 },
        editAs: "oneCell",
      } as ExcelJS.ImagePosition & { editAs: string });

      void vendorLogoRow2; // usado para referência de posição
    }
  } catch {
    // Ignorar erro de logo
  }

  // ── Retornar buffer ──────────────────────────────────────────────
  return await wb.xlsx.writeBuffer() as ArrayBuffer;
}

/** Gera e baixa o Excel do orçamento */
export async function generateQuoteExcel(
  items: CartItemData[],
  formData: QuoteFormData
): Promise<void> {
  _freshPhotoCache = null;
  _freshAccPhotoCache = null;
  const buffer = await _generateExcelBuffer(items, formData);
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

/**
 * Gera o Excel do orçamento e retorna o buffer (sem baixar).
 * Usado para pré-visualização online sem criar revisão.
 */
export async function generateQuoteExcelBuffer(
  items: CartItemData[],
  formData: QuoteFormData
): Promise<ArrayBuffer> {
  _freshPhotoCache = null;
  _freshAccPhotoCache = null;
  return await _generateExcelBuffer(items, formData);
}
