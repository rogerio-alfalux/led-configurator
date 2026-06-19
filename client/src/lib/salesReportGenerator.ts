import ExcelJS from "exceljs";

import { toBrasiliaDate, toBrasiliaDateTime } from "./dateUtils";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export interface SalesReportRow {
  id: number;
  quoteNumber: string | null;
  clientName: string | null;
  projectName?: string | null;
  seller1Name: string | null;
  seller2Name: string | null;
  assistantName: string | null;
  totalFinal: number;
  commissionPercent: number;
  rtPercent: number;
  rtDest1: string | null;
  rtDest1Active: boolean;
  rtDest2: string | null;
  rtDest2Active: boolean;
  rtDest3: string | null;
  rtDest3Active: boolean;
  approvedAt: string | null;
  commission: number;
  rtValue: number;
}

function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(n: number): string {
  return (n * 100).toFixed(2) + "%";
}

export async function generateSalesReport(
  rows: SalesReportRow[],
  year: number,
  month: number
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Configurador Alfalux";
  wb.created = new Date();

  const monthLabel = MONTHS[month - 1];
  const ws = wb.addWorksheet(`Relatório ${monthLabel} ${year}`);

  // ── Cabeçalho do relatório ──────────────────────────────────────────────────
  ws.mergeCells("A1:L1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `RELATÓRIO DE VENDAS — ${monthLabel.toUpperCase()} ${year}`;
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A2B4A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:L2");
  const subCell = ws.getCell("A2");
  subCell.value = `Gerado em ${toBrasiliaDateTime(new Date())} | ${rows.length} orçamento${rows.length !== 1 ? "s" : ""} aprovado${rows.length !== 1 ? "s" : ""}`;
  subCell.font = { italic: true, size: 10, color: { argb: "FF666666" } };
  subCell.alignment = { horizontal: "center" };
  ws.getRow(2).height = 16;

  // ── Linha de cabeçalho das colunas ─────────────────────────────────────────
  const headers = [
    "Nº Orçamento", "Data Aprovação", "Cliente", "Obra",
    "Vendedor 1", "Vendedor 2", "Assistente",
    "Valor Final (R$)", "% Comissão", "Comissão (R$)",
    "% RT", "RT (R$)", "Destinatários RT",
  ];

  const headerRow = ws.getRow(3);
  headerRow.height = 20;
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D5A8E" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    };
  });

  // ── Dados ──────────────────────────────────────────────────────────────────
  let rowIdx = 4;
  for (const r of rows) {
    const rtDests = [
      r.rtDest1Active && r.rtDest1 ? r.rtDest1 : null,
      r.rtDest2Active && r.rtDest2 ? r.rtDest2 : null,
      r.rtDest3Active && r.rtDest3 ? r.rtDest3 : null,
    ].filter(Boolean).join(", ");

    const approvedDate = r.approvedAt
      ? toBrasiliaDate(r.approvedAt)
      : "—";

    const rowData = [
      r.quoteNumber ?? `#${r.id}`,
      approvedDate,
      r.clientName ?? "—",
      r.projectName ?? "—",
      r.seller1Name ?? "—",
      r.seller2Name ?? "—",
      r.assistantName ?? "—",
      r.totalFinal,
      r.commissionPercent,
      r.commission,
      r.rtPercent,
      r.rtValue,
      rtDests || "—",
    ];

    const dataRow = ws.getRow(rowIdx);
    dataRow.height = 16;
    const isEven = (rowIdx - 4) % 2 === 0;
    const bgColor = isEven ? "FFFAFAFA" : "FFFFFFFF";

    rowData.forEach((v, i) => {
      const cell = dataRow.getCell(i + 1);
      cell.value = v;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.border = {
        top: { style: "hair" }, bottom: { style: "hair" },
        left: { style: "thin" }, right: { style: "thin" },
      };
      cell.alignment = { vertical: "middle" };

      // Formatar colunas numéricas
      if (i === 6 || i === 8 || i === 10) {
        // Valores monetários
        cell.numFmt = '"R$"#,##0.00';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else if (i === 7 || i === 9) {
        // Percentuais
        cell.numFmt = "0.00%";
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (i === 0 || i === 1) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });

    rowIdx++;
  }

  // ── Linha de totais ────────────────────────────────────────────────────────
  const totalRow = ws.getRow(rowIdx);
  totalRow.height = 20;

  const totalFinal = rows.reduce((s, r) => s + r.totalFinal, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
  const totalRt = rows.reduce((s, r) => s + r.rtValue, 0);

  const totalsData = [
    "TOTAL", "", "", "", "", "", "",
    totalFinal, "", totalCommission, "", totalRt, "",
  ];

  totalsData.forEach((v, i) => {
    const cell = totalRow.getCell(i + 1);
    cell.value = v;
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE0B2" } };
    cell.border = {
      top: { style: "medium" }, bottom: { style: "medium" },
      left: { style: "thin" }, right: { style: "thin" },
    };
    cell.alignment = { vertical: "middle" };
    if (i === 6 || i === 8 || i === 10) {
      cell.numFmt = '"R$"#,##0.00';
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
  });

  rowIdx += 2;

  // ── Resumo por vendedor ────────────────────────────────────────────────────
  const wsSeller = wb.addWorksheet("Resumo por Vendedor");

  wsSeller.mergeCells("A1:F1");
  const sellerTitleCell = wsSeller.getCell("A1");
  sellerTitleCell.value = `RESUMO DE COMISSÕES POR VENDEDOR — ${monthLabel.toUpperCase()} ${year}`;
  sellerTitleCell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  sellerTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A2B4A" } };
  sellerTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  wsSeller.getRow(1).height = 26;

  const sellerHeaders = ["Vendedor", "Qtd. Orçamentos", "Faturamento (R$)", "% Comissão Média", "Comissão Total (R$)", "Obs."];
  const sellerHeaderRow = wsSeller.getRow(2);
  sellerHeaderRow.height = 20;
  sellerHeaders.forEach((h, i) => {
    const cell = sellerHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D5A8E" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    };
  });

  // Agrupar por vendedor
  const sellerMap = new Map<string, { count: number; totalFinal: number; totalCommission: number; sumPct: number }>();
  for (const r of rows) {
    const name = r.seller1Name ?? "Sem Vendedor";
    const existing = sellerMap.get(name) ?? { count: 0, totalFinal: 0, totalCommission: 0, sumPct: 0 };
    sellerMap.set(name, {
      count: existing.count + 1,
      totalFinal: existing.totalFinal + r.totalFinal,
      totalCommission: existing.totalCommission + r.commission,
      sumPct: existing.sumPct + r.commissionPercent,
    });
  }

  const sellerRows = Array.from(sellerMap.entries())
    .map(([name, v]) => ({ name, ...v, avgPct: v.sumPct / v.count }))
    .sort((a, b) => b.totalCommission - a.totalCommission);

  let sRowIdx = 3;
  for (const s of sellerRows) {
    const row = wsSeller.getRow(sRowIdx);
    row.height = 16;
    const isEven = (sRowIdx - 3) % 2 === 0;
    const bgColor = isEven ? "FFFAFAFA" : "FFFFFFFF";

    const rowData = [s.name, s.count, s.totalFinal, s.avgPct, s.totalCommission, ""];
    rowData.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.border = {
        top: { style: "hair" }, bottom: { style: "hair" },
        left: { style: "thin" }, right: { style: "thin" },
      };
      cell.alignment = { vertical: "middle" };
      if (i === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
      if (i === 2 || i === 4) {
        cell.numFmt = '"R$"#,##0.00';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      if (i === 3) {
        cell.numFmt = "0.00%";
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
    sRowIdx++;
  }

  // Linha de total no resumo
  const sTotalRow = wsSeller.getRow(sRowIdx);
  sTotalRow.height = 20;
  const sTotalData = [
    "TOTAL",
    sellerRows.reduce((s, r) => s + r.count, 0),
    sellerRows.reduce((s, r) => s + r.totalFinal, 0),
    "",
    sellerRows.reduce((s, r) => s + r.totalCommission, 0),
    "",
  ];
  sTotalData.forEach((v, i) => {
    const cell = sTotalRow.getCell(i + 1);
    cell.value = v;
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE0B2" } };
    cell.border = {
      top: { style: "medium" }, bottom: { style: "medium" },
      left: { style: "thin" }, right: { style: "thin" },
    };
    if (i === 2 || i === 4) {
      cell.numFmt = '"R$"#,##0.00';
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
    if (i === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // ── Larguras das colunas ───────────────────────────────────────────────────
  ws.columns = [
    { width: 16 }, { width: 14 }, { width: 28 }, { width: 28 },
    { width: 20 }, { width: 20 }, { width: 20 },
    { width: 16 }, { width: 12 }, { width: 16 },
    { width: 10 }, { width: 14 }, { width: 30 },
  ];

  wsSeller.columns = [
    { width: 28 }, { width: 16 }, { width: 18 },
    { width: 18 }, { width: 20 }, { width: 20 },
  ];

  // ── Exportar ───────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio-vendas-${year}-${String(month).padStart(2, "0")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
