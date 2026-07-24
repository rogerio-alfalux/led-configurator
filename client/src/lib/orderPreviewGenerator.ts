/**
 * orderPreviewGenerator.ts
 * Gera HTML da ficha técnica de produção para pré-visualização e impressão.
 * Replica o layout do Excel (orderExcelGenerator.ts) em formato HTML/CSS.
 */

import type { CartItemData, LinkedAccessory } from "./cartTypes";
import type { OrderFormData } from "./orderExcelGenerator";
import { toBrasiliaDateTime } from "./dateUtils";
import { groupOrderItems } from "./orderGrouping";
import { buildMaterialRequisition, groupByTipo } from "./materialRequisition";
import type { MaterialTipo } from "./materialRequisition";

function fmtQty(n: number): string {
  // Arredondar para cima com 1 decimal para módulos LED (podem ser fracionários)
  const rounded = Math.ceil(n * 10) / 10;
  const s = rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1);
  return s.padStart(s.includes(".") ? 5 : 2, "0");
}

function buildProfileSkuText(item: CartItemData): string {
  if (!item.profileSegments || item.profileSegments.length === 0) {
    return item.sku ?? "";
  }
  return item.profileSegments
    .map((seg) => `${fmtQty(seg.qty)} x ${seg.sku} - ${seg.lengthMm}mm`)
    .join("<br>");
}

function buildProfileFonteLuzText(item: CartItemData, descMap?: Map<string, string>): string {
  if (!item.profileSegments || item.profileSegments.length === 0) {
    const modName = item.moduloLed ?? [item.power, item.cct].filter(Boolean).join(" | ") ?? "";
    // Não duplicar EQ se já está embutido no moduloLed
    const alreadyHasEq = item.moduloLedCode && modName.includes(`(${item.moduloLedCode})`);
    const modEqSuffix = item.moduloLedCode && !alreadyHasEq ? ` (${esc(item.moduloLedCode)})` : "";
    return `${esc(modName)}${modEqSuffix}`;
  }
  const itemQty = item.qty ?? 1;

  // Agrupar por código EQ do módulo e somar quantidades totais
  const totals = new Map<string, { qty: number; eqCode: string | null; name: string }>();
  for (const seg of item.profileSegments) {
    const eqCode = (seg as any).ledModuleCode ?? null;
    // Preferência: descrição canônica da API pelo código EQ; fallback: item.moduloLed ou eqCode
    const apiDesc = eqCode ? descMap?.get(eqCode) : undefined;
    const barName = apiDesc ?? item.moduloLed ?? eqCode ?? "Módulo LED";
    const mapKey = eqCode ?? barName;
    const totalBars = seg.qty * seg.barsPerPiece * itemQty;
    const existing = totals.get(mapKey);
    if (existing) {
      totals.set(mapKey, { qty: existing.qty + totalBars, eqCode, name: barName });
    } else {
      totals.set(mapKey, { qty: totalBars, eqCode, name: barName });
    }
  }

  return Array.from(totals.values())
    .map(({ qty, eqCode, name }) => {
      const eqSuffix = eqCode ? ` (${esc(eqCode)})` : "";
      return `${fmtQty(qty)} x ${esc(name)}${eqSuffix}`;
    })
    .join("<br>");
}

function buildLuminariaEquipamentosText(item: CartItemData): string {
  if (!item.driverLines || item.driverLines.length === 0) {
    return esc(item.drivers ?? "");
  }
  return item.driverLines.map(dl => {
    const codeSuffix = dl.driverCode ? ` (${esc(dl.driverCode)})` : "";
    const linha = `${dl.driverQty}x ${esc(dl.driverModel)}${codeSuffix}`;
    if (dl.corrente && !dl.driverModel.toUpperCase().includes("FONTE 24V")) {
      return `${linha}<br><span style="color:#555;font-style:italic">PROGRAMAÇÃO: ${esc(dl.corrente)}</span>`;
    }
    return linha;
  }).join("<br>");
}

