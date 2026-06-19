import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, ClipboardList, CheckCircle, DollarSign, BarChart2, Target,
  Award, Percent, Edit2, Save, X, ShieldAlert, ChevronDown, ChevronUp, Coins,
  Users, FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { generateSalesReport, type SalesReportRow } from "@/lib/salesReportGenerator";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { formatBRL } from "@/lib/cartTypes";
import { toast } from "sonner";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MANAGER_EMAILS_FRONTEND = [
  "daniel@grupoalfalux.com.br",
  "dennis@grupoalfalux.com.br",
  "vivian@grupoalfalux.com.br",
];

function isManagerOrAdmin(user: { role?: string | null; email?: string | null } | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "gerente") return true;
  const email = user.email?.toLowerCase() ?? "";
  return MANAGER_EMAILS_FRONTEND.includes(email);
}

function isAssistant(user: { role?: string | null } | null | undefined): boolean {
  return user?.role === "assistente";
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ title, value, sub, icon, color }: {
  title: string; value: string | number; sub?: string; icon: React.ReactNode; color: string;
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
          <div className="p-2 rounded-lg bg-muted">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── ProgressBar de meta ──────────────────────────────────────────────────────
function GoalProgress({ label, current, goal }: {
  label: string; current: number; goal: number;
}) {
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const over = goal > 0 && current > goal;
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className={over ? "text-green-600 dark:text-green-400 font-bold" : "text-muted-foreground"}>
            {pct.toFixed(1)}%{over && " ✓"}
          </span>
        </div>
      )}
      {!label && (
        <div className="flex justify-end text-xs">
          <span className={over ? "text-green-600 dark:text-green-400 font-bold" : "text-muted-foreground"}>
            {pct.toFixed(1)}%{over && " ✓"}
          </span>
        </div>
      )}
      <Progress value={pct} className="h-2" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatBRL(current)}</span>
        <span>Meta: {formatBRL(goal)}</span>
      </div>
    </div>
  );
}

