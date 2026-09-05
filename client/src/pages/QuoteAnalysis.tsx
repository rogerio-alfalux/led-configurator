import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/usePermissions";
import { formatBRL } from "@/lib/cartTypes";
import { buildQuoteAnalysis, quoteAnalysisSortOptions, sortQuoteAnalysisItems, type QuoteAnalysisSort } from "@/lib/quoteAnalysis";
import { toBrasiliaDateTimeShort } from "@/lib/dateUtils";
import { trpc } from "@/lib/trpc";
import { PERMISSIONS } from "@shared/permissions";
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowLeft,
  BarChart3,
  CircleDollarSign,
  DollarSign,
  Layers3,
  Package,
  Percent,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";

type AnalysisItem = ReturnType<typeof buildQuoteAnalysis>["items"][number];

function formatPercent(value: number | null, digits = 1) {
  return value === null || !Number.isFinite(value)
    ? "—"
    : `${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

function AnalysisMetric({
  title,
  value,
  detail,
  icon,
  className = "",
}: {
  title: string;
  value: string;
  detail?: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="mt-1 text-lg font-bold tracking-tight">{value}</p>
            {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
          </div>
          <div className="rounded-md bg-muted p-2 text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ItemHighlight({
  title,
  item,
  type,
}: {
  title: string;
  item: ReturnType<typeof buildQuoteAnalysis>["highestValueItem"];
  type: "value" | "margin" | "cost";
}) {
  if (!item) {
    return (
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">Não há item elegível neste orçamento.</p>
      </div>
    );
  }

  const emphasis = type === "margin"
    ? formatPercent(item.grossMarginPercent)
    : type === "cost"
      ? formatBRL(item.cost ?? 0)
      : formatBRL(item.revenue);
  const caption = type === "value"
    ? `${formatPercent(item.quoteSharePercent)} do total do orçamento`
    : type === "margin"
      ? `${formatBRL(item.grossProfit ?? 0)} de lucro bruto estimado`
      : `${formatPercent(item.quoteSharePercent)} do total do orçamento`;

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">#{item.itemNumber} · {item.description}</p>
      <p className="mt-2 text-lg font-bold text-primary">{emphasis}</p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

function AnalysisItemCard({ item }: { item: AnalysisItem }) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className="grid gap-4 p-4 sm:grid-cols-[128px_minmax(0,1fr)]">
          <div className="flex h-28 w-32 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 p-2">
            {item.photoUrl ? (
              <img src={item.photoUrl} alt={`Foto do item ${item.itemNumber}`} className="h-full w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground"><Package className="h-7 w-7" /><span className="text-[10px] uppercase tracking-wide">Sem foto</span></div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Item {item.itemNumber}</p>
                <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">{item.description}</h3>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{item.sku}</p>
              </div>
              <div className="rounded-md bg-primary/10 px-2.5 py-1 text-right text-primary">
                <p className="text-[10px] font-medium uppercase tracking-wide">Participação</p>
                <p className="text-sm font-bold tabular-nums">{formatPercent(item.quoteSharePercent)}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 text-sm sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Quantidade</p><p className="mt-0.5 font-semibold tabular-nums">{item.quantity.toLocaleString("pt-BR")}</p></div>
              <div><p className="text-xs text-muted-foreground">Valor unitário</p><p className="mt-0.5 font-semibold tabular-nums">{formatBRL(item.unitRevenue)}</p></div>
              <div><p className="text-xs text-muted-foreground">Receita do item</p><p className="mt-0.5 font-semibold tabular-nums">{formatBRL(item.revenue)}</p></div>
              <div><p className="text-xs text-muted-foreground">Custo</p><p className="mt-0.5 font-semibold tabular-nums">{item.cost === null ? "A confirmar" : formatBRL(item.cost)}</p></div>
              <div><p className="text-xs text-muted-foreground">Lucro bruto</p><p className="mt-0.5 font-semibold tabular-nums">{item.grossProfit === null ? "—" : formatBRL(item.grossProfit)}</p></div>
              <div><p className="text-xs text-muted-foreground">Margem bruta</p><p className={`mt-0.5 font-semibold tabular-nums ${item.grossMarginPercent !== null && item.grossMarginPercent < 0 ? "text-red-600" : ""}`}>{formatPercent(item.grossMarginPercent)}</p></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function QuoteAnalysis() {
  const { id } = useParams<{ id: string }>();
  const quoteId = Number(id);
  const [itemSort, setItemSort] = useState<QuoteAnalysisSort>("valueDesc");
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canAccess = user?.role === "custos" || hasPermission(PERMISSIONS.VER_CUSTOS);
  const quoteQuery = trpc.quotes.getById.useQuery(
    { id: quoteId },
    { enabled: Number.isFinite(quoteId) },
  );
  const costQuery = trpc.quotes.calculateCost.useQuery(
    { quoteId },
    { enabled: canAccess && Number.isFinite(quoteId) },
  );
  const additionalCostsQuery = trpc.quoteAdditionalCosts.list.useQuery(
    { quoteId },
    { enabled: canAccess && Number.isFinite(quoteId) },
  );

  const analysis = useMemo(() => {
    const data = quoteQuery.data as any;
    const currentVersionId = data?.versions?.[0]?.id;
    const activeItems = (data?.items ?? []).filter((item: any) => item.quoteVersionId === currentVersionId);
    if (!data?.quote) return null;
    return buildQuoteAnalysis({
      quote: data.quote,
      items: activeItems,
      costItems: costQuery.data?.items ?? [],
      additionalCosts: additionalCostsQuery.data ?? [],
    });
  }, [quoteQuery.data, costQuery.data, additionalCostsQuery.data]);

  const sortedItems = useMemo(
    () => analysis ? sortQuoteAnalysisItems(analysis.items, itemSort) : [],
    [analysis, itemSort],
  );

  if (!canAccess) {
    return (
      <main className="container max-w-3xl py-8">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <div>
              <h1 className="font-semibold">Análise financeira restrita</h1>
              <p className="mt-1 text-sm text-muted-foreground">Seu perfil não possui permissão para visualizar custos e margens deste orçamento.</p>
            </div>
            <Link href={`/orcamentos/${id}`}><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao orçamento</Button></Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (quoteQuery.isLoading) {
    return <main className="container max-w-7xl py-8 text-sm text-muted-foreground">Carregando análise financeira do orçamento…</main>;
  }

  if (quoteQuery.error || !quoteQuery.data?.quote || !analysis) {
    return (
      <main className="container max-w-3xl py-8">
        <Card className="border-destructive/30"><CardContent className="p-6"><p className="font-medium">Não foi possível carregar a análise deste orçamento.</p><Link href="/orcamentos"><Button className="mt-4" variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Voltar aos orçamentos</Button></Link></CardContent></Card>
      </main>
    );
  }

  const quote = quoteQuery.data.quote as any;
  const hasIncompleteCost = analysis.missingCostItemCount > 0;
  const visibleDeductions = [
    ["Impostos operacionais (12%)", analysis.deductions.standardTaxes],
    ["Comissões", analysis.deductions.commissions],
    ["RT", analysis.deductions.rt],
    ["DIFAL/FCP", analysis.deductions.difalFcp],
    ["Frete dedicado", analysis.deductions.freight],
    ["Custos adicionais", analysis.additionalCost],
  ].filter(([, value]) => Number(value) > 0) as Array<[string, number]>;

  return (
    <main className="container max-w-7xl py-6 pb-12">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/orcamentos/${quoteId}`} className="mb-3 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="mr-1 h-4 w-4" />Voltar ao orçamento</Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h1 className="text-2xl font-bold tracking-tight">Análise do Orçamento</h1><span className="font-mono text-sm font-semibold text-primary">{quote.quoteNumber}</span></div>
          <p className="mt-1 text-sm text-muted-foreground">{quote.projectName || quote.clientName || "Orçamento sem identificação de obra"} · revisão RV{quote.revisionCount ?? 0} · atualizado em {toBrasiliaDateTimeShort(quote.updatedAt ?? quote.createdAt)}</p>
        </div>
        <Link href={`/orcamentos/${quoteId}`}><Button variant="outline"><ReceiptText className="mr-2 h-4 w-4" />Abrir orçamento</Button></Link>
      </header>

      {hasIncompleteCost && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <p>Existem <strong>{analysis.missingCostItemCount} {analysis.missingCostItemCount === 1 ? "item sem custo confirmado" : "itens sem custo confirmado"}</strong>. Margens, lucro e contribuição consolidada ficam indisponíveis até que todos os custos sejam definidos.</p>
        </div>
      )}
      {(costQuery.isFetching || additionalCostsQuery.isFetching) && <p className="mb-4 text-xs text-muted-foreground">Atualizando custos e encargos para a análise financeira…</p>}

      <Tabs defaultValue="visao-geral" className="gap-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max min-w-full sm:min-w-0">
            <TabsTrigger value="visao-geral" className="px-4">Visão geral</TabsTrigger>
            <TabsTrigger value="contribuicao" className="px-4">Margem de contribuição</TabsTrigger>
            <TabsTrigger value="itens" className="px-4">Itens ({analysis.itemCount})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visao-geral" className="mt-0 space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AnalysisMetric title="Valor total" value={formatBRL(analysis.quoteTotal)} detail="Valor final ao cliente" icon={<CircleDollarSign className="h-5 w-5" />} />
            <AnalysisMetric title="Custo dos produtos" value={formatBRL(analysis.productCost)} detail={`${analysis.knownCostItemCount} de ${analysis.itemCount} itens com custo identificado`} icon={<Package className="h-5 w-5" />} />
            <AnalysisMetric title="Lucro bruto" value={analysis.grossProfit === null ? "A confirmar" : formatBRL(analysis.grossProfit)} detail={`${formatPercent(analysis.grossMarginPercent)} de margem bruta`} icon={<TrendingUp className="h-5 w-5" />} className="border-blue-200" />
            <AnalysisMetric title="Lucro líquido" value={analysis.netProfit === null ? "A confirmar" : formatBRL(analysis.netProfit)} detail={`${formatPercent(analysis.netMarginPercent)} de margem líquida`} icon={<TrendingDown className="h-5 w-5" />} className="border-emerald-200" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-primary" />Participação financeira dos itens</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm"><span><strong>{analysis.itemCount}</strong> itens</span><span><strong>{analysis.unitCount.toLocaleString("pt-BR")}</strong> unidades</span><span><strong>{formatPercent(analysis.topThreeSharePercent)}</strong> concentrado nos 3 maiores itens</span></div>
                <div className="space-y-3 pt-1">
                  {analysis.items.slice(0, 6).map((item) => (
                    <div key={item.itemNumber}>
                      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium">#{item.itemNumber} · {item.description}</span><span className="shrink-0 font-semibold text-primary">{formatPercent(item.quoteSharePercent)}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(item.quoteSharePercent, 100)}%` }} /></div>
                      <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{item.sku}</span><span>{formatBRL(item.revenue)}</span></div>
                    </div>
                  ))}
                </div>
                {analysis.nonItemAmount > 0.01 && <p className="border-t pt-3 text-xs text-muted-foreground">Itens representam {formatPercent(analysis.itemsRevenue / analysis.quoteTotal * 100)} do total. A diferença de {formatBRL(analysis.nonItemAmount)} corresponde a encargos comerciais destacados, como frete e DIFAL/FCP.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Layers3 className="h-4 w-4 text-primary" />Destaques do orçamento</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <ItemHighlight title="Maior valor agregado" item={analysis.highestValueItem} type="value" />
                <ItemHighlight title="Menor valor agregado" item={analysis.lowestValueItem} type="value" />
                <ItemHighlight title="Maior margem bruta" item={analysis.highestMarginItem} type="margin" />
                <ItemHighlight title="Menor margem bruta" item={analysis.lowestMarginItem} type="margin" />
                <ItemHighlight title="Maior impacto de custo" item={analysis.highestCostItem} type="cost" />
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="contribuicao" className="mt-0 space-y-5">
          <Card className="overflow-hidden border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20">
            <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.3fr_0.8fr_0.8fr] lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300"><CircleDollarSign className="h-5 w-5" /><h2 className="font-semibold">Margem de contribuição</h2></div>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Resultado disponível para cobrir os custos fixos após custos dos produtos, custos adicionais, impostos operacionais, comissões, RT, DIFAL/FCP e frete.</p>
                {analysis.contributionMargin === null && <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">A confirmação depende da definição de todos os custos dos itens.</p>}
              </div>
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contribuição deste orçamento</p><p className="mt-1 text-2xl font-bold tracking-tight text-emerald-800 dark:text-emerald-300">{analysis.contributionMargin === null ? "A confirmar" : formatBRL(analysis.contributionMargin)}</p><p className="mt-1 text-xs text-muted-foreground">{formatPercent(analysis.contributionMarginPercent)} da receita final</p></div>
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cobertura de custos fixos</p><p className="mt-1 text-2xl font-bold tracking-tight">{formatPercent(analysis.fixedCostCoveragePercent, 2)}</p><p className="mt-1 text-xs text-muted-foreground">sobre a referência mensal de {formatBRL(analysis.monthlyFixedCostReference)}</p>{analysis.fixedCostAmountRemaining !== null && <p className="mt-2 text-xs font-medium text-muted-foreground">{analysis.fixedCostAmountRemaining >= 0 ? `Restam ${formatBRL(analysis.fixedCostAmountRemaining)} para cobrir.` : `Excedente de ${formatBRL(Math.abs(analysis.fixedCostAmountRemaining))} após cobertura.`}</p>}</div>
            </CardContent>
            <div className="h-1.5 bg-emerald-100 dark:bg-emerald-950"><div className="h-full bg-emerald-600 transition-[width] duration-200" style={{ width: `${Math.min(100, Math.max(0, analysis.fixedCostCoveragePercent ?? 0))}%` }} /></div>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-4 w-4 text-primary" />Composição financeira</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Receita final</span><strong>{formatBRL(analysis.quoteTotal)}</strong></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custo dos produtos</span><span>−{formatBRL(analysis.productCost)}</span></div>
              {visibleDeductions.map(([label, value]) => <div key={label} className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span>−{formatBRL(value)}</span></div>)}
              <div className="mt-3 border-t pt-3"><div className="flex justify-between text-sm font-semibold"><span>Margem de contribuição</span><span className={analysis.contributionMargin !== null && analysis.contributionMargin >= 0 ? "text-emerald-700" : "text-muted-foreground"}>{analysis.contributionMargin === null ? "A confirmar" : formatBRL(analysis.contributionMargin)}</span></div></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="itens" className="mt-0">
          <Card>
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div><CardTitle className="flex items-center gap-2 text-base"><Percent className="h-4 w-4 text-primary" />Itens do orçamento</CardTitle><p className="mt-1 text-xs text-muted-foreground">A ordenação é exclusiva desta tela e não altera a revisão, o preview, o PDF ou o Excel.</p></div>
              <div className="flex items-center gap-2"><ArrowDownUp className="h-4 w-4 text-muted-foreground" /><Select value={itemSort} onValueChange={(value) => setItemSort(value as QuoteAnalysisSort)}><SelectTrigger aria-label="Ordenar itens da análise" className="min-w-[190px]"><SelectValue /></SelectTrigger><SelectContent>{quoteAnalysisSortOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
            </CardHeader>
            <CardContent className="grid gap-4 border-t p-4 lg:grid-cols-2">
              {sortedItems.map((item) => <AnalysisItemCard key={item.itemNumber} item={item} />)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
