import { Link, useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, ClipboardList, Clock, FileText, Package, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { parseCartItemData } from "@/lib/cartTypes";
import { toBrasiliaDateTime } from "@/lib/dateUtils";
import { isValidatedLdPdfAvailable } from "@/lib/ldRequestUtils";
import { LdGuestRequestHistoryCard } from "@/components/LdGuestCards";
import { openLdValidatedPdf } from "@/lib/ldPdfDownload";
import { toast } from "sonner";

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Nova solicitação", className: "bg-amber-100 text-amber-800" },
  in_review: { label: "Em análise", className: "bg-blue-100 text-blue-800" },
  quote_ready: { label: "PDF disponível", className: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelada", className: "bg-gray-100 text-gray-700" },
};

function requestItems(itemsData: string) {
  try {
    return (JSON.parse(itemsData) as Array<{ itemData: string }>).map(entry => parseCartItemData(entry.itemData)).filter(Boolean);
  } catch { return []; }
}

export function LDRequestsAdmin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const requests = trpc.ldRequests.adminList.useQuery(undefined, { staleTime: 0, enabled: (user as any)?.role === "admin" });
  const startReview = trpc.ldRequests.adminStartReview.useMutation({ onSuccess: () => utils.ldRequests.adminList.invalidate() });
  const convert = trpc.ldRequests.adminConvertToQuote.useMutation({
    onSuccess: async (data) => {
      await utils.ldRequests.adminList.invalidate();
      toast.success(data.alreadyConverted ? "Orçamento já estava criado." : `Orçamento ${data.quoteNumber} criado para revisão.`);
      navigate(`/orcamentos/${data.quoteId}`);
    },
    onError: error => toast.error(error.message),
  });

  if ((user as any)?.role !== "admin") return <div className="p-8 text-center text-muted-foreground">Acesso restrito a administradores.</div>;
  return <div className="min-h-screen bg-background">
    <header className="border-b bg-card"><div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3"><Link href="/" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary"><ArrowLeft className="w-4 h-4" /> Configurador</Link><span className="text-muted-foreground">/</span><span className="font-semibold">Solicitações LD</span></div></header>
    <main className="max-w-6xl mx-auto px-4 py-7 space-y-5">
      <div><h1 className="text-2xl font-bold">Solicitações de orçamento LD</h1><p className="text-sm text-muted-foreground mt-1">Configurações enviadas por LD Convidado aguardando a elaboração e validação administrativa.</p></div>
      {requests.isLoading ? <p className="py-12 text-center text-muted-foreground">Carregando solicitações...</p> : (requests.data ?? []).length === 0 ? <Card className="py-12 text-center"><ClipboardList className="w-9 h-9 mx-auto text-muted-foreground mb-3" /><p className="font-medium">Nenhuma solicitação recebida</p></Card> : <div className="space-y-4">{(requests.data ?? []).map(request => {
        const items = requestItems(request.itemsData);
        const status = STATUS[request.status] ?? STATUS.pending;
        return <Card key={request.id}><CardHeader className="pb-3"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> Solicitação #{request.id}</CardTitle><p className="text-sm text-muted-foreground mt-1">Enviada em {toBrasiliaDateTime(request.submittedAt)}</p></div><Badge className={status.className}>{status.label}</Badge></div></CardHeader><CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3 text-sm"><div><p className="text-muted-foreground">Escritório</p><p className="font-medium">{request.officeName}</p></div><div><p className="text-muted-foreground">Cliente final</p><p className="font-medium">{request.finalClientName}</p></div><div><p className="text-muted-foreground">Construtora</p><p className="font-medium">{request.constructorName || "—"}</p></div></div>
          <div className="rounded-md border bg-muted/30 p-3"><p className="text-xs font-semibold text-muted-foreground mb-2">SOLICITANTE</p><p className="text-sm"><UserRound className="inline w-3.5 h-3.5 mr-1" />{request.guestName} {request.guestEmail ? `· ${request.guestEmail}` : ""}</p></div>
          <div className="rounded-md border p-3 space-y-2"><p className="text-xs font-semibold text-muted-foreground">PRODUTOS CONFIGURADOS ({items.length})</p>{items.map((item: any, index: number) => <div key={index} className="text-sm"><span className="font-medium">{index + 1}. {item.description}</span><span className="text-muted-foreground"> · Qtd. {item.qty ?? 1}{item.power ? ` · ${item.power}` : ""}{item.cct ? ` · ${item.cct}` : ""}</span></div>)}</div>
          <div className="flex flex-wrap gap-2 justify-end">{request.status === "pending" && <Button variant="outline" size="sm" onClick={() => startReview.mutate({ requestId: request.id })} disabled={startReview.isPending}><Clock className="w-4 h-4 mr-1" /> Assumir análise</Button>}{request.adminQuoteId ? <Link href={`/orcamentos/${request.adminQuoteId}`}><Button size="sm"><FileText className="w-4 h-4 mr-1" /> Abrir orçamento</Button></Link> : <Button size="sm" onClick={() => convert.mutate({ requestId: request.id })} disabled={convert.isPending}><CheckCircle2 className="w-4 h-4 mr-1" /> Criar orçamento para revisão</Button>}</div>
        </CardContent></Card>;
      })}</div>}
    </main>
  </div>;
}

export function LDGuestRequests() {
  const { user } = useAuth();
  const mine = trpc.ldRequests.mine.useQuery(undefined, { staleTime: 0, enabled: (user as any)?.role === "convidado" });
  const pdf = trpc.ldRequests.myPdf.useMutation();
  const download = async (requestId: number) => {
    try { await openLdValidatedPdf(requestId, pdf.mutateAsync); } catch { toast.error("Não foi possível abrir o PDF."); }
  };
  if ((user as any)?.role !== "convidado") return <div className="p-8 text-center text-muted-foreground">Esta área é exclusiva para LD Convidado.</div>;
  return <div className="min-h-screen bg-background"><header className="border-b bg-card"><div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3"><Link href="/" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary"><ArrowLeft className="w-4 h-4" /> Configurador</Link><span className="text-muted-foreground">/</span><span className="font-semibold">Minhas solicitações</span></div></header><main className="max-w-4xl mx-auto px-4 py-7 space-y-5"><div><h1 className="text-2xl font-bold">Minhas solicitações de orçamento</h1><p className="text-sm text-muted-foreground mt-1">A equipe Alfalux analisará suas configurações e disponibilizará o PDF do orçamento validado aqui.</p></div>{mine.isLoading ? <p className="py-12 text-center text-muted-foreground">Carregando...</p> : (mine.data ?? []).length === 0 ? <Card className="py-12 text-center"><Package className="w-9 h-9 mx-auto text-muted-foreground mb-3" /><p className="font-medium">Nenhuma solicitação enviada</p></Card> : <div className="space-y-3">{(mine.data ?? []).map(request => { const status = STATUS[request.status] ?? STATUS.pending; return <LdGuestRequestHistoryCard key={request.id} finalClientName={request.finalClientName} officeName={request.officeName} constructorName={request.constructorName} submittedAtLabel={toBrasiliaDateTime(request.submittedAt)} statusLabel={status.label} statusClassName={status.className} pdfAvailable={isValidatedLdPdfAvailable(request.status, request.pdfAvailable ? "available" : null)} onDownload={() => download(request.id)} isDownloading={pdf.isPending} />; })}</div>}</main></div>;
}
