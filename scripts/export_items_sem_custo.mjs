import mysql from "mysql2/promise";
import ExcelJS from "exceljs";
import {
  fetchAllAlfaluxProducts,
  fetchAcessoriosProducts,
  fetchComponentes,
  fetchRevendaProducts,
} from "../server/alfaluxApiService.ts";
import { selectApiProductForQuoteItem } from "../server/quoteCostUtils.ts";

const OUTPUT_PATH = "/home/ubuntu/Downloads/orcamentos_itens_sem_custo.xlsx";
const COST_SOURCE_NOTE = "Fonte: Sistema Luna (quotes, quote_versions e quote_items) e Catálogo Alfalux. Critério: revisão vigente sem custo oficial confirmado ou custo manual cadastrado. Consulta somente leitura.";

function positiveNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalized(value) {
  return String(value ?? "").trim().toUpperCase();
}

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function getProductBodyCost(product, driverCode) {
  const code = normalized(driverCode);
  const variants = [
    [product.driver220, product.custoCorpoOnoff220v],
    [product.driverBivolt, product.custoCorpoOnoffBivolt],
    [product.driverDim110v, product.custoCorpoDim110v],
    [product.driverDimDali, product.custoCorpoDimDali],
    [product.driverDimTriac110v, product.custoCorpoDimTriac110v],
    [product.driverDimTriac220v, product.custoCorpoDimTriac220v],
  ];
  const matchingVariant = code
    ? variants.find(([driver]) => normalized(driver?.code) === code)
    : undefined;
  return positiveNumber(matchingVariant?.[1] ?? product.custoCorpoOnoff220v ?? product.custoLuminaria);
}

function hasConfirmedCost(data, catalogs) {
  if (positiveNumber(data?.custoManual) > 0) return true;

  const category = normalized(data?.category);
  if (data?.isSpecialItem || category === "ITEM ESPECIAL" || category === "ESPECIAL") return false;
  if (category === "NÃO ORÇAMOS" || category === "NAO ORÇAMOS") return true;

  const sku = normalized(data?.sku);
  if (!sku) return false;

  const revenda = catalogs.revendaBySku.get(sku);
  if (positiveNumber(revenda?.custo) > 0) return true;

  const component = catalogs.componentByCode.get(sku);
  if (positiveNumber(component?.custoDriver) > 0) return true;

  const accessory = catalogs.accessoryByCode.get(sku) ?? catalogs.accessoryBySku.get(sku);
  if (positiveNumber(accessory?.custo) > 0) return true;

  if (Array.isArray(data?.profileSegments) && data.profileSegments.length > 0) {
    const firstDriverCode = normalized(data.profileSegments[0]?.driverCode);
    return data.profileSegments.some((segment) => {
      const segmentSku = normalized(segment?.sku);
      const segmentProduct = catalogs.productBySku.get(segmentSku);
      return positiveNumber(segmentProduct && getProductBodyCost(segmentProduct, firstDriverCode)) > 0;
    });
  }

  const product = selectApiProductForQuoteItem(catalogs.products, sku, data?.description);
  if (!product) return false;
  const driverCode = normalized(data?.driverLines?.[0]?.driverCode);
  return getProductBodyCost(product, driverCode) > 0;
}

function describeMissingItem(itemNumber, data) {
  const description = compactText(data?.description || data?.name || data?.sku || "Item sem descrição");
  return `Item ${itemNumber} — ${description}`;
}

