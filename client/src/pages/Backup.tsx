import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, FileSpreadsheet, Download, ShieldAlert, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function Backup() {
  const { user } = useAuth();
  const [sqlLoading, setSqlLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<{ type: string; at: string } | null>(null);

  const exportSQLQuery = trpc.backup.exportSQL.useQuery(undefined, { enabled: false });
  const exportExcelQuery = trpc.backup.exportQuotesExcel.useQuery(undefined, { enabled: false });

  // Verificar se o usuário tem permissão de admin
  const isAdmin = (user as any)?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <ShieldAlert className="w-16 h-16 text-destructive opacity-60" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground max-w-sm">
          Esta página é acessível apenas para administradores do sistema.
        </p>
      </div>
    );
  }

  const handleExportSQL = async () => {
    setSqlLoading(true);
    try {
      const result = await exportSQLQuery.refetch();
      if (!result.data) throw new Error("Sem dados");
      const { sql, generatedAt, counts } = result.data;

      // Baixar como arquivo .sql
      const blob = new Blob([sql], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date(generatedAt).toISOString().slice(0, 10);
      a.href = url;
      a.download = `backup-sistema-luna-${dateStr}.sql`;
      a.click();
      URL.revokeObjectURL(url);

      setLastBackup({ type: "SQL", at: generatedAt });
      toast.success(`Backup SQL gerado com sucesso — ${counts.quotes} orçamentos · ${counts.items} itens · ${counts.users} usuários`);
    } catch (e) {
      toast.error("Erro ao gerar backup SQL");
    } finally {
      setSqlLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExcelLoading(true);
    try {
      const result = await exportExcelQuery.refetch();
      if (!result.data) throw new Error("Sem dados");
      const { quotes, versions, items, generatedAt } = result.data;

      const wb = XLSX.utils.book_new();

      // Aba 1: Orçamentos
      const quotesRows = quotes.map((q: any) => ({
        "Número": q.quoteNumber,
        "Cliente": q.clientName,
        "Projeto": q.projectName,
        "Status": q.status,
        "Vendedor": q.sellerName ?? "",
        "Assistente": q.assistantName ?? "",
        "Número Pedido": q.orderNumber ?? "",
        "Empresa Faturadora": q.billingCompany ?? "",
        "Valor Total": q.totalValue ?? 0,
        "Desconto (%)": q.discountPercent ?? 0,
        "Criado em": q.createdAt ? new Date(q.createdAt).toLocaleString("pt-BR") : "",
        "Aprovado em": q.approvedAt ? new Date(q.approvedAt).toLocaleString("pt-BR") : "",
        "Faturado em": q.invoicedAt ? new Date(q.invoicedAt).toLocaleString("pt-BR") : "",
        "Observações": q.notes ?? "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(quotesRows), "Orçamentos");

      // Aba 2: Revisões
      const versionsRows = versions.map((v: any) => ({
        "ID Revisão": v.id,
        "ID Orçamento": v.quoteId,
        "Revisão Nº": v.versionNumber,
        "Nota": v.notes ?? "",
        "Criado em": v.createdAt ? new Date(v.createdAt).toLocaleString("pt-BR") : "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(versionsRows), "Revisões");

      // Aba 3: Itens
      const itemsRows = items.map((it: any) => {
        let parsed: any = {};
        try { parsed = JSON.parse(it.itemData ?? "{}"); } catch {}
        return {
          "ID Item": it.id,
          "ID Revisão": it.versionId,
          "Nº Item": it.itemNumber,
          "SKU": parsed.sku ?? "",
          "Descrição": parsed.description ?? "",
          "Categoria": parsed.category ?? "",
          "Qtd": parsed.qty ?? 0,
          "Preço Unit.": parsed.unitPrice ?? 0,
          "Total": parsed.totalPrice ?? 0,
          "Pavimento": parsed.floorName ?? "",
          "Ambiente": parsed.ambiente ?? "",
          "Item em Planta": parsed.itemEmPlanta ?? "",
          "CCT": parsed.cct ?? "",
          "Cor": parsed.color ?? "",
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsRows), "Itens");

      const dateStr = new Date(generatedAt).toISOString().slice(0, 10);
      XLSX.writeFile(wb, `backup-orcamentos-${dateStr}.xlsx`);

      setLastBackup({ type: "Excel", at: generatedAt });
      toast.success(`Backup Excel gerado com sucesso — ${quotes.length} orçamentos · ${items.length} itens exportados`);
    } catch (e) {
      toast.error("Erro ao gerar backup Excel");
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exportação e Backup</h1>
        <p className="text-muted-foreground mt-1">
          Exporte uma cópia completa dos dados do sistema a qualquer momento. Os arquivos gerados
          podem ser armazenados localmente como backup de segurança.
        </p>
      </div>

      {lastBackup && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Último backup: <strong>{lastBackup.type}</strong> gerado em{" "}
          {new Date(lastBackup.at).toLocaleString("pt-BR")}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Backup SQL */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-base">Backup Completo (SQL)</CardTitle>
            </div>
            <CardDescription>
              Exporta todas as tabelas do banco de dados em formato SQL. Ideal para restauração
              completa em outro servidor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {["Orçamentos", "Itens", "Revisões", "Vendedores", "Usuários", "Metas", "Pedidos Fábrica"].map(t => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleExportSQL}
              disabled={sqlLoading}
            >
              {sqlLoading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando...</>
              ) : (
                <><Download className="w-4 h-4" /> Baixar .sql</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Backup Excel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-500" />
              <CardTitle className="text-base">Orçamentos em Excel</CardTitle>
            </div>
            <CardDescription>
              Exporta todos os orçamentos, revisões e itens em planilha Excel com abas separadas.
              Fácil de abrir e analisar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {["Orçamentos", "Revisões", "Itens detalhados"].map(t => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
            </div>
            <Button
              className="w-full gap-2"
              variant="outline"
              onClick={handleExportExcel}
              disabled={excelLoading}
            >
              {excelLoading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando...</>
              ) : (
                <><Download className="w-4 h-4" /> Baixar .xlsx</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-medium">Recomendação de segurança</p>
              <p>
                Realize backups regularmente — pelo menos uma vez por semana — e armazene os
                arquivos em local seguro (Google Drive, OneDrive ou HD externo). O arquivo SQL
                pode ser usado para restaurar o sistema completo em outro servidor.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
