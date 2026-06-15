/**
 * ExcelPreviewModal — pré-visualização HTML do orçamento Excel
 * Renderiza os mesmos dados que o gerador Excel, mas como tabela HTML online.
 * Não cria revisão, não gera download.
 * Exibe marca d'água "RASCUNHO" em diagonal para deixar claro que não é versão oficial.
 * Usa createPortal para garantir tela cheia real sem interferência do Dialog do shadcn.
 */
import { Fragment, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
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
}

export function ExcelPreviewModal({ open, onClose, items, formData }: Props) {
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
                  ["ARQUITETURA/LD", ""],
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
                {items.map((item, idx) => {
                  const isService = item.category === "Serviços";
                  const nonRabichoAcc = item.accessories?.filter(a => !a.familia?.toLowerCase().includes("rabicho")) ?? [];
                  const rabichoAcc = item.accessories?.find(a => a.familia?.toLowerCase().includes("rabicho"));

                  return (
                    <Fragment key={`row-group-${idx}`}>
                      {/* Cabeçalho de pavimento */}
                      {item.floorId && (idx === 0 || items[idx - 1]?.floorId !== item.floorId) && (
                        <tr>
                          <td colSpan={12} style={{ background: "#1A3A5C", color: WHITE, fontWeight: "bold", fontSize: 12, padding: "4px 8px", border: "2px solid #444" }}>
                            {item.floorName ? `${item.floorId} — ${item.floorName}` : item.floorId}
                          </td>
                        </tr>
                      )}

                      {isService ? (
                        <tr style={{ background: "#F5F5F5" }}>
                          <td style={tdStyle}>{item.itemEmPlanta || ""}</td>
                          <td colSpan={8} style={{ ...tdStyle, textAlign: "left", fontStyle: "italic" }}>{item.description || item.sku || "Serviço"}</td>
                          <td style={tdStyle}>{item.qty}</td>
                          <td style={tdStyle}>{item.unitPrice && item.unitPrice > 0 ? formatBRL(applyMarkup(item.unitPrice)) : "-"}</td>
                          <td style={tdStyle}>{item.totalPrice && item.totalPrice > 0 ? formatBRL(applyMarkup(item.totalPrice)) : "-"}</td>
                        </tr>
                      ) : (
                        <tr>
                          <td style={{ ...tdStyle, fontWeight: "bold", fontSize: 18 }}>{item.itemEmPlanta || ""}</td>
                          {/* Coluna FOTO — apenas a imagem do produto, sem rabicho */}
                          <td style={{ ...tdStyle, width: 80, minHeight: 80 }}>
                            {item.photoUrl ? (
                              <img src={item.photoUrl} alt={item.description} style={{ width: 64, height: 64, objectFit: "contain" }}
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
                      {totalComDifal > totalFinal ? "Subtotal dos produtos (sem frete, sem DIFAL/FCP):" : "Valor total dos produtos (sem o frete):"}
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

              {/* Vendedor */}
              {(formData.seller1Name || formData.seller2Name) && (
                <div style={{ marginTop: 12, fontSize: 12 }}>
                  <div style={{ fontWeight: "bold" }}>{vendedorText}</div>
                  {formData.seller1Phone && <div>CONTATO: {formData.seller1Phone}</div>}
                </div>
              )}

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
