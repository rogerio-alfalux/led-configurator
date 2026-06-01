import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ShoppingCart, Trash2, FileSpreadsheet, ArrowLeft, Package,
  Plus, Minus, Save, ClipboardList, Factory, AlertTriangle,
  ChevronRight, Tag, Percent, Truck, Users, PlusCircle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from "@/hooks/useCart";
import { formatBRL, QuoteFormData, CartItemData, parseCartItemData } from "@/lib/cartTypes";
import { generateQuoteExcel } from "@/lib/quoteExcelGenerator";
import { generateOrderExcel } from "@/lib/orderExcelGenerator";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface SaveFormData {
  quoteNumber: string;
  clientName: string;
  clientContact: string;
  clientPhone: string;
  clientEmail: string;
  projectName: string;
  projectRef: string;
  seller1Id: string;
  seller1Name: string;
  seller2Id: string;
  seller2Name: string;
  assistantId: string;
  assistantName: string;
  rtPercent: string;
  rtDest1: string;
  rtDest1Active: boolean;
  rtDest2: string;
  rtDest2Active: boolean;
  rtDest3: string;
  rtDest3Active: boolean;
  marginPercent: string;
  freteType: "free" | "paid" | "night" | "consult";
  freteIsento: boolean;
  freteLocalidade: "sp" | "other";
  freteCity: string;
  notes: string;
  versionNotes: string;
}

interface OrderFormData {
  clientName: string;
  projectName: string;
  vendorName: string;
  quoteRef: string;
  empresa: "ALFALUX" | "LUMINEW";
}

