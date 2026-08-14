import ExcelJS from "exceljs";
import { toBrasiliaDateTime, toBrasiliaFileDate } from "./dateUtils";

export interface QuoteExcelExportRow {
  quoteNumber: string;
  revisionCount?: number | null;
  status: string;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  clientName: string | null;
  clientContact?: string | null;
  projectName?: string | null;
  projectRef?: string | null;
  seller1Name?: string | null;
  seller2Name?: string | null;
  assistantName?: string | null;
  freteState?: string | null;
  freteCity?: string | null;
  freteType?: string | null;
  totalAmount?: number | string | null;
  totalFinal?: number | string | null;
  isProspecting?: boolean | null;
  isDuplicate?: boolean | null;
  ldRequestNumber?: string | null;
  ldRequestStatus?: string | null;
}

const STATUS: Record<string, string> = {
  open: "Em Aberto",
  approved: "Aprovado",
  lost: "Perdido",
  cancelled: "Cancelado",
  invoiced: "Faturado",
  sample: "Amostra",
};

const LD_STATUS: Record<string, string> = {
  pending: "Nova",
  in_review: "Pendente de resposta",
  quote_ready: "PDF enviado",
  cancelled: "Cancelada",
};

const FRETE: Record<string, string> = {
  free: "CIF / Frete incluso",
  paid: "Frete cobrado",
  night: "Entrega noturna",
  consult: "A calcular",
  pickup: "Retira",
};

const NAVY = "FF1A2B4A";
const BLUE = "FF2D5A8E";
const LIGHT_BLUE = "FFDCE6F1";
const TOTAL = "FFFFE0B2";
const BORDER = {
  top: { style: "thin" as const, color: { argb: "FFB8C7D9" } },
  bottom: { style: "thin" as const, color: { argb: "FFB8C7D9" } },
  left: { style: "thin" as const, color: { argb: "FFB8C7D9" } },
  right: { style: "thin" as const, color: { argb: "FFB8C7D9" } },
};

