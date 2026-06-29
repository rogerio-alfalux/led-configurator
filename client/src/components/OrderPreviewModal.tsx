/**
 * OrderPreviewModal.tsx
 * Modal de pré-visualização da ficha técnica de produção.
 * Renderiza o HTML gerado por orderPreviewGenerator em um iframe,
 * com botões de Imprimir e Gerar Excel (oficial).
 */

import { useRef, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileSpreadsheet, Loader2 } from "lucide-react";
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
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  // Injeta o HTML no iframe sempre que o modal abre ou os dados mudam
  useEffect(() => {
    if (!open) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const html = generateOrderPreviewHtml(items, form);

    // Usar srcdoc para injetar o HTML diretamente
    iframe.srcdoc = html;
  }, [open, items, form]);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) {
      toast.error("Não foi possível acessar a pré-visualização para impressão.");
      return;
    }
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  const handleGenerateExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      await generateOrderExcel(items, form);
      toast.success("Pedido de fábrica gerado!");
      onExcelGenerated?.();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao gerar pedido de fábrica.");
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">
              Pré-visualização — Ficha Técnica de Produção
            </DialogTitle>
            <div className="flex items-center gap-2 mr-8">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-green-700 hover:bg-green-800 text-white"
                onClick={handleGenerateExcel}
                disabled={isGeneratingExcel}
              >
                {isGeneratingExcel ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                {isGeneratingExcel ? "Gerando..." : "Gerar Excel (Oficial)"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Confira os dados abaixo antes de gerar o arquivo oficial. Use "Imprimir" para uma cópia em papel ou PDF.
          </p>
        </DialogHeader>

        {/* Iframe de pré-visualização */}
        <div className="flex-1 overflow-hidden bg-gray-100 p-3">
          <iframe
            ref={iframeRef}
            title="Pré-visualização da Ficha de Produção"
            className="w-full h-full rounded border border-border bg-white shadow-sm"
            sandbox="allow-same-origin allow-scripts allow-modals allow-popups"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
