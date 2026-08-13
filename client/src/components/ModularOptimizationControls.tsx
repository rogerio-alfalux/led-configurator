import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getModularOptimizationStatus } from "@/lib/modularOptimizationStatus";

export function ModularOptimizationControls({
  optimizeModuleCount,
  allowLongModules,
  allowFractional,
  allowMixedIF,
  onOptimizeModuleCountChange,
}: {
  optimizeModuleCount: boolean;
  allowLongModules: boolean;
  allowFractional: boolean;
  allowMixedIF: boolean;
  onOptimizeModuleCountChange: (value: boolean) => void;
}) {
  return <>
    <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Lógica ativa:</span>{" "}
      {getModularOptimizationStatus({ optimizeModuleCount, allowLongModules, allowFractional, allowMixedIF }).join(" · ")}
    </div>
    <div className="flex items-center justify-between">
      <div>
        <Label htmlFor="optimizemodulecount" className="text-sm font-medium cursor-pointer">Otimizar Quantidade de Módulos</Label>
        <p className="text-xs text-muted-foreground mt-0.5">Prioriza a menor quantidade de módulos, mesmo com medida menos próxima</p>
      </div>
      <Switch id="optimizemodulecount" checked={optimizeModuleCount} onCheckedChange={onOptimizeModuleCountChange} />
    </div>
  </>;
}
