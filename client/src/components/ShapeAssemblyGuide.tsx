import { useState } from "react";
import { Map, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ShapeAssemblyModule, ShapeResult } from "@/lib/lCatalog";
import {
  ASSEMBLY_TYPE_LABELS,
  getShapeAssemblyDirection,
} from "@/lib/shapeAssemblyGuideData";
import { createShapeAssemblyPrintHref } from "@/lib/shapeAssemblyPrintRoute";

const typeClass: Record<ShapeAssemblyModule["type"], string> = {
  CORNER: "border-violet-400/70 bg-violet-500/10 text-violet-800 dark:text-violet-200",
  IF: "border-sky-400/70 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  ML: "border-emerald-400/70 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
};

function ShapeTopology({ shape }: { shape: ShapeResult["shape"] }) {
  if (shape === "L_SHAPE") {
    return <svg viewBox="0 0 420 190" className="h-48 w-full max-w-md" role="img" aria-label="Esquema do formato L">
      <path d="M72 30 V150 H352" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700 dark:text-slate-200" />
      <text x="8" y="92" className="fill-current text-[13px] font-semibold">Vertical</text>
      <text x="210" y="182" className="fill-current text-[13px] font-semibold">Horizontal</text>
    </svg>;
  }
  if (shape === "U_SHAPE") {
    return <svg viewBox="0 0 420 205" className="h-52 w-full max-w-md" role="img" aria-label="Esquema do formato U">
      <path d="M58 30 V164 H362 V30" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700 dark:text-slate-200" />
      <text x="2" y="98" className="fill-current text-[12px] font-semibold">Esquerda</text>
      <text x="188" y="197" className="fill-current text-[13px] font-semibold">Base</text>
      <text x="342" y="98" className="fill-current text-[12px] font-semibold">Direita</text>
    </svg>;
  }
  return <svg viewBox="0 0 440 220" className="h-56 w-full max-w-lg" role="img" aria-label={`Esquema do formato ${shape === "SQUARE" ? "quadrado" : "retangular"}`}>
    <rect x="90" y="36" width="260" height={shape === "SQUARE" ? 145 : 112} rx="5" fill="none" stroke="currentColor" strokeWidth="14" className="text-slate-700 dark:text-slate-200" />
    <text x="192" y="22" className="fill-current text-[13px] font-semibold">Superior</text>
    <text x="192" y={shape === "SQUARE" ? 202 : 170} className="fill-current text-[13px] font-semibold">Inferior</text>
    <text x="4" y="108" className="fill-current text-[12px] font-semibold">Esquerda</text>
    <text x="354" y="108" className="fill-current text-[12px] font-semibold">Direita</text>
  </svg>;
}

type ShapeAssemblyGuideResult = Pick<ShapeResult, "shape" | "assemblyEdges" | "profileName" | "profileCode">;

export function ShapeAssemblyGuide({ result }: { result: ShapeAssemblyGuideResult }) {
  const [open, setOpen] = useState(false);
  const edges = result.assemblyEdges ?? [];

  if (edges.length === 0) return null;

  const printHref = createShapeAssemblyPrintHref(result);

  return <>
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-8 gap-1.5 text-xs"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setOpen(true);
      }}
    >
      <Map className="h-3.5 w-3.5" />
      Guia de Montagem
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="h-[94vh] w-[min(96vw,1120px)] max-w-[1120px] overflow-x-hidden overflow-y-auto p-0 sm:rounded-xl">
        <DialogHeader className="border-b bg-background px-5 py-3 shadow-sm sm:px-6 sm:py-4">
          <div className="pr-8">
            <div>
              <DialogTitle className="text-lg">Guia de montagem — {result.profileName ?? result.profileCode}</DialogTitle>
              <p className="mt-1 text-xs text-muted-foreground">Sequência física por aresta, pronta para consulta e impressão.</p>
            </div>
          </div>
        </DialogHeader>
        <div className="border-b bg-muted/20 px-5 py-3 sm:px-6">
          <a
            href={printHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir guia de montagem para impressão"
            data-testid="assembly-print-link"
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Printer className="h-4 w-4" /> Imprimir guia em nova aba
          </a>
        </div>
        <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-4 sm:px-6 sm:py-5">
          <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
            <div className="mx-auto max-w-xl text-center text-slate-800 dark:text-slate-100">
              <ShapeTopology shape={result.shape} />
            </div>
            <p className="mx-auto mt-2 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground">
              {getShapeAssemblyDirection(result.shape === "STRAIGHT" ? "L_SHAPE" : result.shape)}
              {result.shape === "SQUARE" || result.shape === "RECTANGLE" ? " Nos formatos fechados, cada canto 1L1 é compartilhado pelas duas arestas vizinhas; a quantidade comercial consolidada permanece no resumo." : ""}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
              {(Object.keys(ASSEMBLY_TYPE_LABELS) as ShapeAssemblyModule["type"][]).map(type => <span key={type} className={`rounded-md border px-3 py-1.5 font-semibold ${typeClass[type]}`}>{ASSEMBLY_TYPE_LABELS[type]}</span>)}
            </div>
          </section>

          <div className="space-y-4">
            {edges.map((edge, edgeIndex) => <section key={edge.id} className="rounded-xl border border-border bg-card shadow-sm">
              <div className="flex flex-col gap-1 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-base font-bold text-foreground">{edgeIndex + 1}. {edge.label}</p>
                <p className="text-sm text-muted-foreground">Meta <strong>{edge.requestedLength} mm</strong> · Atingido <strong>{edge.achievedLength} mm</strong></p>
              </div>
              <ol className="grid grid-cols-2 list-none gap-3 p-4">
                {edge.modules.map((module, moduleIndex) => <li key={`${edge.id}-${moduleIndex}-${module.sku}`} className={`min-w-0 rounded-lg border p-3 ${typeClass[module.type]}`}>
                  <p className="text-xs font-bold uppercase tracking-wide opacity-75">{moduleIndex + 1}. {ASSEMBLY_TYPE_LABELS[module.type]}</p>
                  <p className="mt-1 break-all font-mono text-sm font-bold">{module.sku}</p>
                  <p className="mt-2 text-sm">{module.length} mm · {Number.isInteger(module.bars) ? module.bars : module.bars.toFixed(1)} barra{module.bars === 1 ? "" : "s"}</p>
                </li>)}
              </ol>
            </section>)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
