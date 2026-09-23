import React, { useEffect, useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface QuoteExportOptionsDialogProps {
  open: boolean;
  format: "PDF" | "Excel";
  onOpenChange: (open: boolean) => void;
  onConfirm: (showIpi: boolean, unifyItemValues: boolean) => void | Promise<void>;
  isGenerating?: boolean;
}

export function QuoteExportOptionsDialog({
  open,
  format,
  onOpenChange,
  onConfirm,
  isGenerating = false,
}: QuoteExportOptionsDialogProps) {
  const [showIpi, setShowIpi] = useState(false);
  const [unifyItemValues, setUnifyItemValues] = useState(false);

  useEffect(() => {
    if (open) {
      setShowIpi(false);
      setUnifyItemValues(false);
    }
  }, [open]);

  const Icon = format === "PDF" ? FileDown : FileSpreadsheet;

  return (
    <Dialog open={open} onOpenChange={(next) => !isGenerating && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar orçamento em {format}</DialogTitle>
          <DialogDescription>
            Escolha as opções desta versão. Por padrão, o documento mantém os valores separados e não destaca o IPI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label
            htmlFor={`show-ipi-${format.toLowerCase()}`}
            className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-4"
          >
            <Checkbox
              id={`show-ipi-${format.toLowerCase()}`}
              checked={showIpi}
              onCheckedChange={(checked) => setShowIpi(Boolean(checked))}
              disabled={isGenerating}
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">Mostrar coluna de IPI (9,75%)</span>
              <span className="block text-xs leading-relaxed text-muted-foreground">
                O Preço unitário sem IPI será calculado por C/ IPI (9,75%) ÷ 1,0975. A coluna C/ IPI manterá o preço original e o Preço Total não será alterado.
              </span>
            </span>
          </label>

          {format === "PDF" && (
            <label
              htmlFor="unify-pdf-item-values"
              className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-4"
            >
              <Checkbox
                id="unify-pdf-item-values"
                checked={unifyItemValues}
                onCheckedChange={(checked) => setUnifyItemValues(Boolean(checked))}
                disabled={isGenerating}
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">Unificar valores por produto</span>
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  Soma luminária, drivers e acessórios na célula de preço do produto. As sublinhas continuam no PDF, mas sem valores monetários.
                </span>
              </span>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(showIpi, format === "PDF" && unifyItemValues)} disabled={isGenerating} className="gap-2">
            <Icon className="h-4 w-4" />
            {isGenerating ? "Gerando..." : `Gerar ${format}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