export default function Cart() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const appendToQuoteId = new URLSearchParams(search).get("appendToQuote");
  const appendToQuoteIdNum = appendToQuoteId ? parseInt(appendToQuoteId) : null;

  // Buscar dados do orçamento alvo (se appendToQuote estiver na URL)
  const appendQuoteQuery = trpc.quotes.getById.useQuery(
    { id: appendToQuoteIdNum! },
    { enabled: appendToQuoteIdNum != null }
  );
  const appendQuote = appendQuoteQuery.data;
  const { entries, count, isLoading, removeItem, clearCart, isRemoving, updateItemField } = useCart();
  const utils = trpc.useUtils();

  const updateQtyMutation = trpc.cart.updateQty.useMutation({
    onSuccess: () => utils.cart.list.invalidate(),
  });
  const saveQuoteMutation = trpc.quotes.save.useMutation({
    onSuccess: (data) => {
      toast.success(`Orçamento ${data.quoteNumber} salvo com sucesso!`);
      setSaveDialogOpen(false);
      // Limpar o carrinho automaticamente após salvar o orçamento
      clearCart();
      navigate(`/orcamentos/${data.quoteId}`);
    },
    onError: (err) => {
      toast.error(`Erro ao salvar orçamento: ${err.message}`);
    },
  });
  const logProductionSheetMutation = trpc.quotes.logProductionSheet.useMutation();

  // Mutation para adicionar itens a orçamento existente
  const appendItemsMutation = trpc.quotes.appendItems.useMutation({
    onSuccess: (data) => {
      toast.success(`Itens adicionados ao orçamento ${data.quoteNumber} com sucesso!`);
      clearCart();
      navigate(`/orcamentos/${appendToQuoteIdNum}`);
    },
    onError: (err) => {
      toast.error(`Erro ao adicionar itens: ${err.message}`);
    },
  });

  // Sellers & Assistants
  const sellersQuery = trpc.sellers.list.useQuery();
  const assistantsQuery = trpc.assistants.list.useQuery();
  const sellers = sellersQuery.data ?? [];
  const assistants = assistantsQuery.data ?? [];

  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Item em Planta — mapa local (UI imediata) + autosave via updateItemField
  const [itemEmPlantaMap, setItemEmPlantaMap] = useState<Record<number, string>>({});

  // Pedido de Fábrica direto do carrinho
  const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderForm, setOrderForm] = useState<OrderFormData>({
    clientName: "",
    projectName: "",
    vendorName: "",
    quoteRef: "",
    empresa: "ALFALUX",
  });

  // Formulário para gerar Excel de orçamento
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

  // Formulário para salvar no banco
  const [saveForm, setSaveForm] = useState<SaveFormData>({
    quoteNumber: "",
    clientName: "",
    clientContact: "",
    clientPhone: "",
    clientEmail: "",
    projectName: "",
    projectRef: "",
    seller1Id: "",
    seller1Name: "",
    seller2Id: "",
    seller2Name: "",
    assistantId: "",
    assistantName: user?.name ?? "",
    rtPercent: "0",
    rtDest1: "",
    rtDest1Active: true,
    rtDest2: "",
    rtDest2Active: false,
    rtDest3: "",
    rtDest3Active: false,
    marginPercent: "10",
    freteType: "free",
    freteIsento: false,
    freteLocalidade: "sp",
    freteCity: "",
    notes: "",
    versionNotes: "",
  });

  // Busca sugestão de número ao abrir o diálogo (atualiza quando vendedor muda)
  const seller1IdNum = saveForm.seller1Id ? parseInt(saveForm.seller1Id) : undefined;
  const suggestQuery = trpc.quotes.suggestNumber.useQuery(
    { sellerId: seller1IdNum },
    { enabled: saveDialogOpen, staleTime: 0 }
  );
  // Atualiza número automaticamente quando vendedor é selecionado
  useEffect(() => {
    if (saveDialogOpen && suggestQuery.data?.suggested) {
      setSaveForm(prev => ({ ...prev, quoteNumber: suggestQuery.data!.suggested }));
    }
  }, [saveDialogOpen, suggestQuery.data?.suggested, saveForm.seller1Id]);

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

  // Cálculo de RT e Margem
  const rtPct = Math.min(Math.max(parseFloat(saveForm.rtPercent || "0") / 100, 0), 0.99);
  const marginPct = Math.min(Math.max(parseFloat(saveForm.marginPercent || "0") / 100, 0), 0.99);
  const totalComRT = rtPct > 0 ? totalGeral / (1 - rtPct) : totalGeral;
  const totalFinal = marginPct > 0 ? totalComRT / (1 - marginPct) : totalComRT;

  // Cálculo de frete
  const FRETE_NOTURNO = 2000;
  const FRETE_GRATIS_MINIMO = 1500;
  let freteValor = 0;
  let freteLabel = "";
  if (!saveForm.freteIsento) {
    if (saveForm.freteType === "night") {
      freteValor = FRETE_NOTURNO;
      freteLabel = `Frete noturno: ${formatBRL(FRETE_NOTURNO)}`;
    } else if (saveForm.freteType === "consult") {
      freteLabel = "Frete: sob consulta";
    } else if (saveForm.freteLocalidade === "sp") {
      if (totalFinal >= FRETE_GRATIS_MINIMO) {
        freteLabel = "Frete grátis (SP)";
      } else {
        freteLabel = "Frete: a calcular (SP)";
      }
    } else {
      freteLabel = "Frete: sob consulta (outra cidade)";
    }
  } else {
    freteLabel = "Frete isento";
  }

  const handleGenerate = async () => {
    if (!form.cliente.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    setIsGenerating(true);
    try {
      // Mesclar campos do saveForm no form para o Excel ter RT, margem, frete e vendedores
      const enrichedForm: QuoteFormData = {
        ...form,
        seller1Id: saveForm.seller1Id ? Number(saveForm.seller1Id) : undefined,
        seller1Name: saveForm.seller1Name || undefined,
        seller2Id: saveForm.seller2Id ? Number(saveForm.seller2Id) : undefined,
        seller2Name: saveForm.seller2Name || undefined,
        assistantId: saveForm.assistantId ? Number(saveForm.assistantId) : undefined,
        assistantName: saveForm.assistantName || undefined,
        rtPercent: rtPct > 0 ? rtPct : undefined,
        rtDest1: saveForm.rtDest1 || undefined,
        rtDest1Active: saveForm.rtDest1Active,
        rtDest2: saveForm.rtDest2 || undefined,
        rtDest2Active: saveForm.rtDest2Active,
        rtDest3: saveForm.rtDest3 || undefined,
        rtDest3Active: saveForm.rtDest3Active,
        marginPercent: marginPct > 0 ? marginPct : undefined,
        freteType: saveForm.freteType,
        freteIsento: saveForm.freteIsento,
        freteLocalidade: saveForm.freteLocalidade,
        freteCity: saveForm.freteCity,
        // revisionCount: 0 para orçamentos gerados diretamente do carrinho (sem revisões)
        revisionCount: 0,
      };
      // Injetar itemEmPlanta em cada item
      const itemsWithPlanta = entries.map((e, idx) => ({
        ...e.data,
        itemEmPlanta: itemEmPlantaMap[e.id] ?? e.data.itemEmPlanta ?? "",
      }));
      await generateQuoteExcel(itemsWithPlanta, enrichedForm);
      setDialogOpen(false);
      toast.success("Orçamento gerado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar Excel:", err);
      toast.error("Erro ao gerar o orçamento. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuote = () => {
    if (!saveForm.clientName.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    if (!saveForm.seller1Id) {
      toast.error("Selecione o Vendedor 1.");
      return;
    }
    if (!saveForm.assistantId) {
      toast.error("Selecione o Assistente Comercial.");
      return;
    }
    if (entries.length === 0) {
      toast.error("O carrinho está vazio.");
      return;
    }
    saveQuoteMutation.mutate({
      quoteNumber: saveForm.quoteNumber.trim() || undefined,
      clientName: saveForm.clientName,
      clientContact: saveForm.clientContact || undefined,
      clientPhone: saveForm.clientPhone || undefined,
      clientEmail: saveForm.clientEmail || undefined,
      projectName: saveForm.projectName || undefined,
      projectRef: saveForm.projectRef || undefined,
      vendorName: saveForm.seller1Name || undefined,
      assistantName: saveForm.assistantName || undefined,
      seller1Id: saveForm.seller1Id ? parseInt(saveForm.seller1Id) : undefined,
      seller1Name: saveForm.seller1Name || undefined,
      seller2Id: saveForm.seller2Id ? parseInt(saveForm.seller2Id) : undefined,
      seller2Name: saveForm.seller2Name || undefined,
      assistantId: saveForm.assistantId ? parseInt(saveForm.assistantId) : undefined,
      rtPercent: rtPct,
      rtDest1: saveForm.rtDest1 || undefined,
      rtDest1Active: saveForm.rtDest1Active,
      rtDest2: saveForm.rtDest2 || undefined,
      rtDest2Active: saveForm.rtDest2Active,
      rtDest3: saveForm.rtDest3 || undefined,
      rtDest3Active: saveForm.rtDest3Active,
      marginPercent: marginPct,
      freteType: saveForm.freteType,
      freteIsento: saveForm.freteIsento,
      freteLocalidade: saveForm.freteLocalidade,
      notes: saveForm.notes || undefined,
      versionNotes: saveForm.versionNotes || undefined,
      totalAmount: totalGeral,
      totalFinal: totalFinal + freteValor,
      items: entries.map((e, idx) => ({
        itemNumber: idx + 1,
        itemData: JSON.stringify({
          ...e.data,
          itemEmPlanta: itemEmPlantaMap[e.id] || e.data.itemEmPlanta || "",
        }),
      })),
    });
  };

  const handleGenerateDirectOrder = async () => {
    if (!orderForm.clientName.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    setIsGenerating(true);
    setOrderFormOpen(false);
    try {
      const items = entries
        .map(e => parseCartItemData(JSON.stringify({
          ...e.data,
          itemEmPlanta: itemEmPlantaMap[e.id] || e.data.itemEmPlanta || "",
        })))
        .filter((d): d is CartItemData => d !== null);

      await generateOrderExcel(items, {
        clientName: orderForm.clientName,
        projectName: orderForm.projectName,
        quoteNumber: orderForm.quoteRef || "SEM-ORC",
        vendorName: orderForm.vendorName,
        date: new Date().toLocaleDateString("pt-BR"),
        empresa: orderForm.empresa,
      });

      logProductionSheetMutation.mutate({
        quoteId: 0,
        quoteNumber: orderForm.quoteRef || "SEM-ORC",
        empresa: orderForm.empresa,
      });

      toast.success("Pedido de fábrica gerado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar pedido:", err);
      toast.error("Erro ao gerar o pedido. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateForm = (field: keyof QuoteFormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const updateSaveForm = <K extends keyof SaveFormData>(field: K, value: SaveFormData[K]) =>
    setSaveForm(prev => ({ ...prev, [field]: value }));

  const updateOrderForm = (field: keyof OrderFormData, value: string) =>
    setOrderForm(prev => ({ ...prev, [field]: value as OrderFormData[typeof field] }));

  const handleUpdateQty = (id: number, currentQty: number, delta: number) => {
    const newQty = Math.max(1, currentQty + delta);
    if (newQty === currentQty) return;
    updateQtyMutation.mutate({ id, qty: newQty });
  };

  const handleQtyInput = (id: number, value: string) => {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      updateQtyMutation.mutate({ id, qty: parsed });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={appendToQuoteId ? `/?appendToQuote=${appendToQuoteId}` : "/"}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {appendToQuoteId ? "Voltar ao Configurador" : "Voltar ao Configurador"}
            </Button>
          </Link>
          <div className="flex-1" />
          <Link href="/orcamentos">
            <Button variant="ghost" size="sm" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Meus Orçamentos
            </Button>
          </Link>
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Carrinho de Orçamento</h1>
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Banner de contexto: adicionando a orçamento existente */}
        {appendToQuoteId && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3">
            <PlusCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-300">
                Adicionando itens ao orçamento{appendQuote ? ` ${appendQuote.quote.quoteNumber} — ${appendQuote.quote.clientName}` : ` #${appendToQuoteId}`}
              </p>
              <p className="text-xs text-blue-400/80">
                Os itens do carrinho serão inseridos como nova revisão do orçamento existente.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-400 hover:text-blue-300"
              onClick={() => navigate("/carrinho")}
            >
              Cancelar
            </Button>
          </div>
        )}

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
                              <input
                                type="number"
                                min={1}
                                value={entry.data.qty}
                                onChange={(e) => handleQtyInput(entry.id, e.target.value)}
                                onBlur={(e) => handleQtyInput(entry.id, e.target.value)}
                                className="text-sm font-semibold w-14 text-center border border-border rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                disabled={updateQtyMutation.isPending}
                              />
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
                            {/* Item em Planta */}
                            <div className="flex items-center gap-2 mt-2">
                              <Tag className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <input
                                type="text"
                                placeholder="Item em planta (ex: L1)"
                                value={itemEmPlantaMap[entry.id] ?? entry.data.itemEmPlanta ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setItemEmPlantaMap(prev => ({ ...prev, [entry.id]: val }));
                                  // Autosave com debounce de 600ms
                                  updateItemField(entry.id, { itemEmPlanta: val });
                                }}
                                className="text-xs border border-border rounded px-2 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary w-40"
                              />
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
                      Limpar
                    </Button>

                    {/* Adicionar ao orçamento existente (modo append) */}
                    {appendToQuoteId && (
                      <Button
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={appendItemsMutation.isPending || entries.length === 0}
                        onClick={() => {
                          const newItems = entries.map((e) => ({
                            itemNumber: e.id,
                            itemData: JSON.stringify({
                              ...e.data,
                              itemEmPlanta: itemEmPlantaMap[e.id] ?? e.data.itemEmPlanta ?? "",
                            }),
                          }));
                          appendItemsMutation.mutate({
                            quoteId: appendToQuoteIdNum!,
                            newItems,
                            versionNotes: `+${entries.length} item(s) adicionado(s) via carrinho`,
                          });
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {appendItemsMutation.isPending ? "Adicionando..." : `Adicionar ${entries.length} item(s) ao Orçamento`}
                      </Button>
                    )}

                    {/* Salvar Orçamento no banco */}
                    <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                      <Button
                        variant="outline"
                        className="gap-2 border-green-600/40 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                        onClick={() => setSaveDialogOpen(true)}
                      >
                        <Save className="w-4 h-4" />
                        Salvar Orçamento
                      </Button>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Salvar Orçamento no Sistema</DialogTitle>
                        </DialogHeader>
                        <Tabs defaultValue="equipe">
                          <TabsList className="w-full">
                            <TabsTrigger value="equipe" className="flex-1">
                              <Users className="w-3 h-3 mr-1" />Equipe
                            </TabsTrigger>
                            <TabsTrigger value="cliente" className="flex-1">Cliente</TabsTrigger>
                            <TabsTrigger value="financeiro" className="flex-1">
                              <Percent className="w-3 h-3 mr-1" />RT / Margem
                            </TabsTrigger>
                            <TabsTrigger value="frete" className="flex-1">
                              <Truck className="w-3 h-3 mr-1" />Frete
                            </TabsTrigger>
                          </TabsList>

                          {/* ─── Aba Cliente ─── */}
                          <TabsContent value="cliente" className="space-y-3 pt-3">
                            <div>
                              <Label>Número do Orçamento</Label>
                              <div className="relative">
                                <Input
                                  placeholder={suggestQuery.data?.suggested ?? "ORC-26-0001"}
                                  value={saveForm.quoteNumber}
                                  onChange={e => updateSaveForm("quoteNumber", e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {suggestQuery.isLoading ? "Calculando número..." : suggestQuery.data?.suggested ? `Número gerado: ${suggestQuery.data.suggested}` : "Selecione o Vendedor 1 para gerar o número automaticamente"}
                                </p>
                              </div>
                            </div>
                            <div>
                              <Label>Cliente *</Label>
                              <Input
                                placeholder="Nome do cliente"
                                value={saveForm.clientName}
                                onChange={e => updateSaveForm("clientName", e.target.value)}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Contato</Label>
                                <Input
                                  placeholder="Nome do contato"
                                  value={saveForm.clientContact}
                                  onChange={e => updateSaveForm("clientContact", e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Telefone</Label>
                                <Input
                                  placeholder="(11) 99999-9999"
                                  value={saveForm.clientPhone}
                                  onChange={e => updateSaveForm("clientPhone", e.target.value)}
                                />
                              </div>
                            </div>
                            <div>
                              <Label>E-mail</Label>
                              <Input
                                placeholder="email@cliente.com"
                                value={saveForm.clientEmail}
                                onChange={e => updateSaveForm("clientEmail", e.target.value)}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Obra / Projeto</Label>
                                <Input
                                  placeholder="Nome da obra"
                                  value={saveForm.projectName}
                                  onChange={e => updateSaveForm("projectName", e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Referência</Label>
                                <Input
                                  placeholder="Ref. interna"
                                  value={saveForm.projectRef}
                                  onChange={e => updateSaveForm("projectRef", e.target.value)}
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Observações</Label>
                              <Input
                                placeholder="Observações gerais do orçamento"
                                value={saveForm.notes}
                                onChange={e => updateSaveForm("notes", e.target.value)}
                              />
                            </div>
                          </TabsContent>

                          {/* ─── Aba Equipe ─── */}
                          <TabsContent value="equipe" className="space-y-3 pt-3">
                            <div>
                              <Label>Vendedor 1 *</Label>
                              <Select
                                value={saveForm.seller1Id}
                                onValueChange={(v) => {
                                  const sel = sellers.find(s => String(s.id) === v);
                                  updateSaveForm("seller1Id", v);
                                  updateSaveForm("seller1Name", sel?.name ?? "");
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o vendedor principal" />
                                </SelectTrigger>
                                <SelectContent>
                                  {sellers.map(s => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {/* Preview do número gerado */}
                              {saveForm.seller1Id && (
                                <div className="mt-2 flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-md">
                                  <span className="text-xs text-muted-foreground">Número do orçamento:</span>
                                  {suggestQuery.isLoading ? (
                                    <span className="text-xs text-muted-foreground animate-pulse">Calculando...</span>
                                  ) : (
                                    <span className="text-sm font-mono font-bold text-primary">{suggestQuery.data?.suggested ?? saveForm.quoteNumber}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <Label>Vendedor 2 (opcional)</Label>
                              <Select
                                value={saveForm.seller2Id || "none"}
                                onValueChange={(v) => {
                                  if (v === "none") {
                                    updateSaveForm("seller2Id", "");
                                    updateSaveForm("seller2Name", "");
                                  } else {
                                    const sel = sellers.find(s => String(s.id) === v);
                                    updateSaveForm("seller2Id", v);
                                    updateSaveForm("seller2Name", sel?.name ?? "");
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o segundo vendedor (opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  {sellers.map(s => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Assistente Comercial *</Label>
                              <Select
                                value={saveForm.assistantId}
                                onValueChange={(v) => {
                                  const ast = assistants.find(a => String(a.id) === v);
                                  updateSaveForm("assistantId", v);
                                  updateSaveForm("assistantName", ast?.name ?? "");
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o assistente" />
                                </SelectTrigger>
                                <SelectContent>
                                  {assistants.map(a => (
                                    <SelectItem key={a.id} value={String(a.id)}>
                                      {a.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground mt-1">
                                O assistente é quem está elaborando este orçamento.
                              </p>
                            </div>
                            <div>
                              <Label>Observações desta versão</Label>
                              <Input
                                placeholder="Ex: Revisão após reunião com cliente"
                                value={saveForm.versionNotes}
                                onChange={e => updateSaveForm("versionNotes", e.target.value)}
                              />
                            </div>
                          </TabsContent>

                          {/* ─── Aba RT / Margem ─── */}
                          <TabsContent value="financeiro" className="space-y-4 pt-3">
                            <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
                              Fórmula: <code>Preço final = base ÷ (1 − RT%) ÷ (1 − Margem%)</code>
                            </div>

                            {/* RT */}
                            <div>
                              <Label className="flex items-center gap-2">
                                <Percent className="w-3 h-3" />
                                Reserva Técnica (RT)
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={99}
                                  step={0.5}
                                  className="w-24"
                                  value={saveForm.rtPercent}
                                  onChange={e => updateSaveForm("rtPercent", e.target.value)}
                                />
                                <span className="text-sm text-muted-foreground">%</span>
                                {rtPct > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    → {formatBRL(totalComRT)} (base + RT)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Destinos da RT */}
                            {rtPct > 0 && (
                              <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                                <Label className="text-xs text-muted-foreground">Destinos da RT (até 3)</Label>
                                {[1, 2, 3].map((n) => {
                                  const destKey = `rtDest${n}` as keyof SaveFormData;
                                  const activeKey = `rtDest${n}Active` as keyof SaveFormData;
                                  return (
                                    <div key={n} className="flex items-center gap-2">
                                      <Checkbox
                                        checked={saveForm[activeKey] as boolean}
                                        onCheckedChange={(v) => updateSaveForm(activeKey, Boolean(v) as SaveFormData[typeof activeKey])}
                                      />
                                      <Input
                                        placeholder={`Destino ${n} (ex: Engenharia)`}
                                        value={saveForm[destKey] as string}
                                        onChange={e => updateSaveForm(destKey, e.target.value as SaveFormData[typeof destKey])}
                                        disabled={!saveForm[activeKey]}
                                        className="flex-1"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Margem */}
                            <div>
                              <Label className="flex items-center gap-2">
                                <Percent className="w-3 h-3" />
                                Margem de Negociação
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={99}
                                  step={0.5}
                                  className="w-24"
                                  value={saveForm.marginPercent}
                                  onChange={e => updateSaveForm("marginPercent", e.target.value)}
                                />
                                <span className="text-sm text-muted-foreground">%</span>
                                <span className="text-xs text-muted-foreground">(padrão 10%)</span>
                              </div>
                            </div>

                            {/* Resumo */}
                            <div className="bg-muted/60 rounded-lg p-3 space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal produtos</span>
                                <span>{formatBRL(totalGeral)}</span>
                              </div>
                              {rtPct > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">+ RT ({saveForm.rtPercent}%)</span>
                                  <span>{formatBRL(totalComRT - totalGeral)}</span>
                                </div>
                              )}
                              {marginPct > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">+ Margem ({saveForm.marginPercent}%)</span>
                                  <span>{formatBRL(totalFinal - totalComRT)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold border-t pt-1">
                                <span>Total final</span>
                                <span className="text-primary">{formatBRL(totalFinal)}</span>
                              </div>
                            </div>
                          </TabsContent>

                          {/* ─── Aba Frete ─── */}
                          <TabsContent value="frete" className="space-y-4 pt-3">
                            <div>
                              <Label>Localidade de entrega</Label>
                              <Select
                                value={saveForm.freteLocalidade}
                                onValueChange={(v) => updateSaveForm("freteLocalidade", v as "sp" | "other")}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sp">São Paulo (SP)</SelectItem>
                                  <SelectItem value="other">Outra cidade</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {saveForm.freteLocalidade === "other" && (
                              <div>
                                <Label>Cidade de destino</Label>
                                <Input
                                  placeholder="Ex: Campinas, Curitiba..."
                                  value={saveForm.freteCity}
                                  onChange={e => updateSaveForm("freteCity", e.target.value)}
                                />
                              </div>
                            )}

                            <div>
                              <Label>Tipo de frete</Label>
                              <Select
                                value={saveForm.freteType}
                                onValueChange={(v) => updateSaveForm("freteType", v as SaveFormData["freteType"])}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Grátis (SP, acima de R$1.500)</SelectItem>
                                  <SelectItem value="paid">A calcular</SelectItem>
                                  <SelectItem value="night">Noturno (R$2.000)</SelectItem>
                                  <SelectItem value="consult">Sob consulta</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="freteIsento"
                                checked={saveForm.freteIsento}
                                onCheckedChange={(v) => updateSaveForm("freteIsento", Boolean(v))}
                              />
                              <label htmlFor="freteIsento" className="text-sm cursor-pointer">
                                Isentar frete (frete grátis independente do valor)
                              </label>
                            </div>

                            <div className="bg-muted/60 rounded-lg p-3 text-sm">
                              <p className="text-muted-foreground">Resumo do frete:</p>
                              <p className="font-medium mt-1">{freteLabel}</p>
                              {freteValor > 0 && (
                                <p className="font-bold text-primary mt-1">+ {formatBRL(freteValor)}</p>
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>

                        <div className="flex justify-end gap-2 pt-3 border-t">
                          <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleSaveQuote}
                            disabled={saveQuoteMutation.isPending}
                            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-4 h-4" />
                            {saveQuoteMutation.isPending ? "Salvando..." : "Salvar no Sistema"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Gerar Excel de Orçamento */}
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <Button className="gap-2" onClick={() => setDialogOpen(true)}>
                        <FileSpreadsheet className="w-4 h-4" />
                        Gerar Orçamento
                      </Button>
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

                    {/* ─── Gerar Pedido de Fábrica (sem orçamento) ─── */}
                    <Button
                      variant="outline"
                      className="gap-2 border-orange-500/40 text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950"
                      onClick={() => setOrderConfirmOpen(true)}
                      disabled={isGenerating}
                    >
                      <Factory className="w-4 h-4" />
                      Pedido de Fábrica
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ─── Passo 1: Confirmação inicial ─────────────────────────────────────── */}
      <AlertDialog open={orderConfirmOpen} onOpenChange={setOrderConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Gerar Pedido de Fábrica sem Orçamento?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Você está prestes a gerar uma <strong>Ficha Técnica de Produção</strong> diretamente
                  do carrinho, <strong>sem vincular a um orçamento salvo no sistema</strong>.
                </p>
                <p>
                  Este pedido <strong>não ficará registrado</strong> no histórico de orçamentos.
                  Recomendamos salvar o orçamento primeiro e gerar o pedido a partir dele.
                </p>
                <p>Deseja continuar mesmo assim?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
              onClick={() => {
                setOrderConfirmOpen(false);
                setOrderFormOpen(true);
              }}
            >
              <ChevronRight className="w-4 h-4" />
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Passo 2: Formulário de dados do pedido ───────────────────────────── */}
      <Dialog open={orderFormOpen} onOpenChange={setOrderFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="w-5 h-5 text-orange-500" />
              Dados para o Pedido de Fábrica
            </DialogTitle>
            <DialogDescription>
              Preencha os dados que aparecerão na Ficha Técnica de Produção.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Cliente *</Label>
              <Input
                placeholder="Nome do cliente ou obra"
                value={orderForm.clientName}
                onChange={e => updateOrderForm("clientName", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Obra / Projeto</Label>
                <Input
                  placeholder="Nome da obra"
                  value={orderForm.projectName}
                  onChange={e => updateOrderForm("projectName", e.target.value)}
                />
              </div>
              <div>
                <Label>Vendedor</Label>
                <Input
                  placeholder="Nome do vendedor"
                  value={orderForm.vendorName}
                  onChange={e => updateOrderForm("vendorName", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Referência do Orçamento (opcional)</Label>
              <Input
                placeholder="Ex: ORC-2026-0042 ou referência interna"
                value={orderForm.quoteRef}
                onChange={e => updateOrderForm("quoteRef", e.target.value)}
              />
            </div>
            <div>
              <Label>Empresa Fabricante</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setOrderForm(prev => ({ ...prev, empresa: "ALFALUX" }))}
                  className={`p-3 rounded-lg border-2 text-sm font-semibold transition-colors ${
                    orderForm.empresa === "ALFALUX"
                      ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                      : "border-border text-muted-foreground hover:border-orange-300"
                  }`}
                >
                  1 — ALFALUX
                </button>
                <button
                  type="button"
                  onClick={() => setOrderForm(prev => ({ ...prev, empresa: "LUMINEW" }))}
                  className={`p-3 rounded-lg border-2 text-sm font-semibold transition-colors ${
                    orderForm.empresa === "LUMINEW"
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "border-border text-muted-foreground hover:border-blue-300"
                  }`}
                >
                  2 — LUMINEW
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setOrderFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateDirectOrder}
              disabled={isGenerating || !orderForm.clientName.trim()}
              className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Factory className="w-4 h-4" />
              {isGenerating ? "Gerando..." : "Gerar Pedido de Fábrica"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
