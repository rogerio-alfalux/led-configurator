import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Search, Plus, ClipboardList, CheckCircle, XCircle, Clock,
  TrendingDown, ArrowLeft, BarChart2, ShoppingCart, Eye,
  Users, UserCheck, Filter, X, Receipt, Download, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { getLoginUrl } from "@/const";
import { formatBRL } from "@/lib/cartTypes";
import { getDisplayedCustomerTotal } from "@/lib/quoteTotals";
import { toBrasiliaDate, toBrasiliaFileDate, toBrasiliaMonthYear } from "@/lib/dateUtils";
import { generateFilteredQuotesExcel } from "@/lib/quotesExcelGenerator";
import { PERMISSIONS } from "@shared/permissions";
import { getCommercialQuoteValue, isNonCommercialQuoteStatus } from "@shared/commercialQuote";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Em Aberto", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "Aprovado", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: <CheckCircle className="w-3 h-3" /> },
  lost: { label: "Perdido", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: <TrendingDown className="w-3 h-3" /> },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: <XCircle className="w-3 h-3" /> },
  invoiced: { label: "Faturado", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", icon: <Receipt className="w-3 h-3" /> },
};

export default function Quotes() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [assistantFilter, setAssistantFilter] = useState<string>("all");
  const [duplicateFilter, setDuplicateFilter] = useState<"all" | "duplicates" | "unique">("all");
  const [prospectingFilter, setProspectingFilter] = useState<"all" | "prospecting" | "commercial">("all");
  const [ldOriginFilter, setLdOriginFilter] = useState<"all" | "ld_only">("all");
  const [ldResponseFilter, setLdResponseFilter] = useState<"all" | "awaiting_pdf" | "sent_pdf">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [page, setPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const limit = 20;

  const ldRequestsQuery = trpc.ldRequests.adminList.useQuery(undefined, { enabled: user?.role === "admin", staleTime: 0 });
  const clientFilterActive = duplicateFilter !== "all" || prospectingFilter !== "all" || ldOriginFilter !== "all" || ldResponseFilter !== "all";
  const { data, isLoading } = trpc.quotes.list.useQuery({
    search: search || undefined,
    status: status !== "all" ? (status as "open" | "approved" | "lost" | "cancelled" | "invoiced") : undefined,
    seller1Id: sellerFilter !== "all" ? Number(sellerFilter) : undefined,
    assistantId: assistantFilter !== "all" ? Number(assistantFilter) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: clientFilterActive ? 10000 : limit,
    offset: clientFilterActive ? 0 : page * limit,
  });

  // Buscar todos os orçamentos sem filtro — apenas para popular dropdowns de vendedor/assistente
  const { data: allData } = trpc.quotes.list.useQuery({ limit: 1000, offset: 0 });
  // Buscar todos os orçamentos COM os filtros ativos (sem paginação) para estatísticas corretas
  const { data: filteredAllData } = trpc.quotes.list.useQuery({
    search: search || undefined,
    status: status !== "all" ? (status as "open" | "approved" | "lost" | "cancelled" | "invoiced") : undefined,
    seller1Id: sellerFilter !== "all" ? Number(sellerFilter) : undefined,
    assistantId: assistantFilter !== "all" ? Number(assistantFilter) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: 10000,
    offset: 0,
  });

  // Listas únicas de vendedores e assistentes
  const uniqueSellers = useMemo(() => {
    const byId = new Map<number, string>();
    (allData?.rows ?? []).forEach(q => {
      if (q.seller1Id && q.seller1Name) byId.set(q.seller1Id, q.seller1Name);
    });
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allData]);

  const uniqueAssistants = useMemo(() => {
    const byId = new Map<number, string>();
    (allData?.rows ?? []).forEach(q => {
      if (q.assistantId && q.assistantName) byId.set(q.assistantId, q.assistantName);
    });
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allData]);

  const ldRequestByQuoteId = useMemo(() => {
    const mapped = new Map<number, { status: string; requestNumber?: string | null }>();
    (ldRequestsQuery.data ?? []).forEach((request: any) => {
      if (request.adminQuoteId) mapped.set(Number(request.adminQuoteId), { status: request.status, requestNumber: request.requestNumber });
    });
    return mapped;
  }, [ldRequestsQuery.data]);

  // Permissão para ver diluição (mesma lógica do QuoteDetail)
  const canSeeCommission = hasPermission(PERMISSIONS.EDITAR_COMISSAO);

  // Estatísticas refletem os filtros ativos
  const stats = useMemo(() => {
    const rows = filteredAllData?.rows ?? [];
    const total = rows.filter(q => !(q as any).isProspecting && !isNonCommercialQuoteStatus(q.status)).length;
    // Amostras e manutenções não são receita comercial: mantêm o registro e o custo,
    // mas seu valor de venda é zerado nos indicadores gerais.
    const commercialRows = rows.filter(q => !(q as any).isProspecting && !isNonCommercialQuoteStatus(q.status));
    const open = commercialRows.filter(q => q.status === "open").length;
    const approved = commercialRows.filter(q => q.status === "approved").length;
    const lost = commercialRows.filter(q => q.status === "lost").length;
    const invoiced = commercialRows.filter(q => q.status === "invoiced").length;
    // Reconhece dados legados e usa a mesma regra comercial do detalhe: desconto → frete → DIFAL/FCP.
    const getQuoteValue = (q: typeof rows[0]) => getCommercialQuoteValue(q.status, getDisplayedCustomerTotal(q));
    const totalValue = commercialRows.reduce((sum, q) => sum + getQuoteValue(q), 0);
    const seenDuplicateGroups = new Set<string>();
    const withoutDuplicates = commercialRows.filter((q: any) => {
      if (!q.isDuplicate || !q.duplicateKey) return true;
      if (seenDuplicateGroups.has(q.duplicateKey)) return false;
      seenDuplicateGroups.add(q.duplicateKey);
      return true;
    });
    const realValue = withoutDuplicates.reduce((sum, q) => sum + getQuoteValue(q), 0);
    const duplicateCount = commercialRows.filter((q: any) => q.isDuplicate).length;
    const prospectingValue = rows.filter((q: any) => q.isProspecting).reduce((sum, q) => sum + getQuoteValue(q), 0);
    const approvedValue = commercialRows.filter(q => q.status === "approved").reduce((sum, q) => sum + getQuoteValue(q), 0);
    const invoicedValue = commercialRows.filter(q => q.status === "invoiced").reduce((sum, q) => sum + getQuoteValue(q), 0);
    return { total, open, approved, lost, invoiced, totalValue, realValue, duplicateCount, prospectingValue, approvedValue, invoicedValue };
  }, [filteredAllData, canSeeCommission]);

  const hasFilters = status !== "all" || sellerFilter !== "all" || assistantFilter !== "all" || duplicateFilter !== "all" || prospectingFilter !== "all" || ldOriginFilter !== "all" || ldResponseFilter !== "all" || search.trim() !== "" || dateFrom !== "" || dateTo !== "" || datePreset !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setSellerFilter("all");
    setAssistantFilter("all");
    setDuplicateFilter("all");
    setProspectingFilter("all");
    setLdOriginFilter("all");
    setLdResponseFilter("all");
    setDateFrom("");
    setDateTo("");
    setDatePreset("all");
    setPage(0);
  };

  // Aplica preset de data
  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    setPage(0);
    const today = new Date();
    const fmt = (d: Date) => toBrasiliaFileDate(d);
    if (preset === "all") {
      setDateFrom(""); setDateTo("");
    } else if (preset === "7d") {
      const from = new Date(today); from.setDate(today.getDate() - 7);
      setDateFrom(fmt(from)); setDateTo(fmt(today));
    } else if (preset === "30d") {
      const from = new Date(today); from.setDate(today.getDate() - 30);
      setDateFrom(fmt(from)); setDateTo(fmt(today));
    } else if (preset.startsWith("month:")) {
      const parts = preset.split(":");
      const y = Number(parts[1]); const m = Number(parts[2]);
      const from = new Date(y, m - 1, 1);
      const to = new Date(y, m, 0);
      setDateFrom(fmt(from)); setDateTo(fmt(to));
    }
  };

  // Gera lista dos últimos 12 meses
  const lastTwelveMonths = useMemo(() => {
    const months: { value: string; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const y = d.getFullYear(); const m = d.getMonth() + 1;
      const label = toBrasiliaMonthYear(d);
      months.push({ value: `month:${y}:${m}`, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return months;
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center p-8">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Faça login para continuar</h2>
          <Button asChild><a href={getLoginUrl()}>Entrar</a></Button>
        </Card>
      </div>
    );
  }

  const matchesClientFilters = (quote: any) => {
    if (duplicateFilter === "duplicates" && !quote.isDuplicate) return false;
    if (duplicateFilter === "unique" && quote.isDuplicate) return false;
    if (prospectingFilter === "prospecting" && !quote.isProspecting) return false;
    if (prospectingFilter === "commercial" && quote.isProspecting) return false;
    const ldRequest = ldRequestByQuoteId.get(Number(quote.id));
    if (ldOriginFilter === "ld_only" && !ldRequest) return false;
    if (ldResponseFilter === "awaiting_pdf" && ldRequest?.status !== "in_review") return false;
    if (ldResponseFilter === "sent_pdf" && ldRequest?.status !== "quote_ready") return false;
    return true;
  };
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const visibleRows = rows.filter(matchesClientFilters);
  const exportRows = (filteredAllData?.rows ?? []).filter(matchesClientFilters);
  const displayRows = clientFilterActive
    ? visibleRows.slice(page * limit, (page + 1) * limit)
    : visibleRows;
  const displayTotal = clientFilterActive ? visibleRows.length : total;
  const filtersSummary = useMemo(() => {
    const sellerName = uniqueSellers.find(item => String(item.id) === sellerFilter)?.name;
    const assistantName = uniqueAssistants.find(item => String(item.id) === assistantFilter)?.name;
    const parts = [
      search.trim() ? `Busca: ${search.trim()}` : "",
      status !== "all" ? `Status: ${STATUS_LABELS[status]?.label ?? status}` : "",
      sellerName ? `Vendedor: ${sellerName}` : "",
      assistantName ? `Assistente: ${assistantName}` : "",
      duplicateFilter === "duplicates" ? "Somente duplicados" : duplicateFilter === "unique" ? "Sem duplicados" : "",
      prospectingFilter === "prospecting" ? "Prospecções LD" : prospectingFilter === "commercial" ? "Somente comercial" : "",
      ldOriginFilter === "ld_only" ? "Origem: solicitações LD" : "",
      ldResponseFilter === "awaiting_pdf" ? "LD: pendente de resposta" : ldResponseFilter === "sent_pdf" ? "LD: PDF enviado" : "",
      dateFrom ? `De: ${toBrasiliaDate(`${dateFrom}T12:00:00-03:00`)}` : "",
      dateTo ? `Até: ${toBrasiliaDate(`${dateTo}T12:00:00-03:00`)}` : "",
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" | ") : "Sem filtros";
  }, [search, status, sellerFilter, assistantFilter, duplicateFilter, prospectingFilter, ldOriginFilter, ldResponseFilter, dateFrom, dateTo, uniqueSellers, uniqueAssistants]);

  const exportFilteredQuotes = async () => {
    if (user.role !== "admin") return;
    if (exportRows.length === 0) {
      toast.error("Não há orçamentos para exportar com os filtros atuais.");
      return;
    }
    setIsExporting(true);
    try {
      await generateFilteredQuotesExcel(exportRows.map((quote: any) => {
        const ldRequest = ldRequestByQuoteId.get(Number(quote.id));
        return {
          quoteNumber: quote.quoteNumber,
          revisionCount: quote.revisionCount,
          status: quote.status,
          createdAt: quote.createdAt,
          updatedAt: quote.updatedAt,
          clientName: quote.clientName,
          clientContact: quote.clientContact,
          projectName: quote.projectName,
          projectRef: quote.projectRef,
          seller1Name: quote.seller1Name,
          seller2Name: quote.seller2Name,
          assistantName: quote.assistantName,
          freteState: quote.freteState,
          freteCity: quote.freteCity,
          freteType: quote.freteType,
          totalAmount: quote.totalAmount,
          // Referência única para a exportação: total final comercial, inclusive para registros legados.
          totalFinal: getDisplayedCustomerTotal(quote),
          isProspecting: quote.isProspecting,
          isDuplicate: quote.isDuplicate,
          ldRequestNumber: ldRequest?.requestNumber,
          ldRequestStatus: ldRequest?.status,
        };
      }), filtersSummary);
      toast.success(`${exportRows.length} orçamento${exportRows.length === 1 ? "" : "s"} exportado${exportRows.length === 1 ? "" : "s"} para Excel.`);
    } catch (error) {
      console.error("Erro ao exportar orçamentos:", error);
      toast.error("Não foi possível gerar o Excel dos orçamentos.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Configurador
            </Button>
          </Link>
          <div className="flex-1" />
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <BarChart2 className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          {user?.role === "admin" && (
            <Link href="/backup">
              <Button variant="ghost" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Backup
              </Button>
            </Link>
          )}
          <Link href="/carrinho">
            <Button variant="ghost" size="sm" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Carrinho
            </Button>
          </Link>
          <ClipboardList className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Orçamentos</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground", icon: <ClipboardList className="w-4 h-4" />, isValue: false },
            { label: "Em Aberto", value: stats.open, color: "text-blue-600", icon: <Clock className="w-4 h-4 text-blue-500" />, isValue: false },
            { label: "Aprovados", value: stats.approved, color: "text-green-600", icon: <CheckCircle className="w-4 h-4 text-green-500" />, isValue: false },
            { label: "Perdidos", value: stats.lost, color: "text-red-600", icon: <TrendingDown className="w-4 h-4 text-red-500" />, isValue: false },
            { label: "Faturados", value: stats.invoiced, color: "text-purple-600", icon: <Receipt className="w-4 h-4 text-purple-500" />, isValue: false },
            { label: "Valor listado", value: formatBRL(stats.totalValue), color: "text-primary", icon: <BarChart2 className="w-4 h-4 text-primary" />, isValue: true },
            { label: "Valor sem duplicados", value: formatBRL(stats.realValue), color: "text-emerald-600", icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, isValue: true },
            { label: "Prospecções LD", value: formatBRL(stats.prospectingValue), color: "text-indigo-600", icon: <Users className="w-4 h-4 text-indigo-500" />, isValue: true },
          ].map(s => (
            <Card key={s.label} className="p-4 min-w-0 min-h-[104px] overflow-visible">
              <div className="flex items-start gap-2 mb-2 min-w-0 min-h-8">
                <span className="shrink-0">{s.icon}</span>
                <span className="text-xs leading-4 text-muted-foreground">{s.label}</span>
              </div>
              <p className={`font-bold tabular-nums ${s.color} ${s.isValue ? "text-base sm:text-lg lg:text-xl leading-tight whitespace-nowrap" : "text-2xl"}`}>{s.value}</p>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente, projeto..."
              className="pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>

          {/* Status */}
          <Select value={status} onValueChange={v => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="open">Em Aberto</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="lost">Perdidos</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
              <SelectItem value="invoiced">Faturados</SelectItem>
            </SelectContent>
          </Select>

          {/* Vendedor */}
          <Select value={sellerFilter} onValueChange={v => { setSellerFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48">
              <Users className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              {uniqueSellers.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assistente */}
          <Select value={assistantFilter} onValueChange={v => { setAssistantFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48">
              <UserCheck className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Assistente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os assistentes</SelectItem>
              {uniqueAssistants.map(a => (
                <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={duplicateFilter} onValueChange={v => { setDuplicateFilter(v as "all" | "duplicates" | "unique"); setPage(0); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Duplicidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os registros</SelectItem>
              <SelectItem value="duplicates">Somente duplicados ({stats.duplicateCount})</SelectItem>
              <SelectItem value="unique">Sem duplicados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={prospectingFilter} onValueChange={v => { setProspectingFilter(v as "all" | "prospecting" | "commercial"); setPage(0); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Carteira" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Comercial + prospecção</SelectItem>
              <SelectItem value="commercial">Somente comercial</SelectItem>
              <SelectItem value="prospecting">Prospecções LD</SelectItem>
            </SelectContent>
          </Select>

          {user?.role === "admin" && <>
            <Select value={ldOriginFilter} onValueChange={v => { setLdOriginFilter(v as "all" | "ld_only"); setPage(0); }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Origem do orçamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                <SelectItem value="ld_only">Somente solicitações LD</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ldResponseFilter} onValueChange={v => { setLdResponseFilter(v as "all" | "awaiting_pdf" | "sent_pdf"); setPage(0); }}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Resposta ao LD" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os envios LD</SelectItem>
                <SelectItem value="awaiting_pdf">Pendente de resposta ao LD</SelectItem>
                <SelectItem value="sent_pdf">PDF enviado ao LD</SelectItem>
              </SelectContent>
            </Select>
          </>}

          {/* Filtros de data — linha 2 */}
          <div className="flex items-center gap-2 flex-wrap w-full">
            {/* Atalhos rápidos */}
            <div className="flex items-center gap-1">
              <Button
                variant={datePreset === "7d" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs px-2.5"
                onClick={() => applyDatePreset(datePreset === "7d" ? "all" : "7d")}
              >
                7 dias
              </Button>
              <Button
                variant={datePreset === "30d" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs px-2.5"
                onClick={() => applyDatePreset(datePreset === "30d" ? "all" : "30d")}
              >
                30 dias
              </Button>
            </div>
            {/* Dropdown de meses */}
            <Select
              value={datePreset.startsWith("month:") ? datePreset : "none"}
              onValueChange={v => applyDatePreset(v === "none" ? "all" : v)}
            >
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Mês..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="none">Mês específico...</SelectItem>
                {lastTwelveMonths.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Separador visual */}
            <span className="text-muted-foreground/40 text-xs hidden sm:inline">|</span>
            {/* De e Até na mesma linha */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">De:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setDatePreset("all"); setPage(0); }}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">Até:</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setDatePreset("all"); setPage(0); }}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          {/* Limpar filtros */}
          {hasFilters && (
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={clearFilters}>
              <X className="w-3.5 h-3.5" />
              Limpar
            </Button>
          )}
        </div>

        {/* Tabela de orçamentos */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Carregando orçamentos...</div>
        ) : displayRows.length === 0 ? (
          <Card className="text-center py-16">
            <div className="flex flex-col items-center gap-4">
              <ClipboardList className="w-12 h-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Nenhum orçamento encontrado</h2>
              <p className="text-muted-foreground">
                {hasFilters
                  ? "Tente outros filtros de busca."
                  : "Crie seu primeiro orçamento no carrinho."}
              </p>
              {hasFilters ? (
                <Button variant="outline" onClick={clearFilters} className="gap-2">
                  <X className="w-4 h-4" />
                  Limpar filtros
                </Button>
              ) : (
                <Link href="/carrinho">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Ir para o Carrinho
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">
                {displayTotal} orçamento{displayTotal !== 1 ? "s" : ""} encontrado{displayTotal !== 1 ? "s" : ""}
                {hasFilters && <span className="ml-2 text-primary font-medium"><Filter className="w-3 h-3 inline mr-0.5" />Filtros ativos</span>}
              </div>
              {user.role === "admin" && (
                <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={exportFilteredQuotes} disabled={isExporting || exportRows.length === 0}>
                  <Download className="w-4 h-4" />
                  {isExporting ? "Gerando Excel..." : `Exportar Excel (${exportRows.length})`}
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {displayRows.map(q => {
                const st = STATUS_LABELS[q.status] ?? STATUS_LABELS.open;
                return (
                  <Card key={q.id} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4 flex-wrap">
                        {/* Número e status */}
                        <div className="flex-shrink-0">
                          <p className="font-mono font-bold text-primary text-sm">{q.quoteNumber}</p>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${st.color}`}>
                            {st.icon}
                            {st.label}
                          </span>
                          {(q as any).isDuplicate && (
                            <Badge variant="outline" className="mt-1 border-orange-300 text-orange-700 dark:text-orange-400">
                              Duplicado ({(q as any).duplicateGroupSize}x)
                            </Badge>
                          )}
                          {(q as any).isProspecting && (
                            <Badge variant="outline" className="mt-1 border-indigo-300 text-indigo-700 dark:text-indigo-400">
                              Prospecção LD
                            </Badge>
                          )}
                        </div>

                        {/* Dados principais */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{q.projectName || q.clientName}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            {q.clientName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{q.clientName}</span>}
                            {q.seller1Name && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {q.seller1Name}{q.seller2Name ? ` / ${q.seller2Name}` : ""}
                              </span>
                            )}
                            {q.assistantName && (
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                {q.assistantName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Valor e data */}
                        <div className="text-right flex-shrink-0">
                          {getDisplayedCustomerTotal(q) > 0 ? (
                            <p className="font-bold text-primary">{formatBRL(getDisplayedCustomerTotal(q))}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">A consultar</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="font-mono font-semibold text-foreground/70">RV{q.revisionCount ?? 0}</span> · v{q.currentVersion} · {toBrasiliaDate(q.createdAt)}
                          </p>
                        </div>

                        {/* Ação */}
                        <Link href={`/orcamentos/${q.id}`}>
                          <Button variant="outline" size="sm" className="gap-2 flex-shrink-0">
                            <Eye className="w-4 h-4" />
                            Ver
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Paginação */}
            {displayTotal > limit && (
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground self-center">
                  Página {page + 1} de {Math.ceil(displayTotal / limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(page + 1) * limit >= displayTotal}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
