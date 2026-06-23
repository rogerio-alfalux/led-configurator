import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Search, Plus, ClipboardList, CheckCircle, XCircle, Clock,
  TrendingDown, ArrowLeft, BarChart2, ShoppingCart, Eye,
  Users, UserCheck, Filter, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { formatBRL } from "@/lib/cartTypes";
import { toBrasiliaDate } from "@/lib/dateUtils";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Em Aberto", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "Aprovado", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: <CheckCircle className="w-3 h-3" /> },
  lost: { label: "Perdido", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: <TrendingDown className="w-3 h-3" /> },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: <XCircle className="w-3 h-3" /> },
};

export default function Quotes() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [assistantFilter, setAssistantFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = trpc.quotes.list.useQuery({
    search: search || undefined,
    status: status !== "all" ? (status as "open" | "approved" | "lost" | "cancelled") : undefined,
    seller1Name: sellerFilter !== "all" ? sellerFilter : undefined,
    assistantName: assistantFilter !== "all" ? assistantFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit,
    offset: page * limit,
  });

  // Buscar todos os orçamentos sem filtro para estatísticas e listas de vendedores/assistentes
  const { data: allData } = trpc.quotes.list.useQuery({ limit: 1000, offset: 0 });

  // Listas únicas de vendedores e assistentes
  const uniqueSellers = useMemo(() => {
    const names = new Set<string>();
    (allData?.rows ?? []).forEach(q => {
      if (q.seller1Name) names.add(q.seller1Name);
    });
    return Array.from(names).sort();
  }, [allData]);

  const uniqueAssistants = useMemo(() => {
    const names = new Set<string>();
    (allData?.rows ?? []).forEach(q => {
      if (q.assistantName) names.add(q.assistantName);
    });
    return Array.from(names).sort();
  }, [allData]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const rows = allData?.rows ?? [];
    const total = rows.length;
    const open = rows.filter(q => q.status === "open").length;
    const approved = rows.filter(q => q.status === "approved").length;
    const lost = rows.filter(q => q.status === "lost").length;
    // Usar totalFinal (inclui RT + margem + frete + DIFAL + FCP) com fallback para totalAmount
    const getQuoteValue = (q: typeof rows[0]) => Number(q.totalFinal) > 0 ? Number(q.totalFinal) : (Number(q.totalAmount) || 0);
    const totalValue = rows.reduce((sum, q) => sum + getQuoteValue(q), 0);
    const approvedValue = rows.filter(q => q.status === "approved").reduce((sum, q) => sum + getQuoteValue(q), 0);
    return { total, open, approved, lost, totalValue, approvedValue };
  }, [allData]);

  const hasFilters = status !== "all" || sellerFilter !== "all" || assistantFilter !== "all" || search.trim() !== "" || dateFrom !== "" || dateTo !== "";

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setSellerFilter("all");
    setAssistantFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

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

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground", icon: <ClipboardList className="w-4 h-4" /> },
            { label: "Em Aberto", value: stats.open, color: "text-blue-600", icon: <Clock className="w-4 h-4 text-blue-500" /> },
            { label: "Aprovados", value: stats.approved, color: "text-green-600", icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
            { label: "Perdidos", value: stats.lost, color: "text-red-600", icon: <TrendingDown className="w-4 h-4 text-red-500" /> },
            { label: "Valor Total", value: formatBRL(stats.totalValue), color: "text-primary", icon: <BarChart2 className="w-4 h-4 text-primary" /> },
            { label: "Aprovados R$", value: formatBRL(stats.approvedValue), color: "text-green-600", icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
          ].map(s => (
            <Card key={s.label} className="p-3">
              <div className="flex items-center gap-2 mb-1">
                {s.icon}
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
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
                <SelectItem key={s} value={s}>{s}</SelectItem>
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
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Data De */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">De:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(0); }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          {/* Data Até */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Até:</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(0); }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
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
        ) : rows.length === 0 ? (
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
            <div className="text-sm text-muted-foreground">
              {total} orçamento{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
              {hasFilters && <span className="ml-2 text-primary font-medium"><Filter className="w-3 h-3 inline mr-0.5" />Filtros ativos</span>}
            </div>
            <div className="space-y-2">
              {rows.map(q => {
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
                        </div>

                        {/* Dados principais */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{q.projectName || q.clientName}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            {q.clientName && <span>👤 {q.clientName}</span>}
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
                          {(q.totalFinal && Number(q.totalFinal) > 0) || (q.totalAmount && Number(q.totalAmount) > 0) ? (
                            <p className="font-bold text-primary">{formatBRL(Number(q.totalFinal) > 0 ? Number(q.totalFinal) : Number(q.totalAmount))}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">A consultar</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            v{q.currentVersion}{q.revisionCount != null && q.revisionCount > 0 && <span className="ml-1 text-[10px] text-amber-500 font-medium">• {q.revisionCount} rev.</span>} · {toBrasiliaDate(q.createdAt)}
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
            {total > limit && (
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
                  Página {page + 1} de {Math.ceil(total / limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(page + 1) * limit >= total}
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