function number(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function origin(row: QuoteExcelExportRow): string {
  if (row.ldRequestNumber) return row.isProspecting ? "Prospecção LD" : "Solicitação LD";
  return row.isProspecting ? "Prospecção" : "Orçamento direto";
}

function download(buffer: ArrayBuffer, fileName: string) {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function generateFilteredQuotesExcel(rows: QuoteExcelExportRow[], filtersSummary: string): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Luna — Alfalux Iluminação";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Orçamentos filtrados", {
    views: [{ state: "frozen", ySplit: 3 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });
  const endColumn = "Q";
  sheet.mergeCells(`A1:${endColumn}1`);
  sheet.getCell("A1").value = "EXPORTAÇÃO DE ORÇAMENTOS";
  sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(`A2:${endColumn}2`);
  sheet.getCell("A2").value = `Filtros: ${filtersSummary} | Gerado em ${toBrasiliaDateTime(new Date())} | ${rows.length} orçamento${rows.length === 1 ? "" : "s"}`;
  sheet.getCell("A2").font = { italic: true, size: 10, color: { argb: "FF4A5568" } };
  sheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getRow(2).height = 28;

  const headers = [
    "Nº Orçamento", "Revisão", "Status", "Criação", "Atualização", "Cliente", "Contato", "Obra", "Referência",
    "Vendedor(es)", "Assistente", "Destino", "Tipo de frete", "Valor base (R$)", "Valor final (R$)", "Origem", "Solicitação LD / resposta",
  ];
  const headerRow = sheet.getRow(3);
  headerRow.height = 32;
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.border = BORDER;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  rows.forEach((row, index) => {
    const excelRow = sheet.getRow(index + 4);
    excelRow.height = 30;
    const destination = [row.freteCity, row.freteState].filter(Boolean).join(" - ") || "—";
    const sellers = [row.seller1Name, row.seller2Name].filter(Boolean).join(" / ") || "—";
    const ldInfo = row.ldRequestNumber
      ? `${row.ldRequestNumber} — ${LD_STATUS[row.ldRequestStatus ?? ""] ?? row.ldRequestStatus ?? "Sem status"}`
      : "—";
    const values = [
      row.quoteNumber || "—",
      `RV${row.revisionCount ?? 0}`,
      STATUS[row.status] ?? row.status,
      toBrasiliaDateTime(row.createdAt),
      row.updatedAt ? toBrasiliaDateTime(row.updatedAt) : "—",
      row.clientName || "—",
      row.clientContact || "—",
      row.projectName || "—",
      row.projectRef || "—",
      sellers,
      row.assistantName || "—",
      destination,
      FRETE[row.freteType ?? ""] ?? "—",
      number(row.totalAmount),
      number(row.totalFinal),
      origin(row) + (row.isDuplicate ? " · Duplicado" : ""),
      ldInfo,
    ];
    values.forEach((value, column) => {
      const cell = excelRow.getCell(column + 1);
      cell.value = value;
      cell.border = BORDER;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 === 0 ? "FFFAFAFA" : "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", wrapText: true };
      if ([0, 1, 2, 3, 4].includes(column)) cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      if ([13, 14].includes(column)) {
        cell.numFmt = '"R$" #,##0.00';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
    });
  });

  const totalRow = sheet.getRow(rows.length + 4);
  totalRow.height = 22;
  const totalBase = rows.reduce((sum, row) => sum + number(row.totalAmount), 0);
  const totalFinal = rows.reduce((sum, row) => sum + number(row.totalFinal), 0);
  ["TOTAL", "", "", "", "", "", "", "", "", "", "", "", "", totalBase, totalFinal, "", ""].forEach((value, column) => {
    const cell = totalRow.getCell(column + 1);
    cell.value = value;
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL } };
    cell.border = BORDER;
    if ([13, 14].includes(column)) {
      cell.numFmt = '"R$" #,##0.00';
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
  });

  [18, 10, 15, 18, 18, 24, 20, 26, 18, 25, 20, 20, 20, 16, 16, 18, 31].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.autoFilter = { from: "A3", to: `Q${Math.max(3, rows.length + 3)}` };

  const summary = workbook.addWorksheet("Resumo", { views: [{ state: "frozen", ySplit: 2 }] });
  summary.mergeCells("A1:C1");
  summary.getCell("A1").value = "RESUMO DOS ORÇAMENTOS EXPORTADOS";
  summary.getCell("A1").font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  summary.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  summary.getCell("A1").alignment = { horizontal: "center" };
  summary.getRow(1).height = 26;
  summary.getCell("A2").value = "Status";
  summary.getCell("B2").value = "Quantidade";
  summary.getCell("C2").value = "Valor final (R$)";
  ["A2", "B2", "C2"].forEach(address => {
    const cell = summary.getCell(address);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.border = BORDER;
    cell.alignment = { horizontal: "center" };
  });
  const groups = new Map<string, { count: number; value: number }>();
  rows.forEach(row => {
    const group = groups.get(row.status) ?? { count: 0, value: 0 };
    groups.set(row.status, { count: group.count + 1, value: group.value + number(row.totalFinal) });
  });
  Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b)).forEach(([status, group], index) => {
    const row = summary.getRow(index + 3);
    [STATUS[status] ?? status, group.count, group.value].forEach((value, column) => {
      const cell = row.getCell(column + 1);
      cell.value = value;
      cell.border = BORDER;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 === 0 ? LIGHT_BLUE : "FFFFFFFF" } };
      if (column === 2) cell.numFmt = '"R$" #,##0.00';
    });
  });
  summary.getColumn(1).width = 24;
  summary.getColumn(2).width = 16;
  summary.getColumn(3).width = 20;

  const buffer = await workbook.xlsx.writeBuffer();
  if (typeof document !== "undefined") download(buffer as ArrayBuffer, `ORCAMENTOS-FILTRADOS-${toBrasiliaFileDate(new Date())}.xlsx`);
  return buffer as ArrayBuffer;
}