function formatBrasiliaDate() {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function applyCellSource(cell) {
  cell.font = { name: "Aptos", size: 10, color: { argb: "FF0000FF" } };
  cell.alignment = { vertical: "top", wrapText: true };
  cell.note = COST_SOURCE_NOTE;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Conexão interna indisponível para gerar o relatório.");

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [allVersionRows] = await connection.query(`
      SELECT
        q.id AS quoteId,
        q.quoteNumber,
        q.projectName,
        qv.id AS quoteVersionId,
        qv.version AS versionNumber,
        qv.status AS versionStatus,
        qi.itemNumber,
        qi.itemData
      FROM quotes q
      INNER JOIN quote_versions qv ON qv.quoteId = q.id
      INNER JOIN quote_items qi ON qi.quoteVersionId = qv.id
      ORDER BY q.quoteNumber ASC, qv.version DESC, qi.itemNumber ASC
    `);

    // Mesma regra usada na tela: rascunho é a revisão vigente; sem rascunho,
    // escolhe-se a revisão de número mais alto. Fazemos a escolha fora da junção
    // para manter compatibilidade com o banco atual, que não permite subconsulta no ON.
    const activeVersionByQuote = new Map();
    for (const row of allVersionRows) {
      const current = activeVersionByQuote.get(row.quoteId);
      const rowIsDraft = row.versionStatus === "draft";
      const currentIsDraft = current?.versionStatus === "draft";
      if (!current
        || (rowIsDraft && !currentIsDraft)
        || (rowIsDraft === currentIsDraft && Number(row.versionNumber) > Number(current.versionNumber))) {
        activeVersionByQuote.set(row.quoteId, row);
      }
    }
    const rows = allVersionRows.filter((row) => activeVersionByQuote.get(row.quoteId)?.quoteVersionId === row.quoteVersionId);

    const [products, { items: components }, accessories, revendas] = await Promise.all([
      fetchAllAlfaluxProducts(true),
      fetchComponentes(true),
      fetchAcessoriosProducts(),
      fetchRevendaProducts(),
    ]);

    const catalogs = {
      products,
      productBySku: new Map(products.map((product) => [normalized(product.sku), product])),
      componentByCode: new Map(components.map((component) => [normalized(component.codigo), component])),
      accessoryByCode: new Map(accessories.filter((item) => item.codigo).map((item) => [normalized(item.codigo), item])),
      accessoryBySku: new Map(accessories.filter((item) => item.sku).map((item) => [normalized(item.sku), item])),
      revendaBySku: new Map(revendas.map((item) => [normalized(item.codigo), item])),
    };

    const missingItems = rows.flatMap((row) => {
      try {
        const itemData = typeof row.itemData === "string" ? JSON.parse(row.itemData) : row.itemData;
        if (hasConfirmedCost(itemData, catalogs)) return [];
        return [{
          quoteNumber: compactText(row.quoteNumber) || "Sem número",
          projectName: compactText(row.projectName) || "Obra não informada",
          missingItem: describeMissingItem(row.itemNumber, itemData),
        }];
      } catch {
        return [{
          quoteNumber: compactText(row.quoteNumber) || "Sem número",
          projectName: compactText(row.projectName) || "Obra não informada",
          missingItem: `Item ${row.itemNumber} — dados do item inválidos`,
        }];
      }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema Luna";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Itens sem custo", {
      views: [{ state: "frozen", ySplit: 8 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    sheet.getColumn(1).width = 20;
    sheet.getColumn(2).width = 20;

    sheet.mergeCells("C3:E3");
    const title = sheet.getCell("C3");
    title.value = "RELATÓRIO DE ITENS SEM CUSTO CADASTRADO";
    title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF135B44" } };
    title.font = { name: "Aptos", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    title.alignment = { vertical: "middle" };
    sheet.getRow(3).height = 24;

    sheet.mergeCells("C5:E5");
    const subtitle = sheet.getCell("C5");
    subtitle.value = `Revisões vigentes · consulta em ${formatBrasiliaDate()} (Brasília)`;
    subtitle.font = { name: "Aptos", size: 11, bold: true, color: { argb: "FF000000" } };

    sheet.mergeCells("C6:E6");
    const unit = sheet.getCell("C6");
    unit.value = "Lista de exceções; custo confirmado = custo oficial vigente da API ou custo manual registrado.";
    unit.font = { name: "Aptos", size: 10, italic: true, color: { argb: "FF000000" } };

    const headerRow = sheet.getRow(8);
    ["Número do orçamento", "Obra", "Item sem custo"].forEach((label, index) => {
      const cell = headerRow.getCell(index + 3);
      cell.value = label;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCFE9E0" } };
      cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: "FF000000" } };
      cell.alignment = { vertical: "center", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: "FF94A3B8" } } };
    });
    headerRow.height = 22;

    missingItems.forEach((record, index) => {
      const row = sheet.getRow(index + 9);
      [record.quoteNumber, record.projectName, record.missingItem].forEach((value, columnIndex) => {
        const cell = row.getCell(columnIndex + 3);
        cell.value = value;
        applyCellSource(cell);
        cell.border = { bottom: { style: "hair", color: { argb: "FFD1D5DB" } } };
      });
      row.height = 30;
    });

    if (missingItems.length === 0) {
      const cell = sheet.getCell("C9");
      cell.value = "Nenhum item sem custo confirmado foi identificado nas revisões vigentes.";
      cell.font = { name: "Aptos", size: 10, color: { argb: "FF000000" } };
      sheet.mergeCells("C9:E9");
    }

    for (const column of [3, 4, 5]) {
      let widest = 14;
      sheet.getColumn(column).eachCell({ includeEmpty: false }, (cell) => {
        widest = Math.max(widest, Math.min(80, String(cell.value ?? "").length + 2));
      });
      sheet.getColumn(column).width = widest;
    }

    const lastRow = Math.max(9, missingItems.length + 8);
    sheet.pageSetup.printArea = `B2:E${lastRow}`;
    sheet.headerFooter.oddFooter = "&CItens sem custo · Página &P de &N";
    await workbook.xlsx.writeFile(OUTPUT_PATH);

    console.log(JSON.stringify({ outputPath: OUTPUT_PATH, records: missingItems.length }));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
