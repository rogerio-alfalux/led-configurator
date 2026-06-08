import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CartItemData, formatBRL, LinkedAccessory, QuoteFormData } from "./cartTypes";

// ─── Cores do template Excel ────────────────────────────────────────────────
const HEADER_BG = [91, 155, 213] as [number, number, number];   // #5B9BD5
const HEADER_TEXT = [255, 255, 255] as [number, number, number];
const ROW_ALT = [222, 235, 247] as [number, number, number];    // azul claro alternado
const ROW_WHITE = [255, 255, 255] as [number, number, number];
const TOTAL_BG = [91, 155, 213] as [number, number, number];
const TOTAL_TEXT = [255, 255, 255] as [number, number, number];
const BORDER_COLOR = [189, 215, 238] as [number, number, number];
const DARK_TEXT = [31, 31, 31] as [number, number, number];
const LABEL_COLOR = [91, 155, 213] as [number, number, number];

function hex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export async function generateQuotePdf(
  items: CartItemData[],
  form: QuoteFormData
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;

  // ─── Cabeçalho azul ────────────────────────────────────────────────────────
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, pageW, 28, "F");

  // Título
  doc.setTextColor(...HEADER_TEXT);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ALFALUX ILUMINAÇÃO", margin, 11);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("PROPOSTA COMERCIAL", margin, 18);

  // Número e data no canto direito
  doc.setFontSize(9);
  doc.text(`Nº ${form.numero || "—"}`, pageW - margin, 10, { align: "right" });
  doc.text(`Data: ${form.data || new Date().toLocaleDateString("pt-BR")}`, pageW - margin, 16, { align: "right" });
  doc.text("Validade: 15 dias", pageW - margin, 22, { align: "right" });

  // ─── Dados do cliente ──────────────────────────────────────────────────────
  let y = 34;

  // Linha de separação
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);

  const leftW = contentW * 0.55;
  const rightW = contentW * 0.42;
  const rightX = margin + leftW + contentW * 0.03;

  // Bloco cliente
  doc.setFillColor(245, 249, 253);
  doc.roundedRect(margin, y, leftW, 28, 2, 2, "F");
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, leftW, 28, 2, 2, "S");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...LABEL_COLOR);
  doc.text("CLIENTE / OBRA", margin + 4, y + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK_TEXT);
  doc.setFontSize(8.5);
  const clienteLines = [
    form.cliente ? `Cliente: ${form.cliente}` : null,
    form.obra ? `Obra: ${form.obra}` : null,
    form.referencia ? `Referência: ${form.referencia}` : null,
  ].filter(Boolean) as string[];
  clienteLines.forEach((line, i) => doc.text(line, margin + 4, y + 11 + i * 5.5));

  // Bloco contato
  doc.setFillColor(245, 249, 253);
  doc.roundedRect(rightX, y, rightW, 28, 2, 2, "F");
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(rightX, y, rightW, 28, 2, 2, "S");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...LABEL_COLOR);
  doc.text("CONTATO", rightX + 4, y + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK_TEXT);
  doc.setFontSize(8.5);
  const contatoLines = [
    form.contato ? `Contato: ${form.contato}` : null,
    form.tel ? `Tel: ${form.tel}` : null,
    form.email ? `E-mail: ${form.email}` : null,
  ].filter(Boolean) as string[];
  contatoLines.forEach((line, i) => doc.text(line, rightX + 4, y + 11 + i * 5.5));

  y += 34;

  // ─── Tabela de itens ───────────────────────────────────────────────────────
  const totalGeral = items.reduce((acc, it) => acc + (it.totalPrice ?? 0), 0);

  const ACC_ROW_BG = [224, 247, 250] as [number, number, number]; // ciano claro
  const ACC_ROW_TEXT = [0, 96, 100] as [number, number, number];  // teal escuro
  const tableBody: (string | object)[][] = [];
  items.forEach((item, idx) => {
    tableBody.push([
      String(idx + 1),
      item.sku || "—",
      item.description,
      item.power || "—",
      item.cct || "—",
      String(item.qty),
      item.unitPrice != null ? formatBRL(item.unitPrice) : "—",
      item.totalPrice != null ? formatBRL(item.totalPrice) : "—",
    ]);
    // Sub-linhas de acessórios vinculados
    if (item.accessories && item.accessories.length > 0) {
      (item.accessories as LinkedAccessory[]).forEach((acc) => {
        tableBody.push([
          { content: "", styles: { fillColor: ACC_ROW_BG } },
          { content: acc.codigo ?? "", styles: { fillColor: ACC_ROW_BG, textColor: ACC_ROW_TEXT, fontStyle: "italic", fontSize: 7 } },
          { content: `↳ Acessório: ${acc.descricao}`, styles: { fillColor: ACC_ROW_BG, textColor: ACC_ROW_TEXT, fontStyle: "italic", fontSize: 7 } },
          { content: "", styles: { fillColor: ACC_ROW_BG } },
          { content: "", styles: { fillColor: ACC_ROW_BG } },
          { content: String(acc.qty), styles: { fillColor: ACC_ROW_BG, textColor: ACC_ROW_TEXT, fontStyle: "bold", fontSize: 7 } },
          { content: acc.unitPrice && acc.unitPrice > 0 ? formatBRL(acc.unitPrice) : "—", styles: { fillColor: ACC_ROW_BG, textColor: ACC_ROW_TEXT, fontStyle: "italic", fontSize: 7 } },
          { content: acc.unitPrice && acc.unitPrice > 0 ? formatBRL(acc.unitPrice * acc.qty) : "—", styles: { fillColor: ACC_ROW_BG, textColor: ACC_ROW_TEXT, fontStyle: "italic", fontSize: 7 } },
        ]);
      });
    }
  });

  // Linha de total
  tableBody.push([
    "", "", "", "", "",
    { content: "TOTAL GERAL", colSpan: 2, styles: { halign: "right", fontStyle: "bold", fillColor: TOTAL_BG, textColor: TOTAL_TEXT } } as unknown as string,
    { content: formatBRL(totalGeral), styles: { fontStyle: "bold", fillColor: TOTAL_BG, textColor: TOTAL_TEXT } } as unknown as string,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["ITEM", "CÓDIGO", "DESCRIÇÃO", "POTÊNCIA", "TEMP. COR", "QTD", "PREÇO UNIT.", "PREÇO TOTAL"]],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      lineColor: BORDER_COLOR,
      lineWidth: 0.3,
      textColor: DARK_TEXT,
      font: "helvetica",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: HEADER_TEXT,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { halign: "center", cellWidth: 26 },
      2: { halign: "left", cellWidth: "auto" },
      3: { halign: "center", cellWidth: 20 },
      4: { halign: "center", cellWidth: 20 },
      5: { halign: "center", cellWidth: 12 },
      6: { halign: "right", cellWidth: 28 },
      7: { halign: "right", cellWidth: 28 },
    },
    alternateRowStyles: { fillColor: ROW_ALT },
    bodyStyles: { fillColor: ROW_WHITE },
    didParseCell: (data) => {
      // Linha de total: fundo azul
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fillColor = TOTAL_BG;
        data.cell.styles.textColor = TOTAL_TEXT;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ─── Rodapé ────────────────────────────────────────────────────────────────
  const footerY = Math.max(finalY + 6, pageH - 28);

  doc.setFillColor(...HEADER_BG);
  doc.rect(0, footerY, pageW, pageH - footerY, "F");

  doc.setTextColor(...HEADER_TEXT);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("CONDIÇÕES GERAIS", margin, footerY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const conditions = [
    "• Preços sujeitos a alteração sem aviso prévio. Proposta válida por 15 dias.",
    "• Prazo de entrega a confirmar após aprovação do pedido.",
    "• Pagamento: a combinar.",
    "• Frete: a combinar.",
  ];
  conditions.forEach((c, i) => doc.text(c, margin, footerY + 10 + i * 4));

  doc.setFontSize(6.5);
  doc.text("Alfalux Iluminação  |  www.alfalux.com.br", pageW / 2, footerY + 10, { align: "center" });

  // ─── Salvar ────────────────────────────────────────────────────────────────
  const fileName = `Orcamento_${form.numero || "001"}_${(form.cliente || "cliente").replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}
