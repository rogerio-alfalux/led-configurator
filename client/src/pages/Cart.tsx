import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  DndContext,
  closestCenter,
  pointerWithin,
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
  Zap, Palette, Building2, MapPin, Ban,
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
import type { LinkedAccessory, SpecialEquipment } from "@/lib/cartTypes";
import { SpecialEquipmentsEditor } from "@/components/SpecialEquipmentsEditor";
import { generateQuoteExcel } from "@/lib/quoteExcelGenerator";
import { CORES_PECA } from "@/components/ColorPickerModal";
import { ExcelPreviewModal } from "@/components/ExcelPreviewModal";
import { generateOrderExcel, calcDeliveryDate } from "@/lib/orderExcelGenerator";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DIFAL_TABLE, getStateInfo } from "@/lib/difalTable";
import { StateCitySelector, isSaoPauloCapital } from "@/components/StateCitySelector";
import { PRICE_OVERRIDE_EMAILS, MANAGER_EMAILS, DRIVER_PRICE_OVERRIDE_EMAILS } from "@shared/const";
import { toBrasiliaDate } from "@/lib/dateUtils";
import { applyCCTChange } from "@/lib/cctUtils";

/**
 * REGRA INEGOCIÁVEL: Para perfis (com profileSegments), o driverQty total é sempre
 * recalculado a partir de profileSegments para corrigir itens antigos com driverQty errado.
 * Formula: sum(seg.driverQtyPerPiece * seg.qty) * itemQty
 * Exemplo BLAZE 45700mm: (1×15 + 1×2) * 12 = 17 * 12 = 204 drivers.
 */
function getProfileDrvQtyPerLuminaria(item: CartItemData): number | null {
  const segs = item.profileSegments;
  if (!segs || segs.length === 0) return null;
  return segs.reduce((s, seg) => s + (seg.driverQtyPerPiece ?? 1) * seg.qty, 0);
}

/** Retorna o total de drivers para um item (perfil ou outro produto). */
function getEffectiveDrvTotal(item: CartItemData): number {
  if (!item.driverLines || item.driverLines.length === 0) return 0;
  const qty = item.qty ?? 1;
  // Para perfis: usar profileSegments. Para outros: usar driverQtyPerUnit salvo, ou fallback para driverQty armazenado.
  const profileDrvQtyPerLum = getProfileDrvQtyPerLuminaria(item);
  const drvQtyPerLuminaria = profileDrvQtyPerLum != null
    ? profileDrvQtyPerLum
    : (item.driverQtyPerUnit != null ? item.driverQtyPerUnit : null);
  return item.driverLines.reduce((s, d) => {
    const unitPrice = d.driverUnitPrice ?? 0;
    const effectiveQty = drvQtyPerLuminaria != null
      ? drvQtyPerLuminaria * qty
      : (d.driverQty ?? qty);
    return s + Math.round(unitPrice * effectiveQty * 100) / 100;
  }, 0);
}

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
  arquiteto: string;
  lightDesigner: string;
  diluicaoValor: string;
  diluicaoDescricao: string;
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
  /** Número de sequência global do item (1-based, calculado pelo pai) */
  globalSeq: number;
  /** Total de itens no carrinho (para validação do input) */
  totalItems: number;
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
  /** Callback para reordenar: move o item da posição atual para a nova posição (1-based global) */
  onReorderToSeq: (itemId: number, newSeq: number) => void;
  /** Função para aplicar margem individual do item sobre um valor base */
  applyItemMargin: (base: number, itemMarginPercent?: number | null) => number;
}

