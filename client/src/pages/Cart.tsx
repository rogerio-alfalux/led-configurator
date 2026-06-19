import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ShoppingCart, Trash2, FileSpreadsheet, ArrowLeft, Package,
  Plus, Minus, Save, ClipboardList, Factory, AlertTriangle,
  ChevronRight, ChevronDown, ChevronUp, Tag, Percent, Truck, Users, PlusCircle, CheckCircle2,
  GripVertical, Pencil, Wrench, Eye, Upload, X, Copy, Layers,
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
import type { LinkedAccessory } from "@/lib/cartTypes";
import { generateQuoteExcel } from "@/lib/quoteExcelGenerator";
import { ExcelPreviewModal } from "@/components/ExcelPreviewModal";
import { generateOrderExcel, calcDeliveryDate } from "@/lib/orderExcelGenerator";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DIFAL_TABLE, getStateInfo } from "@/lib/difalTable";
import { PRICE_OVERRIDE_EMAILS, MANAGER_EMAILS } from "@shared/const";
import { toBrasiliaDate } from "@/lib/dateUtils";

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
  freteStateCode: string;  // UF do estado de entrega (ex: SP, RJ)
  freteCity: string;        // Nome da cidade de entrega
  notes: string;
  versionNotes: string;
  // Campos comerciais
  deliveryDays: string;
  paymentTerm: string;
  paymentTermCustom: string;
  commissionPercent: string;
  destState: string;
  difalEnabled: boolean;
  difalPercent: string;
  difalValue: string;
  fcpEnabled: boolean;
  fcpPercent: string;
  fcpValue: string;
  // v32.24
  projectNumber: string;
  projectNoProject: boolean; // checkbox "Sem Projeto"
  commissionPercent2: string;
  freteValue: string;
  freteState: string;
  freteIncluded: boolean;
}

interface OrderFormData {
  clientName: string;
  projectName: string;
  vendorName: string;
  quoteRef: string;
  empresa: "ALFALUX" | "LUMINEW";
  deliveryDays: string;
}

// ── Componente sortable de item do carrinho ─────────────────────────────────
interface SortableCartItemProps {
  entry: { id: number; data: CartItemData; createdAt: string };
  idx: number;
  itemEmPlantaMap: Record<number, string>;
  setItemEmPlantaMap: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  updateItemField: (id: number, patch: Record<string, unknown>, debounceMs?: number) => void;
  handleUpdateQty: (id: number, currentQty: number, delta: number) => void;
  handleQtyInput: (id: number, value: string) => void;
  removeItem: (id: number) => void;
  updateQtyMutation: { isPending: boolean };
  isRemoving: boolean;
  onEditClick: (id: number, data: CartItemData) => void;
  onDuplicate: (data: CartItemData) => void;
  acessorioPhotoMap: Map<string, string>;
}

