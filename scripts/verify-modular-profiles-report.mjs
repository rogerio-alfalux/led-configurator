import ExcelJS from "exceljs";
import { stat } from "node:fs/promises";

const filePath = "/home/ubuntu/led-configurator/reports/Relatorio_Gerencial_Perfis_Modulares_2026-09-23.xlsx";
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(filePath);

const expectedSheets = ["Visão Geral", "Ranking Orçado", "Ranking Faturado", "Módulos por SKU", "Base Detalhada"];
const actualSheets = workbook.worksheets.map((sheet) => sheet.name);
if (JSON.stringify(expectedSheets) !== JSON.stringify(actualSheets)) {
  throw new Error(`Abas inesperadas: ${actualSheets.join(", ")}`);
}

const quoted = workbook.getWorksheet("Ranking Orçado");
const sold = workbook.getWorksheet("Ranking Faturado");
const modules = workbook.getWorksheet("Módulos por SKU");
const detail = workbook.getWorksheet("Base Detalhada");
const filterRef = (sheet) => typeof sheet.autoFilter === "string" ? sheet.autoFilter : sheet.autoFilter?.ref;
for (const sheet of [quoted, sold, modules, detail]) {
  if (!filterRef(sheet)) throw new Error(`Filtro ausente em ${sheet.name}`);
  if (sheet.rowCount <= 6) throw new Error(`Sem linhas de dados em ${sheet.name}`);
  if (sheet.views[0]?.state !== "frozen") throw new Error(`Painel congelado ausente em ${sheet.name}`);
}

const firstQuotedSku = quoted.getCell("D7").value;
const firstQuotedBars = quoted.getCell("I7").value;
const firstSoldSku = sold.getCell("D7").value;
const firstSoldBars = sold.getCell("M7").value;
if (firstQuotedSku !== "LLS-3945" || Number(firstQuotedBars) !== 8800.9) {
  throw new Error(`Ranking orçado inconsistente: ${firstQuotedSku} / ${firstQuotedBars}`);
}
if (firstSoldSku !== "LLP-6060" || Number(firstSoldBars) !== 3232) {
  throw new Error(`Ranking faturado inconsistente: ${firstSoldSku} / ${firstSoldBars}`);
}

const fileStat = await stat(filePath);
console.log(JSON.stringify({
  filePath,
  fileSizeBytes: fileStat.size,
  sheets: actualSheets,
  dataRows: {
    quoted: quoted.rowCount - 6,
    sold: sold.rowCount - 6,
    modules: modules.rowCount - 6,
    detail: detail.rowCount - 6,
  },
  filters: {
    quoted: filterRef(quoted),
    sold: filterRef(sold),
    modules: filterRef(modules),
    detail: filterRef(detail),
  },
  leaders: {
    quoted: { sku: firstQuotedSku, bars: firstQuotedBars },
    sold: { sku: firstSoldSku, bars: firstSoldBars },
  },
}, null, 2));
