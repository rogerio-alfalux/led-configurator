import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserPlus, Trash2, Key, Shield, ArrowLeft, SlidersHorizontal, Pencil } from "lucide-react";
import { Link } from "wouter";
import { ALL_PERMISSIONS } from "@shared/permissions";
import { filterUsersByRole, USER_ROLE_FILTERS } from "@/lib/userRoleFilter";
import { isVivianLdGuestCreator } from "@shared/userCreationAccess";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  vendedor: "Vendedor",
  assistente: "Assistente",
  custos: "Departamento de Custos",
  user: "Usuário",
  convidado: "LD Convidado",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  gerente: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  vendedor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  assistente: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  custos: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  user: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  convidado: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export default function UserManagement() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: users = [], isLoading } = trpc.admin.getUsers.useQuery();
  const { data: permissionsRows = [] } = trpc.dashboard.getAllPermissions.useQuery();

  // Create user state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("convidado");
  const canCreateOnlyLdGuests = isVivianLdGuestCreator((user as any)?.email);

  // Change password state
  const [pwUserId, setPwUserId] = useState<number | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [renameUserId, setRenameUserId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Delete confirmation
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [permissionsUserId, setPermissionsUserId] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");

  const filteredUsers = filterUsersByRole(users as any[], roleFilter);

  const createMutation = trpc.dashboard.createUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      utils.admin.getUsers.invalidate();
      setShowCreate(false);
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole("convidado");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateRoleMutation = trpc.dashboard.updateUserRole.useMutation({
    onSuccess: () => { toast.success("Permissão atualizada!"); utils.admin.getUsers.invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const updatePwMutation = trpc.dashboard.updateUserPassword.useMutation({
    onSuccess: () => { toast.success("Senha atualizada!"); setPwUserId(null); setPwValue(""); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateNameMutation = trpc.dashboard.updateUserName.useMutation({
    onSuccess: () => {
      toast.success("Nome atualizado!");
      utils.admin.getUsers.invalidate();
      setRenameUserId(null);
      setRenameValue("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.dashboard.deleteUser.useMutation({
    onSuccess: () => { toast.success("Usuário excluído."); utils.admin.getUsers.invalidate(); setDeleteUserId(null); },
    onError: (err: any) => toast.error(err.message),
  });

  const grantPermissionMutation = trpc.dashboard.grantPermission.useMutation({
    onSuccess: () => {
      utils.dashboard.getAllPermissions.invalidate();
      toast.success("Permissão atribuída.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const revokePermissionMutation = trpc.dashboard.revokePermission.useMutation({
    onSuccess: () => {
      utils.dashboard.getAllPermissions.invalidate();
      toast.success("Permissão revogada.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const permissionsForUser = (userId: number) =>
    permissionsRows.filter((row: any) => row.userId === userId).map((row: any) => row.permission);

  const togglePermission = (userId: number, permission: string, granted: boolean) => {
    if (granted) {
      revokePermissionMutation.mutate({ userId, permission });
    } else {
      grantPermissionMutation.mutate({ userId, permission });
    }
  };

  if (!user || (user as any).role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center p-8">
          <Shield className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">Apenas administradores podem acessar esta página.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
              <p className="text-sm text-muted-foreground">
                {roleFilter === "all"
                  ? `${users.length} usuário${users.length !== 1 ? "s" : ""} cadastrado${users.length !== 1 ? "s" : ""}`
                  : `${filteredUsers.length} de ${users.length} usuário${users.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><UserPlus className="w-4 h-4 mr-2" /> {canCreateOnlyLdGuests ? "Novo LD Convidado" : "Novo Usuário"}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{canCreateOnlyLdGuests ? "Criar LD Convidado" : "Criar Novo Usuário"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha</Label>
                  <Input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Senha de acesso" />
                </div>
                <div className="space-y-1.5">
                  <Label>Permissão</Label>
                  <Select value={canCreateOnlyLdGuests ? "convidado" : newRole} onValueChange={setNewRole} disabled={canCreateOnlyLdGuests}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="convidado">LD Convidado (sem preços)</SelectItem>
                      {!canCreateOnlyLdGuests && <>
                        <SelectItem value="user">Usuário padrão</SelectItem>
                        <SelectItem value="vendedor">Vendedor</SelectItem>
                        <SelectItem value="assistente">Assistente</SelectItem>
                        <SelectItem value="gerente">Gerente</SelectItem>
                        <SelectItem value="custos">Departamento de Custos</SelectItem>
                      </>}
                    </SelectContent>
                  </Select>
                  {canCreateOnlyLdGuests && (
                    <p className="text-xs text-muted-foreground">Sua autorização permite cadastrar exclusivamente contas LD Convidado.</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
                <Button
                  onClick={() => createMutation.mutate({ name: newName, email: newEmail, password: newPassword, role: (canCreateOnlyLdGuests ? "convidado" : newRole) as any })}
                  disabled={!newName || !newEmail || !newPassword || createMutation.isPending}
                >
                  {createMutation.isPending ? "Criando..." : "Criar Usuário"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users list */}
        <Card>
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">Filtrar usuários por função</CardTitle>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[220px] h-9 text-sm">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLE_FILTERS.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>{filter.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : (
              <div className="divide-y">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado para a função selecionada.
                  </div>
                ) : filteredUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{u.name || "—"}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS[u.role] || ""}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Change role */}
                      <Select
                        value={u.role}
                        onValueChange={(val) => updateRoleMutation.mutate({ userId: u.id, role: val as any })}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="convidado">LD Convidado</SelectItem>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="vendedor">Vendedor</SelectItem>
                          <SelectItem value="assistente">Assistente</SelectItem>
                          <SelectItem value="gerente">Gerente</SelectItem>
                          <SelectItem value="custos">Departamento de Custos</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {/* Editar nome */}
                      <Dialog open={renameUserId === u.id} onOpenChange={(open) => { if (!open) { setRenameUserId(null); setRenameValue(""); } }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar nome"
                            onClick={() => { setRenameUserId(u.id); setRenameValue(u.name || ""); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Editar nome — {u.email}</DialogTitle></DialogHeader>
                          <div className="space-y-2 py-2">
                            <Label htmlFor={`name-${u.id}`}>Nome exibido</Label>
                            <Input id={`name-${u.id}`} value={renameValue} onChange={e => setRenameValue(e.target.value)} placeholder="Nome completo" autoFocus />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setRenameUserId(null)}>Cancelar</Button>
                            <Button onClick={() => updateNameMutation.mutate({ userId: u.id, name: renameValue })} disabled={!renameValue.trim() || updateNameMutation.isPending}>Salvar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      {/* Change password */}
                      <Dialog open={pwUserId === u.id} onOpenChange={(open) => { if (!open) { setPwUserId(null); setPwValue(""); } }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Alterar senha" onClick={() => setPwUserId(u.id)}>
                            <Key className="w-3.5 h-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Alterar Senha — {u.name || u.email}</DialogTitle></DialogHeader>
                          <div className="space-y-3 py-2">
                            <Label>Nova senha</Label>
                            <Input type="text" value={pwValue} onChange={e => setPwValue(e.target.value)} placeholder="Nova senha" />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setPwUserId(null)}>Cancelar</Button>
                            <Button onClick={() => updatePwMutation.mutate({ userId: u.id, password: pwValue })} disabled={!pwValue || updatePwMutation.isPending}>
                              Salvar
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      {/* Permissões individuais */}
                      <Dialog open={permissionsUserId === u.id} onOpenChange={(open) => { if (!open) setPermissionsUserId(null); }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Gerenciar permissões" onClick={() => setPermissionsUserId(u.id)}>
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Permissões — {u.name || u.email}</DialogTitle>
                          </DialogHeader>
                          {u.role === "admin" ? (
                            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">Administradores possuem todas as permissões por padrão.</p>
                          ) : (
                            <div className="space-y-2 py-2">
                              <p className="text-xs text-muted-foreground">As permissões abaixo são independentes do tipo de usuário. Alterações são aplicadas imediatamente.</p>
                              {ALL_PERMISSIONS.map((permission) => {
                                const granted = permissionsForUser(u.id).includes(permission.key);
                                const pending = grantPermissionMutation.isPending || revokePermissionMutation.isPending;
                                return (
                                  <label key={permission.key} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40">
                                    <Checkbox
                                      checked={granted}
                                      disabled={pending}
                                      onCheckedChange={() => togglePermission(u.id, permission.key, granted)}
                                      className="mt-0.5"
                                    />
                                    <span className="space-y-0.5">
                                      <span className="block text-sm font-medium">{permission.label}</span>
                                      <span className="block text-xs text-muted-foreground">{permission.description}</span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setPermissionsUserId(null)}>Fechar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      {/* Delete */}
                      <Dialog open={deleteUserId === u.id} onOpenChange={(open) => { if (!open) setDeleteUserId(null); }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir" onClick={() => setDeleteUserId(u.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Excluir usuário?</DialogTitle></DialogHeader>
                          <p className="text-sm text-muted-foreground py-2">Tem certeza que deseja excluir <strong>{u.name || u.email}</strong>? Esta ação não pode ser desfeita.</p>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteUserId(null)}>Cancelar</Button>
                            <Button variant="destructive" onClick={() => deleteMutation.mutate({ userId: u.id })} disabled={deleteMutation.isPending}>
                              Excluir
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