// ─── Ranking row ──────────────────────────────────────────────────────────────
function RankRow({ rank, name, value, sub, highlight = false }: {
  rank: number; name: string; value: string; sub?: string; highlight?: boolean;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${highlight ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800" : "hover:bg-muted/50"}`}>
      <span className="text-lg w-6 text-center shrink-0">{medals[rank - 1] ?? `${rank}°`}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{name || "—"}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <span className="text-sm font-bold text-right shrink-0">{value}</span>
    </div>
  );
}

// ─── Editor de meta ───────────────────────────────────────────────────────────
function GoalEditor({ year, month, currentValue, onSave }: {
  year: number; month: number | null; currentValue: number; onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(currentValue));

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{formatBRL(currentValue)}</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { setVal(String(currentValue)); setEditing(true); }}>
          <Edit2 className="w-3 h-3" />Editar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        value={val}
        onChange={e => setVal(e.target.value)}
        className="h-7 w-40 text-sm"
        autoFocus
        onKeyDown={e => {
          if (e.key === "Enter") { onSave(val); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button size="sm" className="h-7 text-xs" onClick={() => { onSave(val); setEditing(false); }}>
        <Save className="w-3 h-3 mr-1" />Salvar
      </Button>
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAllCommissions, setShowAllCommissions] = useState(false);
  const [showAllRt, setShowAllRt] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const [reportMonth, setReportMonth] = useState(currentMonth);

  const utils = trpc.useUtils();

  const isManager = isManagerOrAdmin(user);
  const isAssist = isAssistant(user);

  // Quando filtro de data está ativo, ignorar ano/mês
  const hasDateRange = !!(dateFrom && dateTo);
  const queryInput = hasDateRange
    ? { year, dateFrom, dateTo }
    : { year, month };

  // Dados para gerentes/admins
  const { data: managerData, isLoading: managerLoading } = trpc.dashboard.managerData.useQuery(
    queryInput,
    { enabled: !!user && isManager }
  );

  // Dados do próprio vendedor
  const { data: sellerData, isLoading: sellerLoading } = trpc.dashboard.sellerData.useQuery(
    queryInput,
    { enabled: !!user && !isManager && !isAssist }
  );

  // Metas (visíveis para todos exceto assistentes)
  const { data: goalsData = [] } = trpc.dashboard.goals.useQuery(
    { year },
    { enabled: !!user && !isAssist }
  );

  const upsertGoalMutation = trpc.dashboard.upsertGoal.useMutation({
    onSuccess: () => {
      utils.dashboard.goals.invalidate({ year });
      utils.dashboard.managerData.invalidate({ year, month });
      toast.success("Meta salva com sucesso!");
    },
    onError: (err) => toast.error(`Erro ao salvar meta: ${err.message}`),
  });

  const handleSaveGoal = (goalYear: number, goalMonth: number | null, value: string) => {
    const amount = parseFloat(value.replace(",", "."));
    if (isNaN(amount) || amount < 0) { toast.error("Valor inválido"); return; }
    upsertGoalMutation.mutate({ year: goalYear, month: goalMonth, goalAmount: amount.toFixed(2) });
  };

  // Calcular progresso anual (sempre total do ano, independente do filtro de mês)
  const annualApproved = useMemo(() => {
    if (isManager && managerData?.monthlyProgress) {
      return managerData.monthlyProgress.reduce((s, m) => s + Number(m.amount ?? 0), 0);
    }
    if (!isManager && sellerData?.monthlyProgress) {
      return sellerData.monthlyProgress.reduce((s, m) => s + Number(m.amount ?? 0), 0);
    }
    return 0;
  }, [isManager, managerData, sellerData]);

  const annualGoal = goalsData.find(g => g.month == null);

  const isLoading = authLoading || (isManager ? managerLoading : (!isAssist && sellerLoading));

  // ── Render: não logado ────────────────────────────────────────────────────
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center p-8">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground mb-6">Faça login para acessar o dashboard.</p>
          <a href={getLoginUrl()}><Button>Entrar</Button></a>
        </Card>
      </div>
    );
  }

  // ── Render: assistente ────────────────────────────────────────────────────
  if (!authLoading && isAssist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center p-8">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Acesso não autorizado</h2>
          <p className="text-sm text-muted-foreground mb-6">Assistentes não têm acesso ao dashboard.</p>
          <Link href="/"><Button variant="outline">Voltar ao início</Button></Link>
        </Card>
      </div>
    );
  }

  const commissions = managerData?.commissionBySeller ?? [];
  const rtRanking = managerData?.rtRanking ?? [];
  const salesRanking = managerData?.salesRanking ?? [];

  const visibleCommissions = showAllCommissions ? commissions : commissions.slice(0, 5);
  const visibleRt = showAllRt ? rtRanking : rtRanking.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Início
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <BarChart2 className="w-5 h-5 text-primary shrink-0" />
            <h1 className="text-sm font-semibold">Dashboard</h1>
            {isManager && (
              <Badge variant="outline" className="text-xs text-primary border-primary">
                {user?.role === "admin" ? "Admin" : "Gerência"}
              </Badge>
            )}
          </div>
          {/* Filtros de período */}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Filtro de data livre */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">De</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => {
                  setDateFrom(e.target.value);
                  if (e.target.value) { setMonth(undefined); }
                }}
                className="h-8 px-2 text-sm rounded-md border border-input bg-background text-foreground"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Até</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => {
                  setDateTo(e.target.value);
                  if (e.target.value) { setMonth(undefined); }
                }}
                className="h-8 px-2 text-sm rounded-md border border-input bg-background text-foreground"
              />
            </div>
            {hasDateRange && (
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="h-8 px-2 text-xs rounded-md border border-input bg-background text-muted-foreground hover:text-foreground"
              >
                × Limpar
              </button>
            )}
            {/* Filtro de ano/mês (desabilitado quando há range de data) */}
            {!hasDateRange && (
              <>
                <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                  <SelectTrigger className="h-8 w-24 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={month ? String(month) : "all"} onValueChange={v => setMonth(v === "all" ? undefined : Number(v))}>
                  <SelectTrigger className="h-8 w-36 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Ano todo</SelectItem>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">Carregando dados...</div>
        )}

        {!isLoading && (
          <>
            {/* ── Metas de Faturamento (visível para todos exceto assistentes) ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Metas de Faturamento — {year}
                  </CardTitle>
                  {user?.role === "admin" && (
                    <Badge variant="outline" className="text-xs">Editável por você</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Meta anual */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-sm font-semibold">Meta Anual</Label>
                    {user?.role === "admin" && (
                      <GoalEditor
                        year={year}
                        month={null}
                        currentValue={Number(annualGoal?.goalAmount ?? 0)}
                        onSave={v => handleSaveGoal(year, null, v)}
                      />
                    )}
                  </div>
                  {annualGoal ? (
                    <GoalProgress
                      label={`Faturado em ${year}`}
                      current={annualApproved}
                      goal={Number(annualGoal.goalAmount)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {user?.role === "admin"
                        ? "Nenhuma meta anual definida. Clique em Editar para definir."
                        : "Meta anual não definida."}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Metas mensais */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Metas Mensais</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {MONTHS.map((mLabel, i) => {
                      const mNum = i + 1;
                      const goal = goalsData.find(g => g.month === mNum);
                      const progress = isManager
                        ? managerData?.monthlyProgress?.find(p => Number(p.month) === mNum)
                        : sellerData?.monthlyProgress?.find(p => Number(p.month) === mNum);
                      const currentAmt = Number(progress?.amount ?? 0);
                      const goalAmt = Number(goal?.goalAmount ?? 0);
                      const isCurrentMonth = mNum === currentMonth && year === currentYear;

                      return (
                        <div key={mNum} className={`p-3 rounded-lg border ${isCurrentMonth ? "border-primary bg-primary/5" : "border-border"}`}>
                          <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                            <span className={`text-xs font-semibold ${isCurrentMonth ? "text-primary" : "text-muted-foreground"}`}>
                              {mLabel}
                              {isCurrentMonth && <span className="ml-1">●</span>}
                            </span>
                            {user?.role === "admin" && (
                              <GoalEditor
                                year={year}
                                month={mNum}
                                currentValue={goalAmt}
                                onSave={v => handleSaveGoal(year, mNum, v)}
                              />
                            )}
                          </div>
                          {goalAmt > 0 ? (
                            <GoalProgress label="" current={currentAmt} goal={goalAmt} />
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              {formatBRL(currentAmt)} faturado
                              {user?.role !== "admin" && " · sem meta"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Seção exclusiva para gerentes/admins ─────────────────────── */}
            {isManager && (
              <>
                {/* Totais do período */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    title="Orçamentos Aprovados"
                    value={Number(managerData?.periodTotals?.approvedCount ?? 0)}
                    sub={hasDateRange ? `${dateFrom} a ${dateTo}` : month ? MONTHS[month - 1] : `Ano ${year}`}
                    icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                    color="text-green-600 dark:text-green-400"
                  />
                  <StatCard
                    title="Faturamento Aprovado"
                    value={formatBRL(Number(managerData?.periodTotals?.approvedAmount ?? 0))}
                    sub="valor total final"
                    icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                    color="text-blue-600 dark:text-blue-400"
                  />
                  <StatCard
                    title="Total Comissões"
                    value={formatBRL(commissions.reduce((s, c) => s + Number(c.totalCommission ?? 0), 0))}
                    sub="soma de todos os vendedores"
                    icon={<Coins className="w-5 h-5 text-amber-600" />}
                    color="text-amber-600 dark:text-amber-400"
                  />
                  <StatCard
                    title="Total RT"
                    value={formatBRL(rtRanking.reduce((s, r) => s + Number(r.totalRt ?? 0), 0))}
                    sub="soma de todos os destinatários"
                    icon={<Percent className="w-5 h-5 text-purple-600" />}
                    color="text-purple-600 dark:text-purple-400"
                  />
                </div>

                {/* Comissões por vendedor + Ranking de vendas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Comissões */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-600" />
                        Comissões por Vendedor
                        <Badge variant="outline" className="text-xs ml-auto text-amber-700 border-amber-300">Confidencial</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {commissions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado no período</p>
                      ) : (
                        <>
                          {visibleCommissions.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50">
                              <span className="text-sm w-5 text-center text-muted-foreground shrink-0">{i + 1}°</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{c.sellerName || "—"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {Number(c.count)} orç. · {formatBRL(Number(c.totalAmount ?? 0))} faturado
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                  {formatBRL(Number(c.totalCommission ?? 0))}
                                </p>
                                <p className="text-xs text-muted-foreground">comissão</p>
                              </div>
                            </div>
                          ))}
                          {commissions.length > 5 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs mt-1"
                              onClick={() => setShowAllCommissions(v => !v)}
                            >
                              {showAllCommissions
                                ? <><ChevronUp className="w-3 h-3 mr-1" />Mostrar menos</>
                                : <><ChevronDown className="w-3 h-3 mr-1" />Ver todos ({commissions.length})</>}
                            </Button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Ranking de vendas */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Award className="w-4 h-4 text-blue-600" />
                        Ranking de Vendas
                        <Badge variant="outline" className="text-xs ml-auto text-blue-700 border-blue-300">Confidencial</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {salesRanking.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado no período</p>
                      ) : (
                        salesRanking.slice(0, 8).map((s, i) => (
                          <RankRow
                            key={i}
                            rank={i + 1}
                            name={s.sellerName || "—"}
                            value={formatBRL(Number(s.totalAmount ?? 0))}
                            sub={`${Number(s.count)} orçamento${Number(s.count) !== 1 ? "s" : ""} aprovado${Number(s.count) !== 1 ? "s" : ""}`}
                            highlight={i === 0}
                          />
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Ranking RT */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Percent className="w-4 h-4 text-purple-600" />
                      Ranking de RT (Retorno de Tabela)
                      <Badge variant="outline" className="text-xs ml-auto text-purple-700 border-purple-300">Confidencial</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {rtRanking.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum RT registrado no período</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {visibleRt.map((r, i) => (
                            <RankRow
                              key={i}
                              rank={i + 1}
                              name={r.dest}
                              value={formatBRL(Number(r.totalRt ?? 0))}
                              sub={`${r.count} orçamento${r.count !== 1 ? "s" : ""}`}
                              highlight={i === 0}
                            />
                          ))}
                        </div>
                        {rtRanking.length > 5 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs mt-2"
                            onClick={() => setShowAllRt(v => !v)}
                          >
                            {showAllRt
                              ? <><ChevronUp className="w-3 h-3 mr-1" />Mostrar menos</>
                              : <><ChevronDown className="w-3 h-3 mr-1" />Ver todos ({rtRanking.length})</>}
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── Seção para vendedores (não gerentes) ─────────────────────── */}
            {!isManager && !isAssist && (
              <>
                {sellerData ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                      title="Orçamentos Aprovados"
                      value={Number(sellerData.totals?.approvedCount ?? 0)}
                      sub={hasDateRange ? `${dateFrom} a ${dateTo}` : month ? MONTHS[month - 1] : `Ano ${year}`}
                      icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                      color="text-green-600 dark:text-green-400"
                    />
                    <StatCard
                      title="Faturamento"
                      value={formatBRL(Number(sellerData.totals?.approvedAmount ?? 0))}
                      sub="valor total aprovado"
                      icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                      color="text-blue-600 dark:text-blue-400"
                    />
                    <StatCard
                      title="Comissão a Receber"
                      value={formatBRL(Number(sellerData.totals?.totalCommission ?? 0))}
                      sub="baseado nos aprovados"
                      icon={<Coins className="w-5 h-5 text-amber-600" />}
                      color="text-amber-600 dark:text-amber-400"
                    />
                  </div>
                ) : (
                  <Card className="text-center py-8">
                    <CardContent>
                      <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Seu e-mail não está vinculado a nenhum vendedor cadastrado.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Solicite ao administrador que vincule seu e-mail ao seu cadastro de vendedor.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Progresso mensal do vendedor */}
                {sellerData && sellerData.monthlyProgress.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Meu Desempenho Mensal — {year}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sellerData.monthlyProgress.map(mp => (
                          <div key={mp.month} className="p-3 rounded-lg border border-border">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              {MONTHS[(Number(mp.month) ?? 1) - 1]}
                            </p>
                            <p className="text-sm font-bold">{formatBRL(Number(mp.amount ?? 0))}</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              Comissão: {formatBRL(Number(mp.commission ?? 0))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {Number(mp.count)} orç. aprovado{Number(mp.count) !== 1 ? "s" : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Exportar relatório mensal (somente gerentes/admins) */}
            {isManager && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileDown className="w-4 h-4 text-green-600" />
                    Exportar Relatório Mensal de Vendas
                    <Badge variant="outline" className="text-xs ml-auto text-green-700 border-green-300">Excel</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                      <SelectTrigger className="h-8 w-24 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(reportMonth)} onValueChange={v => setReportMonth(Number(v))}>
                      <SelectTrigger className="h-8 w-36 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="gap-2 bg-green-700 hover:bg-green-800 text-white"
                      disabled={exportingReport}
                      onClick={async () => {
                        setExportingReport(true);
                        try {
                          const data = await utils.client.dashboard.monthlyReport.query({ year, month: reportMonth });
                          await generateSalesReport(data as SalesReportRow[], year, reportMonth);
                          toast.success(`Relatório ${MONTHS[reportMonth - 1]} ${year} exportado!`);
                        } catch (err: unknown) {
                          toast.error(`Erro ao exportar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
                        } finally {
                          setExportingReport(false);
                        }
                      }}
                    >
                      <FileDown className="w-4 h-4" />
                      {exportingReport ? 'Gerando...' : 'Exportar Excel'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Exporta todos os orçamentos aprovados do mês com comissões por vendedor e destinatários de RT.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Link para orçamentos */}
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