function SortableCartItem({
  entry, idx, itemEmPlantaMap, setItemEmPlantaMap, updateItemField,
  handleUpdateQty, handleQtyInput, removeItem, updateQtyMutation, isRemoving, onEditClick, onDuplicate,
  acessorioPhotoMap,
}: SortableCartItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-start gap-3 p-4">
            {/* Handle de drag */}
            <button
              {...attributes}
              {...listeners}
              className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-1 touch-none"
              title="Arrastar para reordenar"
            >
              <GripVertical className="w-5 h-5" />
            </button>

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
                    {entry.data.corPeca && <span>🎨 {entry.data.corPeca}</span>}
                    <span className="text-muted-foreground/60">{entry.data.category}</span>
                  </div>
                  {/* Controle de quantidade */}
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="outline" size="icon" className="h-6 w-6"
                      onClick={() => handleUpdateQty(entry.id, entry.data.qty, -1)}
                      disabled={updateQtyMutation.isPending || entry.data.qty <= 1}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <input type="number" min={1} value={entry.data.qty}
                      onChange={(e) => handleQtyInput(entry.id, e.target.value)}
                      onBlur={(e) => handleQtyInput(entry.id, e.target.value)}
                      className="text-sm font-semibold w-14 text-center border border-border rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      disabled={updateQtyMutation.isPending}
                    />
                    <Button variant="outline" size="icon" className="h-6 w-6"
                      onClick={() => handleUpdateQty(entry.id, entry.data.qty, 1)}
                      disabled={updateQtyMutation.isPending}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <span className="text-xs text-muted-foreground">un</span>
                  </div>
                  {/* Item em Planta */}
                  <div className="flex items-center gap-2 mt-2">
                    <Tag className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <input type="text" placeholder="Item em planta (ex: L1)"
                      value={itemEmPlantaMap[entry.id] ?? entry.data.itemEmPlanta ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItemEmPlantaMap(prev => ({ ...prev, [entry.id]: val }));
                        updateItemField(entry.id, { itemEmPlanta: val });
                      }}
                      className="text-xs border border-border rounded px-2 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary w-40"
                    />
                  </div>
                  {/* Pavimento / Ambiente */}
                  {(entry.data.floorName || entry.data.ambiente) && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {entry.data.floorName && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                          🏢 {entry.data.floorName}
                        </span>
                      )}
                      {entry.data.ambiente && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/20">
                          📍 {entry.data.ambiente}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Observação do item */}
                  {entry.data.itemNote && (
                    <p className="text-xs text-muted-foreground italic mt-1 truncate max-w-xs" title={entry.data.itemNote}>
                      📋 {entry.data.itemNote}
                    </p>
                  )}
                  {/* Acessórios vinculados */}
                  {entry.data.accessories && entry.data.accessories.length > 0 && (
                    <div className="mt-2 border-l-2 border-cyan-500/40 pl-2 space-y-1">
                          {(entry.data.accessories as LinkedAccessory[]).map((acc, i) => {
                            const freshFoto = (acc.codigo && acessorioPhotoMap.get(acc.codigo)) || acc.fotoUrl || null;
                            return (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                          {freshFoto ? (
                            <img src={freshFoto} alt={acc.descricao} className="w-6 h-6 object-contain rounded bg-white border border-border flex-shrink-0" />
                          ) : (
                            <Wrench className="w-3 h-3 flex-shrink-0 text-cyan-500" />
                          )}
                          <span className="font-mono text-[10px] text-muted-foreground">{acc.codigo}</span>
                          <span className="text-cyan-700 dark:text-cyan-400 truncate">{acc.descricao}</span>
                          {acc.qty > 1 && <span className="text-muted-foreground">x{acc.qty}</span>}
                          {acc.unitPrice != null && acc.unitPrice > 0 && (
                            <span className="ml-auto text-muted-foreground">{formatBRL(acc.unitPrice)}</span>
                          )}
                        </div>
                      );
                          })}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {entry.data.unitPrice != null && entry.data.unitPrice > 0 && (
                    <p className="text-xs text-muted-foreground">{formatBRL(entry.data.unitPrice)} / un</p>
                  )}
                  {entry.data.totalPrice != null && entry.data.totalPrice > 0 ? (
                    <p className="font-bold text-primary text-base">{formatBRL(entry.data.totalPrice)}</p>
                  ) : !entry.data.priceFromApi ? (
                    <p className="text-xs text-amber-600 italic cursor-pointer hover:underline" onClick={() => onEditClick(entry.id, entry.data)}>Definir preço →</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Preço a consultar</p>
                  )}
                  {/* Botão editar */}
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    title="Editar CCT, potência e cor"
                    onClick={() => onEditClick(entry.id, entry.data)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  {/* Botão duplicar */}
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-blue-500"
                    title="Duplicar item"
                    onClick={() => onDuplicate(entry.data)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Remover */}
            <Button variant="ghost" size="icon"
              className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => removeItem(entry.id)}
              disabled={isRemoving}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Componente de barra de grupo de pavimento (arrastável + expandir/recolher) ──
interface FloorGroupBarProps {
  floorId: string;
  displayName: string;
  editingName: string;
  groupEntries: { id: number; data: CartItemData; createdAt: string }[];
  isCollapsed: boolean;
  isDraggingThis: boolean;
  onToggleCollapse: () => void;
  onRenameChange: (val: string) => void;
  onRenameBlur: (newName: string) => void;
  children: React.ReactNode;
}

function FloorGroupBar({
  floorId, displayName, editingName, groupEntries, isCollapsed, isDraggingThis,
  onToggleCollapse, onRenameChange, onRenameBlur, children,
}: FloorGroupBarProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: floorId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {/* Barra de título do pavimento */}
      <div className={`flex items-center gap-2 mb-3 group rounded-lg px-2 py-1 transition-colors ${
        isDragging ? 'bg-indigo-500/10 border border-indigo-500/30' : 'hover:bg-indigo-500/5'
      }`}>
        {/* Handle de drag do grupo */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-indigo-400/60 hover:text-indigo-400 touch-none"
          title="Arrastar grupo de pavimento"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <input
          type="text"
          value={editingName}
          onChange={(e) => onRenameChange(e.target.value)}
          onBlur={(e) => onRenameBlur(e.target.value.trim())}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          disabled={displayName === 'Sem Pavimento'}
          className={`text-sm font-semibold text-indigo-400 uppercase tracking-wide bg-transparent border-0 border-b border-transparent focus:border-indigo-400 focus:outline-none px-0 py-0 min-w-0 w-auto ${
            displayName === 'Sem Pavimento' ? 'cursor-default' : 'hover:border-indigo-400/50 cursor-text'
          }`}
          style={{ width: `${Math.max(editingName.length, 8)}ch` }}
          title={displayName !== 'Sem Pavimento' ? 'Clique para renomear o pavimento' : ''}
        />
        <span className="text-xs text-muted-foreground flex-shrink-0">({groupEntries.length} {groupEntries.length === 1 ? 'item' : 'itens'})</span>
        <div className="flex-1 h-px bg-indigo-500/20" />
        {/* Botão expandir/recolher */}
        <button
          onClick={onToggleCollapse}
          className="flex-shrink-0 text-indigo-400/60 hover:text-indigo-400 transition-colors"
          title={isCollapsed ? 'Expandir grupo' : 'Recolher grupo'}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
      {children}
    </div>
  );
}

// ─── Componente de seleção de cidade via API IBGE ───────────────────────────
function FreteIbgeCitySelect({
  stateCode,
  value,
  onChange,
}: {
  stateCode: string;
  value: string;
  onChange: (city: string) => void;
}) {
  const [cities, setCities] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!stateCode) return;
    setLoading(true);
    setCities([]);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateCode}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: { nome: string }[]) => {
        setCities(data.map(d => d.nome));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [stateCode]);

  return (
    <div>
      <Label>Cidade de entrega</Label>
      <Select
        value={value || ""}
        onValueChange={onChange}
        disabled={loading || cities.length === 0}
      >
        <SelectTrigger>
          {loading ? (
            <span className="text-muted-foreground text-sm">Carregando cidades...</span>
          ) : (
            <SelectValue placeholder="Selecione a cidade" />
          )}
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {cities.map(city => (
            <SelectItem key={city} value={city}>{city}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
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
  const { entries, count, isLoading, removeItem, clearCart, isRemoving, updateItemField, addItem } = useCart();
  const utils = trpc.useUtils();

  const updateQtyMutation = trpc.cart.updateQty.useMutation({
    onSuccess: () => utils.cart.list.invalidate(),
  });
  const saveQuoteMutation = trpc.quotes.save.useMutation({
    onSuccess: (data) => {
      toast.success(`Orçamento ${data.quoteNumber} salvo com sucesso!`);
      setSaveDialogOpen(false);
      // Limpar o carrinho e o rascunho do formulário após salvar o orçamento
      clearCart();
      try { localStorage.removeItem("alfalux_cart_save_form_draft"); } catch { /* ignore */ }
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
      try { localStorage.removeItem("alfalux_cart_save_form_draft"); } catch { /* ignore */ }
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

  // Catálogo de acessórios para resolver fotos frescas (URLs CloudFront expiram)
  const acessoriosQuery = trpc.alfalux.acessoriosProducts.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const acessorioPhotoMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of acessoriosQuery.data ?? []) {
      const key = p.codigo ?? p.sku;
      if (key && p.fotoUrl) map.set(key, p.fotoUrl);
    }
    return map;
  }, [acessoriosQuery.data]);

  // Todos os produtos Alfalux para resolver fotos frescas de Painéis, Spots, etc.
  // URLs CloudFront expiram em ~1h; buscamos sempre frescos com staleTime curto
  const allProductsQuery = trpc.alfalux.products.useQuery(undefined, { staleTime: 3 * 60 * 1000 });
  // Produtos de revenda para resolver fotos frescas (RV00050, RV00051, etc.)
  const revendaProductsQuery = trpc.alfalux.revendaProducts.useQuery(undefined, { staleTime: 3 * 60 * 1000 });
  /** Mapa sku -> fotoUrl fresca para substituir URLs expiradas no preview.
   * Cobre: produtos principais (Downlights, Painéis, Spots, etc.),
   * produtos de revenda (RV*) e acessórios (EQ*, CP*). */
  const freshPhotoMap = useMemo(() => {
    const map = new Map<string, string>(); // sku -> fotoUrl fresca
    // Produtos principais
    for (const p of allProductsQuery.data ?? []) {
      if (p.sku && p.fotoUrl) map.set(p.sku, p.fotoUrl);
    }
    // Produtos de revenda (sku = codigo)
    for (const p of revendaProductsQuery.data ?? []) {
      if (p.sku && p.fotoUrl) map.set(p.sku, p.fotoUrl);
    }
    // Acessórios (indexados por codigo e sku)
    for (const p of acessoriosQuery.data ?? []) {
      const key = p.codigo ?? p.sku;
      if (key && p.fotoUrl) map.set(key, p.fotoUrl);
      if (p.sku && p.sku !== key && p.fotoUrl) map.set(p.sku, p.fotoUrl);
    }
    return map;
  }, [allProductsQuery.data, revendaProductsQuery.data, acessoriosQuery.data]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Item em Planta — mapa local (UI imediata) + autosave via updateItemField
  const [itemEmPlantaMap, setItemEmPlantaMap] = useState<Record<number, string>>({});

  // Agrupamento por pavimento
  const [groupByFloor, setGroupByFloor] = useState(false);
  // Renomeação inline de pavimento: mapa de nome antigo -> novo nome sendo editado
  const [floorRenameMap, setFloorRenameMap] = useState<Record<string, string>>({});
  // Pavimentos recolhidos (collapsed)
  const [collapsedFloors, setCollapsedFloors] = useState<Set<string>>(new Set());
  const toggleFloorCollapse = (floorName: string) => {
    setCollapsedFloors(prev => {
      const next = new Set(prev);
      if (next.has(floorName)) next.delete(floorName);
      else next.add(floorName);
      return next;
    });
  };
  // Drag de grupo: ID do grupo sendo arrastado
  const [draggingFloor, setDraggingFloor] = useState<string | null>(null);

  // Drag-and-drop: ordenação local dos IDs
  const [orderedIds, setOrderedIds] = useState<number[]>([]);
  // Sincronizar orderedIds quando entries mudam (ex: item removido ou adicionado)
  useEffect(() => {
    setOrderedIds(prev => {
      const currentIds = entries.map(e => e.id);
      // Manter a ordem existente, adicionando novos ao final e removendo os que saíram
      const kept = prev.filter(id => currentIds.includes(id));
      const added = currentIds.filter(id => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [entries.map(e => e.id).join(',')]);

  // Entries reordenadas conforme orderedIds
  const orderedEntries = useMemo(() => {
    if (orderedIds.length === 0) return entries;
    const map = new Map(entries.map(e => [e.id, e]));
    return orderedIds.map(id => map.get(id)).filter((e): e is typeof entries[0] => e !== null && e !== undefined);
  }, [entries, orderedIds]);

  // Renomear todos os itens de um pavimento de uma vez
  const renameFloor = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    orderedEntries
      .filter(e => (e.data.floorName?.trim() || "Sem Pavimento") === oldName)
      .forEach(e => updateItemField(e.id, { floorName: trimmed, floorId: trimmed }, 0));
  }, [orderedEntries, updateItemField]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingFloor(null);
    if (!over || active.id === over.id) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Drag de grupo de pavimento: IDs com prefixo "floor:"
    if (activeIdStr.startsWith("floor:") && overIdStr.startsWith("floor:")) {
      const activeFloor = activeIdStr.slice(6);
      const overFloor = overIdStr.slice(6);
      setOrderedIds(prev => {
        // Encontrar todos os IDs de cada grupo na ordem atual
        const entriesMap = new Map(entries.map(e => [e.id, e]));
        const ordered = prev.map(id => entriesMap.get(id)).filter(Boolean) as typeof entries;
        const activeIds = ordered.filter(e => (e.data.floorName?.trim() || "Sem Pavimento") === activeFloor).map(e => e.id);
        const overIds = ordered.filter(e => (e.data.floorName?.trim() || "Sem Pavimento") === overFloor).map(e => e.id);
        if (activeIds.length === 0 || overIds.length === 0) return prev;
        // Remover todos os IDs do grupo ativo
        const withoutActive = prev.filter(id => !activeIds.includes(id));
        // Encontrar posição do primeiro item do grupo destino
        const firstOverIdx = withoutActive.indexOf(overIds[0]);
        if (firstOverIdx === -1) return prev;
        // Inserir o grupo ativo antes do grupo destino
        const result = [...withoutActive];
        result.splice(firstOverIdx, 0, ...activeIds);
        return result;
      });
      return;
    }

    // Drag de item individual
    setOrderedIds(prev => {
      const oldIndex = prev.indexOf(Number(active.id));
      const newIndex = prev.indexOf(Number(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  // Edição inline de campos do item
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<{ cct: string; power: string; corPeca: string; qty: string; unitPrice: string; itemNote: string; itemObs: string; itemObsShowInExcel: boolean; itemMarginPercent: string; floorId: string; floorName: string; ambiente: string; specialColorTemp: string }>({ cct: '', power: '', corPeca: '', qty: '', unitPrice: '', itemNote: '', itemObs: '', itemObsShowInExcel: false, itemMarginPercent: '', floorId: '', floorName: '', ambiente: '', specialColorTemp: '' });
  // Estados para edição de foto de Item Especial
  const [editSpecialPhotoUrl, setEditSpecialPhotoUrl] = useState<string | null>(null);
  const [editSpecialPhotoPreview, setEditSpecialPhotoPreview] = useState<string | null>(null);
  const [editSpecialPhotoUploading, setEditSpecialPhotoUploading] = useState(false);
  const uploadSpecialPhotoMutationCart = trpc.upload.specialItemPhoto.useMutation();

  // Pedido de Fábrica direto do carrinho
  const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderForm, setOrderForm] = useState<OrderFormData>({
    clientName: "",
    projectName: "",
    vendorName: "",
    quoteRef: "",
    empresa: "ALFALUX",
    deliveryDays: "20",
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
    data: toBrasiliaDate(new Date()),
  });

  // Formulário para salvar no banco — persiste no localStorage para sobreviver à navegação
  const SAVE_FORM_STORAGE_KEY = "alfalux_cart_save_form_draft";
  const defaultSaveForm: SaveFormData = {
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
    marginPercent: "0",
    freteType: "free",
    freteIsento: false,
    freteStateCode: "SP",
    freteCity: "",
    notes: "",
    versionNotes: "",
    deliveryDays: "20",
    paymentTerm: "30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)",
    paymentTermCustom: "",
    commissionPercent: "5",
    destState: "SP",
    difalEnabled: false,
    difalPercent: "",
    difalValue: "",
    fcpEnabled: false,
    fcpPercent: "",
    fcpValue: "",
    projectNumber: "",
    projectNoProject: false,
    commissionPercent2: "0",
    freteValue: "",
    freteState: "",
    freteIncluded: false,
  };
  const [saveForm, setSaveForm] = useState<SaveFormData>(() => {
    try {
      const stored = localStorage.getItem(SAVE_FORM_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SaveFormData>;
        // Mesclar com defaultSaveForm para garantir que campos novos tenham valor padrão
        return { ...defaultSaveForm, ...parsed };
      }
    } catch { /* ignore */ }
    return defaultSaveForm;
  });
  // Persistir saveForm no localStorage sempre que mudar
  useEffect(() => {
    try {
      // Não persistir versionNotes (específico de cada revisão)
      const toPersist = { ...saveForm, versionNotes: "" };
      localStorage.setItem(SAVE_FORM_STORAGE_KEY, JSON.stringify(toPersist));
    } catch { /* ignore */ }
  }, [saveForm]);

  // Busca sugestão de número ao abrir o diálogo (atualiza quando vendedor muda)
  const seller1IdNum = saveForm.seller1Id ? parseInt(saveForm.seller1Id) : undefined;
  const suggestQuery = trpc.quotes.suggestNumber.useQuery(
    { sellerId: seller1IdNum },
    { enabled: saveDialogOpen, staleTime: 0 }
  );
  // Flag para saber se o usuário editou manualmente o número de orçamento
  const [userEditedQuoteNumber, setUserEditedQuoteNumber] = React.useState(false);
  // Atualiza número automaticamente quando vendedor é selecionado — apenas se o usuário não editou manualmente
  useEffect(() => {
    if (saveDialogOpen && suggestQuery.data?.suggested && !userEditedQuoteNumber) {
      setSaveForm(prev => ({ ...prev, quoteNumber: suggestQuery.data!.suggested }));
    }
  }, [saveDialogOpen, suggestQuery.data?.suggested, saveForm.seller1Id, userEditedQuoteNumber]);
  // Resetar flag quando o diálogo fecha
  useEffect(() => {
    if (!saveDialogOpen) setUserEditedQuoteNumber(false);
  }, [saveDialogOpen]);

  // Auto-preenche o estado da aba Frete quando o estado da aba Comercial muda
  // (apenas se o usuário ainda não escolheu um estado diferente na aba Frete)
  const prevDestStateRef = React.useRef(saveForm.destState);
  useEffect(() => {
    if (saveForm.destState && saveForm.destState !== prevDestStateRef.current) {
      setSaveForm(prev => ({
        ...prev,
        freteStateCode: saveForm.destState,
        freteCity: "",
      }));
    }
    prevDestStateRef.current = saveForm.destState;
  }, [saveForm.destState]);

  // Comissão automática de 2,5% para cada vendedor quando há 2º vendedor
  const prevSeller2IdRef = React.useRef(saveForm.seller2Id);
  useEffect(() => {
    const hadSeller2 = !!prevSeller2IdRef.current;
    const hasSeller2 = !!saveForm.seller2Id;
    if (hasSeller2 && !hadSeller2) {
      // Acabou de selecionar 2º vendedor: definir 2,5% para cada
      setSaveForm(prev => ({
        ...prev,
        commissionPercent: "2.5",
        commissionPercent2: "2.5",
      }));
    } else if (!hasSeller2 && hadSeller2) {
      // Removeu o 2º vendedor: voltar para 5% no 1º e zerar o 2º
      setSaveForm(prev => ({
        ...prev,
        commissionPercent: "5",
        commissionPercent2: "0",
      }));
    }
    prevSeller2IdRef.current = saveForm.seller2Id;
  }, [saveForm.seller2Id]);

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
  const userEmail = (user as any)?.email?.toLowerCase() ?? "";
  const userRole = (user as any)?.role;
  const isManagerUser = userRole === 'admin' || userRole === 'gerente' || MANAGER_EMAILS.map(e => e.toLowerCase()).includes(userEmail);

  let freteValor = 0;
  let freteLabel = "";
  if (!saveForm.freteIsento) {
    if (saveForm.freteType === "night") {
      freteValor = FRETE_NOTURNO;
      freteLabel = `Frete noturno: ${formatBRL(FRETE_NOTURNO)}`;
    } else if (saveForm.freteType === "paid") {
      // Frete "A calcular": se houver valor digitado, somar ao total
      const paidVal = saveForm.freteValue ? parseFloat(saveForm.freteValue) : 0;
      if (paidVal > 0 && !saveForm.freteIncluded) {
        freteValor = paidVal;
        freteLabel = `Frete a calcular: ${formatBRL(paidVal)}`;
      } else if (paidVal > 0) {
        freteLabel = `Frete a calcular: ${formatBRL(paidVal)} (já incluído)`;
      } else {
        freteLabel = "Frete: a calcular (aguardando cotação)";
      }
    } else if (saveForm.freteType === "consult") {
      freteLabel = "Frete: sob consulta";
    } else if (!saveForm.freteStateCode || saveForm.freteStateCode === "SP") {
      if (totalFinal >= FRETE_GRATIS_MINIMO) {
        freteLabel = "Frete grátis (SP)";
      } else {
        freteLabel = "Frete: a calcular (SP)";
      }
    } else {
      const cityPart = saveForm.freteCity ? ` — ${saveForm.freteCity}` : "";
      freteLabel = `Frete: sob consulta (${saveForm.freteStateCode}${cityPart})`;
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
      // Buscar telefones dos vendedores pelo ID no catálogo
      const seller1Obj = saveForm.seller1Id ? sellers.find(s => String(s.id) === saveForm.seller1Id) : undefined;
      const seller2Obj = saveForm.seller2Id ? sellers.find(s => String(s.id) === saveForm.seller2Id) : undefined;
      const enrichedForm: QuoteFormData = {
        ...form,
        seller1Id: saveForm.seller1Id ? Number(saveForm.seller1Id) : undefined,
        seller1Name: saveForm.seller1Name || undefined,
        seller1Phone: seller1Obj?.phone || undefined,
        seller2Id: saveForm.seller2Id ? Number(saveForm.seller2Id) : undefined,
        seller2Name: saveForm.seller2Name || undefined,
        seller2Phone: seller2Obj?.phone || undefined,
        assistantId: saveForm.assistantId && saveForm.assistantId !== "VENDEDOR" ? Number(saveForm.assistantId) : undefined,
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
        freteLocalidade: saveForm.freteStateCode === "SP" ? "sp" : "other",
        freteCity: saveForm.freteCity,
        freteState: saveForm.freteStateCode || undefined,
        // revisionCount: 0 para orçamentos gerados diretamente do carrinho (sem revisões)
        revisionCount: 0,
        deliveryDays: parseInt(saveForm.deliveryDays) || 20,
        paymentTerm: saveForm.paymentTerm || undefined,
        commissionPercent: (parseFloat(saveForm.commissionPercent) || 5) / 100,
        destState: saveForm.destState || undefined,
        difalEnabled: saveForm.difalEnabled,
        difalPercent: saveForm.difalEnabled && saveForm.difalPercent ? parseFloat(saveForm.difalPercent) : undefined,
        difalValue: saveForm.difalEnabled && saveForm.difalValue ? parseFloat(saveForm.difalValue) : undefined,
        fcpEnabled: saveForm.fcpEnabled,
        fcpPercent: saveForm.fcpEnabled && saveForm.fcpPercent ? parseFloat(saveForm.fcpPercent) : undefined,
        fcpValue: saveForm.fcpEnabled && saveForm.fcpValue ? parseFloat(saveForm.fcpValue) : undefined,
        projectNumber: saveForm.projectNumber || undefined,
        commissionPercent2: saveForm.commissionPercent2 ? (parseFloat(saveForm.commissionPercent2) || 0) / 100 : undefined,
        freteValue: saveForm.freteValue ? parseFloat(saveForm.freteValue) : undefined,
        freteIncluded: saveForm.freteIncluded,
      };
      // Injetar itemEmPlanta em cada item (respeitando a ordem do DnD)
      const itemsWithPlanta = orderedEntries.map((e, idx) => ({
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
    if (!saveForm.projectName.trim()) {
      toast.error("Informe o nome da Obra / Projeto.");
      return;
    }
    if (!saveForm.projectNumber.trim()) {
      toast.error("Informe o Número do Projeto ou marque \"Sem Projeto\".");
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
      assistantId: saveForm.assistantId && saveForm.assistantId !== "VENDEDOR" ? parseInt(saveForm.assistantId) : undefined,
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
      freteLocalidade: saveForm.freteStateCode === "SP" ? "sp" : "other",
      notes: saveForm.notes || undefined,
      versionNotes: saveForm.versionNotes || undefined,
      deliveryDays: parseInt(saveForm.deliveryDays) || 20,
      paymentTerm: saveForm.paymentTerm || undefined,
      commissionPercent: (parseFloat(saveForm.commissionPercent) || 5) / 100,
      destState: saveForm.destState || undefined,
      difalEnabled: saveForm.difalEnabled,
      difalPercent: saveForm.difalEnabled && saveForm.difalPercent ? parseFloat(saveForm.difalPercent) : undefined,
      difalValue: saveForm.difalEnabled && saveForm.difalValue ? parseFloat(saveForm.difalValue) : undefined,
      fcpEnabled: saveForm.fcpEnabled,
      fcpPercent: saveForm.fcpEnabled && saveForm.fcpPercent ? parseFloat(saveForm.fcpPercent) : undefined,
      fcpValue: saveForm.fcpEnabled && saveForm.fcpValue ? parseFloat(saveForm.fcpValue) : undefined,
      projectNumber: saveForm.projectNumber || undefined,
      commissionPercent2: saveForm.commissionPercent2 ? (parseFloat(saveForm.commissionPercent2) || 0) / 100 : undefined,
      freteValue: saveForm.freteValue ? parseFloat(saveForm.freteValue) : undefined,
      freteState: saveForm.freteStateCode || undefined,
      freteCity: saveForm.freteCity || undefined,
      freteIncluded: saveForm.freteIncluded,
      totalAmount: totalGeral,
      totalFinal: totalFinal + freteValor,
      items: orderedEntries.map((e, idx) => ({
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
      const items = orderedEntries
        .map(e => parseCartItemData(JSON.stringify({
          ...e.data,
          itemEmPlanta: itemEmPlantaMap[e.id] || e.data.itemEmPlanta || "",
        })))
        .filter((d): d is CartItemData => d !== null);

      const deliveryDaysNum = parseInt(orderForm.deliveryDays) || 20;
      const approvedAtIso = new Date().toISOString();
      const { displayDays, deliveryDateStr } = await calcDeliveryDate(approvedAtIso, deliveryDaysNum);
      await generateOrderExcel(items, {
        clientName: orderForm.clientName,
        projectName: orderForm.projectName,
        quoteNumber: orderForm.quoteRef || "SEM-ORC",
        vendorName: orderForm.vendorName,
        date: new Date().toLocaleDateString("pt-BR"),
        empresa: orderForm.empresa,
        deliveryDays: deliveryDaysNum,
        approvedAt: approvedAtIso,
        precomputedDisplayDays: displayDays,
        precomputedDeliveryDate: deliveryDateStr,
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
          <Button
            variant={groupByFloor ? "default" : "outline"}
            size="sm"
            className="ml-2 gap-1.5 text-xs h-7"
            onClick={() => setGroupByFloor(v => !v)}
            title={groupByFloor ? "Desagrupar por pavimento" : "Agrupar por pavimento"}
          >
            <Layers className="w-3.5 h-3.5" />
            {groupByFloor ? "Agrupado" : "Agrupar"}
          </Button>
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
            {/* Lista de itens com Drag-and-Drop */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}
              onDragStart={(event) => {
                const id = String(event.active.id);
                if (id.startsWith("floor:")) setDraggingFloor(id.slice(6));
              }}
            >
{/* Renderização: agrupada por pavimento (com barras de título editáveis) ou lista plana */}
              {(() => {
                // Calcular grupos de pavimento (sempre, para exibir barras)
                const floorMap = new Map<string, typeof orderedEntries>();
                for (const entry of orderedEntries) {
                  const floor = entry.data.floorName?.trim() || "";
                  if (!floorMap.has(floor)) floorMap.set(floor, []);
                  floorMap.get(floor)!.push(entry);
                }
                const hasMultipleFloors = floorMap.size > 1 || (floorMap.size === 1 && !floorMap.has(""));
                const showFloorBars = groupByFloor || hasMultipleFloors;

                if (!showFloorBars) {
                  // Lista plana sem barras de pavimento
                  return (
                    <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {orderedEntries.map((entry, idx) => (
                        <SortableCartItem
                          key={entry.id}
                          entry={entry}
                          idx={idx}
                          itemEmPlantaMap={itemEmPlantaMap}
                          setItemEmPlantaMap={setItemEmPlantaMap}
                          updateItemField={updateItemField}
                          handleUpdateQty={handleUpdateQty}
                          handleQtyInput={handleQtyInput}
                          removeItem={removeItem}
                          updateQtyMutation={updateQtyMutation}
                          isRemoving={isRemoving}
                          acessorioPhotoMap={acessorioPhotoMap}
                          onDuplicate={(data) => { addItem({ ...data, itemEmPlanta: data.itemEmPlanta ?? '' }); toast.success('Item duplicado no carrinho'); }}
                          onEditClick={(id, data) => {
                            setEditItemId(id);
                            setEditFields({ cct: data.cct ?? '', power: data.power ?? '', corPeca: data.corPeca ?? '', qty: String(data.qty ?? 1), unitPrice: data.unitPrice ? String(data.unitPrice).replace('.', ',') : '', itemNote: data.itemNote ?? '', itemObs: data.itemObs ?? '', itemObsShowInExcel: data.itemObsShowInExcel ?? false, itemMarginPercent: data.itemMarginPercent != null ? String(data.itemMarginPercent) : '', floorId: data.floorId ?? '', floorName: data.floorName ?? '', ambiente: data.ambiente ?? '', specialColorTemp: data.specialColorTemp ?? '' });
                            if (data.isSpecialItem) { setEditSpecialPhotoUrl(data.specialPhotoUrl ?? data.photoUrl ?? null); setEditSpecialPhotoPreview(data.specialPhotoUrl ?? data.photoUrl ?? null); } else { setEditSpecialPhotoUrl(null); setEditSpecialPhotoPreview(null); }
                          }}
                        />
                      ))}
                    </div>
                    </SortableContext>
                  );
                }

                // Lista agrupada com barras de título de pavimento editáveis + drag de grupo + expandir/recolher
                const groups: { floor: string; entries: typeof orderedEntries }[] = [];
                // Manter a ordem dos grupos conforme a ordem dos itens (não alfabética)
                const seenFloors = new Set<string>();
                for (const entry of orderedEntries) {
                  const f = entry.data.floorName?.trim() || "";
                  if (!seenFloors.has(f)) { seenFloors.add(f); groups.push({ floor: f, entries: floorMap.get(f)! }); }
                }
                // IDs para o SortableContext: apenas os IDs de grupo (floor:*)
                const groupSortableIds = groups.map(g => `floor:${g.floor || 'Sem Pavimento'}`);

                return (
                  <SortableContext items={groupSortableIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-6">
                    {groups.map(({ floor, entries: groupEntries }) => {
                      const displayName = floor || "Sem Pavimento";
                      const editingName = floorRenameMap[displayName] ?? displayName;
                      const isCollapsed = collapsedFloors.has(displayName);
                      const isDraggingThis = draggingFloor === floor;
                      return (
                        <FloorGroupBar
                          key={displayName}
                          floorId={`floor:${displayName}`}
                          displayName={displayName}
                          editingName={editingName}
                          groupEntries={groupEntries}
                          isCollapsed={isCollapsed}
                          isDraggingThis={isDraggingThis}
                          onToggleCollapse={() => toggleFloorCollapse(displayName)}
                          onRenameChange={(val) => setFloorRenameMap(prev => ({ ...prev, [displayName]: val }))}
                          onRenameBlur={(newName) => {
                            if (newName && newName !== displayName) {
                              renameFloor(displayName, newName);
                              setFloorRenameMap(prev => { const next = { ...prev }; delete next[displayName]; return next; });
                            } else {
                              setFloorRenameMap(prev => { const next = { ...prev }; delete next[displayName]; return next; });
                            }
                          }}
                        >
                          {!isCollapsed && (
                            <SortableContext items={groupEntries.map(e => e.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                              {groupEntries.map((entry, idx) => (
                                <SortableCartItem
                                  key={entry.id}
                                  entry={entry}
                                  idx={idx}
                                  itemEmPlantaMap={itemEmPlantaMap}
                                  setItemEmPlantaMap={setItemEmPlantaMap}
                                  updateItemField={updateItemField}
                                  handleUpdateQty={handleUpdateQty}
                                  handleQtyInput={handleQtyInput}
                                  removeItem={removeItem}
                                  updateQtyMutation={updateQtyMutation}
                                  isRemoving={isRemoving}
                                  acessorioPhotoMap={acessorioPhotoMap}
                                  onDuplicate={(data) => { addItem({ ...data, itemEmPlanta: data.itemEmPlanta ?? '' }); toast.success('Item duplicado no carrinho'); }}
                                  onEditClick={(id, data) => {
                                    setEditItemId(id);
                                    setEditFields({ cct: data.cct ?? '', power: data.power ?? '', corPeca: data.corPeca ?? '', qty: String(data.qty ?? 1), unitPrice: data.unitPrice ? String(data.unitPrice).replace('.', ',') : '', itemNote: data.itemNote ?? '', itemObs: data.itemObs ?? '', itemObsShowInExcel: data.itemObsShowInExcel ?? false, itemMarginPercent: data.itemMarginPercent != null ? String(data.itemMarginPercent) : '', floorId: data.floorId ?? '', floorName: data.floorName ?? '', ambiente: data.ambiente ?? '', specialColorTemp: data.specialColorTemp ?? '' });
                                    if (data.isSpecialItem) { setEditSpecialPhotoUrl(data.specialPhotoUrl ?? data.photoUrl ?? null); setEditSpecialPhotoPreview(data.specialPhotoUrl ?? data.photoUrl ?? null); } else { setEditSpecialPhotoUrl(null); setEditSpecialPhotoPreview(null); }
                                  }}
                                />
                              ))}
                            </div>
                            </SortableContext>
                          )}
                        </FloorGroupBar>
                      );
                    })}
                  </div>
                  </SortableContext>
                );
              })()}
            </DndContext>

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
                          const newItems = orderedEntries.map((e, idx) => ({
                            itemNumber: idx + 1,
                            itemData: JSON.stringify({
                              ...e.data,
                              itemEmPlanta: itemEmPlantaMap[e.id] ?? e.data.itemEmPlanta ?? "",
                            }),
                          }));
                          appendItemsMutation.mutate({
                            quoteId: appendToQuoteIdNum!,
                            newItems,
                            versionNotes: `+${orderedEntries.length} item(s) adicionado(s) via carrinho`,
                          });
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {appendItemsMutation.isPending ? "Adicionando..." : `Adicionar ${entries.length} item(s) ao Orçamento`}
                      </Button>
                    )}

                    {/* Salvar Orçamento no banco — oculto no modo append */}
                    {!appendToQuoteId && <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
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
                            <TabsTrigger value="comercial" className="flex-1">Comercial</TabsTrigger>
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
                                   onChange={e => { setUserEditedQuoteNumber(true); updateSaveForm("quoteNumber", e.target.value); }}
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
                            {/* Número do Projeto */}
                            <div>
                              <Label>Número do Projeto <span className="text-destructive">*</span></Label>
                              <div className="flex gap-2 items-center mt-1">
                                <Input
                                  placeholder="Ex: ALF 00001-R1"
                                  value={saveForm.projectNumber}
                                  disabled={saveForm.projectNoProject}
                                  onChange={e => updateSaveForm("projectNumber", e.target.value)}
                                  className={!saveForm.projectNumber.trim() ? "border-destructive" : ""}
                                />
                                <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-sm select-none">
                                  <Checkbox
                                    checked={saveForm.projectNoProject}
                                    onCheckedChange={(checked) => {
                                      const noProject = checked === true;
                                      setSaveForm(prev => ({
                                        ...prev,
                                        projectNoProject: noProject,
                                        projectNumber: noProject ? "Sem Projeto" : (prev.projectNumber === "Sem Projeto" ? "" : prev.projectNumber),
                                      }));
                                    }}
                                  />
                                  Sem Projeto
                                </label>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Formato: ALF xxxxx-Rx. Aparece no Excel e nas estatísticas.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Obra / Projeto <span className="text-destructive">*</span></Label>
                                <Input
                                  placeholder="Nome da obra"
                                  value={saveForm.projectName}
                                  onChange={e => updateSaveForm("projectName", e.target.value)}
                                  className={!saveForm.projectName.trim() ? "border-destructive" : ""}
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
                                  if (v === "VENDEDOR") {
                                    updateSaveForm("assistantId", "VENDEDOR");
                                    updateSaveForm("assistantName", "VENDEDOR");
                                  } else {
                                    const ast = assistants.find(a => String(a.id) === v);
                                    updateSaveForm("assistantId", v);
                                    updateSaveForm("assistantName", ast?.name ?? "");
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o assistente" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="VENDEDOR">VENDEDOR (o próprio vendedor)</SelectItem>
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

                          {/* ─── Aba Comercial ─── */}
                          <TabsContent value="comercial" className="space-y-4 pt-3">
                            {/* Prazo de entrega */}
                            <div>
                              <Label>Prazo de entrega (dias úteis)</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number" min={1} max={365} step={1}
                                  className="w-28"
                                  value={saveForm.deliveryDays}
                                  onChange={e => updateSaveForm("deliveryDays", e.target.value)}
                                />
                                <span className="text-sm text-muted-foreground">dias úteis (padrão: 20)</span>
                              </div>
                            </div>

                            {/* Condição de pagamento */}
                            <div>
                              <Label>Condição de pagamento</Label>
                              <Select
                                value={["30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)","À VISTA","A COMBINAR","50% Sinal e 50% a 28DDF","100% Antecipado"].includes(saveForm.paymentTerm) ? saveForm.paymentTerm : "__custom__"}
                                onValueChange={(v) => {
                                  if (v === "__custom__") {
                                    updateSaveForm("paymentTerm", "");
                                  } else {
                                    updateSaveForm("paymentTerm", v);
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
                              {!["30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)","À VISTA","A COMBINAR","50% Sinal e 50% a 28DDF","100% Antecipado"].includes(saveForm.paymentTerm) && (
                                <Input
                                  className="mt-2"
                                  placeholder="Digite a condição de pagamento..."
                                  value={saveForm.paymentTerm}
                                  onChange={e => updateSaveForm("paymentTerm", e.target.value)}
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
                                  type="number" min={0} max={isManagerUser ? 100 : 5} step={0.5}
                                  className="w-24"
                                  value={saveForm.commissionPercent}
                                  onChange={e => {
                                    const maxComm = isManagerUser ? 100 : 5;
                                    const val = Math.min(maxComm, Math.max(0, parseFloat(e.target.value) || 0));
                                    updateSaveForm("commissionPercent", String(val));
                                  }}
                                />
                                <span className="text-sm text-muted-foreground">% {isManagerUser ? "" : "(máx. 5%)"}</span>
                              </div>
                              {(() => {
                                const commPct = parseFloat(saveForm.commissionPercent || "0") / 100;
                                const baseComComissao = totalGeral * (1 - 0.12);
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

                            {/* Comissão 2º Vendedor */}
                            <div className="border rounded-lg p-3 space-y-2 bg-amber-50/50 dark:bg-amber-950/10">
                              <div className="flex items-center gap-2">
                                <Percent className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-medium">Comissão do 2º Vendedor (demonstrativo)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number" min={0} max={isManagerUser ? 100 : 5} step={0.5}
                                  className="w-24"
                                  value={saveForm.commissionPercent2}
                                  onChange={e => {
                                    const maxComm = isManagerUser ? 100 : 5;
                                    const val = Math.min(maxComm, Math.max(0, parseFloat(e.target.value) || 0));
                                    updateSaveForm("commissionPercent2", String(val));
                                  }}
                                />
                                <span className="text-sm text-muted-foreground">% {isManagerUser ? "" : "(máx. 5%)"}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Apenas demonstrativo. Visível quando há 2º vendedor no orçamento.</p>
                            </div>

                            {/* DIFAL / FCP */}
                            <div className="border rounded-lg p-3 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">DIFAL / FCP (venda interestadual)</span>
                              </div>
                              <div>
                                <Label>Estado destino</Label>
                                <Select
                                  value={saveForm.destState || "none"}
                                  onValueChange={(v) => {
                                    const state = v === "none" ? "" : v;
                                    const info = state ? getStateInfo(state) : null;
                                    updateSaveForm("destState", state);
                                    if (info) {
                                      updateSaveForm("difalPercent", String(info.difal));
                                      updateSaveForm("fcpPercent", String(info.fcp));
                                    }
                                  }}
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
                              {saveForm.destState === "SP" && (
                                <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                                  São Paulo é o estado de origem — DIFAL não se aplica para vendas internas.
                                </p>
                              )}
                              {saveForm.destState && saveForm.destState !== "none" && saveForm.destState !== "SP" && (() => {
                                const info = getStateInfo(saveForm.destState);
                                if (!info) return null;
                                const base = totalFinal;
                                const difalVal = base * (info.difal / 100);
                                const fcpVal = base * (info.fcp / 100);
                                return (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id="saveFormDifal"
                                        checked={saveForm.difalEnabled}
                                        onCheckedChange={(v) => {
                                          updateSaveForm("difalEnabled", Boolean(v));
                                          updateSaveForm("difalValue", String(difalVal.toFixed(2)));
                                        }}
                                      />
                                      <label htmlFor="saveFormDifal" className="text-sm cursor-pointer">
                                        Aplicar DIFAL ({info.difal.toFixed(1)}%) = {formatBRL(difalVal)}
                                      </label>
                                    </div>
                                    {info.fcp > 0 && (
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          id="saveFormFcp"
                                          checked={saveForm.fcpEnabled}
                                          onCheckedChange={(v) => {
                                            updateSaveForm("fcpEnabled", Boolean(v));
                                            updateSaveForm("fcpValue", String(fcpVal.toFixed(2)));
                                          }}
                                        />
                                        <label htmlFor="saveFormFcp" className="text-sm cursor-pointer">
                                          Aplicar FCP ({info.fcp.toFixed(1)}%) = {formatBRL(fcpVal)}
                                        </label>
                                      </div>
                                    )}
                                    {(saveForm.difalEnabled || saveForm.fcpEnabled) && (
                                      <div className="bg-muted/60 rounded p-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Total com DIFAL/FCP</span>
                                          <span className="font-semibold">
                                            {formatBRL(base + (saveForm.difalEnabled ? difalVal : 0) + (saveForm.fcpEnabled ? fcpVal : 0))}
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

                          {/* ─── Aba Frete ─── */}
                          <TabsContent value="frete" className="space-y-4 pt-3">
                            {/* Estado de entrega */}
                            <div>
                              <Label>Estado de entrega</Label>
                              <Select
                                value={saveForm.freteStateCode || "SP"}
                                onValueChange={(v) => {
                                  updateSaveForm("freteStateCode", v);
                                  updateSaveForm("freteCity", "");
                                }}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-72">
                                  <SelectItem value="SP">SP — São Paulo</SelectItem>
                                  {DIFAL_TABLE.map(s => (
                                    <SelectItem key={s.uf} value={s.uf}>{s.uf} — {s.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {saveForm.destState && saveForm.destState !== saveForm.freteStateCode && (
                                <button
                                  type="button"
                                  className="text-xs text-primary underline mt-1"
                                  onClick={() => {
                                    updateSaveForm("freteStateCode", saveForm.destState);
                                    updateSaveForm("freteCity", "");
                                  }}
                                >
                                  Usar estado da aba Comercial ({saveForm.destState})
                                </button>
                              )}
                            </div>

                            {/* Cidade de entrega */}
                            <FreteIbgeCitySelect
                              stateCode={saveForm.freteStateCode || "SP"}
                              value={saveForm.freteCity}
                              onChange={(city) => updateSaveForm("freteCity", city)}
                            />

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

                            {/* Frete Cotado */}
                            <div className="border rounded-lg p-3 space-y-2">
                              <Label className="text-sm font-medium">Frete Cotado (valor real)</Label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">R$</span>
                                <Input
                                  type="number" min={0} step={0.01}
                                  className="w-32"
                                  placeholder="0,00"
                                  value={saveForm.freteValue}
                                  onChange={e => updateSaveForm("freteValue", e.target.value)}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="freteIncluded"
                                  checked={saveForm.freteIncluded}
                                  onCheckedChange={(v) => updateSaveForm("freteIncluded", Boolean(v))}
                                />
                                <label htmlFor="freteIncluded" className="text-sm cursor-pointer">Frete já incluído no total do orçamento</label>
                              </div>
                              <p className="text-xs text-muted-foreground">Valor real do frete cotado. Apenas demonstrativo — não altera o total automático.</p>
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
                    </Dialog>}

                    {/* Pré-visualizar Excel — disponível em todos os modos */}
                    <Button
                      variant="outline"
                      className="gap-2 border-amber-500/40 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
                      onClick={() => {
                        if (!appendToQuoteId) {
                          toast.error("Salve o orçamento antes de pré-visualizar o Excel.");
                          setSaveDialogOpen(true);
                          return;
                        }
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      Pré-visualizar Excel
                    </Button>

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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Referência do Orçamento (opcional)</Label>
                <Input
                  placeholder="Ex: ORC-2026-0042"
                  value={orderForm.quoteRef}
                  onChange={e => updateOrderForm("quoteRef", e.target.value)}
                />
              </div>
              <div>
                <Label>Prazo de Produção (dias úteis)</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  placeholder="20"
                  value={orderForm.deliveryDays}
                  onChange={e => updateOrderForm("deliveryDays", e.target.value)}
                />
              </div>
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

      {/* Modal de edição inline de CCT / Potência / Cor da Peça */}
      <Dialog open={editItemId !== null} onOpenChange={(open) => { if (!open) setEditItemId(null); }}>
        <DialogContent className="max-w-sm max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Editar item</DialogTitle>
            <DialogDescription>
              {(() => {
                const item = orderedEntries.find(e => e.id === editItemId);
                return item?.data.category === 'Revenda'
                  ? 'Defina a quantidade e o preço unitário do item de revenda.'
                  : 'Altere CCT, potência e/ou cor da peça. As mudanças são salvas automaticamente.';
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-4 py-2 pr-1">
            {(() => {
              const item = orderedEntries.find(e => e.id === editItemId);
              const isRevenda = item?.data.category === 'Revenda';
              // Controle de preços por papel: admin e gerente podem editar preços da API
              const userRole = (user as any)?.role;
              const userEmail = (user as any)?.email?.toLowerCase() ?? "";
              const canOverrideApiPrice = userRole === 'admin' || userRole === 'gerente' || PRICE_OVERRIDE_EMAILS.includes(userEmail);
              const canEditPrice = !item?.data.priceFromApi || canOverrideApiPrice;
              return isRevenda ? (
                <>
                  <div className="space-y-1">
                    <Label>Quantidade <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      min="1"
                      value={editFields.qty}
                      onChange={(e) => setEditFields(prev => ({ ...prev, qty: e.target.value }))}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Preço unitário (R$) <span className="text-destructive">*</span></Label>
                    <Input
                      value={editFields.unitPrice}
                      onChange={(e) => setEditFields(prev => ({ ...prev, unitPrice: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Observação (interna)</Label>
                    <Input
                      value={editFields.itemNote}
                      onChange={(e) => setEditFields(prev => ({ ...prev, itemNote: e.target.value }))}
                      placeholder="ex: STELLA ref: SD1720BR"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Obs. no Orçamento (Excel)</Label>
                    <Input
                      value={editFields.itemObs}
                      onChange={(e) => setEditFields(prev => ({ ...prev, itemObs: e.target.value }))}
                      placeholder="Obs. que aparece no Excel abaixo do item"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox
                        id="itemObsShowInExcel"
                        checked={editFields.itemObsShowInExcel}
                        onCheckedChange={(v) => setEditFields(prev => ({ ...prev, itemObsShowInExcel: Boolean(v) }))}
                      />
                      <label htmlFor="itemObsShowInExcel" className="text-xs cursor-pointer">Exibir no Excel do orçamento</label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label>CCT (temperatura de cor)</Label>
                    <Input
                      value={editFields.cct}
                      onChange={(e) => setEditFields(prev => ({ ...prev, cct: e.target.value }))}
                      placeholder="ex: 3000K, 4000K"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Potência</Label>
                    <Input
                      value={editFields.power}
                      onChange={(e) => setEditFields(prev => ({ ...prev, power: e.target.value }))}
                      placeholder="ex: 10W/m, 20W"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Cor da peça</Label>
                    <Input
                      value={editFields.corPeca}
                      onChange={(e) => setEditFields(prev => ({ ...prev, corPeca: e.target.value }))}
                      placeholder="ex: Branco, Preto, Anodizado"
                    />
                  </div>
                  {/* Campo de preço: editável se não veio da API, bloqueado se veio */}
                  <div className="space-y-1">
                    <Label>Preço unitário (R$)</Label>
                    <Input
                      value={editFields.unitPrice}
                      onChange={canEditPrice ? (e) => setEditFields(prev => ({ ...prev, unitPrice: e.target.value })) : undefined}
                      readOnly={!canEditPrice}
                      placeholder={canEditPrice ? "Definir preço" : "Preço da API"}
                      className={!canEditPrice ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
                    />
                    {!canEditPrice && (
                      <p className="text-xs text-muted-foreground">Preço definido pela API. Apenas admin/gerente podem alterar.</p>
                    )}
                    {canEditPrice && item?.data.priceFromApi && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">Preço da API — você pode alterar (admin/gerente).</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Observação (interna)</Label>
                    <Input
                      value={editFields.itemNote}
                      onChange={(e) => setEditFields(prev => ({ ...prev, itemNote: e.target.value }))}
                      placeholder="Observação livre sobre este item"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Obs. no Orçamento (Excel)</Label>
                    <Input
                      value={editFields.itemObs}
                      onChange={(e) => setEditFields(prev => ({ ...prev, itemObs: e.target.value }))}
                      placeholder="Obs. que aparece no Excel abaixo do item"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox
                        id="itemObsShowInExcel2"
                        checked={editFields.itemObsShowInExcel}
                        onCheckedChange={(v) => setEditFields(prev => ({ ...prev, itemObsShowInExcel: Boolean(v) }))}
                      />
                      <label htmlFor="itemObsShowInExcel2" className="text-xs cursor-pointer">Exibir no Excel do orçamento</label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Margem por item (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={0} max={99} step={0.5}
                        className="w-24"
                        value={editFields.itemMarginPercent}
                        onChange={(e) => setEditFields(prev => ({ ...prev, itemMarginPercent: e.target.value }))}
                        placeholder="Global"
                      />
                      <span className="text-xs text-muted-foreground">% (vazio = usa margem global)</span>
                    </div>
                  </div>
                    <div className="space-y-1">
                    <Label>Localização do Item</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Pavimento</p>
                        <Input
                          value={editFields.floorName}
                          onChange={(e) => setEditFields(prev => ({ ...prev, floorName: e.target.value, floorId: e.target.value }))}
                          placeholder="ex: Térreo, 1º Andar"
                          list="pavimento-cart-suggestions"
                        />
                        <datalist id="pavimento-cart-suggestions">
                          <option value="Térreo" />
                          <option value="1º Andar" />
                          <option value="2º Andar" />
                          <option value="3º Andar" />
                          <option value="Cobertura" />
                          <option value="Subsolo" />
                          <option value="Mezanino" />
                        </datalist>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Ambiente</p>
                        <Input
                          value={editFields.ambiente}
                          onChange={(e) => setEditFields(prev => ({ ...prev, ambiente: e.target.value }))}
                          placeholder="ex: Sala, Cozinha"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Agrupa itens por pavimento no Excel</p>
                  </div>
                  {/* Temperatura de cor para Item Especial */}
                  {item?.data.isSpecialItem && (
                    <div className="space-y-1">
                      <Label>Temperatura de Cor</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {["", "2700K", "3000K", "3500K", "4000K", "5000K", "6500K"].map((ct) => (
                          <button
                            key={ct || "none"}
                            type="button"
                            onClick={() => setEditFields(prev => ({ ...prev, specialColorTemp: ct }))}
                            className={[
                              "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                              editFields.specialColorTemp === ct
                                ? "bg-amber-600 border-amber-600 text-white"
                                : "border-border bg-muted/20 text-muted-foreground hover:border-amber-500/50",
                            ].join(" ")}
                          >
                            {ct || "N/A"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Campo de foto para Item Especial */}
                  {item?.data.isSpecialItem && (
                    <div className="space-y-2">
                      <Label>Foto do Item Especial</Label>
                      {editSpecialPhotoPreview ? (
                        <div className="relative w-full">
                          <img
                            src={editSpecialPhotoPreview}
                            alt="Foto do item"
                            className="w-full max-h-40 object-contain rounded border bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => { setEditSpecialPhotoUrl(null); setEditSpecialPhotoPreview(null); }}
                            className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 hover:bg-destructive/80"
                            title="Remover foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-border rounded p-4 text-center">
                          <p className="text-xs text-muted-foreground mb-2">Nenhuma foto cadastrada</p>
                        </div>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={editSpecialPhotoUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) { toast.error('Foto muito grande. Máximo 5MB.'); return; }
                            setEditSpecialPhotoUploading(true);
                            try {
                              const reader = new FileReader();
                              reader.onload = async (ev) => {
                                const dataUrl = ev.target?.result as string;
                                const base64 = dataUrl.split(',')[1];
                                const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';
                                const result = await uploadSpecialPhotoMutationCart.mutateAsync({ base64, mimeType, fileName: file.name });
                                setEditSpecialPhotoUrl(result.url);
                                setEditSpecialPhotoPreview(result.url);
                                setEditSpecialPhotoUploading(false);
                              };
                              reader.readAsDataURL(file);
                            } catch {
                              toast.error('Erro ao fazer upload da foto.');
                              setEditSpecialPhotoUploading(false);
                            }
                          }}
                        />
                        <Button type="button" variant="outline" size="sm" className="gap-2 pointer-events-none" disabled={editSpecialPhotoUploading}>
                          <Upload className="w-4 h-4" />
                          {editSpecialPhotoUploading ? 'Enviando...' : editSpecialPhotoPreview ? 'Trocar foto' : 'Adicionar foto'}
                        </Button>
                      </label>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <div className="flex justify-between gap-2 pt-2 flex-shrink-0 border-t">
            <Button
              variant="outline"
              className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (editItemId === null) return;
                removeItem(editItemId);
                setEditItemId(null);
                toast.success('Item excluído do carrinho.');
              }}
            >
              <Trash2 className="w-4 h-4" />
              Excluir Item
            </Button>
            <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditItemId(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (editItemId === null) return;
              const item = orderedEntries.find(e => e.id === editItemId);
              const isRevenda = item?.data.category === 'Revenda';
              const patch: Record<string, unknown> = {};
              const userRoleSave = (user as any)?.role;
              const userEmailSave = (user as any)?.email?.toLowerCase() ?? "";
              const canOverrideApiPriceSave = userRoleSave === 'admin' || userRoleSave === 'gerente' || PRICE_OVERRIDE_EMAILS.includes(userEmailSave);
              const canEditPriceSave = !item?.data.priceFromApi || canOverrideApiPriceSave;
              if (isRevenda) {
                const qty = parseInt(editFields.qty) || 1;
                const unitPrice = parseFloat(editFields.unitPrice.replace(',', '.')) || 0;
                patch.qty = qty;
                patch.unitPrice = unitPrice;
                patch.totalPrice = qty * unitPrice;
              } else {
                if (editFields.cct.trim()) patch.cct = editFields.cct.trim();
                if (editFields.power.trim()) patch.power = editFields.power.trim();
                if (editFields.corPeca.trim()) patch.corPeca = editFields.corPeca.trim();
                // Salvar preço manual apenas quando não veio da API
                if (canEditPriceSave && editFields.unitPrice.trim()) {
                  const qty = parseInt(editFields.qty) || item?.data.qty || 1;
                  const unitPrice = parseFloat(editFields.unitPrice.replace(',', '.')) || 0;
                  patch.unitPrice = unitPrice;
                  patch.totalPrice = qty * unitPrice;
                }
              }
              // Sempre salvar itemNote (pode ser vazio para limpar)
              patch.itemNote = editFields.itemNote.trim() || undefined;
              // itemObs e itemObsShowInExcel
              patch.itemObs = editFields.itemObs.trim() || undefined;
              patch.itemObsShowInExcel = editFields.itemObsShowInExcel;
              // itemMarginPercent (apenas para itens não-Revenda)
              if (!isRevenda && editFields.itemMarginPercent.trim()) {
                patch.itemMarginPercent = parseFloat(editFields.itemMarginPercent) || undefined;
              } else if (!isRevenda) {
                patch.itemMarginPercent = undefined;
              }
              // floorId / floorName / ambiente
              patch.floorId = editFields.floorId.trim() || undefined;
              patch.floorName = editFields.floorName.trim() || undefined;
              patch.ambiente = editFields.ambiente.trim() || undefined;
              // Foto e temperatura de cor do Item Especial
              if (item?.data.isSpecialItem) {
                patch.specialPhotoUrl = editSpecialPhotoUrl ?? undefined;
                patch.photoUrl = editSpecialPhotoUrl ?? undefined;
                patch.specialColorTemp = editFields.specialColorTemp.trim() || undefined;
              }
              const totalForUpdate = isRevenda
                ? (parseInt(editFields.qty) || 1) * (parseFloat(editFields.unitPrice.replace(',', '.')) || 0)
                : (canEditPriceSave && editFields.unitPrice.trim() ? (item?.data.qty || 1) * (parseFloat(editFields.unitPrice.replace(',', '.')) || 0) : 0);
              updateItemField(editItemId, patch, totalForUpdate);
              toast.success('Item atualizado!');
              setEditItemId(null);
            }}>
              Salvar
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pré-visualização Excel — sem criar revisão */}
      <ExcelPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        items={orderedEntries.map((e) => ({
          ...e.data,
          itemEmPlanta: itemEmPlantaMap[e.id] ?? e.data.itemEmPlanta ?? "",
        }))}
        formData={{
          ...form,
          seller1Name: saveForm.seller1Name || undefined,
          seller2Name: saveForm.seller2Name || undefined,
          rtPercent: rtPct > 0 ? rtPct : undefined,
          marginPercent: marginPct > 0 ? marginPct : undefined,
          freteType: saveForm.freteType,
          freteIsento: saveForm.freteIsento,
          freteLocalidade: saveForm.freteStateCode === "SP" ? "sp" : "other",
          freteValue: saveForm.freteValue ? parseFloat(saveForm.freteValue) : undefined,
          freteIncluded: saveForm.freteIncluded,
          deliveryDays: parseInt(saveForm.deliveryDays) || 20,
          paymentTerm: saveForm.paymentTerm || undefined,
          revisionCount: 0,
          difalEnabled: saveForm.difalEnabled,
          difalPercent: saveForm.difalEnabled && saveForm.difalPercent ? parseFloat(saveForm.difalPercent) : undefined,
          difalValue: saveForm.difalEnabled && saveForm.difalValue ? parseFloat(saveForm.difalValue) : undefined,
          fcpEnabled: saveForm.fcpEnabled,
          fcpPercent: saveForm.fcpEnabled && saveForm.fcpPercent ? parseFloat(saveForm.fcpPercent) : undefined,
          fcpValue: saveForm.fcpEnabled && saveForm.fcpValue ? parseFloat(saveForm.fcpValue) : undefined,
          destState: saveForm.destState || undefined,
        }}
        freshPhotoMap={freshPhotoMap}
      />
    </div>
  );
}
