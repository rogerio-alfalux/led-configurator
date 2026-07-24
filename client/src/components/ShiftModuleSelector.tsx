/**
 * ShiftModuleSelector.tsx
 *
 * Modal visual para seleção obrigatória de módulos S01 (SHIFT).
 * O usuário escolhe tipo de módulo, CCT e quantidade.
 * Limite total de módulos = comprimento do perfil / 300mm.
 */
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Check, Package } from "lucide-react";

export interface ShiftModuleOption {
  sku: string;
  name: string;
  fotoUrl?: string;
  wattage?: number;
  dimensions?: string;
  availableCCTs: string[];
  driverCode?: string;
  driverModel?: string;
}

export interface ShiftModuleSelection {
  sku: string;
  name: string;
  cct: string;
  quantity: number;
  fotoUrl?: string;
  wattage?: number;
  dimensions?: string;
  driverCode?: string;
  driverModel?: string;
}

interface ShiftModuleSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: ShiftModuleOption[];
  maxModules: number;
  currentSelections: ShiftModuleSelection[];
  onConfirm: (selections: ShiftModuleSelection[]) => void;
}

export function ShiftModuleSelector({
  open,
  onOpenChange,
  modules,
  maxModules,
  currentSelections,
  onConfirm,
}: ShiftModuleSelectorProps) {
  // Local state for editing
  const [selections, setSelections] = useState<ShiftModuleSelection[]>(currentSelections);

  // Reset selections when modal opens
  const handleOpenChange = (o: boolean) => {
    if (o) {
      setSelections(currentSelections.length > 0 ? [...currentSelections] : []);
    }
    onOpenChange(o);
  };

  const totalSelected = useMemo(() => selections.reduce((sum, s) => sum + s.quantity, 0), [selections]);
  const remaining = maxModules - totalSelected;

  const addModule = (mod: ShiftModuleOption, cct: string) => {
    if (remaining <= 0) return;
    const existing = selections.find((s) => s.sku === mod.sku && s.cct === cct);
    if (existing) {
      setSelections(selections.map((s) =>
        s.sku === mod.sku && s.cct === cct ? { ...s, quantity: s.quantity + 1 } : s
      ));
    } else {
      setSelections([...selections, {
        sku: mod.sku,
        name: mod.name,
        cct,
        quantity: 1,
        fotoUrl: mod.fotoUrl,
        wattage: mod.wattage,
        dimensions: mod.dimensions,
        driverCode: mod.driverCode,
        driverModel: mod.driverModel,
      }]);
    }
  };

  const removeModule = (sku: string, cct: string) => {
    const existing = selections.find((s) => s.sku === sku && s.cct === cct);
    if (!existing) return;
    if (existing.quantity <= 1) {
      setSelections(selections.filter((s) => !(s.sku === sku && s.cct === cct)));
    } else {
      setSelections(selections.map((s) =>
        s.sku === sku && s.cct === cct ? { ...s, quantity: s.quantity - 1 } : s
      ));
    }
  };

  const getQuantity = (sku: string, cct: string) => {
    return selections.find((s) => s.sku === sku && s.cct === cct)?.quantity ?? 0;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Selecionar Módulos SHIFT
          </DialogTitle>
          <DialogDescription>
            Escolha os módulos que irão compor o perfil SHIFT. Cada módulo ocupa aproximadamente 300mm.
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium text-foreground">
              {totalSelected} de {maxModules} módulos selecionados
            </span>
            <span className={`text-xs font-medium ${remaining === 0 ? "text-amber-600" : "text-muted-foreground"}`}>
              {remaining > 0 ? `${remaining} restante${remaining > 1 ? "s" : ""}` : "Limite atingido"}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.min((totalSelected / maxModules) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((mod) => (
            <div
              key={mod.sku + mod.name}
              className="border border-border rounded-lg p-3 bg-card hover:border-primary/30 transition-colors"
            >
              {/* Module header with image */}
              <div className="flex gap-3 mb-3">
                {mod.fotoUrl && (
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={mod.fotoUrl}
                      alt={mod.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                    {mod.name.replace(/^SHIFT\s+MÓDULO\s*/i, "")}
                  </p>
                  {mod.wattage && (
                    <p className="text-xs text-muted-foreground mt-0.5">{mod.wattage}W</p>
                  )}
                  {mod.dimensions && (
                    <p className="text-[10px] text-muted-foreground">{mod.dimensions}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{mod.sku}</p>
                </div>
              </div>

              {/* CCT options with quantity controls */}
              <div className="space-y-2">
                {mod.availableCCTs.map((cct) => {
                  const qty = getQuantity(mod.sku, cct);
                  return (
                    <div
                      key={cct}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border transition-all ${
                        qty > 0
                          ? "border-primary/50 bg-primary/5"
                          : "border-border bg-background"
                      }`}
                    >
                      <span className="text-xs font-medium text-foreground">{cct}K</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => removeModule(mod.sku, cct)}
                          disabled={qty === 0}
                          className="w-6 h-6 rounded-full flex items-center justify-center border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className={`w-6 text-center text-sm font-semibold ${qty > 0 ? "text-primary" : "text-muted-foreground"}`}>
                          {qty}
                        </span>
                        <button
                          onClick={() => addModule(mod, cct)}
                          disabled={remaining <= 0}
                          className="w-6 h-6 rounded-full flex items-center justify-center border border-primary/50 text-primary hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Summary of selections */}
        {selections.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs font-semibold text-foreground mb-2">Resumo da seleção:</p>
            <div className="flex flex-wrap gap-1.5">
              {selections.map((s) => (
                <Badge key={`${s.sku}-${s.cct}`} variant="secondary" className="text-xs">
                  {s.name.replace(/^SHIFT\s+MÓDULO\s*/i, "")} {s.cct}K × {s.quantity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Confirm button */}
        <div className="mt-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            disabled={totalSelected === 0}
            onClick={() => {
              onConfirm(selections);
              onOpenChange(false);
            }}
          >
            <Check className="w-4 h-4 mr-2" />
            Confirmar ({totalSelected} módulo{totalSelected !== 1 ? "s" : ""})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