function SortableCartItem({
  entry, idx, globalSeq, totalItems, itemEmPlantaMap, setItemEmPlantaMap, updateItemField,
  handleUpdateQty, handleQtyInput, removeItem, updateQtyMutation, isRemoving, onEditClick, onDuplicate,
  acessorioPhotoMap, onReorderToSeq, applyItemMargin,
}: SortableCartItemProps) {
  const [seqInputVal, setSeqInputVal] = React.useState<string>("");
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

            {/* Número de sequência editável */}
            <div className="flex-shrink-0 relative group" title="Clique para alterar a ordem">
              {seqInputVal === "" ? (
                <div
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold cursor-text select-none"
                  onClick={() => setSeqInputVal(String(globalSeq))}
                >
                  {globalSeq}
                </div>
              ) : (
                <input
                  type="number"
                  min={1}
                  max={totalItems}
                  value={seqInputVal}
                  autoFocus
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold text-center border-2 border-primary-foreground/50 focus:outline-none focus:border-primary-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onChange={(e) => setSeqInputVal(e.target.value)}
                  onBlur={() => {
                    const n = parseInt(seqInputVal, 10);
                    if (!isNaN(n) && n >= 1 && n <= totalItems && n !== globalSeq) {
                      onReorderToSeq(entry.id, n);
                    }
                    setSeqInputVal("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setSeqInputVal("");
                  }}
                />
              )}
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
                    {entry.data.power && <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />{entry.data.power}</span>}
                    {entry.data.cct && <span>{entry.data.cct}</span>}
                    {entry.data.corPeca && <span className="flex items-center gap-0.5"><Palette className="w-3 h-3" />{entry.data.corPeca}</span>}
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
                          <Building2 className="w-3 h-3" />{entry.data.floorName}
                        </span>
                      )}
                      {entry.data.ambiente && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/20">
                          <MapPin className="w-3 h-3" />{entry.data.ambiente}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Observação do item */}
                  {entry.data.itemNote && (
                    <p className="text-xs text-muted-foreground italic mt-1 truncate max-w-xs" title={entry.data.itemNote}>
                      <ClipboardList className="w-3 h-3 inline mr-0.5" />{entry.data.itemNote}
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
                  {/* Exibição desmembrada: luminária + driver */}
                  {entry.data.driverLines && entry.data.driverLines.length > 0 ? (
                    <>
                      {/* Luminária: preço unitário + total (qty × unit) */}
                      {entry.data.luminariaHasApiPrice && entry.data.unitPriceLuminaria != null ? (
                        <p className="text-xs text-muted-foreground">
                          Lum: {formatBRL(entry.data.unitPriceLuminaria)}/un
                          {(entry.data.qty ?? 1) > 1 && (() => {
                            // Corrigir itens antigos onde priceWithoutDriver foi salvo como valor unitário
                            const _pwd = entry.data.priceWithoutDriver ?? 0;
                            const _upl = entry.data.unitPriceLuminaria ?? 0;
                            const _qty = entry.data.qty ?? 1;
                            const _isUnit = _upl > 0 && Math.abs(_pwd - _upl) < 0.02 && _qty > 1;
                            const _corrected = _isUnit ? _upl * _qty : _pwd;
                            return <> × {_qty} = <span className="font-medium">{formatBRL(_corrected)}</span></>;
                          })()}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 italic cursor-pointer hover:underline" onClick={() => onEditClick(entry.id, entry.data)}>
                          Lum: Definir preço →
                        </p>
                      )}
                      {/* Total driver: recalculado dinamicamente para cobrir itens antigos */}
                      {(() => {
                        const qty = entry.data.qty ?? 1;
                        // REGRA INEGOCIÁVEL: para perfis, recalcular driverQtyTotal a partir de profileSegments.
                        // Para outros produtos, usar driverQtyPerUnit salvo no item (1 driver por luminária por padrão).
                        const segs = entry.data.profileSegments;
                        // Drivers por luminária:
                        // 1. Perfis: soma de driverQtyPerPiece × qty de cada segmento
                        // 2. Outros com driverQtyPerUnit salvo: usar diretamente
                        // 3. Outros sem driverQtyPerUnit (itens antigos): inferir de driverQty / qty, mínimo 1
                        const drvQtyPerLuminaria = segs && segs.length > 0
                          ? segs.reduce((s, seg) => s + (seg.driverQtyPerPiece ?? 1) * seg.qty, 0)
                          : (entry.data.driverQtyPerUnit != null
                            ? entry.data.driverQtyPerUnit
                            : null);
                        const drvTotal = entry.data.driverLines.reduce((s, d) => {
                          const unitPrice = d.driverUnitPrice ?? 0;
                          const storedQty = d.driverQty ?? qty;
                          // Se temos drvQtyPerLuminaria confiável, usar. Senão usar driverQty armazenado.
                          const effectiveQty = drvQtyPerLuminaria != null
                            ? drvQtyPerLuminaria * qty
                            : storedQty;
                          return s + Math.round(unitPrice * effectiveQty * 100) / 100;
                        }, 0);
                        if (drvTotal <= 0) return null;
                        // Calcular preço unitário do driver (por luminária)
                        const drvUnitTotal = entry.data.driverLines.reduce((s, d) => {
                          const unitPrice = d.driverUnitPrice ?? 0;
                          const storedQty = d.driverQty ?? qty;
                          const qtyPerLuminaria = drvQtyPerLuminaria != null
                            ? drvQtyPerLuminaria
                            : (storedQty <= qty ? storedQty : Math.round(storedQty / qty));
                          return s + Math.round(unitPrice * qtyPerLuminaria * 100) / 100;
                        }, 0);
                        return (
                          <p className="text-xs text-orange-600">
                            Driver: {formatBRL(drvUnitTotal)}/un
                            {qty > 1 && (
                              <> × {qty} = <span className="font-medium">{formatBRL(drvTotal)}</span></>
                            )}
                          </p>
                        );
                      })()}
                      {/* Total geral */}
                      {entry.data.totalPrice != null && entry.data.totalPrice > 0 ? (
                        <p className="font-bold text-primary text-base">{formatBRL(applyItemMargin(entry.data.totalPrice, entry.data.itemMarginPercent))}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Total a calcular</p>
                      )}
                      {entry.data.itemMarginPercent != null && entry.data.itemMarginPercent > 0 && (
                        <p className="text-[10px] text-emerald-600">+{entry.data.itemMarginPercent}% margem ind.</p>
                      )}
                    </>
                  ) : (
                    <>
                      {entry.data.unitPrice != null && entry.data.unitPrice > 0 && (
                        <p className="text-xs text-muted-foreground">{formatBRL(applyItemMargin(entry.data.unitPrice, entry.data.itemMarginPercent))} / un</p>
                      )}
                      {entry.data.totalPrice != null && entry.data.totalPrice > 0 ? (
                        <p className="font-bold text-primary text-base">{formatBRL(applyItemMargin(entry.data.totalPrice, entry.data.itemMarginPercent))}</p>
                      ) : !entry.data.priceFromApi ? (
                        <p className="text-xs text-amber-600 italic cursor-pointer hover:underline" onClick={() => onEditClick(entry.id, entry.data)}>Definir preço →</p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Preço a consultar</p>
                      )}
                      {entry.data.itemMarginPercent != null && entry.data.itemMarginPercent > 0 && (
                        <p className="text-[10px] text-emerald-600">+{entry.data.itemMarginPercent}% margem ind.</p>
                      )}
                    </>
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
  const [localName, setLocalName] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
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
          ref={inputRef}
          type="text"
          value={localName !== null ? localName : editingName}
          onChange={(e) => { setLocalName(e.target.value); onRenameChange(e.target.value); }}
          onFocus={() => { if (localName === null) setLocalName(editingName); }}
          onBlur={(e) => {
            const val = e.target.value.trim();
            onRenameBlur(val);
            setLocalName(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.currentTarget.blur(); }
            if (e.key === 'Escape') { setLocalName(null); onRenameChange(displayName); e.currentTarget.blur(); }
          }}
          className="text-sm font-semibold text-indigo-400 uppercase tracking-wide bg-transparent border-0 border-b border-transparent focus:border-indigo-400 focus:outline-none px-0 py-0 min-w-0 w-auto hover:border-indigo-400/50 cursor-text"
          style={{ width: `${Math.max((localName !== null ? localName : editingName).length, 8)}ch` }}
          title="Clique para renomear o pavimento"
        />
        <span title="Clique no nome para renomear"><Pencil className="w-3 h-3 text-indigo-400/50 flex-shrink-0" /></span>
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
  const reorderMutation = trpc.cart.reorder.useMutation();
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

  // DnD sensors — distância de ativação reduzida para melhor responsividade ao arrastar para cima
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
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
      const newOrder = arrayMove(prev, oldIndex, newIndex);
      reorderMutation.mutate({ orderedIds: newOrder });
      return newOrder;
    });
  };

  /**
   * Reordena o item para a posição global `newSeq` (1-based).
   * Move o item na lista `orderedIds` e salva `sequenceOrder` em todos os itens.
   */
  const handleReorderToSeq = React.useCallback((itemId: number, newSeq: number) => {
    setOrderedIds(prev => {
      const oldIndex = prev.indexOf(itemId);
      if (oldIndex === -1) return prev;
      const targetIndex = Math.max(0, Math.min(newSeq - 1, prev.length - 1));
      if (oldIndex === targetIndex) return prev;
      return arrayMove(prev, oldIndex, targetIndex);
    });
  }, []);

  // Edição inline de campos do item
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<{ cct: string; power: string; corPeca: string; qty: string; unitPrice: string; driverUnitPriceOverride: string; itemNote: string; itemObs: string; itemObsShowInExcel: boolean; itemMarginPercent: string; floorId: string; floorName: string; ambiente: string; specialColorTemp: string; specialEquipments: SpecialEquipment[]; mkpCustom: string; specialDescription: string; specialDimensions: string; specialPower: string; specialDim: string; specialVoltage: string; specialColor: string; description: string; itemEmPlanta: string }>({ cct: '', power: '', corPeca: '', qty: '', unitPrice: '', driverUnitPriceOverride: '', itemNote: '', itemObs: '', itemObsShowInExcel: false, itemMarginPercent: '', floorId: '', floorName: '', ambiente: '', specialColorTemp: '', specialEquipments: [], mkpCustom: '', specialDescription: '', specialDimensions: '', specialPower: '', specialDim: '', specialVoltage: '', specialColor: '', description: '', itemEmPlanta: '' });
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
    arquiteto: "",
    lightDesigner: "",
    diluicaoValor: "",
    diluicaoDescricao: "",
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
  // Verificar se o número de orçamento já existe
  const checkNumberQuery = trpc.quotes.checkNumber.useQuery(
    { quoteNumber: saveForm.quoteNumber.trim() },
    { enabled: saveDialogOpen && !!saveForm.quoteNumber.trim(), staleTime: 2000 }
  );

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

  // Helper: aplica margem individual do item (itemMarginPercent em %) sobre um valor base
  const applyItemMargin = (base: number, itemMarginPercent?: number | null): number => {
    if (itemMarginPercent == null || itemMarginPercent <= 0) return base;
    const pct = Math.min(Math.max(itemMarginPercent / 100, 0), 0.99);
    return base / (1 - pct);
  };
  // totalGeral inclui luminária + drivers de cada item + margem individual
  const totalGeral = entries.reduce((acc, e) => {
    // Itens "Não Orçamos" são apenas indicativos e não entram no total
    if (e.data.category === 'Não Orçamos') return acc;
    let itemTotal = 0;
    if (e.data.driverLines && e.data.driverLines.length > 0) {
      // Calcular total da luminária corretamente
      const lumTotal = (() => {
        if (e.data.priceWithoutDriver != null) {
          const isUnitOnly = e.data.unitPriceLuminaria != null &&
            Math.abs(e.data.priceWithoutDriver - e.data.unitPriceLuminaria) < 0.02 &&
            (e.data.qty ?? 1) > 1;
          return isUnitOnly ? e.data.unitPriceLuminaria! * (e.data.qty ?? 1) : e.data.priceWithoutDriver;
        }
        const unitLum = e.data.unitPriceLuminaria ?? e.data.unitPrice ?? null;
        return unitLum != null ? unitLum * (e.data.qty ?? 1) : (e.data.totalPrice ?? 0);
      })();
      // REGRA INEGOCIÁVEL: usar getEffectiveDrvTotal para recalcular corretamente para perfis
      const drvTotal = getEffectiveDrvTotal(e.data);
      itemTotal = lumTotal + drvTotal;
    } else {
      itemTotal = e.data.totalPrice ?? 0;
    }
    // Aplicar margem individual do item (acréscimo sobre o preço base)
    return acc + applyItemMargin(itemTotal, e.data.itemMarginPercent);
  }, 0);

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
        diluicaoValor: saveForm.diluicaoValor ? parseFloat(saveForm.diluicaoValor) : undefined,
        // Usar o número do orçamento do saveForm (não o gerado aleatoriamente no form)
        numero: saveForm.quoteNumber.trim() || form.numero,
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
      arquiteto: saveForm.arquiteto || undefined,
      lightDesigner: saveForm.lightDesigner || undefined,
      diluicaoValor: saveForm.diluicaoValor ? parseFloat(saveForm.diluicaoValor) : undefined,
      diluicaoDescricao: saveForm.diluicaoDescricao || undefined,
      totalAmount: totalGeral,
      // totalFinal inclui RT + margem + frete + DIFAL/FCP (alíquota combinada, fórmula por dentro)
      totalFinal: (() => {
        const baseComFrete = totalFinal + freteValor;
        if (saveForm.difalEnabled) {
          const info = getStateInfo(saveForm.destState);
          if (info && info.combined > 0) {
            return baseComFrete / (1 - info.combined / 100);
          }
        }
        return baseComFrete;
      })(),
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
      // Usar data/hora de Brasília para calcular prazo de entrega
      const approvedAtIso = new Date(toBrasiliaDate(new Date()).split('/').reverse().join('-') + 'T12:00:00-03:00').toISOString();
      const { displayDays, deliveryDateStr } = await calcDeliveryDate(approvedAtIso, deliveryDaysNum);
      await generateOrderExcel(items, {
        clientName: orderForm.clientName,
        projectName: orderForm.projectName,
        quoteNumber: orderForm.quoteRef || "SEM-ORC",
        vendorName: orderForm.vendorName,
        date: toBrasiliaDate(new Date()),
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
            <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}
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
                          globalSeq={idx + 1}
                          totalItems={orderedEntries.length}
                          onReorderToSeq={handleReorderToSeq}
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
                                    setEditFields({ cct: data.cct ?? '', power: data.power ?? '', corPeca: data.corPeca ?? '', qty: String(data.qty ?? 1), unitPrice: data.unitPrice ? String(data.unitPrice).replace('.', ',') : '', driverUnitPriceOverride: data.driverLines && data.driverLines.length > 0 && data.driverLines[0].driverUnitPrice != null ? String(data.driverLines[0].driverUnitPrice).replace('.', ',') : '', itemNote: data.itemNote ?? '', itemObs: data.itemObs ?? '', itemObsShowInExcel: data.itemObsShowInExcel ?? false, itemMarginPercent: data.itemMarginPercent != null ? String(data.itemMarginPercent) : '', floorId: data.floorId ?? '', floorName: data.floorName ?? '', ambiente: data.ambiente ?? '', specialColorTemp: data.specialColorTemp ?? '', specialEquipments: data.specialEquipments ?? [], mkpCustom: data.mkpCustom != null ? String(data.mkpCustom) : '', specialDescription: data.specialDescription ?? data.description ?? '', specialDimensions: data.specialDimensions ?? '', specialPower: data.specialPower ?? '', specialDim: data.specialDim ?? '', specialVoltage: data.specialVoltage ?? '', specialColor: data.specialColor ?? '', description: data.description ?? '', itemEmPlanta: data.itemEmPlanta ?? '' });
                                                        if (data.isSpecialItem) { setEditSpecialPhotoUrl(data.specialPhotoUrl ?? data.photoUrl ?? null); setEditSpecialPhotoPreview(data.specialPhotoUrl ?? data.photoUrl ?? null); } else { setEditSpecialPhotoUrl(null); setEditSpecialPhotoPreview(null); }
                          }}
                          applyItemMargin={applyItemMargin}
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
                              {groupEntries.map((entry, idx) => {
                                // Calcular a sequência global do item (posição em orderedEntries)
                                const globalIdx = orderedEntries.findIndex(e => e.id === entry.id);
                                return (
                                <SortableCartItem
                                  key={entry.id}
                                  entry={entry}
                                  idx={idx}
                                  globalSeq={globalIdx + 1}
                                  totalItems={orderedEntries.length}
                                  onReorderToSeq={handleReorderToSeq}
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
                                    setEditFields({ cct: data.cct ?? '', power: data.power ?? '', corPeca: data.corPeca ?? '', qty: String(data.qty ?? 1), unitPrice: data.unitPrice ? String(data.unitPrice).replace('.', ',') : '', driverUnitPriceOverride: data.driverLines && data.driverLines.length > 0 && data.driverLines[0].driverUnitPrice != null ? String(data.driverLines[0].driverUnitPrice).replace('.', ',') : '', itemNote: data.itemNote ?? '', itemObs: data.itemObs ?? '', itemObsShowInExcel: data.itemObsShowInExcel ?? false, itemMarginPercent: data.itemMarginPercent != null ? String(data.itemMarginPercent) : '', floorId: data.floorId ?? '', floorName: data.floorName ?? '', ambiente: data.ambiente ?? '', specialColorTemp: data.specialColorTemp ?? '', specialEquipments: data.specialEquipments ?? [], mkpCustom: data.mkpCustom != null ? String(data.mkpCustom) : '', specialDescription: data.specialDescription ?? data.description ?? '', specialDimensions: data.specialDimensions ?? '', specialPower: data.specialPower ?? '', specialDim: data.specialDim ?? '', specialVoltage: data.specialVoltage ?? '', specialColor: data.specialColor ?? '', description: data.description ?? '', itemEmPlanta: data.itemEmPlanta ?? '' });
                                    if (data.isSpecialItem) { setEditSpecialPhotoUrl(data.specialPhotoUrl ?? data.photoUrl ?? null); setEditSpecialPhotoPreview(data.specialPhotoUrl ?? data.photoUrl ?? null); } else { setEditSpecialPhotoUrl(null); setEditSpecialPhotoPreview(null); }
                                  }}
                                  applyItemMargin={applyItemMargin}
                                />
                                );
                              })}
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
                    {/* Subtotais desmembrados luminária / driver */}
                    {(() => {
                      const totalLum = entries.reduce((s, e) => {
                        if (e.data.driverLines && e.data.driverLines.length > 0) {
                          // Corrigir itens antigos onde priceWithoutDriver foi salvo como valor unitário
                          const _pwd = e.data.priceWithoutDriver ?? 0;
                          const _upl = e.data.unitPriceLuminaria ?? 0;
                          const _qty = e.data.qty ?? 1;
                          const _isUnit = _upl > 0 && Math.abs(_pwd - _upl) < 0.02 && _qty > 1;
                          return s + (_isUnit ? _upl * _qty : _pwd);
                        }
                        return s + (e.data.totalPrice ?? 0);
                      }, 0);
                      // REGRA INEGOCIÁVEL: usar getEffectiveDrvTotal para recalcular corretamente para perfis
                      const totalDrv = entries.reduce((s, e) => s + getEffectiveDrvTotal(e.data), 0);
                      const hasDriverBreakdown = entries.some(e => e.data.driverLines && e.data.driverLines.length > 0);
                      if (!hasDriverBreakdown) return null;
                      return (
                        <div className="flex flex-col gap-0.5 mt-1">
                          {totalLum > 0 && (
                            <p className="text-xs text-muted-foreground">Luminárias: {formatBRL(totalLum)}</p>
                          )}
                          {totalDrv > 0 && (
                            <p className="text-xs text-orange-600">Drivers: {formatBRL(totalDrv)}</p>
                          )}
                        </div>
                      );
                    })()}
                    {totalGeral > 0 && (
                      <p className="text-2xl font-bold text-primary">{formatBRL(totalGeral)}</p>
                    )}
                    {freteValor > 0 && !saveForm.freteIncluded && (
                      <p className="text-xs text-muted-foreground">+ Frete: <span className="text-red-600 font-medium">{formatBRL(freteValor)}</span></p>
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
                                  value={saveForm.quoteNumber}
                                  placeholder={suggestQuery.isLoading ? "Calculando..." : "Selecione o Vendedor 1"}
                                  className="font-mono"
                                  onChange={e => {
                                    setUserEditedQuoteNumber(true);
                                    updateSaveForm("quoteNumber", e.target.value);
                                  }}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {suggestQuery.isLoading
                                    ? "Calculando número..."
                                    : saveForm.quoteNumber
                                    ? `✓ Gerado automaticamente no formato XX.NNNN-AA`
                                    : "Selecione o Vendedor 1 para gerar o número automaticamente"}
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
                                  // Comissão padrão: 10% para Gatti, 5% para demais
                                  const isGatti1 = (sel?.name ?? "").toLowerCase().includes("gatti");
                                  const hasSeller2 = !!saveForm.seller2Id;
                                  if (hasSeller2) {
                                    const seller2 = sellers.find(s => String(s.id) === saveForm.seller2Id);
                                    const isGatti2 = (seller2?.name ?? "").toLowerCase().includes("gatti");
                                    const total = (isGatti1 || isGatti2) ? 10 : 5;
                                    setSaveForm(prev => ({ ...prev, commissionPercent: String(total / 2), commissionPercent2: String(total / 2) }));
                                  } else {
                                    setSaveForm(prev => ({ ...prev, commissionPercent: isGatti1 ? "10" : "5" }));
                                  }
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
                                    // Voltar para comissão individual do seller1
                                    const seller1 = sellers.find(s => String(s.id) === saveForm.seller1Id);
                                    const isGatti1 = (seller1?.name ?? "").toLowerCase().includes("gatti");
                                    setSaveForm(prev => ({ ...prev, commissionPercent: isGatti1 ? "10" : "5", commissionPercent2: "0" }));
                                  } else {
                                    const sel = sellers.find(s => String(s.id) === v);
                                    updateSaveForm("seller2Id", v);
                                    updateSaveForm("seller2Name", sel?.name ?? "");
                                    // Dividir igualmente entre os dois
                                    const seller1 = sellers.find(s => String(s.id) === saveForm.seller1Id);
                                    const isGatti1 = (seller1?.name ?? "").toLowerCase().includes("gatti");
                                    const isGatti2 = (sel?.name ?? "").toLowerCase().includes("gatti");
                                    const total = (isGatti1 || isGatti2) ? 10 : 5;
                                    setSaveForm(prev => ({ ...prev, commissionPercent: String(total / 2), commissionPercent2: String(total / 2) }));
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
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Arquiteto</Label>
                                <Input
                                  placeholder="Nome do arquiteto"
                                  value={saveForm.arquiteto}
                                  onChange={e => updateSaveForm("arquiteto", e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Light Designer</Label>
                                <Input
                                  placeholder="Nome do light designer"
                                  value={saveForm.lightDesigner}
                                  onChange={e => {
                                    updateSaveForm("lightDesigner", e.target.value);
                                  }}
                                />
                              </div>
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
                                        onChange={e => {
                                          updateSaveForm(destKey, e.target.value as SaveFormData[typeof destKey]);
                                          // Auto-preenche Light Designer com o Destino 1 da RT
                                          if (n === 1 && !saveForm.lightDesigner) {
                                            updateSaveForm("lightDesigner", e.target.value);
                                          }
                                        }}
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
                              {freteValor > 0 && !saveForm.freteIncluded ? (
                                <>
                                  <div className="flex justify-between border-t pt-1">
                                    <span className="text-muted-foreground">Subtotal (sem frete)</span>
                                    <span className="font-bold">{formatBRL(totalFinal)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">+ Frete</span>
                                    <span className="text-red-600 font-medium">{formatBRL(freteValor)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold border-t pt-1">
                                    <span>Total geral</span>
                                    <span className="text-primary">{formatBRL(totalFinal + freteValor)}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex justify-between font-bold border-t pt-1">
                                  <span>Total final</span>
                                  <span className="text-primary">{formatBRL(totalFinal)}</span>
                                </div>
                              )}
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

                            {/* Comissão do vendedor - visível apenas para managers */}
                            {isManagerUser && <div className="border rounded-lg p-3 space-y-2 bg-amber-50 dark:bg-amber-950/20">
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
                            </div>}

                            {/* Comissão 2º Vendedor - visível apenas para managers */}
                            {isManagerUser && <div className="border rounded-lg p-3 space-y-2 bg-amber-50/50 dark:bg-amber-950/10">
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
                            </div>}

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
                                // Base = produtos + frete (antes de aplicar DIFAL/FCP)
                                const base = totalFinal + freteValor;
                                // Alíquota combinada DIFAL + FCP em uma única operação
                                const combinedRate = info.combined; // ex: RJ = 10% (8% DIFAL + 2% FCP)
                                // Fórmula por dentro: total = base / (1 - rate/100)
                                const totalComImposto = combinedRate > 0 ? base / (1 - combinedRate / 100) : base;
                                const combinedVal = totalComImposto - base;
                                // Decompor para exibição
                                const difalVal = info.combined > 0 ? combinedVal * (info.difal / info.combined) : 0;
                                const fcpVal   = info.combined > 0 ? combinedVal * (info.fcp   / info.combined) : 0;
                                return (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id="saveFormDifal"
                                        checked={saveForm.difalEnabled}
                                        onCheckedChange={(v) => {
                                          const enabled = Boolean(v);
                                          updateSaveForm("difalEnabled", enabled);
                                          updateSaveForm("fcpEnabled", enabled);
                                          updateSaveForm("difalValue", String(difalVal.toFixed(2)));
                                          updateSaveForm("fcpValue", String(fcpVal.toFixed(2)));
                                          updateSaveForm("difalPercent", String(info.difal));
                                          updateSaveForm("fcpPercent", String(info.fcp));
                                        }}
                                      />
                                      <label htmlFor="saveFormDifal" className="text-sm cursor-pointer">
                                        Aplicar DIFAL/FCP ({combinedRate.toFixed(1)}%)
                                        {info.difal > 0 && info.fcp > 0 && (
                                          <span className="text-muted-foreground ml-1">
                                            (DIFAL {info.difal.toFixed(1)}% + FCP {info.fcp.toFixed(1)}%)
                                          </span>
                                        )}
                                        {info.fcp === 0 && (
                                          <span className="text-muted-foreground ml-1">(apenas DIFAL)</span>
                                        )}
                                        {" = "}{formatBRL(combinedVal)}
                                      </label>
                                    </div>
                                    {saveForm.difalEnabled && (
                                      <div className="bg-muted/60 rounded p-2 text-sm space-y-1">
                                        {freteValor > 0 && (
                                          <div className="flex justify-between text-muted-foreground">
                                            <span>Base (produtos + frete)</span>
                                            <span>{formatBRL(base)}</span>
                                          </div>
                                        )}
                                        {info.difal > 0 && (
                                          <div className="flex justify-between text-muted-foreground">
                                            <span>DIFAL ({info.difal.toFixed(1)}%)</span>
                                            <span>{formatBRL(difalVal)}</span>
                                          </div>
                                        )}
                                        {info.fcp > 0 && (
                                          <div className="flex justify-between text-muted-foreground">
                                            <span>FCP ({info.fcp.toFixed(1)}%)</span>
                                            <span>{formatBRL(fcpVal)}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between font-semibold border-t pt-1">
                                          <span>Total com DIFAL/FCP</span>
                                          <span>{formatBRL(totalComImposto)}</span>
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
                            {/* Diluição — visível apenas para managers */}
                            {isManagerUser && <div className="border rounded-lg p-3 space-y-3 bg-red-50 dark:bg-red-950/20">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-red-700 dark:text-red-400">⚠ Diluição (uso interno)</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Valor que será diluído proporcionalmente nos produtos. <strong>Não aparece no orçamento nem no Excel.</strong></p>
                              <div>
                                <Label>Valor a diluir (R$)</Label>
                                <Input
                                  type="number" min={0} step={0.01}
                                  className="w-40"
                                  placeholder="0,00"
                                  value={saveForm.diluicaoValor}
                                  onChange={e => updateSaveForm("diluicaoValor", e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Motivo / Descrição interna</Label>
                                <Input
                                  maxLength={256}
                                  placeholder="Ex: Saldo devedor ORC 04.0123-25"
                                  value={saveForm.diluicaoDescricao}
                                  onChange={e => updateSaveForm("diluicaoDescricao", e.target.value)}
                                />
                              </div>
                              {saveForm.diluicaoValor && parseFloat(saveForm.diluicaoValor) > 0 && (
                                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                  {formatBRL(parseFloat(saveForm.diluicaoValor))} serão adicionados proporcionalmente aos preços dos produtos.
                                </p>
                              )}
                            </div>}
                          </TabsContent>

                                                    {/* ─── Aba Frete ─── */}
                          <TabsContent value="frete" className="space-y-4 pt-3">
                            {/* Estado e Cidade de entrega */}
                            <StateCitySelector
                              stateCode={saveForm.freteStateCode || "SP"}
                              city={saveForm.freteCity}
                              onStateChange={(v) => {
                                updateSaveForm("freteStateCode", v);
                                updateSaveForm("freteCity", "");
                              }}
                              onCityChange={(city) => {
                                updateSaveForm("freteCity", city);
                                // Auto-selecionar frete "A Calcular" se não for São Paulo capital
                                if (city && !isSaoPauloCapital(city, saveForm.freteStateCode || "SP")) {
                                  updateSaveForm("freteType", "paid");
                                }
                              }}
                              difalState={saveForm.destState}
                              onUseDifalState={() => {
                                updateSaveForm("freteStateCode", saveForm.destState);
                                updateSaveForm("freteCity", "");
                              }}
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
              const isNaoOrcamos = item?.data.category === 'Não Orçamos';
              // Controle de preços por papel: admin e gerente podem editar preços da API
              const userRole = (user as any)?.role;
              const userEmail = (user as any)?.email?.toLowerCase() ?? "";
              const canOverrideApiPrice = userRole === 'admin' || userRole === 'gerente' || PRICE_OVERRIDE_EMAILS.includes(userEmail);
              const canEditDriverPrice = DRIVER_PRICE_OVERRIDE_EMAILS.map(e => e.toLowerCase()).includes(userEmail);
              const canEditPrice = !item?.data.priceFromApi || canOverrideApiPrice;
              const canEditMkp = userRole === 'admin' || userRole === 'gerente' || MANAGER_EMAILS.map(e => e.toLowerCase()).includes(userEmail);
              const hasMkpData = canEditMkp && item?.data.custoCorpoBase != null && item.data.custoCorpoBase > 0;
              if (isNaoOrcamos) return (
                <>
                  <div className="space-y-1">
                    <Label>Descrição <span className="text-destructive">*</span></Label>
                    <textarea
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                      rows={3}
                      value={editFields.description}
                      onChange={(e) => setEditFields(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição do produto não orçado"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Item em Planta</Label>
                    <Input
                      value={editFields.itemEmPlanta}
                      onChange={(e) => setEditFields(prev => ({ ...prev, itemEmPlanta: e.target.value }))}
                      placeholder="ex: L1, EF2"
                    />
                  </div>
                </>
              );
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
                    {(() => {
                      const curItem = orderedEntries.find(e => e.id === editItemId);
                      const avail = curItem?.data.availableCCTs;
                      if (avail && avail.length > 0) {
                        return (
                          <Select
                            value={editFields.cct}
                            onValueChange={(v) => setEditFields(prev => ({ ...prev, cct: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o CCT" />
                            </SelectTrigger>
                            <SelectContent>
                              {avail.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      }
                      return (
                        <Input
                          value={editFields.cct}
                          onChange={(e) => setEditFields(prev => ({ ...prev, cct: e.target.value }))}
                          placeholder="ex: 3000K, 4000K"
                        />
                      );
                    })()}
                  </div>
                  {!item?.data.isSpecialItem && (
                  <div className="space-y-1">
                    <Label>Cor da peça</Label>
                    <Select
                      value={editFields.corPeca || "A Definir"}
                      onValueChange={(v) => setEditFields(prev => ({ ...prev, corPeca: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a cor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A Definir">A Definir</SelectItem>
                        {CORES_PECA.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  )}
                  {/* Campo de preço: desmembrado (luminária + driver) ou unitário */}
                  {item?.data.driverLines && item.data.driverLines.length > 0 ? (
                    <>
                      <div className="space-y-1">
                        <Label>Preço unitário da luminária (R$)</Label>
                        <Input
                          value={editFields.unitPrice}
                          onChange={(e) => setEditFields(prev => ({ ...prev, unitPrice: e.target.value }))}
                          placeholder={item.data.luminariaHasApiPrice ? String(item.data.unitPriceLuminaria ?? '') : "Definir preço da luminária"}
                          className={item.data.luminariaHasApiPrice && !canOverrideApiPrice ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
                          readOnly={item.data.luminariaHasApiPrice && !canOverrideApiPrice}
                        />
                        {!item.data.luminariaHasApiPrice && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">API não retornou custo do corpo — informe o preço da luminária manualmente.</p>
                        )}
                        {item.data.luminariaHasApiPrice && !canOverrideApiPrice && (
                          <p className="text-xs text-muted-foreground">Preço da luminária definido pela API. Apenas admin/gerente podem alterar.</p>
                        )}
                      </div>
                      {item.data.driverLines && item.data.driverLines.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label>Preço unitário do driver (R$)</Label>
                            {canEditDriverPrice && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">editável</span>
                            )}
                          </div>
                          <div className="relative">
                            <Input
                              value={editFields.driverUnitPriceOverride}
                              onChange={canEditDriverPrice ? (e) => setEditFields(prev => ({ ...prev, driverUnitPriceOverride: e.target.value })) : undefined}
                              readOnly={!canEditDriverPrice}
                              placeholder={item.data.driverLines[0].driverUnitPrice != null ? String(item.data.driverLines[0].driverUnitPrice) : "Preço do driver"}
                              className={[
                                !canEditDriverPrice ? "bg-muted text-muted-foreground cursor-not-allowed" : "",
                                canEditDriverPrice ? "pr-8" : ""
                              ].join(" ")}
                            />
                            {canEditDriverPrice && (
                              <Pencil className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500 pointer-events-none" />
                            )}
                          </div>
                          {!canEditDriverPrice && (
                            <p className="text-xs text-muted-foreground">Preço do driver calculado pela API.</p>
                          )}
                          {canEditDriverPrice && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">Alterar substituirá o preço da API para este driver. O total do item será recalculado.</p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-1">
                      <Label>Preço unitário (R$)</Label>
                      <Input
                        value={editFields.unitPrice}
                        onChange={canEditPrice ? (e) => setEditFields(prev => ({ ...prev, unitPrice: e.target.value })) : undefined}
                        readOnly={!canEditPrice}
                        placeholder={canEditPrice ? (item?.data.unitPrice == null && !item?.data.priceFromApi ? "Informe o preço manualmente" : "Definir preço") : "Preço da API"}
                        className={[
                          !canEditPrice ? "bg-muted text-muted-foreground cursor-not-allowed" : "",
                          canEditPrice && item?.data.unitPrice == null && !item?.data.priceFromApi ? "border-amber-500 focus:ring-amber-500" : ""
                        ].join(" ")}
                      />
                      {!canEditPrice && (
                        <p className="text-xs text-muted-foreground">Preço definido pela API. Apenas admin/gerente podem alterar.</p>
                      )}
                      {canEditPrice && item?.data.unitPrice == null && !item?.data.priceFromApi && (
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3 shrink-0" />API sem custo cadastrado — informe o preço manualmente para incluir no orçamento.</p>
                      )}
                      {canEditPrice && item?.data.priceFromApi && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">Preço da API — você pode alterar (admin/gerente).</p>
                      )}
                    </div>
                  )}
                  {/* Campo de MKP — apenas para gerentes/admin quando custo base disponível */}
                  {hasMkpData && (() => {
                    const custoCorpo = item!.data.custoCorpoBase!;
                    const mkpMin = item!.data.markupMinimoApi ?? 1;
                    const mkpPad = item!.data.markupPadraoApi ?? mkpMin;
                    const mkpMax = Math.max(mkpPad, mkpMin + 2);
                    const currentMkp = editFields.mkpCustom !== '' ? parseFloat(editFields.mkpCustom.replace(',', '.')) : mkpPad;
                    const previewPrice = isNaN(currentMkp) ? null : Math.round(custoCorpo * currentMkp * 100) / 100;
                    return (
                      <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-50/30 dark:bg-amber-900/10 p-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-amber-700 dark:text-amber-400 font-semibold text-xs uppercase tracking-wide">MKP (Markup)</Label>
                          <span className="text-xs text-muted-foreground">Apenas gerentes</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={mkpMin}
                            max={mkpMax}
                            step={0.01}
                            value={currentMkp}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              const newPrice = Math.round(custoCorpo * v * 100) / 100;
                              setEditFields(prev => ({ ...prev, mkpCustom: String(v), unitPrice: String(newPrice).replace('.', ',') }));
                            }}
                            className="flex-1 accent-amber-600"
                          />
                          <Input
                            type="number"
                            min={mkpMin}
                            max={mkpMax}
                            step={0.01}
                            value={editFields.mkpCustom !== '' ? editFields.mkpCustom : mkpPad}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) {
                                const clamped = Math.min(Math.max(v, mkpMin), mkpMax);
                                const newPrice = Math.round(custoCorpo * clamped * 100) / 100;
                                setEditFields(prev => ({ ...prev, mkpCustom: String(clamped), unitPrice: String(newPrice).replace('.', ',') }));
                              } else {
                                setEditFields(prev => ({ ...prev, mkpCustom: e.target.value }));
                              }
                            }}
                            className="w-20 text-center"
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Mín: {mkpMin.toFixed(2)}</span>
                          <span>Padrão: {mkpPad.toFixed(2)}</span>
                          <span>Preço: {previewPrice != null ? `R$ ${previewPrice.toFixed(2).replace('.', ',')}` : '—'}</span>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Custo base: R$ {custoCorpo.toFixed(2).replace('.', ',')} · Alteração reflete no campo de preço acima.</p>
                      </div>
                    );
                  })()}
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
                    <Label>Pavimento</Label>
                    <div>
                        <Input
                          value={editFields.floorName}
                          onChange={(e) => setEditFields(prev => ({ ...prev, floorName: e.target.value, floorId: e.target.value.trim() }))}
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
                    <p className="text-xs text-muted-foreground">Agrupa itens por pavimento no Excel</p>
                  </div>
                  {/* Campos editáveis do Item Especial */}
                  {item?.data.isSpecialItem && (
                    <div className="space-y-3 pt-2 border-t">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Dados do Item Especial</p>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <Label className="text-xs">Descrição</Label>
                          <Input
                            value={editFields.specialDescription}
                            onChange={e => setEditFields(prev => ({ ...prev, specialDescription: e.target.value }))}
                            placeholder="Descrição do item especial"
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Dimensões</Label>
                            <Input
                              value={editFields.specialDimensions}
                              onChange={e => setEditFields(prev => ({ ...prev, specialDimensions: e.target.value }))}
                              placeholder="ex: 620 x 620 x 100mm"
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Potência</Label>
                            <Input
                              value={editFields.specialPower}
                              onChange={e => setEditFields(prev => ({ ...prev, specialPower: e.target.value }))}
                              placeholder="ex: 36W"
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Acionamento / DIM</Label>
                            <Input
                              value={editFields.specialDim}
                              onChange={e => setEditFields(prev => ({ ...prev, specialDim: e.target.value }))}
                              placeholder="ex: ON/OFF, DALI, DIM"
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Tensão</Label>
                            <Input
                              value={editFields.specialVoltage}
                              onChange={e => setEditFields(prev => ({ ...prev, specialVoltage: e.target.value }))}
                              placeholder="ex: BIVOLT, 220V"
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Cor da Peça (Especial)</Label>
                            <Input
                              value={editFields.specialColor}
                              onChange={e => setEditFields(prev => ({ ...prev, specialColor: e.target.value }))}
                              placeholder="ex: Branco, Preto"
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                  {/* Equipamentos do Item Especial */}
                  {item?.data.isSpecialItem && (
                    <div className="space-y-1">
                      <SpecialEquipmentsEditor
                        value={editFields.specialEquipments ?? item?.data.specialEquipments ?? []}
                        onChange={(equips: SpecialEquipment[]) => setEditFields(prev => ({ ...prev, specialEquipments: equips }))}
                      />
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
              const isNaoOrcamosSave = item?.data.category === 'Não Orçamos';
              const patch: Record<string, unknown> = {};
              const userRoleSave = (user as any)?.role;
              const userEmailSave = (user as any)?.email?.toLowerCase() ?? "";
              const canOverrideApiPriceSave = userRoleSave === 'admin' || userRoleSave === 'gerente' || PRICE_OVERRIDE_EMAILS.includes(userEmailSave);
              const canEditDriverPriceSave = DRIVER_PRICE_OVERRIDE_EMAILS.map(e => e.toLowerCase()).includes(userEmailSave);
              const canEditPriceSave = !item?.data.priceFromApi || canOverrideApiPriceSave;
              if (isNaoOrcamosSave) {
                if (editFields.description.trim()) {
                  patch.description = editFields.description.trim();
                  patch.orderSummary = editFields.description.trim();
                  patch.quoteSummary = editFields.description.trim();
                }
                if (editFields.itemEmPlanta !== undefined) patch.itemEmPlanta = editFields.itemEmPlanta;
              } else if (isRevenda) {
                const qty = parseInt(editFields.qty) || 1;
                const unitPrice = parseFloat(editFields.unitPrice.replace(',', '.')) || 0;
                patch.qty = qty;
                patch.unitPrice = unitPrice;
                patch.totalPrice = qty * unitPrice;
              } else {
                const newCCT = editFields.cct.trim();
                if (newCCT) {
                  // Se o CCT mudou, atualizar description, moduloLed, orderSummary, quoteSummary
                  if (item?.data && newCCT !== (item.data.cct ?? '')) {
                    const cctPatch = applyCCTChange(item.data, newCCT);
                    Object.assign(patch, cctPatch);
                  } else {
                    patch.cct = newCCT;
                  }
                }
                if (editFields.corPeca && editFields.corPeca !== 'A Definir') patch.corPeca = editFields.corPeca;
                else if (editFields.corPeca === 'A Definir') patch.corPeca = '';
                // Salvar preço manual
                if (item?.data.driverLines && item.data.driverLines.length > 0) {
                  // Item com driver desmembrado: editFields.unitPrice é o preço da luminária
                  const canEditLuminaria = !item.data.luminariaHasApiPrice || canOverrideApiPriceSave;
                  // Override do preço do driver (apenas para quem tem permissão)
                  let effectiveDriverUnitPrice = item.data.driverLines[0]?.driverUnitPrice ?? null;
                  if (canEditDriverPriceSave && editFields.driverUnitPriceOverride.trim()) {
                    const parsedDrvPrice = parseFloat(editFields.driverUnitPriceOverride.replace(',', '.'));
                    if (!isNaN(parsedDrvPrice) && parsedDrvPrice >= 0) {
                      effectiveDriverUnitPrice = parsedDrvPrice;
                      // Atualizar driverLines com o novo preço unitário
                      const qty = parseInt(editFields.qty) || item?.data.qty || 1;
                      const drvQtyPerLum = getProfileDrvQtyPerLuminaria(item.data);
                      patch.driverLines = item.data.driverLines.map(dl => {
                        const drvQtyForTotal = drvQtyPerLum != null
                          ? drvQtyPerLum * qty
                          : (dl.driverQty ?? qty);
                        return {
                          ...dl,
                          driverUnitPrice: parsedDrvPrice,
                          driverTotalPrice: Math.round(parsedDrvPrice * drvQtyForTotal * 100) / 100,
                        };
                      });
                      // Atualizar unitPriceDriver para consistência
                      patch.unitPriceDriver = parsedDrvPrice;
                    }
                  }
                  if (canEditLuminaria && editFields.unitPrice.trim()) {
                    const qty = parseInt(editFields.qty) || item?.data.qty || 1;
                    const lumUnitPrice = parseFloat(editFields.unitPrice.replace(',', '.')) || 0;
                    patch.unitPriceLuminaria = lumUnitPrice;
                    patch.priceWithoutDriver = Math.round(lumUnitPrice * qty * 100) / 100;
                    // REGRA: totalPrice = apenas luminária (sem driver)
                    // O driver aparece separado em driverLines; não somar aqui para evitar duplicação
                    patch.totalPrice = Math.round(lumUnitPrice * qty * 100) / 100;
                    const drvQtyPerLum = getProfileDrvQtyPerLuminaria(item.data);
                    const drvQtyForUnit = drvQtyPerLum != null ? drvQtyPerLum : (item.data.driverLines[0]?.driverQty ?? 1);
                    patch.unitPrice = Math.round((lumUnitPrice + (effectiveDriverUnitPrice ?? 0) * drvQtyForUnit) * 100) / 100;
                    patch.luminariaHasApiPrice = item.data.luminariaHasApiPrice;
                  } else if (canEditDriverPriceSave && editFields.driverUnitPriceOverride.trim() && !editFields.unitPrice.trim()) {
                    // Apenas o driver foi alterado (sem alterar luminária): recalcular unitPrice e totalPrice
                    const qty = parseInt(editFields.qty) || item?.data.qty || 1;
                    const lumUnitPrice = item.data.unitPriceLuminaria ?? 0;
                    const drvQtyPerLum = getProfileDrvQtyPerLuminaria(item.data);
                    const drvQtyForUnit = drvQtyPerLum != null ? drvQtyPerLum : (item.data.driverLines[0]?.driverQty ?? 1);
                    if (lumUnitPrice > 0 && effectiveDriverUnitPrice != null) {
                      patch.unitPrice = Math.round((lumUnitPrice + effectiveDriverUnitPrice * drvQtyForUnit) * 100) / 100;
                      patch.totalPrice = Math.round(lumUnitPrice * qty * 100) / 100;
                      patch.priceWithoutDriver = Math.round(lumUnitPrice * qty * 100) / 100;
                    }
                  }
                } else if (canEditPriceSave && editFields.unitPrice.trim()) {
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
              // Campo vazio = usa margem global (undefined)
              // Campo com valor (incluindo 0) = margem individual explícita
              if (!isRevenda) {
                const rawMargin = editFields.itemMarginPercent.trim();
                if (rawMargin === '') {
                  patch.itemMarginPercent = undefined; // vazio = usa margem global
                } else {
                  const parsed = parseFloat(rawMargin);
                  patch.itemMarginPercent = isNaN(parsed) ? undefined : Math.max(0, parsed);
                }
              }
              // mkpCustom (markup personalizado por gerentes)
              if (editFields.mkpCustom.trim()) {
                const mkpVal = parseFloat(editFields.mkpCustom.replace(',', '.'));
                if (!isNaN(mkpVal) && mkpVal > 0) patch.mkpCustom = mkpVal;
              }
              // floorId / floorName / ambiente
              patch.floorId = editFields.floorId.trim() || undefined;
              patch.floorName = editFields.floorName.trim() || undefined;
              patch.ambiente = editFields.ambiente.trim() || undefined;
              // Foto, temperatura de cor, equipamentos e campos do Item Especial
              if (item?.data.isSpecialItem) {
                patch.specialPhotoUrl = editSpecialPhotoUrl ?? undefined;
                patch.photoUrl = editSpecialPhotoUrl ?? undefined;
                patch.specialColorTemp = editFields.specialColorTemp.trim() || undefined;
                patch.specialEquipments = editFields.specialEquipments.length > 0 ? editFields.specialEquipments : undefined;
                if (editFields.specialDescription.trim()) {
                  patch.specialDescription = editFields.specialDescription.trim();
                  patch.description = editFields.specialDescription.trim();
                }
                if (editFields.specialDimensions.trim()) patch.specialDimensions = editFields.specialDimensions.trim();
                if (editFields.specialPower.trim()) patch.specialPower = editFields.specialPower.trim();
                if (editFields.specialDim.trim()) patch.specialDim = editFields.specialDim.trim();
                if (editFields.specialVoltage.trim()) patch.specialVoltage = editFields.specialVoltage.trim();
                if (editFields.specialColor.trim()) patch.specialColor = editFields.specialColor.trim();
              }
              const totalForUpdate = isRevenda
                ? (parseInt(editFields.qty) || 1) * (parseFloat(editFields.unitPrice.replace(',', '.')) || 0)
                : (canEditPriceSave && editFields.unitPrice.trim() ? (item?.data.qty || 1) * (parseFloat(editFields.unitPrice.replace(',', '.')) || 0) : 0);
              if (totalForUpdate > 0) patch.totalPrice = totalForUpdate;
              updateItemField(editItemId, patch, 0); // 0ms: envia imediatamente ao salvar
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
          freteCity: saveForm.freteCity || undefined,
          freteState: saveForm.freteStateCode || undefined,
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
