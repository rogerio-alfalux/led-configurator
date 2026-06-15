/**
 * ExcelPreviewModal — pré-visualização HTML do orçamento Excel
 * Renderiza os mesmos dados que o gerador Excel, mas como tabela HTML online.
 * Não cria revisão, não gera download.
 * Exibe marca d'água "RASCUNHO" em diagonal para deixar claro que não é versão oficial.
 */
import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CartItemData, QuoteFormData } from "@/lib/cartTypes";
import { formatBRL } from "@/lib/cartTypes";

// ── Helpers (mesmos do gerador Excel) ────────────────────────────────────────
function extractPower(description: string): string {
  const m = description.match(/(\d+(?:[,.]\d+)?\s*W(?:\/m)?)/i);
  return m ? m[1].replace(/\s+/g, "") : "-";
}
function extractLength(description: string): string {
  const m = description.match(/(\d{3,5})\s*mm/i);
  return m ? m[1] : "-";
}
function extractVoltage(description: string): string {
  if (/bivolt/i.test(description)) return "BIVOLT";
  const m = description.match(/(\d{2,3}[Vv])/);
  return m ? m[1].toUpperCase() : "-";
}
function extractDim(description: string): string {
  if (/dali/i.test(description)) return "DALI";
  if (/dim\s*110/i.test(description)) return "DIM 110V";
  if (/dim/i.test(description)) return "DIM";
  return "ON/OFF";
}
function buildFreteText(formData: QuoteFormData, totalBase: number): string {
  const { freteType, freteIsento, freteLocalidade } = formData;
  if (freteIsento) return "Frete isento (conforme negociação)";
  if (freteType === "free") return "CIF - Para faturamento acima de R$ 1.500,00 São Paulo/ SP (Capital). Demais localidades sob consulta";
  if (freteType === "night") return "Frete noturno — R$ 2.000,00";
  if (freteType === "paid") {
    if (freteLocalidade === "sp") {
      return totalBase >= 1500
        ? "CIF - Para faturamento acima de R$ 1.500,00 São Paulo/ SP (Capital). Demais localidades sob consulta"
        : "Frete a cobrar — São Paulo/SP Capital (faturamento abaixo de R$ 1.500,00)";
    }
    return "Frete sob consulta — localidade fora de São Paulo/SP Capital";
  }
  if (freteType === "consult") return "Frete sob consulta";
  return "CIF - Para faturamento acima de R$ 1.500,00 São Paulo/ SP (Capital). Demais localidades sob consulta";
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: CartItemData[];
  formData: QuoteFormData;
}

