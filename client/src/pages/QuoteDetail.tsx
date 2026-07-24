import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, CheckCircle, XCircle, Clock, TrendingDown,
  FileSpreadsheet, History, Package, Edit, AlertTriangle,
  ChevronDown, ChevronUp, Factory, Trash2, PenLine,
  Users, Percent, Truck, Pencil, ShoppingBag, PlusCircle, GripVertical, Wrench, Copy, Eye, Navigation2,
  Upload, X as XIcon, Layers, Receipt, Printer, Search,
  User, Phone, FolderOpen, Bookmark, MapPin, Briefcase, Calendar, RefreshCw, ClipboardList, Zap, FileDown,
  TrendingUp, DollarSign, Calculator, ArrowLeftRight, FlaskConical, Link2,
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
import { toBrasiliaDate, toBrasiliaDateTime } from "@/lib/dateUtils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { CartItemData, formatBRL, parseCartItemData, extractPowerLabelFromName, toPowerLabel } from "@/lib/cartTypes";
import type { ApiProductDriverInfo } from "@/lib/cartTypes";

/** Aplica margem individual do item (itemMarginPercent em %) sobre um valor base */
function applyItemMarginQD(base: number, itemMarginPercent?: number | null): number {
  if (itemMarginPercent == null || itemMarginPercent <= 0) return base;
  const pct = Math.min(Math.max(itemMarginPercent / 100, 0), 0.99);
  return base / (1 - pct);
}

/**
 * Extrai informações de drivers de itens legados (sem driverLines mas com profileSegments).
 * Retorna lista consolidada de { driverCode, driverModel, totalQty } ou null se não aplicável.
 */
function getLegacyDriverInfo(d: CartItemData): Array<{ driverCode: string; driverModel: string; totalQty: number }> | null {
  if (d.driverLines && d.driverLines.length > 0) return null; // tem driverLines, não é legado
  if (!d.profileSegments || d.profileSegments.length === 0) return null;
  const hasAnyDriver = d.profileSegments.some(seg => seg.driverCode);
  if (!hasAnyDriver) return null;
  // Consolidar drivers por código
  const map = new Map<string, { driverCode: string; driverModel: string; totalQty: number }>();
  for (const seg of d.profileSegments) {
    if (!seg.driverCode) continue;
    const key = seg.driverCode;
    const qtyPerSeg = (seg.driverQtyPerPiece ?? 1) * (seg.qty ?? 1);
    if (map.has(key)) {
      map.get(key)!.totalQty += qtyPerSeg;
    } else {
      map.set(key, { driverCode: seg.driverCode, driverModel: seg.driverModel ?? seg.driverCode, totalQty: qtyPerSeg });
    }
  }
  return map.size > 0 ? Array.from(map.values()) : null;
}

/**
 * REGRA INEGOCIÁVEL: Para itens de perfil (BLAZE, etc.), o driverQty salvo no banco
 * pode estar errado (apenas por luminária, sem multiplicar por qty).
 * Esta função recalcula driverQty e driverTotalPrice a partir de profileSegments.
 * Deve ser usada em TODOS os locais que exibem ou calculam drivers de perfis.
 */
function getEffectiveDriverLines(d: CartItemData): typeof d.driverLines {
  if (!d.driverLines || d.driverLines.length === 0) return d.driverLines;
  if (!d.profileSegments || d.profileSegments.length === 0) return d.driverLines;
  // Calcular total de drivers por luminária a partir de profileSegments
  const drvPerLumMap = new Map<string, number>();
  for (const seg of d.profileSegments) {
    if (!seg.driverCode) continue;
    const qtyPerSeg = (seg.driverQtyPerPiece ?? 1) * (seg.qty ?? 1);
    drvPerLumMap.set(seg.driverCode, (drvPerLumMap.get(seg.driverCode) ?? 0) + qtyPerSeg);
  }
  if (drvPerLumMap.size === 0) return d.driverLines;
  const itemQty = d.qty ?? 1;
  return d.driverLines.map(dl => {
    const drvPerLum = drvPerLumMap.get(dl.driverCode ?? '') ?? null;
    if (drvPerLum == null) return dl;
    const correctTotal = drvPerLum * itemQty;
    // Se o driverQty salvo já está correto (igual ao total correto), não alterar
    if (dl.driverQty === correctTotal) return dl;
    // Se o driverQty salvo é igual a drvPerLum (só por luminária, sem multiplicar por qty), corrigir
    if (dl.driverQty === drvPerLum || (dl.driverQty != null && dl.driverQty !== correctTotal)) {
      const unitPrice = dl.driverUnitPrice ?? (dl.driverTotalPrice != null && dl.driverQty ? dl.driverTotalPrice / dl.driverQty : null);
      return {
        ...dl,
        driverQty: correctTotal,
        driverTotalPrice: unitPrice != null ? Math.round(unitPrice * correctTotal * 100) / 100 : dl.driverTotalPrice,
      };
    }
    return dl;
  });
}

import type { LinkedAccessory, SpecialEquipment } from "@/lib/cartTypes";
import { SpecialEquipmentsEditor } from "@/components/SpecialEquipmentsEditor";
import { CORES_PECA } from "@/components/ColorPickerModal";
import { generateQuoteExcel } from "@/lib/quoteExcelGenerator";
import { generateQuotePdf } from "@/lib/quotePdfGenerator";
import { ExcelPreviewModal } from "@/components/ExcelPreviewModal";
import { OrderPreviewModal } from "@/components/OrderPreviewModal";
import { generateOrderExcel, calcDeliveryDate } from "@/lib/orderExcelGenerator";
import { DIFAL_TABLE, getStateInfo } from "@/lib/difalTable";
import { StateCitySelector, isSaoPauloCapital } from "@/components/StateCitySelector";
import { toast } from "sonner";
import { PRICE_OVERRIDE_EMAILS, MANAGER_EMAILS, DRIVER_PRICE_OVERRIDE_EMAILS, COST_PRIVILEGED_EMAILS, DISCOUNT_EDITORS_EMAILS } from "@shared/const";
import { applyCCTChange, applyUnitPriceChange, applyQtyChange } from "@/lib/cctUtils";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Em Aberto", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "Aprovado", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: <CheckCircle className="w-3 h-3" /> },
  lost: { label: "Perdido", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: <TrendingDown className="w-3 h-3" /> },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: <XCircle className="w-3 h-3" /> },
  invoiced: { label: "Faturado", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", icon: <Receipt className="w-3 h-3" /> },
};

