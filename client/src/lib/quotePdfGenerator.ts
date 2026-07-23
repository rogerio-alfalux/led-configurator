/**
 * Gerador de orçamento em PDF — layout fiel ao template Excel da Alfalux.
 *
 * Usa jsPDF + jspdf-autotable para gerar um PDF A4 portrait com:
 *   - Cabeçalho com logo, telefone, endereço, número do orçamento e dados do cliente
 *   - Tabela de produtos com foto (quando disponível), modelo, qtd e preços
 *   - Rodapé com prazo, totais, frete, DIFAL/FCP, observação, condições gerais e assinatura
 *
 * Regras de revisão: idênticas ao Excel — baixar o PDF oficial conta como revisão.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CartItemData, QuoteFormData } from "./cartTypes";
import { toBrasiliaDate } from "./dateUtils";
import { getStateInfo } from "./difalTable";

// ── Cores (mesmas do template Excel) ────────────────────────────────────────
const BLUE_RGB      = [91, 155, 213]  as [number, number, number]; // #5B9BD5
const DARK_BLUE_RGB = [31, 56, 100]   as [number, number, number]; // #1F3864
const WHITE_RGB     = [255, 255, 255] as [number, number, number];
const RED_RGB       = [204, 0, 0]     as [number, number, number];
const TOTAL_BG_RGB  = [226, 239, 248] as [number, number, number]; // #E2EFF8
const LIGHT_GRAY    = [245, 245, 245] as [number, number, number];

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtBRL(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildFreteText(formData: QuoteFormData, totalBase: number): string {
  const { freteType, freteIsento, freteCity, freteState } = formData;
  const localSuffix = freteCity && freteState
    ? ` — ${freteCity}/${freteState}`
    : freteState && freteState !== "SP"
      ? ` — ${freteState}`
      : "";
  if (freteIsento) return "Frete isento (conforme negociação)";
  if (freteType === "free") {
    const valorCotado = formData.freteValue && formData.freteValue > 0
      ? ` (${fmtBRL(formData.freteValue)} cotado)` : "";
    return `CIF - Para faturamento acima de R$ 1.500,00 São Paulo/SP (Capital). Demais localidades sob consulta${valorCotado}`;
  }
  if (freteType === "night") {
    const val = formData.freteValue && formData.freteValue > 0 ? fmtBRL(formData.freteValue) : "R$ 2.000,00";
    return `Frete noturno — ${val}${localSuffix}`;
  }
  if (freteType === "paid") {
    const valorCotado = formData.freteValue && formData.freteValue > 0
      ? ` (${fmtBRL(formData.freteValue)} cotado)` : "";
    if ((!freteCity && !freteState) || freteState === "SP") {
      return totalBase >= 1500
        ? `CIF - Para faturamento acima de R$ 1.500,00 São Paulo/SP (Capital). Demais localidades sob consulta${valorCotado}`
        : `Frete a cobrar — São Paulo/SP Capital (faturamento abaixo de R$ 1.500,00)${valorCotado}`;
    }
    return `Frete A Calcular${localSuffix}${valorCotado}`;
  }
  if (freteType === "consult") {
    const valorCotado = formData.freteValue && formData.freteValue > 0
      ? ` — ${fmtBRL(formData.freteValue)} cotado` : "";
    return `Frete sob consulta${localSuffix}${valorCotado}`;
  }
  if (freteType === "pickup") return "Cliente Retira — Frete R$ 0,00";
  return "CIF - Para faturamento acima de R$ 1.500,00 São Paulo/SP (Capital). Demais localidades sob consulta";
}

// ── Função interna de geração ─────────────────────────────────────────────────
async function _generatePdfBlob(
  items: CartItemData[],
  formData: QuoteFormData
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();   // 210mm
  const pageH = doc.internal.pageSize.getHeight();  // 297mm
  const marginL = 10;
  const marginR = 10;
  const contentW = pageW - marginL - marginR;       // 190mm

  // ── Carregar logo ──────────────────────────────────────────────────────────
  let logoDataUrl: string | null = null;
  try {
    const resp = await fetch("/manus-storage/alfalux-logo-excel_8e8ca9f4.png");
    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      const b64 = btoa(Array.from(new Uint8Array(buf), c => String.fromCharCode(c)).join(""));
      logoDataUrl = `data:image/png;base64,${b64}`;
    }
  } catch { /* ignorar */ }

  // ── Pré-carregar fotos dos produtos ────────────────────────────────────────
  const photoCache = new Map<string, string>();
  const photoUrls = items
    .map(i => i.photoUrl)
    .filter((u): u is string => !!u && (u.startsWith("/manus-storage/") || u.startsWith("http")));
  await Promise.allSettled(
    photoUrls.map(async (url) => {
      try {
        const fetchUrl = url.startsWith("/manus-storage/") ? url : url;
        const r = await fetch(fetchUrl);
        if (!r.ok) return;
        const buf = await r.arrayBuffer();
        const b64 = btoa(Array.from(new Uint8Array(buf), c => String.fromCharCode(c)).join(""));
        const mime = r.headers.get("content-type") || "image/png";
        photoCache.set(url, `data:${mime};base64,${b64}`);
      } catch { /* ignorar */ }
    })
  );

  // ── Calcular totais (mesma lógica do quoteExcelGenerator) ──────────────────
  // Para itens com driverLines: totalPrice = apenas luminária (sem drivers).
  // Usar calcItemLumTotal + calcItemDrvTotal para evitar duplicação e aplicar itemMarginPercent.
  const _pdfCalcItemLumTotal = (it: CartItemData): number => {
    if (!it.driverLines || it.driverLines.length === 0) return it.totalPrice ?? 0;
    if (it.priceWithoutDriver != null && it.priceWithoutDriver > 0) return it.priceWithoutDriver;
    return it.totalPrice ?? 0;
  };
  const _pdfCalcItemDrvTotal = (it: CartItemData): number => {
    if (!it.driverLines || it.driverLines.length === 0) return 0;
    const iqty = it.qty ?? 1;
    return it.driverLines.reduce((sd, d) => {
      const stored = d.driverTotalPrice;
      if (stored != null && stored > 0) return sd + stored;
      const storedQty = d.driverQty ?? 1;
      const effectiveQty = it.driverQtyPerUnit != null
        ? it.driverQtyPerUnit * iqty
        : (storedQty <= 1 ? iqty : storedQty);
      return sd + Math.round((d.driverUnitPrice ?? 0) * effectiveQty * 100) / 100;
    }, 0);
  };
  const _pdfApplyItemMgn = (base: number, it: CartItemData): number => {
    const p = it.itemMarginPercent != null ? Math.min(Math.max(it.itemMarginPercent / 100, 0), 0.99) : 0;
    return p > 0 ? base / (1 - p) : base;
  };
  const totalBase = items
    .filter(it => it.category !== 'Não Orçamos')
    .reduce((sum, it) => {
      const lum = _pdfCalcItemLumTotal(it);
      const drv = _pdfCalcItemDrvTotal(it);
      return sum + _pdfApplyItemMgn(lum + drv, it);
    }, 0);
  const rtPct     = Math.min(Math.max(formData.rtPercent    ?? 0, 0), 0.99);
  const marginPct = Math.min(Math.max(formData.marginPercent ?? 0, -0.99), 0.99);
  const totalComRT  = rtPct     > 0 ? totalBase  / (1 - rtPct)    : totalBase;
  const totalFinal  = marginPct > 0 ? totalComRT / (1 - marginPct) : marginPct < 0 ? totalComRT * (1 + marginPct) : totalComRT;
  const freteParaBase = formData.freteIncluded ? 0
    : (formData.freteValue && formData.freteValue > 0 && !formData.freteIsento ? formData.freteValue : 0);
  const baseParaImposto = totalFinal + freteParaBase;
  const stateInfo = formData.destState ? getStateInfo(formData.destState) : undefined;
  const combinedRate = stateInfo ? stateInfo.combined : 0;
  const difalAplicavel = !!stateInfo && combinedRate > 0;
  const totalComDifal = formData.difalEnabled && difalAplicavel
    ? baseParaImposto / (1 - combinedRate / 100)
    : baseParaImposto;
  const combinedAmt = totalComDifal - baseParaImposto;
  const difalAmt = stateInfo && stateInfo.combined > 0 ? combinedAmt * (stateInfo.difal / stateInfo.combined) : 0;
  const fcpAmt   = stateInfo && stateInfo.combined > 0 ? combinedAmt * (stateInfo.fcp   / stateInfo.combined) : 0;
  const freteValorNum = formData.freteValue && formData.freteValue > 0 && !formData.freteIsento
    ? formData.freteValue : 0;

  // ── Pré-calcular frete diluído (fora do loop) ─────────────────────────────
  const _pdfFreteParaDiluirGlobal = (formData.freteIncluded && formData.freteValue && formData.freteValue > 0)
    ? formData.freteValue : 0;
  const _pdfTotalBaseForFreteGlobal = items
    .filter(it => it.category !== 'Não Orçamos')
    .reduce((sum, it) => {
      const lum = _pdfCalcItemLumTotal(it);
      const drv = _pdfCalcItemDrvTotal(it);
      return sum + _pdfApplyItemMgn(lum + drv, it);
    }, 0);
  const _pdfApplyGlobalMarkupGlobal = (base: number) => {
    const comRT = rtPct > 0 ? base / (1 - rtPct) : base;
    return marginPct > 0 ? comRT / (1 - marginPct) : marginPct < 0 ? comRT * (1 + marginPct) : comRT;
  };

  // ── CABEÇALHO ─────────────────────────────────────────────────────────────
  let y = 8;

  // Logo (canto superior direito)
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", pageW - marginR - 55, y, 55, 13);
  }

  // Telefone e endereço
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("(11) 5666.9272 / 5666.4856", marginL, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("R. Agostino Togneri, nº 617 - Jurubatuba - São Paulo/SP - CEP: 04690-090", marginL, y + 9);

  y += 18;

  // Número do orçamento (fundo azul)
  const revStr = formData.revisionCount && formData.revisionCount > 0
    ? ` — RV${formData.revisionCount}` : "";
  const quoteNumText = `Nº ${formData.numero || ""}${revStr}`;
  doc.setFillColor(...BLUE_RGB);
  doc.rect(marginL, y, 50, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE_RGB);
  doc.text(quoteNumText, marginL + 2, y + 5.5);

  y += 10;

  // Dados do cliente (linhas 7-13 do Excel)
  doc.setFontSize(10);
  const clientLines: Array<[string, string]> = [
    ["VENDEDOR:", [formData.seller1Name, formData.seller2Name].filter(Boolean).join(" / ") || ""],
    ["OBRA:", formData.obra || ""],
    ["CLIENTE:", formData.cliente || ""],
    ["CONTATO/TEL:", [formData.contato, formData.tel].filter(Boolean).join(" — ")],
    ["E-MAIL:", formData.email || ""],
  ];
  if (formData.arquiteto || formData.lightDesigner) {
    const arqParts: string[] = [];
    if (formData.arquiteto) arqParts.push(`ARQUITETO: ${formData.arquiteto}`);
    if (formData.lightDesigner) arqParts.push(`LD: ${formData.lightDesigner}`);
    clientLines.push(["", arqParts.join("   |   ")]);
  }
  clientLines.push(["REFERÊNCIA:", formData.referencia || "FORNECIMENTO DE LUMINÁRIAS"]);

  for (const [label, value] of clientLines) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    if (label) {
      doc.text(label, marginL, y + 4);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(value, contentW - 30);
      doc.text(wrapped, marginL + 30, y + 4);
      y += Math.max(6, wrapped.length * 4.5);
    } else {
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(value, contentW);
      doc.text(wrapped, marginL, y + 4);
      y += Math.max(6, wrapped.length * 4.5);
    }
  }

  // Data (fundo azul)
  doc.setFillColor(...BLUE_RGB);
  doc.rect(marginL, y, 40, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...WHITE_RGB);
  doc.text(formData.data || toBrasiliaDate(new Date()), marginL + 2, y + 5.5);
  y += 10;

  // Proposta comercial
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(
    "PROPOSTA COMERCIAL PARA FORNECIMENTO DOS PRODUTOS ABAIXO ESPECIFICADOS, COM VALIDADE DE 3 (TRÊS) DIAS.",
    pageW / 2, y + 4,
    { align: "center", maxWidth: contentW }
  );
  y += 8;

  // Título da obra (azul escuro)
  doc.setFillColor(...DARK_BLUE_RGB);
  doc.rect(marginL, y, contentW, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...WHITE_RGB);
  doc.text(
    `OBRA ${(formData.obra || formData.cliente || "ORÇAMENTO").toUpperCase()}`,
    pageW / 2, y + 7,
    { align: "center" }
  );
  y += 12;

  // ── TABELA DE PRODUTOS ────────────────────────────────────────────────────
  // Ordenar por pavimento
  const normalizeFloor = (s: string | undefined) => (s ?? "").trim().toLowerCase();
  const floorOrder: string[] = [];
  for (const item of items) {
    const key = normalizeFloor(item.floorId);
    if (!floorOrder.includes(key)) floorOrder.push(key);
  }
  const sortedItems = [...items].sort((a, b) => {
    const ia = floorOrder.indexOf(normalizeFloor(a.floorId));
    const ib = floorOrder.indexOf(normalizeFloor(b.floorId));
    return ia - ib;
  });

  // Construir linhas da tabela
  type RowMeta = { photoUrl: string | null; isFloorHeader?: boolean; isDriverRow?: boolean; isObsRow?: boolean };
  const rowMeta: RowMeta[] = [];
  const tableBody: (string | { content: string; colSpan?: number; styles?: object })[][] = [];
  let lastFloor: string | undefined = undefined;

  for (const item of sortedItems) {
    const floorKey = normalizeFloor(item.floorId);
    if (floorKey !== lastFloor) {
      lastFloor = floorKey;
      const floorLabel = item.floorName || item.floorId || "";
      if (floorLabel) {
        tableBody.push([{ content: floorLabel, colSpan: 11, styles: {
          fillColor: DARK_BLUE_RGB, textColor: WHITE_RGB,
          fontStyle: "bold", fontSize: 10, halign: "center",
        }}]);
        rowMeta.push({ photoUrl: null, isFloorHeader: true });
      }
    }

    const lumRaw = _pdfCalcItemLumTotal(item);
    const drvRaw = _pdfCalcItemDrvTotal(item);
    const itemRaw = _pdfApplyItemMgn(lumRaw + drvRaw, item);
    // Frete diluído proporcional a este item
    const _pdfFreteFatorItem = (_pdfFreteParaDiluirGlobal > 0 && _pdfTotalBaseForFreteGlobal > 0)
      ? _pdfFreteParaDiluirGlobal * (itemRaw / _pdfTotalBaseForFreteGlobal)
      : 0;
    const lumTotal = item.totalPrice ?? 0;
    const drvTotal = item.driverLines?.reduce((s, d) => s + (d.driverTotalPrice ?? 0), 0) ?? 0;
    const itemTotal = _pdfApplyGlobalMarkupGlobal(itemRaw + _pdfFreteFatorItem);

    // Modelo: SKU + descrição
    const modeloText = item.sku ? `${item.sku}\n${item.description || ""}` : (item.description || "");

    // Comprimento
    let comprimento = "";
    if (item.profileSegments && item.profileSegments.length > 0) {
      const lens = Array.from(new Set(item.profileSegments.map(s => s.lengthMm).filter(Boolean)));
      comprimento = lens.map(l => `${l}mm`).join("/");
    } else {
      const m = (item.description || "").match(/(\d{3,})\s*mm/i);
      if (m) comprimento = `${m[1]}mm`;
    }

    // Potência
    let potencia = item.power || "";
    if (!potencia) {
      const m = (item.description || "").match(/(\d+(?:[,.]\d+)?\s*W(?:\/m)?)/i);
      if (m) potencia = m[1].replace(/\s+/g, "");
    }

    // DIM
    const desc = item.description || "";
    let dim = "ON/OFF";
    if (/dim\s*triac\s*220/i.test(desc)) dim = "DIM TRIAC 220V";
    else if (/dim\s*triac\s*110/i.test(desc)) dim = "DIM TRIAC 110V";
    else if (/dim\s*triac/i.test(desc)) dim = "DIM TRIAC";
    else if (/dim\s*dali/i.test(desc)) dim = "DIM DALI";
    else if (/dim\s*0[-–]?10/i.test(desc)) dim = "DIM 0-10V";
    else if (/dim\s*1[-–]?10/i.test(desc)) dim = "DIM 1-10V";
    else if (/dim/i.test(desc)) dim = "DIM";

    // Tensão
    let tensao = "";
    if (/bivolt/i.test(desc)) tensao = "BIVOLT";
    else { const m = desc.match(/(\d{2,3}[Vv])/); if (m) tensao = m[1].toUpperCase(); }

    tableBody.push([
      item.itemEmPlanta || "",
      "",  // foto — inserida via didDrawCell
      modeloText,
      comprimento,
      potencia,
      dim,
      tensao,
      item.corPeca || "",
      item.cct || "",
      String(item.qty ?? 1),
      itemTotal > 0 ? fmtBRL(itemTotal) : "—",
    ]);
    rowMeta.push({ photoUrl: item.photoUrl || null });

    // Linhas de driver
    if (item.driverLines && item.driverLines.length > 0) {
      for (const drv of item.driverLines) {
        const _iqty = item.qty ?? 1;
        const _storedDrvQty = drv.driverQty ?? 1;
        const _drvQtyPerUnit = item.driverQtyPerUnit;
        const drvQty = _drvQtyPerUnit != null
          ? _drvQtyPerUnit * _iqty
          : (_storedDrvQty <= 1 ? _iqty : _storedDrvQty);
        const _drvTotalRaw = (drv.driverUnitPrice ?? 0) * drvQty;
        // Peso do driver no item para distribuição do frete
        const _drvPeso = itemRaw > 0 ? _drvTotalRaw / itemRaw : 0;
        const _drvFreteFrac = _pdfFreteFatorItem * _drvPeso;
        const drvTotal2 = _pdfApplyGlobalMarkupGlobal(_pdfApplyItemMgn(_drvTotalRaw + _drvFreteFrac, item));
        tableBody.push([
          "", "",
          `  ↳ Driver: ${drv.driverModel || drv.driverCode || ""}`,
          "", "", "", "", "", "",
          String(drvQty),
          drvTotal2 > 0 ? fmtBRL(drvTotal2) : "—",
        ]);
        rowMeta.push({ photoUrl: null, isDriverRow: true });
      }
    }

    // Observação do item
    if (item.itemNote) {
      tableBody.push([
        "", "",
        `  Obs: ${item.itemNote}`,
        "", "", "", "", "", "", "", "",
      ]);
      rowMeta.push({ photoUrl: null, isObsRow: true });
    }
  }

  // Colwidths: soma = 190mm
  // [planta, foto, modelo, comp, pot, dim, tensao, cor, cct, qtd, total]
  const colWidths = [11, 17, 47, 13, 10, 12, 11, 14, 14, 9, 22];

  autoTable(doc, {
    startY: y,
    head: [[
      "PLANTA", "FOTO", "MODELO ALFALUX",
      "COMP.", "POT.", "DIM", "TENSÃO", "COR", "TEMP. COR",
      "QTD", "PREÇO TOTAL",
    ]],
    body: tableBody,
    columnStyles: {
      0: { cellWidth: colWidths[0], halign: "center" },
      1: { cellWidth: colWidths[1], halign: "center" },
      2: { cellWidth: colWidths[2], halign: "left" },
      3: { cellWidth: colWidths[3], halign: "center" },
      4: { cellWidth: colWidths[4], halign: "center" },
      5: { cellWidth: colWidths[5], halign: "center" },
      6: { cellWidth: colWidths[6], halign: "center" },
      7: { cellWidth: colWidths[7], halign: "center" },
      8: { cellWidth: colWidths[8], halign: "center" },
      9: { cellWidth: colWidths[9], halign: "center" },
      10: { cellWidth: colWidths[10], halign: "right" },
    },
    headStyles: {
      fillColor: BLUE_RGB,
      textColor: WHITE_RGB,
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      valign: "middle",
      lineWidth: 0.3,
      lineColor: WHITE_RGB,
    },
    bodyStyles: {
      fontSize: 7.5,
      valign: "middle",
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
      minCellHeight: 18,
    },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    margin: { left: marginL, right: marginR },
    tableWidth: contentW,
    didParseCell: (data) => {
      const meta = rowMeta[data.row.index];
      if (!meta) return;
      if (meta.isFloorHeader) return;
      if (meta.isDriverRow) {
        data.cell.styles.textColor = [100, 100, 100] as [number, number, number];
        data.cell.styles.fontSize = 7;
        data.cell.styles.fillColor = [250, 250, 250] as [number, number, number];
        data.cell.styles.minCellHeight = 7;
      }
      if (meta.isObsRow) {
        data.cell.styles.textColor = [80, 80, 80] as [number, number, number];
        data.cell.styles.fontSize = 7;
        data.cell.styles.fontStyle = "italic";
        data.cell.styles.fillColor = [250, 250, 250] as [number, number, number];
        data.cell.styles.minCellHeight = 7;
      }
    },
    didDrawCell: (data) => {
      if (data.column.index !== 1 || data.section !== "body") return;
      const meta = rowMeta[data.row.index];
      if (!meta || meta.isFloorHeader || meta.isDriverRow || meta.isObsRow) return;
      if (meta.photoUrl && photoCache.has(meta.photoUrl)) {
        const imgData = photoCache.get(meta.photoUrl)!;
        const pad = 1;
        const cx = data.cell.x + pad;
        const cy = data.cell.y + pad;
        const size = Math.min(data.cell.width - pad * 2, data.cell.height - pad * 2);
        try { doc.addImage(imgData, "PNG", cx, cy, size, size); } catch { /* ignorar */ }
      }
    },
  });

  // ── RODAPÉ ────────────────────────────────────────────────────────────────
  let fy = (doc as any).lastAutoTable.finalY + 5;

  const addRow = (
    label: string,
    value: string,
    opts?: {
      bold?: boolean;
      labelColor?: [number, number, number];
      valueColor?: [number, number, number];
      bgColor?: [number, number, number];
      fontSize?: number;
      fullWidth?: boolean;
    }
  ) => {
    const fz = opts?.fontSize ?? 9.5;
    const rowH = fz >= 12 ? 9 : 7;
    if (fy + rowH > pageH - 12) { doc.addPage(); fy = 10; }
    if (opts?.bgColor) {
      doc.setFillColor(...opts.bgColor);
      doc.rect(marginL, fy, contentW, rowH, "F");
    }
    doc.setFontSize(fz);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(opts?.labelColor ?? ([0, 0, 0] as [number, number, number])));
    if (opts?.fullWidth) {
      doc.text(label, pageW / 2, fy + rowH - 1.5, { align: "center" });
    } else {
      doc.text(label, marginL + 1, fy + rowH - 1.5);
      doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
      doc.setTextColor(...(opts?.valueColor ?? ([0, 0, 0] as [number, number, number])));
      const wrapped = doc.splitTextToSize(value, contentW - 55);
      doc.text(wrapped, marginL + 55, fy + rowH - 1.5);
      if (wrapped.length > 1) { fy += (wrapped.length - 1) * (fz * 0.35); }
    }
    fy += rowH + 1;
  };

  // Prazo de fabricação
  addRow("Prazo de fabricação e entrega:", `${formData.deliveryDays ?? 20} dias úteis`, { valueColor: RED_RGB, bold: true });

  // Total dos produtos
  addRow("Valor total dos produtos:", fmtBRL(totalFinal), { bgColor: TOTAL_BG_RGB, bold: true, fontSize: 11 });

  // DIFAL / FCP
  if (difalAmt > 0) {
    addRow(`DIFAL (${(formData.difalPercent ?? 0).toFixed(1)}%):`, fmtBRL(difalAmt), { bgColor: TOTAL_BG_RGB });
  }
  if (fcpAmt > 0) {
    addRow(`FCP (${(formData.fcpPercent ?? 0).toFixed(1)}%):`, fmtBRL(fcpAmt), { bgColor: TOTAL_BG_RGB });
  }
  if (difalAmt > 0 || fcpAmt > 0) {
    addRow("TOTAL GERAL (com FRETE + DIFAL/FCP):", fmtBRL(totalComDifal), { bgColor: TOTAL_BG_RGB, bold: true, fontSize: 12 });
  }

  // Condição de pagamento
  if (formData.paymentTerm) {
    addRow("Condição de pagamento:", formData.paymentTerm);
  }

  // Frete
  addRow("Frete:", buildFreteText(formData, totalFinal), {
    bold: formData.freteType === "night",
    valueColor: formData.freteType === "night" ? RED_RGB : [0, 0, 0],
  });

  // Valor do frete + total geral
  // Quando DIFAL está ativo, totalComDifal já inclui o frete na base de cálculo
  // (baseParaImposto = totalFinal + freteParaBase). Não somar frete novamente.
  const _difalAtivoComFretePdf = formData.difalEnabled && difalAplicavel && freteParaBase > 0;
  if (freteValorNum > 0) {
    addRow("Valor do frete:", fmtBRL(freteValorNum), { valueColor: RED_RGB, bold: true });
    if (!_difalAtivoComFretePdf) {
      const totalGeral = (formData.difalEnabled && difalAplicavel ? totalComDifal : totalFinal) + freteValorNum;
      addRow("TOTAL GERAL (produtos + frete):", fmtBRL(totalGeral), { bgColor: [217, 234, 211], bold: true, fontSize: 12 });
    }
  }

  // Observação
  fy += 2;
  if (fy + 14 > pageH - 12) { doc.addPage(); fy = 10; }
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  let obsText = "Pode ser acrescido o valor de DIFAL, de acordo com o Estado e classificação fiscal da empresa.";
  const difalParts: string[] = [];
  if (formData.difalEnabled && formData.difalValue && formData.difalValue > 0) {
    difalParts.push(`DIFAL (${(formData.difalPercent ?? 0).toFixed(1)}%): ${fmtBRL(formData.difalValue)}`);
  }
  if (formData.fcpEnabled && formData.fcpValue && formData.fcpValue > 0) {
    difalParts.push(`FCP (${(formData.fcpPercent ?? 0).toFixed(1)}%): ${fmtBRL(formData.fcpValue)}`);
  }
  if (difalParts.length > 0) {
    obsText = `DIFAL/FCP aplicado para ${formData.destState ?? ""}: ${difalParts.join(" | ")}. Valores já incluídos na proposta.`;
  }
  // Renderizar "Observação:" em negrito + texto normal na mesma linha usando largura total
  doc.setFont("helvetica", "bold");
  const obsLabel = "Observação: ";
  doc.text(obsLabel, marginL + 1, fy + 4);
  const obsLabelW = doc.getTextWidth(obsLabel);
  doc.setFont("helvetica", "normal");
  // Calcular quantos caracteres cabem na primeira linha após o label
  const obsRemainingW = contentW - obsLabelW - 2;
  const obsFullText = doc.splitTextToSize(obsText, contentW - 2);
  const obsFirstLine = doc.splitTextToSize(obsText, obsRemainingW);
  // Primeira linha ao lado do label
  doc.text(obsFirstLine[0], marginL + 1 + obsLabelW, fy + 4);
  // Linhas restantes abaixo, alinhadas com o início do texto (após o label)
  let obsExtraLines: string[] = [];
  if (obsFirstLine.length < obsFullText.length) {
    // Texto que não coube na primeira linha
    const firstLineText = obsFirstLine[0];
    const remainingText = obsText.slice(firstLineText.length).trim();
    if (remainingText) {
      obsExtraLines = doc.splitTextToSize(remainingText, contentW - 2);
    }
  } else if (obsFirstLine.length > 1) {
    obsExtraLines = obsFirstLine.slice(1);
  }
  for (let li = 0; li < obsExtraLines.length; li++) {
    fy += 4.5;
    doc.text(obsExtraLines[li], marginL + 1 + obsLabelW, fy + 4);
  }
  fy += 4.5 + 5;

  // ── NOVA PÁGINA: Condições Gerais ─────────────────────────────────────────
  doc.addPage();
  fy = 10;

  // "Fico à disposição"
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("Fico à disposição para quaisquer esclarecimentos,", marginL, fy + 4);
  fy += 7;

  const vendedorNome = [formData.seller1Name, formData.seller2Name].filter(Boolean).join(" / ") || "";
  if (vendedorNome) {
    doc.setFont("helvetica", "bold");
    doc.text(vendedorNome, marginL, fy + 4);
    fy += 6;
    const phones = [formData.seller1Phone, formData.seller2Phone].filter(Boolean).join(" / ");
    if (phones) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`CONTATO: ${phones}`, marginL, fy + 4);
      fy += 6;
    }
  }

  fy += 4;

  // CONDIÇÕES GERAIS
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...RED_RGB);
  doc.text("CONDIÇÕES GERAIS DE FORNECIMENTO", pageW / 2, fy + 6, { align: "center" });
  fy += 10;

  const conditions = [
    { num: "1)", text: "Os materiais especificados nesta proposta comercial estão de acordo com os dados fornecidos pelo cliente ou por profissional(is) por ele autorizados. Assim, não nos responsabilizamos por informações incompatíveis que possam ocasionar problemas com instalação ou aplicação do produto;" },
    { num: "2)", text: "Nossos produtos são fabricados sob encomenda, por esse motivo, as trocas somente serão realizadas por motivo de defeito de fabricação, após a análise da(s) peça(s) em fábrica e constatação do efetivo defeito;" },
    { num: "3)", text: "Pagamentos de sinal e/ou antecipado poderão ser efetuados num prazo de 5 dias úteis após a aprovação da proposta. O faturamento será realizado mediante a aprovação do cadastro;" },
    { num: "4)", text: "As luminárias ALFALUX possuem 01 (um) ano de garantia contra defeitos de fabricação. Para equipamentos (lâmpadas, drivers, reatores, transformadores, ignitores e capacitores), é repassada a garantia do fabricante;" },
    { num: "5)", text: "A ALFALUX não realiza instalação de luminárias;" },
    { num: "6)", text: "Em caso de qualquer problema em nossos produtos, nossa assistência técnica deverá ser acionada. A manipulação incorreta ou alteração do produto ocasionará a perda da garantia. Serviços de assistência técnica que envolvam substituição de peças ou componentes das luminárias deverão ser realizados em nossa fábrica;" },
    { num: "7)", text: "A conferência do material deverá ser efetuada no ato da entrega, havendo qualquer irregularidade ou avaria, está deverá ser comunicada e notificado no recebimento. Em caso de não conferência a ALFALUX não se responsabiliza por eventuais divergências ou danos às mercadorias;" },
    { num: "8)", text: "A responsabilidade sobre problemas ocasionados durante o transporte é da transportadora, orientamos que realizem anotação no conhecimento, como forma de comprovação do dano e o futuro ressarcimento pelo responsável. Não nos responsabilizamos por danos ocasionados pelo transporte incorreto da mercadoria, por terceiros;" },
    { num: "9)", text: "Cancelamento total ou parcial, será aceito somente no período de 48 horas da aprovação do pedido, após haverá a cobrança de 10% sobre o valor dos itens cancelados, em função da interrupção do processo fabril e ressarcimento de despesas geradas com a compra de matéria prima e mão de obra. Não aceitamos o cancelamento de produtos especiais, nesta hipótese haverá a cobrança do valor integral do produto." },
  ];

  doc.setTextColor(0, 0, 0);
  for (const cond of conditions) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(cond.text, contentW - 8);
    const blockH = lines.length * 4 + 3;
    if (fy + blockH > pageH - 30) { doc.addPage(); fy = 10; }
    doc.setFont("helvetica", "bold");
    doc.text(cond.num, marginL, fy + 4);
    doc.setFont("helvetica", "normal");
    doc.text(lines, marginL + 7, fy + 4);
    fy += blockH;
  }

  fy += 4;
  // Bloco: "Estou ciente" (8) + assinatura (9+12) + rodapé (12) = ~45mm
  if (fy + 45 > pageH - 10) { doc.addPage(); fy = 10; }

  // "Estou ciente"
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...RED_RGB);
  doc.text("Estou ciente das informações contidas neste documento.", pageW / 2, fy + 6, { align: "center" });
  fy += 14;

  // Assinatura
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text("Data: ____/____/________", marginL, fy + 4);
  doc.text("Assinatura: _______________________________", marginL + 60, fy + 4);
  fy += 9;
  doc.text("Nome: _______________________________", marginL, fy + 4);
  doc.text("CPF/CNPJ: _______________________________", marginL + 60, fy + 4);
  fy += 12;

  // Rodapé de endereço (fundo azul)
  fy += 4;
  if (fy + 12 > pageH - 2) { doc.addPage(); fy = 10; }
  const footerY = fy;
  doc.setFillColor(...BLUE_RGB);
  doc.rect(marginL, footerY, contentW, 8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE_RGB);
  doc.text(
    "R. Agostino Togneri, nº 617 - Jurubatuba - São Paulo/SP - CEP: 04690-090",
    pageW / 2, footerY + 5.5,
    { align: "center" }
  );

  return doc.output("blob");
}

/** Gera e baixa o PDF do orçamento */
export async function generateQuotePdf(
  items: CartItemData[],
  formData: QuoteFormData
): Promise<void> {
  const blob = await _generatePdfBlob(items, formData);
  const quoteNum = (formData.numero || "orcamento").replace(/[^a-zA-Z0-9-_]/g, "_");
  const clientName = (formData.cliente || "cliente").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_");
  const fileName = `Alfalux_${quoteNum}_${clientName}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
