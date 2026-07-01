/**
 * OrderPreviewModal.tsx
 * Modal de pré-visualização da ficha técnica de produção.
 * Usa createPortal para garantir tela cheia real sem interferência do Dialog do shadcn.
 * Renderiza o HTML gerado por orderPreviewGenerator em um iframe fullscreen.
 */

import { useRef, useEffect, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import { X, Printer, FileSpreadsheet } from "lucide-react";
import type { CartItemData } from "@/lib/cartTypes";
import type { OrderFormData } from "@/lib/orderExcelGenerator";
import { generateOrderPreviewHtml } from "@/lib/orderPreviewGenerator";
import { generateOrderExcel } from "@/lib/orderExcelGenerator";
import { toast } from "sonner";

interface OrderPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItemData[];
  form: OrderFormData & { prazoStr?: string };
  /** Callback chamado após geração do Excel para registrar no log de auditoria */
  onExcelGenerated?: () => void;
}

export function OrderPreviewModal({
  open,
  onOpenChange,
  items,
  form,
  onExcelGenerated,
}: OrderPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Injeta o HTML no iframe sempre que o modal abre ou os dados mudam
  useEffect(() => {
    if (!open) return;
    // Pequeno delay para garantir que o iframe está montado no DOM
    const timer = setTimeout(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const html = generateOrderPreviewHtml(items, form);
      iframe.srcdoc = html;
    }, 50);
    return () => clearTimeout(timer);
  }, [open, items, form]);

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
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const handlePrint = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) {
      toast.error("Não foi possível acessar a pré-visualização para impressão.");
      return;
    }
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, []);

  const handleGenerateExcel = useCallback(async () => {
    try {
      await generateOrderExcel(items, form);
      toast.success("Pedido de fábrica gerado!");
      onExcelGenerated?.();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao gerar pedido de fábrica.");
    }
  }, [items, form, onExcelGenerated, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <Fragment>
      {/* Overlay fullscreen */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          background: "#f3f4f6",
        }}
      >
        {/* Barra de controles */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            flexShrink: 0,
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Pré-visualização — Ficha Técnica de Produção
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Confira os dados antes de gerar o arquivo oficial. Use "Imprimir" para PDF.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handlePrint}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 6,
                border: "1px solid #d1d5db", background: "#fff",
                cursor: "pointer", fontSize: 13, fontWeight: 500,
              }}
            >
              <Printer size={15} />
              Imprimir
            </button>
            <button
              onClick={handleGenerateExcel}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 6,
                border: "none", background: "#15803d", color: "#fff",
                cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              <FileSpreadsheet size={15} />
              Gerar Excel (Oficial)
            </button>
            <button
              onClick={() => onOpenChange(false)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: 6,
                border: "1px solid #d1d5db", background: "#fff",
                cursor: "pointer",
              }}
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Iframe de pré-visualização — ocupa todo o espaço restante */}
        <div style={{ flex: 1, overflow: "hidden", padding: "12px" }}>
          <iframe
            ref={iframeRef}
            title="Pré-visualização da Ficha de Produção"
            style={{
              width: "100%",
              height: "100%",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              background: "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
            sandbox="allow-same-origin allow-scripts allow-modals allow-popups"
          />
        </div>
      </div>
    </Fragment>,
    document.body
  );
}
