import { Link, useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, ClipboardList, Clock, FileText, Filter, MapPin, Package, Paperclip, Phone, Search, UserRound, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type LdRequestFilter = {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

type FilterableLdRequest = {
  submittedAt: string | Date;
  status: string;
  requestNumber?: string | null;
  officeName?: string | null;
  finalClientName?: string | null;
  constructorName?: string | null;
  workCity?: string | null;
  workState?: string | null;
};

export function filterLdRequests<T extends FilterableLdRequest>(requests: T[], filters: LdRequestFilter): T[] {
  const search = filters.search.trim().toLocaleLowerCase("pt-BR");
  return requests.filter((request) => {
    const submittedDate = String(request.submittedAt).slice(0, 10);
    const searchable = [
      request.requestNumber,
      request.officeName,
      request.finalClientName,
      request.constructorName,
      request.workCity,
      request.workState,
    ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
    return (!filters.status || filters.status === "all" || request.status === filters.status)
      && (!filters.dateFrom || submittedDate >= filters.dateFrom)
      && (!filters.dateTo || submittedDate <= filters.dateTo)
      && (!search || searchable.includes(search));
  });
}

function LdGuestFilters({ filters, onChange, resultCount }: { filters: LdRequestFilter; onChange: (next: LdRequestFilter) => void; resultCount: number }) {
  const isActive = Boolean(filters.search || filters.status !== "all" || filters.dateFrom || filters.dateTo);
  const reset = () => onChange({ search: "", status: "all", dateFrom: "", dateTo: "" });
  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><Filter className="w-4 h-4 text-primary" /> Filtrar solicitações</div>
          <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{resultCount} {resultCount === 1 ? "resultado" : "resultados"}</span>{isActive && <Button variant="ghost" size="sm" onClick={reset}><X className="w-3.5 h-3.5 mr-1" /> Limpar</Button>}</div>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_150px_150px]">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9" value={filters.search} onChange={event => onChange({ ...filters, search: event.target.value })} placeholder="Número, escritório, obra, cliente ou cidade" aria-label="Buscar solicitações" /></div>
          <Select value={filters.status} onValueChange={status => onChange({ ...filters, status })}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="pending">Novas</SelectItem><SelectItem value="in_review">Em análise</SelectItem><SelectItem value="quote_ready">PDF disponível</SelectItem><SelectItem value="cancelled">Canceladas</SelectItem></SelectContent></Select>
          <Input type="date" value={filters.dateFrom} onChange={event => onChange({ ...filters, dateFrom: event.target.value })} aria-label="Data inicial" />
          <Input type="date" value={filters.dateTo} onChange={event => onChange({ ...filters, dateTo: event.target.value })} aria-label="Data final" />
        </div>
      </CardContent>
    </Card>
  );
}

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
        return <Card key={request.id}><CardHeader className="pb-3"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> Solicitação {request.requestNumber ?? `#${request.id}`}</CardTitle><p className="text-sm text-muted-foreground mt-1">Enviada em {toBrasiliaDateTime(request.submittedAt)}</p></div><Badge className={status.className}>{status.label}</Badge></div></CardHeader><CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3 text-sm"><div><p className="text-muted-foreground">Escritório</p><p className="font-medium">{request.officeName}</p></div><div><p className="text-muted-foreground">Cliente final</p><p className="font-medium">{request.finalClientName}</p></div><div><p className="text-muted-foreground">Construtora</p><p className="font-medium">{request.constructorName || "—"}</p></div></div>
          <div className="grid md:grid-cols-2 gap-3"><div className="rounded-md border bg-muted/30 p-3"><p className="text-xs font-semibold text-muted-foreground mb-2">CONTATO SOLICITANTE</p><p className="text-sm"><UserRound className="inline w-3.5 h-3.5 mr-1" />{request.contactName || request.guestName}</p><p className="text-sm text-muted-foreground mt-1"><Phone className="inline w-3.5 h-3.5 mr-1" />{request.contactPhone || "Telefone não informado"}</p><p className="text-sm text-muted-foreground mt-1">{request.guestEmail || "E-mail não informado"}</p></div><div className="rounded-md border bg-muted/30 p-3"><p className="text-xs font-semibold text-muted-foreground mb-2">LOCALIDADE DA OBRA</p><p className="text-sm"><MapPin className="inline w-3.5 h-3.5 mr-1 text-primary" />{request.workCity || "Cidade não informada"}{request.workState ? ` · ${request.workState}` : ""}</p><p className="text-xs text-muted-foreground mt-2">Aplicada ao orçamento para frete, DIFAL e FCP.</p></div></div>
          {(request.attachments ?? []).length > 0 && <div className="rounded-md border p-3 space-y-2"><p className="text-xs font-semibold text-muted-foreground">ANEXOS TÉCNICOS ({request.attachments.length})</p><div className="flex flex-wrap gap-2">{request.attachments.map((attachment: any) => <a key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs font-medium hover:bg-muted"><Paperclip className="w-3.5 h-3.5 text-primary shrink-0" /><span className="truncate max-w-52">{attachment.fileName}</span></a>)}</div></div>}
          <div className="rounded-md border p-3 space-y-2"><p className="text-xs font-semibold text-muted-foreground">PRODUTOS CONFIGURADOS ({items.length})</p>{items.map((item: any, index: number) => <div key={index} className="text-sm"><span className="font-medium">{index + 1}. {item.description}</span><span className="text-muted-foreground"> · Qtd. {item.qty ?? 1}{item.power ? ` · ${item.power}` : ""}{item.cct ? ` · ${item.cct}` : ""}</span></div>)}</div>
          <div className="flex flex-wrap gap-2 justify-end">{request.status === "pending" && <Button variant="outline" size="sm" onClick={() => startReview.mutate({ requestId: request.id })} disabled={startReview.isPending}><Clock className="w-4 h-4 mr-1" /> Assumir análise</Button>}{request.adminQuoteId ? <Link href={`/orcamentos/${request.adminQuoteId}`}><Button size="sm"><FileText className="w-4 h-4 mr-1" /> Abrir orçamento</Button></Link> : <Button size="sm" onClick={() => convert.mutate({ requestId: request.id })} disabled={convert.isPending}><CheckCircle2 className="w-4 h-4 mr-1" /> Criar orçamento para revisão</Button>}</div>
        </CardContent></Card>;
      })}</div>}
    </main>
  </div>;
}

