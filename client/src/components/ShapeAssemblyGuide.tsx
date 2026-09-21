import { useState } from "react";
import { Map, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ShapeAssemblyModule, ShapeResult } from "@/lib/lCatalog";

const typeLabel: Record<ShapeAssemblyModule["type"], string> = {
  CORNER: "Canto 1L1",
  IF: "Acabamento IF",
  ML: "Módulo ML",
};

const typeClass: Record<ShapeAssemblyModule["type"], string> = {
  CORNER: "border-violet-400/70 bg-violet-500/10 text-violet-800 dark:text-violet-200",
  IF: "border-sky-400/70 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  ML: "border-emerald-400/70 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
};

function ShapeTopology({ shape }: { shape: ShapeResult["shape"] }) {
  if (shape === "L_SHAPE") {
    return <svg viewBox="0 0 280 150" className="h-36 w-full" role="img" aria-label="Esquema do formato L">
      <path d="M45 25 V120 H245" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700 dark:text-slate-200" />
      <text x="8" y="76" className="fill-current text-[12px] font-semibold">Vertical</text>
      <text x="132" y="145" className="fill-current text-[12px] font-semibold">Horizontal</text>
    </svg>;
  }
  if (shape === "U_SHAPE") {
    return <svg viewBox="0 0 280 170" className="h-40 w-full" role="img" aria-label="Esquema do formato U">
      <path d="M35 25 V135 H245 V25" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700 dark:text-slate-200" />
      <text x="4" y="80" className="fill-current text-[11px] font-semibold">Esquerda</text>
      <text x="116" y="162" className="fill-current text-[12px] font-semibold">Base</text>
      <text x="221" y="80" className="fill-current text-[11px] font-semibold">Direita</text>
    </svg>;
  }
  return <svg viewBox="0 0 300 175" className="h-40 w-full" role="img" aria-label={`Esquema do formato ${shape === "SQUARE" ? "quadrado" : "retangular"}`}>
    <rect x="45" y="25" width="210" height={shape === "SQUARE" ? 125 : 100} rx="4" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-700 dark:text-slate-200" />
    <text x="124" y="17" className="fill-current text-[12px] font-semibold">Superior</text>
    <text x="126" y={shape === "SQUARE" ? 172 : 150} className="fill-current text-[12px] font-semibold">Inferior</text>
    <text x="4" y="90" className="fill-current text-[11px] font-semibold">Esquerda</text>
    <text x="254" y="90" className="fill-current text-[11px] font-semibold">Direita</text>
  </svg>;
}

type ShapeAssemblyGuideResult = Pick<ShapeResult, "shape" | "assemblyEdges" | "profileName" | "profileCode">;

export function ShapeAssemblyGuide({ result }: { result: ShapeAssemblyGuideResult }) {
  const [open, setOpen] = useState(false);
  const edges = result.assemblyEdges ?? [];
  if (edges.length === 0) return null;

  return <>
    <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setOpen(true)}>
      <Map className="h-3.5 w-3.5" />
      Guia de Montagem
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Guia de montagem — {result.profileName ?? result.profileCode}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <ShapeTopology shape={result.shape} />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              As arestas abaixo seguem os rótulos deste esquema. Nos formatos fechados, o mesmo canto 1L1 é compartilhado pelas duas arestas vizinhas; a quantidade comercial permanece a consolidada no resumo.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              {(Object.keys(typeLabel) as ShapeAssemblyModule["type"][]).map(type => <span key={type} className={`rounded-md border px-2 py-1 font-semibold ${typeClass[type]}`}>{typeLabel[type]}</span>)}
            </div>
          </div>
          <div className="space-y-4">
            {edges.map((edge, edgeIndex) => <section key={edge.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-foreground">{edgeIndex + 1}. {edge.label}</p>
                  <p className="text-xs text-muted-foreground">Meta {edge.requestedLength}mm · atingido {edge.achievedLength}mm</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{edge.modules.length} peças na sequência</span>
              </div>
              <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                {edge.modules.map((module, moduleIndex) => <div key={`${edge.id}-${moduleIndex}-${module.sku}`} className="flex shrink-0 items-center gap-2">
                  <div className={`min-w-36 rounded-lg border p-3 ${typeClass[module.type]}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">{typeLabel[module.type]}</p>
                    <p className="mt-1 font-mono text-xs font-bold">{module.sku}</p>
                    <p className="mt-1 text-[11px]">{module.length}mm · {Number.isInteger(module.bars) ? module.bars : module.bars.toFixed(1)} barras</p>
                  </div>
                  {moduleIndex < edge.modules.length - 1 && <MoveRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </div>)}
              </div>
            </section>)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