export function ExcelPreviewModal({ open, onClose, items, formData }: Props) {
  const revCount = formData.revisionCount ?? 0;
  const rvSuffix = ` (RV${revCount})`;

  const rtPct = Math.min(Math.max(formData.rtPercent ?? 0, 0), 0.99);
  const marginPct = Math.min(Math.max(formData.marginPercent ?? 0, 0), 0.99);
  const applyMarkup = (base: number) => {
    const comRT = rtPct > 0 ? base / (1 - rtPct) : base;
    return marginPct > 0 ? comRT / (1 - marginPct) : comRT;
  };

  const totalBase = useMemo(() => items.reduce((s, it) => s + (it.totalPrice ?? 0), 0), [items]);
  const totalComRT = rtPct > 0 ? totalBase / (1 - rtPct) : totalBase;
  const totalFinal = marginPct > 0 ? totalComRT / (1 - marginPct) : totalComRT;
  const difalAmt = (formData.difalEnabled && formData.difalValue && formData.difalValue > 0) ? formData.difalValue : 0;
  const fcpAmt = (formData.fcpEnabled && formData.fcpValue && formData.fcpValue > 0) ? formData.fcpValue : 0;
  const totalComDifal = totalFinal + difalAmt + fcpAmt;

  const vendedorText = [formData.seller1Name, formData.seller2Name].filter(Boolean).join(" / ") || "";
  const contactText = [formData.contato, formData.tel].filter(Boolean).join(" — ");

  // Estilos inline para fidelidade ao template
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[98vw] w-full max-h-[96vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-4 pb-2 border-b sticky top-0 bg-background z-10">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span>Pré-visualização do Orçamento</span>
            <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
              RASCUNHO — não é versão oficial
            </span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Esta visualização é apenas para conferência. Nenhuma revisão foi criada. Para gerar o Excel oficial, use "Salvar Orçamento" ou "Baixar Orçamento Excel".
          </p>
        </DialogHeader>

        {/* Área de conteúdo com marca d'água */}
        <div className="relative px-4 pb-8 pt-4" style={{ minWidth: 900 }}>
          {/* Marca d'água diagonal */}
          <div
            aria-hidden
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-35deg)",
              fontSize: 96,
              fontWeight: 900,
              color: "rgba(255,0,0,0.08)",
              pointerEvents: "none",
              userSelect: "none",
              whiteSpace: "nowrap",
              zIndex: 5,
              letterSpacing: 8,
            }}
          >
            RASCUNHO
          </div>

          {/* Cabeçalho */}
          <div style={{ fontFamily: "Calibri, Arial, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
            {/* Logo + info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <img
                  src="/manus-storage/alfalux-logo-excel_8e8ca9f4.png"
                  alt="ALFALUX"
                  style={{ height: 60, objectFit: "contain" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div style={{ textAlign: "center", flex: 1, paddingTop: 4 }}>
                <div style={{ fontWeight: "bold", fontSize: 13 }}>(11) 5666.9272 / 5666.4856</div>
                <div style={{ fontWeight: "bold", fontSize: 12 }}>Rua Agostino Togneri, n° 617 - Jurubatuba - São Paulo/ SP</div>
              </div>
            </div>

            {/* Número e data */}
            <div style={{ display: "flex", gap: 16, marginBottom: 4 }}>
              <div style={{ background: BLUE, color: WHITE, fontWeight: "bold", fontSize: 16, padding: "4px 16px", borderRadius: 2 }}>
                {(formData.numero || "") + rvSuffix}
              </div>
              <div style={{ background: BLUE, color: WHITE, fontWeight: "bold", fontSize: 16, padding: "4px 16px", borderRadius: 2 }}>
                {formData.data || new Date().toLocaleDateString("pt-BR")}
              </div>
            </div>

            {/* Campos do cabeçalho */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4, fontSize: 12 }}>
              <tbody>
                {[
                  ["VENDEDOR", vendedorText],
                  ["OBRA", formData.obra || ""],
                  ["CLIENTE", formData.cliente || ""],
                  ["CONTATO/TEL", contactText],
                  ["E-MAIL", formData.email || ""],
                  ["ARQUITETURA/LD", ""],
                  ["REFERÊNCIA", formData.referencia || "FORNECIMENTO DE LUMINÁRIAS"],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ fontWeight: "bold", paddingRight: 8, whiteSpace: "nowrap", width: 160 }}>{label}:</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Proposta comercial */}
            <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 12, padding: "6px 0", borderTop: "1px solid #ccc", borderBottom: "1px solid #ccc", marginBottom: 8 }}>
              PROPOSTA COMERCIAL PARA FORNECIMENTO DOS PRODUTOS ABAIXO ESPECIFICADOS, COM VALIDADE DE 3 (TRÊS) DIAS.
            </div>

            {/* Título da obra */}
            <div style={{ background: DARK_BLUE, color: WHITE, fontWeight: "bold", fontSize: 18, textAlign: "center", padding: "8px 0", marginBottom: 0 }}>
              OBRA {(formData.obra || formData.cliente || "ORÇAMENTO").toUpperCase()}
            </div>

            {/* Tabela de produtos */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    {["ITEM EM\nPLANTA", "FOTO", "MODELO ALFALUX", "COMPRIMENTO\n(mm)", "POTÊNCIA\n(W)", "DIM", "TENSÃO\n(V)", "COR", "TEMPERATURA\nDE COR (K)", "QTD", "PREÇO\nUNITÁRIO", "PREÇO\nTOTAL"].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const isService = item.category === "Serviços";
                    const nonRabichoAcc = item.accessories?.filter(a => !a.familia?.toLowerCase().includes("rabicho")) ?? [];
                    const rabichoAcc = item.accessories?.find(a => a.familia?.toLowerCase().includes("rabicho"));

                    return (
                      <>
                        {/* Cabeçalho de pavimento */}
                        {item.floorId && (idx === 0 || items[idx - 1]?.floorId !== item.floorId) && (
                          <tr key={`floor-${item.floorId}`}>
                            <td colSpan={12} style={{ background: "#1A3A5C", color: WHITE, fontWeight: "bold", fontSize: 12, padding: "4px 8px", border: "2px solid #444" }}>
                              {item.floorName ? `${item.floorId} — ${item.floorName}` : item.floorId}
                            </td>
                          </tr>
                        )}

                        {isService ? (
                          <tr key={`item-${idx}`} style={{ background: "#F5F5F5" }}>
                            <td style={tdStyle}>{item.itemEmPlanta || ""}</td>
                            <td colSpan={8} style={{ ...tdStyle, textAlign: "left", fontStyle: "italic" }}>{item.description || item.sku || "Serviço"}</td>
                            <td style={tdStyle}>{item.qty}</td>
                            <td style={tdStyle}>{item.unitPrice && item.unitPrice > 0 ? formatBRL(applyMarkup(item.unitPrice)) : "-"}</td>
                            <td style={tdStyle}>{item.totalPrice && item.totalPrice > 0 ? formatBRL(applyMarkup(item.totalPrice)) : "-"}</td>
                          </tr>
                        ) : (
                          <tr key={`item-${idx}`}>
                            <td style={{ ...tdStyle, fontWeight: "bold", fontSize: 18 }}>{item.itemEmPlanta || ""}</td>
                            <td style={{ ...tdStyle, width: 80, height: 80 }}>
                              {item.photoUrl ? (
                                <img src={item.photoUrl} alt={item.description} style={{ width: 64, height: 64, objectFit: "contain" }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              ) : (
                                <span style={{ color: "#aaa", fontSize: 10 }}>—</span>
                              )}
                              {rabichoAcc && (
                                <div style={{ fontSize: 9, color: "#006064", fontStyle: "italic", marginTop: 2 }}>
                                  ↳ Rabicho: {rabichoAcc.descricao}{rabichoAcc.dimensao ? ` ${rabichoAcc.dimensao}` : ""}
                                </div>
                              )}
                            </td>
                            <td style={{ ...tdStyle, textAlign: "left" }}>
                              {item.sku && <div style={{ fontFamily: "monospace", fontSize: 10, color: "#666" }}>{item.sku}</div>}
                              <div>{item.description}</div>
                            </td>
                            <td style={tdStyle}>{item.category === "Item Especial" && item.specialDimensions ? item.specialDimensions : extractLength(item.description)}</td>
                            <td style={tdStyle}>{item.category === "Item Especial" && item.specialPower ? item.specialPower : (item.power?.trim() || extractPower(item.description))}</td>
                            <td style={tdStyle}>{item.category === "Item Especial" && item.specialDim ? item.specialDim : extractDim(item.description)}</td>
                            <td style={tdStyle}>{item.category === "Item Especial" && item.specialVoltage ? item.specialVoltage : extractVoltage(item.description)}</td>
                            <td style={tdStyle}>{item.category === "Item Especial" ? "-" : (item.corPeca || "-")}</td>
                            <td style={tdStyle}>{item.cct || "-"}</td>
                            <td style={{ ...tdStyle, fontWeight: "bold" }}>{item.qty}</td>
                            <td style={tdStyle}>{item.unitPrice && item.unitPrice > 0 ? formatBRL(applyMarkup(item.unitPrice)) : "-"}</td>
                            <td style={tdStyle}>{item.totalPrice && item.totalPrice > 0 ? formatBRL(applyMarkup(item.totalPrice)) : "-"}</td>
                          </tr>
                        )}

                        {/* Sub-linhas de acessórios não-rabicho */}
                        {nonRabichoAcc.map((acc, accIdx) => (
                          <tr key={`acc-${idx}-${accIdx}`} style={{ background: "#E0F7FA" }}>
                            <td style={{ ...tdStyle, fontSize: 9 }}></td>
                            <td style={{ ...tdStyle, fontSize: 9, textAlign: "left" }}>
                              {acc.fotoUrl ? (
                                <img src={acc.fotoUrl} alt={acc.descricao} style={{ width: 32, height: 32, objectFit: "contain" }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              ) : null}
                              <div style={{ fontSize: 9, color: "#006064", fontStyle: "italic" }}>↳ Acessório: {acc.descricao}</div>
                            </td>
                            <td style={{ ...tdStyle, fontSize: 9, color: "#006064", fontStyle: "italic" }}>{acc.codigo}</td>
                            {["", "", "", "", "", "", ""].map((_, i) => (
                              <td key={i} style={{ ...tdStyle, fontSize: 9 }}></td>
                            ))}
                            <td style={{ ...tdStyle, fontSize: 9, fontWeight: "bold" }}>{acc.qty}</td>
                            <td style={{ ...tdStyle, fontSize: 9 }}>{acc.unitPrice && acc.unitPrice > 0 ? formatBRL(acc.unitPrice) : "-"}</td>
                            <td style={{ ...tdStyle, fontSize: 9 }}>{acc.unitPrice && acc.unitPrice > 0 ? formatBRL(acc.unitPrice * acc.qty) : "-"}</td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé */}
            <div style={{ marginTop: 16, fontFamily: "Calibri, Arial, sans-serif", fontSize: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: "bold", width: 220, paddingRight: 8 }}>Prazo de fabricação e entrega:</td>
                    <td style={{ color: RED, fontWeight: "bold" }}>{formData.deliveryDays ?? 20} dias úteis</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold", paddingTop: 8 }}>
                      {totalComDifal > totalFinal ? "Subtotal dos produtos\n(sem frete, sem DIFAL/FCP):" : "Valor total dos produtos\n(sem o frete):"}
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
                  {totalComDifal > totalFinal && (
                    <tr>
                      <td style={{ fontWeight: "bold" }}>TOTAL GERAL (com DIFAL/FCP, sem frete):</td>
                      <td>
                        <span style={{ background: "#FCE4D6", fontWeight: "bold", fontSize: 14, padding: "4px 12px", border: "2px solid #444", display: "inline-block" }}>
                          {formatBRL(totalComDifal)}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ fontWeight: "bold", paddingTop: 8 }}>Condição de pagto:</td>
                    <td>{formData.paymentTerm ?? "30% Sinal e 70% a 28DDF (mediante a aprovação de cadastro)"}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold" }}>Frete dedicado:</td>
                    <td style={{ color: formData.freteType === "night" ? RED : undefined, fontWeight: formData.freteType === "night" ? "bold" : undefined }}>
                      {buildFreteText(formData, totalFinal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: 16, fontWeight: "bold", color: RED, fontSize: 16, textAlign: "center" }}>
                CONDIÇÕES GERAIS DE FORNECIMENTO
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: "#555" }}>
                Os materiais especificados nesta proposta comercial estão de acordo com os dados fornecidos pelo cliente...
                <span style={{ fontStyle: "italic" }}> (condições completas no Excel oficial)</span>
              </div>

              <div style={{ marginTop: 24, fontWeight: "bold", fontSize: 14, color: RED, textAlign: "center" }}>
                Estou ciente das informações contidas neste documento.
              </div>

              <div style={{ marginTop: 32, display: "flex", gap: 32 }}>
                <div style={{ fontWeight: "bold", fontSize: 14 }}>Data:  ____/___/_____</div>
                <div style={{ fontWeight: "bold", fontSize: 14 }}>De acordo: _____________________________________</div>
              </div>

              {/* Rodapé azul */}
              <div style={{ background: BLUE, color: WHITE, textAlign: "center", padding: "6px 0", marginTop: 24, fontSize: 10 }}>
                R. Agostino Togneri, nº 617 - Jurubatuba - São Paulo/SP  - CEP: 04690-090
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
