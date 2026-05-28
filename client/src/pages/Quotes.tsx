import { useState } from "react";
import { Link } from "wouter";
import {
  Search, Plus, ClipboardList, CheckCircle, XCircle, Clock,
  TrendingDown, ArrowLeft, BarChart2, ShoppingCart, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { formatBRL } from "@/lib/cartTypes";

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
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = trpc.quotes.list.useQuery({
    search: search || undefined,
    status: status !== "all" ? (status as "open" | "approved" | "lost" | "cancelled") : undefined,
    limit,
    offset: page * limit,
  });

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

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente, vendedor ou projeto..."
              className="pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
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
                {search || status !== "all"
                  ? "Tente outros filtros de busca."
                  : "Crie seu primeiro orçamento no carrinho."}
              </p>
              <Link href="/carrinho">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Ir para o Carrinho
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              {total} orçamento{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
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
                          <p className="font-semibold truncate">{q.clientName}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            {q.projectName && <span>📍 {q.projectName}</span>}
                            {q.vendorName && <span>👤 {q.vendorName}</span>}
                            {q.assistantName && <span>✏️ {q.assistantName}</span>}
                          </div>
                        </div>

                        {/* Valor e data */}
                        <div className="text-right flex-shrink-0">
                          {q.totalAmount && Number(q.totalAmount) > 0 ? (
                            <p className="font-bold text-primary">{formatBRL(Number(q.totalAmount))}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">A consultar</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            v{q.currentVersion} · {new Date(q.createdAt).toLocaleDateString("pt-BR")}
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
