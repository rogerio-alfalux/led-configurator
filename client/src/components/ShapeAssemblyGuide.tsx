import { useState } from "react";
import { Map, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ShapeAssemblyModule, ShapeResult } from "@/lib/lCatalog";
import {
  ASSEMBLY_TYPE_LABELS,
  buildShapeAssemblyGuideHtml,
  getShapeAssemblyDirection,
  SHAPE_LABELS,
} from "@/lib/shapeAssemblyGuideData";

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

export function buildShapeAssemblyPrintDocument(result: ShapeAssemblyGuideResult): string {
  const item = {
    profileShape: result.shape === "STRAIGHT" ? undefined : result.shape,
    shapeAssemblyEdges: result.assemblyEdges,
    description: result.profileName,
    sku: result.profileCode,
    itemEmPlanta: "Guia de montagem",
  };
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Guia de montagem</title><style>
    *{box-sizing:border-box} @page{size:A4 portrait;margin:6mm} body{font-family:Arial,Helvetica,sans-serif;color:#172033;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    /* Impressão compacta: cada guia especial ocupa uma única folha A4. */
    .assembly-sheet{page-break-after:always;break-inside:avoid}.assembly-sheet:last-child{page-break-after:auto}.assembly-header{background:#1f3864;color:#fff;padding:8px 11px;border-radius:5px 5px 0 0}.assembly-header p{font-size:8px;font-weight:700;letter-spacing:.6px;margin:0 0 2px}.assembly-header h2{font-size:14px;margin:0}.assembly-product{font-size:9px;margin-top:3px;opacity:.95}
    .assembly-layout{border:1px solid #8ea9c1;border-top:0;padding:7px}.assembly-topology{display:grid;grid-template-columns:180px minmax(0,1fr);align-items:center;border-bottom:1px solid #d4dbe5;padding:0 3px 6px;text-align:center}.assembly-topology svg{width:180px;height:96px;color:#1f3864}.assembly-topology p{font-size:8px;line-height:1.25;text-align:left;margin:0 0 0 8px}.assembly-legend{display:flex;justify-content:flex-start;gap:4px;flex-wrap:wrap;margin:4px 0 0 8px}.assembly-legend span{border:1px solid #8ea9c1;border-radius:8px;padding:2px 5px;font-size:7px;font-weight:700}.assembly-edges{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding-top:6px}.assembly-edge{border:1px solid #b9c5d4;border-radius:4px;margin:0;break-inside:avoid}.assembly-edge-title{display:flex;justify-content:space-between;gap:4px;background:#edf2f7;padding:4px 5px;font-size:8px}.assembly-edge-title strong{font-size:9px}.assembly-edge-title span{color:#506176;white-space:nowrap}.assembly-modules{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px;list-style:none;padding:4px;margin:0}.assembly-module{border:1px solid #cbd5e1;border-radius:3px;padding:4px;display:grid;gap:1px;font-size:7px;line-height:1.15;min-width:0}.assembly-position{font-weight:800;color:#1f3864}.assembly-type{font-size:6px;font-weight:700;text-transform:uppercase}.assembly-module strong{font-size:7px;overflow-wrap:anywhere}.assembly-corner{border-color:#b796e8;background:#faf7ff}.assembly-if{border-color:#7dd3fc;background:#f0f9ff}.assembly-ml{border-color:#6ee7b7;background:#f0fdf4}.assembly-note{border:1px solid #8ea9c1;border-top:0;padding:5px 7px;font-size:7px;line-height:1.2;color:#506176;border-radius:0 0 5px 5px}
  </style></head><body>${buildShapeAssemblyGuideHtml([item as never])}</body></html>`;
}

export function ShapeAssemblyGuide({ result }: { result: ShapeAssemblyGuideResult }) {
  const [open, setOpen] = useState(false);
  const edges = result.assemblyEdges ?? [];
  if (edges.length === 0) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=960,height=900");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(buildShapeAssemblyPrintDocument(result));
    printWindow.document.close();
    printWindow.addEventListener("load", () => printWindow.print(), { once: true });
  };

  return <>
    <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setOpen(true)}>
      <Map className="h-3.5 w-3.5" />
      Guia de Montagem
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="h-[94vh] w-[min(96vw,1120px)] max-w-[1120px] overflow-y-auto p-0 sm:rounded-xl">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background px-6 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="text-lg">Guia de montagem — {result.profileName ?? result.profileCode}</DialogTitle>
              <p className="mt-1 text-xs text-muted-foreground">Sequência física por aresta, pronta para consulta e impressão.</p>
            </div>
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" /> Imprimir guia
            </Button>
          </div>
        </DialogHeader>
        <div className="mx-auto w-full max-w-5xl space-y-6 px-5 py-6 sm:px-8">
          <section className="rounded-xl border border-border bg-muted/20 p-5 sm:p-7">
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
              <div className="flex flex-col gap-1 border-b bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-base font-bold text-foreground">{edgeIndex + 1}. {edge.label}</p>
                <p className="text-sm text-muted-foreground">Meta <strong>{edge.requestedLength} mm</strong> · Atingido <strong>{edge.achievedLength} mm</strong></p>
              </div>
              <ol className="grid list-none gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {edge.modules.map((module, moduleIndex) => <li key={`${edge.id}-${moduleIndex}-${module.sku}`} className={`rounded-lg border p-4 ${typeClass[module.type]}`}>
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
