import { useState } from "react";
import { ArrowLeft, Map, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ShapeAssemblyModule, ShapeResult } from "@/lib/lCatalog";
import {
  ASSEMBLY_TYPE_LABELS,
  buildShapeAssemblyGuideHtml,
  getShapeAssemblyDirection,
} from "@/lib/shapeAssemblyGuideData";

const typeClass: Record<ShapeAssemblyModule["type"], string> = {
  CORNER: "border-violet-400/70 bg-violet-500/10 text-violet-800 dark:text-violet-200",
  IF: "border-sky-400/70 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  ML: "border-emerald-400/70 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
};

const inlinePrintStyles = `
  .inline-assembly-print { max-width: 210mm; margin: 0 auto; color: #172033; font-family: Arial, Helvetica, sans-serif; }
  .inline-assembly-print .assembly-sheet { background:#fff; break-inside:avoid; page-break-after:always; }
  .inline-assembly-print .assembly-sheet:last-child { page-break-after:auto; }
  .inline-assembly-print .assembly-header { background:#1f3864; color:#fff; padding:10px 13px; border-radius:6px 6px 0 0; }
  .inline-assembly-print .assembly-header p { font-size:9px; font-weight:700; letter-spacing:.7px; margin:0 0 3px; }
  .inline-assembly-print .assembly-header h2 { font-size:16px; margin:0; }
  .inline-assembly-print .assembly-product { font-size:10px; margin-top:4px; }
  .inline-assembly-print .assembly-layout { border:1px solid #8ea9c1; border-top:0; padding:8px; }
  .inline-assembly-print .assembly-topology { display:grid; grid-template-columns:190px minmax(0,1fr); align-items:center; border-bottom:1px solid #d4dbe5; padding:0 3px 7px; }
  .inline-assembly-print .assembly-topology svg { width:185px; height:100px; color:#1f3864; }
  .inline-assembly-print .assembly-topology p { font-size:10px; line-height:1.3; margin:0 0 0 9px; }
  .inline-assembly-print .assembly-legend { display:flex; gap:5px; flex-wrap:wrap; margin:5px 0 0 9px; }
  .inline-assembly-print .assembly-legend span { border:1px solid #8ea9c1; border-radius:8px; padding:2px 6px; font-size:8px; font-weight:700; }
  .inline-assembly-print .assembly-edges { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; padding-top:7px; }
  .inline-assembly-print .assembly-edge { border:1px solid #b9c5d4; border-radius:4px; break-inside:avoid; }
  .inline-assembly-print .assembly-edge-title { display:flex; justify-content:space-between; gap:5px; background:#edf2f7; padding:5px 6px; font-size:9px; }
  .inline-assembly-print .assembly-edge-title strong { font-size:10px; }.inline-assembly-print .assembly-edge-title span{ color:#506176; white-space:nowrap; }
  .inline-assembly-print .assembly-modules { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px; list-style:none; padding:5px; margin:0; }
  .inline-assembly-print .assembly-module { border:1px solid #cbd5e1; border-radius:3px; padding:5px; display:grid; gap:2px; font-size:8px; line-height:1.2; min-width:0; }
  .inline-assembly-print .assembly-position { font-weight:800; color:#1f3864; }.inline-assembly-print .assembly-type { font-size:7px; font-weight:700; text-transform:uppercase; }.inline-assembly-print .assembly-module strong { font-size:8px; overflow-wrap:anywhere; }
  .inline-assembly-print .assembly-corner { border-color:#b796e8; background:#faf7ff; }.inline-assembly-print .assembly-if { border-color:#7dd3fc; background:#f0f9ff; }.inline-assembly-print .assembly-ml { border-color:#6ee7b7; background:#f0fdf4; }
  .inline-assembly-print .assembly-note { border:1px solid #8ea9c1; border-top:0; padding:6px 8px; font-size:8px; line-height:1.25; color:#506176; border-radius:0 0 6px 6px; }
  @media print {
    /* A página do configurador não faz parte do documento impresso. */
    body > #root { display:none !important; }
    body > *:not([data-inline-print-modal]) { display:none !important; }
    [data-inline-print-modal] { position:static !important; display:block !important; max-width:none !important; width:100% !important; height:auto !important; overflow:visible !important; transform:none !important; }
    [data-inline-print-modal] > *:not([data-inline-print-content]) { display:none !important; }
    [data-inline-print-content] { display:block !important; }
    .inline-print-actions { display:none !important; }
  }
`;

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
  const [printOpen, setPrintOpen] = useState(false);
  const edges = result.assemblyEdges ?? [];

  if (edges.length === 0) return null;

  const printItem = {
    profileShape: result.shape,
    shapeAssemblyEdges: result.assemblyEdges,
    description: result.profileName ?? result.profileCode,
    sku: result.profileCode,
    itemEmPlanta: "Guia de montagem",
    qty: 1,
  } as any;

  const printGuide = () => {
    const host = document.createElement("div");
    host.setAttribute("data-print-modal", "true");
    host.style.cssText = "position:fixed;inset:0;background:#fff;z-index:2147483647;overflow:visible;";
    host.innerHTML = `<style>${inlinePrintStyles}</style><div data-print-content class="inline-assembly-print">${buildShapeAssemblyGuideHtml([printItem])}</div>`;
    document.body.appendChild(host);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      window.removeEventListener("afterprint", cleanup);
      host.remove();
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(cleanup, 120000);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  };

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
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setPrintOpen(false); }}>
      <DialogContent data-inline-print-modal className="h-[94vh] w-[min(96vw,1120px)] max-w-[1120px] overflow-x-hidden overflow-y-auto p-0 sm:rounded-xl">
        {printOpen ? <>
          <style>{inlinePrintStyles}</style>
          <DialogHeader className="inline-print-actions border-b bg-background px-5 py-3 shadow-sm sm:px-6">
            <div className="flex items-center justify-between gap-3 pr-8">
              <div>
                <DialogTitle className="text-lg leading-6">Prévia de impressão</DialogTitle>
                <p className="mt-1 text-xs leading-4 text-muted-foreground">Confira o guia e imprima sem sair da configuração.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setPrintOpen(false)}>
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button type="button" size="sm" className="gap-1.5" onClick={printGuide}>
                  <Printer className="h-4 w-4" /> Imprimir guia
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div data-inline-print-content className="inline-assembly-print bg-white p-3 sm:p-5" dangerouslySetInnerHTML={{ __html: buildShapeAssemblyGuideHtml([printItem]) }} />
        </> : <>
        <DialogHeader className="border-b bg-background px-5 py-3 shadow-sm sm:px-6 sm:py-4">
          <div className="pr-8">
            <div>
              <DialogTitle className="text-lg leading-6">Guia de montagem — {result.profileName ?? result.profileCode}</DialogTitle>
              <p className="mt-1 leading-4 text-xs text-muted-foreground">Sequência física por aresta, pronta para consulta e impressão.</p>
            </div>
          </div>
        </DialogHeader>
        <div className="border-b bg-muted/20 px-5 py-2.5 sm:px-6">
          <button
            type="button"
            aria-label="Abrir guia de montagem para impressão"
            data-testid="assembly-print-link"
            onClick={() => setPrintOpen(true)}
            className="mx-auto inline-flex h-9 min-w-52 cursor-pointer items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Printer className="h-4 w-4" /> Imprimir guia
          </button>
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
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
