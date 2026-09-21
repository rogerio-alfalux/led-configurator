import { Printer, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildShapeAssemblyGuideHtml } from "@/lib/shapeAssemblyGuideData";
import { parseShapeAssemblyPrintPayload } from "@/lib/shapeAssemblyPrintRoute";
import { useSearch } from "wouter";

const pageStyles = `
  @page { size: A4 portrait; margin: 6mm; }
  * { box-sizing: border-box; }
  body { background: #eef2f7; }
  .assembly-print-page { max-width: 210mm; margin: 0 auto; color: #172033; font-family: Arial, Helvetica, sans-serif; }
  .assembly-sheet { background:#fff; break-inside:avoid; page-break-after:always; }
  .assembly-sheet:last-child { page-break-after:auto; }
  .assembly-header { background:#1f3864; color:#fff; padding:10px 13px; border-radius:6px 6px 0 0; }
  .assembly-header p { font-size:9px; font-weight:700; letter-spacing:.7px; margin:0 0 3px; }
  .assembly-header h2 { font-size:16px; margin:0; }
  .assembly-product { font-size:10px; margin-top:4px; opacity:.95; }
  .assembly-layout { border:1px solid #8ea9c1; border-top:0; padding:8px; }
  .assembly-topology { display:grid; grid-template-columns:190px minmax(0,1fr); align-items:center; border-bottom:1px solid #d4dbe5; padding:0 3px 7px; text-align:center; }
  .assembly-topology svg { width:185px; height:100px; color:#1f3864; }
  .assembly-topology p { font-size:10px; line-height:1.3; text-align:left; margin:0 0 0 9px; }
  .assembly-legend { display:flex; justify-content:flex-start; gap:5px; flex-wrap:wrap; margin:5px 0 0 9px; }
  .assembly-legend span { border:1px solid #8ea9c1; border-radius:8px; padding:2px 6px; font-size:8px; font-weight:700; }
  .assembly-edges { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; padding-top:7px; }
  .assembly-edge { border:1px solid #b9c5d4; border-radius:4px; margin:0; break-inside:avoid; }
  .assembly-edge-title { display:flex; justify-content:space-between; gap:5px; background:#edf2f7; padding:5px 6px; font-size:9px; }
  .assembly-edge-title strong { font-size:10px; }.assembly-edge-title span{ color:#506176; white-space:nowrap; }
  .assembly-modules { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px; list-style:none; padding:5px; margin:0; }
  .assembly-module { border:1px solid #cbd5e1; border-radius:3px; padding:5px; display:grid; gap:2px; font-size:8px; line-height:1.2; min-width:0; }
  .assembly-position { font-weight:800; color:#1f3864; }.assembly-type { font-size:7px; font-weight:700; text-transform:uppercase; }.assembly-module strong { font-size:8px; overflow-wrap:anywhere; }
  .assembly-corner { border-color:#b796e8; background:#faf7ff; }.assembly-if { border-color:#7dd3fc; background:#f0f9ff; }.assembly-ml { border-color:#6ee7b7; background:#f0fdf4; }
  .assembly-note { border:1px solid #8ea9c1; border-top:0; padding:6px 8px; font-size:8px; line-height:1.25; color:#506176; border-radius:0 0 6px 6px; }
  @media print { body { background:#fff; }.print-actions { display:none !important; }.assembly-print-page { max-width:none; margin:0; } }
`;

export default function ShapeAssemblyPrintPage() {
  const search = useSearch();
  const payload = parseShapeAssemblyPrintPayload(search);

  if (!payload) {
    return <main className="mx-auto flex min-h-screen max-w-xl items-center p-6">
      <section className="w-full rounded-lg border bg-card p-6 text-center shadow-sm">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <h1 className="text-lg font-semibold">Guia de montagem indisponível</h1>
        <p className="mt-2 text-sm text-muted-foreground">Os dados necessários para abrir esta guia não foram encontrados.</p>
      </section>
    </main>;
  }

  const item = {
    profileShape: payload.shape,
    shapeAssemblyEdges: payload.assemblyEdges,
    description: payload.profileName,
    sku: payload.profileCode,
    itemEmPlanta: "Guia de montagem",
    qty: 1,
  } as any;

  return <main className="min-h-screen bg-slate-100 px-3 py-5 sm:px-6">
    <style>{pageStyles}</style>
    <section className="print-actions mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm">
      <div>
        <p className="font-semibold">Guia de montagem pronto para impressão</p>
        <p className="text-xs text-muted-foreground">Confira a folha abaixo e clique no botão para imprimir, ou use Ctrl+P.</p>
      </div>
      <Button type="button" size="sm" className="shrink-0 gap-2" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Imprimir guia
      </Button>
    </section>
    <section className="assembly-print-page" dangerouslySetInnerHTML={{ __html: buildShapeAssemblyGuideHtml([item]) }} />
  </main>;
}
