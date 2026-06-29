/**
 * orderPreviewGenerator.ts
 * Gera HTML da ficha técnica de produção para pré-visualização e impressão.
 * Replica o layout do Excel (orderExcelGenerator.ts) em formato HTML/CSS.
 */

import type { CartItemData, LinkedAccessory } from "./cartTypes";
import type { OrderFormData } from "./orderExcelGenerator";
import { toBrasiliaDate } from "./dateUtils";

function fmtQty(n: number): string {
  return String(n).padStart(2, "0");
}

function buildProfileSkuText(item: CartItemData): string {
  if (!item.profileSegments || item.profileSegments.length === 0) {
    return item.sku ?? "";
  }
  return item.profileSegments
    .map((seg) => `${fmtQty(seg.qty)} x ${seg.sku} - ${seg.lengthMm}mm`)
    .join("<br>");
}

function buildProfileFonteLuzText(item: CartItemData): string {
  if (!item.profileSegments || item.profileSegments.length === 0) {
    return item.moduloLed ?? [item.power, item.cct].filter(Boolean).join(" | ") ?? "";
  }
  const cct = item.cct ?? "";
  const isStripline = item.stripMethod === "STRIPLINE";
  return item.profileSegments
    .map((seg) => {
      const barName = isStripline
        ? `Stripline 562,5 x 15mm 108L ${cct}`
        : `Stripflex 562,5 x 10mm 36L ${cct}`;
      return `${seg.sku} - ${fmtQty(seg.barsPerPiece)} x ${barName}`;
    })
    .join("<br>");
}

function buildProfileEquipamentosText(item: CartItemData): string {
  if (!item.profileSegments || item.profileSegments.length === 0) {
    return item.drivers ?? "";
  }
  return item.profileSegments
    .map((seg) => {
      if (seg.driverModel.includes(" + ")) {
        return `${seg.sku} - ${seg.driverModel}`;
      }
      const codeSuffix = seg.driverCode && seg.driverCode !== "ERRO"
        ? ` (${seg.driverCode})`
        : "";
      return `${seg.sku} - ${fmtQty(seg.driverQtyPerPiece)} x ${seg.driverModel}${codeSuffix}`;
    })
    .join("<br>");
}

function buildProdutoText(item: CartItemData): string {
  return item.description || "";
}

function isLedBar(item: CartItemData): boolean {
  return item.category === "LED BAR" && item.ledBarNCortes !== undefined;
}

function buildLedBarFonteLuzText(item: CartItemData): string {
  const nCortes = item.ledBarNCortes ?? 1;
  const mm = item.ledBarComprimentoPorTrechoMm ?? item.ledBarComprimentoTotalMm ?? 0;
  const modulo = item.moduloLed ?? "";
  const linhas: string[] = [];
  if (modulo) linhas.push(`Módulo: ${modulo}`);
  if (nCortes > 1) {
    linhas.push(`Trechos: ${nCortes}x de ${mm}mm`);
  } else {
    linhas.push(`Comprimento: ${mm}mm`);
  }
  return linhas.join("<br>");
}

function buildLedBarEquipamentosText(item: CartItemData): string {
  const nCortes = item.ledBarNCortes ?? 1;
  const model = item.ledBarDriverModel ?? "";
  const code = item.ledBarDriverCode ?? "";
  if (!model) return item.drivers ?? "";
  const codeSuffix = code ? ` (${code})` : "";
  return `${nCortes}x ${model}${codeSuffix}`;
}

function buildSpecialEquipText(item: CartItemData): string {
  const equips = (item as any).specialEquipments as Array<{ codigo?: string; descricao: string; qty: number }> | undefined;
  if (equips && equips.length > 0) {
    return equips.map(e => `${e.qty}x ${e.descricao}${e.codigo ? ` (${e.codigo})` : ''}`).join('<br>');
  }
  return item.specialInternalNotes || "A DEFINIR";
}

