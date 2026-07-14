/**
 * ExcelPreviewModal — pré-visualização HTML do orçamento Excel
 * Renderiza os mesmos dados que o gerador Excel, mas como tabela HTML online.
 * Não cria revisão, não gera download.
 * Exibe marca d'água "RASCUNHO" em diagonal para deixar claro que não é versão oficial.
 * Usa createPortal para garantir tela cheia real sem interferência do Dialog do shadcn.
 */
import { Fragment, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, FileDown } from "lucide-react";
import type { CartItemData, QuoteFormData } from "@/lib/cartTypes";
import { formatBRL } from "@/lib/cartTypes";
import { getStateInfo } from "@/lib/difalTable";

// ── Helpers (mesmos do gerador Excel) ────────────────────────────────────────

/**
 * Retorna a URL da imagem passando pelo proxy server-side para URLs externas.
 * Isso garante que imagens CloudFront (Painéis, Spots, etc.) sejam carregadas
 * mesmo com restrições de CORS ou URLs assinadas.
 */
function getProxiedPhotoSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  // URLs internas (manus-storage) não precisam de proxy
  if (url.startsWith("/manus-storage/") || url.startsWith("/api/image-proxy")) return url;
  // URLs externas (CloudFront, alfalux, etc.) → passar pelo proxy
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function extractPower(description: string): string {
  const m = description.match(/(\d+(?:[,.]\d+)?\s*W(?:\/m)?)/i);
  return m ? m[1].replace(/\s+/g, "") : "-";
}
function extractLength(description: string): string {
  const m = description.match(/(\d{3,})\s*mm/i);
  return m ? m[1] : "-";
}
function extractVoltage(description: string): string {
  if (/bivolt/i.test(description)) return "BIVOLT";
  const m = description.match(/(\d{2,3}[Vv])/);
  return m ? m[1].toUpperCase() : "-";
}
function extractDim(description: string): string {
  if (/dim\s*triac\s*220/i.test(description)) return "DIM TRIAC 220V";
  if (/dim\s*triac\s*110/i.test(description)) return "DIM TRIAC 110V";
  if (/dim\s*triac/i.test(description)) return "DIM TRIAC";
  if (/dim\s*dali/i.test(description)) return "DIM DALI";
  if (/dim\s*0[-\u2013]?10/i.test(description)) return "DIM 0-10V";
  if (/dim\s*1[-\u2013]?10/i.test(description)) return "DIM 1-10V";
  if (/dim/i.test(description)) return "DIM";
  return "ON/OFF";
}
function buildFreteText(formData: QuoteFormData, totalBase: number): string {
  const { freteType, freteIsento, freteLocalidade, freteCity, freteState } = formData;
  // Montar sufixo de localidade quando cidade/estado estiver preenchido
  const localSuffix = freteCity && freteState
    ? ` — ${freteCity}/${freteState}`
    : freteState && freteState !== "SP"
      ? ` — ${freteState}`
      : "";
  if (freteIsento) return "Frete isento (conforme negociação)";
  if (freteType === "free") {
    const valorCotado = formData.freteValue && formData.freteValue > 0
      ? ` (R$ ${formData.freteValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cotado)`
      : "";
    return `CIF - Para faturamento acima de R$ 1.500,00 São Paulo/ SP (Capital). Demais localidades sob consulta${valorCotado}`;
  }
  if (freteType === "night") {
    const val = formData.freteValue && formData.freteValue > 0
      ? formData.freteValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "2.000,00";
    return `Frete noturno — R$ ${val}${localSuffix}`;
  }
  if (freteType === "paid") {
    const valorCotado = formData.freteValue && formData.freteValue > 0
      ? ` (R$ ${formData.freteValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cotado)`
      : "";
    // SP capital sem sufixo de localidade: comportamento original
    if (freteLocalidade === "sp" && !localSuffix) {
      return totalBase >= 1500
        ? `CIF - Para faturamento acima de R$ 1.500,00 São Paulo/ SP (Capital). Demais localidades sob consulta${valorCotado}`
        : `Frete a cobrar — São Paulo/SP Capital (faturamento abaixo de R$ 1.500,00)${valorCotado}`;
    }
    return `Frete A Calcular${localSuffix}${valorCotado}`;
  }
  if (freteType === "consult") {
    const valorCotado = formData.freteValue && formData.freteValue > 0
      ? ` — R$ ${formData.freteValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cotado`
      : "";
    return `Frete sob consulta${localSuffix}${valorCotado}`;
  }
  return "CIF - Para faturamento acima de R$ 1.500,00 São Paulo/ SP (Capital). Demais localidades sob consulta";
}

/**
 * Extrai informações de drivers de itens legados (sem driverLines mas com profileSegments).
 */
function getLegacyDriverInfoPreview(item: CartItemData): Array<{ driverCode: string; driverModel: string; totalQty: number }> | null {
  if (item.driverLines && item.driverLines.length > 0) return null;
  if (!item.profileSegments || item.profileSegments.length === 0) return null;
  const hasAnyDriver = item.profileSegments.some(seg => seg.driverCode);
  if (!hasAnyDriver) return null;
  const itemQty = item.qty ?? 1; // quantidade de lumárias (ex: 12)
  const map = new Map<string, { driverCode: string; driverModel: string; qtyPerLuminaria: number }>();
  for (const seg of item.profileSegments) {
    if (!seg.driverCode) continue;
    const key = seg.driverCode;
    // qtyPerSeg = drivers por lumária (não multiplicar por itemQty aqui)
    const qtyPerSeg = (seg.driverQtyPerPiece ?? 1) * (seg.qty ?? 1);
    if (map.has(key)) {
      map.get(key)!.qtyPerLuminaria += qtyPerSeg;
    } else {
      map.set(key, { driverCode: seg.driverCode, driverModel: seg.driverModel ?? seg.driverCode, qtyPerLuminaria: qtyPerSeg });
    }
  }
  if (map.size === 0) return null;
  // totalQty = drivers por lumária × quantidade de lumárias
  return Array.from(map.values()).map(e => ({
    driverCode: e.driverCode,
    driverModel: e.driverModel,
    totalQty: e.qtyPerLuminaria * itemQty,
  }));
}