function buildProfileEquipamentosText(item: CartItemData): string {
  if (!item.profileSegments || item.profileSegments.length === 0) {
    // Se tem driverLines (luminária com driver desmembrado), usar buildLuminariaEquipamentosText
    if (item.driverLines && item.driverLines.length > 0) {
      return buildLuminariaEquipamentosText(item);
    }
    return esc(item.drivers ?? "");
  }

  const itemQty = item.qty ?? 1;

  // Agrupar por modelo+código e somar quantidades totais
  const totals = new Map<string, { model: string; code: string; qty: number }>();

  for (const seg of item.profileSegments) {
    // Driver combo
    if (seg.driverModel.includes(" + ")) {
      const comboKey = seg.driverModel;
      const totalQty = seg.qty * itemQty;
      const existing = totals.get(comboKey);
      if (existing) {
        totals.set(comboKey, { ...existing, qty: existing.qty + totalQty });
      } else {
        totals.set(comboKey, { model: seg.driverModel, code: "", qty: totalQty });
      }
      continue;
    }

    // Driver simples
    const codeSuffix = seg.driverCode && seg.driverCode !== "ERRO"
      ? ` (${seg.driverCode})`
      : "";
    const key = `${seg.driverModel}${codeSuffix}`;
    const totalQty = seg.qty * seg.driverQtyPerPiece * itemQty;
    const existing = totals.get(key);
    if (existing) {
      totals.set(key, { ...existing, qty: existing.qty + totalQty });
    } else {
      totals.set(key, { model: seg.driverModel, code: codeSuffix, qty: totalQty });
    }
  }

  // Coletar corrente (igual para todos os segmentos do mesmo perfil)
  const correnteSegmento = item.profileSegments
    .map((s: any) => s.corrente)
    .find((c: any) => c && c.trim());

  const linhas = Array.from(totals.entries())
    .map(([key, entry]) => {
      if (!entry.code) return `${fmtQty(entry.qty)} x ${esc(key)}`;
      return `${fmtQty(entry.qty)} x ${esc(entry.model)}${esc(entry.code)}`;
    });

  // Adicionar linha de programação se houver corrente e não for fonte 24V
  if (correnteSegmento) {
    const isDriverFonte = Array.from(totals.values()).every(e =>
      e.model.toUpperCase().includes("FONTE 24V")
    );
    if (!isDriverFonte) {
      linhas.push(`<span style="color:#555;font-style:italic">PROGRAMAÇÃO: ${esc(correnteSegmento)}</span>`);
    }
  }

  return linhas.join("<br>");
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
  const moduloEqSuffix = item.moduloLedCode ? ` (${esc(item.moduloLedCode)})` : "";
  const linhas: string[] = [];
  if (modulo) linhas.push(`Módulo: ${esc(modulo)}${moduloEqSuffix}`);
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

// Classifica equipamento como driver (coluna EQUIPAMENTOS) ou fonte de luz (coluna FONTE DE LUZ)
// Usa tipo quando disponível; caso contrário usa familia como fallback para itens antigos
const isDriverTipoPreview = (tipo?: string, familia?: string) => {
  if (tipo) return tipo.startsWith("DRIVER_");
  // Fallback por familia para itens antigos sem tipo salvo
  if (familia) {
    const f = familia.toUpperCase();
    return f.includes("DRIVER") || f.includes("FONTE");
  }
  return true; // default: vai para EQUIPAMENTOS
};
const isFonteLuzTipoPreview = (tipo?: string, familia?: string) => {
  if (tipo) return tipo === "MODULO_LED" || tipo === "OTICA" || tipo === "HOLDER" || tipo === "DISSIPADOR";
  // Fallback por familia para itens antigos sem tipo salvo
  if (familia) {
    const f = familia.toUpperCase();
    return f.includes("MÓDULO") || f.includes("MODULO") || f.includes("ÓPTICA") || f.includes("OPTICA") || f.includes("HOLDER") || f.includes("DISSIPADOR");
  }
  return false;
};

function buildSpecialFonteLuzText(item: CartItemData): string {
  const equips = (item as any).specialEquipments as Array<{ codigo?: string; descricao: string; qty: number; tipo?: string; familia?: string }> | undefined;
  if (equips && equips.length > 0) {
    const fonteLuzEquips = equips.filter(e => isFonteLuzTipoPreview(e.tipo, e.familia));
    if (fonteLuzEquips.length > 0) {
      return fonteLuzEquips.map(e => `${e.qty}x ${esc(e.descricao)}${e.codigo ? ` (${esc(e.codigo)})` : ''}`).join('<br>');
    }
  }
  // Fallback: potência + dim + tensão
  return esc([item.specialPower, item.specialDim, item.specialVoltage].filter(Boolean).join(" | ") || "-");
}

function buildSpecialEquipText(item: CartItemData): string {
  const equips = (item as any).specialEquipments as Array<{ codigo?: string; descricao: string; qty: number; tipo?: string; familia?: string }> | undefined;
  if (equips && equips.length > 0) {
    // Apenas drivers vão para a coluna EQUIPAMENTOS
    const driverEquips = equips.filter(e => isDriverTipoPreview(e.tipo, e.familia));
    if (driverEquips.length > 0) {
      return driverEquips.map(e => `${e.qty}x ${esc(e.descricao)}${e.codigo ? ` (${esc(e.codigo)})` : ''}`).join('<br>');
    }
    return "A DEFINIR";
  }
  return "A DEFINIR";
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
export function generateOrderPreviewHtml(items: CartItemData[], form: OrderFormData & { prazoStr?: string }, descMap?: Map<string, string>): string {
  const isLuminew = form.empresa === "LUMINEW";
  // Campo PEDIDO: mostra o número do pedido de fábrica (6 dígitos) se informado,
  // caso contrário mostra "NÃO INFORMADO" para deixar claro que falta o número
  const pedidoDisplay = form.orderNumber && /^\d{6}$/.test(form.orderNumber)
    ? form.orderNumber
    : "NÃO INFORMADO";
  const displayDays = form.precomputedDisplayDays ?? (form.deliveryDays ?? 20) - 1;
  const prazoStr = form.prazoStr ?? `${displayDays} dias úteis`;

  // ── Linhas de dados ──────────────────────────────────────────────────────
  let dataRows = "";
  // Filtrar itens de "Não Orçamos" pois são apenas indicativos e não devem aparecer na ficha de produção
  // Agrupar itens idênticos (mesmo produto, CCT, cor, drivers) somando quantidades e concatenando etiquetas com pavimento
  const orderItems = groupOrderItems(items.filter(item => item.category !== 'Não Orçamos'));
  orderItems.forEach((item, i) => {
    const isOdd = i % 2 === 0;
    const rowBg = isOdd ? "#dce6f1" : "#ffffff";

    const prodDesc = item.category === "Item Especial"
      ? esc([item.description, item.specialDimensions, item.specialPower].filter(Boolean).join(" | "))
      : esc(buildProdutoText(item));

    const skuText = item.category === "Item Especial"
      ? esc(item.sku || "ITEM ESPECIAL")
      : buildProfileSkuText(item);

    const fonteText = item.category === "Item Especial"
      ? buildSpecialFonteLuzText(item)
      : isLedBar(item)
        ? buildLedBarFonteLuzText(item)
        : buildProfileFonteLuzText(item, descMap);

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
        <td style="text-align:left;font-size:9px">${item.category === "Item Especial" ? escNl(item.specialInternalNotes) : ""}</td>
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
    /* Marca d'água RASCUNHO */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 110px;
      font-weight: 900;
      color: rgba(220, 38, 38, 0.13);
      pointer-events: none;
      white-space: nowrap;
      z-index: 9999;
      letter-spacing: 10px;
      font-family: Arial, sans-serif;
    }
    /* Rodapé fixo em todas as páginas */
    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      font-size: 8px;
      color: #555;
      background: #fff;
      border-top: 1px solid #bbb;
      padding: 3px 10px;
      display: none;
      justify-content: space-between;
      align-items: center;
    }
    @media print {
      body { padding: 4px; padding-bottom: 18px; }
      @page { size: A4 landscape; margin: 10mm 10mm 16mm 10mm; }
      .watermark { color: rgba(220, 38, 38, 0.10); }
      .page-footer { display: flex; }
    }
  </style>
</head>
<body>
  <div class="watermark" aria-hidden="true">RASCUNHO</div>
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
        <th style="width:3.5%">ITEM</th>
        <th style="width:6%">PA</th>
        <th style="width:6.5%">ETIQUETA</th>
        <th style="width:12%">PRODUTO</th>
        <th style="width:11%">SKU</th>
        <th style="width:16%">FONTE DE LUZ</th>
        <th style="width:20%">EQUIPAMENTOS</th>
        <th style="width:3.5%">QTD</th>
        <th style="width:8%">COR DA PEÇA</th>
        <th style="width:13.5%">OBSERVAÇÕES</th>
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

  <!-- Rodapé fixo em todas as páginas (visível apenas na impressão/PDF) -->
  <div class="page-footer">
    <span>Ficha Técnica de Produção &mdash; ${esc(pedidoDisplay)}</span>
    <span>Emitido em: ${toBrasiliaDateTime(Date.now())} (Horário de Brasília) &nbsp;|&nbsp; ${esc(form.quoteNumber)}</span>
  </div>

  ${(() => {
    const allItemsForReq = items.filter((i: CartItemData) => i.category !== 'Não Orçamos');
    const matEntries = buildMaterialRequisition(allItemsForReq, descMap);
    if (matEntries.length === 0) return '';
    const byTipo = groupByTipo(matEntries);
    const TIPO_ORDER_LOCAL: MaterialTipo[] = [
      'PERFIS', 'FITAS LED', 'MÓDULOS LED', 'DRIVERS', 'FONTES DE TENSÃO',
      'LENTES', 'REFLETORES', 'DISSIPADORES', 'SUPORTES', 'ACESSÓRIOS', 'OUTROS',
    ];
    const TIPO_COLORS: Record<MaterialTipo, string> = {
      'PERFIS': '#d9e1f2',
      'FITAS LED': '#e2efda',
      'MÓDULOS LED': '#d6ead0',
      'DRIVERS': '#dce6f1',
      'FONTES DE TENSÃO': '#fff2cc',
      'LENTES': '#fce4d6',
      'REFLETORES': '#ededed',
      'DISSIPADORES': '#f2f2f2',
      'SUPORTES': '#f2f2f2',
      'ACESSÓRIOS': '#fef9e7',
      'OUTROS': '#ffffff',
    };
    let rows = '';
    for (const tipo of TIPO_ORDER_LOCAL) {
      const entries = byTipo.get(tipo);
      if (!entries || entries.length === 0) continue;
      const bg = TIPO_COLORS[tipo] ?? '#ffffff';
      for (const entry of entries) {
        rows += `<tr style="background:${bg}">
          <td style="text-align:left;font-size:9px">${esc(entry.tipo)}</td>
          <td style="text-align:center;font-weight:bold;font-size:9px;font-family:monospace">${esc(entry.codigo)}</td>
          <td style="text-align:left;font-size:9px">${esc(entry.descricao)}</td>
          <td style="text-align:center;font-size:9px">${esc(entry.unidade.toUpperCase())}</td>
          <td style="text-align:center;font-weight:bold;font-size:10px">${esc(String(entry.qty))}</td>
        </tr>`;
      }
    }
    return `
  <div style="page-break-before:always;margin-top:20px">
    <h1 style="background:#1f3864;color:#fff;text-align:center;font-size:15px;padding:8px 0;letter-spacing:1px;margin-bottom:6px">REQUISIÇÃO DE MATERIAIS</h1>
    <div style="background:#d9e1f2;padding:5px 8px;font-size:10px;margin-bottom:6px;border:1px solid #8ea9c1">
      Pedido: ${esc(form.orderNumber || form.quoteNumber)} &mdash; ${esc(form.clientName)}${form.projectName ? ' / ' + esc(form.projectName) : ''}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:9px">
      <thead>
        <tr>
          <th style="background:#1f3864;color:#fff;padding:5px 3px;border:1.5px solid #8ea9c1;text-align:center;width:120px">TIPO</th>
          <th style="background:#1f3864;color:#fff;padding:5px 3px;border:1.5px solid #8ea9c1;text-align:center;width:80px">CÓDIGO</th>
          <th style="background:#1f3864;color:#fff;padding:5px 3px;border:1.5px solid #8ea9c1;text-align:center">DESCRIÇÃO</th>
          <th style="background:#1f3864;color:#fff;padding:5px 3px;border:1.5px solid #8ea9c1;text-align:center;width:30px">UN</th>
          <th style="background:#1f3864;color:#fff;padding:5px 3px;border:1.5px solid #8ea9c1;text-align:center;width:50px">QTD</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
  })()}
</body>
</html>`;
}
