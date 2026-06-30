import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database, FileSpreadsheet, Download, ShieldAlert, RefreshCw,
  CheckCircle, Clock, AlertCircle, CalendarClock, HardDrive,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function Backup() {
  const { user } = useAuth();
  const [sqlLoading, setSqlLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  const exportSQLQuery = trpc.backup.exportSQL.useQuery(undefined, { enabled: false });
  const exportExcelQuery = trpc.backup.exportQuotesExcel.useQuery(undefined, { enabled: false });
  const backupListQuery = trpc.backup.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: 60_000, // atualiza a cada 1 min
  });

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
      const blob = new Blob([sql], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date(generatedAt).toISOString().slice(0, 10);
      a.href = url;
      a.download = `backup-sistema-luna-${dateStr}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Backup SQL gerado — ${counts.quotes} orçamentos · ${counts.items} itens · ${counts.users} usuários`);
    } catch {
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

      const quotesRows = quotes.map((q: any) => ({
        "Número": q.quoteNumber,
        "Cliente": q.clientName,
        "Projeto": q.projectName,
        "Status": q.status,
        "Vendedor": q.sellerName ?? "",
        "Assistente": q.assistantName ?? "",
        "Número Pedido": q.orderNumber ?? "",
        "Empresa Faturadora": q.billingCompany ?? "",
        "Valor Total": q.totalFinal ?? q.totalAmount ?? 0,
        "Criado em": q.createdAt ? new Date(q.createdAt).toLocaleString("pt-BR") : "",
        "Aprovado em": q.approvedAt ? new Date(q.approvedAt).toLocaleString("pt-BR") : "",
        "Faturado em": q.invoicedAt ? new Date(q.invoicedAt).toLocaleString("pt-BR") : "",
        "Observações": q.notes ?? "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(quotesRows), "Orçamentos");

      const versionsRows = versions.map((v: any) => ({
        "ID Revisão": v.id,
        "ID Orçamento": v.quoteId,
        "Revisão Nº": v.version,
        "Nota": v.versionNotes ?? "",
        "Criado em": v.createdAt ? new Date(v.createdAt).toLocaleString("pt-BR") : "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(versionsRows), "Revisões");

      const itemsRows = items.map((it: any) => {
        let parsed: any = {};
        try { parsed = JSON.parse(it.itemData ?? "{}"); } catch {}
        return {
          "ID Item": it.id,
          "ID Revisão": it.quoteVersionId,
          "Nº Item": it.itemNumber,
          "SKU": parsed.sku ?? "",
          "Descrição": parsed.description ?? "",
          "Categoria": parsed.category ?? "",
          "Qtd": parsed.qty ?? 0,
          "Preço Unit.": parsed.unitPrice ?? 0,
          "Total": parsed.totalPrice ?? 0,
          "Pavimento": parsed.floorName ?? "",
          "Ambiente": parsed.ambiente ?? "",
          "CCT": parsed.cct ?? "",
          "Cor": parsed.color ?? "",
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsRows), "Itens");

      const dateStr = new Date(generatedAt).toISOString().slice(0, 10);
      XLSX.writeFile(wb, `backup-orcamentos-${dateStr}.xlsx`);
      toast.success(`Backup Excel gerado — ${quotes.length} orçamentos · ${items.length} itens`);
    } catch {
      toast.error("Erro ao gerar backup Excel");
    } finally {
      setExcelLoading(false);
    }
  };

  const backups = backupListQuery.data ?? [];
  const lastSuccess = backups.find(b => b.status === "success");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exportação e Backup</h1>
        <p className="text-muted-foreground mt-1">
          Backups automáticos diários são gerados às 03:00 UTC e armazenados com segurança.
          Você também pode gerar um backup manual a qualquer momento.
        </p>
      </div>

      {/* Status do backup automático */}
      <Card className={lastSuccess
        ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
        : "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
      }>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <CalendarClock className={`w-5 h-5 shrink-0 ${lastSuccess ? "text-green-500" : "text-amber-500"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {lastSuccess
                  ? "Backup automático ativo — execução diária às 03:00 UTC"
                  : "Backup automático configurado — aguardando primeira execução"}
              </p>
              {lastSuccess && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Último backup bem-sucedido: {formatDate(lastSuccess.createdAt)}
                  {lastSuccess.recordCounts && (() => {
                    try {
                      const c = JSON.parse(lastSuccess.recordCounts!);
                      return ` · ${c.quotes} orçamentos · ${c.items} itens`;
                    } catch { return ""; }
                  })()}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => backupListQuery.refetch()}
              disabled={backupListQuery.isFetching}
            >
              <RefreshCw className={`w-4 h-4 ${backupListQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Exportação manual */}
      <div>
        <h2 className="text-base font-semibold mb-3">Exportação Manual</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-base">Backup Completo (SQL)</CardTitle>
              </div>
              <CardDescription>
                Exporta todas as tabelas em formato SQL. Ideal para restauração completa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5 text-xs">
                {["Orçamentos", "Itens", "Revisões", "Vendedores", "Usuários", "Metas", "Pedidos Fábrica"].map(t => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </div>
              <Button className="w-full gap-2" onClick={handleExportSQL} disabled={sqlLoading}>
                {sqlLoading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando...</>
                  : <><Download className="w-4 h-4" /> Baixar .sql</>}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-500" />
                <CardTitle className="text-base">Orçamentos em Excel</CardTitle>
              </div>
              <CardDescription>
                Exporta orçamentos, revisões e itens em planilha Excel com abas separadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5 text-xs">
                {["Orçamentos", "Revisões", "Itens detalhados"].map(t => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </div>
              <Button className="w-full gap-2" variant="outline" onClick={handleExportExcel} disabled={excelLoading}>
                {excelLoading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando...</>
                  : <><Download className="w-4 h-4" /> Baixar .xlsx</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Histórico de backups automáticos */}
      <div>
        <h2 className="text-base font-semibold mb-3">Histórico de Backups Automáticos</h2>
        {backupListQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <RefreshCw className="w-4 h-4 animate-spin" /> Carregando histórico...
          </div>
        ) : backups.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Nenhum backup automático registrado ainda.
              <br />O primeiro backup será gerado na próxima execução agendada (03:00 UTC).
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Data</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Arquivo</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Tamanho</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {backups.map(b => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(b.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {b.type === "sql"
                          ? <Database className="w-3.5 h-3.5 text-blue-500" />
                          : <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />}
                        <span className="uppercase text-xs font-medium">{b.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                      {b.fileName}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {formatBytes(b.fileSizeBytes)}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {b.status === "success" ? (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="text-xs">OK</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-destructive" title={b.errorMessage ?? ""}>
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-xs">Erro</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {b.status === "success" && b.fileUrl ? (
                        <a
                          href={b.fileUrl}
                          download={b.fileName}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Baixar
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-medium">Segurança dos dados</p>
              <p>
                Os backups automáticos são armazenados com segurança no servidor. Recomendamos
                também baixar periodicamente os arquivos e guardá-los em local externo
                (Google Drive, OneDrive ou HD externo) como camada adicional de proteção.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