function esc(str: string | number | null | undefined): string {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Converte \n para <br> e escapa HTML */
function escNl(str: string | null | undefined): string {
  if (!str) return "";
  return str.split("\n").map(esc).join("<br>");
}

/**
 * Gera o HTML completo da ficha técnica de produção.
 * Retorna uma string HTML pronta para ser injetada em um iframe ou janela.
 */
export function generateOrderPreviewHtml(items: CartItemData[], form: OrderFormData & { prazoStr?: string }): string {
  const isLuminew = form.empresa === "LUMINEW";
  const pedidoDisplay = form.orderNumber || form.quoteNumber;
  const displayDays = form.precomputedDisplayDays ?? (form.deliveryDays ?? 20) - 1;
  const prazoStr = form.prazoStr ?? `${displayDays} dias úteis`;

  // ── Linhas de dados ──────────────────────────────────────────────────────
  let dataRows = "";
  items.forEach((item, i) => {
    const isOdd = i % 2 === 0;
    const rowBg = isOdd ? "#dce6f1" : "#ffffff";

    const prodDesc = item.category === "Item Especial"
      ? esc([item.description, item.specialDimensions, item.specialPower].filter(Boolean).join(" | "))
      : esc(buildProdutoText(item));

    const skuText = item.category === "Item Especial"
      ? esc(item.sku || "ITEM ESPECIAL")
      : buildProfileSkuText(item);

    const fonteText = item.category === "Item Especial"
      ? esc([item.specialPower, item.specialDim, item.specialVoltage].filter(Boolean).join(" | ") || "-")
      : isLedBar(item)
        ? buildLedBarFonteLuzText(item)
        : buildProfileFonteLuzText(item);

    const equipText = item.category === "Item Especial"
      ? buildSpecialEquipText(item)
      : isLedBar(item)
        ? buildLedBarEquipamentosText(item)
        : buildProfileEquipamentosText(item);

    const corPecaValue = item.category === "Item Especial"
      ? (item.specialColor || item.corPeca || "A Definir")
      : (item.corPeca ?? "A Definir");

    dataRows += `
      <tr style="background:${rowBg}">
        <td style="text-align:center;font-weight:bold">${i + 1}</td>
        <td></td>
        <td style="text-align:center">${esc(item.itemEmPlanta ?? "")}</td>
        <td style="text-align:left">${prodDesc}</td>
        <td style="text-align:left;font-size:9px">${skuText}</td>
        <td style="text-align:left;font-size:9px">${fonteText}</td>
        <td style="text-align:left;font-size:9px">${equipText}</td>
        <td style="text-align:center;font-weight:bold">${esc(item.qty)}</td>
        <td style="text-align:center">${esc(corPecaValue)}</td>
        <td></td>
      </tr>`;

    // Sub-linhas de acessórios
    if (item.accessories && item.accessories.length > 0) {
      (item.accessories as LinkedAccessory[]).forEach((acc) => {
        dataRows += `
          <tr style="background:#e0f7fa">
            <td></td><td></td><td></td>
            <td style="text-align:left;font-size:9px;color:#006064;font-style:italic">↳ Acessório: ${esc(acc.descricao)}</td>
            <td style="text-align:center;font-size:9px;color:#006064;font-style:italic">${esc(acc.codigo ?? "")}</td>
            <td></td><td></td>
            <td style="text-align:center;font-weight:bold;color:#006064;font-style:italic">${esc(acc.qty)}</td>
            <td></td><td></td>
          </tr>`;
      });
    }
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ficha Técnica de Produção — ${esc(pedidoDisplay)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: #000;
      background: #fff;
      padding: 12px;
    }
    h1 {
      background: #1f3864;
      color: #fff;
      text-align: center;
      font-size: 15px;
      padding: 8px 0;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .header-grid {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      gap: 0;
      border: 1px solid #8ea9c1;
      margin-bottom: 6px;
    }
    .hg-label {
      background: #d9e1f2;
      font-weight: bold;
      padding: 5px 8px;
      border: 1px solid #8ea9c1;
      white-space: nowrap;
    }
    .hg-value {
      padding: 5px 8px;
      border: 1px solid #8ea9c1;
    }
    .hg-value.bold { font-weight: bold; font-size: 11px; }
    .hg-value.pedido { font-weight: bold; font-size: 12px; font-family: monospace; }
    .hg-value.prazo { font-weight: bold; color: #cc0000; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }
    th {
      background: #1f3864;
      color: #fff;
      font-size: 9px;
      padding: 5px 3px;
      border: 1.5px solid #8ea9c1;
      text-align: center;
    }
    td {
      padding: 4px 3px;
      border: 1px solid #8ea9c1;
      vertical-align: top;
    }
    .obs-row td {
      background: #d9e1f2;
      font-weight: bold;
      padding: 5px 8px;
    }
    .brand-row {
      font-size: 10px;
      font-weight: bold;
      padding: 4px 8px;
      border: 1px solid #8ea9c1;
    }
    @media print {
      body { padding: 4px; }
      @page { size: A4 landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <h1>FICHA TÉCNICA DE PRODUÇÃO</h1>

  <!-- Cabeçalho -->
  <table style="margin-bottom:6px;font-size:10px">
    <colgroup>
      <col style="width:60px">
      <col style="width:300px">
      <col style="width:60px">
      <col style="width:120px">
      <col style="width:60px">
      <col style="width:120px">
      <col style="width:80px">
      <col style="width:120px">
    </colgroup>
    <tr>
      <td class="hg-label" rowspan="2" style="vertical-align:middle;text-align:center">CLIENTE</td>
      <td colspan="3" class="hg-value bold" rowspan="2" style="vertical-align:middle;text-align:center;font-size:12px">
        ${esc(form.clientName)}${form.projectName ? " / " + esc(form.projectName) : ""}
      </td>
      <td class="hg-label">PEDIDO:</td>
      <td class="hg-value pedido">${esc(pedidoDisplay)}</td>
      <td class="hg-label">PRAZO:</td>
      <td class="hg-value prazo">${esc(prazoStr)}</td>
    </tr>
    <tr>
      <td class="hg-label">VENDEDOR:</td>
      <td class="hg-value">${esc(form.vendorName)}</td>
      <td colspan="2" class="brand-row">
        ${isLuminew
          ? "1 - ALFALUX &nbsp;(&nbsp;&nbsp;&nbsp;) &nbsp;&nbsp;&nbsp;&nbsp; 2 - LUMINEW &nbsp;( X )"
          : "1 - ALFALUX &nbsp;( X ) &nbsp;&nbsp;&nbsp;&nbsp; 2 - LUMINEW &nbsp;(&nbsp;&nbsp;&nbsp;)"}
      </td>
    </tr>
  </table>

  <!-- Tabela de itens -->
  <table>
    <thead>
      <tr>
        <th style="width:40px">ITEM</th>
        <th style="width:50px">PA</th>
        <th style="width:60px">ETIQUETA</th>
        <th style="width:180px">PRODUTO</th>
        <th style="width:130px">SKU</th>
        <th style="width:160px">FONTE DE LUZ</th>
        <th style="width:200px">EQUIPAMENTOS</th>
        <th style="width:40px">QTD</th>
        <th style="width:90px">COR DA PEÇA</th>
        <th>OBSERVAÇÕES</th>
      </tr>
    </thead>
    <tbody>
      ${dataRows}
      <tr class="obs-row">
        <td colspan="3">OBSERVAÇÕES GERAIS</td>
        <td colspan="7"></td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top:8px;font-size:8px;color:#666;text-align:right">
    Gerado em: ${toBrasiliaDate(Date.now())} &nbsp;|&nbsp; PRÉ-VISUALIZAÇÃO — não é o documento oficial
  </div>
</body>
</html>`;
}
