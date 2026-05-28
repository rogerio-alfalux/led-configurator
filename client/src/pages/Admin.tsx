import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Shield, Search, RefreshCw, Users, Activity,
  FileText, Trash2, CheckCircle, XCircle, Clock, TrendingDown,
  FileSpreadsheet, LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const ACTION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  quote_created: { label: "Orçamento Criado", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: <FileText className="w-3 h-3" /> },
  quote_revised: { label: "Revisão Adicionada", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", icon: <FileText className="w-3 h-3" /> },
  quote_status_changed: { label: "Status Alterado", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", icon: <Activity className="w-3 h-3" /> },
  quote_deleted: { label: "Orçamento Excluído", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: <Trash2 className="w-3 h-3" /> },
  production_sheet_generated: { label: "Ficha de Produção", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: <FileSpreadsheet className="w-3 h-3" /> },
  login_blocked: { label: "Login Bloqueado", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", icon: <LogIn className="w-3 h-3" /> },
};

const PAGE_SIZE = 50;

export default function Admin() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [searchEmail, setSearchEmail] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [page, setPage] = useState(0);

  const isAdmin = user?.role === "admin";

  const logsQuery = trpc.admin.getLogs.useQuery(
    {
      action: filterAction !== "all" ? filterAction : undefined,
      userEmail: searchEmail || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { enabled: isAdmin }
  );

  const usersQuery = trpc.admin.getUsers.useQuery(undefined, { enabled: isAdmin });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Verificando acesso...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center p-8">
          <Shield className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-4">Esta área é exclusiva para administradores do sistema.</p>
          <Link href="/">
            <Button>Voltar ao Início</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const logs = logsQuery.data?.rows ?? [];
  const totalLogs = logsQuery.data?.total ?? 0;
  const users = usersQuery.data ?? [];
  const totalPages = Math.ceil(totalLogs / PAGE_SIZE);

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
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Painel Administrativo</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Resumo de usuários */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total de Usuários</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Administradores</p>
              <p className="text-2xl font-bold text-primary">{users.filter(u => u.role === "admin").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total de Eventos</p>
              <p className="text-2xl font-bold">{totalLogs}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Logins Bloqueados</p>
              <p className="text-2xl font-bold text-destructive">
                {logsQuery.data?.rows.filter(l => l.action === "login_blocked").length ?? "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de usuários */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usuários Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-4">Nome</th>
                    <th className="text-left py-2 pr-4">E-mail</th>
                    <th className="text-left py-2 pr-4">Perfil</th>
                    <th className="text-left py-2">Último Acesso</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-4 font-medium">{u.name ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{u.email ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                          {u.role === "admin" ? "Admin" : "Usuário"}
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground text-xs">
                        {new Date(u.lastSignedIn).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Log de auditoria */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Log de Auditoria
                <span className="text-muted-foreground font-normal">({totalLogs} eventos)</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logsQuery.refetch()}
                disabled={logsQuery.isFetching}
                className="gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${logsQuery.isFetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>

            {/* Filtros */}
            <div className="flex gap-2 mt-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por e-mail..."
                  value={searchEmail}
                  onChange={e => { setSearchEmail(e.target.value); setPage(0); }}
                  className="pl-7 h-8 text-sm"
                />
              </div>
              <Select value={filterAction} onValueChange={v => { setFilterAction(v); setPage(0); }}>
                <SelectTrigger className="w-[200px] h-8 text-sm">
                  <SelectValue placeholder="Filtrar por ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="quote_created">Orçamento Criado</SelectItem>
                  <SelectItem value="quote_revised">Revisão Adicionada</SelectItem>
                  <SelectItem value="quote_status_changed">Status Alterado</SelectItem>
                  <SelectItem value="quote_deleted">Orçamento Excluído</SelectItem>
                  <SelectItem value="production_sheet_generated">Ficha de Produção</SelectItem>
                  <SelectItem value="login_blocked">Login Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-3">Data/Hora</th>
                    <th className="text-left py-2 pr-3">Usuário</th>
                    <th className="text-left py-2 pr-3">Ação</th>
                    <th className="text-left py-2">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const actionInfo = ACTION_LABELS[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-700", icon: <Activity className="w-3 h-3" /> };
                    let details: Record<string, unknown> = {};
                    try { details = JSON.parse(log.details ?? "{}"); } catch {}
                    return (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 align-top">
                        <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="py-2 pr-3">
                          <p className="font-medium text-xs">{log.userName ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{log.userEmail ?? "—"}</p>
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${actionInfo.color}`}>
                            {actionInfo.icon}
                            {actionInfo.label}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {details.quoteNumber != null && <span className="font-mono mr-2">{String(details.quoteNumber as string)}</span>}
                          {details.newStatus != null && <span>→ {String(details.newStatus as string)}</span>}
                          {details.empresa != null && <span>Empresa: {String(details.empresa as string)}</span>}
                          {details.clientName != null && <span>Cliente: {String(details.clientName as string)}</span>}
                          {details.newVersion != null && <span>Rev. {String(details.newVersion as number)}</span>}
                          {details.reason != null && <span className="text-destructive">{String(details.reason as string)}</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && !logsQuery.isFetching && (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum evento encontrado.</td></tr>
                  )}
                  {logsQuery.isFetching && (
                    <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Carregando...</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-muted-foreground">
                  Página {page + 1} de {totalPages} ({totalLogs} eventos)
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
