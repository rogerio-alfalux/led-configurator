import { useEffect, useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface QuoteExportOptionsDialogProps {
  open: boolean;
  format: "PDF" | "Excel";
  onOpenChange: (open: boolean) => void;
  onConfirm: (showIpi: boolean) => void | Promise<void>;
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

  useEffect(() => {
    if (open) setShowIpi(false);
  }, [open]);

  const Icon = format === "PDF" ? FileDown : FileSpreadsheet;

  return (
    <Dialog open={open} onOpenChange={(next) => !isGenerating && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar orçamento em {format}</DialogTitle>
          <DialogDescription>
            Escolha se esta versão deve destacar o IPI. Por padrão, o documento mantém o layout atual sem a coluna adicional.
          </DialogDescription>
        </DialogHeader>

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
              O Preço Unitário será exibido sem 9,75% e a coluna C/ IPI manterá o preço original. O Preço Total não será alterado.
            </span>
          </span>
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(showIpi)} disabled={isGenerating} className="gap-2">
            <Icon className="h-4 w-4" />
            {isGenerating ? "Gerando..." : `Gerar ${format}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