export function LDGuestRequests() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [filters, setFilters] = useState<LdRequestFilter>({ search: "", status: "all", dateFrom: "", dateTo: "" });
  const mine = trpc.ldRequests.mine.useQuery(undefined, { staleTime: 0, enabled: (user as any)?.role === "convidado" });
  const pdf = trpc.ldRequests.myPdf.useMutation();
  const visibleRequests = useMemo(() => filterLdRequests(mine.data ?? [], filters), [mine.data, filters]);
  const download = async (requestId: number) => {
    try {
      await openLdValidatedPdf(requestId, pdf.mutateAsync);
      await utils.ldRequests.notifications.invalidate();
      await utils.ldRequests.mine.invalidate();
    } catch { toast.error("Não foi possível abrir o PDF."); }
  };
  if ((user as any)?.role !== "convidado") return <div className="p-8 text-center text-muted-foreground">Esta área é exclusiva para LD Convidado.</div>;
  return <div className="min-h-screen bg-background">
    <header className="border-b bg-card"><div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3"><Link href="/" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary"><ArrowLeft className="w-4 h-4" /> Configurador</Link><span className="text-muted-foreground">/</span><span className="font-semibold">Minhas solicitações</span></div></header>
    <main className="max-w-4xl mx-auto px-4 py-7 space-y-5">
      <div><h1 className="text-2xl font-bold">Minhas solicitações de orçamento</h1><p className="text-sm text-muted-foreground mt-1">A equipe Alfalux analisará suas configurações e disponibilizará o PDF do orçamento validado aqui.</p></div>
      {mine.isLoading ? <p className="py-12 text-center text-muted-foreground">Carregando...</p> : (mine.data ?? []).length === 0 ? <Card className="py-12 text-center"><Package className="w-9 h-9 mx-auto text-muted-foreground mb-3" /><p className="font-medium">Nenhuma solicitação enviada</p></Card> : <>
        <LdGuestFilters filters={filters} onChange={setFilters} resultCount={visibleRequests.length} />
        {visibleRequests.length === 0 ? <Card className="py-10 text-center"><Filter className="w-8 h-8 mx-auto text-muted-foreground mb-2" /><p className="font-medium">Nenhuma solicitação encontrada</p><p className="text-sm text-muted-foreground mt-1">Ajuste ou limpe os filtros para ver outras solicitações.</p></Card> : <div className="space-y-3">{visibleRequests.map(request => { const status = STATUS[request.status] ?? STATUS.pending; return <LdGuestRequestHistoryCard key={request.id} finalClientName={request.finalClientName} officeName={request.officeName} constructorName={request.constructorName} submittedAtLabel={toBrasiliaDateTime(request.submittedAt)} statusLabel={status.label} statusClassName={status.className} pdfAvailable={isValidatedLdPdfAvailable(request.status, request.pdfAvailable ? "available" : null)} onDownload={() => download(request.id)} isDownloading={pdf.isPending} />; })}</div>}
      </>}
    </main>
  </div>;
}
