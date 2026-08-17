import { Link, useLocation } from "wouter";
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, Clock, FileText, Filter, Mail, MapPin, Package, Paperclip, Phone, Search, Trash2, UserRound, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { parseCartItemData, type CartItemData, type QuoteFormData } from "@/lib/cartTypes";
import { toBrasiliaDate, toBrasiliaDateTime } from "@/lib/dateUtils";
import { isValidatedLdPdfAvailable } from "@/lib/ldRequestUtils";
import { LdGuestRequestHistoryCard } from "@/components/LdGuestCards";
import { ExcelPreviewModal } from "@/components/ExcelPreviewModal";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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

function formatRequestedDate(value?: string | null) {
  if (!value) return "Não informado";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

type LdCurrentPdfJob = { requestId: number; items: CartItemData[]; formData: QuoteFormData; fileName: string };

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function buildCurrentLdPdfJob(payload: any): LdCurrentPdfJob {
  const quote = payload.quote;
  const quoteNumber = quote.quoteNumber || "Orçamento";
  const items = (payload.items ?? []).map((item: { itemData: string }) => parseCartItemData(item.itemData)).filter((item: CartItemData | null): item is CartItemData => item !== null);
  return {
    requestId: payload.requestId,
    items,
    fileName: `${quoteNumber}.pdf`,
    formData: {
      cliente: quote.clientName,
      contato: quote.clientContact ?? "",
      tel: quote.clientPhone ?? "",
      email: quote.clientEmail ?? "",
      obra: quote.projectName ?? "",
      referencia: quote.projectRef ?? "",
      numero: quoteNumber,
      data: toBrasiliaDate(quote.updatedAt ?? quote.createdAt),
      arquiteto: quote.arquiteto ?? undefined,
      lightDesigner: quote.lightDesigner ?? undefined,
      seller1Name: quote.seller1Name ?? undefined,
      seller1Phone: payload.seller1Contact?.phone ?? undefined,
      seller1Email: payload.seller1Contact?.email ?? undefined,
      seller2Name: quote.seller2Name ?? undefined,
      seller2Phone: payload.seller2Contact?.phone ?? undefined,
      seller2Email: payload.seller2Contact?.email ?? undefined,
      assistantName: quote.assistantName ?? undefined,
      rtPercent: toNumber(quote.rtPercent),
      marginPercent: toNumber(quote.marginPercent),
      discountPercent: toNumber(quote.discountPercent),
      showDiscount: Boolean(quote.showDiscount),
      freteType: quote.freteType ?? "free",
      freteIsento: Boolean(quote.freteIsento),
      freteLocalidade: quote.freteLocalidade ?? "sp",
      freteCity: quote.freteCity ?? undefined,
      freteState: quote.freteState ?? undefined,
      freteValue: toNumber(quote.freteValue),
      freteIncluded: Boolean(quote.freteIncluded),
      revisionCount: Math.max(0, Number(quote.currentVersion ?? 1) - 1),
      deliveryDays: quote.deliveryDays ?? 20,
      paymentTerm: quote.paymentTerm ?? undefined,
      destState: quote.destState ?? undefined,
      difalEnabled: Boolean(quote.difalEnabled),
      difalPercent: toNumber(quote.difalPercent),
      difalValue: toNumber(quote.difalValue),
      fcpEnabled: Boolean(quote.fcpEnabled),
      fcpPercent: toNumber(quote.fcpPercent),
      fcpValue: toNumber(quote.fcpValue),
      diluicaoValor: toNumber(quote.diluicaoValor),
    },
  };
}

export function LDRequestsAdmin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const requests = trpc.ldRequests.adminList.useQuery(undefined, { staleTime: 0, enabled: (user as any)?.role === "admin" });
  const startReview = trpc.ldRequests.adminStartReview.useMutation({ onSuccess: () => utils.ldRequests.adminList.invalidate() });
  const deleteRequest = trpc.ldRequests.adminDelete.useMutation();
  const convert = trpc.ldRequests.adminConvertToQuote.useMutation({
    onSuccess: async (data) => {
      await utils.ldRequests.adminList.invalidate();
      toast.success(data.alreadyConverted ? "Orçamento já estava criado." : `Orçamento ${data.quoteNumber} criado para revisão.`);
      navigate(`/orcamentos/${data.quoteId}`);
    },
    onError: error => toast.error(error.message),
  });
  const [sortBy, setSortBy] = useState<"desired_date" | "submitted_at">("desired_date");
  const [requestIdToDelete, setRequestIdToDelete] = useState<number | null>(null);
  const confirmDelete = async () => {
    if (requestIdToDelete === null) return;
    try {
      await deleteRequest.mutateAsync({ requestId: requestIdToDelete });
      await Promise.all([utils.ldRequests.adminList.invalidate(), utils.ldRequests.notifications.invalidate()]);
      toast.success("Solicitação LD excluída. O orçamento vinculado foi preservado.");
      setRequestIdToDelete(null);
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível excluir a solicitação LD.");
    }
  };
  const orderedRequests = useMemo(() => [...(requests.data ?? [])].sort((left, right) => {
    if (sortBy === "submitted_at") return String(right.submittedAt).localeCompare(String(left.submittedAt));
    const leftDeadline = left.desiredQuoteDate || "9999-12-31";
    const rightDeadline = right.desiredQuoteDate || "9999-12-31";
    return leftDeadline.localeCompare(rightDeadline) || String(right.submittedAt).localeCompare(String(left.submittedAt));
  }), [requests.data, sortBy]);

  if ((user as any)?.role !== "admin") return <div className="p-8 text-center text-muted-foreground">Acesso restrito a administradores.</div>;
  return <div className="min-h-screen bg-background">
    <header className="border-b bg-card"><div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3"><Link href="/" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary"><ArrowLeft className="w-4 h-4" /> Configurador</Link><span className="text-muted-foreground">/</span><span className="font-semibold">Solicitações LD</span></div></header>
    <main className="max-w-6xl mx-auto px-4 py-7 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold">Solicitações de orçamento LD</h1><p className="text-sm text-muted-foreground mt-1">Configurações enviadas por LD Convidado aguardando a elaboração e validação administrativa.</p></div><div className="w-full sm:w-64 space-y-1.5"><label className="text-xs font-medium text-muted-foreground" htmlFor="ld-admin-sort">Ordenar solicitações</label><Select value={sortBy} onValueChange={(value) => setSortBy(value as "desired_date" | "submitted_at")}><SelectTrigger id="ld-admin-sort"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="desired_date">Prazo desejado (mais próximo)</SelectItem><SelectItem value="submitted_at">Data de envio (mais recente)</SelectItem></SelectContent></Select></div></div>
      {requests.isLoading ? <p className="py-12 text-center text-muted-foreground">Carregando solicitações...</p> : orderedRequests.length === 0 ? <Card className="py-12 text-center"><ClipboardList className="w-9 h-9 mx-auto text-muted-foreground mb-3" /><p className="font-medium">Nenhuma solicitação recebida</p></Card> : <div className="space-y-4">{orderedRequests.map(request => {
        const items = requestItems(request.itemsData);
        const status = STATUS[request.status] ?? STATUS.pending;
        return <Card key={request.id}><CardHeader className="pb-3"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> Solicitação {request.requestNumber ?? `#${request.id}`}</CardTitle><p className="text-sm text-muted-foreground mt-1">Enviada em {toBrasiliaDateTime(request.submittedAt)}</p></div><div className="flex flex-wrap items-center gap-2"><Badge className={status.className}>{status.label}</Badge>{request.guestDeletedAt && <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700">Excluída pelo LD</Badge>}</div></div></CardHeader><CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3 text-sm"><div><p className="text-muted-foreground">Escritório</p><p className="font-medium">{request.officeName}</p></div><div><p className="text-muted-foreground">Cliente final</p><p className="font-medium">{request.finalClientName}</p></div><div><p className="text-muted-foreground">Construtora</p><p className="font-medium">{request.constructorName || "—"}</p></div></div>
          <div className="grid md:grid-cols-3 gap-3"><div className="rounded-md border bg-muted/30 p-3"><p className="text-xs font-semibold text-muted-foreground mb-2">CONTATO SOLICITANTE</p><p className="text-sm"><UserRound className="inline w-3.5 h-3.5 mr-1" />{request.contactName || request.guestName}</p><p className="text-sm text-muted-foreground mt-1"><Phone className="inline w-3.5 h-3.5 mr-1" />{request.contactPhone || "Telefone não informado"}</p><p className="text-sm text-muted-foreground mt-1"><Mail className="inline w-3.5 h-3.5 mr-1" />{request.guestEmail || "E-mail não informado"}</p></div><div className="rounded-md border bg-muted/30 p-3"><p className="text-xs font-semibold text-muted-foreground mb-2">LOCALIDADE DA OBRA</p><p className="text-sm"><MapPin className="inline w-3.5 h-3.5 mr-1 text-primary" />{request.workCity || "Cidade não informada"}{request.workState ? ` · ${request.workState}` : ""}</p><p className="text-xs text-muted-foreground mt-2">Aplicada ao orçamento para frete, DIFAL e FCP.</p></div><div className="rounded-md border border-primary/20 bg-primary/5 p-3"><p className="text-xs font-semibold text-muted-foreground mb-2">PRAZOS INFORMADOS</p><p className="text-sm"><CalendarClock className="inline w-3.5 h-3.5 mr-1 text-primary" />Orçamento: <span className="font-medium">{formatRequestedDate(request.desiredQuoteDate)}</span></p><p className="text-sm text-muted-foreground mt-1">Entrega luminárias: <span className="text-foreground font-medium">{formatRequestedDate(request.estimatedDeliveryDate)}</span></p></div></div>
          {(request.attachments ?? []).length > 0 && <div className="rounded-md border p-3 space-y-2"><p className="text-xs font-semibold text-muted-foreground">ANEXOS TÉCNICOS ({request.attachments.length})</p><div className="flex flex-wrap gap-2">{request.attachments.map((attachment: any) => <a key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs font-medium hover:bg-muted"><Paperclip className="w-3.5 h-3.5 text-primary shrink-0" /><span className="truncate max-w-52">{attachment.fileName}</span></a>)}</div></div>}
          {request.generalObservation && <div className="rounded-md border border-primary/20 bg-primary/5 p-3"><p className="text-xs font-semibold text-muted-foreground mb-1">OBSERVAÇÃO GERAL DO PROJETO</p><p className="text-sm whitespace-pre-wrap">{request.generalObservation}</p></div>}
          <div className="rounded-md border p-3 space-y-2"><p className="text-xs font-semibold text-muted-foreground">PRODUTOS CONFIGURADOS ({items.length})</p>{items.map((item: any, index: number) => <div key={index} className="text-sm"><span className="font-medium">{index + 1}. {item.description}</span><span className="text-muted-foreground"> · Qtd. {item.qty ?? 1}{item.power ? ` · ${item.power}` : ""}{item.cct ? ` · ${item.cct}` : ""}</span>{item.ldItemObservation && <p className="mt-1 ml-4 text-xs text-muted-foreground whitespace-pre-wrap">Observação do LD: {item.ldItemObservation}</p>}</div>)}</div>
          <div className="flex flex-wrap gap-2 justify-end">{request.status === "pending" && <Button variant="outline" size="sm" onClick={() => startReview.mutate({ requestId: request.id })} disabled={startReview.isPending}><Clock className="w-4 h-4 mr-1" /> Assumir análise</Button>}{request.adminQuoteId ? <Link href={`/orcamentos/${request.adminQuoteId}`}><Button size="sm"><FileText className="w-4 h-4 mr-1" /> Abrir orçamento</Button></Link> : <Button size="sm" onClick={() => convert.mutate({ requestId: request.id })} disabled={convert.isPending}><CheckCircle2 className="w-4 h-4 mr-1" /> Criar orçamento para revisão</Button>}<Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRequestIdToDelete(request.id)} disabled={deleteRequest.isPending}><Trash2 className="w-4 h-4 mr-1" /> Excluir</Button></div>
        </CardContent></Card>;
      })}</div>}
    </main>
    <AlertDialog open={requestIdToDelete !== null} onOpenChange={(open) => { if (!open && !deleteRequest.isPending) setRequestIdToDelete(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir solicitação LD?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação remove a solicitação e os anexos técnicos da fila. O orçamento eventualmente criado a partir dela será preservado.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteRequest.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(event) => { event.preventDefault(); void confirmDelete(); }} disabled={deleteRequest.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir solicitação</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}

export function LDGuestRequests() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [filters, setFilters] = useState<LdRequestFilter>({ search: "", status: "all", dateFrom: "", dateTo: "" });
  const [downloadingRequestId, setDownloadingRequestId] = useState<number | null>(null);
  const [requestIdToDelete, setRequestIdToDelete] = useState<number | null>(null);
  const [currentPdfJob, setCurrentPdfJob] = useState<LdCurrentPdfJob | null>(null);
  const mine = trpc.ldRequests.mine.useQuery(undefined, { staleTime: 0, enabled: (user as any)?.role === "convidado" });
  const productsQuery = trpc.alfalux.products.useQuery(undefined, { staleTime: 0, enabled: (user as any)?.role === "convidado" });
  const revendaProductsQuery = trpc.alfalux.revendaProducts.useQuery(undefined, { staleTime: 0, enabled: (user as any)?.role === "convidado" });
  const acessoriosQuery = trpc.alfalux.acessoriosProducts.useQuery(undefined, { staleTime: 0, enabled: (user as any)?.role === "convidado" });
  const currentPdfData = trpc.ldRequests.currentPdfData.useMutation();
  const deleteRequest = trpc.ldRequests.deleteMine.useMutation();
  const visibleRequests = useMemo(() => filterLdRequests(mine.data ?? [], filters), [mine.data, filters]);
  const productPhotoMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of productsQuery.data ?? []) if (product.sku && product.fotoUrl) map.set(product.sku, product.fotoUrl);
    for (const product of revendaProductsQuery.data ?? []) if (product.sku && product.fotoUrl) map.set(product.sku, product.fotoUrl);
    for (const product of acessoriosQuery.data ?? []) {
      const key = product.codigo ?? product.sku;
      if (key && product.fotoUrl) map.set(key, product.fotoUrl);
      if (product.sku && product.fotoUrl) map.set(product.sku, product.fotoUrl);
    }
    return map;
  }, [productsQuery.data, revendaProductsQuery.data, acessoriosQuery.data]);
  const openOfficialPreview = async (requestId: number) => {
    if (downloadingRequestId !== null) return;
    setDownloadingRequestId(requestId);
    try {
      const payload = await currentPdfData.mutateAsync({ requestId });
      const job = buildCurrentLdPdfJob(payload);
      if (job.items.length === 0) throw new Error("O orçamento não possui itens para gerar o PDF.");
      setCurrentPdfJob(job);
    } catch {
      // Não abrir o arquivo armazenado como fallback: ele pode ser um PDF
      // legado. Cada clique deve gerar exclusivamente o PDF atual desta linha.
      toast.error("Não foi possível gerar o PDF atualizado desta solicitação.");
      setDownloadingRequestId(null);
    }
  };
  const confirmDelete = async () => {
    if (requestIdToDelete === null) return;
    try {
      await deleteRequest.mutateAsync({ requestId: requestIdToDelete });
      await Promise.all([utils.ldRequests.mine.invalidate(), utils.ldRequests.notifications.invalidate()]);
      toast.success("Solicitação excluída.");
      setRequestIdToDelete(null);
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível excluir a solicitação.");
    }
  };
  if ((user as any)?.role !== "convidado") return <div className="p-8 text-center text-muted-foreground">Esta área é exclusiva para LD Convidado.</div>;
  return <div className="min-h-screen bg-background">
    <header className="border-b bg-card"><div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3"><Link href="/" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary"><ArrowLeft className="w-4 h-4" /> Configurador</Link><span className="text-muted-foreground">/</span><span className="font-semibold">Minhas solicitações</span></div></header>
    <main className="max-w-4xl mx-auto px-4 py-7 space-y-5">
      <div><h1 className="text-2xl font-bold">Minhas solicitações de orçamento</h1><p className="text-sm text-muted-foreground mt-1">A equipe Alfalux analisará suas configurações e disponibilizará o PDF do orçamento validado aqui.</p></div>
      {mine.isLoading ? <p className="py-12 text-center text-muted-foreground">Carregando...</p> : (mine.data ?? []).length === 0 ? <Card className="py-12 text-center"><Package className="w-9 h-9 mx-auto text-muted-foreground mb-3" /><p className="font-medium">Nenhuma solicitação enviada</p></Card> : <>
        <LdGuestFilters filters={filters} onChange={setFilters} resultCount={visibleRequests.length} />
        {visibleRequests.length === 0 ? <Card className="py-10 text-center"><Filter className="w-8 h-8 mx-auto text-muted-foreground mb-2" /><p className="font-medium">Nenhuma solicitação encontrada</p><p className="text-sm text-muted-foreground mt-1">Ajuste ou limpe os filtros para ver outras solicitações.</p></Card> : <div className="space-y-3">{visibleRequests.map(request => { const status = STATUS[request.status] ?? STATUS.pending; return <LdGuestRequestHistoryCard key={request.id} finalClientName={request.finalClientName} officeName={request.officeName} constructorName={request.constructorName} submittedAtLabel={toBrasiliaDateTime(request.submittedAt)} statusLabel={status.label} statusClassName={status.className} pdfAvailable={isValidatedLdPdfAvailable(request.status, request.pdfAvailable ? "available" : null)} onPreview={() => openOfficialPreview(request.id)} onDelete={() => setRequestIdToDelete(request.id)} isDownloading={downloadingRequestId === request.id} isDeleting={deleteRequest.isPending && requestIdToDelete === request.id} />; })}</div>}
      </>}
    </main>
    <AlertDialog open={requestIdToDelete !== null} onOpenChange={(open) => { if (!open && !deleteRequest.isPending) setRequestIdToDelete(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir solicitação?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação remove a solicitação apenas da sua lista. Ela continuará registrada para a equipe Alfalux, incluindo anexos e histórico, e poderá ser excluída definitivamente somente por um administrador.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteRequest.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(event) => { event.preventDefault(); void confirmDelete(); }} disabled={deleteRequest.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir solicitação</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    {currentPdfJob && <ExcelPreviewModal
      open
      onClose={() => { setCurrentPdfJob(null); setDownloadingRequestId(null); }}
      items={currentPdfJob.items}
      freshPhotoMap={productPhotoMap}
      formData={currentPdfJob.formData}
    />}
  </div>;
}
