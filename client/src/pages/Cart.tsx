import { useState } from "react";
import { Link } from "wouter";
import { ShoppingCart, Trash2, FileSpreadsheet, ArrowLeft, Package, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCart } from "@/hooks/useCart";
import { formatBRL, QuoteFormData } from "@/lib/cartTypes";
import { generateQuoteExcel } from "@/lib/quoteExcelGenerator";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Cart() {
  const { user } = useAuth();
  const { entries, count, isLoading, removeItem, clearCart, isRemoving } = useCart();
  const utils = trpc.useUtils();
  const updateQtyMutation = trpc.cart.updateQty.useMutation({
    onSuccess: () => utils.cart.list.invalidate(),
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<QuoteFormData>({
    cliente: "",
    contato: "",
    tel: "",
    email: "",
    obra: "",
    referencia: "",
    numero: String(new Date().getFullYear()).slice(-2) + String(Date.now()).slice(-4),
    data: new Date().toLocaleDateString("pt-BR"),
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md text-center p-8">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Faça login para ver o carrinho</h2>
          <p className="text-muted-foreground mb-6">Você precisa estar autenticado para acessar o carrinho de orçamentos.</p>
          <Button asChild>
            <a href={getLoginUrl()}>Entrar</a>
          </Button>
        </Card>
      </div>
    );
  }

  const totalGeral = entries.reduce((acc, e) => acc + (e.data.totalPrice ?? 0), 0);

  const handleGenerate = async () => {
    if (!form.cliente.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    setIsGenerating(true);
    try {
      await generateQuoteExcel(entries.map(e => e.data), form);
      setDialogOpen(false);
      toast.success("Orçamento gerado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar Excel:", err);
      toast.error("Erro ao gerar o orçamento. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateForm = (field: keyof QuoteFormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleUpdateQty = (id: number, currentQty: number, delta: number) => {
    const newQty = Math.max(1, currentQty + delta);
    if (newQty === currentQty) return;
    updateQtyMutation.mutate({ id, qty: newQty });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Configurador
            </Button>
          </Link>
          <div className="flex-1" />
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Carrinho de Orçamento</h1>
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Carregando itens...</div>
        ) : entries.length === 0 ? (
          <Card className="text-center py-16">
            <div className="flex flex-col items-center gap-4">
              <Package className="w-12 h-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Carrinho vazio</h2>
              <p className="text-muted-foreground">Configure produtos no configurador e clique em "Enviar ao Carrinho".</p>
              <Link href="/">
                <Button>Ir para o Configurador</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <>
            {/* Lista de itens */}
            <div className="space-y-3">
              {entries.map((entry, idx) => (
                <Card key={entry.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-start gap-4 p-4">
                      {/* Número do item */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </div>

                      {/* Foto */}
                      {entry.data.photoUrl ? (
                        <img
                          src={entry.data.photoUrl}
                          alt={entry.data.description}
                          className="w-16 h-16 object-contain rounded border bg-white flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Dados */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground font-mono">{entry.data.sku}</p>
                            <p className="font-semibold text-sm leading-tight">{entry.data.description}</p>
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              {entry.data.power && <span>⚡ {entry.data.power}</span>}
                              {entry.data.cct && <span>🌡 {entry.data.cct}</span>}
                              <span className="text-muted-foreground/60">{entry.data.category}</span>
                            </div>
                            {/* Controle de quantidade */}
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleUpdateQty(entry.id, entry.data.qty, -1)}
                                disabled={updateQtyMutation.isPending || entry.data.qty <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-sm font-semibold w-6 text-center">{entry.data.qty}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleUpdateQty(entry.id, entry.data.qty, 1)}
                                disabled={updateQtyMutation.isPending}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <span className="text-xs text-muted-foreground">un</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {entry.data.unitPrice != null && entry.data.unitPrice > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {formatBRL(entry.data.unitPrice)} / un
                              </p>
                            )}
                            {entry.data.totalPrice != null && entry.data.totalPrice > 0 ? (
                              <p className="font-bold text-primary text-base">
                                {formatBRL(entry.data.totalPrice)}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">Preço a consultar</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remover */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem(entry.id)}
                        disabled={isRemoving}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Rodapé com total e ações */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{count} {count === 1 ? "item" : "itens"} no carrinho</p>
                    {totalGeral > 0 && (
                      <p className="text-2xl font-bold text-primary">{formatBRL(totalGeral)}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => clearCart()}
                    >
                      <Trash2 className="w-4 h-4" />
                      Limpar Carrinho
                    </Button>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <FileSpreadsheet className="w-4 h-4" />
                          Gerar Orçamento
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Dados para o Orçamento</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-3 py-2">
                          <div className="col-span-2">
                            <Label>Cliente *</Label>
                            <Input
                              placeholder="Nome do cliente"
                              value={form.cliente}
                              onChange={e => updateForm("cliente", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Contato</Label>
                            <Input
                              placeholder="Nome do contato"
                              value={form.contato}
                              onChange={e => updateForm("contato", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Telefone</Label>
                            <Input
                              placeholder="(11) 99999-9999"
                              value={form.tel}
                              onChange={e => updateForm("tel", e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>E-mail</Label>
                            <Input
                              placeholder="email@cliente.com"
                              value={form.email}
                              onChange={e => updateForm("email", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Obra / Projeto</Label>
                            <Input
                              placeholder="Nome da obra"
                              value={form.obra}
                              onChange={e => updateForm("obra", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Referência</Label>
                            <Input
                              placeholder="Referência interna"
                              value={form.referencia}
                              onChange={e => updateForm("referencia", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Número do Orçamento</Label>
                            <Input
                              value={form.numero}
                              onChange={e => updateForm("numero", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Data</Label>
                            <Input
                              value={form.data}
                              onChange={e => updateForm("data", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
                            <FileSpreadsheet className="w-4 h-4" />
                            {isGenerating ? "Gerando..." : "Baixar Excel"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
