import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export const CORES_PECA = [
  "Branco Fosco Micro",
  "Preto Fosco Micro",
  "Cinza Fosco Liso",
  "Cinza Alumínio",
  "Cinza Asfalto",
  "Grafite",
  "Marrom Cortén",
  "Amarelo",
  "Vermelho",
  "Aço Cortén",
  "Branco Fosco Liso",
] as const;

export type CorPeca = typeof CORES_PECA[number] | "A Definir";

interface ColorPickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (cor: CorPeca) => void;
  isAdding?: boolean;
  productName?: string;
}

// Mapeamento visual de cores para CSS
const COR_VISUAL: Record<string, string> = {
  "Branco Fosco Micro": "#f5f5f5",
  "Preto Fosco Micro": "#1a1a1a",
  "Cinza Fosco Liso": "#9e9e9e",
  "Cinza Alumínio": "#c0c0c0",
  "Cinza Asfalto": "#6b6b6b",
  "Grafite": "#3d3d3d",
  "Marrom Cortén": "#8b5e3c",
  "Amarelo": "#f5c518",
  "Vermelho": "#d32f2f",
  "Aço Cortén": "#a0522d",
  "Branco Fosco Liso": "#eeeeee",
  "A Definir": "transparent",
};

export default function ColorPickerModal({
  open,
  onClose,
  onConfirm,
  isAdding = false,
  productName,
}: ColorPickerModalProps) {
  const [selected, setSelected] = useState<CorPeca | null>(null);

  const handleConfirm = () => {
    onConfirm(selected ?? "A Definir");
    setSelected(null);
  };

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-500" />
            Cor da Peça
            {productName && (
              <span className="text-xs font-normal text-muted-foreground ml-1">— {productName}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Selecione a cor desejada ou deixe em branco para definir depois.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {CORES_PECA.map((cor) => (
              <button
                key={cor}
                type="button"
                onClick={() => setSelected(selected === cor ? null : cor)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm text-left transition-all",
                  selected === cor
                    ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium"
                    : "border-border hover:border-blue-400 hover:bg-muted/60"
                )}
              >
                <span
                  className="w-5 h-5 rounded-full border border-border flex-shrink-0"
                  style={{
                    background: COR_VISUAL[cor] ?? "#ccc",
                    boxShadow: selected === cor ? "0 0 0 2px #3b82f6" : undefined,
                  }}
                />
                <span className="truncate">{cor}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSelected(selected === "A Definir" ? null : "A Definir")}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm w-full transition-all",
                selected === "A Definir"
                  ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium"
                  : "border-dashed border-border hover:border-amber-400 hover:bg-muted/60 text-muted-foreground"
              )}
            >
              <span className="w-5 h-5 rounded-full border-2 border-dashed border-current flex-shrink-0" />
              <span>A Definir (deixar em branco)</span>
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            onClick={handleConfirm}
            disabled={isAdding}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {selected ? `Enviar com ${selected}` : "Enviar sem cor (A Definir)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