const CONDITIONS = [
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

const LOGO_URL = "/manus-storage/alfalux-logo-excel_8e8ca9f4.png";

interface Props {
  open: boolean;
  onClose: () => void;
  items: CartItemData[];
  formData: QuoteFormData;
  /** Mapa sku -> fotoUrl fresca para substituir URLs CloudFront expiradas */
  freshPhotoMap?: Map<string, string>;
}

export function ExcelPreviewModal({ open, onClose, items, formData, freshPhotoMap }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Gera nome do arquivo no mesmo padrão do Excel + sufixo "rascunho"
  const buildFileName = useCallback(() => {
    const revCount = formData.revisionCount ?? 0;
    const rvSuffix = `(RV${revCount})`;
    const numPart = formData.numero ? `${formData.numero} ${rvSuffix}` : rvSuffix;
    const obraPart = formData.obra ? ` - ${formData.obra.toUpperCase()}` : "";
    const clientePart = formData.cliente ? ` - ${formData.cliente.toUpperCase()}` : "";
    return `${numPart}${obraPart}${clientePart} rascunho`
      .replace(/[\\/:*?"<>|]/g, "-")
      .substring(0, 200);
  }, [formData]);

  // Abre nova janela com o HTML do conteúdo e aciona print
  const handleDownloadPDF = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const fileName = buildFileName();
    const htmlContent = el.innerHTML;
    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) { alert("Permita popups para baixar o PDF."); return; }
    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${fileName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: Calibri, Arial, sans-serif;
      background: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    /* Remover fundo cinza do wrapper de scroll */
    [data-print-content] {
      background: #fff !important;
      padding: 0 !important;
      overflow: visible !important;
    }
    /* Ocultar marca d'agua no PDF */
    [aria-hidden="true"] {
      display: none !important;
    }
    /* Container relativo da página */
    [data-print-content] > div {
      position: static !important;
    }
    /* Página branca: zoom para caber em A4 paisagem sem quebrar layout */
    [data-print-content] > div > div {
      zoom: 0.88;
      width: 1100px !important;
      min-width: 1100px !important;
      margin: 0 !important;
      box-shadow: none !important;
    }
    @media print {
      html, body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        background: #fff !important;
      }
      @page {
        size: A4 landscape;
        margin: 6mm;
      }
      /* Evitar quebra de página dentro de linhas da tabela */
      tr, td, th { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`);
    printWindow.document.close();
    // Aguardar imagens carregarem antes de imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 800);
    };
    // Fallback caso onload não dispare
    setTimeout(() => {
      try {
        if (!printWindow.closed) {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      } catch { /* janela já fechada */ }
    }, 2500);
  }, [buildFileName]);

  // Bloqueia scroll do body quando aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Fecha com ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const revCount = formData.revisionCount ?? 0;
  const rvSuffix = ` (RV${revCount})`;

  const rtPct = Math.min(Math.max(formData.rtPercent ?? 0, 0), 0.99);
  const marginPct = Math.min(Math.max(formData.marginPercent ?? 0, 0), 0.99);
  // applyMarkup global (sem margem individual) — usado para totais
  const applyMarkup = (base: number) => {
    const comRT = rtPct > 0 ? base / (1 - rtPct) : base;
    return marginPct > 0 ? comRT / (1 - marginPct) : comRT;
  };
  // applyMarkupItem — aplica margem global + margem individual do item
  const applyMarkupItem = (base: number, itemMarginPercent?: number | null) => {
    const itemMPct = itemMarginPercent != null ? Math.min(Math.max(itemMarginPercent / 100, 0), 0.99) : 0;
    const comRT = rtPct > 0 ? base / (1 - rtPct) : base;
    const comMargem = marginPct > 0 ? comRT / (1 - marginPct) : comRT;
    return itemMPct > 0 ? comMargem / (1 - itemMPct) : comMargem;
  };

  // Ordenar itens por pavimento (mesma logica do gerador Excel)
  // Garante que itens do mesmo pavimento ficam consecutivos na pre-visualizacao
  const sortedItems = useMemo(() => {
    const nk = (s: string | undefined) => (s ?? "").trim().toLowerCase();
    const floorOrder: string[] = [];
    for (const item of items) {
      const key = nk(item.floorId);
      if (!floorOrder.includes(key)) floorOrder.push(key);
    }
    return [...items].sort((a, b) => {
      const ia = floorOrder.indexOf(nk(a.floorId));
      const ib = floorOrder.indexOf(nk(b.floorId));
      return ia - ib;
    });
  }, [items]);

  // totalBase inclui luminária + drivers.
  // IMPORTANTE: Para itens com driverLines, totalPrice = luminária + driver (ambos já incluídos).
  // Usamos priceWithoutDriver (apenas luminária) + drivers separados para evitar duplicação.
  // Aplica itemMarginPercent por item (RT e margem global são aplicados globalmente depois).
  const _applyItemMgnPreview = (base: number, it: CartItemData) => {
    const p = it.itemMarginPercent != null ? Math.min(Math.max(it.itemMarginPercent / 100, 0), 0.99) : 0;
    return p > 0 ? base / (1 - p) : base;
  };
  const totalBase = useMemo(() => sortedItems.reduce((s, it) => {
    const drvT = (it.driverLines && it.driverLines.length > 0)
      ? it.driverLines.reduce((sd, d) => {
          const stored = d.driverTotalPrice;
          if (stored != null && stored > 0) return sd + stored;
          // fallback: recalcular com effectiveQty
          const iqty = it.qty ?? 1;
          const storedQty = d.driverQty ?? 1;
          const effectiveQty = storedQty <= 1 ? iqty : storedQty;
          return sd + Math.round((d.driverUnitPrice ?? 0) * effectiveQty * 100) / 100;
        }, 0)
      : 0;
    // Para itens com driverLines: usar priceWithoutDriver (luminária sem driver)
    // Para itens sem driverLines: usar totalPrice normalmente
    const lumT = (it.driverLines && it.driverLines.length > 0)
      ? (it.priceWithoutDriver != null && it.priceWithoutDriver > 0
          ? it.priceWithoutDriver
          : Math.max(0, (it.totalPrice ?? 0) - drvT))
      : (it.totalPrice ?? 0);
    return s + _applyItemMgnPreview(lumT + drvT, it);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, 0), [sortedItems]);

  // ── Diluição proporcional do frete ──────────────────────────────────────
  // Quando freteIncluded=true, distribui freteValue proporcionalmente ao
  // totalPrice de cada item (peso = totalPrice_i / totalBase).
  // Itens sem preço (totalPrice=0 ou null) não recebem frete diluído.
  const freteParaDiluir = (formData.freteIncluded && formData.freteValue && formData.freteValue > 0)
    ? formData.freteValue
    : 0;

  // Diluição de valores pendentes (campo interno — não aparece no orçamento ao cliente)
  const diluicaoParaDiluir = (formData.diluicaoValor && formData.diluicaoValor > 0)
    ? formData.diluicaoValor
    : 0;

  /**
   * Retorna o total real de um item (luminária + drivers) para uso como peso de diluição.
   */
  const getItemTotalReal = (it: CartItemData): number => {
    const drvT = (it.driverLines && it.driverLines.length > 0)
      ? it.driverLines.reduce((sd, d) => {
          const stored = d.driverTotalPrice;
          if (stored != null && stored > 0) return sd + stored;
          const iqty = it.qty ?? 1;
          const storedQty = d.driverQty ?? 1;
          const effectiveQty = storedQty <= 1 ? iqty : storedQty;
          return sd + Math.round((d.driverUnitPrice ?? 0) * effectiveQty * 100) / 100;
        }, 0)
      : 0;
    const lumT = (it.driverLines && it.driverLines.length > 0)
      ? (it.priceWithoutDriver != null && it.priceWithoutDriver > 0
          ? it.priceWithoutDriver
          : Math.max(0, (it.totalPrice ?? 0) - drvT))
      : (it.totalPrice ?? 0);
    return lumT + drvT;
  };

  /**
   * Retorna o frete diluído para um item específico (em R$, sobre o totalPrice).
   * Distribui proporcionalmente ao valor total de cada linha.
   */
  const getFreteItem = (item: { totalPrice: number | null }): number => {
    if (freteParaDiluir <= 0 || totalBase <= 0) return 0;
    const peso = (item.totalPrice ?? 0) / totalBase;
    return freteParaDiluir * peso;
  };

  /**
   * Preço unitário ajustado com frete diluído (antes do markup).
   */
  const unitPriceComFrete = (item: { unitPrice: number | null; totalPrice: number | null; qty: number }): number | null => {
    if (item.unitPrice === null || item.unitPrice === undefined) return null;
    if (freteParaDiluir <= 0) return item.unitPrice;
    const freteItem = getFreteItem(item);
    return item.unitPrice + freteItem / Math.max(item.qty, 1);
  };

  /**
   * Preço total ajustado com frete diluído (antes do markup).
   */
  const totalPriceComFrete = (item: { totalPrice: number | null }): number | null => {
    if (item.totalPrice === null || item.totalPrice === undefined) return null;
    if (freteParaDiluir <= 0) return item.totalPrice;
    return item.totalPrice + getFreteItem(item);
  };

  const totalComRT = rtPct > 0 ? (totalBase + freteParaDiluir + diluicaoParaDiluir) / (1 - rtPct) : (totalBase + freteParaDiluir + diluicaoParaDiluir);
  const totalFinal = marginPct > 0 ? totalComRT / (1 - marginPct) : totalComRT;
  // DIFAL/FCP: alíquota combinada, frete na base (fórmula por dentro)
  const _freteParaImpostoPreview = formData.freteIncluded ? 0 : (formData.freteValue && formData.freteValue > 0 && !formData.freteIsento ? formData.freteValue : 0);
  const baseParaImpostoPreview = totalFinal + _freteParaImpostoPreview;
  const stateInfoPreview = formData.destState ? getStateInfo(formData.destState) : undefined;
  const combinedRatePreview = stateInfoPreview ? stateInfoPreview.combined : 0;
  // DIFAL só se aplica em vendas interestaduais: destState deve existir na tabela (não SP) e ter combined > 0
  const difalAplicavel = !!stateInfoPreview && combinedRatePreview > 0;
  const totalComDifal = formData.difalEnabled && difalAplicavel
    ? baseParaImpostoPreview / (1 - combinedRatePreview / 100)
    : baseParaImpostoPreview;
  const combinedAmtPreview = totalComDifal - baseParaImpostoPreview;
  const difalAmt = stateInfoPreview && stateInfoPreview.combined > 0 ? combinedAmtPreview * (stateInfoPreview.difal / stateInfoPreview.combined) : 0;
  const fcpAmt   = stateInfoPreview && stateInfoPreview.combined > 0 ? combinedAmtPreview * (stateInfoPreview.fcp   / stateInfoPreview.combined) : 0;

  // Totais com/sem driver (apenas para orçamentos novos com driverLines)
  const hasDriverBreakdown = sortedItems.some(it => it.driverLines && it.driverLines.length > 0);
  const applyMarkupFn = (base: number) => {
    const comRT  = rtPct    > 0 ? base   / (1 - rtPct)    : base;
    return marginPct > 0 ? comRT  / (1 - marginPct) : comRT;
  };
  const totalDriverRaw = hasDriverBreakdown
    ? sortedItems.reduce((sum, it) => {
        const iqty = it.qty ?? 1;
        const drvBruto = it.driverLines?.reduce((s, d) => {
          const stored = d.driverTotalPrice;
          if (stored != null && stored > 0) return s + stored;
          const storedQty = d.driverQty ?? 1;
          const effectiveQty = storedQty <= 1 ? iqty : storedQty;
          return s + Math.round((d.driverUnitPrice ?? 0) * effectiveQty * 100) / 100;
        }, 0) ?? 0;
        return sum + _applyItemMgnPreview(drvBruto, it);
      }, 0)
    : 0;
  const totalSemDriverRaw = hasDriverBreakdown ? (totalBase - totalDriverRaw) : 0;
  // Distribuir diluíção proporcionalmente entre lum e driver
  const _totalBaseForRatio = totalDriverRaw + totalSemDriverRaw;
  const _drvDilFrac = _totalBaseForRatio > 0 ? diluicaoParaDiluir * (totalDriverRaw / _totalBaseForRatio) : 0;
  const _lumDilFrac = diluicaoParaDiluir - _drvDilFrac;
  const totalDriverFinal = applyMarkupFn(totalDriverRaw + _drvDilFrac);
  const totalSemDriverFinal = applyMarkupFn(totalSemDriverRaw + _lumDilFrac);

  const vendedorText = [formData.seller1Name, formData.seller2Name].filter(Boolean).join(" / ") || "";
  const contactText = [formData.contato, formData.tel].filter(Boolean).join(" — ");

  // Cores do template
  const BLUE = "#5B9BD5";
  const DARK_BLUE = "#1F3864";
  const WHITE = "#FFFFFF";
  const RED = "#FF0000";
  const TOTAL_BG = "#E2EFF8";

  const thStyle: React.CSSProperties = {
    background: BLUE, color: WHITE, fontWeight: "bold", fontSize: 11,
    textAlign: "center", verticalAlign: "middle", padding: "4px 6px",
    border: "2px solid #444", whiteSpace: "pre-line", lineHeight: 1.3,
  };
  const tdStyle: React.CSSProperties = {
    fontSize: 10, textAlign: "center", verticalAlign: "middle",
    padding: "4px 6px", border: "1px solid #aaa", whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  if (!open) return null;

  const content = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        background: "#1a1a1a",
      }}
      aria-modal="true"
      role="dialog"
      data-print-modal
    >
      {/* ── Barra de topo fixa ── */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#111",
          color: "#fff",
          padding: "10px 20px",
          borderBottom: "1px solid #333",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: "bold", fontSize: 15, color: "#fff" }}>
            Pré-visualização do Orçamento
          </span>
          <span
            style={{
              background: "#fef3c7",
              color: "#92400e",
              fontWeight: "bold",
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 4,
              border: "1px solid #d97706",
            }}
          >
            RASCUNHO — não é versão oficial
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: "#aaa" }}>
            Esta visualização é apenas para conferência. Nenhuma revisão foi criada.
          </span>
          <button
            onClick={handleDownloadPDF}
            style={{
              background: "#1e40af",
              border: "1px solid #3b82f6",
              borderRadius: 6,
              color: "#fff",
              cursor: "pointer",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              fontWeight: "bold",
            }}
          >
            <FileDown size={16} /> Baixar PDF
          </button>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #555",
              borderRadius: 6,
              color: "#fff",
              cursor: "pointer",
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
            }}
          >
            <X size={16} /> Fechar
          </button>
        </div>
      </div>

      {/* ── Área de scroll (horizontal + vertical) ── */}
      <div
        ref={contentRef}
        data-print-content
        style={{
          flex: 1,
          overflow: "auto",
          background: "#525659",
          padding: "32px 24px",
        }}
      >
        {/* Marca d'água diagonal — posicionada no centro da página A4 */}
        <div style={{ position: "relative" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-35deg)",
              fontSize: 130,
              fontWeight: 900,
              color: "rgba(220,0,0,0.06)",
              pointerEvents: "none",
              userSelect: "none",
              whiteSpace: "nowrap",
              zIndex: 5,
              letterSpacing: 14,
            }}
          >
            RASCUNHO
          </div>

          {/* Página branca — largura fixa de 1100px para simular A4 paisagem */}
          <div
            style={{
              fontFamily: "Calibri, Arial, sans-serif",
              width: 1100,
              minWidth: 1100,
              margin: "0 auto",
              padding: "32px 40px 48px",
              background: "#fff",
              boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* ── Cabeçalho: endereço + logo ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div style={{ fontSize: 11 }}>
                <div style={{ fontWeight: "bold" }}>(11) 5666.9272 / 5666.4856</div>
                <div style={{ fontWeight: "bold" }}>Rua Agostino Togneri, n° 617 - Jurubatuba - São Paulo/ SP</div>
              </div>
              <img
                src={LOGO_URL}
                alt="ALFALUX"
                style={{ height: 70, objectFit: "contain" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>

            {/* ── Número, data e campos ── */}
            <div style={{ display: "flex", gap: 12, marginBottom: 6, marginTop: 8 }}>
              <div style={{ background: BLUE, color: WHITE, fontWeight: "bold", fontSize: 15, padding: "4px 14px", borderRadius: 2 }}>
                {(formData.numero || "") + rvSuffix}
              </div>
              <div style={{ background: BLUE, color: WHITE, fontWeight: "bold", fontSize: 15, padding: "4px 14px", borderRadius: 2 }}>
                {formData.data || new Date().toLocaleDateString("pt-BR")}
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 6, fontSize: 12 }}>
              <tbody>
                {[
                  ["VENDEDOR", vendedorText],
                  ["OBRA", formData.obra || ""],
                  ["CLIENTE", formData.cliente || ""],
                  ["CONTATO/TEL", contactText],
                  ["E-MAIL", formData.email || ""],
                  ["ARQUITETURA/LD", [formData.arquiteto ? `ARQUITETO: ${formData.arquiteto}` : "", formData.lightDesigner ? `LD: ${formData.lightDesigner}` : ""].filter(Boolean).join("   |   ")],
                  ["REFERÊNCIA", formData.referencia || "FORNECIMENTO DE LUMINÁRIAS"],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ fontWeight: "bold", paddingRight: 8, whiteSpace: "nowrap", width: 160, paddingTop: 1, paddingBottom: 1 }}>{label}:</td>
                    <td style={{ paddingTop: 1, paddingBottom: 1 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Proposta comercial ── */}
            <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 11, padding: "5px 0", borderTop: "1px solid #ccc", borderBottom: "1px solid #ccc", marginBottom: 6 }}>
              PROPOSTA COMERCIAL PARA FORNECIMENTO DOS PRODUTOS ABAIXO ESPECIFICADOS, COM VALIDADE DE 3 (TRÊS) DIAS.
            </div>

            {/* ── Título da obra ── */}
            <div style={{ background: DARK_BLUE, color: WHITE, fontWeight: "bold", fontSize: 18, textAlign: "center", padding: "8px 0", marginBottom: 0 }}>
              OBRA {(formData.obra || formData.cliente || "ORÇAMENTO").toUpperCase()}
            </div>

            {/* ── Tabela de produtos ── */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  {["ITEM EM\nPLANTA", "FOTO", "MODELO ALFALUX", "COMPRIMENTO\n(mm)", "POTÊNCIA\n(W)", "DIM", "TENSÃO\n(V)", "COR", "TEMPERATURA\nDE COR (K)", "QTD", "PREÇO\nUNITÁRIO", "PREÇO\nTOTAL"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item, idx) => {
                  const isService = item.category === "Serviços";
                  const nonRabichoAcc = item.accessories?.filter(a => !a.familia?.toLowerCase().includes("rabicho")) ?? [];
                  const rabichoAcc = item.accessories?.find(a => a.familia?.toLowerCase().includes("rabicho"));

                  return (
                    <Fragment key={`row-group-${idx}`}>
                      {/* Cabeçalho de pavimento */}
                      {item.floorId && (
                        idx === 0 ||
                        (sortedItems[idx - 1]?.floorId ?? "").trim().toLowerCase() !== (item.floorId ?? "").trim().toLowerCase()
                      ) && (
                        <tr>
                          <td colSpan={12} style={{ background: "#1A3A5C", color: WHITE, fontWeight: "bold", fontSize: 12, padding: "4px 8px", border: "2px solid #444" }}>
                            {item.floorName || item.floorId}
                          </td>
                        </tr>
                      )}

                      {isService ? (
                        <tr style={{ background: "#F5F5F5" }}>
                          <td style={tdStyle}>{item.itemEmPlanta || ""}</td>
                          <td style={tdStyle}></td>{/* FOTO vazia */}
                          <td colSpan={7} style={{ ...tdStyle, textAlign: "left", fontStyle: "italic" }}>{item.description || item.sku || "Serviço"}</td>
                          <td style={tdStyle}>{item.qty}</td>
                          <td style={tdStyle}>{item.unitPrice && item.unitPrice > 0 ? formatBRL(applyMarkupItem(unitPriceComFrete(item) ?? item.unitPrice, item.itemMarginPercent)) : "-"}</td>
                          <td style={tdStyle}>{item.totalPrice && item.totalPrice > 0 ? formatBRL(applyMarkupItem(totalPriceComFrete(item) ?? item.totalPrice, item.itemMarginPercent)) : "-"}</td>
                        </tr>
                      ) : item.driverLines && item.driverLines.length > 0 ? (
                        <tr>
                          <td style={{ ...tdStyle, fontWeight: "bold", fontSize: 18 }}>{item.itemEmPlanta || ""}</td>
                          <td style={{ ...tdStyle, width: 80, minHeight: 80 }}>
                            {getProxiedPhotoSrc(freshPhotoMap?.get(item.sku ?? "") ?? item.photoUrl) ? (
                              <img src={getProxiedPhotoSrc(freshPhotoMap?.get(item.sku ?? "") ?? item.photoUrl)!} alt={item.description} style={{ width: 64, height: 64, objectFit: "contain" }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <span style={{ color: "#aaa", fontSize: 10 }}>—</span>
                            )}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "left" }}>
                            {item.sku && <div style={{ fontFamily: "monospace", fontSize: 10, color: "#666" }}>{item.sku}</div>}
                            <div>{item.description}</div>
                            {rabichoAcc && (
                              <div style={{ fontSize: 9, color: "#006064", fontStyle: "italic", marginTop: 4, borderTop: "1px dashed #ccc", paddingTop: 2 }}>
                                ↳ Rabicho: {rabichoAcc.descricao}{rabichoAcc.dimensao ? ` ${rabichoAcc.dimensao}` : ""}
                              </div>
                            )}
                          </td>
                          <td style={tdStyle}>{item.shapeTotalLengthMm ? `${item.shapeTotalLengthMm}mm total` : extractLength(item.description)}</td>
                          <td style={tdStyle}>{item.power?.trim() || extractPower(item.description)}</td>
                          <td style={tdStyle}>{extractDim(item.description)}</td>
                          <td style={tdStyle}>{extractVoltage(item.description)}</td>
                          <td style={tdStyle}>{item.corPeca || "-"}</td>
                          <td style={tdStyle}>{item.cct || "-"}</td>
                          <td style={{ ...tdStyle, fontWeight: "bold" }}>{item.qty}</td>
                          {/* Preço da luminária (sem driver) + diluição proporcional */}
                          {(() => {
                            // Fallback para itens legados: derivar unitPriceLuminaria = (totalPrice - driversTotalPrice) / qty
                            const _drvTotalPreview = (item.driverLines ?? []).reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
                            const _derivedUnitLum = (item.unitPriceLuminaria == null && item.totalPrice != null && item.totalPrice > 0 && item.qty > 0)
                              ? (item.totalPrice - _drvTotalPreview) / item.qty
                              : null;
                            const _effectiveUnitLum = item.unitPriceLuminaria ?? _derivedUnitLum;
                            // Corrigir itens antigos onde priceWithoutDriver foi salvo como valor unitário
                            const _pwd = item.priceWithoutDriver ?? 0;
                            const _upl = _effectiveUnitLum ?? 0;
                            const _qty = item.qty ?? 1;
                            const _isUnit = _upl > 0 && Math.abs(_pwd - _upl) < 0.02 && _qty > 1;
                            const _correctedTotal = _isUnit ? _upl * _qty : (_pwd > 0 ? _pwd : Math.max(0, (item.totalPrice ?? 0) - _drvTotalPreview));
                            // Diluição proporcional: peso = total real do item / totalBase
                            const _itemTotalReal = getItemTotalReal(item);
                            const _lumPeso = _itemTotalReal > 0 ? _correctedTotal / _itemTotalReal : 1;
                            const _diluicaoFator = (diluicaoParaDiluir > 0 && totalBase > 0)
                              ? diluicaoParaDiluir * (_itemTotalReal / totalBase)
                              : 0;
                            const _lumDilUnit = _qty > 0 ? _diluicaoFator * _lumPeso / _qty : 0;
                            const _lumDilTotal = _diluicaoFator * _lumPeso;
                            return (<>
                              <td style={tdStyle}>
                                {_effectiveUnitLum && _effectiveUnitLum > 0
                                  ? formatBRL(applyMarkup(_effectiveUnitLum + _lumDilUnit))
                                  : item.luminariaHasApiPrice === false
                                    ? <span style={{ color: "#E65100", fontStyle: "italic", fontSize: 9 }}>A definir</span>
                                    : "-"}
                              </td>
                              <td style={tdStyle}>
                                {_correctedTotal > 0
                                  ? formatBRL(applyMarkup(_correctedTotal + _lumDilTotal))
                                  : item.luminariaHasApiPrice === false
                                    ? <span style={{ color: "#E65100", fontStyle: "italic", fontSize: 9 }}>A definir</span>
                                    : "-"}
                              </td>
                            </>);
                          })()}
                        </tr>
                      ) : (
                        <tr>
                          <td style={{ ...tdStyle, fontWeight: "bold", fontSize: 18 }}>{item.itemEmPlanta || ""}</td>
                          {/* Coluna FOTO — apenas a imagem do produto, sem rabicho */}
                          <td style={{ ...tdStyle, width: 80, minHeight: 80 }}>
                            {getProxiedPhotoSrc(freshPhotoMap?.get(item.sku ?? "") ?? item.photoUrl) ? (
                              <img src={getProxiedPhotoSrc(freshPhotoMap?.get(item.sku ?? "") ?? item.photoUrl)!} alt={item.description} style={{ width: 64, height: 64, objectFit: "contain" }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <span style={{ color: "#aaa", fontSize: 10 }}>—</span>
                            )}
                          </td>
                          {/* Coluna MODELO — descrição + rabicho abaixo */}
                          <td style={{ ...tdStyle, textAlign: "left" }}>
                            {item.sku && <div style={{ fontFamily: "monospace", fontSize: 10, color: "#666" }}>{item.sku}</div>}
                            <div>{item.description}</div>
                            {rabichoAcc && (
                              <div style={{ fontSize: 9, color: "#006064", fontStyle: "italic", marginTop: 4, borderTop: "1px dashed #ccc", paddingTop: 2 }}>
                                ↳ Rabicho: {rabichoAcc.descricao}{rabichoAcc.dimensao ? ` ${rabichoAcc.dimensao}` : ""}
                              </div>
                            )}
                          </td>
                          <td style={tdStyle}>{item.category === "Item Especial" && item.specialDimensions ? item.specialDimensions : item.shapeTotalLengthMm ? `${item.shapeTotalLengthMm}mm total` : extractLength(item.description)}</td>
                          <td style={tdStyle}>{item.category === "Item Especial" && item.specialPower ? item.specialPower : (item.power?.trim() || extractPower(item.description))}</td>
                          <td style={tdStyle}>{item.category === "Item Especial" && item.specialDim ? item.specialDim : extractDim(item.description)}</td>
                          <td style={tdStyle}>{item.category === "Item Especial" && item.specialVoltage ? item.specialVoltage : extractVoltage(item.description)}</td>
                          <td style={tdStyle}>{item.category === "Item Especial" ? (item.specialColor || item.corPeca || "-") : (item.corPeca || "-")}</td>
                          <td style={tdStyle}>{item.cct || "-"}</td>
                          <td style={{ ...tdStyle, fontWeight: "bold" }}>{item.qty}</td>
                          {(() => {
                            // Diluíção proporcional para itens sem driverLines
                            const _itemTotalRealSimple = getItemTotalReal(item);
                            const _diluicaoFatorSimple = (diluicaoParaDiluir > 0 && totalBase > 0)
                              ? diluicaoParaDiluir * (_itemTotalRealSimple / totalBase)
                              : 0;
                            const _qty = item.qty ?? 1;
                            const _unitWithFrete = unitPriceComFrete(item) ?? item.unitPrice ?? 0;
                            const _totalWithFrete = totalPriceComFrete(item) ?? item.totalPrice ?? 0;
                            const _unitWithDil = _unitWithFrete + (_qty > 0 ? _diluicaoFatorSimple / _qty : 0);
                            const _totalWithDil = _totalWithFrete + _diluicaoFatorSimple;
                            return (<>
                              <td style={tdStyle}>{item.unitPrice && item.unitPrice > 0 ? formatBRL(applyMarkupItem(_unitWithDil, item.itemMarginPercent)) : "-"}</td>
                              <td style={tdStyle}>{item.totalPrice && item.totalPrice > 0 ? formatBRL(applyMarkupItem(_totalWithDil, item.itemMarginPercent)) : "-"}</td>
                            </>);
                          })()}
                        </tr>
                      )}

                      {/* Sub-linhas de acessórios não-rabicho */}
                      {nonRabichoAcc.map((acc, accIdx) => (
                        <tr key={`acc-${idx}-${accIdx}`} style={{ background: "#E0F7FA" }}>
                          <td style={{ ...tdStyle, fontSize: 9 }}></td>
                          <td style={{ ...tdStyle, fontSize: 9 }}>
                            {acc.fotoUrl ? (
                              <img src={acc.fotoUrl} alt={acc.descricao} style={{ width: 36, height: 36, objectFit: "contain" }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : null}
                          </td>
                          <td style={{ ...tdStyle, fontSize: 9, color: "#006064", fontStyle: "italic", textAlign: "left" }}>
                            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#888" }}>{acc.codigo}</div>
                            <div>↳ Acessório: {acc.descricao}</div>
                          </td>
                          {["", "", "", "", "", "", ""].map((_, i) => (
                            <td key={i} style={{ ...tdStyle, fontSize: 9 }}></td>
                          ))}
                          <td style={{ ...tdStyle, fontSize: 9, fontWeight: "bold" }}>{acc.qty}</td>
                          <td style={{ ...tdStyle, fontSize: 9 }}>{acc.unitPrice && acc.unitPrice > 0 ? formatBRL(acc.unitPrice) : "-"}</td>
                          <td style={{ ...tdStyle, fontSize: 9 }}>{acc.unitPrice && acc.unitPrice > 0 ? formatBRL(acc.unitPrice * acc.qty) : "-"}</td>
                        </tr>
                      ))}
                      {/* Sub-linha de observação do item (quando itemObsShowInExcel=true) */}
                      {item.itemObs && item.itemObsShowInExcel && (
                        <tr key={`obs-${idx}`} style={{ background: "#F0FFF4" }}>
                          <td style={{ ...tdStyle, fontSize: 9 }}></td>
                          <td style={{ ...tdStyle, fontSize: 9 }}></td>
                          <td colSpan={10} style={{ ...tdStyle, fontSize: 9, color: "#166534", fontStyle: "italic", textAlign: "left", paddingLeft: 8 }}>
                            Obs.: {item.itemObs}
                          </td>
                        </tr>
                      )}
                      {/* Sub-linhas de drivers (apenas para itens novos com driverLines) */}
                      {item.driverLines && item.driverLines.map((drv, drvIdx) => {
                        // Mesma lógica do Cart.tsx: effectiveQty = storedQty <= 1 ? itemQty : storedQty
                        const _iqty = item.qty ?? 1;
                        const _storedDrvQty = drv.driverQty ?? 1;
                        const _effectiveDrvQty = _storedDrvQty <= 1 ? _iqty : _storedDrvQty;
                        // Diluição proporcional ao peso do driver neste item
                        const _itemTotalRealDrv = getItemTotalReal(item);
                        const _drvTotalPrice = (drv.driverUnitPrice ?? 0) * _effectiveDrvQty;
                        const _drvPeso = _itemTotalRealDrv > 0 ? _drvTotalPrice / _itemTotalRealDrv : 0;
                        const _diluicaoFatorDrv = (diluicaoParaDiluir > 0 && totalBase > 0)
                          ? diluicaoParaDiluir * (_itemTotalRealDrv / totalBase)
                          : 0;
                        const _drvDilUnit = _effectiveDrvQty > 0 ? _diluicaoFatorDrv * _drvPeso / _effectiveDrvQty : 0;
                        const _drvDilTotal = _diluicaoFatorDrv * _drvPeso;
                        return (
                        <tr key={`drv-${idx}-${drvIdx}`} style={{ background: "#FFF3E0" }}>
                          <td style={{ ...tdStyle, fontSize: 9 }}></td>
                          <td style={{ ...tdStyle, fontSize: 9 }}></td>
                          <td style={{ ...tdStyle, fontSize: 9, color: "#E65100", fontStyle: "italic", textAlign: "left" }}>
                            {drv.driverCode && <div style={{ fontFamily: "monospace", fontSize: 9, color: "#888" }}>{drv.driverCode}</div>}
                            <div>↳ Driver: {drv.driverModel}</div>
                          </td>
                          {["", "", "", "", "", ""].map((_, i) => (
                            <td key={i} style={{ ...tdStyle, fontSize: 9 }}></td>
                          ))}
                          <td style={{ ...tdStyle, fontSize: 9, fontWeight: "bold", color: "#E65100" }}>{_effectiveDrvQty}</td>
                          <td style={{ ...tdStyle, fontSize: 9, color: "#E65100" }}>
                            {drv.driverUnitPrice && drv.driverUnitPrice > 0 ? formatBRL(applyMarkupFn(drv.driverUnitPrice + _drvDilUnit)) : "-"}
                          </td>
                          <td style={{ ...tdStyle, fontSize: 9, color: "#E65100" }}>
                            {drv.driverUnitPrice && drv.driverUnitPrice > 0 ? formatBRL(applyMarkupFn(_drvTotalPrice + _drvDilTotal)) : "-"}
                          </td>
                        </tr>
                        );
                      })}
                      {/* Sub-linhas de drivers legados (itens antigos sem driverLines mas com profileSegments) */}
                      {(() => {
                        const legacyDrvs = getLegacyDriverInfoPreview(item);
                        if (!legacyDrvs) return null;
                        return legacyDrvs.map((ldrv, ldIdx) => (
                          <tr key={`ldrv-${idx}-${ldIdx}`} style={{ background: "#FFF3E0" }}>
                            <td style={{ ...tdStyle, fontSize: 9 }}></td>
                            <td style={{ ...tdStyle, fontSize: 9 }}></td>
                            <td style={{ ...tdStyle, fontSize: 9, color: "#E65100", fontStyle: "italic", textAlign: "left" }}>
                              <div style={{ fontFamily: "monospace", fontSize: 9, color: "#888" }}>{ldrv.driverCode}</div>
                              <div>↳ Driver: {ldrv.driverModel} — incluído no preço</div>
                            </td>
                            {["", "", "", "", "", ""].map((_, i) => (
                              <td key={i} style={{ ...tdStyle, fontSize: 9 }}></td>
                            ))}
                            <td style={{ ...tdStyle, fontSize: 9, fontWeight: "bold", color: "#E65100" }}>{ldrv.totalQty}</td>
                            <td style={{ ...tdStyle, fontSize: 9, color: "#E65100", fontStyle: "italic" }}>incl.</td>
                            <td style={{ ...tdStyle, fontSize: 9, color: "#E65100", fontStyle: "italic" }}>incl.</td>
                          </tr>
                        ));
                      })()}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* ── Rodapé ── */}
            <div style={{ marginTop: 16, fontFamily: "Calibri, Arial, sans-serif", fontSize: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: "bold", width: 320, paddingRight: 8, paddingTop: 4, paddingBottom: 4 }}>Prazo de fabricação e entrega:</td>
                    <td style={{ color: RED, fontWeight: "bold" }}>{formData.deliveryDays ?? 20} dias úteis</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold", paddingTop: 8 }}>
                      {freteParaDiluir > 0
                        ? (formData.difalEnabled && difalAplicavel ? "Subtotal dos produtos (frete incl., sem DIFAL/FCP):" : "Valor total dos produtos (frete já incluído):")
                        : (formData.difalEnabled && difalAplicavel ? "Subtotal dos produtos (sem frete, sem DIFAL/FCP):" : "Valor total dos produtos (sem o frete):")}
                    </td>
                    <td>
                      <span style={{ background: TOTAL_BG, fontWeight: "bold", fontSize: 14, padding: "4px 12px", border: "2px solid #444", display: "inline-block" }}>
                        {formatBRL(totalFinal)}
                      </span>
                    </td>
                  </tr>
                  {difalAmt > 0 && (
                    <tr>
                      <td style={{ color: "#CC0000", fontWeight: "bold" }}>DIFAL ({(formData.difalPercent ?? 0).toFixed(1)}%) — {formData.destState ?? ""}:</td>
                      <td style={{ color: "#CC0000", fontWeight: "bold" }}>{formatBRL(difalAmt)}</td>
                    </tr>
                  )}
                  {fcpAmt > 0 && (
                    <tr>
                      <td style={{ color: "#CC0000", fontWeight: "bold" }}>FCP ({(formData.fcpPercent ?? 0).toFixed(1)}%) — {formData.destState ?? ""}:</td>
                      <td style={{ color: "#CC0000", fontWeight: "bold" }}>{formatBRL(fcpAmt)}</td>
                    </tr>
                  )}
                  {formData.difalEnabled && difalAplicavel && (
                    <tr>
                      <td style={{ fontWeight: "bold" }}>{freteParaDiluir > 0 ? "TOTAL GERAL (com DIFAL/FCP, frete incl.):" : "TOTAL GERAL (com DIFAL/FCP, sem frete):"}</td>
                      <td>
                        <span style={{ background: "#FCE4D6", fontWeight: "bold", fontSize: 14, padding: "4px 12px", border: "2px solid #444", display: "inline-block" }}>
                          {formatBRL(totalComDifal)}
                        </span>
                      </td>
                    </tr>
                  )}
                  {/* Totais com/sem driver — apenas para orçamentos novos */}
                  {hasDriverBreakdown && totalDriverRaw > 0 && (
                    <>
                      <tr>
                        <td style={{ fontWeight: "bold", color: "#E65100", paddingTop: 8 }}>Total sem driver:</td>
                        <td>
                          <span style={{ background: "#FFF3E0", fontWeight: "bold", fontSize: 13, padding: "3px 10px", border: "1px solid #FFCC80", display: "inline-block", color: "#E65100" }}>
                            {formatBRL(totalSemDriverFinal)}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold", color: "#E65100" }}>Total drivers:</td>
                        <td>
                          <span style={{ background: "#FFF3E0", fontWeight: "bold", fontSize: 13, padding: "3px 10px", border: "1px solid #FFCC80", display: "inline-block", color: "#E65100" }}>
                            {formatBRL(totalDriverFinal)}
                          </span>
                        </td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td style={{ fontWeight: "bold", paddingTop: 8 }}>Condição de pagto:</td>
                    <td>{formData.paymentTerm ?? "30% Sinal e 70% a 28DDF (mediante a aprovação de cadastro)"}</td>
                  </tr>
                  {/* Linha de frete: oculta quando o frete já está diluído nos preços */}
                  {freteParaDiluir <= 0 && (
                    <>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>Frete dedicado:</td>
                        <td style={{ color: formData.freteType === "night" ? RED : undefined, fontWeight: formData.freteType === "night" ? "bold" : undefined }}>
                          {buildFreteText(formData, totalFinal)}
                        </td>
                      </tr>
                      {formData.freteValue && formData.freteValue > 0 && !formData.freteIsento && (
                        <>
                          <tr>
                            <td style={{ fontWeight: "bold" }}>Valor do frete:</td>
                            <td style={{ fontWeight: "bold", color: "#CC0000" }}>
                              {formatBRL(formData.freteValue)}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: "bold" }}>TOTAL GERAL (produtos + frete):</td>
                            <td>
                              <span style={{ background: "#D9EAD3", fontWeight: "bold", fontSize: 14, padding: "4px 12px", border: "2px solid #444", display: "inline-block" }}>
                                {formatBRL((formData.difalEnabled && difalAplicavel ? totalComDifal : totalFinal) + formData.freteValue)}
                              </span>
                            </td>
                          </tr>
                        </>
                      )}
                    </>
                  )}
                  {/* Frete diluído: informação interna — não exibir para o cliente */}
                </tbody>
              </table>

              {/* Observação */}
              <div style={{ marginTop: 10, fontSize: 12 }}>
                <span style={{ fontWeight: "bold" }}>Observação:</span>{" "}
                <span>Pode ser acrescido</span>
              </div>

              {/* Fico à disposição */}
              <div style={{ marginTop: 8, fontSize: 12 }}>Fico à disposição para quaisquer esclarecimentos,</div>

              {/* Vendedor + Logo */}
              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                {(formData.seller1Name || formData.seller2Name) && (
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: "bold" }}>{vendedorText}</div>
                    {formData.seller1Phone && <div>CONTATO: {formData.seller1Phone}</div>}
                  </div>
                )}
                <img
                  src={LOGO_URL}
                  alt="ALFALUX"
                  style={{ height: 56, objectFit: "contain" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              {/* Condições gerais */}
              <div style={{ marginTop: 20, fontWeight: "bold", color: RED, fontSize: 16, textAlign: "center" }}>
                CONDIÇÕES GERAIS DE FORNECIMENTO
              </div>
              <ol style={{ marginTop: 12, paddingLeft: 0, listStyle: "none" }}>
                {CONDITIONS.map((c) => (
                  <li key={c.num} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 10, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: "bold", whiteSpace: "nowrap", minWidth: 22 }}>{c.num}</span>
                    <span>{c.text}</span>
                  </li>
                ))}
              </ol>

              {/* Estou ciente */}
              <div style={{ marginTop: 24, fontWeight: "bold", fontSize: 16, color: RED, textAlign: "center" }}>
                Estou ciente das informações contidas neste documento.
              </div>

              {/* Data e assinatura + logo */}
              <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div style={{ display: "flex", gap: 48 }}>
                  <div style={{ fontWeight: "bold", fontSize: 14 }}>Data:  ____/___/_____</div>
                  <div style={{ fontWeight: "bold", fontSize: 14 }}>De acordo: _____________________________________</div>
                </div>
                <img
                  src={LOGO_URL}
                  alt="ALFALUX"
                  style={{ height: 56, objectFit: "contain" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              {/* Rodapé azul */}
              <div style={{ background: BLUE, color: WHITE, textAlign: "center", padding: "6px 0", marginTop: 24, fontSize: 10 }}>
                R. Agostino Togneri, nº 617 - Jurubatuba - São Paulo/SP  - CEP: 04690-090
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
