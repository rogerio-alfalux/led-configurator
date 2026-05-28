import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, CheckCircle, XCircle, Clock, TrendingDown,
  FileSpreadsheet, History, Package, Edit, AlertTriangle,
  ChevronDown, ChevronUp, Factory, Trash2, PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { CartItemData, formatBRL, parseCartItemData } from "@/lib/cartTypes";
import { generateQuoteExcel } from "@/lib/quoteExcelGenerator";
import { generateOrderExcel } from "@/lib/orderExcelGenerator";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Em Aberto", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "Aprovado", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: <CheckCircle className="w-3 h-3" /> },
  lost: { label: "Perdido", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: <TrendingDown className="w-3 h-3" /> },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: <XCircle className="w-3 h-3" /> },
};

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Edit (add revision) dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ clientName: "", clientContact: "", clientPhone: "", clientEmail: "", projectName: "", projectRef: "", vendorName: "", assistantName: "", versionNotes: "" });

  // Delete dialog — triple confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0, 1, 2
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data, isLoading, error } = trpc.quotes.getById.useQuery({ id: Number(id) });

  const updateStatusMutation = trpc.quotes.updateStatus.useMutation({
    onSuccess: () => {
      utils.quotes.getById.invalidate({ id: Number(id) });
      utils.quotes.list.invalidate();
      toast.success("Status atualizado com sucesso!");
      setStatusDialogOpen(false);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const addRevisionMutation = trpc.quotes.addRevision.useMutation({
    onSuccess: () => {
      utils.quotes.getById.invalidate({ id: Number(id) });
      utils.quotes.list.invalidate();
      toast.success("Orçamento atualizado! Nova revisão criada.");
      setEditDialogOpen(false);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const deleteMutation = trpc.quotes.delete.useMutation({
    onSuccess: () => {
      utils.quotes.list.invalidate();
      toast.success("Orçamento excluído permanentemente.");
      navigate("/orcamentos");
    },
    onError: (err) => toast.error(`Erro ao excluir: ${err.message}`),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando orçamento...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center p-8">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Orçamento não encontrado</h2>
          <Link href="/orcamentos">
            <Button>Voltar para a lista</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { quote, versions, items } = data;
  const st = STATUS_LABELS[quote.status] ?? STATUS_LABELS.open;

  // Itens da versão mais recente
  const currentVersionId = versions[0]?.id;
  const currentItems = items.filter(i => i.quoteVersionId === currentVersionId);

  const handleGenerateQuote = async () => {
    setIsGenerating(true);
    try {
      const header = JSON.parse(versions[0]?.headerSnapshot ?? "{}");
      await generateQuoteExcel(
        currentItems.map(i => parseCartItemData(i.itemData)).filter((d): d is CartItemData => d !== null),
        {
          cliente: quote.clientName,
          contato: quote.clientContact ?? "",
          tel: quote.clientPhone ?? "",
          email: quote.clientEmail ?? "",
          obra: quote.projectName ?? "",
          referencia: quote.projectRef ?? "",
          numero: quote.quoteNumber,
          data: new Date(quote.createdAt).toLocaleDateString("pt-BR"),
        }
      );
      toast.success("Orçamento Excel gerado!");
    } catch (err) {
      toast.error("Erro ao gerar orçamento.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateOrder = async () => {
    setIsGenerating(true);
    try {
      await generateOrderExcel(
        currentItems.map(i => parseCartItemData(i.itemData)).filter((d): d is CartItemData => d !== null),
        {
          clientName: quote.clientName,
          projectName: quote.projectName ?? "",
          quoteNumber: quote.quoteNumber,
          vendorName: quote.vendorName ?? "",
          date: new Date(quote.approvedAt ?? quote.createdAt).toLocaleDateString("pt-BR"),
        }
      );
      toast.success("Pedido de fábrica gerado!");
    } catch (err) {
      toast.error("Erro ao gerar pedido.");
    } finally {
      setIsGenerating(false);
    }
  };

  const visibleVersions = showAllVersions ? versions : versions.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link href="/orcamentos">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Orçamentos
            </Button>
          </Link>
          <div className="flex-1" />
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${st.color}`}>
            {st.icon}
            {st.label}
          </span>
          <h1 className="text-lg font-semibold font-mono text-primary">{quote.quoteNumber}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Cabeçalho do orçamento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-semibold text-base">{quote.clientName}</p>
              {quote.clientContact && <p>👤 {quote.clientContact}</p>}
              {quote.clientPhone && <p>📞 {quote.clientPhone}</p>}
              {quote.clientEmail && <p>✉️ {quote.clientEmail}</p>}
              {quote.projectName && <p>📍 Obra: <span className="font-medium">{quote.projectName}</span></p>}
              {quote.projectRef && <p>🔖 Ref: {quote.projectRef}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Dados Internos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {quote.vendorName && <p>🧑‍💼 Vendedor: <span className="font-medium">{quote.vendorName}</span></p>}
              {quote.assistantName && <p>✏️ Assistente: <span className="font-medium">{quote.assistantName}</span></p>}
              <p>📅 Criado em: {new Date(quote.createdAt).toLocaleDateString("pt-BR")}</p>
              <p>🔄 Versão atual: <span className="font-bold">v{quote.currentVersion}</span></p>
              {quote.approvedAt && (
                <p className="text-green-600 dark:text-green-400 font-medium">
                  ✅ Aprovado em: {new Date(quote.approvedAt).toLocaleDateString("pt-BR")}
                </p>
              )}
              {quote.totalAmount && Number(quote.totalAmount) > 0 && (
                <p className="text-primary font-bold text-lg">{formatBRL(Number(quote.totalAmount))}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleGenerateQuote}
            disabled={isGenerating}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Baixar Orçamento Excel
          </Button>

          {quote.status === "approved" && (
            <Button
              className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleGenerateOrder}
              disabled={isGenerating}
            >
              <Factory className="w-4 h-4" />
              Gerar Pedido de Fábrica
            </Button>
          )}

          {/* Alterar Status */}
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" />
                Alterar Status
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Alterar Status do Orçamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label>Novo Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Em Aberto</SelectItem>
                      <SelectItem value="approved">Aprovado pelo Cliente</SelectItem>
                      <SelectItem value="lost">Perdido</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newStatus === "approved" && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm text-green-700 dark:text-green-400">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Ao aprovar, o botão "Gerar Pedido de Fábrica" ficará disponível.
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => {
                    if (!newStatus) return;
                    updateStatusMutation.mutate({ id: Number(id), status: newStatus as "open" | "approved" | "lost" | "cancelled" });
                  }}
                  disabled={!newStatus || updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? "Salvando..." : "Confirmar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Editar Orçamento (nova revisão) */}
          <Dialog open={editDialogOpen} onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (open) {
              setEditForm({
                clientName: quote.clientName,
                clientContact: quote.clientContact ?? "",
                clientPhone: quote.clientPhone ?? "",
                clientEmail: quote.clientEmail ?? "",
                projectName: quote.projectName ?? "",
                projectRef: quote.projectRef ?? "",
                vendorName: quote.vendorName ?? "",
                assistantName: quote.assistantName ?? "",
                versionNotes: "",
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <PenLine className="w-4 h-4" />
                Editar Orçamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Editar Orçamento — Nova Revisão</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground -mt-2 mb-1">
                A versão atual (v{quote.currentVersion}) será preservada no histórico. Uma nova revisão será criada com os dados abaixo.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Cliente *</Label>
                  <Input value={editForm.clientName} onChange={e => setEditForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Nome do cliente" />
                </div>
                <div>
                  <Label>Contato</Label>
                  <Input value={editForm.clientContact} onChange={e => setEditForm(f => ({ ...f, clientContact: e.target.value }))} placeholder="Nome do contato" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={editForm.clientPhone} onChange={e => setEditForm(f => ({ ...f, clientPhone: e.target.value }))} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input value={editForm.clientEmail} onChange={e => setEditForm(f => ({ ...f, clientEmail: e.target.value }))} placeholder="email@cliente.com" />
                </div>
                <div>
                  <Label>Obra / Projeto</Label>
                  <Input value={editForm.projectName} onChange={e => setEditForm(f => ({ ...f, projectName: e.target.value }))} placeholder="Nome da obra" />
                </div>
                <div>
                  <Label>Referência</Label>
                  <Input value={editForm.projectRef} onChange={e => setEditForm(f => ({ ...f, projectRef: e.target.value }))} placeholder="Código de referência" />
                </div>
                <div>
                  <Label>Vendedor</Label>
                  <Input value={editForm.vendorName} onChange={e => setEditForm(f => ({ ...f, vendorName: e.target.value }))} placeholder="Nome do vendedor" />
                </div>
                <div>
                  <Label>Assistente</Label>
                  <Input value={editForm.assistantName} onChange={e => setEditForm(f => ({ ...f, assistantName: e.target.value }))} placeholder="Nome da assistente" />
                </div>
                <div className="col-span-2">
                  <Label>Notas desta revisão</Label>
                  <Textarea
                    value={editForm.versionNotes}
                    onChange={e => setEditForm(f => ({ ...f, versionNotes: e.target.value }))}
                    placeholder="Ex: Ajuste de preços, inclusão de novos itens..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => {
                    if (!editForm.clientName.trim()) { toast.error("Nome do cliente é obrigatório."); return; }
                    addRevisionMutation.mutate({
                      quoteId: Number(id),
                      clientName: editForm.clientName.trim(),
                      clientContact: editForm.clientContact || undefined,
                      clientPhone: editForm.clientPhone || undefined,
                      clientEmail: editForm.clientEmail || undefined,
                      projectName: editForm.projectName || undefined,
                      projectRef: editForm.projectRef || undefined,
                      vendorName: editForm.vendorName || undefined,
                      assistantName: editForm.assistantName || undefined,
                      versionNotes: editForm.versionNotes || undefined,
                      totalAmount: Number(quote.totalAmount ?? 0),
                      items: currentItems.map((i, idx) => ({ itemNumber: idx + 1, itemData: i.itemData })),
                    });
                  }}
                  disabled={addRevisionMutation.isPending}
                >
                  {addRevisionMutation.isPending ? "Salvando..." : "Salvar Nova Revisão"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Excluir Orçamento — tripla confirmação */}
          <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) { setDeleteStep(0); setDeleteConfirmText(""); }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 text-destructive hover:bg-destructive/10 border-destructive/30">
                <Trash2 className="w-4 h-4" />
                Excluir
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="w-5 h-5" />
                  Excluir Orçamento
                </DialogTitle>
              </DialogHeader>

              {deleteStep === 0 && (
                <div className="space-y-3">
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm font-semibold text-destructive mb-1">⚠️ Atenção: Ação irreversível!</p>
                    <p className="text-sm text-muted-foreground">
                      Excluir este orçamento removerá permanentemente <strong>todos os dados</strong>, incluindo
                      o histórico de revisões, itens e informações do cliente. <strong>Esta ação não pode ser desfeita.</strong>
                    </p>
                  </div>
                  <p className="text-sm">Tem certeza que deseja excluir o orçamento <strong>{quote.quoteNumber}</strong>?</p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Não, cancelar</Button>
                    <Button variant="destructive" onClick={() => setDeleteStep(1)}>Sim, quero excluir</Button>
                  </div>
                </div>
              )}

              {deleteStep === 1 && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">🚨 Segunda confirmação</p>
                    <p className="text-sm text-muted-foreground">
                      Você está prestes a excluir um orçamento que pode estar vinculado a um cliente ativo.
                      Considere alterar o status para <strong>"Cancelado"</strong> em vez de excluir.
                    </p>
                  </div>
                  <p className="text-sm">Confirma que deseja excluir <strong>permanentemente</strong>?</p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDeleteStep(0)}>Voltar</Button>
                    <Button variant="destructive" onClick={() => setDeleteStep(2)}>Confirmar exclusão</Button>
                  </div>
                </div>
              )}

              {deleteStep === 2 && (
                <div className="space-y-3">
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm font-semibold text-destructive mb-1">🔒 Confirmação final</p>
                    <p className="text-sm text-muted-foreground">
                      Para confirmar a exclusão, digite o número do orçamento abaixo:
                    </p>
                  </div>
                  <div>
                    <Label>Digite <strong>{quote.quoteNumber}</strong> para confirmar</Label>
                    <Input
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder={quote.quoteNumber}
                      className="mt-1 font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setDeleteStep(0); setDeleteConfirmText(""); }}>Cancelar</Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteMutation.mutate({ id: Number(id) })}
                      disabled={deleteConfirmText !== quote.quoteNumber || deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? "Excluindo..." : "Excluir Definitivamente"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Itens da versão atual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Itens do Orçamento (v{quote.currentVersion})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {currentItems.map((item, idx) => {
                const d = parseCartItemData(item.itemData);
                if (!d) return null;
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    {d.photoUrl ? (
                      <img src={d.photoUrl} alt={d.description} className="w-12 h-12 object-contain rounded border bg-white flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-mono">{d.sku}</p>
                      <p className="text-sm font-medium leading-tight">{d.description}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {d.power && <span>⚡ {d.power}</span>}
                        {d.cct && <span>🌡 {d.cct}</span>}
                        <span>{d.category}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">Qtd: {d.qty}</p>
                      {d.unitPrice != null && d.unitPrice > 0 && (
                        <p className="text-xs text-muted-foreground">{formatBRL(d.unitPrice)}/un</p>
                      )}
                      {d.totalPrice != null && d.totalPrice > 0 ? (
                        <p className="font-bold text-primary text-sm">{formatBRL(d.totalPrice)}</p>
                      ) : (
                        <p className="text-xs italic text-muted-foreground">A consultar</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {quote.totalAmount && Number(quote.totalAmount) > 0 && (
              <div className="px-4 py-3 border-t bg-primary/5 flex justify-between items-center">
                <span className="text-sm font-medium">Total</span>
                <span className="text-xl font-bold text-primary">{formatBRL(Number(quote.totalAmount))}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico de versões */}
        {versions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4" />
                Histórico de Revisões ({versions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {visibleVersions.map(v => {
                  const vItems = items.filter(i => i.quoteVersionId === v.id);
                  return (
                    <div key={v.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm">
                            Revisão v{v.version}
                            {v.version === quote.currentVersion && (
                              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Atual</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(v.createdAt).toLocaleString("pt-BR")}
                            {v.assistantName && ` · ${v.assistantName}`}
                            {v.vendorName && ` · ${v.vendorName}`}
                          </p>
                          {v.versionNotes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">"{v.versionNotes}"</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-primary">
                            {v.totalAmount && Number(v.totalAmount) > 0 ? formatBRL(Number(v.totalAmount)) : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">{vItems.length} iten{vItems.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {versions.length > 3 && (
                <div className="px-4 py-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2 text-muted-foreground"
                    onClick={() => setShowAllVersions(v => !v)}
                  >
                    {showAllVersions ? (
                      <><ChevronUp className="w-4 h-4" /> Mostrar menos</>
                    ) : (
                      <><ChevronDown className="w-4 h-4" /> Ver todas as {versions.length} revisões</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        {quote.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{quote.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
