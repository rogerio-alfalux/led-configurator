import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, ClipboardList, TrendingUp, CheckCircle, Clock,
  TrendingDown, XCircle, DollarSign, Users, BarChart2, ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { formatBRL } from "@/lib/cartTypes";

function StatCard({
  title, value, sub, icon, color,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color.replace("text-", "bg-").replace("-600", "-100").replace("-400", "-900/30")}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RankingCard({
  title, rows, valueLabel,
}: {
  title: string;
  rows: { name: string; count: number; total: number }[];
  valueLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }
  const maxCount = Math.max(...rows.map(r => r.count), 1);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium truncate max-w-[60%]">
                <span className="text-muted-foreground mr-1">{i + 1}.</span>
                {r.name}
              </span>
              <span className="text-muted-foreground text-xs">
                {r.count} {valueLabel} · {formatBRL(r.total)}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(r.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"30" | "90" | "365" | "all">("30");

  const { data, isLoading } = trpc.quotes.stats.useQuery();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center p-8">
          <BarChart2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Faça login para continuar</h2>
          <Button asChild><a href={getLoginUrl()}>Entrar</a></Button>
        </Card>
      </div>
    );
  }

  const totals = data?.totals ?? {
    total: 0, open: 0, approved: 0, lost: 0, cancelled: 0,
    totalAmount: 0, approvedAmount: 0,
  };
  const topVendors = (data?.topVendors ?? []).map(v => ({
    name: v.name ?? "(sem nome)",
    count: Number(v.count),
    total: Number(v.amount ?? 0),
  }));
  const topAssistants = (data?.topAssistants ?? []).map(a => ({
    name: a.name ?? "(sem nome)",
    count: Number(a.count),
    total: 0,
  }));
  const conversionRate = totals.total > 0 ? (totals.approved / totals.total) * 100 : 0;

  const periodLabel = {
    "30": "últimos 30 dias",
    "90": "últimos 90 dias",
    "365": "último ano",
    "all": "todo o período",
  }[period] ?? "todo o período";

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
          <Link href="/orcamentos">
            <Button variant="ghost" size="sm" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Orçamentos
            </Button>
          </Link>
          <Link href="/carrinho">
            <Button variant="ghost" size="sm" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Carrinho
            </Button>
          </Link>
          <BarChart2 className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Filtro de período */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold">Indicadores de Orçamentos</h2>
            <p className="text-sm text-muted-foreground">Dados dos {periodLabel}</p>
          </div>
          <Select value={period} onValueChange={v => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Carregando indicadores...</div>
        ) : (
          <>
            {/* KPIs principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total de Orçamentos"
                value={totals.total}
                icon={<ClipboardList className="w-5 h-5" />}
                color="text-primary"
              />
              <StatCard
                title="Valor Total Orçado"
                value={formatBRL(Number(totals.totalAmount ?? 0))}
                sub="soma de todos os orçamentos"
                icon={<DollarSign className="w-5 h-5" />}
                color="text-blue-600 dark:text-blue-400"
              />
              <StatCard
                title="Valor Aprovado"
                value={formatBRL(Number(totals.approvedAmount ?? 0))}
                sub={`${totals.approved} orçamento${totals.approved !== 1 ? "s" : ""}`}
                icon={<TrendingUp className="w-5 h-5" />}
                color="text-green-600 dark:text-green-400"
              />
              <StatCard
                title="Taxa de Conversão"
                value={`${conversionRate.toFixed(1)}%`}
                sub="aprovados / total"
                icon={<CheckCircle className="w-5 h-5" />}
                color={conversionRate >= 30 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}
              />
            </div>

            {/* Status breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-blue-200 dark:border-blue-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Em Aberto</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{totals.open}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 dark:border-green-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Aprovados</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{totals.approved}</p>
                    {Number(totals.approvedAmount ?? 0) > 0 && (
                      <p className="text-xs text-muted-foreground">{formatBRL(Number(totals.approvedAmount))}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Perdidos</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">{totals.lost}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <XCircle className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cancelados</p>
                    <p className="text-xl font-bold text-gray-500">{totals.cancelled}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Rankings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RankingCard
                title="Vendedores que mais orçam"
                rows={topVendors}
                valueLabel="orçamentos"
              />
              <RankingCard
                title="Assistentes que mais orçam"
                rows={topAssistants}
                valueLabel="orçamentos"
              />
            </div>

            {/* Link para lista de orçamentos */}
            <div className="flex justify-center pt-2">
              <Link href="/orcamentos">
                <Button variant="outline" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Ver todos os orçamentos
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
