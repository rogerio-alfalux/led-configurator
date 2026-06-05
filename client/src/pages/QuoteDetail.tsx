import { useState, useMemo } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, CheckCircle, XCircle, Clock, TrendingDown,
  FileSpreadsheet, History, Package, Edit, AlertTriangle,
  ChevronDown, ChevronUp, Factory, Trash2, PenLine,
  Users, Percent, Truck, Pencil, ShoppingBag, PlusCircle, GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { CartItemData, formatBRL, parseCartItemData } from "@/lib/cartTypes";
import { CORES_PECA } from "@/components/ColorPickerModal";
import { generateQuoteExcel } from "@/lib/quoteExcelGenerator";
import { generateOrderExcel, calcDeliveryDate } from "@/lib/orderExcelGenerator";
import { DIFAL_TABLE, getStateInfo } from "@/lib/difalTable";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Em Aberto", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "Aprovado", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: <CheckCircle className="w-3 h-3" /> },
  lost: { label: "Perdido", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: <TrendingDown className="w-3 h-3" /> },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: <XCircle className="w-3 h-3" /> },
};

// Componente separado para cada item editável com drag-and-drop
// (useSortable DEVE ser chamado no nível do componente, nunca dentro de .map())
interface SortableEditItemProps {
  item: { id: number; itemNumber: number; itemData: string; parsed: CartItemData };
  idx: number;
  resolvePhoto: (sku: string | undefined, savedUrl: string | null) => string | null;
  onUpdate: (id: number, fields: Partial<CartItemData>) => void;
}

