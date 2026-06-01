import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Copy, Key, Plus, Trash2, ArrowLeft, CheckCircle } from "lucide-react";

export default function ApiKeys() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [newKeyName, setNewKeyName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Só admins podem acessar
  if (user && user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  const { data: keys = [], refetch } = trpc.apiKeys.list.useQuery();

  const createMutation = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.key);
      setNewKeyName("");
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao criar chave: ${err.message}`);
    },
  });

  const revokeMutation = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      setRevokeId(null);
      refetch();
      toast.success("Chave revogada com sucesso.");
    },
    onError: (err) => {
      toast.error(`Erro ao revogar chave: ${err.message}`);
    },
  });

  function handleCreate() {
    if (!newKeyName.trim()) return;
    createMutation.mutate({ name: newKeyName.trim() });
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const baseUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            API Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie as chaves de acesso à API REST somente-leitura.
          </p>
        </div>
      </div>

      {/* Documentação rápida */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Como usar a API</CardTitle>
          <CardDescription>
            Envie a chave no header <code className="bg-muted px-1 rounded text-xs">Authorization: Bearer &lt;sua-chave&gt;</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">Endpoints disponíveis:</p>
            <div className="font-mono text-xs bg-muted rounded p-3 space-y-1">
              <p><span className="text-green-500">GET</span> {baseUrl}/api/v1/quotes</p>
              <p className="text-muted-foreground pl-4">?page=1&amp;per_page=50&amp;status=open&amp;seller=Vivian&amp;client=Alfalux&amp;date_from=2026-01-01&amp;date_to=2026-12-31</p>
              <p className="mt-2"><span className="text-green-500">GET</span> {baseUrl}/api/v1/quotes/:id</p>
              <p className="mt-2"><span className="text-green-500">GET</span> {baseUrl}/api/v1/sellers</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">Exemplo cURL:</p>
            <div className="font-mono text-xs bg-muted rounded p-3 flex items-start justify-between gap-2">
              <code className="break-all">
                curl -H "Authorization: Bearer alf_..." {baseUrl}/api/v1/quotes
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => handleCopy(`curl -H "Authorization: Bearer alf_..." ${baseUrl}/api/v1/quotes`)}
              >
                {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de chaves */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Chaves de API</CardTitle>
            <CardDescription>{keys.length} chave{keys.length !== 1 ? "s" : ""} cadastrada{keys.length !== 1 ? "s" : ""}</CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Chave
              </Button>
            </DialogTrigger>
            <DialogContent>
              {createdKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      Chave criada com sucesso!
                    </DialogTitle>
                    <DialogDescription>
                      Copie a chave abaixo agora. <strong>Ela não será exibida novamente.</strong>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="bg-muted rounded p-3 font-mono text-sm break-all flex items-start gap-2">
                    <span className="flex-1">{createdKey}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleCopy(createdKey)}
                    >
                      {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => { setCreatedKey(null); setCreateOpen(false); }}>
                      Fechar
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Nova API Key</DialogTitle>
                    <DialogDescription>
                      Dê um nome descritivo para identificar o sistema que usará esta chave.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    placeholder="Ex: Sistema CRM, Dashboard Externo..."
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                    <Button
                      onClick={handleCreate}
                      disabled={!newKeyName.trim() || createMutation.isPending}
                    >
                      {createMutation.isPending ? "Criando..." : "Criar Chave"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nenhuma chave criada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{k.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {k.keyPrefix}••••••••••••••••••••••••
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-muted-foreground hidden sm:block">
                      <p>Criada: {new Date(k.createdAt).toLocaleDateString("pt-BR")}</p>
                      {k.lastUsedAt && (
                        <p>Último uso: {new Date(k.lastUsedAt).toLocaleDateString("pt-BR")}</p>
                      )}
                    </div>
                    <Badge variant={k.active ? "default" : "secondary"}>
                      {k.active ? "Ativa" : "Revogada"}
                    </Badge>
                    {k.active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setRevokeId(k.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmar revogação */}
      <AlertDialog open={revokeId !== null} onOpenChange={(o) => !o && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar chave?</AlertDialogTitle>
            <AlertDialogDescription>
              A chave será desativada imediatamente. Qualquer sistema que a utilize perderá acesso à API.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeId !== null && revokeMutation.mutate({ id: revokeId })}
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