// Componente separado para cada item editável com drag-and-drop
// (useSortable DEVE ser chamado no nível do componente, nunca dentro de .map())
interface SortableEditItemProps {
  item: { id: number; itemNumber: number; itemData: string; parsed: CartItemData };
  idx: number;
  /** Número de sequência global do item (1-based) */
  globalSeq: number;
  /** Total de itens no orçamento */
  totalItems: number;
  /** Callback para reordenar o item para a nova posição global (1-based) */
  onReorderToSeq: (itemId: number, newSeq: number) => void;
  resolvePhoto: (sku: string | undefined, savedUrl: string | null) => string | null;
  onUpdate: (id: number, fields: Partial<CartItemData>) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onReplace: (idx: number) => void;
  onUploadSpecialPhoto: (itemId: number, base64: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp', fileName: string) => Promise<void>;
  canOverrideApiPrice?: boolean;
  canEditDriverPrice?: boolean;
  isCostPrivileged?: boolean;
  canEditMkp?: boolean;
}

function SortableEditItem({ item, idx, globalSeq, totalItems, onReorderToSeq, resolvePhoto, onUpdate, onDelete, onDuplicate, onReplace, onUploadSpecialPhoto, canOverrideApiPrice = false, canEditDriverPrice = false, isCostPrivileged = false, canEditMkp = false }: SortableEditItemProps) {
  const [specialUploading, setSpecialUploading] = useState(false);
  const [seqInputVal, setSeqInputVal] = useState<string>("");
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
        {/* Botão excluir item */}
        <button
          type="button"
          className="flex-shrink-0 text-destructive/60 hover:text-destructive transition-colors"
          title="Excluir este item"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="w-4 h-4" />
        </button>
        {/* Botão duplicar item */}
        <button
          type="button"
          className="flex-shrink-0 text-muted-foreground/60 hover:text-blue-500 transition-colors"
          title="Duplicar este item"
          onClick={() => onDuplicate(item.id)}
        >
          <Copy className="w-4 h-4" />
        </button>
        {/* Botão substituir item */}
        <button
          type="button"
          className="flex-shrink-0 text-muted-foreground/60 hover:text-amber-500 transition-colors"
          title="Substituir este item"
          onClick={() => onReplace(idx)}
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>
        {/* Número de sequência editável */}
        <div
          className="flex-shrink-0 relative"
          title="Clique para alterar a ordem"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {seqInputVal === "" ? (
            <div
              className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center cursor-text select-none"
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
              className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold text-center border-2 border-primary/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              onChange={(e) => setSeqInputVal(e.target.value)}
              onBlur={() => {
                const n = parseInt(seqInputVal, 10);
                if (!isNaN(n) && n >= 1 && n <= totalItems && n !== globalSeq) {
                  onReorderToSeq(item.id, n);
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
        {resolvePhoto(d.sku, d.photoUrl) ? (
          <img src={resolvePhoto(d.sku, d.photoUrl)!} alt={d.description} className="w-12 h-12 object-contain rounded border bg-white flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {d.category !== 'Não Orçamos' && <p className="text-xs text-muted-foreground font-mono">{d.sku}</p>}
          <p className="text-sm font-semibold leading-tight">{d.description}</p>
          <p className="text-xs text-muted-foreground">{d.category}</p>
        </div>
      </div>

      {/* Campos editáveis para Não Orçamos: apenas descrição e item em planta */}
      {d.category === 'Não Orçamos' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              rows={3}
              value={d.description ?? ""}
              onChange={e => onUpdate(item.id, { description: e.target.value, orderSummary: e.target.value, quoteSummary: e.target.value })}
              placeholder="Descrição do produto não orçado"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Item em Planta</Label>
            <Input
              value={d.itemEmPlanta ?? ""}
              onChange={e => onUpdate(item.id, { itemEmPlanta: e.target.value })}
              placeholder="ex: L1, EF2"
              className="mt-1 h-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Campos editáveis */}
      {d.category !== 'Não Orçamos' && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

        {/* Pavimento */}
        <div>
          <Label className="text-xs">Pavimento</Label>
          <Input
            value={d.floorName ?? ""}
            onChange={e => {
              const v = e.target.value;
              onUpdate(item.id, { floorName: v, floorId: v.trim() });
            }}
            placeholder="ex: Térreo, 1º Andar"
            className="mt-1 h-8 text-sm"
            list="pavimento-suggestions-edit"
          />
          <datalist id="pavimento-suggestions-edit">
            <option value="Térreo" />
            <option value="1º Andar" />
            <option value="2º Andar" />
            <option value="3º Andar" />
            <option value="Cobertura" />
            <option value="Subsolo" />
            <option value="Mezanino" />
          </datalist>
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
      </div>}

      {/* Preço unitário: editável quando não veio da API, ou quando o usuário tem permissão de override */}
      {d.category !== 'Não Orçamos' && <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label className="text-xs">
            Preço Unitário (R$)
            {d.priceFromApi && (
              <span className="ml-1 text-muted-foreground font-normal">{canOverrideApiPrice ? "(API — editável)" : "(API)"}</span>
            )}
          </Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={d.unitPrice ?? ""}
            onChange={(d.priceFromApi && !canOverrideApiPrice) ? undefined : (e => {
              const newUnitPrice = e.target.value ? parseFloat(e.target.value) : null;
              onUpdate(item.id, {
                unitPrice: newUnitPrice,
                totalPrice: newUnitPrice != null ? newUnitPrice * d.qty : null,
              });
            })}
            readOnly={!!d.priceFromApi && !canOverrideApiPrice}
            placeholder={d.priceFromApi ? (canOverrideApiPrice ? "Sobrescrever preço da API" : "Preço da API") : "Definir preço"}
            className={`mt-1 h-8 text-sm${(d.priceFromApi && !canOverrideApiPrice) ? " bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
          />
          {d.priceFromApi && !canOverrideApiPrice && (
            <p className="text-xs text-muted-foreground mt-0.5">Preço definido pela API — não editável.</p>
          )}
          {d.priceFromApi && canOverrideApiPrice && (
            <p className="text-xs text-amber-500 mt-0.5">Permissão especial: preço da API pode ser sobrescrito.</p>
          )}
          {/* Preço com margem individual aplicada */}
          {d.itemMarginPercent != null && d.itemMarginPercent > 0 && d.unitPrice != null && d.unitPrice > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              c/ margem ind. ({d.itemMarginPercent}%): <span className="font-semibold">{formatBRL(applyItemMarginQD(d.unitPrice, d.itemMarginPercent))}</span>/un
            </p>
          )}
        </div>
        <div className="text-right">
          {d.driverLines && d.driverLines.length > 0 ? (() => {
            const lumTotal = (() => {
              if (d.priceWithoutDriver != null) {
                const isUnitOnly = d.unitPriceLuminaria != null && Math.abs(d.priceWithoutDriver - d.unitPriceLuminaria) < 0.02 && d.qty > 1;
                return isUnitOnly ? d.unitPriceLuminaria! * d.qty : d.priceWithoutDriver;
              }
              const unitLum = d.unitPriceLuminaria ?? d.unitPrice ?? null;
              return unitLum != null ? unitLum * d.qty : (d.totalPrice ?? 0);
            })();
            const drvTotal = d.driverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
            const grandTotal = applyItemMarginQD(lumTotal + drvTotal, d.itemMarginPercent);
            return grandTotal > 0 ? (
              <>
                <p className="text-xs text-muted-foreground">Total (lum. + drv.){d.itemMarginPercent != null && d.itemMarginPercent > 0 ? ` +${d.itemMarginPercent}% ind.` : ""}</p>
                <p className="font-bold text-primary">{formatBRL(grandTotal)}</p>
              </>
            ) : (
              <><p className="text-xs text-muted-foreground">Total</p><p className="font-bold text-primary">A consultar</p></>
            );
          })() : (
            <>
              <p className="text-xs text-muted-foreground">Total{d.itemMarginPercent != null && d.itemMarginPercent > 0 ? ` +${d.itemMarginPercent}% ind.` : ""}</p>
              <p className="font-bold text-primary">
                {d.totalPrice != null && d.totalPrice > 0 ? formatBRL(applyItemMarginQD(d.totalPrice, d.itemMarginPercent)) : "A consultar"}
              </p>
            </>
          )}
        </div>
      </div>}

      {/* Drivers do item — exibição + edição de preço para gerentes */}
      {d.driverLines && d.driverLines.length > 0 && (
        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Drivers</p>
            {canEditDriverPrice && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">preço editável</span>}
          </div>
          {d.driverLines.map((dl, dIdx) => (
            <div key={dIdx} className="flex items-center justify-between gap-2 text-xs bg-muted/40 rounded px-2 py-1.5">
              <div className="flex-1 min-w-0">
                <span className="font-mono text-muted-foreground">{dl.driverCode ?? "—"}</span>
                {dl.driverModel && <span className="ml-1 text-foreground/80 truncate">{dl.driverModel}</span>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-muted-foreground">Qtd: <span className="font-medium text-foreground">{dl.driverQty ?? 1}</span></span>
                {canEditDriverPrice ? (
                  <div className="relative flex items-center">
                    <span className="text-muted-foreground mr-1">Unit:</span>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        defaultValue={dl.driverUnitPrice ?? ''}
                        placeholder={dl.driverUnitPrice != null ? String(dl.driverUnitPrice) : "0"}
                        className="h-6 w-20 rounded border border-amber-400/60 bg-background px-1.5 pr-5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
                        onBlur={(e) => {
                          const newUnitPrice = e.target.value ? parseFloat(e.target.value) : dl.driverUnitPrice;
                          if (newUnitPrice == null || newUnitPrice === dl.driverUnitPrice) return;
                          // Recalcular driverLines com novo preço unitário
                          const updatedDriverLines = d.driverLines!.map((x, xi) =>
                            xi === dIdx
                              ? { ...x, driverUnitPrice: newUnitPrice, driverTotalPrice: Math.round(newUnitPrice * (x.driverQty ?? 1) * 100) / 100 }
                              : x
                          );
                          // Recalcular unitPriceDriver (média ponderada por luminaria)
                          const drvQtyPerLum = d.profileSegments && d.profileSegments.length > 0
                            ? d.profileSegments.reduce((s, seg) => s + (seg.driverQtyPerPiece ?? 1) * seg.qty, 0)
                            : null;
                          const drvUnitForLum = updatedDriverLines.reduce((s, x) => {
                            const qtyPerLum = drvQtyPerLum != null ? drvQtyPerLum : Math.round((x.driverQty ?? 1) / (d.qty ?? 1));
                            return s + (x.driverUnitPrice ?? 0) * qtyPerLum;
                          }, 0);
                          const lumUnitPrice = d.unitPriceLuminaria ?? 0;
                          const drvQtyForUnit = drvQtyPerLum != null ? drvQtyPerLum : (d.driverLines![0]?.driverQty ?? 1);
                          const newUnitPriceComposite = lumUnitPrice > 0
                            ? Math.round((lumUnitPrice + drvUnitForLum) * 100) / 100
                            : null;
                          onUpdate(item.id, {
                            driverLines: updatedDriverLines,
                            unitPriceDriver: newUnitPrice,
                            ...(newUnitPriceComposite != null ? { unitPrice: newUnitPriceComposite } : {}),
                          });
                        }}
                      />
                      <Pencil className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-500 pointer-events-none" />
                    </div>
                  </div>
                ) : (
                  dl.driverUnitPrice != null && dl.driverUnitPrice > 0 && (
                    <span className="text-muted-foreground">Unit: <span className="font-medium text-foreground">{formatBRL(dl.driverUnitPrice)}</span></span>
                  )
                )}
                {dl.driverTotalPrice != null && dl.driverTotalPrice > 0 && (
                  <span className="font-semibold text-primary">{formatBRL(dl.driverTotalPrice)}</span>
                )}
              </div>
            </div>
          ))}
          {/* Subtotal drivers */}
          {(() => {
            const drvTotal = d.driverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
            return drvTotal > 0 ? (
              <div className="flex justify-end text-xs text-muted-foreground pt-0.5">
                Subtotal drivers: <span className="ml-1 font-semibold text-foreground">{formatBRL(drvTotal)}</span>
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* MKP (Markup) slider — apenas gerentes/admin com dados de custo */}
      {canEditMkp && d.custoCorpoBase != null && d.custoCorpoBase > 0 && (() => {
        const custoCorpo = d.custoCorpoBase!;
        const mkpMin = d.markupMinimoApi ?? 1;
        const mkpPad = d.markupPadraoApi ?? mkpMin;
        const mkpMax = Math.max(mkpPad, mkpMin + 2);
        const currentMkp = d.mkpCustom != null ? d.mkpCustom : mkpPad;
        const previewPrice = Math.round(custoCorpo * currentMkp * 100) / 100;
        return (
          <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-50/30 dark:bg-amber-900/10 p-3 mt-2">
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
                  onUpdate(item.id, { mkpCustom: v, unitPrice: newPrice, totalPrice: Math.round(newPrice * d.qty * 100) / 100 });
                }}
                className="flex-1 accent-amber-600"
              />
              <Input
                type="number"
                min={mkpMin}
                max={mkpMax}
                step={0.01}
                value={currentMkp}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) {
                    const clamped = Math.min(Math.max(v, mkpMin), mkpMax);
                    const newPrice = Math.round(custoCorpo * clamped * 100) / 100;
                    onUpdate(item.id, { mkpCustom: clamped, unitPrice: newPrice, totalPrice: Math.round(newPrice * d.qty * 100) / 100 });
                  }
                }}
                className="w-20 text-center h-8"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Mín: {mkpMin.toFixed(2)}</span>
              <span>Padrão: {mkpPad.toFixed(2)}</span>
              <span>Preço: R$ {previewPrice.toFixed(2).replace('.', ',')}</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">Custo base: R$ {custoCorpo.toFixed(2).replace('.', ',')} · Alteração reflete no campo de preço acima.</p>
          </div>
        );
      })()}

      {/* Campos editáveis do Item Especial */}
      {d.isSpecialItem && (
        <div className="pt-2 border-t space-y-3">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Dados do Item Especial</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Descrição</Label>
              <Input
                value={d.specialDescription ?? d.description ?? ""}
                onChange={e => onUpdate(item.id, { specialDescription: e.target.value, description: e.target.value })}
                placeholder="Descrição do item especial"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Dimensões</Label>
              <Input
                value={d.specialDimensions ?? ""}
                onChange={e => onUpdate(item.id, { specialDimensions: e.target.value })}
                placeholder="ex: 620 x 620 x 100mm"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Potência</Label>
              <Input
                value={d.specialPower ?? ""}
                onChange={e => onUpdate(item.id, { specialPower: e.target.value })}
                placeholder="ex: 36W"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Acionamento / DIM</Label>
              <Input
                value={d.specialDim ?? ""}
                onChange={e => onUpdate(item.id, { specialDim: e.target.value })}
                placeholder="ex: ON/OFF, DALI, DIM"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Tensão</Label>
              <Input
                value={d.specialVoltage ?? ""}
                onChange={e => onUpdate(item.id, { specialVoltage: e.target.value })}
                placeholder="ex: BIVOLT, 220V"
                className="mt-1 h-8 text-sm"
              />
            </div>

          </div>
          <SpecialEquipmentsEditor
            value={d.specialEquipments ?? []}
            onChange={(equips: SpecialEquipment[]) => onUpdate(item.id, { specialEquipments: equips })}
          />
        </div>
      )}

      {/* Custo Unitário e Markup para Item Especial — apenas privilegiados */}
      {d.isSpecialItem && isCostPrivileged && (
        <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800 space-y-3">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Custo / Markup (interno)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Custo Unitário (R$)</Label>
              <Input
                value={d.specialCustoUnitario != null ? String(d.specialCustoUnitario).replace('.', ',') : ''}
                onChange={e => {
                  const val = e.target.value;
                  const custo = parseFloat(val.replace(',', '.'));
                  const preco = d.unitPrice ?? 0;
                  let mkp: number | null = d.specialMarkup ?? null;
                  if (!isNaN(custo) && custo > 0 && preco > 0) {
                    mkp = Math.round((preco / custo) * 10000) / 10000;
                  }
                  onUpdate(item.id, { specialCustoUnitario: !isNaN(custo) && custo > 0 ? custo : null, specialMarkup: mkp });
                }}
                placeholder="ex: 150,00"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Markup (×)</Label>
              <Input
                value={d.specialMarkup != null ? String(d.specialMarkup).replace('.', ',') : ''}
                onChange={e => {
                  const val = e.target.value;
                  const mkp = parseFloat(val.replace(',', '.'));
                  const custo = d.specialCustoUnitario ?? 0;
                  let preco = d.unitPrice ?? 0;
                  if (!isNaN(mkp) && mkp > 0 && custo > 0) {
                    preco = Math.round(custo * mkp * 100) / 100;
                  }
                  onUpdate(item.id, { specialMarkup: !isNaN(mkp) && mkp > 0 ? mkp : null, unitPrice: preco > 0 ? preco : d.unitPrice });
                }}
                placeholder="ex: 2,5"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Preço Venda (R$)</Label>
              <Input
                value={d.unitPrice != null ? String(d.unitPrice).replace('.', ',') : ''}
                onChange={e => {
                  const val = e.target.value;
                  const preco = parseFloat(val.replace(',', '.'));
                  const custo = d.specialCustoUnitario ?? 0;
                  let mkp: number | null = d.specialMarkup ?? null;
                  if (!isNaN(preco) && preco > 0 && custo > 0) {
                    mkp = Math.round((preco / custo) * 10000) / 10000;
                  }
                  const qty = d.qty ?? 1;
                  onUpdate(item.id, { unitPrice: !isNaN(preco) ? preco : d.unitPrice, totalPrice: !isNaN(preco) ? preco * qty : undefined, specialMarkup: mkp });
                }}
                placeholder="ex: 375,00"
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>
          {d.specialCustoUnitario != null && d.specialCustoUnitario > 0 && (d.unitPrice ?? 0) > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Margem: {((1 - d.specialCustoUnitario / (d.unitPrice ?? 1)) * 100).toFixed(1)}%
            </p>
          )}
        </div>
      )}

      {/* Observação no Orçamento e Margem por item */}
      <div className="pt-2 border-t space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Obs. por Item</Label>
          <Input
            value={d.itemObs ?? ""}
            onChange={e => onUpdate(item.id, { itemObs: e.target.value })}
            placeholder="Observação visível na tela e no Excel"
            className="mt-1 h-8 text-sm"
          />
          <div className="flex items-center gap-2 mt-1">
            <Checkbox
              id={`itemObsShowInExcel-${item.id}`}
              checked={!!d.itemObsShowInExcel}
              onCheckedChange={(v) => onUpdate(item.id, { itemObsShowInExcel: Boolean(v) })}
            />
            <label htmlFor={`itemObsShowInExcel-${item.id}`} className="text-xs cursor-pointer">Exibir no Excel do orçamento</label>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Margem por item (%)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number" min={0} max={99} step={0.5}
              className="w-24 h-8 text-sm"
              value={d.itemMarginPercent != null ? String(d.itemMarginPercent) : ""}
              onChange={e => {
                const v = e.target.value;
                onUpdate(item.id, { itemMarginPercent: v ? parseFloat(v) : undefined });
              }}
              placeholder="Global"
            />
            <span className="text-xs text-muted-foreground">% (vazio = usa margem global)</span>
          </div>
        </div>
      </div>

      {/* Campo de foto para Item Especial */}
      {d.isSpecialItem && (
        <div className="space-y-2 pt-1 border-t">
          <Label className="text-xs">Foto do Item Especial</Label>
          {(d.specialPhotoUrl || d.photoUrl) ? (
            <div className="relative w-full">
              <img
                src={d.specialPhotoUrl ?? d.photoUrl ?? ''}
                alt="Foto do item"
                className="w-full max-h-40 object-contain rounded border bg-white"
              />
              <button
                type="button"
                onClick={() => onUpdate(item.id, { specialPhotoUrl: undefined, photoUrl: undefined })}
                className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 hover:bg-destructive/80"
                title="Remover foto"
              >
                <XIcon className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded p-3 text-center">
              <p className="text-xs text-muted-foreground">Nenhuma foto cadastrada</p>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={specialUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) { toast.error('Foto muito grande. Máximo 5MB.'); return; }
                setSpecialUploading(true);
                try {
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const dataUrl = ev.target?.result as string;
                    const base64 = dataUrl.split(',')[1];
                    const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';
                    await onUploadSpecialPhoto(item.id, base64, mimeType, file.name);
                    setSpecialUploading(false);
                  };
                  reader.readAsDataURL(file);
                } catch {
                  toast.error('Erro ao fazer upload da foto.');
                  setSpecialUploading(false);
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" className="gap-2 pointer-events-none" disabled={specialUploading}>
              <Upload className="w-4 h-4" />
              {specialUploading ? 'Enviando...' : (d.specialPhotoUrl || d.photoUrl) ? 'Trocar foto' : 'Adicionar foto'}
            </Button>
          </label>
        </div>
      )}
    </div>
  );
}

// ─── Componente de barra de grupo de pavimento para QuoteDetail (arrastável + expandir/recolher) ──
interface FloorGroupBarQDProps {
  floorId: string;
  displayName: string;
  groupCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  children: React.ReactNode;
}

function FloorGroupBarQD({
  floorId, displayName, groupCount, isCollapsed, onToggleCollapse, children,
}: FloorGroupBarQDProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: floorId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <div className={`flex items-center gap-2 mb-3 rounded-lg px-2 py-1 transition-colors ${
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
        <span className="text-sm font-semibold text-indigo-400 uppercase tracking-wide">{displayName}</span>
        <span className="text-xs text-muted-foreground flex-shrink-0">({groupCount} {groupCount === 1 ? 'item' : 'itens'})</span>
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

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false);
  const [sampleNotes, setSampleNotes] = useState("");
  const [sampleLinkDialogOpen, setSampleLinkDialogOpen] = useState(false);
  const [sampleLinkQuoteNumber, setSampleLinkQuoteNumber] = useState("");
  const [sampleLinkType, setSampleLinkType] = useState<"cobrar" | "diluir" | "associar">("associar");
  const [sampleLinkNotes, setSampleLinkNotes] = useState("");
  const [orderNumberInput, setOrderNumberInput] = useState("");
  const [billingCompanyInput, setBillingCompanyInput] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfPrintOpen, setPdfPrintOpen] = useState(false);

  // Edit (add revision) dialog — full form with all tabs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    clientName: "", clientContact: "", clientPhone: "", clientEmail: "",
    projectName: "", projectRef: "", notes: "",
    seller1Id: "", seller1Name: "", seller2Id: "", seller2Name: "",
    assistantId: "", assistantName: "", versionNotes: "",
    rtPercent: "0", rtDest1: "", rtDest1Active: true, rtDest2: "", rtDest2Active: false, rtDest3: "", rtDest3Active: false,
    marginPercent: "0",
    freteType: "free" as "free" | "paid" | "night" | "consult" | "pickup",
    freteIsento: false, freteLocalidade: "sp" as "sp" | "other",
    freteStateCode: "SP",   // UF do estado de entrega
    freteCity: "",           // Nome da cidade de entrega
    // Novos campos
    deliveryDays: "20",
    commissionPercent: "5",
    commissionPercent2: "0",
    paymentTerm: "30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)",
    destState: "",
    difalEnabled: false,
    difalPercent: "",
    difalValue: "",
    fcpEnabled: false,
    fcpPercent: "",
    fcpValue: "",
    projectNumber: "",
    projectNoProject: false,
    freteValue: "",
    freteState: "",
    freteIncluded: false,
    arquiteto: "",
    lightDesigner: "",
    quoteNumber: "",
    diluicaoValor: "",
    diluicaoDescricao: "",
    discountPercent: "0",
    showDiscount: false,
  });

  // Sellers & Assistants for edit dialog
  const sellersQuery = trpc.sellers.list.useQuery();
  const assistantsQuery = trpc.assistants.list.useQuery();
  const editSellers = sellersQuery.data ?? [];
  const editAssistants = assistantsQuery.data ?? [];

  // IDs do orçamento pendentes de sincronização (populados quando o Dialog abre)
  // Necessário porque sellersQuery/assistantsQuery podem terminar DEPOIS do Dialog abrir
  const [pendingQuoteIds, setPendingQuoteIds] = useState<{
    seller1Id?: number | null;
    seller1Name?: string | null;
    seller2Id?: number | null;
    seller2Name?: string | null;
    assistantId?: number | null;
    assistantName?: string | null;
  } | null>(null);

  // Quando editSellers carrega e há IDs pendentes, re-sincroniza o formulário
  useEffect(() => {
    if (!pendingQuoteIds || !editDialogOpen) return;
    if (editSellers.length > 0) {
      setEditForm(f => {
        const needsSync = (f.seller1Id === "" && !!pendingQuoteIds.seller1Id) ||
                          (f.seller2Id === "" && !!pendingQuoteIds.seller2Id);
        if (!needsSync) return f;
        return {
          ...f,
          seller1Id: f.seller1Id === "" && pendingQuoteIds.seller1Id ? String(pendingQuoteIds.seller1Id) : f.seller1Id,
          seller1Name: f.seller1Id === "" && pendingQuoteIds.seller1Name ? pendingQuoteIds.seller1Name : f.seller1Name,
          seller2Id: f.seller2Id === "" && pendingQuoteIds.seller2Id ? String(pendingQuoteIds.seller2Id) : f.seller2Id,
          seller2Name: f.seller2Id === "" && pendingQuoteIds.seller2Name ? pendingQuoteIds.seller2Name : f.seller2Name,
        };
      });
    }
    if (editAssistants.length > 0) {
      setEditForm(f => {
        if (f.assistantId !== "" || !pendingQuoteIds.assistantId) return f;
        return {
          ...f,
          assistantId: String(pendingQuoteIds.assistantId),
          assistantName: pendingQuoteIds.assistantName ?? f.assistantName,
        };
      });
    }
  }, [editDialogOpen, editSellers, editAssistants, pendingQuoteIds]);

  // Catálogo de produtos para resolver fotos atualizadas (URLs CloudFront expiram)
  const productsQuery = trpc.alfalux.products.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  // Produtos de revenda para resolver fotos frescas (RV00050, RV00051, etc.)
  const revendaProductsQuery = trpc.alfalux.revendaProducts.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  // Catálogo de acessórios para resolver fotos frescas (URLs CloudFront expiram)
  const acessoriosQuery = trpc.alfalux.acessoriosProducts.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  // Componentes (drivers, módulos LED, etc.) para migrar itens legados sem driverLines
  const componentesQuery = trpc.alfalux.componentes.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  /** Mapa código EQ -> precoVenda para busca rápida de preço de driver */
  const componentePriceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of componentesQuery.data?.items ?? []) {
      if (!c.codigo) continue;
      // Preço de venda = custo × markup padrão (sempre calculado, nunca usa precoVenda da API)
      const custo = (c as unknown as { custoDriver?: number | null }).custoDriver ?? null;
      if (custo != null && custo > 0) {
        const mkp = (c as unknown as { mkpPadrao?: number | null }).mkpPadrao ?? 3;
        map.set(c.codigo, Math.round(custo * mkp * 100) / 100);
      }
    }
    return map;
  }, [componentesQuery.data]);
  /** Mapa código EQ -> descrição canônica da API (para normalizar driverModel legado) */
  const componenteDescMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of componentesQuery.data?.items ?? []) {
      if (c.codigo && c.descricao) map.set(c.codigo, c.descricao);
    }
    return map;
  }, [componentesQuery.data]);
  /** Mapa código EQ -> corrente de programação (Migração 6) */
  const componenteCorrenteMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const c of componentesQuery.data?.items ?? []) {
      if (c.codigo) map.set(c.codigo, (c as unknown as { corrente?: string | null }).corrente ?? null);
    }
    return map;
  }, [componentesQuery.data]);
  /** Mapa descrição (UPPER) -> código EQ — busca reversa para Migração 7 */
  const componenteReverseDescMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of componentesQuery.data?.items ?? []) {
      if (c.codigo && c.descricao) map.set(c.descricao.toUpperCase().trim(), c.codigo);
    }
    return map;
  }, [componentesQuery.data]);
  /** Mapa sku -> fotoUrl fresca para substituir URLs expiradas no preview/Excel.
   * Cobre: produtos principais (Downlights, Painéis, Spots, etc.),
   * produtos de revenda (RV*) e acessórios (EQ*, CP*). */
  const productPhotoMap = useMemo(() => {
    const map = new Map<string, string>();
    // Produtos principais
    for (const p of productsQuery.data ?? []) {
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
  }, [productsQuery.data, revendaProductsQuery.data, acessoriosQuery.data]);

  const acessorioPhotoMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of acessoriosQuery.data ?? []) {
      const key = p.codigo ?? p.sku;
      if (key && p.fotoUrl) map.set(key, p.fotoUrl);
    }
    return map;
  }, [acessoriosQuery.data]);

  /** Passa URL externa pelo proxy para evitar bloqueio CORS */
  const proxyPhoto = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith("/manus-storage/") || url.startsWith("/api/image-proxy")) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    return url;
  };

  /** Retorna a URL de foto mais fresca: catálogo > salva no banco > null */
  const resolvePhoto = (sku: string | undefined, savedUrl: string | null): string | null => {
    const raw = sku && productPhotoMap.has(sku) ? productPhotoMap.get(sku)! : savedUrl;
    return proxyPhoto(raw);
  };

  /** Retorna a URL de foto fresca para acessório: catálogo > salva no item > null */
  const resolveAccPhoto = (codigo: string | undefined, savedUrl: string | null | undefined): string | null => {
    const raw = codigo && acessorioPhotoMap.has(codigo) ? acessorioPhotoMap.get(codigo)! : (savedUrl ?? null);
    return proxyPhoto(raw);
  };

  // Delete dialog — triple confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0, 1, 2
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Seleção de empresa para Ficha de Produção
  const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<"ALFALUX" | "LUMINEW">("ALFALUX");
  // Pré-visualização do pedido de fábrica
  const [orderPreviewOpen, setOrderPreviewOpen] = useState(false);
  const [orderPreviewForm, setOrderPreviewForm] = useState<(import("@/lib/orderExcelGenerator").OrderFormData & { prazoStr?: string }) | null>(null);

  // Editação de itens do orçamento
  const [editItemsDialogOpen, setEditItemsDialogOpen] = useState(false);
  // Dialog de edição manual de revisão (somente gestores)
  const [setRevisionDialogOpen, setSetRevisionDialogOpen] = useState(false);
  const [manualRevisionValue, setManualRevisionValue] = useState("");
  // Agrupamento por pavimento no painel de edição
  const [editGroupByFloor, setEditGroupByFloor] = useState(false);
  // Pavimentos recolhidos no editor
  const [editCollapsedFloors, setEditCollapsedFloors] = useState<Set<string>>(new Set());
  const toggleEditFloorCollapse = (floorName: string) => {
    setEditCollapsedFloors(prev => {
      const next = new Set(prev);
      if (next.has(floorName)) next.delete(floorName);
      else next.add(floorName);
      return next;
    });
  };
  // Drag de grupo no editor
  const [editDraggingFloor, setEditDraggingFloor] = useState<string | null>(null);
  // editableItems: cópia dos itens da versão atual para edição
  const [editableItems, setEditableItems] = useState<Array<{
    id: number;
    itemNumber: number;
    itemData: string;
    parsed: CartItemData;
  }>>([]);
  const [editItemsNotes, setEditItemsNotes] = useState("");
  const [editItemsSearch, setEditItemsSearch] = useState("");

  // DnD sensors para reordenação de itens
  const editItemsSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Mutation de reordenação automática ao soltar item no drag and drop
  const reorderItemsMutation = trpc.quotes.reorderItems.useMutation({
    onSuccess: () => {
      // Invalida a query para que currentItems (Excel/pré-visualização) reflita a nova ordem
      utils.quotes.getById.invalidate({ id: Number(id) });
    },
    onError: (err) => toast.error(`Erro ao salvar ordem: ${err.message}`),
  });

  const handleEditItemsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setEditDraggingFloor(null);
    if (!over || active.id === over.id) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Drag de grupo de pavimento: IDs com prefixo "floor:"
    if (activeIdStr.startsWith("floor:") && overIdStr.startsWith("floor:")) {
      const activeFloor = activeIdStr.slice(6);
      const overFloor = overIdStr.slice(6);
      setEditableItems(prev => {
        const activeIds = prev.filter(it => (it.parsed.floorName?.trim() || "Sem Pavimento") === activeFloor).map(it => it.id);
        const overIds = prev.filter(it => (it.parsed.floorName?.trim() || "Sem Pavimento") === overFloor).map(it => it.id);
        if (activeIds.length === 0 || overIds.length === 0) return prev;
        const withoutActive = prev.filter(it => !activeIds.includes(it.id));
        const firstOverIdx = withoutActive.findIndex(it => overIds.includes(it.id));
        if (firstOverIdx === -1) return prev;
        const result = [...withoutActive];
        const activeItems = prev.filter(it => activeIds.includes(it.id));
        result.splice(firstOverIdx, 0, ...activeItems);
        // Auto-save: persiste a nova ordem
        reorderItemsMutation.mutate({
          quoteId: Number(id),
          orderedItemIds: result.map(it => it.id),
        });
        return result;
      });
      return;
    }

    // Drag de item individual
    setEditableItems(prev => {
      const oldIndex = prev.findIndex(it => it.id === Number(active.id));
      const newIndex = prev.findIndex(it => it.id === Number(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;
      const reordered = arrayMove(prev, oldIndex, newIndex);
      // Auto-save: persiste a nova ordem imediatamente após o drag
      reorderItemsMutation.mutate({
        quoteId: Number(id),
        orderedItemIds: reordered.map(it => it.id),
      });
      return reordered;
    });
  };

  /**
   * Reordena o item para a posição global `newSeq` (1-based) e persiste no banco.
   */
  const handleEditReorderToSeq = useCallback((itemId: number, newSeq: number) => {
    setEditableItems(prev => {
      const oldIndex = prev.findIndex(it => it.id === itemId);
      if (oldIndex === -1) return prev;
      const targetIndex = Math.max(0, Math.min(newSeq - 1, prev.length - 1));
      if (oldIndex === targetIndex) return prev;
      const reordered = arrayMove(prev, oldIndex, targetIndex);
      // Auto-save: persiste a nova ordem imediatamente
      reorderItemsMutation.mutate({
        quoteId: Number(id),
        orderedItemIds: reordered.map(it => it.id),
      });
      return reordered;
    });
  }, [id, reorderItemsMutation]);

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
  const setRevisionMutation = trpc.quotes.setRevision.useMutation({
    onSuccess: () => {
      utils.quotes.getById.invalidate({ id: Number(id) });
      setSetRevisionDialogOpen(false);
      toast.success("Revisão atualizada com sucesso!");
    },
    onError: (err) => toast.error(`Erro ao atualizar revisão: ${err.message}`),
  });

  // Verificar se o número de orçamento já existe (excluindo o próprio orçamento atual)
  const checkEditNumberQuery = trpc.quotes.checkNumber.useQuery(
    { quoteNumber: editForm.quoteNumber.trim(), excludeQuoteId: Number(id) },
    { enabled: editDialogOpen && !!editForm.quoteNumber.trim(), staleTime: 2000 }
  );

  // Modal de visualização de revisão histórica
  const [revisionModalVersionId, setRevisionModalVersionId] = useState<number | null>(null);
  const [revisionPreviewOpen, setRevisionPreviewOpen] = useState(false);
  const revisionItemsQuery = trpc.quotes.getRevisionItems.useQuery(
    { quoteId: Number(id), versionId: revisionModalVersionId ?? 0 },
    { enabled: revisionModalVersionId != null && revisionPreviewOpen }
  );

  // Duplicar orçamento
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateClientName, setDuplicateClientName] = useState("");
  const [duplicateClientContact, setDuplicateClientContact] = useState("");
  const [duplicateClientPhone, setDuplicateClientPhone] = useState("");
  const [duplicateClientEmail, setDuplicateClientEmail] = useState("");
  const [duplicateQuoteNumber, setDuplicateQuoteNumber] = useState("");
  const [duplicateNumberError, setDuplicateNumberError] = useState("");
  const [duplicateSellerId, setDuplicateSellerId] = useState<string>("");
  const [duplicateAssistantId, setDuplicateAssistantId] = useState<string>("");
  const uploadSpecialPhotoMutationQD = trpc.upload.specialItemPhoto.useMutation();

  // Verificação de unicidade do número em tempo real
  const checkNumberQuery = trpc.quotes.checkNumber.useQuery(
    { quoteNumber: duplicateQuoteNumber },
    { enabled: duplicateDialogOpen && duplicateQuoteNumber.trim().length > 0 }
  );

  // Sugestão automática de número ao abrir o dialog — usa o vendedor selecionado (ou o original)
  // Nota: data?.quote.seller1Id é usado aqui pois 'quote' ainda não foi declarado neste ponto
  const duplicateEffectiveSellerId = duplicateSellerId
    ? parseInt(duplicateSellerId)
    : (data?.quote.seller1Id ?? undefined);
  const suggestNumberQuery = trpc.quotes.suggestNumber.useQuery(
    { sellerId: duplicateEffectiveSellerId },
    { enabled: duplicateDialogOpen, staleTime: 0 }
  );

  const duplicateMutation = trpc.quotes.duplicate.useMutation({
    onSuccess: (result) => {
      utils.quotes.list.invalidate();
      toast.success(`Orçamento duplicado! Número: ${result.quoteNumber}`);
      setDuplicateDialogOpen(false);
      navigate(`/orcamentos/${result.quoteId}`);
    },
    onError: (err) => toast.error(`Erro ao duplicar: ${err.message}`),
  });

  const deleteMutation = trpc.quotes.delete.useMutation({
    onSuccess: () => {
      utils.quotes.list.invalidate();
      toast.success("Orçamento excluído permanentemente.");
      navigate("/orcamentos");
    },
    onError: (err) => toast.error(`Erro ao excluir: ${err.message}`),
  });

  // ─── Pedido de Amostra ───
  const createSampleMutation = trpc.samples.create.useMutation({
    onSuccess: () => {
      utils.quotes.getById.invalidate({ id: Number(id) });
      toast.success("Orçamento convertido em Pedido de Amostra!");
      setSampleDialogOpen(false);
      setSampleNotes("");
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const sampleQuery = trpc.samples.getByQuoteId.useQuery(
    { quoteId: Number(id) },
    { enabled: !!id }
  );

  const linkSampleMutation = trpc.samples.link.useMutation({
    onSuccess: () => {
      toast.success("Amostra vinculada com sucesso!");
      setSampleLinkDialogOpen(false);
      setSampleLinkQuoteNumber("");
      setSampleLinkNotes("");
      sampleQuery.refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const unlinkSampleMutation = trpc.samples.unlink.useMutation({
    onSuccess: () => {
      toast.success("Vinculação removida.");
      sampleQuery.refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  /**
   * REGRA INEGOCIÁVEL: Este useMemo DEVE ficar antes de qualquer early return
   * para garantir contagem estável de hooks entre renderizações.
   * currentItems com migração de itens legados aplicada:
   * Itens sem driverLines mas com profileSegments+driverCode têm driverLines reconstruidas
   * a partir do preço dos componentes da API. Usado para exibição, Excel e preview.
   */
  const currentItemsMigrated = useMemo(() => {
    const _data = data as typeof data & { items?: typeof data extends { items: infer I } ? I : unknown[]; versions?: unknown[] } | undefined;
    const _items: Array<{ quoteVersionId: string; itemData: string; [key: string]: unknown }> = (_data as { items?: Array<{ quoteVersionId: string; itemData: string; [key: string]: unknown }> } | undefined)?.items ?? [];
    const _versions: Array<{ id: string }> = (_data as { versions?: Array<{ id: string }> } | undefined)?.versions ?? [];
    const _currentVersionId = _versions[0]?.id;
    const _currentItems = _items.filter(i => i.quoteVersionId === _currentVersionId);
    // Mapa sku -> produto da API (para fallback de driver na Migração 3 e resolução de ledModuleCode na Migração 4)
    const productSkuMap = new Map<string, ApiProductDriverInfo>();
    for (const p of (productsQuery.data ?? []) as Array<{ sku: string; name?: string; categoria?: string; driverBivolt?: { model: string; code: string | null } | null; driver220?: { model: string; code: string | null } | null; driverQtdBivolt?: number | null; driverQtd220?: number | null; ledModuleEq2700?: string | null; ledModuleEq3000?: string | null; ledModuleEq4000?: string | null; ledModuleEq5000?: string | null; ledModuleEq?: string | null }>) {
      if (!p.sku) continue;
      const entry: ApiProductDriverInfo = {
        sku: p.sku,
        driver220: p.driver220 ?? null,
        driverBivolt: p.driverBivolt ?? null,
        driverQtd220: p.driverQtd220 ?? null,
        driverQtdBivolt: p.driverQtdBivolt ?? null,
        ledModuleEq2700: p.ledModuleEq2700 ?? null,
        ledModuleEq3000: p.ledModuleEq3000 ?? null,
        ledModuleEq4000: p.ledModuleEq4000 ?? null,
        ledModuleEq5000: p.ledModuleEq5000 ?? null,
        ledModuleEq: p.ledModuleEq ?? null,
        name: p.name,
      };
      // Indexar por sku simples (primeiro registro vence) para compat
      if (!productSkuMap.has(p.sku)) productSkuMap.set(p.sku, entry);
      // Indexar por sku|powerLabel para perfis com múltiplas potências
      if ((p.categoria ?? "").toUpperCase() === "PERFIS" && p.name) {
        const powerLabel = extractPowerLabelFromName(p.name);
        productSkuMap.set(`${p.sku}|${powerLabel}`, entry);
        // Indexar LED BAR por sku|potenciaW/m (ex: "LED BAR U DA|5W/m")
        const potMatch = (p.name ?? "").match(/(\d+)\s*W\/M/i);
        if (potMatch) {
          productSkuMap.set(`${p.sku}|${potMatch[1]}W/m`, entry);
        }
      }
    }
    return _currentItems.map(item => {
      const parsed = parseCartItemData(item.itemData as string);
      if (!parsed) return item;
      // ── Migração 4: Corrigir ledModuleCode nos profileSegments ──
      // Busca o produto correto da API pelo SKU do perfil + potência + stripMethod
      if (parsed.profileSegments && parsed.profileSegments.length > 0 && parsed.power && parsed.cct) {
        const powerNum = parseInt(parsed.power, 10);
        const powerLabel = toPowerLabel(isNaN(powerNum) ? undefined : powerNum, parsed.stripMethod);
        const cctKey = (parsed.cct ?? "").replace("K", "") as "2700" | "3000" | "4000" | "5000";
        if (["2700", "3000", "4000", "5000"].includes(cctKey)) {
          let anyChanged = false;
          const newSegments = parsed.profileSegments.map(seg => {
            const product = productSkuMap.get(`${seg.sku}|${powerLabel}`) ?? productSkuMap.get(seg.sku);
            if (!product) return seg;
            const eqField = `ledModuleEq${cctKey}` as keyof ApiProductDriverInfo;
            const correctEq = (product[eqField] as string | null | undefined) ?? product.ledModuleEq ?? null;
            if (correctEq && correctEq !== seg.ledModuleCode) {
              anyChanged = true;
              return { ...seg, ledModuleCode: correctEq };
            }
            return seg;
          });
          if (anyChanged) {
            const migratedParsed4: CartItemData = { ...parsed, profileSegments: newSegments };
            return { ...item, itemData: JSON.stringify(migratedParsed4) };
          }
        }
      }
      // Normalização 0 + Migração 6: itens que já têm driverLines
      // Normalizar driverModel E enriquecer corrente via componenteCorrenteMap quando ausente
      if (parsed.driverLines && parsed.driverLines.length > 0) {
        let enrichedParsed: CartItemData = parsed;
        // Migração 6: preencher corrente ausente nas driverLines
        const needsCorrenteEnrich = parsed.driverLines.some(
          dl => dl.driverCode && (dl.corrente == null || dl.corrente === "") && componenteCorrenteMap.has(dl.driverCode) && componenteCorrenteMap.get(dl.driverCode) != null
        );
        if (needsCorrenteEnrich) {
          const enrichedLines = parsed.driverLines.map(dl => {
            if (!dl.driverCode || (dl.corrente != null && dl.corrente !== "")) return dl;
            const corrente = componenteCorrenteMap.get(dl.driverCode);
            if (corrente == null) return dl;
            return { ...dl, corrente };
          });
          enrichedParsed = { ...enrichedParsed, driverLines: enrichedLines };
        }
        // Migração 6: preencher corrente ausente nos profileSegments
        if (enrichedParsed.profileSegments && enrichedParsed.profileSegments.length > 0) {
          const needsSegCorrenteEnrich = enrichedParsed.profileSegments.some(
            seg => seg.driverCode && (seg.corrente == null || seg.corrente === "") && componenteCorrenteMap.has(seg.driverCode) && componenteCorrenteMap.get(seg.driverCode) != null
          );
          if (needsSegCorrenteEnrich) {
            const enrichedSegs = enrichedParsed.profileSegments.map(seg => {
              if (!seg.driverCode || (seg.corrente != null && seg.corrente !== "")) return seg;
              const corrente = componenteCorrenteMap.get(seg.driverCode);
              if (corrente == null) return seg;
              return { ...seg, corrente };
            });
            enrichedParsed = { ...enrichedParsed, profileSegments: enrichedSegs };
          }
        }
        // Migração 7: resolver moduloLedCode via busca reversa no componenteDescMap
        if (!enrichedParsed.moduloLedCode && enrichedParsed.moduloLed) {
          // Remover parênteses e conteúdo entre eles (ex: "(EQ00121)" ou "(PT001050)")
          const moduloBase = enrichedParsed.moduloLed.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
          // Remover prefixos comuns como "MÓDULO LED ", "MODULO LED ", "MÓDULO "
          const stripPrefixes = (s: string) => s
            .replace(/^MÓDULO LED\s+/i, "")
            .replace(/^MODULO LED\s+/i, "")
            .replace(/^MÓDULO\s+/i, "")
            .replace(/^MODULO\s+/i, "")
            .trim();
          // Pegar apenas a primeira parte (antes de " + ") para itens compostos
          const firstPart = moduloBase.split(" + ")[0].trim();
          const firstPartStripped = stripPrefixes(firstPart);
          const resolvedEq =
            componenteReverseDescMap.get(moduloBase.toUpperCase()) ??
            componenteReverseDescMap.get(firstPart.toUpperCase()) ??
            componenteReverseDescMap.get(firstPartStripped.toUpperCase()) ??
            componenteReverseDescMap.get(enrichedParsed.moduloLed.toUpperCase().trim()) ??
            null;
          if (resolvedEq) {
            enrichedParsed = { ...enrichedParsed, moduloLedCode: resolvedEq };
          }
        }
        // Normalização 0: normalizar driverModel
        const needsNorm = enrichedParsed.driverLines!.some(dl =>
          dl.driverCode && componenteDescMap.has(dl.driverCode) &&
          componenteDescMap.get(dl.driverCode) !== dl.driverModel
        );
        if (needsNorm || enrichedParsed !== parsed) {
          const normalizedLines = enrichedParsed.driverLines!.map(dl => {
            if (!dl.driverCode) return dl;
            const canonicalModel = componenteDescMap.get(dl.driverCode);
            if (!canonicalModel || canonicalModel === dl.driverModel) return dl;
            return { ...dl, driverModel: canonicalModel };
          });
          const normalizedParsed: CartItemData = { ...enrichedParsed, driverLines: normalizedLines };
          return { ...item, itemData: JSON.stringify(normalizedParsed) };
        }
      }
      if ((!parsed.driverLines || parsed.driverLines.length === 0) &&
          parsed.profileSegments && parsed.profileSegments.length > 0 &&
          parsed.profileSegments.some(seg => seg.driverCode)) {
        const itemQty = parsed.qty ?? 1; // quantidade de lumárias (ex: 12)
        const drvMap = new Map<string, { driverCode: string; driverModel: string; qtyPerLuminaria: number }>();
        for (const seg of parsed.profileSegments) {
          if (!seg.driverCode) continue;
          const key = seg.driverCode;
          // qtyPerSeg = drivers por lumária (não multiplicar por itemQty aqui)
          const qtyPerSeg = (seg.driverQtyPerPiece ?? 1) * (seg.qty ?? 1);
          if (drvMap.has(key)) {
            drvMap.get(key)!.qtyPerLuminaria += qtyPerSeg;
          } else {
            drvMap.set(key, { driverCode: seg.driverCode, driverModel: seg.driverModel ?? seg.driverCode, qtyPerLuminaria: qtyPerSeg });
          }
        }
        const driverEntries = Array.from(drvMap.values());
        let totalDriverCost = 0;
        const driverLines: import("@/lib/cartTypes").DriverLine[] = driverEntries.map(drv => {
          // totalQty = drivers por lumária × quantidade de lumárias
          const totalQty = drv.qtyPerLuminaria * itemQty;
          const unitPrice = componentePriceMap.get(drv.driverCode) ?? null;
          const totalPrice = unitPrice != null ? unitPrice * totalQty : null;
          if (totalPrice != null) totalDriverCost += totalPrice;
          const corrente = componenteCorrenteMap.get(drv.driverCode) ?? null;
          return { driverCode: drv.driverCode, driverModel: componenteDescMap.get(drv.driverCode) ?? drv.driverModel, driverQty: totalQty, driverUnitPrice: unitPrice, driverTotalPrice: totalPrice, ...(corrente ? { corrente } : {}) };
        });
        const totalPrice = parsed.totalPrice ?? 0;
        // Fallback de preço: se não temos custo de driver da API, derivar preço da lumária do totalPrice
        const priceWithoutDriver = totalDriverCost > 0
          ? totalPrice - totalDriverCost
          : (parsed.priceWithoutDriver ?? (totalPrice > 0 ? totalPrice - driverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0) : null));
        const qty = itemQty;
        const unitPriceLuminaria = priceWithoutDriver != null && qty > 0 ? priceWithoutDriver / qty : (parsed.unitPriceLuminaria ?? null);
        const luminariaHasApiPrice = totalDriverCost > 0 || (parsed.unitPriceLuminaria != null);
        const migratedParsed: CartItemData = { ...parsed, driverLines, priceWithoutDriver: priceWithoutDriver ?? parsed.priceWithoutDriver, unitPriceLuminaria: unitPriceLuminaria ?? parsed.unitPriceLuminaria, luminariaHasApiPrice };
        return { ...item, itemData: JSON.stringify(migratedParsed) };
      }
      // Migração 2: itens com accessories contendo drivers (EQ*) sem unitPrice
      // Ex: itens de revenda/especial como LL4, LL5, LL8, LL9, LL15, LL19
      const accessories = (parsed.accessories as import("@/lib/cartTypes").LinkedAccessory[] | undefined) ?? [];
      const driverAccessories = accessories.filter(acc =>
        acc.codigo && (acc.unitPrice == null || acc.unitPrice === 0) &&
        componentePriceMap.has(acc.codigo)
      );
      if (driverAccessories.length > 0 && (!parsed.driverLines || parsed.driverLines.length === 0)) {
        const itemQty = parsed.qty ?? 1;
        const driverLines: import("@/lib/cartTypes").DriverLine[] = driverAccessories.map(acc => {
          const unitPrice = componentePriceMap.get(acc.codigo)!;
          const totalQty = (acc.qty ?? 1) * itemQty;
          const totalPrice = unitPrice * totalQty;
          const corrente = componenteCorrenteMap.get(acc.codigo) ?? null;
          return {
            driverCode: acc.codigo,
            driverModel: componenteDescMap.get(acc.codigo) ?? acc.descricao,
            driverQty: totalQty,
            driverUnitPrice: unitPrice,
            driverTotalPrice: totalPrice,
            ...(corrente ? { corrente } : {}),
          };
        });
        const totalDriverCost = driverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
        const totalPrice = parsed.totalPrice ?? 0;
        const priceWithoutDriver = totalPrice > 0 ? totalPrice - totalDriverCost : null;
        const unitPriceLuminaria = priceWithoutDriver != null && itemQty > 0 ? priceWithoutDriver / itemQty : (parsed.unitPriceLuminaria ?? null);
        const migratedParsed: CartItemData = {
          ...parsed,
          driverLines,
          priceWithoutDriver: priceWithoutDriver ?? parsed.priceWithoutDriver,
          unitPriceLuminaria: unitPriceLuminaria ?? parsed.unitPriceLuminaria,
          luminariaHasApiPrice: true,
        };
        return { ...item, itemData: JSON.stringify(migratedParsed) };
      }
      // Migração 3: itens antigos de downlight/painel/spot/arandela/decorativa/balizador
      // que têm campo `drivers` (string) mas não têm `driverLines`.
      // Formatos: "Nx DRIVER MODELO (EQxxxxx)" ou "DRIVER MODELO (EQxxxxx)"
      if ((!parsed.driverLines || parsed.driverLines.length === 0) && parsed.drivers && parsed.drivers.trim().length > 0) {
        const driversStr = parsed.drivers.trim();
        // Extrair código EQ entre parênteses
        const eqMatch = driversStr.match(/\(([A-Z]{2}\d{4,})\)/i);
        const eqCode = eqMatch ? eqMatch[1].toUpperCase() : null;
        // Extrair quantidade (ex: "10x" no início)
        const qtyMatch = driversStr.match(/^(\d+)x?\s/i);
        const drvQtyPerUnit = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
        // Extrair modelo: remover prefixo de quantidade, "DRIVER " e código EQ
        let driverModel = driversStr
          .replace(/^\d+x?\s*/i, '')   // remover prefixo "Nx "
          .replace(/\s*\([A-Z]{2}\d{4,}\)\s*$/i, '') // remover "(EQxxxxx)" no final
          .replace(/^DRIVER\s*/i, '')  // remover prefixo "DRIVER "
          .trim();
        if (!driverModel && eqCode) driverModel = eqCode;
        // Sempre preferir a descrição canônica da API sobre a string legada
        if (eqCode && componenteDescMap.has(eqCode)) driverModel = componenteDescMap.get(eqCode)!;
        // Fallback: se não há eqCode extraível (ex: "1x DRIVER"), buscar da API pelo SKU
        const resolvedEqCode = eqCode ?? (() => {
          const apiProd = parsed.sku ? productSkuMap.get(parsed.sku) : null;
          if (!apiProd) return null;
          const drvInfo = apiProd.driverBivolt ?? apiProd.driver220;
          return drvInfo?.code ?? null;
        })();
        const resolvedDrvQtyPerUnit = eqCode ? drvQtyPerUnit : (() => {
          const apiProd = parsed.sku ? productSkuMap.get(parsed.sku) : null;
          if (!apiProd) return 1;
          return apiProd.driverQtdBivolt ?? apiProd.driverQtd220 ?? 1;
        })();
        const resolvedDriverModel = eqCode ? driverModel : (() => {
          const apiProd = parsed.sku ? productSkuMap.get(parsed.sku) : null;
          if (!apiProd) return driverModel;
          const drvInfo = apiProd.driverBivolt ?? apiProd.driver220;
          if (!drvInfo) return driverModel;
          const code = drvInfo.code;
          if (code && componenteDescMap.has(code)) return componenteDescMap.get(code)!;
          return drvInfo.model ?? driverModel;
        })();
        if (resolvedEqCode) {
          const itemQty = parsed.qty ?? 1;
          const totalQty = resolvedDrvQtyPerUnit * itemQty;
          const unitPrice = componentePriceMap.get(resolvedEqCode) ?? null;
          const totalPrice = unitPrice != null ? unitPrice * totalQty : null;
          const corrente3 = componenteCorrenteMap.get(resolvedEqCode) ?? null;
          const driverLines: import("@/lib/cartTypes").DriverLine[] = [{
            driverCode: resolvedEqCode,
            driverModel: resolvedDriverModel,
            driverQty: totalQty,
            driverUnitPrice: unitPrice,
            driverTotalPrice: totalPrice,
            ...(corrente3 ? { corrente: corrente3 } : {}),
          }];
          const totalDriverCost = totalPrice ?? 0;
          const totalPriceItem = parsed.totalPrice ?? 0;
          const priceWithoutDriver = totalDriverCost > 0 && totalPriceItem > 0
            ? totalPriceItem - totalDriverCost
            : (parsed.priceWithoutDriver ?? null);
          const unitPriceLuminaria = priceWithoutDriver != null && itemQty > 0
            ? priceWithoutDriver / itemQty
            : (parsed.unitPriceLuminaria ?? null);
          const migratedParsed: CartItemData = {
            ...parsed,
            driverLines,
            priceWithoutDriver: priceWithoutDriver ?? parsed.priceWithoutDriver,
            unitPriceLuminaria: unitPriceLuminaria ?? parsed.unitPriceLuminaria,
            luminariaHasApiPrice: unitPrice != null,
          };
          return { ...item, itemData: JSON.stringify(migratedParsed) };
        }
      }
      return item;
    });
  }, [data, componentePriceMap, componenteDescMap, componenteCorrenteMap, componenteReverseDescMap, productsQuery.data]);

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

  const { quote, versions, items, canEdit, canSeeCommission = false, canEditCommission = false } = data as typeof data & { canSeeCommission?: boolean; canEditCommission?: boolean };
  const st = STATUS_LABELS[quote.status] ?? STATUS_LABELS.open;

  // Itens da versão mais recente
  const currentVersionId = versions[0]?.id;
  const currentItems = items.filter(i => i.quoteVersionId === currentVersionId);

  // RT/Margem calc for edit form
  // Para itens com driverLines, calcular total correto (luminaria + drivers)
  const editTotalBase = currentItems.reduce((s, i) => {
    const d = parseCartItemData(i.itemData);
    if (!d) return s;
    if (d.driverLines && d.driverLines.length > 0) {
      const lumT = (() => {
        if (d.priceWithoutDriver != null) {
          const isUnitOnly = d.unitPriceLuminaria != null &&
            Math.abs(d.priceWithoutDriver - d.unitPriceLuminaria) < 0.02 &&
            (d.qty ?? 1) > 1;
          return isUnitOnly ? d.unitPriceLuminaria! * (d.qty ?? 1) : d.priceWithoutDriver;
        }
        // Fallback: derivar preço da lumária de (totalPrice - driversTotalPrice)
        const _drvTotalEB = d.driverLines!.reduce((sd, dl) => sd + (dl.driverTotalPrice ?? 0), 0);
        if (d.unitPriceLuminaria == null && d.totalPrice != null && d.totalPrice > 0) {
          return Math.max(0, d.totalPrice - _drvTotalEB);
        }
        const unitLum = d.unitPriceLuminaria ?? null;
        return unitLum != null ? unitLum * (d.qty ?? 1) : (d.totalPrice ?? 0);
      })();
      const drvT = d.driverLines.reduce((sd, dl) => {
        const stored = dl.driverTotalPrice;
        if (stored != null && stored > 0) return sd + stored;
        // fallback: recalcular com effectiveQty
        const iqty = d.qty ?? 1;
        const storedQty = dl.driverQty ?? 1;
        const effectiveQty = storedQty <= 1 ? iqty : storedQty;
        return sd + Math.round((dl.driverUnitPrice ?? 0) * effectiveQty * 100) / 100;
      }, 0);
      return s + applyItemMarginQD(lumT + drvT, d.itemMarginPercent);
    }
    return s + applyItemMarginQD(d.totalPrice ?? 0, d.itemMarginPercent);
  }, 0);
  const editRtPct = Math.min(Math.max(parseFloat(editForm.rtPercent || "0") / 100, 0), 0.99);
  const editMarginPct = Math.min(Math.max(parseFloat(editForm.marginPercent || "0") / 100, 0), 0.99);
  const editDiscountPct = Math.min(Math.max(parseFloat(editForm.discountPercent || "0") / 100, 0), 0.99);
  const editTotalComRT = editRtPct > 0 ? editTotalBase / (1 - editRtPct) : editTotalBase;
  const editTotalComMargem = editMarginPct > 0 ? editTotalComRT / (1 - editMarginPct) : editTotalComRT;
  const editTotalFinal = editDiscountPct > 0 ? editTotalComMargem * (1 - editDiscountPct) : editTotalComMargem;

  // Recalcular o total do orçamento dinamicamente (igual ao PDF/Preview/Excel)
  // Usando os campos do quote (não do editForm) para o card de resumo
  const _hdrRtPct = quote.rtPercent ? Math.min(Math.max(parseFloat(String(quote.rtPercent)), 0), 0.99) : 0;
  const _hdrMarginPct = quote.marginPercent ? Math.min(Math.max(parseFloat(String(quote.marginPercent)), 0), 0.99) : 0;
  const _hdrFreteIncluded = !!(quote as any).freteIncluded;
  const _hdrFreteValue = (quote as any).freteValue ? parseFloat(String((quote as any).freteValue)) : 0;
  const _hdrFreteParaDiluir = (_hdrFreteIncluded && _hdrFreteValue > 0) ? _hdrFreteValue : 0;
  const _hdrDiluicao = (quote as any).diluicaoValor ? parseFloat(String((quote as any).diluicaoValor)) : 0;
  // Base dos itens (sem RT/margem global, mas com margem individual)
  const _hdrTotalBase = currentItems.reduce((s, i) => {
    const d = parseCartItemData(i.itemData);
    if (!d || d.category === 'Não Orçamos') return s;
    if (d.driverLines && d.driverLines.length > 0) {
      const lumT = (() => {
        if (d.priceWithoutDriver != null) {
          const isUnitOnly = d.unitPriceLuminaria != null &&
            Math.abs(d.priceWithoutDriver - d.unitPriceLuminaria) < 0.02 && (d.qty ?? 1) > 1;
          return isUnitOnly ? d.unitPriceLuminaria! * (d.qty ?? 1) : d.priceWithoutDriver;
        }
        const _drvT = d.driverLines!.reduce((sd, dl) => sd + (dl.driverTotalPrice ?? 0), 0);
        if (d.unitPriceLuminaria == null && d.totalPrice != null && d.totalPrice > 0) return Math.max(0, d.totalPrice - _drvT);
        const unitLum = d.unitPriceLuminaria ?? null;
        return unitLum != null ? unitLum * (d.qty ?? 1) : (d.totalPrice ?? 0);
      })();
      const drvT = d.driverLines.reduce((sd, dl) => {
        if (dl.driverTotalPrice != null && dl.driverTotalPrice > 0) return sd + dl.driverTotalPrice;
        const iqty = d.qty ?? 1;
        const storedQty = dl.driverQty ?? 1;
        const effectiveQty = storedQty <= 1 ? iqty : storedQty;
        return sd + Math.round((dl.driverUnitPrice ?? 0) * effectiveQty * 100) / 100;
      }, 0);
      return s + applyItemMarginQD(lumT + drvT, d.itemMarginPercent);
    }
    return s + applyItemMarginQD(d.totalPrice ?? 0, d.itemMarginPercent);
  }, 0);
  const _hdrDiscountPct = (quote as any).discountPercent ? Math.min(Math.max(parseFloat(String((quote as any).discountPercent)), 0), 0.99) : 0;
  // Aplicar RT + margem sobre (base + frete diluído + diluição)
  const _hdrTotalComRT = _hdrRtPct > 0 ? (_hdrTotalBase + _hdrFreteParaDiluir + _hdrDiluicao) / (1 - _hdrRtPct) : (_hdrTotalBase + _hdrFreteParaDiluir + _hdrDiluicao);
  const _hdrTotalComMargem = _hdrMarginPct > 0 ? _hdrTotalComRT / (1 - _hdrMarginPct) : _hdrTotalComRT;
  const _hdrTotalFinal = _hdrDiscountPct > 0 ? _hdrTotalComMargem * (1 - _hdrDiscountPct) : _hdrTotalComMargem;
  // Frete separado (não diluído) entra na base do DIFAL
  const _hdrFreteParaImposto = _hdrFreteIncluded ? 0 : (_hdrFreteValue > 0 ? _hdrFreteValue : 0);
  const _hdrBaseParaDifal = _hdrTotalFinal + _hdrFreteParaImposto;
  // DIFAL/FCP
  const _hdrStateInfo = quote.destState ? getStateInfo(quote.destState) : undefined;
  const _hdrCombinedRate = _hdrStateInfo ? _hdrStateInfo.combined : 0;
  const _hdrDifalAplicavel = !!_hdrStateInfo && _hdrCombinedRate > 0;
  const _hdrTotalComDifal = (quote.difalEnabled && _hdrDifalAplicavel)
    ? _hdrBaseParaDifal / (1 - _hdrCombinedRate / 100)
    : _hdrBaseParaDifal;
  // Total final recalculado (igual ao PDF/Preview/Excel)
  const totalRecalculado = _hdrTotalComDifal;

  const handleGenerateQuote = async () => {
    setIsGenerating(true);
    try {
      // Baixar Excel sem criar nova revisão — a revisão só é criada ao Salvar Orçamento
      // Buscar telefones dos vendedores pelo ID no catálogo
      const s1 = quote.seller1Id ? editSellers.find(s => s.id === quote.seller1Id) : undefined;
      const s2 = quote.seller2Id ? editSellers.find(s => s.id === quote.seller2Id) : undefined;
      await generateQuoteExcel(
        currentItemsMigrated.map(i => parseCartItemData(i.itemData)).filter((d): d is CartItemData => d !== null),
        {
          cliente: quote.clientName,
          contato: quote.clientContact ?? "",
          tel: quote.clientPhone ?? "",
          email: quote.clientEmail ?? "",
          obra: quote.projectName ?? "",
          referencia: quote.projectRef ?? "",
          numero: quote.quoteNumber,
          data: toBrasiliaDate(quote.updatedAt ?? quote.createdAt),
          arquiteto: (quote as any).arquiteto ?? undefined,
          lightDesigner: (quote as any).lightDesigner ?? undefined,
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
          discountPercent: (quote as any).discountPercent ? parseFloat(String((quote as any).discountPercent)) : undefined,
          showDiscount: !!(quote as any).showDiscount,
          freteType: (quote.freteType as "free" | "paid" | "night" | "consult" | "pickup") ?? "free",
          freteIsento: quote.freteIsento ?? false,
          freteLocalidade: (quote.freteLocalidade as "sp" | "other") ?? "sp",
          freteCity: (quote as any).freteCity ?? undefined,
          freteState: (quote as any).freteState ?? undefined,
          freteValue: (quote as any).freteValue ? parseFloat(String((quote as any).freteValue)) : undefined,
          freteIncluded: (quote as any).freteIncluded ?? false,
          diluicaoValor: (quote as any).diluicaoValor ? parseFloat(String((quote as any).diluicaoValor)) : undefined,
          // O número de revisão do Excel é o revisionCount do banco (controlado pela Vivian)
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
          quoteCreatedAt: quote.createdAt ? new Date(quote.createdAt).toISOString() : undefined,
        }
      );
      toast.success("Orçamento Excel gerado!");
    } catch (err) {
      toast.error("Erro ao gerar orçamento.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePdf = () => {
    setPdfPrintOpen(true);
  };

  /** Abre o modal de pré-visualização com os dados do pedido de fábrica */
  const handleOpenOrderPreview = async (empresa: "ALFALUX" | "LUMINEW") => {
    if (orderNumberInput.length !== 6) { toast.error("Número do pedido deve ter exatamente 6 dígitos."); return; }
    if (!billingCompanyInput) { toast.error("Selecione a empresa faturadora."); return; }
    setEmpresaDialogOpen(false);
    setIsGenerating(true);
    try {
      const deliveryDays = quote.deliveryDays ?? 20;
      const approvedAtIso = quote.approvedAt ? new Date(quote.approvedAt).toISOString() : new Date().toISOString();
      const { displayDays, deliveryDateStr } = await calcDeliveryDate(approvedAtIso, deliveryDays);
      const prazoStr = `${displayDays} dias úteis → ${deliveryDateStr}`;
      setOrderPreviewForm({
        clientName: quote.clientName,
        projectName: quote.projectName ?? "",
        quoteNumber: quote.quoteNumber,
        orderNumber: (quote as any).orderNumber || undefined,
        vendorName: quote.vendorName ?? "",
        date: toBrasiliaDate(quote.approvedAt ?? quote.createdAt),
        empresa,
        deliveryDays,
        approvedAt: approvedAtIso,
        precomputedDisplayDays: displayDays,
        precomputedDeliveryDate: deliveryDateStr,
        prazoStr,
      });
      setOrderPreviewOpen(true);
    } catch {
      toast.error("Erro ao preparar pré-visualização.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateOrder = async (empresa: "ALFALUX" | "LUMINEW") => {
    if (orderNumberInput.length !== 6) { toast.error("Número do pedido deve ter exatamente 6 dígitos."); return; }
    if (!billingCompanyInput) { toast.error("Selecione a empresa faturadora."); return; }
    // Salvar número do pedido e empresa faturadora no orçamento
    updateStatusMutation.mutate({
      id: Number(id),
      status: quote.status as "open" | "approved" | "lost" | "cancelled" | "invoiced",
      orderNumber: orderNumberInput,
      billingCompany: billingCompanyInput as "alfalux" | "primelux" | "decada" | "primelase" | "luminew",
    });
    setIsGenerating(true);
    setEmpresaDialogOpen(false);
    try {
      // Calcular prazo com feriados nacionais antes de gerar o Excel
      const deliveryDays = quote.deliveryDays ?? 20;
      const approvedAtIso = quote.approvedAt ? new Date(quote.approvedAt).toISOString() : new Date().toISOString();
      const { displayDays, deliveryDateStr } = await calcDeliveryDate(approvedAtIso, deliveryDays);

      await generateOrderExcel(
        currentItemsMigrated.map(i => parseCartItemData(i.itemData)).filter((d): d is CartItemData => d !== null),
        {
          clientName: quote.clientName,
          projectName: quote.projectName ?? "",
          quoteNumber: quote.quoteNumber,
          // Se há número de pedido registrado, usar no campo PEDIDO da ficha de produção
          orderNumber: orderNumberInput || (quote as any).orderNumber || undefined,
          vendorName: quote.vendorName ?? "",
          date: toBrasiliaDate(quote.approvedAt ?? quote.createdAt),
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
  // Mapeia cada quoteVersion para o número de revisão exibido (RV0 = mais antigo, RV{n-1} = mais recente)
  // versions está ordenado por version DESC (mais recente primeiro)
  const versionToRV = (vId: number): number => {
    const idx = versions.findIndex(vv => vv.id === vId);
    if (idx === -1) return 0;
    return versions.length - 1 - idx;
  };

  /** Gera Excel para uma revisão histórica específica */
  const handleGenerateRevisionExcel = async (v: typeof versions[0], revItems: { itemData: string }[]) => {
    try {
      const snap = (() => { try { return JSON.parse(v.headerSnapshot ?? '{}'); } catch { return {}; } })();
      const s1 = quote.seller1Id ? editSellers.find(s => s.id === quote.seller1Id) : undefined;
      const s2 = quote.seller2Id ? editSellers.find(s => s.id === quote.seller2Id) : undefined;
      // O número de revisão: versão atual usa quote.revisionCount (controlado manualmente pela Vivian)
      // Versões anteriores (snapshots) usam a posição na lista
      const isCurrentVer = v.version === quote.currentVersion;
      const revCount = isCurrentVer ? (quote.revisionCount ?? 0) : versionToRV(v.id);
      await generateQuoteExcel(
        revItems.map(i => parseCartItemData(i.itemData)).filter((d): d is CartItemData => d !== null),
        {
          cliente: snap.clientName ?? quote.clientName,
          contato: snap.clientContact ?? quote.clientContact ?? "",
          tel: snap.clientPhone ?? quote.clientPhone ?? "",
          email: snap.clientEmail ?? quote.clientEmail ?? "",
          obra: snap.projectName ?? quote.projectName ?? "",
          referencia: snap.projectRef ?? quote.projectRef ?? "",
          numero: quote.quoteNumber,
          data: toBrasiliaDate(v.createdAt),
          arquiteto: snap.arquiteto ?? (quote as any).arquiteto ?? undefined,
          lightDesigner: snap.lightDesigner ?? (quote as any).lightDesigner ?? undefined,
          seller1Name: snap.vendorName ?? quote.seller1Name ?? undefined,
          seller1Phone: s1?.phone ?? undefined,
          seller2Name: quote.seller2Name ?? undefined,
          seller2Phone: s2?.phone ?? undefined,
          assistantName: snap.assistantName ?? quote.assistantName ?? undefined,
          rtPercent: quote.rtPercent ? parseFloat(String(quote.rtPercent)) : undefined,
          rtDest1: quote.rtDest1 ?? undefined,
          rtDest1Active: quote.rtDest1Active ?? false,
          rtDest2: quote.rtDest2 ?? undefined,
          rtDest2Active: quote.rtDest2Active ?? false,
          rtDest3: quote.rtDest3 ?? undefined,
          rtDest3Active: quote.rtDest3Active ?? false,
          marginPercent: quote.marginPercent ? parseFloat(String(quote.marginPercent)) : undefined,
          discountPercent: (quote as any).discountPercent ? parseFloat(String((quote as any).discountPercent)) : undefined,
          showDiscount: !!(quote as any).showDiscount,
          freteType: (quote.freteType as "free" | "paid" | "night" | "consult" | "pickup") ?? "free",
          freteIsento: quote.freteIsento ?? false,
          freteLocalidade: (quote.freteLocalidade as "sp" | "other") ?? "sp",
          freteCity: (quote as any).freteCity ?? undefined,
          freteState: (quote as any).freteState ?? undefined,
          freteValue: (quote as any).freteValue ? parseFloat(String((quote as any).freteValue)) : undefined,
          freteIncluded: (quote as any).freteIncluded ?? false,
          diluicaoValor: (quote as any).diluicaoValor ? parseFloat(String((quote as any).diluicaoValor)) : undefined,
          revisionCount: revCount,
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
          quoteCreatedAt: quote.createdAt ? new Date(quote.createdAt).toISOString() : undefined,
        }
      );
      toast.success(`Excel da RV${revCount} gerado!`);
    } catch (err) {
      toast.error("Erro ao gerar Excel da revisão.");
    }
  };

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
              {quote.clientContact && <p className="flex items-center gap-1"><User className="w-3.5 h-3.5 shrink-0" />{quote.clientContact}</p>}
              {quote.clientPhone && <p className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 shrink-0" />{quote.clientPhone}</p>}
              {quote.clientEmail && <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" />{quote.clientEmail}</p>}
              {quote.projectName && <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" />Obra: <span className="font-medium">{quote.projectName}</span></p>}
              {quote.projectRef && <p className="flex items-center gap-1"><Bookmark className="w-3.5 h-3.5 shrink-0" />Ref: {quote.projectRef}</p>}
              {(quote as any).projectNumber && <p className="flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5 shrink-0" />Nº Projeto: <span className="font-medium">{(quote as any).projectNumber}</span></p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Dados Internos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {/* Vendedor 1 */}
              {quote.vendorName && (
                <p className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 shrink-0" />Vendedor: <span className="font-medium">{quote.vendorName}</span></p>
              )}
              {/* Vendedor 2 (quando houver) */}
              {(quote as any).seller2Name && (
                <p className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 shrink-0" />2º Vendedor: <span className="font-medium">{(quote as any).seller2Name}</span></p>
              )}
              {quote.assistantName && <p className="flex items-center gap-1"><Pencil className="w-3.5 h-3.5 shrink-0" />Assistente: <span className="font-medium">{quote.assistantName}</span></p>}
              <p className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 shrink-0" />Criado em: {toBrasiliaDate(quote.createdAt)}</p>
              <p className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 shrink-0" />Versão: <span className="font-bold font-mono">RV{quote.revisionCount ?? 0}</span></p>
              {quote.approvedAt && (
                <p className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />Aprovado em: {toBrasiliaDate(quote.approvedAt)}
                </p>
              )}
              {(quote as any).invoicedAt && (
                <p className="text-purple-600 dark:text-purple-400 font-medium">
                  <Receipt className="w-3.5 h-3.5 inline mr-1" />Faturado em: {toBrasiliaDate((quote as any).invoicedAt)}
                </p>
              )}
              {/* Número do pedido e empresa faturadora */}
              {(quote as any).orderNumber && (
                <p className="text-green-700 dark:text-green-400 font-semibold">
                  <ClipboardList className="w-3.5 h-3.5 inline mr-1" />Pedido: <span className="font-mono">{(quote as any).orderNumber}</span>
                  {(quote as any).billingCompany && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({{
                        alfalux: 'Alfalux',
                        primelux: 'Prime Lux',
                        decada: 'Década',
                        primelase: 'Prime Lase',
                        luminew: 'Luminew',
                      }[(quote as any).billingCompany as string] ?? (quote as any).billingCompany})
                    </span>
                  )}
                </p>
              )}
              {/* Novos campos comerciais */}
              {quote.deliveryDays != null && (
                <p>🚚 Prazo: <span className="font-medium">{quote.deliveryDays} dias úteis</span></p>
              )}
              {quote.paymentTerm && (
                <p>💳 Pagamento: <span className="font-medium">{quote.paymentTerm}</span></p>
              )}
              {/* RT, Margem e Frete — sempre visível */}
              {(() => {
                const rtPct = quote.rtPercent ? parseFloat(String(quote.rtPercent)) : 0;
                const marginPct = quote.marginPercent ? parseFloat(String(quote.marginPercent)) : 0;
                const freteType = (quote as any).freteType ?? 'free';
                const freteIsento = (quote as any).freteIsento ?? false;
                const freteValue = (quote as any).freteValue ? parseFloat(String((quote as any).freteValue)) : 0;
                const freteIncluded = (quote as any).freteIncluded ?? false;
                const freteState = (quote as any).freteState ?? '';
                const freteCity = (quote as any).freteCity ?? '';

                // Monta label do frete — simplificado
                let freteLabel = '';
                if (freteIsento) {
                  freteLabel = 'Isento';
                } else if (freteType === 'pickup') {
                  freteLabel = 'Retirada em fábrica';
                } else if (freteIncluded && freteValue > 0) {
                  freteLabel = `Diluído nos produtos: ${formatBRL(freteValue)}`;
                } else if (freteValue > 0) {
                  const locPart = freteState && freteState !== 'SP' ? ` (${freteState}${freteCity ? ` — ${freteCity}` : ''})` : '';
                  freteLabel = `${formatBRL(freteValue)}${locPart}`;
                } else {
                  // Sem valor definido
                  if (freteType === 'night') freteLabel = 'Noturno';
                  else if (freteType === 'paid') freteLabel = 'A calcular';
                  else if (freteType === 'consult') freteLabel = 'Sob consulta';
                  else if (freteState && freteState !== 'SP') {
                    const cityPart = freteCity ? ` — ${freteCity}` : '';
                    freteLabel = `Sob consulta (${freteState}${cityPart})`;
                  } else {
                    freteLabel = 'Grátis (SP)';
                  }
                }

                return (
                  <div className="mt-1 mb-1 rounded-md border border-border bg-muted/30 px-2.5 py-2 space-y-1">
                    {rtPct > 0 && (
                      <p className="text-xs flex items-center gap-1 text-muted-foreground">
                        <span className="font-medium text-foreground">RT:</span> {(rtPct * 100).toFixed(1)}%
                      </p>
                    )}
                    {marginPct > 0 && (
                      <p className="text-xs flex items-center gap-1 text-muted-foreground">
                        <span className="font-medium text-foreground">Margem:</span> {(marginPct * 100).toFixed(1)}%
                      </p>
                    )}

                    <p className="text-xs flex items-center gap-1 text-muted-foreground">
                      <span className="font-medium text-foreground">Frete:</span> {freteLabel}
                    </p>
                  </div>
                );
              })()}
              {/* Comissões dos vendedores — visível apenas para quem tem permissão */}
              {canSeeCommission && (() => {
                const total = quote.totalAmount ? Number(quote.totalAmount) : (quote.totalFinal ? Number(quote.totalFinal) : 0);
                const base = total * (1 - 0.12);
                const comm1Pct = quote.commissionPercent != null ? parseFloat(String(quote.commissionPercent)) : 0;
                const comm2Pct = (quote as any).commissionPercent2 != null ? parseFloat(String((quote as any).commissionPercent2)) : 0;
                const hasSeller2 = !!(quote as any).seller2Name;

                if (comm1Pct <= 0 && comm2Pct <= 0) return null;

                if (hasSeller2) {
                  // Dois vendedores: exibir comissão individual de cada um
                  return (
                    <>
                      {comm1Pct > 0 && (
                        <p className="text-amber-700 dark:text-amber-400">
                          <Percent className="w-3 h-3 inline mr-0.5" />Comissão {quote.vendorName ? `(${quote.vendorName.split(" ")[0]})` : "1º Vendedor"}: <span className="font-medium">{(comm1Pct * 100).toFixed(1)}%</span>
                          {base * comm1Pct > 0 && <span className="ml-1 text-xs">({formatBRL(base * comm1Pct)})</span>}
                        </p>
                      )}
                      {comm2Pct > 0 && (
                        <p className="text-amber-700 dark:text-amber-400">
                          <Percent className="w-3 h-3 inline mr-0.5" />Comissão {(quote as any).seller2Name ? `(${(quote as any).seller2Name.split(" ")[0]})` : "2º Vendedor"}: <span className="font-medium">{(comm2Pct * 100).toFixed(1)}%</span>
                          {base * comm2Pct > 0 && <span className="ml-1 text-xs">({formatBRL(base * comm2Pct)})</span>}
                        </p>
                      )}
                    </>
                  );
                } else {
                  // Um vendedor: exibir comissão total
                  return comm1Pct > 0 ? (
                    <p className="text-amber-700 dark:text-amber-400">
                      <Percent className="w-3 h-3 inline mr-0.5" />Comissão: <span className="font-medium">{(comm1Pct * 100).toFixed(1)}%</span>
                      {base * comm1Pct > 0 && <span className="ml-1 text-xs">({formatBRL(base * comm1Pct)})</span>}
                    </p>
                  ) : null;
                }
              })()}
              {quote.destState && (
                <p>🗺️ Destino: <span className="font-medium">{quote.destState}</span>
                  {quote.difalEnabled && !!getStateInfo(quote.destState ?? "") && (() => {
                    const difalAmt = Number(quote.difalValue ?? 0);
                    const fcpAmt   = Number(quote.fcpValue ?? 0);
                    const combined = difalAmt + fcpAmt;
                    const difalPct = Number(quote.difalPercent ?? 0);
                    const fcpPct   = Number(quote.fcpPercent ?? 0);
                    const combinedPct = difalPct + fcpPct;
                    if (combined <= 0) return null;
                    return (
                      <span className="ml-1 text-xs text-orange-600">
                        DIFAL/FCP ({combinedPct.toFixed(1)}%): {formatBRL(combined)}
                      </span>
                    );
                  })()}
                </p>
              )}
              {/* Diluição — visível apenas para quem pode ver comissão */}
              {canSeeCommission && (quote as any).diluicaoValor != null && parseFloat(String((quote as any).diluicaoValor)) > 0 && (
                <div className="mt-1 rounded-md border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 px-2 py-1.5 space-y-0.5">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                    <span>⚠</span> Diluição (uso interno): <span className="font-mono">{formatBRL(parseFloat(String((quote as any).diluicaoValor)))}</span>
                  </p>
                  {(quote as any).diluicaoDescricao && (
                    <p className="text-xs text-red-600 dark:text-red-300 italic">{(quote as any).diluicaoDescricao}</p>
                  )}
                </div>
              )}
              {totalRecalculado > 0 ? (
                <p className="text-primary font-bold text-lg">{formatBRL(totalRecalculado)}</p>
              ) : null}
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

          <Button
            variant="outline"
            className="gap-2 border-red-500/40 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            onClick={handleGeneratePdf}
            disabled={isGenerating}
            title="Baixar orçamento em PDF (conta como revisão)"
          >
            <FileDown className="w-4 h-4" />
            {isGenerating ? "Gerando..." : "Baixar PDF"}
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-amber-500/40 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="w-4 h-4" />
            Pré-visualizar Excel
          </Button>

          {quote.status === "approved" && (
            <>
              <Button
                className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => navigate(`/orcamentos/${id}/pedido-fabrica`)}
              >
                <Factory className="w-4 h-4" />
                Gerenciar Pedido de Fábrica
              </Button>

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
                if (!parsed) return { id: item.id, itemNumber: item.itemNumber, itemData: item.itemData, parsed: {} as CartItemData };
                // ── Migração de itens legados: reconstruir driverLines a partir de profileSegments ──
                // Aplica quando: tem profileSegments com driverCode, mas não tem driverLines
                if ((!parsed.driverLines || parsed.driverLines.length === 0) &&
                    parsed.profileSegments && parsed.profileSegments.length > 0 &&
                    parsed.profileSegments.some(seg => seg.driverCode)) {
                  const _editItemQty = parsed.qty ?? 1; // quantidade de lumárias
                  // Consolidar drivers por código (quantidade por lumária)
                  const drvMap = new Map<string, { driverCode: string; driverModel: string; qtyPerLuminaria: number }>();
                  for (const seg of parsed.profileSegments) {
                    if (!seg.driverCode) continue;
                    const key = seg.driverCode;
                    const qtyPerSeg = (seg.driverQtyPerPiece ?? 1) * (seg.qty ?? 1);
                    if (drvMap.has(key)) {
                      drvMap.get(key)!.qtyPerLuminaria += qtyPerSeg;
                    } else {
                      drvMap.set(key, { driverCode: seg.driverCode, driverModel: seg.driverModel ?? seg.driverCode, qtyPerLuminaria: qtyPerSeg });
                    }
                  }
                  const driverEntries = Array.from(drvMap.values());
                  // Calcular preço total de todos os drivers
                  let totalDriverCost = 0;
                  const driverLines: import("@/lib/cartTypes").DriverLine[] = driverEntries.map(drv => {
                    // totalQty = drivers por lumária × quantidade de lumárias
                    const totalQty = drv.qtyPerLuminaria * _editItemQty;
                    const unitPrice = componentePriceMap.get(drv.driverCode) ?? null;
                    const totalPrice = unitPrice != null ? unitPrice * totalQty : null;
                    if (totalPrice != null) totalDriverCost += totalPrice;
                    return {
                      driverCode: drv.driverCode,
                      driverModel: componenteDescMap.get(drv.driverCode) ?? drv.driverModel,
                      driverQty: totalQty,
                      driverUnitPrice: unitPrice,
                      driverTotalPrice: totalPrice,
                    };
                  });
                  // Calcular preço da luminária sem driver
                  const totalPrice = parsed.totalPrice ?? 0;
                  const priceWithoutDriver = totalDriverCost > 0 ? totalPrice - totalDriverCost : (parsed.priceWithoutDriver ?? null);
                  const qty = _editItemQty;
                  const unitPriceLuminaria = priceWithoutDriver != null && qty > 0 ? priceWithoutDriver / qty : (parsed.unitPriceLuminaria ?? null);
                  const migratedParsed: CartItemData = {
                    ...parsed,
                    driverLines,
                    priceWithoutDriver: priceWithoutDriver ?? parsed.priceWithoutDriver,
                    unitPriceLuminaria: unitPriceLuminaria ?? parsed.unitPriceLuminaria,
                    luminariaHasApiPrice: totalDriverCost > 0 || (parsed.unitPriceLuminaria != null),
                  };
                  return {
                    id: item.id,
                    itemNumber: item.itemNumber,
                    itemData: JSON.stringify(migratedParsed),
                    parsed: migratedParsed,
                  };
                }
                // Migração 2: itens com accessories contendo drivers (EQ*) sem unitPrice
                const _editAccessories = (parsed.accessories as import("@/lib/cartTypes").LinkedAccessory[] | undefined) ?? [];
                const _editDriverAccs = _editAccessories.filter(acc =>
                  acc.codigo && (acc.unitPrice == null || acc.unitPrice === 0) &&
                  componentePriceMap.has(acc.codigo)
                );
                if (_editDriverAccs.length > 0 && (!parsed.driverLines || parsed.driverLines.length === 0)) {
                  const _editItemQty2 = parsed.qty ?? 1;
                  const driverLines2: import("@/lib/cartTypes").DriverLine[] = _editDriverAccs.map(acc => {
                    const unitPrice = componentePriceMap.get(acc.codigo)!;
                    const totalQty = (acc.qty ?? 1) * _editItemQty2;
                    return {
                      driverCode: acc.codigo,
                      driverModel: componenteDescMap.get(acc.codigo) ?? acc.descricao,
                      driverQty: totalQty,
                      driverUnitPrice: unitPrice,
                      driverTotalPrice: unitPrice * totalQty,
                    };
                  });
                  const _editTotalDriverCost2 = driverLines2.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
                  const _editTotalPrice2 = parsed.totalPrice ?? 0;
                  const _editPWD2 = _editTotalPrice2 > 0 ? _editTotalPrice2 - _editTotalDriverCost2 : null;
                  const _editUPL2 = _editPWD2 != null && _editItemQty2 > 0 ? _editPWD2 / _editItemQty2 : (parsed.unitPriceLuminaria ?? null);
                  const migratedParsed2: CartItemData = {
                    ...parsed,
                    driverLines: driverLines2,
                    priceWithoutDriver: _editPWD2 ?? parsed.priceWithoutDriver,
                    unitPriceLuminaria: _editUPL2 ?? parsed.unitPriceLuminaria,
                    luminariaHasApiPrice: true,
                  };
                  return { id: item.id, itemNumber: item.itemNumber, itemData: JSON.stringify(migratedParsed2), parsed: migratedParsed2 };
                }
                return {
                    id: item.id,
                    itemNumber: item.itemNumber,
                    itemData: item.itemData,
                    parsed,
                  };
              }));
              setEditItemsNotes("");
              setEditItemsSearch("");
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
                <div className="flex items-center justify-between">
                  <SheetTitle className="flex items-center gap-2 text-lg">
                    <ShoppingBag className="w-5 h-5" />
                    Editar Itens do Orçamento
                  </SheetTitle>
                  <Button
                    variant={editGroupByFloor ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => setEditGroupByFloor(v => !v)}
                    title={editGroupByFloor ? "Desagrupar" : "Agrupar por pavimento"}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {editGroupByFloor ? "Agrupado" : "Agrupar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Edite quantidades, cor, temperatura de cor e identificação em planta. Uma nova revisão será criada ao salvar.
                </p>
                {/* Campo de busca */}
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por SKU, descrição, item em planta, pavimento..."
                    value={editItemsSearch}
                    onChange={e => setEditItemsSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {editItemsSearch && (
                    <button
                      type="button"
                      onClick={() => setEditItemsSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">

<DndContext sensors={editItemsSensors} collisionDetection={closestCenter} onDragEnd={handleEditItemsDragEnd}
                  onDragStart={(event) => {
                    const eid = String(event.active.id);
                    if (eid.startsWith("floor:")) setEditDraggingFloor(eid.slice(6));
                  }}
                >
                    {editGroupByFloor ? (() => {
                      // Aplicar filtro de busca
                      const searchLower = editItemsSearch.toLowerCase().trim();
                      const filteredForGroup = searchLower
                        ? editableItems.filter(item => {
                            const p = item.parsed;
                            return (
                              (p.sku ?? "").toLowerCase().includes(searchLower) ||
                              (p.description ?? "").toLowerCase().includes(searchLower) ||
                              (p.itemEmPlanta ?? "").toLowerCase().includes(searchLower) ||
                              (p.floorName ?? "").toLowerCase().includes(searchLower) ||
                              (p.ambiente ?? "").toLowerCase().includes(searchLower) ||
                              (p.category ?? "").toLowerCase().includes(searchLower)
                            );
                          })
                        : editableItems;
                      const floorMap = new Map<string, typeof editableItems>();
                      for (const item of filteredForGroup) {
                        const floor = item.parsed.floorName?.trim() || "Sem Pavimento";
                        if (!floorMap.has(floor)) floorMap.set(floor, []);
                        floorMap.get(floor)!.push(item);
                      }
                      // Manter a ordem dos grupos conforme a ordem dos itens
                      const seenEditFloors = new Set<string>();
                      const editGroups: { floor: string; items: typeof editableItems }[] = [];
                      for (const item of filteredForGroup) {
                        const f = item.parsed.floorName?.trim() || "Sem Pavimento";
                        if (!seenEditFloors.has(f)) { seenEditFloors.add(f); editGroups.push({ floor: f, items: floorMap.get(f)! }); }
                      }
                      return (
                        <SortableContext items={editGroups.map(g => `floor:${g.floor}`)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-6">
                          {editGroups.map(({ floor, items: groupItems }) => (
                            <FloorGroupBarQD
                              key={floor}
                              floorId={`floor:${floor}`}
                              displayName={floor}
                              groupCount={groupItems.length}
                              isCollapsed={editCollapsedFloors.has(floor)}
                              onToggleCollapse={() => toggleEditFloorCollapse(floor)}
                            >
                              {!editCollapsedFloors.has(floor) && (
                              <SortableContext items={groupItems.map(it => it.id)} strategy={verticalListSortingStrategy}>
                              <div className="space-y-4">
                                {groupItems.map((item, idx) => {
                                  const globalIdx = editableItems.findIndex(it => it.id === item.id);
                                  return (
                                  <SortableEditItem
                                    key={item.id}
                                    item={item}
                                    idx={idx}
                                    globalSeq={globalIdx + 1}
                                    totalItems={editableItems.length}
                                    onReorderToSeq={handleEditReorderToSeq}
                                    resolvePhoto={resolvePhoto}
                                    onDelete={(id) => setEditableItems(prev => prev.filter(it => it.id !== id))}
                                    onDuplicate={(id) => setEditableItems(prev => { const i = prev.findIndex(it => it.id === id); if (i === -1) return prev; const src = prev[i]; const cloned = { ...src, id: Date.now() + Math.random(), itemData: src.itemData }; const next = [...prev]; next.splice(i + 1, 0, cloned); return next; })}
                                    onReplace={(replIdx) => { setEditItemsDialogOpen(false); const d = editableItems[replIdx]?.parsed; navigate(`/?replaceInQuote=${quote.id}&replaceIndex=${replIdx}&replaceQty=${d?.qty ?? 1}&replaceItemEmPlanta=${encodeURIComponent(d?.itemEmPlanta ?? "")}`); }}
                                    onUpdate={(id, fields) => { let mergedFields = { ...fields }; if (fields.cct !== undefined) { const curItem = editableItems.find(it => it.id === id); if (curItem && fields.cct !== curItem.parsed.cct) { mergedFields = { ...applyCCTChange(curItem.parsed, fields.cct), ...fields }; } } setEditableItems(prev => prev.map(it => { if (it.id !== id) return it; const newParsed = { ...it.parsed, ...mergedFields }; if (fields.unitPrice !== undefined) { Object.assign(newParsed, applyUnitPriceChange(newParsed, fields.unitPrice, fields.qty ?? newParsed.qty)); } else if (fields.qty !== undefined) { Object.assign(newParsed, applyQtyChange(newParsed, fields.qty)); } return { ...it, parsed: newParsed, itemData: JSON.stringify(newParsed) }; })); }}
                                    onUploadSpecialPhoto={async (id, base64, mimeType, fileName) => { const result = await uploadSpecialPhotoMutationQD.mutateAsync({ base64, mimeType, fileName }); setEditableItems(prev => prev.map(it => { if (it.id !== id) return it; const newParsed = { ...it.parsed, specialPhotoUrl: result.url, photoUrl: result.url }; return { ...it, parsed: newParsed, itemData: JSON.stringify(newParsed) }; })); }}
                                    canOverrideApiPrice={true}
                                    canEditDriverPrice={
                                      DRIVER_PRICE_OVERRIDE_EMAILS.map(e => e.toLowerCase()).includes(((user as any)?.email ?? "").toLowerCase())
                                    }
                                    isCostPrivileged={
                                      (user as any)?.role === 'admin' || COST_PRIVILEGED_EMAILS.map(e => e.toLowerCase()).includes(((user as any)?.email ?? "").toLowerCase())
                                    }
                                    canEditMkp={
                                      (user as any)?.role === 'admin' || (user as any)?.role === 'gerente' || MANAGER_EMAILS.map(e => e.toLowerCase()).includes(((user as any)?.email ?? "").toLowerCase())
                                    }
                                  />
                                  );
                                })}
                              </div>
                              </SortableContext>
                              )}
                            </FloorGroupBarQD>
                          ))}
                        </div>
                        </SortableContext>
                      );
                    })() : (() => {
                      const searchLower = editItemsSearch.toLowerCase().trim();
                      const filteredItems = searchLower
                        ? editableItems.filter(item => {
                            const p = item.parsed;
                            return (
                              (p.sku ?? "").toLowerCase().includes(searchLower) ||
                              (p.description ?? "").toLowerCase().includes(searchLower) ||
                              (p.itemEmPlanta ?? "").toLowerCase().includes(searchLower) ||
                              (p.floorName ?? "").toLowerCase().includes(searchLower) ||
                              (p.ambiente ?? "").toLowerCase().includes(searchLower) ||
                              (p.category ?? "").toLowerCase().includes(searchLower)
                            );
                          })
                        : editableItems;
                      return filteredItems.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-8 text-center">
                          Nenhum item encontrado para “{editItemsSearch}”
                        </div>
                      ) : (
                    <SortableContext items={filteredItems.map(it => it.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {filteredItems.map((item, idx) => (
                        <SortableEditItem
                          key={item.id}
                          item={item}
                          idx={idx}
                          globalSeq={idx + 1}
                          totalItems={editableItems.length}
                          onReorderToSeq={handleEditReorderToSeq}
                          resolvePhoto={resolvePhoto}
                          onDelete={(id) => {
                            setEditableItems(prev => prev.filter(it => it.id !== id));
                          }}
                          onDuplicate={(id) => {
                            setEditableItems(prev => {
                              const idx = prev.findIndex(it => it.id === id);
                              if (idx === -1) return prev;
                              const src = prev[idx];
                              const cloned = { ...src, id: Date.now() + Math.random(), itemData: src.itemData };
                              const next = [...prev];
                              next.splice(idx + 1, 0, cloned);
                              return next;
                            });
                          }}
                          onReplace={(replIdx) => { setEditItemsDialogOpen(false); const d = editableItems[replIdx]?.parsed; navigate(`/?replaceInQuote=${quote.id}&replaceIndex=${replIdx}&replaceQty=${d?.qty ?? 1}&replaceItemEmPlanta=${encodeURIComponent(d?.itemEmPlanta ?? "")}`); }}
                          onUpdate={(id, fields) => {
                            setEditableItems(prev => prev.map(it => {
                              if (it.id !== id) return it;
                              let mergedFields = { ...fields };
                              if (fields.cct !== undefined && fields.cct !== it.parsed.cct) {
                                mergedFields = { ...applyCCTChange(it.parsed, fields.cct), ...fields };
                              }
                              const newParsed = { ...it.parsed, ...mergedFields };
                              if (fields.unitPrice !== undefined) {
                                Object.assign(newParsed, applyUnitPriceChange(newParsed, fields.unitPrice, fields.qty ?? newParsed.qty));
                              } else if (fields.qty !== undefined) {
                                Object.assign(newParsed, applyQtyChange(newParsed, fields.qty));
                              }
                              return { ...it, parsed: newParsed, itemData: JSON.stringify(newParsed) };
                            }));
                          }}
                          onUploadSpecialPhoto={async (id, base64, mimeType, fileName) => {
                            const result = await uploadSpecialPhotoMutationQD.mutateAsync({ base64, mimeType, fileName });
                            setEditableItems(prev => prev.map(it => {
                              if (it.id !== id) return it;
                              const newParsed = { ...it.parsed, specialPhotoUrl: result.url, photoUrl: result.url };
                              return { ...it, parsed: newParsed, itemData: JSON.stringify(newParsed) };
                            }));
                          }}
                          canOverrideApiPrice={
                            (user as any)?.role === 'admin' ||
                            (user as any)?.role === 'gerente' ||
                            PRICE_OVERRIDE_EMAILS.includes(((user as any)?.email ?? "").toLowerCase())
                          }
                          canEditDriverPrice={
                            DRIVER_PRICE_OVERRIDE_EMAILS.map(e => e.toLowerCase()).includes(((user as any)?.email ?? "").toLowerCase())
                          }
                          isCostPrivileged={
                            (user as any)?.role === 'admin' || COST_PRIVILEGED_EMAILS.map(e => e.toLowerCase()).includes(((user as any)?.email ?? "").toLowerCase())
                          }
                          canEditMkp={
                            (user as any)?.role === 'admin' || (user as any)?.role === 'gerente' || MANAGER_EMAILS.map(e => e.toLowerCase()).includes(((user as any)?.email ?? "").toLowerCase())
                          }
                        />
                      ))}
                    </div>
                    </SortableContext>
                      );
                    })()}
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
                    {formatBRL(editableItems.reduce((s, it) => {
                      const p = it.parsed;
                      let itemBase = 0;
                      if (p.driverLines && p.driverLines.length > 0) {
                        const _drvTotalFt = p.driverLines.reduce((sd, dl) => sd + (dl.driverTotalPrice ?? 0), 0);
                        const lumT = (() => {
                          if (p.priceWithoutDriver != null) {
                            const isUnitOnly = p.unitPriceLuminaria != null && Math.abs(p.priceWithoutDriver - p.unitPriceLuminaria) < 0.02 && (p.qty ?? 1) > 1;
                            return isUnitOnly ? p.unitPriceLuminaria! * (p.qty ?? 1) : p.priceWithoutDriver;
                          }
                          if (p.unitPriceLuminaria == null && p.totalPrice != null && p.totalPrice > 0) {
                            return Math.max(0, p.totalPrice - _drvTotalFt);
                          }
                          const unitLum = p.unitPriceLuminaria ?? null;
                          return unitLum != null ? unitLum * (p.qty ?? 1) : (p.totalPrice ?? 0);
                        })();
                        itemBase = lumT + _drvTotalFt;
                      } else {
                        itemBase = p.totalPrice ?? 0;
                      }
                      return s + applyItemMarginQD(itemBase, p.itemMarginPercent);
                    }, 0))}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditItemsDialogOpen(false)}>Cancelar</Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      // Para itens com driverLines, calcular total correto (luminaria + drivers)
                      const totalBase = editableItems.reduce((s, it) => {
                        const p = it.parsed;
                        if (p.driverLines && p.driverLines.length > 0) {
                          const _drvTotalTB = p.driverLines.reduce((sd, dl) => sd + (dl.driverTotalPrice ?? 0), 0);
                          const lumT = (() => {
                            if (p.priceWithoutDriver != null) {
                              const isUnitOnly = p.unitPriceLuminaria != null &&
                                Math.abs(p.priceWithoutDriver - p.unitPriceLuminaria) < 0.02 &&
                                (p.qty ?? 1) > 1;
                              return isUnitOnly ? p.unitPriceLuminaria! * (p.qty ?? 1) : p.priceWithoutDriver;
                            }
                            if (p.unitPriceLuminaria == null && p.totalPrice != null && p.totalPrice > 0) {
                              return Math.max(0, p.totalPrice - _drvTotalTB);
                            }
                            const unitLum = p.unitPriceLuminaria ?? null;
                            return unitLum != null ? unitLum * (p.qty ?? 1) : (p.totalPrice ?? 0);
                          })();
                          const drvT = p.driverLines.reduce((sd, dl) => sd + (dl.driverTotalPrice ?? 0), 0);
                          return s + applyItemMarginQD(lumT + drvT, p.itemMarginPercent);
                        }
                        return s + applyItemMarginQD(p.totalPrice ?? 0, p.itemMarginPercent);
                      }, 0);
                      const rtPct = quote.rtPercent ? parseFloat(String(quote.rtPercent)) : 0;
                      const marginPct = quote.marginPercent ? parseFloat(String(quote.marginPercent)) : 0;
                      const totalComRT = rtPct > 0 ? totalBase / (1 - rtPct) : totalBase;
                      const totalFinal = marginPct > 0 ? totalComRT / (1 - marginPct) : totalComRT;
                      // Incluir frete e DIFAL/FCP (alíquota combinada, fórmula por dentro)
                      // Frete separado (não diluído) entra na base do DIFAL; frete diluído já está no totalFinal
                      const itemsFreteValor = !(quote as any).freteIncluded && (quote as any).freteValue && !(quote as any).freteIsento ? parseFloat(String((quote as any).freteValue)) : 0;
                      const itemsStateInfo = quote.destState ? getStateInfo(quote.destState) : undefined;
                      const itemsCombinedRate = itemsStateInfo ? itemsStateInfo.combined : 0;
                      const itemsDifalAplicavel = !!itemsStateInfo && itemsCombinedRate > 0;
                      const baseComFrete = totalFinal + itemsFreteValor;
                      const totalFinalComImposto = quote.difalEnabled && itemsDifalAplicavel
                        ? baseComFrete / (1 - itemsCombinedRate / 100)
                        : baseComFrete;
                      const itemsCombinedAmt = totalFinalComImposto - baseComFrete;
                      const itemsDifalValRecalc = itemsStateInfo && itemsStateInfo.combined > 0 ? itemsCombinedAmt * (itemsStateInfo.difal / itemsStateInfo.combined) : 0;
                      const itemsFcpValRecalc = itemsStateInfo && itemsStateInfo.combined > 0 ? itemsCombinedAmt * (itemsStateInfo.fcp / itemsStateInfo.combined) : 0;
                      const totalFinalCompleto = totalFinalComImposto;
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
                        freteType: (quote.freteType as "free" | "paid" | "night" | "consult" | "pickup") ?? "free",
                        freteIsento: quote.freteIsento ?? undefined,
                        freteLocalidade: (quote.freteLocalidade as "sp" | "other") ?? "sp",
                        versionNotes: editItemsNotes || undefined,
                        totalAmount: totalFinal,
                        totalFinal: totalFinalCompleto,
                        items: editableItems.map((it, i) => ({ itemNumber: i + 1, itemData: it.itemData })),
                        arquiteto: (quote as any).arquiteto ?? undefined,
                        lightDesigner: (quote as any).lightDesigner ?? undefined,
                        bumpVersion: false,
                        // Preservar todos os campos do orçamento para não perder dados ao salvar itens
                        deliveryDays: quote.deliveryDays ?? 20,
                        commissionPercent: quote.commissionPercent != null ? parseFloat(String(quote.commissionPercent)) : 0.05,
                        commissionPercent2: quote.commissionPercent2 != null ? parseFloat(String(quote.commissionPercent2)) : 0,
                        paymentTerm: quote.paymentTerm ?? undefined,
                        destState: quote.destState ?? undefined,
                        difalEnabled: quote.difalEnabled ?? false,
                        difalPercent: quote.difalPercent != null ? parseFloat(String(quote.difalPercent)) : 0,
                        fcpPercent: quote.fcpPercent != null ? parseFloat(String(quote.fcpPercent)) : 0,
                        fcpEnabled: quote.fcpEnabled ?? false,
                        difalValue: itemsDifalValRecalc,
                        fcpValue: itemsFcpValRecalc,
                        projectNumber: quote.projectNumber ?? undefined,
                        freteValue: (quote as any).freteValue != null ? parseFloat(String((quote as any).freteValue)) : undefined,
                        freteState: (quote as any).freteState ?? undefined,
                        freteCity: (quote as any).freteCity ?? undefined,
                        freteIncluded: (quote as any).freteIncluded ?? false,
                        diluicaoValor: (quote as any).diluicaoValor != null ? parseFloat(String((quote as any).diluicaoValor)) : undefined,
                        diluicaoDescricao: (quote as any).diluicaoDescricao ?? undefined,
                        quoteNumber: quote.quoteNumber ?? undefined,
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

          {/* Converter em Pedido de Amostra */}
          {(quote.status as string) !== "sample" && canEdit && (
            <Button
              variant="outline"
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
              onClick={() => setSampleDialogOpen(true)}
            >
              <FlaskConical className="w-4 h-4" />
              Converter em Amostra
            </Button>
          )}
          {(quote.status as string) === "sample" && (
            <Badge variant="outline" className="gap-1 border-amber-400 text-amber-700 dark:text-amber-400 px-3 py-1">
              <FlaskConical className="w-3 h-3" />
              Pedido de Amostra
            </Badge>
          )}

          {/* Duplicar Orçamento */}
          <Dialog open={duplicateDialogOpen} onOpenChange={(open) => {
            setDuplicateDialogOpen(open);
            if (open) {
              setDuplicateClientName(quote.clientName ?? "");
              setDuplicateClientContact(quote.clientContact ?? "");
              setDuplicateClientPhone(quote.clientPhone ?? "");
              setDuplicateClientEmail(quote.clientEmail ?? "");
              setDuplicateQuoteNumber("");
              setDuplicateNumberError("");
              setDuplicateSellerId(""); // reset para usar o vendedor original
              setDuplicateAssistantId(""); // reset assistente
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Copy className="w-4 h-4" />
                Duplicar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Duplicar Orçamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  Será criado um novo orçamento com todos os itens e configurações do <strong>{quote.quoteNumber}</strong>.
                </p>

                {/* Vendedor (opcional — para mudar o vendedor na duplicação) */}
                <div className="space-y-1.5">
                  <Label>Vendedor 1 <span className="text-muted-foreground font-normal">(opcional — mantém o original se não alterar)</span></Label>
                  <Select value={duplicateSellerId || "_original"} onValueChange={v => {
                    setDuplicateSellerId(v === "_original" ? "" : v);
                    setDuplicateQuoteNumber(""); // limpa número manual ao trocar vendedor
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_original">Manter vendedor original ({quote.seller1Name ?? "—"})</SelectItem>
                      {editSellers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assistente (opcional) */}
                <div className="space-y-1.5">
                  <Label>Assistente <span className="text-muted-foreground font-normal">(opcional — limpa se não selecionar)</span></Label>
                  <Select value={duplicateAssistantId || "_none"} onValueChange={v => {
                    setDuplicateAssistantId(v === "_none" ? "" : v);
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Sem assistente</SelectItem>
                      <SelectItem value="VENDEDOR">VENDEDOR</SelectItem>
                      {editAssistants.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Número do novo orçamento */}
                <div className="space-y-1.5">
                  <Label>Número do Novo Orçamento</Label>
                  <div className="relative">
                    <Input
                      value={duplicateQuoteNumber}
                      onChange={e => {
                        setDuplicateQuoteNumber(e.target.value);
                        setDuplicateNumberError("");
                      }}
                      placeholder={suggestNumberQuery.data?.suggested ?? "Gerando sugestão..."}
                      className={checkNumberQuery.data?.exists ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {duplicateQuoteNumber.trim() && checkNumberQuery.isFetching && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">verificando...</span>
                    )}
                  </div>
                  {checkNumberQuery.data?.exists && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Número já em uso pelo orçamento de <strong>{checkNumberQuery.data.existingQuote?.clientName}</strong>. Escolha outro.
                    </p>
                  )}
                  {!checkNumberQuery.data?.exists && duplicateQuoteNumber.trim() && !checkNumberQuery.isFetching && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Número disponível.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para usar o próximo número sugerido ({suggestNumberQuery.data?.suggested ?? "..."}).
                  </p>
                </div>

                {/* Nome do cliente */}
                <div className="space-y-1.5">
                  <Label>Nome do Cliente</Label>
                  <Input
                    value={duplicateClientName}
                    onChange={e => setDuplicateClientName(e.target.value)}
                    placeholder="Nome do cliente"
                  />
                </div>

                {/* Contato */}
                <div className="space-y-1.5">
                  <Label>Nome do Contato</Label>
                  <Input
                    value={duplicateClientContact}
                    onChange={e => setDuplicateClientContact(e.target.value)}
                    placeholder="Nome do contato"
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input
                    value={duplicateClientPhone}
                    onChange={e => setDuplicateClientPhone(e.target.value)}
                    placeholder="Telefone"
                  />
                </div>

                {/* E-mail */}
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input
                    value={duplicateClientEmail}
                    onChange={e => setDuplicateClientEmail(e.target.value)}
                    placeholder="E-mail"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => duplicateMutation.mutate({
                    id: Number(id),
                    newClientName: duplicateClientName || undefined,
                    newQuoteNumber: duplicateQuoteNumber.trim() || undefined,
                    newClientContact: duplicateClientContact,
                    newClientPhone: duplicateClientPhone,
                    newClientEmail: duplicateClientEmail,
                    newSellerId: duplicateSellerId ? parseInt(duplicateSellerId) : undefined,
                    newAssistantId: duplicateAssistantId === "VENDEDOR" ? -1 : (duplicateAssistantId ? parseInt(duplicateAssistantId) : undefined),
                    newAssistantName: duplicateAssistantId === "VENDEDOR" ? "VENDEDOR" : (duplicateAssistantId ? (editAssistants.find(a => String(a.id) === duplicateAssistantId)?.name ?? undefined) : undefined),
                  })}
                  disabled={duplicateMutation.isPending || (duplicateQuoteNumber.trim().length > 0 && !!checkNumberQuery.data?.exists)}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {duplicateMutation.isPending ? "Duplicando..." : "Confirmar Duplicação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Alterar Status */}
          {canEdit && <Dialog open={statusDialogOpen} onOpenChange={(open) => {
            setStatusDialogOpen(open);
            if (!open) { setNewStatus(""); setOrderNumberInput(""); setBillingCompanyInput(""); }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" />
                Alterar Status
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Alterar Status do Orçamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Novo Status</Label>
                  <Select value={newStatus} onValueChange={(v) => { setNewStatus(v); setOrderNumberInput(""); setBillingCompanyInput(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Em Aberto</SelectItem>
                      <SelectItem value="approved">Aprovado (Pedido Fechado)</SelectItem>
                      <SelectItem value="lost">Perdido</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                      <SelectItem
                        value="invoiced"
                        disabled={quote.status !== "approved"}
                      >
                        Faturado (NF emitida)
                        {quote.status !== "approved" && " — exige status Aprovado"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newStatus === "approved" && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> O orçamento será marcado como <strong>Aprovado</strong>. O número de pedido e empresa faturadora serão solicitados ao gerar o Pedido de Fábrica.
                    </p>
                  </div>
                )}

                {newStatus === "invoiced" && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-sm text-purple-700 dark:text-purple-400">
                    <Receipt className="w-4 h-4 inline mr-1" />
                    Faturado indica que a nota fiscal foi emitida. Esta é a métrica de faturamento real do negócio.
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => {
                    if (!newStatus) return;
                    updateStatusMutation.mutate({
                      id: Number(id),
                      status: newStatus as "open" | "approved" | "lost" | "cancelled" | "invoiced",
                    });
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
              // Salvar IDs do orçamento para re-sincronização caso sellersQuery ainda esteja carregando
              setPendingQuoteIds({
                seller1Id: quote.seller1Id,
                seller1Name: quote.seller1Name,
                seller2Id: quote.seller2Id,
                seller2Name: quote.seller2Name,
                assistantId: quote.assistantId,
                assistantName: quote.assistantName,
              });
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
                assistantId: quote.assistantName === "VENDEDOR" ? "VENDEDOR" : (quote.assistantId ? String(quote.assistantId) : ""),
                assistantName: quote.assistantName ?? "",
                versionNotes: "",
                rtPercent: quote.rtPercent ? String(parseFloat(String(quote.rtPercent)) * 100) : "0",
                rtDest1: quote.rtDest1 ?? "",
                rtDest1Active: quote.rtDest1Active ?? true,
                rtDest2: quote.rtDest2 ?? "",
                rtDest2Active: quote.rtDest2Active ?? false,
                rtDest3: quote.rtDest3 ?? "",
                rtDest3Active: quote.rtDest3Active ?? false,
                marginPercent: quote.marginPercent ? String(parseFloat(String(quote.marginPercent)) * 100) : "0",
                freteType: (quote.freteType as "free" | "paid" | "night" | "consult" | "pickup") ?? "free",
                freteIsento: quote.freteIsento ?? false,
                freteLocalidade: (quote.freteLocalidade as "sp" | "other") ?? "sp",
                deliveryDays: quote.deliveryDays != null ? String(quote.deliveryDays) : "20",
                commissionPercent: quote.commissionPercent != null ? String(parseFloat(String(quote.commissionPercent)) * 100) : "5",
                commissionPercent2: quote.commissionPercent2 != null ? String(parseFloat(String(quote.commissionPercent2)) * 100) : "0",
                paymentTerm: quote.paymentTerm ?? "30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)",
                destState: quote.destState ?? "",
                difalEnabled: quote.difalEnabled ?? false,
                difalPercent: quote.difalPercent != null ? String(parseFloat(String(quote.difalPercent))) : "",
                difalValue: quote.difalValue != null ? String(parseFloat(String(quote.difalValue))) : "",
                fcpEnabled: quote.fcpEnabled ?? false,
                fcpPercent: quote.fcpPercent != null ? String(parseFloat(String(quote.fcpPercent))) : "",
                fcpValue: quote.fcpValue != null ? String(parseFloat(String(quote.fcpValue))) : "",
                projectNumber: quote.projectNumber ?? "",
                projectNoProject: (quote.projectNumber ?? "") === "Sem Projeto",
                freteValue: (quote as any).freteValue != null ? String((quote as any).freteValue) : "",
                freteState: (quote as any).freteState ?? "",
                freteStateCode: (quote as any).freteState ?? "SP",
                freteCity: (quote as any).freteCity ?? "",
                freteIncluded: (quote as any).freteIncluded ?? false,
                arquiteto: (quote as any).arquiteto ?? "",
                lightDesigner: (quote as any).lightDesigner ?? "",
                quoteNumber: quote.quoteNumber ?? "",
                diluicaoValor: (quote as any).diluicaoValor != null ? String((quote as any).diluicaoValor) : "",
                diluicaoDescricao: (quote as any).diluicaoDescricao ?? "",
                discountPercent: (quote as any).discountPercent ? String(parseFloat(String((quote as any).discountPercent)) * 100) : "0",
                showDiscount: !!(quote as any).showDiscount,
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
                  <TabsTrigger value="frete" className="flex-1"><Navigation2 className="w-3 h-3 mr-1" />Destino</TabsTrigger>
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
                      if (v === "none") {
                        // Removeu 2º vendedor: voltar comissão para 5% no 1º
                        setEditForm(f => ({ ...f, seller2Id: "", seller2Name: "", commissionPercent: "5", commissionPercent2: "0" }));
                      } else {
                        const sel = editSellers.find(s => String(s.id) === v);
                        const hadSeller2 = !!editForm.seller2Id;
                        setEditForm(f => ({
                          ...f,
                          seller2Id: v,
                          seller2Name: sel?.name ?? "",
                          // Se está adicionando 2º vendedor pela primeira vez, definir 2,5% para cada
                          ...(hadSeller2 ? {} : { commissionPercent: "2.5", commissionPercent2: "2.5" }),
                        }));
                      }
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
                      if (v === "VENDEDOR") {
                        setEditForm(f => ({ ...f, assistantId: "VENDEDOR", assistantName: "VENDEDOR" }));
                      } else {
                        const ast = editAssistants.find(a => String(a.id) === v);
                        setEditForm(f => ({ ...f, assistantId: v, assistantName: ast?.name ?? "" }));
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecione o assistente" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VENDEDOR">VENDEDOR (o próprio vendedor)</SelectItem>
                        {editAssistants.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Arquiteto</Label>
                      <Input
                        value={editForm.arquiteto}
                        onChange={e => setEditForm(f => ({ ...f, arquiteto: e.target.value }))}
                        placeholder="Nome do arquiteto"
                      />
                    </div>
                    <div>
                      <Label>Light Designer</Label>
                      <Input
                        value={editForm.lightDesigner}
                        onChange={e => setEditForm(f => ({ ...f, lightDesigner: e.target.value }))}
                        placeholder="Nome do light designer"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Número do Orçamento</Label>
                    <Input
                      value={editForm.quoteNumber}
                      onChange={e => setEditForm(f => ({ ...f, quoteNumber: e.target.value }))}
                      className="font-mono"
                      placeholder="Ex: 31.0127-26"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Você pode editar o número manualmente. Se o Vendedor 1 for alterado, um novo número será gerado automaticamente ao salvar.</p>
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
                  <div>
                    <Label>Número do Projeto <span className="text-destructive">*</span></Label>
                    <div className="flex gap-2 items-center mt-1">
                      <Input
                        placeholder="Ex: ALF 00001-R1"
                        value={editForm.projectNumber}
                        disabled={editForm.projectNoProject}
                        onChange={e => setEditForm(f => ({ ...f, projectNumber: e.target.value }))}
                        className={!editForm.projectNumber.trim() ? "border-destructive" : ""}
                      />
                      <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-sm select-none">
                        <Checkbox
                          checked={editForm.projectNoProject}
                          onCheckedChange={(checked) => {
                            const noProject = checked === true;
                            setEditForm(f => ({
                              ...f,
                              projectNoProject: noProject,
                              projectNumber: noProject ? "Sem Projeto" : (f.projectNumber === "Sem Projeto" ? "" : f.projectNumber),
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
                    <Label className="flex items-center gap-2"><Percent className="w-3 h-3" />Margem</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input type="number" min={0} max={99} step={0.5} className="w-24" value={editForm.marginPercent} onChange={e => setEditForm(f => ({ ...f, marginPercent: e.target.value }))} />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Margem de negociação (encarece o preço final).
                    </p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2"><Percent className="w-3 h-3" />Desconto</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input type="number" min={0} max={99} step={0.5} className="w-24" value={editForm.discountPercent} onChange={e => setEditForm(f => ({ ...f, discountPercent: e.target.value }))} disabled={!DISCOUNT_EDITORS_EMAILS.map(e => e.toLowerCase()).includes(((user as any)?.email ?? "").toLowerCase())} />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {DISCOUNT_EDITORS_EMAILS.map(e => e.toLowerCase()).includes(((user as any)?.email ?? "").toLowerCase())
                        ? "Desconto sobre o preço final (após margem)."
                        : "Apenas gestores podem aplicar desconto."}
                    </p>
                    {parseFloat(editForm.discountPercent || "0") > 0 && (
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input type="checkbox" checked={editForm.showDiscount} onChange={e => setEditForm(f => ({ ...f, showDiscount: e.target.checked }))} className="rounded border-border" />
                        <span className="text-xs text-muted-foreground">Mostrar desconto ao cliente</span>
                      </label>
                    )}
                  </div>
                  <div className="bg-muted/60 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBRL(editTotalBase)}</span></div>
                    {editRtPct > 0 && <div className="flex justify-between"><span className="text-muted-foreground">+ RT ({editForm.rtPercent}%)</span><span>{formatBRL(editTotalComRT - editTotalBase)}</span></div>}
                    {editMarginPct > 0 && <div className="flex justify-between"><span className="text-muted-foreground">+ Margem ({editForm.marginPercent}%)</span><span>{formatBRL(editTotalComMargem - editTotalComRT)}</span></div>}
                    {editDiscountPct > 0 && <div className="flex justify-between"><span className="text-red-500">− Desconto ({editForm.discountPercent}%)</span><span className="text-red-500">− {formatBRL(editTotalComMargem - editTotalFinal)}</span></div>}

                    <div className="flex justify-between font-bold border-t pt-1"><span>Total final</span><span className="text-primary">{formatBRL(editTotalFinal)}</span></div>
                  </div>
                </TabsContent>

                {/* Aba Destino */}
                <TabsContent value="frete" className="space-y-4 pt-3">
                  {/* Estado e Cidade de entrega */}
                  <StateCitySelector
                    stateCode={editForm.freteStateCode || "SP"}
                    city={editForm.freteCity}
                    onStateChange={(v) => setEditForm(f => ({
                      ...f,
                      freteStateCode: v,
                      freteState: v,
                      freteLocalidade: v === "SP" ? "sp" : "other",
                      freteCity: "",
                      // Auto-preencher estado destino DIFAL com o estado de entrega
                      destState: v,
                      // Resetar DIFAL ao mudar estado
                      difalEnabled: false,
                      fcpEnabled: false,
                    }))}
                    onCityChange={(city) => {
                      const isSpCapital = isSaoPauloCapital(city, editForm.freteStateCode || "SP");
                      setEditForm(f => ({
                        ...f,
                        freteCity: city,
                        freteLocalidade: isSpCapital ? "sp" : "other",
                        // Auto-selecionar frete "A Calcular" se não for São Paulo capital
                        freteType: (!isSpCapital && city) ? "paid" : f.freteType,
                      }));
                    }}
                    difalState={editForm.destState}
                    onUseDifalState={() => setEditForm(f => ({
                      ...f,
                      freteStateCode: f.destState,
                      freteState: f.destState,
                      freteLocalidade: f.destState === "SP" ? "sp" : "other",
                      freteCity: "",
                    }))}
                  />
                  <div>
                    <Label>Tipo de frete</Label>
                    <Select value={editForm.freteType} onValueChange={(v) => {
                      const newType = v as "free" | "paid" | "night" | "consult" | "pickup";
                      setEditForm(f => ({
                        ...f,
                        freteType: newType,
                        // Quando cliente retira, zerar o valor do frete
                        ...(newType === "pickup" ? { freteValue: "0", freteIncluded: false } : {}),
                      }));
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Grátis (SP, acima de R$1.500)</SelectItem>
                        <SelectItem value="paid">A calcular</SelectItem>
                        <SelectItem value="night">Noturno (R$2.000)</SelectItem>
                        <SelectItem value="consult">Sob consulta</SelectItem>
                        <SelectItem value="pickup">Cliente Retira (R$ 0,00)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="editFreteIsento" checked={editForm.freteIsento} onCheckedChange={(v) => setEditForm(f => ({ ...f, freteIsento: Boolean(v) }))} />
                    <label htmlFor="editFreteIsento" className="text-sm cursor-pointer">Isentar frete</label>
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
                        value={editForm.freteValue}
                        onChange={e => setEditForm(f => ({ ...f, freteValue: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="editFreteIncluded"
                        checked={editForm.freteIncluded}
                        onCheckedChange={(v) => setEditForm(f => ({ ...f, freteIncluded: Boolean(v) }))}
                      />
                      <label htmlFor="editFreteIncluded" className="text-sm cursor-pointer">Frete já incluído no total do orçamento</label>
                    </div>
                    <p className="text-xs text-muted-foreground">Valor real do frete cotado. Apenas demonstrativo.</p>
                  </div>

                  {/* DIFAL / FCP — calculado após o frete */}
                  <div className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Navigation2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">DIFAL / FCP (venda interestadual)</span>
                    </div>
                    {(!editForm.destState || editForm.destState === "none") && (
                      <p className="text-xs text-muted-foreground">Selecione o estado de entrega acima para calcular DIFAL/FCP automaticamente.</p>
                    )}
                    {editForm.destState === "SP" && (
                      <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                        São Paulo é o estado de origem — DIFAL não se aplica para vendas internas.
                      </p>
                    )}
                    {editForm.destState && editForm.destState !== "none" && editForm.destState !== "SP" && (() => {
                      const info = getStateInfo(editForm.destState);
                      if (!info) return null;
                      // Frete separado (não diluído) entra na base do DIFAL; frete diluído já está no editTotalFinal
                      const editFreteBase = !editForm.freteIncluded && editForm.freteValue && !editForm.freteIsento ? parseFloat(editForm.freteValue) : 0;
                      const base = editTotalFinal + editFreteBase;
                      const combinedRate = info.combined;
                      const totalComImposto = combinedRate > 0 ? base / (1 - combinedRate / 100) : base;
                      const combinedVal = totalComImposto - base;
                      const difalVal = info.combined > 0 ? combinedVal * (info.difal / info.combined) : 0;
                      const fcpVal   = info.combined > 0 ? combinedVal * (info.fcp   / info.combined) : 0;
                      return (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                            Destino: <strong>{info.uf} — {info.name}</strong>
                            {editFreteBase > 0 && <span className="ml-2">(frete R$ {editFreteBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} incluído na base)</span>}
                          </p>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="editDifalEnabled"
                              checked={editForm.difalEnabled}
                              onCheckedChange={(v) => {
                                const enabled = Boolean(v);
                                setEditForm(f => ({
                                  ...f,
                                  difalEnabled: enabled,
                                  fcpEnabled: enabled,
                                  difalValue: String(difalVal.toFixed(2)),
                                  fcpValue: String(fcpVal.toFixed(2)),
                                  difalPercent: String(info.difal),
                                  fcpPercent: String(info.fcp),
                                }));
                              }}
                            />
                            <label htmlFor="editDifalEnabled" className="text-sm cursor-pointer">
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
                          {editForm.difalEnabled && (
                            <div className="bg-muted/60 rounded p-2 text-sm space-y-1">
                              <div className="flex justify-between text-muted-foreground">
                                <span>Produtos</span>
                                <span>{formatBRL(editTotalFinal)}</span>
                              </div>
                              {editFreteBase > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                  <span>+ Frete</span>
                                  <span>{formatBRL(editFreteBase)}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-muted-foreground border-t pt-1">
                                <span>Base de cálculo</span>
                                <span>{formatBRL(base)}</span>
                              </div>
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

                  {/* Comissão do vendedor — visível apenas para quem tem permissão */}
                  {canSeeCommission && (<div className="space-y-3">
                  <div className="border rounded-lg p-3 space-y-2 bg-amber-50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium">Comissão do Vendedor (demonstrativo)</span>
                      {!canEditCommission && <span className="text-xs text-muted-foreground">(somente leitura)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={0} max={100} step={0.5}
                        className="w-24"
                        value={editForm.commissionPercent}
                        readOnly={!canEditCommission}
                        disabled={!canEditCommission}
                        onChange={canEditCommission ? (e => {
                          const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                          setEditForm(f => ({ ...f, commissionPercent: String(val) }));
                        }) : undefined}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
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
                  {/* Comissão 2º Vendedor */}
                  {editForm.seller2Id && (
                  <div className="border rounded-lg p-3 space-y-2 bg-amber-50/50 dark:bg-amber-950/10">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium">Comissão do 2º Vendedor (demonstrativo)</span>
                      {!canEditCommission && <span className="text-xs text-muted-foreground">(somente leitura)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={0} max={100} step={0.5}
                        className="w-24"
                        value={editForm.commissionPercent2}
                        readOnly={!canEditCommission}
                        disabled={!canEditCommission}
                        onChange={canEditCommission ? (e => {
                          const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                          setEditForm(f => ({ ...f, commissionPercent2: String(val) }));
                        }) : undefined}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Apenas demonstrativo. Visível quando há 2º vendedor no orçamento.</p>
                  </div>
                  )}
                  </div>)} {/* fecha canSeeCommission */}

                  {/* Diluição — visível apenas para managers/admins */}
                  {canSeeCommission && <div className="border rounded-lg p-3 space-y-3 bg-red-50 dark:bg-red-950/20">
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
                        value={editForm.diluicaoValor}
                        onChange={e => setEditForm(f => ({ ...f, diluicaoValor: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Motivo / Descrição interna</Label>
                      <Input
                        maxLength={256}
                        placeholder="Ex: Saldo devedor ORC 04.0123-25"
                        value={editForm.diluicaoDescricao}
                        onChange={e => setEditForm(f => ({ ...f, diluicaoDescricao: e.target.value }))}
                      />
                    </div>
                    {editForm.diluicaoValor && parseFloat(editForm.diluicaoValor) > 0 && (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">
                        {formatBRL(parseFloat(editForm.diluicaoValor))} serão adicionados proporcionalmente aos preços dos produtos.
                      </p>
                    )}
                  </div>}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => {
                    if (!editForm.clientName.trim()) { toast.error("Nome do cliente é obrigatório."); return; }
                    if (!editForm.projectNumber.trim()) { toast.error("Informe o Número do Projeto ou marque \"Sem Projeto\"."); return; }
                    const editRtPctVal = Math.min(Math.max(parseFloat(editForm.rtPercent || "0") / 100, 0), 0.99);
                    const editMarginPctVal = Math.min(Math.max(parseFloat(editForm.marginPercent || "0") / 100, 0), 0.99);
                    const totalComRTVal = editRtPctVal > 0 ? editTotalBase / (1 - editRtPctVal) : editTotalBase;
                    const totalFinalVal = editMarginPctVal > 0 ? totalComRTVal / (1 - editMarginPctVal) : totalComRTVal;
                    // Calcular frete e DIFAL/FCP (alíquota combinada, fórmula por dentro)
                    // Frete separado (não diluído) entra na base do DIFAL; frete diluído já está no editTotalFinal
                    const editFreteValor = !editForm.freteIncluded && editForm.freteValue && !editForm.freteIsento ? parseFloat(editForm.freteValue) : 0;
                    const editStateInfo = editForm.destState ? getStateInfo(editForm.destState) : undefined;
                    const baseComFrete = totalFinalVal + editFreteValor;
                    // Alíquota combinada DIFAL + FCP
                    const editCombinedRate = editStateInfo ? editStateInfo.combined : 0;
                    const totalFinalComImposto = editForm.difalEnabled && editCombinedRate > 0
                      ? baseComFrete / (1 - editCombinedRate / 100)
                      : baseComFrete;
                    // Decompor para salvar separadamente
                    const editCombinedVal = totalFinalComImposto - baseComFrete;
                    const editDifalVal = editStateInfo && editStateInfo.combined > 0
                      ? editCombinedVal * (editStateInfo.difal / editStateInfo.combined)
                      : (editForm.difalEnabled && editForm.difalValue ? parseFloat(editForm.difalValue) : 0);
                    const editFcpVal = editStateInfo && editStateInfo.combined > 0
                      ? editCombinedVal * (editStateInfo.fcp / editStateInfo.combined)
                      : (editForm.fcpEnabled && editForm.fcpValue ? parseFloat(editForm.fcpValue) : 0);
                    const totalFinalCompleto = totalFinalComImposto;
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
                      assistantId: editForm.assistantId && editForm.assistantId !== "VENDEDOR" ? parseInt(editForm.assistantId) : undefined,
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
                      totalFinal: totalFinalCompleto,
                      items: currentItems.map((i, idx) => ({ itemNumber: idx + 1, itemData: i.itemData })),
                      bumpVersion: false,
                      deliveryDays: parseInt(editForm.deliveryDays || "20") || 20,
                      commissionPercent: Math.min(Math.max(parseFloat(editForm.commissionPercent || "5") / 100, 0), 1),
                      commissionPercent2: editForm.commissionPercent2 ? Math.min(Math.max(parseFloat(editForm.commissionPercent2) / 100, 0), 1) : undefined,
                      paymentTerm: editForm.paymentTerm || undefined,
                      destState: editForm.destState || undefined,
                      difalEnabled: editForm.difalEnabled,
                      fcpEnabled: editForm.fcpEnabled,
                      projectNumber: editForm.projectNumber || undefined,
                      freteValue: editForm.freteValue ? parseFloat(editForm.freteValue) : undefined,
                      freteState: editForm.freteState || editForm.freteStateCode || undefined,
                      freteCity: editForm.freteCity || undefined,
                      freteIncluded: editForm.freteIncluded,
                      arquiteto: editForm.arquiteto || undefined,
                      lightDesigner: editForm.lightDesigner || undefined,
                      quoteNumber: editForm.quoteNumber.trim() || undefined,
                      diluicaoValor: editForm.diluicaoValor ? parseFloat(editForm.diluicaoValor) : undefined,
                      diluicaoDescricao: editForm.diluicaoDescricao || undefined,
                      discountPercent: editDiscountPct > 0 ? editDiscountPct : 0,
                      showDiscount: editForm.showDiscount && editDiscountPct > 0,
                      ...(() => {
                        const info = editForm.destState ? getStateInfo(editForm.destState) : undefined;
                        return {
                          // Preservar aliquotas salvas quando nao ha destState selecionado
                          difalPercent: info ? info.difal : (editForm.difalPercent ? parseFloat(editForm.difalPercent) : 0),
                          fcpPercent: info ? info.fcp : (editForm.fcpPercent ? parseFloat(editForm.fcpPercent) : 0),
                          difalValue: editDifalVal,
                          fcpValue: editFcpVal,
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
                    <p className="text-sm font-semibold text-destructive mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4 shrink-0" />Atenção: Ação irreversível!</p>
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
                    <p className="text-sm font-semibold text-destructive mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4 shrink-0" />Confirmação final</p>
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

          {/* Dialog: Converter em Amostra */}
          <Dialog open={sampleDialogOpen} onOpenChange={(open) => { setSampleDialogOpen(open); if (!open) setSampleNotes(""); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-amber-600" />
                  Converter em Pedido de Amostra
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Ao converter em amostra, o valor de venda será zerado. O custo será registrado como investimento da empresa.
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 font-medium">
                    Custo registrado: {formatBRL(parseFloat(String(quote.totalAmount)))}
                  </p>
                </div>
                <div>
                  <Label>Observações (opcional)</Label>
                  <textarea
                    className="w-full mt-1 p-2 border rounded-md text-sm bg-background"
                    rows={3}
                    value={sampleNotes}
                    onChange={e => setSampleNotes(e.target.value)}
                    placeholder="Ex: Amostra para apresentação ao cliente..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSampleDialogOpen(false)}>Cancelar</Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => createSampleMutation.mutate({ quoteId: Number(id), notes: sampleNotes || undefined })}
                  disabled={createSampleMutation.isPending}
                >
                  {createSampleMutation.isPending ? "Convertendo..." : "Confirmar Conversão"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog: Vincular Amostra a Orçamento */}
          {sampleQuery.data && (
            <Dialog open={sampleLinkDialogOpen} onOpenChange={(open) => { setSampleLinkDialogOpen(open); if (!open) { setSampleLinkQuoteNumber(""); setSampleLinkNotes(""); } }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-blue-600" />
                    Vincular Amostra a Orçamento
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label>Número do Orçamento a vincular</Label>
                    <Input
                      className="mt-1"
                      value={sampleLinkQuoteNumber}
                      onChange={e => setSampleLinkQuoteNumber(e.target.value)}
                      placeholder="Ex: ORC 04.0123-25"
                    />
                  </div>
                  <div>
                    <Label>Tipo de vinculação</Label>
                    <Select value={sampleLinkType} onValueChange={(v) => setSampleLinkType(v as any)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="associar">Apenas associar (mesma obra)</SelectItem>
                        <SelectItem value="cobrar">Cobrar valor da amostra</SelectItem>
                        <SelectItem value="diluir">Diluir valor no pedido</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sampleLinkType === "associar" && "Vincula sem cobrar — apenas para rastreabilidade."}
                      {sampleLinkType === "cobrar" && "O valor da amostra será cobrado integralmente no pedido vinculado."}
                      {sampleLinkType === "diluir" && "O valor da amostra será diluído proporcionalmente no pedido."}
                    </p>
                  </div>
                  <div>
                    <Label>Observações (opcional)</Label>
                    <textarea
                      className="w-full mt-1 p-2 border rounded-md text-sm bg-background"
                      rows={2}
                      value={sampleLinkNotes}
                      onChange={e => setSampleLinkNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSampleLinkDialogOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={async () => {
                      if (!sampleLinkQuoteNumber.trim()) { toast.error("Informe o número do orçamento."); return; }
                      // Buscar o quoteId pelo número
                      const allQuotes = utils.quotes.list.getData() as any;
                      const target = (allQuotes?.rows ?? allQuotes ?? [])?.find((q: any) => q.quoteNumber === sampleLinkQuoteNumber.trim());
                      if (!target) { toast.error("Orçamento não encontrado. Verifique o número."); return; }
                      linkSampleMutation.mutate({
                        sampleOrderId: sampleQuery.data!.id,
                        linkedQuoteId: target.id,
                        linkType: sampleLinkType,
                        notes: sampleLinkNotes || undefined,
                      });
                    }}
                    disabled={linkSampleMutation.isPending || !sampleLinkQuoteNumber.trim()}
                  >
                    {linkSampleMutation.isPending ? "Vinculando..." : "Vincular"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Seção de Amostra vinculada */}
        {sampleQuery.data && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <FlaskConical className="w-4 h-4" />
                Pedido de Amostra
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo registrado:</span>
                <span className="font-medium">{formatBRL(parseFloat(String(sampleQuery.data.costAmount)))}</span>
              </div>
              {sampleQuery.data.notes && (
                <div className="text-muted-foreground italic">"{sampleQuery.data.notes}"</div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className={sampleQuery.data.status === "linked" ? "border-green-400 text-green-700" : "border-amber-400 text-amber-700"}>
                  {sampleQuery.data.status === "active" ? "Ativo" : sampleQuery.data.status === "linked" ? "Vinculado" : sampleQuery.data.status}
                </Badge>
              </div>
              {(sampleQuery.data as any).links?.length > 0 && (
                <div className="border-t pt-2 mt-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Vinculações:</p>
                  {((sampleQuery.data as any).links as any[]).map((link: any) => (
                    <div key={link.id} className="flex items-center justify-between text-xs bg-background rounded px-2 py-1">
                      <span>Orç. #{link.linkedQuoteId} — {link.linkType === "cobrar" ? "Cobrar" : link.linkType === "diluir" ? "Diluir" : "Associar"}</span>
                      <Button variant="ghost" size="sm" className="h-5 px-1 text-red-500" onClick={() => unlinkSampleMutation.mutate({ id: link.id, sampleOrderId: sampleQuery.data!.id })}>
                        <XIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" className="gap-1 mt-2" onClick={() => setSampleLinkDialogOpen(true)}>
                <Link2 className="w-3 h-3" />
                Vincular a Orçamento
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Itens da versão atual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Itens do Orçamento (RV{quote.revisionCount ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(() => {
              const rtPct = quote.rtPercent ? parseFloat(String(quote.rtPercent)) : 0;
              const mPct = quote.marginPercent ? parseFloat(String(quote.marginPercent)) : 0;
              const applyMkup = (base: number) => {
                const comRT = rtPct > 0 ? base / (1 - rtPct) : base;
                return mPct > 0 ? comRT / (1 - mPct) : comRT;
              };
              const applyMkupWithItem = (base: number, itemMarginPercent?: number | null) => {
                const afterGlobal = applyMkup(base);
                return applyItemMarginQD(afterGlobal, itemMarginPercent);
              };
              const hasMarkup = rtPct > 0 || mPct > 0;

              // Agrupar itens por pavimento preservando a ordem de inserção
              const floorOrder: string[] = [];
              const floorMap = new Map<string, typeof currentItemsMigrated>();
              for (const item of currentItemsMigrated) {
                const d = parseCartItemData(item.itemData);
                const fid = d?.floorId?.trim() || '__sem_pavimento__';
                if (!floorMap.has(fid)) { floorMap.set(fid, []); floorOrder.push(fid); }
                floorMap.get(fid)!.push(item);
              }
              const hasFloors = floorOrder.some(fid => fid !== '__sem_pavimento__');

              // Calcular totais globais
              let totalLuminaria = 0;
              let totalDriver = 0;
              let totalGeral = 0;
              let hasDriverBreakdown = false;
              for (const item of currentItemsMigrated) {
                const d = parseCartItemData(item.itemData);
                if (!d) continue;
                // Itens "Não Orçamos" são apenas indicativos e não entram no total
                if (d.category === 'Não Orçamos') continue;
                if (d.driverLines && d.driverLines.length > 0) {
                  hasDriverBreakdown = true;
                  // Resolver priceWithoutDriver: campo dedicado, fallback derivado de (totalPrice - driversTotalPrice), ou unitPrice
                  const _drvTotal2 = d.driverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
                  const _derivedUnitLum2 = (d.unitPriceLuminaria == null && d.totalPrice != null && d.totalPrice > 0 && d.qty > 0)
                    ? Math.max(0, d.totalPrice - _drvTotal2) / d.qty
                    : null;
                  const _resolvedUnitLum2 = d.unitPriceLuminaria ?? _derivedUnitLum2 ?? null;
                  let correctedPriceWithoutDriver: number | null = null;
                  if (d.priceWithoutDriver != null) {
                    const isUnitOnly = d.unitPriceLuminaria != null && Math.abs(d.priceWithoutDriver - d.unitPriceLuminaria) < 0.02 && d.qty > 1;
                    correctedPriceWithoutDriver = isUnitOnly ? d.unitPriceLuminaria! * d.qty : d.priceWithoutDriver;
                  } else if (_resolvedUnitLum2 != null) {
                    correctedPriceWithoutDriver = _resolvedUnitLum2 * d.qty;
                  } else if (d.totalPrice != null && d.totalPrice > 0) {
                    correctedPriceWithoutDriver = Math.max(0, d.totalPrice - _drvTotal2);
                  }
                  const lumRaw = correctedPriceWithoutDriver ?? (d.totalPrice ?? 0);
                  const drvRaw = d.driverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
                  const itemTotalRaw = lumRaw + drvRaw;
                  totalGeral += applyMkupWithItem(itemTotalRaw, d.itemMarginPercent);
                  totalLuminaria += applyMkupWithItem(lumRaw, d.itemMarginPercent);
                  totalDriver += applyMkupWithItem(drvRaw, d.itemMarginPercent);
                } else {
                  const tot = d.totalPrice != null && d.totalPrice > 0 ? applyMkupWithItem(d.totalPrice, d.itemMarginPercent) : 0;
                  totalGeral += tot;
                  totalLuminaria += tot;
                }
              }

              // Diluição proporcional por item
              const _diluicaoTotal = (quote as any).diluicaoValor != null ? parseFloat(String((quote as any).diluicaoValor)) : 0;
              // Frete diluído nos itens: quando freteIncluded=true, o valor do frete é distribuído proporcionalmente
              const _freteIncluded = (quote as any).freteIncluded ?? false;
              const _freteValue = (quote as any).freteValue ? parseFloat(String((quote as any).freteValue)) : 0;
              const _freteIsento = (quote as any).freteIsento ?? false;
              const _freteParaDiluir = (_freteIncluded && !_freteIsento && _freteValue > 0) ? _freteValue : 0;
              // Calcular peso total (soma dos totais de cada item antes da diluição) para distribuição proporcional
              const _diluicaoBase = totalGeral; // totalGeral já é a soma com markup
              const getItemDiluicaoFrac = (itemTotal: number): number => {
                if (_diluicaoTotal <= 0 || _diluicaoBase <= 0) return 0;
                return _diluicaoTotal * (itemTotal / _diluicaoBase);
              };
              // Frete diluído proporcional por item (baseado no totalPrice bruto, antes de RT/margem)
              const _freteBase = currentItemsMigrated.reduce((s, it) => {
                const _d = parseCartItemData(it.itemData);
                if (!_d || _d.category === 'Não Orçamos') return s;
                return s + (_d.totalPrice ?? 0);
              }, 0);
              const getItemFreteFrac = (itemTotalRaw: number): number => {
                if (_freteParaDiluir <= 0 || _freteBase <= 0) return 0;
                return _freteParaDiluir * (itemTotalRaw / _freteBase);
              };
              let globalIdx = 0;
              return (
                <>
                  {floorOrder.map((fid) => {
                    const fitems = floorMap.get(fid)!;
                    const d0 = parseCartItemData(fitems[0].itemData);
                    const floorLabel = d0?.floorName?.trim() || (fid !== '__sem_pavimento__' ? fid : '');
                    return (
                      <div key={fid}>
                        {hasFloors && floorLabel && (
                          <div className="px-4 py-2 bg-muted/60 border-b border-t">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{floorLabel}</p>
                          </div>
                        )}
                        <div className="divide-y">
                          {fitems.map((item) => {
                            const d = parseCartItemData(item.itemData);
                            if (!d) return null;
                            const itemIdx = ++globalIdx;
                            const unitDisplay = d.unitPrice != null && d.unitPrice > 0
                              ? applyMkupWithItem(d.unitPrice, d.itemMarginPercent)
                              : null;
                            const totalDisplay = d.totalPrice != null && d.totalPrice > 0
                              ? applyMkupWithItem(d.totalPrice, d.itemMarginPercent)
                              : null;
                            const hasBreakdown = !!(d.driverLines && d.driverLines.length > 0);
                            // Fallback: quando unitPrice é null mas totalPrice > 0, derivar unitPrice = totalPrice / qty
                            const _derivedUnitPricePreview = (d.unitPrice == null && d.totalPrice != null && d.totalPrice > 0 && d.qty > 0)
                              ? d.totalPrice / d.qty
                              : null;
                            const _effectiveUnitPricePreview = d.unitPrice ?? _derivedUnitPricePreview;
                            // Para itens com breakdown: derivar unitPriceLuminaria = (totalPrice - driversTotalPrice) / qty
                            // quando o campo não está salvo (itens legados)
                            const _drvTotalForLum = hasBreakdown
                              ? (d.driverLines ?? []).reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0)
                              : 0;
                            const _derivedUnitLumFromTotal = (hasBreakdown && d.unitPriceLuminaria == null && d.totalPrice != null && d.totalPrice > 0 && d.qty > 0)
                              ? Math.max(0, d.totalPrice - _drvTotalForLum) / d.qty
                              : null;
                            // Resolver unitPriceLuminaria: usa o campo dedicado, depois fallback derivado, depois unitPrice (sem driver)
                            const _resolvedUnitLum = hasBreakdown
                              ? (d.unitPriceLuminaria ?? _derivedUnitLumFromTotal ?? null)
                              : null;
                            // Corrigir itens antigos onde priceWithoutDriver foi salvo como valor unitário
                            let _correctedPWD: number | null = null;
                            if (hasBreakdown) {
                              if (d.priceWithoutDriver != null) {
                                const _isUnitOnly = d.unitPriceLuminaria != null && Math.abs(d.priceWithoutDriver - d.unitPriceLuminaria) < 0.02 && d.qty > 1;
                                _correctedPWD = _isUnitOnly ? d.unitPriceLuminaria! * d.qty : d.priceWithoutDriver;
                              } else if (_resolvedUnitLum != null) {
                                _correctedPWD = _resolvedUnitLum * d.qty;
                              } else if (d.totalPrice != null && d.totalPrice > 0) {
                                // Fallback final: totalPrice - driversTotalPrice
                                _correctedPWD = Math.max(0, d.totalPrice - _drvTotalForLum);
                              }
                            }
                            const lumTotalDisplay = _correctedPWD != null
                              ? applyMkupWithItem(_correctedPWD, d.itemMarginPercent)
                              : null;
                            const lumUnitDisplay = hasBreakdown && _resolvedUnitLum != null
                              ? applyMkupWithItem(_resolvedUnitLum, d.itemMarginPercent)
                              : null;
                            // Total item correto: luminaria + todos os drivers
                            const _driversTotalRaw = hasBreakdown
                              ? d.driverLines!.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0)
                              : 0;
                            const _lumTotalRaw = _correctedPWD ?? (d.totalPrice ?? 0);
                            const _correctTotalItem = hasBreakdown
                              ? (_lumTotalRaw + _driversTotalRaw)
                              : (d.totalPrice ?? 0);
                            const _correctTotalWithMkup = _correctTotalItem > 0
                              ? applyMkupWithItem(_correctTotalItem, d.itemMarginPercent)
                              : 0;
                            // Diluição proporcional ao peso deste item
                            const _itemDiluicao = getItemDiluicaoFrac(_correctTotalWithMkup);
                            // Frete diluído proporcional ao peso bruto deste item (antes de RT/margem)
                            // IMPORTANTE: frete entra na base ANTES do RT/margem (igual ao ExcelPreviewModal)
                            const _itemFreteRaw = getItemFreteFrac(_correctTotalItem > 0 ? _correctTotalItem : (d.totalPrice ?? 0));
                            // Recalcular total do item com frete incluído na base (antes do markup)
                            const _correctTotalWithFrete = _correctTotalItem > 0
                              ? applyMkupWithItem(_correctTotalItem + _itemFreteRaw, d.itemMarginPercent)
                              : 0;
                            const _itemFreteComMkup = _correctTotalWithFrete - _correctTotalWithMkup;
                            const correctTotalDisplay = _correctTotalWithMkup > 0
                              ? _correctTotalWithFrete + _itemDiluicao
                              : null;
                            // Distribuição da diluição + frete entre luminária e driver proporcionalmente
                            const _lumWithMkup = lumTotalDisplay ?? 0;
                            const _drvWithMkup = hasBreakdown
                              ? d.driverLines!.reduce((s, dl) => s + (dl.driverTotalPrice != null ? applyMkupWithItem(dl.driverTotalPrice, d.itemMarginPercent) : 0), 0)
                              : 0;
                            const _itemTotalForRatio = _lumWithMkup + _drvWithMkup;
                            // Combinar diluição + frete para distribuir proporcionalmente
                            const _totalAdicional = _itemDiluicao + _itemFreteComMkup;
                            const _lumDiluicaoFrac = _itemTotalForRatio > 0 ? _totalAdicional * (_lumWithMkup / _itemTotalForRatio) : _totalAdicional;
                            const lumTotalDisplayWithDil = lumTotalDisplay != null ? lumTotalDisplay + _lumDiluicaoFrac : null;
                            const lumUnitDisplayWithDil = lumUnitDisplay != null && d.qty > 0 ? lumTotalDisplayWithDil != null ? lumTotalDisplayWithDil / d.qty : null : null;
                            return (
                              <div key={String(item.id)} className="flex items-start gap-3 px-4 py-3">
                                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {itemIdx}
                                </span>
                                {resolvePhoto(d.sku, d.photoUrl) ? (
                                  <img src={resolvePhoto(d.sku, d.photoUrl)!} alt={d.description} className="w-12 h-12 object-contain rounded border bg-white flex-shrink-0" />
                                ) : (
                                  <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                                    <Package className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  {d.category !== 'Não Orçamos' && <p className="text-xs text-muted-foreground font-mono">{d.sku}</p>}
                                  <p className="text-sm font-medium leading-tight">{d.description}</p>
                                  <div className="flex gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                    {d.power && <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />{d.power}</span>}
                                    {d.cct && <span>{d.cct}</span>}
                                    <span>{d.category}</span>
                                    {d.itemEmPlanta && (
                                      <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded px-1.5 py-0.5 font-medium">
                                        <MapPin className="w-3 h-3" />{d.itemEmPlanta}
                                      </span>
                                    )}
                                  </div>
                                  {d.itemObs && (
                                    <div className="mt-1.5 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">
                                      <span className="font-medium flex-shrink-0">Obs:</span>
                                      <span className="break-words">{d.itemObs}</span>
                                    </div>
                                  )}
                                  {d.accessories && (d.accessories as LinkedAccessory[]).length > 0 && (
                                    <div className="mt-1.5 border-l-2 border-cyan-500/40 pl-2 space-y-0.5">
                                      {(d.accessories as LinkedAccessory[]).map((acc, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-xs">
                                          {resolveAccPhoto(acc.codigo, acc.fotoUrl) ? (
                                            <img src={resolveAccPhoto(acc.codigo, acc.fotoUrl)!} alt={acc.descricao} className="w-5 h-5 object-contain rounded bg-white border border-border flex-shrink-0" />
                                          ) : (
                                            <Wrench className="w-3 h-3 flex-shrink-0 text-cyan-500" />
                                          )}
                                          <span className="font-mono text-[10px] text-muted-foreground">{acc.codigo}</span>
                                          <span className="text-cyan-700 dark:text-cyan-400 truncate">{acc.descricao}</span>
                                          {acc.qty > 1 && <span className="text-muted-foreground">x{acc.qty}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                </div>
                                <div className="text-right flex-shrink-0 min-w-[110px]">
                                  <p className="text-xs text-muted-foreground mb-1">Qtd: {d.qty}</p>
                                  {hasBreakdown ? (
                                    <>
                                      <div className="mb-1">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Luminária</p>
                                        {lumUnitDisplayWithDil != null && <p className="text-xs text-muted-foreground">{formatBRL(lumUnitDisplayWithDil)}/un</p>}
                                        {lumTotalDisplayWithDil != null
                                          ? <p className="font-semibold text-foreground text-sm">{formatBRL(lumTotalDisplayWithDil)}</p>
                                          : <p className="text-xs italic text-muted-foreground">A consultar</p>}
                                      </div>
                                      {d.driverLines!.map((dl, di) => {
                                        const drvUnitRaw = dl.driverUnitPrice != null ? applyMkupWithItem(dl.driverUnitPrice, d.itemMarginPercent) : null;
                                        const drvTotalRaw = dl.driverTotalPrice != null ? applyMkupWithItem(dl.driverTotalPrice, d.itemMarginPercent) : null;
                                        // Diluição + frete proporcional ao peso deste driver dentro do item
                                        const _drvItemWeight = drvTotalRaw ?? 0;
                                        const _drvAdicional = _itemTotalForRatio > 0 ? _totalAdicional * (_drvItemWeight / _itemTotalForRatio) : 0;
                                        const drvTotalWithDil = drvTotalRaw != null ? drvTotalRaw + _drvAdicional : null;
                                        const drvUnitWithDil = drvUnitRaw != null && dl.driverQty > 0 ? drvTotalWithDil != null ? drvTotalWithDil / dl.driverQty : null : null;
                                        return (
                                          <div key={di} className="mb-1">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Driver{d.driverLines!.length > 1 ? ` ${di + 1}` : ''}</p>
                                            <p className="text-[10px] font-mono text-muted-foreground">{dl.driverCode}</p>
                                            {drvUnitWithDil != null && <p className="text-xs text-muted-foreground">{formatBRL(drvUnitWithDil)}/un</p>}
                                            {drvTotalWithDil != null
                                              ? <p className="font-semibold text-foreground text-sm">{formatBRL(drvTotalWithDil)}</p>
                                              : <p className="text-xs italic text-muted-foreground">A consultar</p>}
                                          </div>
                                        );
                                      })}

                                      <div className="pt-1 border-t border-border/50">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Total item</p>
                                        {correctTotalDisplay != null
                                          ? <p className="font-bold text-primary text-sm">{formatBRL(correctTotalDisplay)}</p>
                                          : <p className="text-xs italic text-muted-foreground">A consultar</p>}
                                      </div>
                                    </>
                                  ) : d.category === 'Não Orçamos' ? (
                                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 italic">Sem preço</p>
                                  ) : (
                                    <>
                                      {/* Para itens sem breakdown, diluição + frete já estão em _itemDiluicao + _itemFreteComMkup */}
                                      {unitDisplay != null && <p className="text-xs text-muted-foreground">{formatBRL(unitDisplay + ((_itemDiluicao + _itemFreteComMkup) / (d.qty || 1)))}/un</p>}
                                      {totalDisplay != null
                                        ? <p className="font-bold text-primary text-sm">{formatBRL(totalDisplay + _itemDiluicao + _itemFreteComMkup)}</p>
                                        : <p className="text-xs italic text-muted-foreground">A consultar</p>}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {totalGeral > 0 && (
                    <div className="border-t bg-primary/5">
                      {hasDriverBreakdown && (() => {
                        // Calcular subtotais com frete diluído na base
                        let _totalLumComFrete = 0;
                        let _totalDrvComFrete = 0;
                        for (const _it of currentItemsMigrated) {
                          const _d2 = parseCartItemData(_it.itemData);
                          if (!_d2 || _d2.category === 'Não Orçamos') continue;
                          const _drvT2 = (_d2.driverLines && _d2.driverLines.length > 0)
                            ? _d2.driverLines.reduce((sd, dl) => sd + (dl.driverTotalPrice ?? 0), 0) : 0;
                          const _lumT2 = (_d2.driverLines && _d2.driverLines.length > 0)
                            ? (_d2.priceWithoutDriver != null && _d2.priceWithoutDriver > 0 ? _d2.priceWithoutDriver : Math.max(0, (_d2.totalPrice ?? 0) - _drvT2))
                            : (_d2.totalPrice ?? 0);
                          const _itemRaw2 = _lumT2 + _drvT2;
                          const _itemFrete2 = _freteBase > 0 ? _freteParaDiluir * (_itemRaw2 / _freteBase) : 0;
                          const _lumFrete2 = _itemRaw2 > 0 ? _itemFrete2 * (_lumT2 / _itemRaw2) : 0;
                          const _drvFrete2 = _itemRaw2 > 0 ? _itemFrete2 * (_drvT2 / _itemRaw2) : 0;
                          if (_d2.driverLines && _d2.driverLines.length > 0) {
                            _totalLumComFrete += applyMkupWithItem(_lumT2 + _lumFrete2, _d2.itemMarginPercent);
                            _totalDrvComFrete += applyMkupWithItem(_drvT2 + _drvFrete2, _d2.itemMarginPercent);
                          } else {
                            _totalLumComFrete += applyMkupWithItem(_lumT2 + _itemFrete2, _d2.itemMarginPercent);
                          }
                        }
                        const _totalComFreteGlobal = _totalLumComFrete + _totalDrvComFrete;
                        return (
                          <div className="px-4 pt-3 pb-1 space-y-1">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Subtotal Luminárias</span>
                              <span className="font-medium">{formatBRL(_totalLumComFrete + (_diluicaoTotal > 0 && _totalComFreteGlobal > 0 ? _diluicaoTotal * (_totalLumComFrete / _totalComFreteGlobal) : 0))}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Subtotal Drivers</span>
                              <span className="font-medium">{formatBRL(_totalDrvComFrete + (_diluicaoTotal > 0 && _totalComFreteGlobal > 0 ? _diluicaoTotal * (_totalDrvComFrete / _totalComFreteGlobal) : 0))}</span>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="px-4 py-3 flex justify-between items-center border-t border-primary/10">
                        <span className="text-sm font-medium">Total{_freteParaDiluir > 0 ? " (c/ frete diluído)" : ""}</span>
                        <span className="text-xl font-bold text-primary">{formatBRL(
                          _freteParaDiluir > 0
                            ? (() => {
                                // Recalcular total com frete na base (igual ao ExcelPreviewModal)
                                const _totalBaseRaw = currentItemsMigrated.reduce((s, it) => {
                                  const _d = parseCartItemData(it.itemData);
                                  if (!_d || _d.category === 'Não Orçamos') return s;
                                  const _drvT = (_d.driverLines && _d.driverLines.length > 0)
                                    ? _d.driverLines.reduce((sd, dl) => sd + (dl.driverTotalPrice ?? 0), 0) : 0;
                                  const _lumT = (_d.driverLines && _d.driverLines.length > 0)
                                    ? (_d.priceWithoutDriver != null && _d.priceWithoutDriver > 0 ? _d.priceWithoutDriver : Math.max(0, (_d.totalPrice ?? 0) - _drvT))
                                    : (_d.totalPrice ?? 0);
                                  const _itemRaw = _lumT + _drvT;
                                  const _itemFrete = _freteBase > 0 ? _freteParaDiluir * (_itemRaw / _freteBase) : 0;
                                  return s + applyMkupWithItem(_itemRaw + _itemFrete, _d.itemMarginPercent);
                                }, 0);
                                return _totalBaseRaw + _diluicaoTotal;
                              })()
                            : totalGeral + _diluicaoTotal
                        )}</span>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Dashboard de Lucro por Orçamento — apenas privilegiados */}
        {(() => {
          const ue = ((user as any)?.email ?? "").toLowerCase();
          const isCostPriv = (user as any)?.role === 'admin' || COST_PRIVILEGED_EMAILS.map(e => e.toLowerCase()).includes(ue);
          if (!isCostPriv) return null;
          // Calcular custo total dos itens especiais
          const rtPctProfit = quote.rtPercent ? parseFloat(String(quote.rtPercent)) : 0;
          const mPctProfit = quote.marginPercent ? parseFloat(String(quote.marginPercent)) : 0;
          let totalReceita = 0;
          let totalCustoEspeciais = 0;
          for (const item of currentItemsMigrated) {
            const d = parseCartItemData(item.itemData);
            if (!d) continue;
            const qty = d.qty ?? 1;
            // Receita do item (preço de venda com markup aplicado)
            let itemRevenue = 0;
            if (d.driverLines && d.driverLines.length > 0) {
              const lumTotal = (d.unitPriceLuminaria ?? 0) * qty;
              const drvTotal = d.driverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
              itemRevenue = lumTotal + drvTotal;
            } else if (d.totalPrice != null && d.totalPrice > 0) {
              itemRevenue = d.totalPrice;
            } else {
              itemRevenue = (d.unitPrice ?? 0) * qty;
            }
            // Aplicar RT e margem global
            if (rtPctProfit > 0) itemRevenue = itemRevenue / (1 - rtPctProfit);
            if (mPctProfit > 0) itemRevenue = itemRevenue / (1 - mPctProfit);
            // Aplicar margem individual
            if (d.itemMarginPercent != null && d.itemMarginPercent > 0) {
              itemRevenue = itemRevenue / (1 - d.itemMarginPercent / 100);
            }
            totalReceita += itemRevenue;
            // Custo dos itens especiais
            if (d.isSpecialItem && d.specialCustoUnitario != null && d.specialCustoUnitario > 0) {
              totalCustoEspeciais += d.specialCustoUnitario * qty;
            }
          }
          return (
            <QuoteProfitDashboard
              quoteId={quote.id}
              totalReceita={totalReceita}
              totalCustoEspeciais={totalCustoEspeciais}
              user={user}
            />
          );
        })()}

        {/* Histórico de versões */}
        {versions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Histórico de Revisões ({versions.length})
                </CardTitle>
                {/* Botão de edição manual de revisão — somente gestores */}
                {((user as any)?.role === 'admin' || (user as any)?.role === 'gerente' || MANAGER_EMAILS.includes(((user as any)?.email ?? "").toLowerCase())) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setManualRevisionValue(String(quote.revisionCount ?? 0));
                      setSetRevisionDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                    Alterar RV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {visibleVersions.map(v => {
                  const vItems = items.filter(i => i.quoteVersionId === v.id);
                  const isCurrentVersion = v.version === quote.currentVersion;
                  const vTotalBase = v.totalFinal && Number(v.totalFinal) > 0
                    ? Number(v.totalFinal)
                    : (v.totalAmount ? Number(v.totalAmount) : 0);
                  // Somar diluição ao total exibido em todas as versões (diluicaoValor fica no quote e vale para todas)
                  const vDiluicao = canSeeCommission && (quote as any).diluicaoValor
                    ? parseFloat(String((quote as any).diluicaoValor))
                    : 0;
                  const vTotal = vTotalBase + vDiluicao;
                  return (
                    <div key={v.id} className={`px-4 py-3 ${isCurrentVersion ? 'bg-primary/5' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">
                            {isCurrentVersion
                              ? `RV${quote.revisionCount ?? 0}`
                              : `Snapshot ${versionToRV(v.id)}`
                            }
                            {isCurrentVersion && (
                              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Atual</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {toBrasiliaDateTime(v.createdAt)}
                            {v.assistantName && ` · ${v.assistantName}`}
                            {v.vendorName && ` · ${v.vendorName}`}
                          </p>
                          {v.versionNotes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">"{v.versionNotes}"</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{vItems.length} iten{vItems.length !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <p className="text-sm font-bold text-primary">
                            {vTotal > 0 ? formatBRL(vTotal) : "—"}
                          </p>
                          <div className="flex gap-1">
                            {/* Botão Visualizar itens da revisão */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs h-7 px-2"
                              onClick={() => {
                                setRevisionModalVersionId(v.id);
                                setRevisionPreviewOpen(true);
                              }}
                              title="Visualizar itens desta revisão"
                            >
                              <Eye className="w-3 h-3" />
                              Ver
                            </Button>
                            {/* Botão Baixar Excel da revisão */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs h-7 px-2 border-green-500/40 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                              onClick={async () => {
                                setRevisionModalVersionId(v.id);
                                // Buscar itens e gerar Excel diretamente
                                try {
                                  // Se os itens já estão no cache local (vItems), usar diretamente
                                  if (vItems.length > 0) {
                                    await handleGenerateRevisionExcel(v, vItems);
                                  } else {
                                    // Caso contrário, buscar via API
                                    toast.info("Carregando itens da revisão...");
                                    const result = await utils.quotes.getRevisionItems.fetch({ quoteId: Number(id), versionId: v.id });
                                    await handleGenerateRevisionExcel(v, result.items);
                                  }
                                } catch (err) {
                                  toast.error("Erro ao carregar itens da revisão.");
                                }
                              }}
                              title="Baixar Excel desta revisão"
                            >
                              <FileSpreadsheet className="w-3 h-3" />
                              Excel
                            </Button>
                          </div>
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

        {/* Modal de visualização de revisão histórica */}
        <Dialog open={revisionPreviewOpen} onOpenChange={(open) => { if (!open) { setRevisionPreviewOpen(false); } }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-4 h-4" />
                {revisionModalVersionId != null && (() => {
                  const v = versions.find(vv => vv.id === revisionModalVersionId);
                  if (!v) return 'Revisão';
                  const isCurrentV = v.version === quote.currentVersion;
                  const label = isCurrentV ? `RV${quote.revisionCount ?? 0}` : `Snapshot ${versionToRV(v.id)}`;
                  return `${label} — ${toBrasiliaDate(v.createdAt)}`;
                })()}
              </DialogTitle>
            </DialogHeader>
            {revisionItemsQuery.isLoading && (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground text-sm">Carregando itens...</p>
              </div>
            )}
            {revisionItemsQuery.data && (() => {
              const { version: rv, items: rvItems } = revisionItemsQuery.data;
              const snap = (() => { try { return JSON.parse(rv.headerSnapshot ?? '{}'); } catch { return {}; } })();
              const rtPct = quote.rtPercent ? parseFloat(String(quote.rtPercent)) : 0;
              const mPct = quote.marginPercent ? parseFloat(String(quote.marginPercent)) : 0;
              const applyMkup = (base: number) => {
                const comRT = rtPct > 0 ? base / (1 - rtPct) : base;
                return mPct > 0 ? comRT / (1 - mPct) : comRT;
              };
              const applyMkupWithItem = (base: number, itemMarginPercent?: number | null) => {
                const afterGlobal = applyMkup(base);
                return applyItemMarginQD(afterGlobal, itemMarginPercent);
              };
              const hasMarkup = rtPct > 0 || mPct > 0;
              let totalGeral = 0;
              for (const item of rvItems) {
                const d = parseCartItemData(item.itemData);
                if (!d) continue;
                const tot = d.totalPrice != null && d.totalPrice > 0 ? applyMkupWithItem(d.totalPrice, d.itemMarginPercent) : 0;
                totalGeral += tot;
              }
              return (
                <div className="space-y-3">
                  {/* Info da revisão */}
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                    {snap.clientName && <p><span className="font-medium">Cliente:</span> {snap.clientName}</p>}
                    {snap.projectName && <p><span className="font-medium">Obra:</span> {snap.projectName}</p>}
                    {snap.vendorName && <p><span className="font-medium">Vendedor:</span> {snap.vendorName}</p>}
                    {snap.assistantName && <p><span className="font-medium">Assistente:</span> {snap.assistantName}</p>}
                    {rv.versionNotes && <p className="italic">"{rv.versionNotes}"</p>}
                  </div>
                  {/* Lista de itens */}
                  <div className="divide-y border rounded-lg overflow-hidden">
                    {rvItems.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">Nenhum item nesta revisão.</p>
                    )}
                    {rvItems.map((item: { itemData: string }, idx: number) => {
                      const d = parseCartItemData(item.itemData);
                      if (!d) return null;
                      const tot = d.totalPrice != null && d.totalPrice > 0 ? applyMkupWithItem(d.totalPrice, d.itemMarginPercent) : null;
                      return (
                        <div key={idx} className="px-3 py-2 flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            {d.category !== 'Não Orçamos' && <p className="text-xs font-mono text-muted-foreground">{d.sku}</p>}
                            <p className="text-sm font-medium leading-tight truncate">{d.description}</p>
                            {d.floorName && <p className="text-xs text-muted-foreground">{d.floorName}</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-muted-foreground">Qtd: {d.qty}</p>
                            {tot != null ? (
                              <p className="text-sm font-bold text-primary">{formatBRL(tot)}</p>
                            ) : (
                              <p className="text-xs italic text-muted-foreground">A consultar</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Total */}
                  {totalGeral > 0 && (
                    <div className="flex justify-between items-center border-t pt-3">
                      <span className="text-sm font-medium">Total</span>
                      <span className="text-lg font-bold text-primary">{formatBRL(totalGeral)}</span>
                    </div>
                  )}
                  {/* Botões de ação */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => handleGenerateRevisionExcel(rv, rvItems)}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Baixar Excel {rv.version === quote.currentVersion ? `RV${quote.revisionCount ?? 0}` : `Snapshot ${versionToRV(rv.id)}`}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRevisionPreviewOpen(false)}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

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

      {/* Pré-visualização Excel — sem criar revisão */}
      <ExcelPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        items={currentItemsMigrated.map(i => parseCartItemData(i.itemData)).filter((d): d is CartItemData => d !== null)}
        freshPhotoMap={productPhotoMap}
        formData={{
          cliente: quote.clientName,
          contato: quote.clientContact ?? "",
          tel: quote.clientPhone ?? "",
          email: quote.clientEmail ?? "",
          obra: quote.projectName ?? "",
          referencia: quote.projectRef ?? "",
          numero: quote.quoteNumber,
          data: toBrasiliaDate(quote.updatedAt ?? quote.createdAt),
          arquiteto: (quote as any).arquiteto ?? undefined,
          lightDesigner: (quote as any).lightDesigner ?? undefined,
          seller1Name: quote.seller1Name ?? undefined,
          seller1Phone: editSellers.find(s => s.id === quote.seller1Id)?.phone ?? undefined,
          seller2Name: quote.seller2Name ?? undefined,
          seller2Phone: editSellers.find(s => s.id === quote.seller2Id)?.phone ?? undefined,
          assistantName: quote.assistantName ?? undefined,
          rtPercent: quote.rtPercent ? parseFloat(String(quote.rtPercent)) : undefined,
          marginPercent: quote.marginPercent ? parseFloat(String(quote.marginPercent)) : undefined,
          discountPercent: (quote as any).discountPercent ? parseFloat(String((quote as any).discountPercent)) : undefined,
          showDiscount: !!(quote as any).showDiscount,
          freteType: (quote.freteType as "free" | "paid" | "night" | "consult" | "pickup") ?? "free",
          freteIsento: quote.freteIsento ?? false,
          freteLocalidade: (quote.freteLocalidade as "sp" | "other") ?? "sp",
          freteCity: (quote as any).freteCity ?? undefined,
          freteState: (quote as any).freteState ?? undefined,
          freteValue: (quote as any).freteValue ? parseFloat(String((quote as any).freteValue)) : undefined,
          freteIncluded: (quote as any).freteIncluded ?? false,
          revisionCount: quote.revisionCount ?? 0,
          deliveryDays: quote.deliveryDays ?? 20,
          paymentTerm: quote.paymentTerm ?? undefined,
          destState: quote.destState ?? undefined,
          difalEnabled: quote.difalEnabled ?? false,
          difalPercent: quote.difalPercent ? parseFloat(String(quote.difalPercent)) : undefined,
          difalValue: quote.difalValue ? parseFloat(String(quote.difalValue)) : undefined,
          fcpEnabled: quote.fcpEnabled ?? false,
          fcpPercent: quote.fcpPercent ? parseFloat(String(quote.fcpPercent)) : undefined,
          fcpValue: quote.fcpValue ? parseFloat(String(quote.fcpValue)) : undefined,
          diluicaoValor: (quote as any).diluicaoValor ? parseFloat(String((quote as any).diluicaoValor)) : undefined,
        }}
      />

      {/* PDF automático — mesmo modal mas dispara print imediatamente */}
      <ExcelPreviewModal
        open={pdfPrintOpen}
        onClose={() => setPdfPrintOpen(false)}
        autoPrint
        items={currentItemsMigrated.map(i => parseCartItemData(i.itemData)).filter((d): d is CartItemData => d !== null)}
        freshPhotoMap={productPhotoMap}
        formData={{
          cliente: quote.clientName,
          contato: quote.clientContact ?? "",
          tel: quote.clientPhone ?? "",
          email: quote.clientEmail ?? "",
          obra: quote.projectName ?? "",
          referencia: quote.projectRef ?? "",
          numero: quote.quoteNumber,
          data: toBrasiliaDate(quote.updatedAt ?? quote.createdAt),
          arquiteto: (quote as any).arquiteto ?? undefined,
          lightDesigner: (quote as any).lightDesigner ?? undefined,
          seller1Name: quote.seller1Name ?? undefined,
          seller1Phone: editSellers.find(s => s.id === quote.seller1Id)?.phone ?? undefined,
          seller2Name: quote.seller2Name ?? undefined,
          seller2Phone: editSellers.find(s => s.id === quote.seller2Id)?.phone ?? undefined,
          assistantName: quote.assistantName ?? undefined,
          rtPercent: quote.rtPercent ? parseFloat(String(quote.rtPercent)) : undefined,
          marginPercent: quote.marginPercent ? parseFloat(String(quote.marginPercent)) : undefined,
          discountPercent: (quote as any).discountPercent ? parseFloat(String((quote as any).discountPercent)) : undefined,
          showDiscount: !!(quote as any).showDiscount,
          freteType: (quote.freteType as "free" | "paid" | "night" | "consult" | "pickup") ?? "free",
          freteIsento: quote.freteIsento ?? false,
          freteLocalidade: (quote.freteLocalidade as "sp" | "other") ?? "sp",
          freteCity: (quote as any).freteCity ?? undefined,
          freteState: (quote as any).freteState ?? undefined,
          freteValue: (quote as any).freteValue ? parseFloat(String((quote as any).freteValue)) : undefined,
          freteIncluded: (quote as any).freteIncluded ?? false,
          revisionCount: quote.revisionCount ?? 0,
          deliveryDays: quote.deliveryDays ?? 20,
          paymentTerm: quote.paymentTerm ?? undefined,
          destState: quote.destState ?? undefined,
          difalEnabled: quote.difalEnabled ?? false,
          difalPercent: quote.difalPercent ? parseFloat(String(quote.difalPercent)) : undefined,
          difalValue: quote.difalValue ? parseFloat(String(quote.difalValue)) : undefined,
          fcpEnabled: quote.fcpEnabled ?? false,
          fcpPercent: quote.fcpPercent ? parseFloat(String(quote.fcpPercent)) : undefined,
          fcpValue: quote.fcpValue ? parseFloat(String(quote.fcpValue)) : undefined,
          diluicaoValor: (quote as any).diluicaoValor ? parseFloat(String((quote as any).diluicaoValor)) : undefined,
        }}
      />
      {/* Dialog de edição manual de revisão (somente gestores) */}
      <Dialog open={setRevisionDialogOpen} onOpenChange={setSetRevisionDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Alterar Número de Revisão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Altere manualmente o número de revisão exibido neste orçamento.
              O valor atual é <strong>RV{quote.revisionCount ?? 0}</strong>.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Novo número de revisão</label>
              <Input
                type="number"
                min={0}
                value={manualRevisionValue}
                onChange={e => setManualRevisionValue(e.target.value)}
                placeholder="Ex: 0, 1, 2..."
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setSetRevisionDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={setRevisionMutation.isPending || manualRevisionValue === ""}
              onClick={() => {
                const val = parseInt(manualRevisionValue, 10);
                if (isNaN(val) || val < 0) { toast.error("Valor inválido."); return; }
                setRevisionMutation.mutate({ id: Number(id), revisionCount: val });
              }}
            >
              {setRevisionMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pré-visualização do Pedido de Fábrica */}
      {orderPreviewForm && (
        <OrderPreviewModal
          open={orderPreviewOpen}
          onOpenChange={setOrderPreviewOpen}
          items={currentItemsMigrated.map(i => parseCartItemData(i.itemData)).filter((d): d is CartItemData => d !== null)}
          form={orderPreviewForm}
          descMap={componenteDescMap}
          onExcelGenerated={() => {
            logProductionSheetMutation.mutate({
              quoteId: quote.id,
              quoteNumber: quote.quoteNumber,
              empresa: (orderPreviewForm.empresa ?? "ALFALUX") as "ALFALUX" | "LUMINEW",
            });
          }}
        />
      )}
    </div>
  );
}

// ─── Dashboard de Lucro por Orçamento ─────────────────────────────────────────
interface QuoteProfitDashboardProps {
  quoteId: number;
  totalReceita: number;
  totalCustoEspeciais: number;
  user: unknown;
}

function QuoteProfitDashboard({ quoteId, totalReceita, totalCustoEspeciais, user }: QuoteProfitDashboardProps) {
  const [addCostOpen, setAddCostOpen] = useState(false);
  const [newCostDesc, setNewCostDesc] = useState("");
  const [newCostValor, setNewCostValor] = useState("");
  const utils = trpc.useUtils();

  const costsQuery = trpc.quoteAdditionalCosts.list.useQuery({ quoteId });
  const createCostMutation = trpc.quoteAdditionalCosts.create.useMutation({
    onSuccess: () => {
      utils.quoteAdditionalCosts.list.invalidate({ quoteId });
      setNewCostDesc("");
      setNewCostValor("");
      setAddCostOpen(false);
      toast.success("Custo adicional adicionado");
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteCostMutation = trpc.quoteAdditionalCosts.delete.useMutation({
    onSuccess: () => {
      utils.quoteAdditionalCosts.list.invalidate({ quoteId });
      toast.success("Custo removido");
    },
    onError: (err) => toast.error(err.message),
  });

  const additionalCosts = costsQuery.data ?? [];
  const totalAdditionalCosts = additionalCosts.reduce((s, c) => s + parseFloat(String(c.valor)), 0);
  const lucroLiquido = totalReceita - totalCustoEspeciais - totalAdditionalCosts;
  const margemLucro = totalReceita > 0 ? (lucroLiquido / totalReceita) * 100 : 0;

  return (
    <Card className="border-emerald-200 dark:border-emerald-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <TrendingUp className="w-4 h-4" />
          Dashboard de Lucro (interno)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo financeiro */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">Receita Total</p>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatBRL(totalReceita)}</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">Custo Itens Especiais</p>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{formatBRL(totalCustoEspeciais)}</p>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-center">
            <p className="text-xs text-muted-foreground">Custos Adicionais</p>
            <p className="text-sm font-bold text-red-700 dark:text-red-300">{formatBRL(totalAdditionalCosts)}</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${lucroLiquido >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
            <p className="text-xs text-muted-foreground">Lucro Líquido</p>
            <p className={`text-sm font-bold ${lucroLiquido >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
              {formatBRL(lucroLiquido)}
            </p>
            <p className="text-xs text-muted-foreground">({margemLucro.toFixed(1)}%)</p>
          </div>
        </div>

        {/* Lista de custos adicionais */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custos Adicionais</p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              onClick={() => setAddCostOpen(true)}
            >
              <PlusCircle className="w-3 h-3" />
              Incluir Custo Adicional
            </Button>
          </div>

          {additionalCosts.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhum custo adicional registrado.</p>
          ) : (
            <div className="space-y-1">
              {additionalCosts.map(cost => (
                <div key={cost.id} className="flex items-center justify-between bg-muted/30 rounded px-3 py-1.5">
                  <div>
                    <span className="text-sm">{cost.descricao}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {cost.createdAt ? new Date(cost.createdAt).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      -{formatBRL(parseFloat(String(cost.valor)))}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteCostMutation.mutate({ id: cost.id })}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dialog para adicionar custo */}
        <Dialog open={addCostOpen} onOpenChange={setAddCostOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Incluir Custo Adicional</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={newCostDesc}
                  onChange={e => setNewCostDesc(e.target.value)}
                  placeholder="ex: Assistência técnica, Frete extra"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Valor (R$)</Label>
                <Input
                  value={newCostValor}
                  onChange={e => setNewCostValor(e.target.value)}
                  placeholder="ex: 1000,00"
                  className="mt-1"
                />
              </div>
              <Button
                className="w-full"
                disabled={!newCostDesc.trim() || !newCostValor.trim() || createCostMutation.isPending}
                onClick={() => {
                  const valor = parseFloat(newCostValor.replace(',', '.'));
                  if (isNaN(valor) || valor <= 0) { toast.error("Valor inválido"); return; }
                  createCostMutation.mutate({ quoteId, descricao: newCostDesc.trim(), valor });
                }}
              >
                {createCostMutation.isPending ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