function SortableEditItem({ item, idx, resolvePhoto, onUpdate }: SortableEditItemProps) {
  const d = item.parsed;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-4 space-y-3">
      {/* Cabeçalho do item */}
      <div className="flex items-center gap-3">
        {/* Handle de drag */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          title="Arrastar para reordenar"
        >
          <GripVertical className="w-5 h-5" />
        </button>
        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
          {idx + 1}
        </span>
        {resolvePhoto(d.sku, d.photoUrl) ? (
          <img src={resolvePhoto(d.sku, d.photoUrl)!} alt={d.description} className="w-12 h-12 object-contain rounded border bg-white flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-mono">{d.sku}</p>
          <p className="text-sm font-semibold leading-tight">{d.description}</p>
          <p className="text-xs text-muted-foreground">{d.category}</p>
        </div>
      </div>

      {/* Campos editáveis */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Quantidade */}
        <div>
          <Label className="text-xs">Quantidade</Label>
          <Input
            type="number"
            min={1}
            value={d.qty}
            onChange={e => onUpdate(item.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
            className="mt-1 h-8 text-sm"
          />
        </div>

        {/* Item em Planta */}
        <div>
          <Label className="text-xs">Item em Planta</Label>
          <Input
            value={d.itemEmPlanta ?? ""}
            onChange={e => onUpdate(item.id, { itemEmPlanta: e.target.value })}
            placeholder="Ex: L1, EF2"
            className="mt-1 h-8 text-sm"
          />
        </div>

        {/* Temperatura de Cor */}
        <div>
          <Label className="text-xs">Temperatura de Cor</Label>
          {d.availableCCTs && d.availableCCTs.length > 0 ? (
            <Select
              value={d.cct || ""}
              onValueChange={v => onUpdate(item.id, { cct: v })}
            >
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue placeholder="CCT" />
              </SelectTrigger>
              <SelectContent>
                {d.availableCCTs.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={d.cct ?? ""}
              onChange={e => onUpdate(item.id, { cct: e.target.value })}
              placeholder="Ex: 3000K"
              className="mt-1 h-8 text-sm"
            />
          )}
        </div>

        {/* Cor da Peça */}
        <div>
          <Label className="text-xs">Cor da Peça</Label>
          <Select
            value={d.corPeca || "A Definir"}
            onValueChange={v => onUpdate(item.id, { corPeca: v })}
          >
            <SelectTrigger className="mt-1 h-8 text-sm">
              <SelectValue placeholder="Cor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A Definir">A Definir</SelectItem>
              {CORES_PECA.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preço unitário: editável apenas quando não veio da API */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label className="text-xs">
            Preço Unitário (R$)
            {d.priceFromApi && (
              <span className="ml-1 text-muted-foreground font-normal">(API)</span>
            )}
          </Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={d.unitPrice ?? ""}
            onChange={d.priceFromApi ? undefined : (e => {
              const newUnitPrice = e.target.value ? parseFloat(e.target.value) : null;
              onUpdate(item.id, {
                unitPrice: newUnitPrice,
                totalPrice: newUnitPrice != null ? newUnitPrice * d.qty : null,
              });
            })}
            readOnly={!!d.priceFromApi}
            placeholder={d.priceFromApi ? "Preço da API" : "Definir preço"}
            className={`mt-1 h-8 text-sm${d.priceFromApi ? " bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
          />
          {d.priceFromApi && (
            <p className="text-xs text-muted-foreground mt-0.5">Preço definido pela API — não editável.</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-bold text-primary">
            {d.totalPrice != null && d.totalPrice > 0 ? formatBRL(d.totalPrice) : "A consultar"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Edit (add revision) dialog — full form with all tabs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    clientName: "", clientContact: "", clientPhone: "", clientEmail: "",
    projectName: "", projectRef: "", notes: "",
    seller1Id: "", seller1Name: "", seller2Id: "", seller2Name: "",
    assistantId: "", assistantName: "", versionNotes: "",
    rtPercent: "0", rtDest1: "", rtDest1Active: true, rtDest2: "", rtDest2Active: false, rtDest3: "", rtDest3Active: false,
    marginPercent: "10",
    freteType: "free" as "free" | "paid" | "night" | "consult",
    freteIsento: false, freteLocalidade: "sp" as "sp" | "other",
    // Novos campos
    deliveryDays: "20",
    commissionPercent: "5",
    paymentTerm: "30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)",
    destState: "",
    difalEnabled: false,
    fcpEnabled: false,
  });

  // Sellers & Assistants for edit dialog
  const sellersQuery = trpc.sellers.list.useQuery();
  const assistantsQuery = trpc.assistants.list.useQuery();
  const editSellers = sellersQuery.data ?? [];
  const editAssistants = assistantsQuery.data ?? [];

  // Catálogo de produtos para resolver fotos atualizadas (URLs CloudFront expiram)
  const productsQuery = trpc.alfalux.products.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const productPhotoMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of productsQuery.data ?? []) {
      if (p.sku && p.fotoUrl) map.set(p.sku, p.fotoUrl);
    }
    return map;
  }, [productsQuery.data]);

  /** Retorna a URL de foto mais fresca: catálogo > salva no banco > null */
  const resolvePhoto = (sku: string | undefined, savedUrl: string | null): string | null => {
    if (sku && productPhotoMap.has(sku)) return productPhotoMap.get(sku)!;
    return savedUrl;
  };

  // Delete dialog — triple confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0, 1, 2
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Seleção de empresa para Ficha de Produção
  const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<"ALFALUX" | "LUMINEW">("ALFALUX");

  // Edição de itens do orçamento
  const [editItemsDialogOpen, setEditItemsDialogOpen] = useState(false);
  // editableItems: cópia dos itens da versão atual para edição
  const [editableItems, setEditableItems] = useState<Array<{
    id: number;
    itemNumber: number;
    itemData: string;
    parsed: CartItemData;
  }>>([]);
  const [editItemsNotes, setEditItemsNotes] = useState("");

  // DnD sensors para reordenação de itens
  const editItemsSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleEditItemsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditableItems(prev => {
        const oldIndex = prev.findIndex(it => it.id === Number(active.id));
        const newIndex = prev.findIndex(it => it.id === Number(over.id));
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const { data, isLoading, error } = trpc.quotes.getById.useQuery({ id: Number(id) });

  const addRevisionForItemsMutation = trpc.quotes.addRevision.useMutation({
    onSuccess: () => {
      utils.quotes.getById.invalidate({ id: Number(id) });
      utils.quotes.list.invalidate();
      toast.success("Itens atualizados! Nova revisão criada.");
      setEditItemsDialogOpen(false);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

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

  const logProductionSheetMutation = trpc.quotes.logProductionSheet.useMutation();

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

  const { quote, versions, items, canEdit } = data;
  const st = STATUS_LABELS[quote.status] ?? STATUS_LABELS.open;

  // Itens da versão mais recente
  const currentVersionId = versions[0]?.id;
  const currentItems = items.filter(i => i.quoteVersionId === currentVersionId);

  // RT/Margem calc for edit form
  const editTotalBase = currentItems.reduce((s, i) => { const d = parseCartItemData(i.itemData); return s + (d?.totalPrice ?? 0); }, 0);
  const editRtPct = Math.min(Math.max(parseFloat(editForm.rtPercent || "0") / 100, 0), 0.99);
  const editMarginPct = Math.min(Math.max(parseFloat(editForm.marginPercent || "0") / 100, 0), 0.99);
  const editTotalComRT = editRtPct > 0 ? editTotalBase / (1 - editRtPct) : editTotalBase;
  const editTotalFinal = editMarginPct > 0 ? editTotalComRT / (1 - editMarginPct) : editTotalComRT;

  const handleGenerateQuote = async () => {
    setIsGenerating(true);
    try {
      // Gerar nova revisão ao baixar o Excel (bumpVersion: true)
      await new Promise<void>((resolve, reject) => {
        addRevisionMutation.mutate({
          quoteId: Number(id),
          clientName: quote.clientName,
          clientContact: quote.clientContact ?? undefined,
          clientPhone: quote.clientPhone ?? undefined,
          clientEmail: quote.clientEmail ?? undefined,
          projectName: quote.projectName ?? undefined,
          projectRef: quote.projectRef ?? undefined,
          notes: quote.notes ?? undefined,
          vendorName: quote.vendorName ?? undefined,
          assistantName: quote.assistantName ?? undefined,
          seller1Id: quote.seller1Id ?? undefined,
          seller1Name: quote.seller1Name ?? undefined,
          seller2Id: quote.seller2Id ?? undefined,
          seller2Name: quote.seller2Name ?? undefined,
          assistantId: quote.assistantId ?? undefined,
          rtPercent: quote.rtPercent ? parseFloat(String(quote.rtPercent)) : 0,
          rtDest1: quote.rtDest1 ?? undefined,
          rtDest1Active: quote.rtDest1Active ?? false,
          rtDest2: quote.rtDest2 ?? undefined,
          rtDest2Active: quote.rtDest2Active ?? false,
          rtDest3: quote.rtDest3 ?? undefined,
          rtDest3Active: quote.rtDest3Active ?? false,
          marginPercent: quote.marginPercent ? parseFloat(String(quote.marginPercent)) : 0,
          freteType: (quote.freteType as "free" | "paid" | "night" | "consult") ?? "free",
          freteIsento: quote.freteIsento ?? false,
          freteLocalidade: (quote.freteLocalidade as "sp" | "other") ?? "sp",
          totalAmount: parseFloat(String(quote.totalAmount ?? 0)),
          totalFinal: parseFloat(String(quote.totalFinal ?? 0)),
          items: currentItems.map((i, idx) => ({ itemNumber: idx + 1, itemData: i.itemData })),
          bumpVersion: true,
          deliveryDays: quote.deliveryDays ?? 20,
          commissionPercent: quote.commissionPercent ? parseFloat(String(quote.commissionPercent)) : 0.05,
          paymentTerm: quote.paymentTerm ?? undefined,
          destState: quote.destState ?? undefined,
          difalEnabled: quote.difalEnabled ?? false,
          difalPercent: quote.difalPercent ? parseFloat(String(quote.difalPercent)) : 0,
          fcpPercent: quote.fcpPercent ? parseFloat(String(quote.fcpPercent)) : 0,
          fcpEnabled: quote.fcpEnabled ?? false,
          difalValue: quote.difalValue ? parseFloat(String(quote.difalValue)) : 0,
          fcpValue: quote.fcpValue ? parseFloat(String(quote.fcpValue)) : 0,
        }, { onSuccess: () => resolve(), onError: (e) => reject(e) });
      });
      // Buscar telefones dos vendedores pelo ID no catálogo
      const s1 = quote.seller1Id ? editSellers.find(s => s.id === quote.seller1Id) : undefined;
      const s2 = quote.seller2Id ? editSellers.find(s => s.id === quote.seller2Id) : undefined;
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
          seller1Name: quote.seller1Name ?? undefined,
          seller1Phone: s1?.phone ?? undefined,
          seller2Name: quote.seller2Name ?? undefined,
          seller2Phone: s2?.phone ?? undefined,
          assistantName: quote.assistantName ?? undefined,
          rtPercent: quote.rtPercent ? parseFloat(String(quote.rtPercent)) : undefined,
          rtDest1: quote.rtDest1 ?? undefined,
          rtDest1Active: quote.rtDest1Active ?? false,
          rtDest2: quote.rtDest2 ?? undefined,
          rtDest2Active: quote.rtDest2Active ?? false,
          rtDest3: quote.rtDest3 ?? undefined,
          rtDest3Active: quote.rtDest3Active ?? false,
          marginPercent: quote.marginPercent ? parseFloat(String(quote.marginPercent)) : undefined,
          freteType: (quote.freteType as "free" | "paid" | "night" | "consult") ?? "free",
          freteIsento: quote.freteIsento ?? false,
          freteLocalidade: (quote.freteLocalidade as "sp" | "other") ?? "sp",
          revisionCount: quote.revisionCount ?? 0,
          deliveryDays: quote.deliveryDays ?? 20,
          commissionPercent: quote.commissionPercent ? parseFloat(String(quote.commissionPercent)) : undefined,
          paymentTerm: quote.paymentTerm ?? undefined,
          destState: quote.destState ?? undefined,
          difalEnabled: quote.difalEnabled ?? false,
          difalPercent: quote.difalPercent ? parseFloat(String(quote.difalPercent)) : undefined,
          difalValue: quote.difalValue ? parseFloat(String(quote.difalValue)) : undefined,
          fcpEnabled: quote.fcpEnabled ?? false,
          fcpPercent: quote.fcpPercent ? parseFloat(String(quote.fcpPercent)) : undefined,
          fcpValue: quote.fcpValue ? parseFloat(String(quote.fcpValue)) : undefined,
        }
      );
      toast.success("Orçamento Excel gerado!");
    } catch (err) {
      toast.error("Erro ao gerar orçamento.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateOrder = async (empresa: "ALFALUX" | "LUMINEW") => {
    setIsGenerating(true);
    setEmpresaDialogOpen(false);
    try {
      // Calcular prazo com feriados nacionais antes de gerar o Excel
      const deliveryDays = quote.deliveryDays ?? 20;
      const approvedAtIso = quote.approvedAt ? new Date(quote.approvedAt).toISOString() : new Date().toISOString();
      const { displayDays, deliveryDateStr } = await calcDeliveryDate(approvedAtIso, deliveryDays);

      await generateOrderExcel(
        currentItems.map(i => parseCartItemData(i.itemData)).filter((d): d is CartItemData => d !== null),
        {
          clientName: quote.clientName,
          projectName: quote.projectName ?? "",
          quoteNumber: quote.quoteNumber,
          vendorName: quote.vendorName ?? "",
          date: new Date(quote.approvedAt ?? quote.createdAt).toLocaleDateString("pt-BR"),
          empresa,
          deliveryDays,
          approvedAt: approvedAtIso,
          precomputedDisplayDays: displayDays,
          precomputedDeliveryDate: deliveryDateStr,
        }
      );
      // Registrar geração no log de auditoria
      logProductionSheetMutation.mutate({
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        empresa,
      });
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
              <p>🔄 Versão atual: <span className="font-bold">v{quote.currentVersion}</span>{quote.revisionCount != null && quote.revisionCount > 0 && <span className="ml-2 text-xs text-muted-foreground">({quote.revisionCount} revisão{quote.revisionCount !== 1 ? "ões" : ""})</span>}</p>
              {quote.approvedAt && (
                <p className="text-green-600 dark:text-green-400 font-medium">
                  ✅ Aprovado em: {new Date(quote.approvedAt).toLocaleDateString("pt-BR")}
                </p>
              )}
              {/* Novos campos comerciais */}
              {quote.deliveryDays != null && (
                <p>🚚 Prazo: <span className="font-medium">{quote.deliveryDays} dias úteis</span></p>
              )}
              {quote.paymentTerm && (
                <p>💳 Pagamento: <span className="font-medium">{quote.paymentTerm}</span></p>
              )}
              {quote.commissionPercent != null && Number(quote.commissionPercent) > 0 && (() => {
                const commPct = parseFloat(String(quote.commissionPercent));
                // Base de comissão = totalAmount (valor dos produtos, sem RT/margem) - 12% impostos
                const total = quote.totalAmount ? Number(quote.totalAmount) : (quote.totalFinal ? Number(quote.totalFinal) : 0);
                const base = total * (1 - 0.12);
                const commVal = base * commPct;
                return (
                  <p className="text-amber-700 dark:text-amber-400">
                    💰 Comissão: <span className="font-medium">{(commPct * 100).toFixed(1)}%</span>
                    {commVal > 0 && <span className="ml-1 text-xs">({formatBRL(commVal)})</span>}
                  </p>
                );
              })()}
              {quote.destState && (
                <p>🗺️ Destino: <span className="font-medium">{quote.destState}</span>
                  {quote.difalEnabled && quote.difalValue != null && Number(quote.difalValue) > 0 && (
                    <span className="ml-1 text-xs text-orange-600">DIFAL: {formatBRL(Number(quote.difalValue))}</span>
                  )}
                  {quote.fcpEnabled && quote.fcpValue != null && Number(quote.fcpValue) > 0 && (
                    <span className="ml-1 text-xs text-orange-600">FCP: {formatBRL(Number(quote.fcpValue))}</span>
                  )}
                </p>
              )}
              {(() => {
                const displayTotal = quote.totalFinal && Number(quote.totalFinal) > 0
                  ? Number(quote.totalFinal)
                  : (quote.totalAmount ? Number(quote.totalAmount) : 0);
                return displayTotal > 0 ? (
                  <p className="text-primary font-bold text-lg">{formatBRL(displayTotal)}</p>
                ) : null;
              })()}
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
            <>
              <Button
                className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => setEmpresaDialogOpen(true)}
                disabled={isGenerating}
              >
                <Factory className="w-4 h-4" />
                Gerar Pedido de Fábrica
              </Button>

              {/* Dialog de seleção de empresa */}
              <Dialog open={empresaDialogOpen} onOpenChange={setEmpresaDialogOpen}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Empresa Fabricante</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">Selecione a empresa que irá fabricar este pedido. A seleção aparecerá marcada na Ficha Técnica de Produção.</p>
                  <div className="flex flex-col gap-3 py-2">
                    <button
                      onClick={() => setEmpresaSelecionada("ALFALUX")}
                      className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                        empresaSelecionada === "ALFALUX"
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                          : "border-border hover:border-orange-300"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        empresaSelecionada === "ALFALUX" ? "border-orange-500" : "border-muted-foreground"
                      }`}>
                        {empresaSelecionada === "ALFALUX" && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                      </span>
                      <span className="font-semibold text-sm">1 — ALFALUX</span>
                    </button>
                    <button
                      onClick={() => setEmpresaSelecionada("LUMINEW")}
                      className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                        empresaSelecionada === "LUMINEW"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                          : "border-border hover:border-blue-300"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        empresaSelecionada === "LUMINEW" ? "border-blue-500" : "border-muted-foreground"
                      }`}>
                        {empresaSelecionada === "LUMINEW" && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                      </span>
                      <span className="font-semibold text-sm">2 — LUMINEW</span>
                    </button>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setEmpresaDialogOpen(false)}>Cancelar</Button>
                    <Button
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={() => handleGenerateOrder(empresaSelecionada)}
                    >
                      <Factory className="w-4 h-4 mr-2" />
                      Gerar Ficha
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* Adicionar mais itens ao orçamento */}
          {canEdit && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`/?appendToQuote=${quote.id}`)}
          >
            <PlusCircle className="w-4 h-4" />
            Adicionar Itens
          </Button>
          )}

          {/* Editar Itens do Orçamento */}
          {canEdit && <Sheet open={editItemsDialogOpen} onOpenChange={(open) => {
            setEditItemsDialogOpen(open);
            if (open) {
              setEditableItems(currentItems.map(item => {
                const parsed = parseCartItemData(item.itemData);
                return {
                  id: item.id,
                  itemNumber: item.itemNumber,
                  itemData: item.itemData,
                  parsed: parsed ?? ({} as CartItemData),
                };
              }));
              setEditItemsNotes("");
            }
          }}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Pencil className="w-4 h-4" />
                Editar Itens
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto flex flex-col p-0">
              <SheetHeader className="px-6 pt-6 pb-3 border-b">
                <SheetTitle className="flex items-center gap-2 text-lg">
                  <ShoppingBag className="w-5 h-5" />
                  Editar Itens do Orçamento
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Edite quantidades, cor, temperatura de cor e identificação em planta. Uma nova revisão será criada ao salvar.
                </p>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">

<DndContext sensors={editItemsSensors} collisionDetection={closestCenter} onDragEnd={handleEditItemsDragEnd}>
                  <SortableContext items={editableItems.map(it => it.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {editableItems.map((item, idx) => (
                        <SortableEditItem
                          key={item.id}
                          item={item}
                          idx={idx}
                          resolvePhoto={resolvePhoto}
                          onUpdate={(id, fields) => {
                            setEditableItems(prev => prev.map(it => {
                              if (it.id !== id) return it;
                              const newParsed = { ...it.parsed, ...fields };
                              if (fields.qty !== undefined || fields.unitPrice !== undefined) {
                                const qty = fields.qty ?? newParsed.qty;
                                const up = fields.unitPrice ?? newParsed.unitPrice;
                                newParsed.totalPrice = up != null ? up * qty : null;
                              }
                              return { ...it, parsed: newParsed, itemData: JSON.stringify(newParsed) };
                            }));
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Nota da revisão */}
                <div className="mt-4">
                  <Label className="text-xs">Nota desta revisão (opcional)</Label>
                  <Textarea
                    value={editItemsNotes}
                    onChange={e => setEditItemsNotes(e.target.value)}
                    placeholder="Ex: Ajuste de quantidades após reunião com cliente"
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>{/* end flex-1 scroll area */}

              {/* Footer fixo */}
              <div className="px-6 py-4 border-t bg-background">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium">Total dos itens</span>
                  <span className="text-lg font-bold text-primary">
                    {formatBRL(editableItems.reduce((s, it) => s + (it.parsed.totalPrice ?? 0), 0))}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditItemsDialogOpen(false)}>Cancelar</Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const totalBase = editableItems.reduce((s, it) => s + (it.parsed.totalPrice ?? 0), 0);
                      const rtPct = quote.rtPercent ? parseFloat(String(quote.rtPercent)) : 0;
                      const marginPct = quote.marginPercent ? parseFloat(String(quote.marginPercent)) : 0;
                      const totalComRT = rtPct > 0 ? totalBase / (1 - rtPct) : totalBase;
                      const totalFinal = marginPct > 0 ? totalComRT / (1 - marginPct) : totalComRT;
                      addRevisionForItemsMutation.mutate({
                        quoteId: Number(id),
                        clientName: quote.clientName,
                        clientContact: quote.clientContact ?? undefined,
                        clientPhone: quote.clientPhone ?? undefined,
                        clientEmail: quote.clientEmail ?? undefined,
                        projectName: quote.projectName ?? undefined,
                        projectRef: quote.projectRef ?? undefined,
                        notes: quote.notes ?? undefined,
                        vendorName: quote.vendorName ?? undefined,
                        assistantName: quote.assistantName ?? undefined,
                        seller1Id: quote.seller1Id ?? undefined,
                        seller1Name: quote.seller1Name ?? undefined,
                        seller2Id: quote.seller2Id ?? undefined,
                        seller2Name: quote.seller2Name ?? undefined,
                        assistantId: quote.assistantId ?? undefined,
                        rtPercent: rtPct,
                        rtDest1: quote.rtDest1 ?? undefined,
                        rtDest1Active: quote.rtDest1Active ?? undefined,
                        rtDest2: quote.rtDest2 ?? undefined,
                        rtDest2Active: quote.rtDest2Active ?? undefined,
                        rtDest3: quote.rtDest3 ?? undefined,
                        rtDest3Active: quote.rtDest3Active ?? undefined,
                        marginPercent: marginPct,
                        freteType: (quote.freteType as "free" | "paid" | "night" | "consult") ?? "free",
                        freteIsento: quote.freteIsento ?? undefined,
                        freteLocalidade: (quote.freteLocalidade as "sp" | "other") ?? "sp",
                        versionNotes: editItemsNotes || undefined,
                        totalAmount: totalFinal,
                        totalFinal,
                        items: editableItems.map((it, i) => ({ itemNumber: i + 1, itemData: it.itemData })),
                        bumpVersion: false,
                      });
                    }}
                    disabled={addRevisionForItemsMutation.isPending}
                  >
                    {addRevisionForItemsMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>}

          {/* Alterar Status */}
          {canEdit && <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
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
          </Dialog>}

          {/* Editar Orçamento (nova revisão) — todas as abas */}
          {canEdit && <Dialog open={editDialogOpen} onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (open) {
              setEditForm({
                clientName: quote.clientName,
                clientContact: quote.clientContact ?? "",
                clientPhone: quote.clientPhone ?? "",
                clientEmail: quote.clientEmail ?? "",
                projectName: quote.projectName ?? "",
                projectRef: quote.projectRef ?? "",
                notes: quote.notes ?? "",
                seller1Id: quote.seller1Id ? String(quote.seller1Id) : "",
                seller1Name: quote.seller1Name ?? "",
                seller2Id: quote.seller2Id ? String(quote.seller2Id) : "",
                seller2Name: quote.seller2Name ?? "",
                assistantId: quote.assistantId ? String(quote.assistantId) : "",
                assistantName: quote.assistantName ?? "",
                versionNotes: "",
                rtPercent: quote.rtPercent ? String(parseFloat(String(quote.rtPercent)) * 100) : "0",
                rtDest1: quote.rtDest1 ?? "",
                rtDest1Active: quote.rtDest1Active ?? true,
                rtDest2: quote.rtDest2 ?? "",
                rtDest2Active: quote.rtDest2Active ?? false,
                rtDest3: quote.rtDest3 ?? "",
                rtDest3Active: quote.rtDest3Active ?? false,
                marginPercent: quote.marginPercent ? String(parseFloat(String(quote.marginPercent)) * 100) : "10",
                freteType: (quote.freteType as "free" | "paid" | "night" | "consult") ?? "free",
                freteIsento: quote.freteIsento ?? false,
                freteLocalidade: (quote.freteLocalidade as "sp" | "other") ?? "sp",
                deliveryDays: quote.deliveryDays != null ? String(quote.deliveryDays) : "20",
                commissionPercent: quote.commissionPercent != null ? String(parseFloat(String(quote.commissionPercent)) * 100) : "5",
                paymentTerm: quote.paymentTerm ?? "30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)",
                destState: quote.destState ?? "",
                difalEnabled: quote.difalEnabled ?? false,
                fcpEnabled: quote.fcpEnabled ?? false,
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <PenLine className="w-4 h-4" />
                Editar Orçamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Orçamento</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground -mt-2 mb-2">
                Alterações são salvas sem gerar nova revisão. Uma nova revisão é gerada automaticamente ao baixar o Excel.
              </p>
              <Tabs defaultValue="equipe">
                <TabsList className="w-full">
                  <TabsTrigger value="equipe" className="flex-1"><Users className="w-3 h-3 mr-1" />Equipe</TabsTrigger>
                  <TabsTrigger value="cliente" className="flex-1">Cliente</TabsTrigger>
                  <TabsTrigger value="financeiro" className="flex-1"><Percent className="w-3 h-3 mr-1" />RT / Margem</TabsTrigger>
                  <TabsTrigger value="frete" className="flex-1"><Truck className="w-3 h-3 mr-1" />Frete</TabsTrigger>
                  <TabsTrigger value="comercial" className="flex-1"><ShoppingBag className="w-3 h-3 mr-1" />Comercial</TabsTrigger>
                </TabsList>

                {/* Aba Equipe */}
                <TabsContent value="equipe" className="space-y-3 pt-3">
                  <div>
                    <Label>Vendedor 1</Label>
                    <Select value={editForm.seller1Id} onValueChange={(v) => {
                      const sel = editSellers.find(s => String(s.id) === v);
                      setEditForm(f => ({ ...f, seller1Id: v, seller1Name: sel?.name ?? "" }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecione o vendedor principal" /></SelectTrigger>
                      <SelectContent>{editSellers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Vendedor 2 (opcional)</Label>
                    <Select value={editForm.seller2Id || "none"} onValueChange={(v) => {
                      if (v === "none") setEditForm(f => ({ ...f, seller2Id: "", seller2Name: "" }));
                      else { const sel = editSellers.find(s => String(s.id) === v); setEditForm(f => ({ ...f, seller2Id: v, seller2Name: sel?.name ?? "" })); }
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {editSellers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assistente Comercial</Label>
                    <Select value={editForm.assistantId} onValueChange={(v) => {
                      const ast = editAssistants.find(a => String(a.id) === v);
                      setEditForm(f => ({ ...f, assistantId: v, assistantName: ast?.name ?? "" }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecione o assistente" /></SelectTrigger>
                      <SelectContent>{editAssistants.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notas desta revisão</Label>
                    <Textarea value={editForm.versionNotes} onChange={e => setEditForm(f => ({ ...f, versionNotes: e.target.value }))} placeholder="Ex: Ajuste de preços..." rows={2} />
                  </div>
                </TabsContent>

                {/* Aba Cliente */}
                <TabsContent value="cliente" className="space-y-3 pt-3">
                  <div>
                    <Label>Cliente *</Label>
                    <Input value={editForm.clientName} onChange={e => setEditForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Nome do cliente" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Contato</Label>
                      <Input value={editForm.clientContact} onChange={e => setEditForm(f => ({ ...f, clientContact: e.target.value }))} placeholder="Nome do contato" />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input value={editForm.clientPhone} onChange={e => setEditForm(f => ({ ...f, clientPhone: e.target.value }))} placeholder="(11) 99999-9999" />
                    </div>
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input value={editForm.clientEmail} onChange={e => setEditForm(f => ({ ...f, clientEmail: e.target.value }))} placeholder="email@cliente.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Obra / Projeto</Label>
                      <Input value={editForm.projectName} onChange={e => setEditForm(f => ({ ...f, projectName: e.target.value }))} placeholder="Nome da obra" />
                    </div>
                    <div>
                      <Label>Referência</Label>
                      <Input value={editForm.projectRef} onChange={e => setEditForm(f => ({ ...f, projectRef: e.target.value }))} placeholder="Código de referência" />
                    </div>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações gerais" />
                  </div>
                </TabsContent>

                {/* Aba RT / Margem */}
                <TabsContent value="financeiro" className="space-y-4 pt-3">
                  <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
                    Fórmula: <code>Preço final = base ÷ (1 − RT%) ÷ (1 − Margem%)</code>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2"><Percent className="w-3 h-3" />Reserva Técnica (RT)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input type="number" min={0} max={99} step={0.5} className="w-24" value={editForm.rtPercent} onChange={e => setEditForm(f => ({ ...f, rtPercent: e.target.value }))} />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  {editRtPct > 0 && (
                    <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                      <Label className="text-xs text-muted-foreground">Destinos da RT (até 3)</Label>
                      {[1, 2, 3].map((n) => {
                        const dk = `rtDest${n}` as keyof typeof editForm;
                        const ak = `rtDest${n}Active` as keyof typeof editForm;
                        return (
                          <div key={n} className="flex items-center gap-2">
                            <Checkbox checked={editForm[ak] as boolean} onCheckedChange={(v) => setEditForm(f => ({ ...f, [ak]: Boolean(v) }))} />
                            <Input placeholder={`Destino ${n}`} value={editForm[dk] as string} onChange={e => setEditForm(f => ({ ...f, [dk]: e.target.value }))} disabled={!editForm[ak]} className="flex-1" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div>
                    <Label className="flex items-center gap-2"><Percent className="w-3 h-3" />Margem de Negociação</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input type="number" min={0} max={99} step={0.5} className="w-24" value={editForm.marginPercent} onChange={e => setEditForm(f => ({ ...f, marginPercent: e.target.value }))} />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="bg-muted/60 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBRL(editTotalBase)}</span></div>
                    {editRtPct > 0 && <div className="flex justify-between"><span className="text-muted-foreground">+ RT ({editForm.rtPercent}%)</span><span>{formatBRL(editTotalComRT - editTotalBase)}</span></div>}
                    {editMarginPct > 0 && <div className="flex justify-between"><span className="text-muted-foreground">+ Margem ({editForm.marginPercent}%)</span><span>{formatBRL(editTotalFinal - editTotalComRT)}</span></div>}
                    <div className="flex justify-between font-bold border-t pt-1"><span>Total final</span><span className="text-primary">{formatBRL(editTotalFinal)}</span></div>
                  </div>
                </TabsContent>

                {/* Aba Frete */}
                <TabsContent value="frete" className="space-y-4 pt-3">
                  <div>
                    <Label>Localidade de entrega</Label>
                    <Select value={editForm.freteLocalidade} onValueChange={(v) => setEditForm(f => ({ ...f, freteLocalidade: v as "sp" | "other" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sp">São Paulo (SP)</SelectItem>
                        <SelectItem value="other">Outra cidade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de frete</Label>
                    <Select value={editForm.freteType} onValueChange={(v) => setEditForm(f => ({ ...f, freteType: v as "free" | "paid" | "night" | "consult" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Grátis (SP, acima de R$1.500)</SelectItem>
                        <SelectItem value="paid">A calcular</SelectItem>
                        <SelectItem value="night">Noturno (R$2.000)</SelectItem>
                        <SelectItem value="consult">Sob consulta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="editFreteIsento" checked={editForm.freteIsento} onCheckedChange={(v) => setEditForm(f => ({ ...f, freteIsento: Boolean(v) }))} />
                    <label htmlFor="editFreteIsento" className="text-sm cursor-pointer">Isentar frete</label>
                  </div>
                </TabsContent>

                {/* Aba Comercial */}
                <TabsContent value="comercial" className="space-y-4 pt-3">
                  {/* Prazo de entrega */}
                  <div>
                    <Label>Prazo de entrega (dias úteis)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={1} max={365} step={1}
                        className="w-28"
                        value={editForm.deliveryDays}
                        onChange={e => setEditForm(f => ({ ...f, deliveryDays: e.target.value }))}
                      />
                      <span className="text-sm text-muted-foreground">dias úteis (padrão: 20)</span>
                    </div>
                  </div>

                  {/* Condição de pagamento */}
                  <div>
                    <Label>Condição de pagamento</Label>
                    <Select
                      value={["30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)","À VISTA","A COMBINAR","50% Sinal e 50% a 28DDF","100% Antecipado"].includes(editForm.paymentTerm ?? "") ? (editForm.paymentTerm ?? "") : "__custom__"}
                      onValueChange={(v) => {
                        if (v === "__custom__") {
                          setEditForm(f => ({ ...f, paymentTerm: "" }));
                        } else {
                          setEditForm(f => ({ ...f, paymentTerm: v }));
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)">30% Sinal + 70% a 28DDF</SelectItem>
                        <SelectItem value="À VISTA">À VISTA</SelectItem>
                        <SelectItem value="A COMBINAR">A COMBINAR</SelectItem>
                        <SelectItem value="50% Sinal e 50% a 28DDF">50% Sinal + 50% a 28DDF</SelectItem>
                        <SelectItem value="100% Antecipado">100% Antecipado</SelectItem>
                        <SelectItem value="__custom__">Especificar...</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Campo de texto livre quando "Especificar" for selecionado */}
                    {!["30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)","À VISTA","A COMBINAR","50% Sinal e 50% a 28DDF","100% Antecipado"].includes(editForm.paymentTerm ?? "") && (
                      <Input
                        className="mt-2"
                        placeholder="Digite a condição de pagamento..."
                        value={editForm.paymentTerm ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, paymentTerm: e.target.value }))}
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Será impresso no Excel do orçamento.</p>
                  </div>

                  {/* Comissão do vendedor */}
                  <div className="border rounded-lg p-3 space-y-2 bg-amber-50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium">Comissão do Vendedor (demonstrativo)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={0} max={5} step={0.5}
                        className="w-24"
                        value={editForm.commissionPercent}
                        onChange={e => {
                          const val = Math.min(5, Math.max(0, parseFloat(e.target.value) || 0));
                          setEditForm(f => ({ ...f, commissionPercent: String(val) }));
                        }}
                      />
                      <span className="text-sm text-muted-foreground">% (máx. 5%)</span>
                    </div>
                    {(() => {
                      const commPct = parseFloat(editForm.commissionPercent || "0") / 100;
                      const baseComComissao = editTotalBase * (1 - 0.12); // base = valor dos produtos (sem RT/margem) - 12% impostos
                      const commValue = baseComComissao * commPct;
                      return commValue > 0 ? (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Base (produtos − 12% impostos): </span>
                          <span className="font-medium">{formatBRL(baseComComissao)}</span>
                          <br />
                          <span className="text-muted-foreground">Comissão estimada: </span>
                          <span className="font-semibold text-amber-700 dark:text-amber-400">{formatBRL(commValue)}</span>
                        </div>
                      ) : null;
                    })()}
                    <p className="text-xs text-muted-foreground">Não altera o valor do orçamento. Apenas demonstrativo para controle interno.</p>
                  </div>

                  {/* DIFAL / FCP */}
                  <div className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">DIFAL / FCP (venda interestadual)</span>
                    </div>
                    <div>
                      <Label>Estado destino</Label>
                      <Select
                        value={editForm.destState || "none"}
                        onValueChange={(v) => setEditForm(f => ({ ...f, destState: v === "none" ? "" : v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="none">Selecione...</SelectItem>
                          <SelectItem value="SP">SP — São Paulo (venda interna — sem DIFAL)</SelectItem>
                          {DIFAL_TABLE.map(s => (
                            <SelectItem key={s.uf} value={s.uf}>
                              {s.uf} — {s.name} (DIFAL {s.difal.toFixed(1)}% + FCP {s.fcp.toFixed(1)}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {editForm.destState === "SP" && (
                      <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                        São Paulo é o estado de origem — DIFAL não se aplica para vendas internas.
                      </p>
                    )}
                    {editForm.destState && editForm.destState !== "none" && editForm.destState !== "SP" && (() => {
                      const info = getStateInfo(editForm.destState);
                      if (!info) return null;
                      const difalVal = (editTotalFinal * info.difal) / 100;
                      const fcpVal = (editTotalFinal * info.fcp) / 100;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="editDifalEnabled"
                              checked={editForm.difalEnabled}
                              onCheckedChange={(v) => setEditForm(f => ({ ...f, difalEnabled: Boolean(v) }))}
                            />
                            <label htmlFor="editDifalEnabled" className="text-sm cursor-pointer">
                              Aplicar DIFAL ({info.difal.toFixed(1)}%) = {formatBRL(difalVal)}
                            </label>
                          </div>
                          {info.fcp > 0 && (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="editFcpEnabled"
                                checked={editForm.fcpEnabled}
                                onCheckedChange={(v) => setEditForm(f => ({ ...f, fcpEnabled: Boolean(v) }))}
                              />
                              <label htmlFor="editFcpEnabled" className="text-sm cursor-pointer">
                                Aplicar FCP ({info.fcp.toFixed(1)}%) = {formatBRL(fcpVal)}
                              </label>
                            </div>
                          )}
                          {(editForm.difalEnabled || editForm.fcpEnabled) && (
                            <div className="bg-muted/60 rounded p-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total com DIFAL/FCP</span>
                                <span className="font-semibold">
                                  {formatBRL(editTotalFinal + (editForm.difalEnabled ? difalVal : 0) + (editForm.fcpEnabled ? fcpVal : 0))}
                                </span>
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Alíquota interna {info.uf}: {info.icmsInterno}% | Interestadual SP→{info.uf}: {info.icmsInterestadual}%
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => {
                    if (!editForm.clientName.trim()) { toast.error("Nome do cliente é obrigatório."); return; }
                    const editRtPctVal = Math.min(Math.max(parseFloat(editForm.rtPercent || "0") / 100, 0), 0.99);
                    const editMarginPctVal = Math.min(Math.max(parseFloat(editForm.marginPercent || "0") / 100, 0), 0.99);
                    const totalComRTVal = editRtPctVal > 0 ? editTotalBase / (1 - editRtPctVal) : editTotalBase;
                    const totalFinalVal = editMarginPctVal > 0 ? totalComRTVal / (1 - editMarginPctVal) : totalComRTVal;
                    addRevisionMutation.mutate({
                      quoteId: Number(id),
                      clientName: editForm.clientName.trim(),
                      clientContact: editForm.clientContact || undefined,
                      clientPhone: editForm.clientPhone || undefined,
                      clientEmail: editForm.clientEmail || undefined,
                      projectName: editForm.projectName || undefined,
                      projectRef: editForm.projectRef || undefined,
                      notes: editForm.notes || undefined,
                      vendorName: editForm.seller1Name || undefined,
                      assistantName: editForm.assistantName || undefined,
                      seller1Id: editForm.seller1Id ? parseInt(editForm.seller1Id) : undefined,
                      seller1Name: editForm.seller1Name || undefined,
                      seller2Id: editForm.seller2Id ? parseInt(editForm.seller2Id) : undefined,
                      seller2Name: editForm.seller2Name || undefined,
                      assistantId: editForm.assistantId ? parseInt(editForm.assistantId) : undefined,
                      rtPercent: editRtPctVal,
                      rtDest1: editForm.rtDest1 || undefined,
                      rtDest1Active: editForm.rtDest1Active,
                      rtDest2: editForm.rtDest2 || undefined,
                      rtDest2Active: editForm.rtDest2Active,
                      rtDest3: editForm.rtDest3 || undefined,
                      rtDest3Active: editForm.rtDest3Active,
                      marginPercent: editMarginPctVal,
                      freteType: editForm.freteType,
                      freteIsento: editForm.freteIsento,
                      freteLocalidade: editForm.freteLocalidade,
                      versionNotes: editForm.versionNotes || undefined,
                      totalAmount: totalFinalVal,
                      totalFinal: totalFinalVal,
                      items: currentItems.map((i, idx) => ({ itemNumber: idx + 1, itemData: i.itemData })),
                      bumpVersion: false,
                      deliveryDays: parseInt(editForm.deliveryDays || "20") || 20,
                      commissionPercent: Math.min(Math.max(parseFloat(editForm.commissionPercent || "5") / 100, 0), 1),
                      paymentTerm: editForm.paymentTerm || undefined,
                      destState: editForm.destState || undefined,
                      difalEnabled: editForm.difalEnabled,
                      fcpEnabled: editForm.fcpEnabled,
                      ...(() => {
                        const info = editForm.destState ? getStateInfo(editForm.destState) : undefined;
                        return {
                          difalPercent: info ? info.difal : 0,
                          fcpPercent: info ? info.fcp : 0,
                          difalValue: info && editForm.difalEnabled ? (totalFinalVal * info.difal) / 100 : 0,
                          fcpValue: info && editForm.fcpEnabled ? (totalFinalVal * info.fcp) / 100 : 0,
                        };
                      })(),
                    });
                  }}
                  disabled={addRevisionMutation.isPending}
                >
                  {addRevisionMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>}

          {/* Excluir Orçamento — tripla confirmação */}
          {canEdit && <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
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
          </Dialog>}
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
                    {resolvePhoto(d.sku, d.photoUrl) ? (
                      <img src={resolvePhoto(d.sku, d.photoUrl)!} alt={d.description} className="w-12 h-12 object-contain rounded border bg-white flex-shrink-0" />
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
                      {(() => {
                        const rtPct = quote.rtPercent ? parseFloat(String(quote.rtPercent)) : 0;
                        const mPct = quote.marginPercent ? parseFloat(String(quote.marginPercent)) : 0;
                        const applyMkup = (base: number) => {
                          const comRT = rtPct > 0 ? base / (1 - rtPct) : base;
                          return mPct > 0 ? comRT / (1 - mPct) : comRT;
                        };
                        const hasMarkup = rtPct > 0 || mPct > 0;
                        const unitDisplay = d.unitPrice != null && d.unitPrice > 0
                          ? (hasMarkup ? applyMkup(d.unitPrice) : d.unitPrice)
                          : null;
                        const totalDisplay = d.totalPrice != null && d.totalPrice > 0
                          ? (hasMarkup ? applyMkup(d.totalPrice) : d.totalPrice)
                          : null;
                        return (
                          <>
                            {unitDisplay != null && (
                              <p className="text-xs text-muted-foreground">{formatBRL(unitDisplay)}/un</p>
                            )}
                            {totalDisplay != null ? (
                              <p className="font-bold text-primary text-sm">{formatBRL(totalDisplay)}</p>
                            ) : (
                              <p className="text-xs italic text-muted-foreground">A consultar</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
{(() => {
                const displayTotal = quote.totalFinal && Number(quote.totalFinal) > 0
                  ? Number(quote.totalFinal)
                  : (quote.totalAmount ? Number(quote.totalAmount) : 0);
                return displayTotal > 0 ? (
                  <div className="px-4 py-3 border-t bg-primary/5 flex justify-between items-center">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-xl font-bold text-primary">{formatBRL(displayTotal)}</span>
                  </div>
                ) : null;
              })()}
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
                            {(() => {
                              const vTotal = v.totalFinal && Number(v.totalFinal) > 0
                                ? Number(v.totalFinal)
                                : (v.totalAmount ? Number(v.totalAmount) : 0);
                              return vTotal > 0 ? formatBRL(vTotal) : "—";
                            })()}
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
