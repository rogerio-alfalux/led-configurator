import ExcelJS from "exceljs";
import { stat } from "node:fs/promises";

const filePath = "/home/ubuntu/led-configurator/reports/Relatorio_Gerencial_Modulos_Perfis_2026-09-23.xlsx";
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(filePath);

const expectedSheets = ["Visão Geral", "Ranking por Módulo", "Base Auditável"];
const actualSheets = workbook.worksheets.map((sheet) => sheet.name);
if (JSON.stringify(expectedSheets) !== JSON.stringify(actualSheets)) throw new Error(`Abas inesperadas: ${actualSheets.join(", ")}`);

const ranking = workbook.getWorksheet("Ranking por Módulo");
const detail = workbook.getWorksheet("Base Auditável");
const filterRef = (sheet) => typeof sheet.autoFilter === "string" ? sheet.autoFilter : sheet.autoFilter?.ref;
for (const sheet of [ranking, detail]) {
  if (!filterRef(sheet)) throw new Error(`Filtro ausente em ${sheet.name}`);
  if (sheet.rowCount <= 6) throw new Error(`Sem linhas de dados em ${sheet.name}`);
  if (sheet.views[0]?.state !== "frozen") throw new Error(`Painel congelado ausente em ${sheet.name}`);
}

const firstFullModuleSku = String(ranking.getCell("D7").value ?? "");
const quotedModules = Number(ranking.getCell("F7").value);
const soldModules = Number(ranking.getCell("H7").value);
if (!/^[A-Z]{3}-\d{4}\.[^.]+\.[A-Z0-9]+$/i.test(firstFullModuleSku)) throw new Error(`SKU de módulo não está completo: ${firstFullModuleSku}`);
if (!Number.isFinite(quotedModules) || quotedModules <= 0 || !Number.isFinite(soldModules)) throw new Error("Métricas do ranking não foram preenchidas");

const fileStat = await stat(filePath);
console.log(JSON.stringify({
  filePath,
  fileSizeBytes: fileStat.size,
  sheets: actualSheets,
  rows: { ranking: ranking.rowCount - 6, audit: detail.rowCount - 6 },
  filters: { ranking: filterRef(ranking), audit: filterRef(detail) },
  leader: { moduleSku: firstFullModuleSku, modulesQuoted: quotedModules, modulesSold: soldModules },
}, null, 2));
