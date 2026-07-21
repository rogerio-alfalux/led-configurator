import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, Factory, Plus, Trash2, FileSpreadsheet,
  ChevronDown, ChevronUp, Wrench, X, Search, Package,
  CheckCircle, Clock, Truck, AlertTriangle, Edit2, Save, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { CartItemData, LinkedAccessory, SpecialEquipment, parseCartItemData, formatBRL, normalizeDriverModels, migrateItemDrivers, ApiProductDriverInfo, extractPowerLabelFromName } from "@/lib/cartTypes";
import { SpecialEquipmentsEditor } from "@/components/SpecialEquipmentsEditor";
import { CORES_PECA } from "@/components/ColorPickerModal";
import { generateOrderExcel, calcDeliveryDate } from "@/lib/orderExcelGenerator";
import { OrderPreviewModal } from "@/components/OrderPreviewModal";
import type { OrderFormData } from "@/lib/orderExcelGenerator";
import { toBrasiliaDate } from "@/lib/dateUtils";
import { toast } from "sonner";

// ─── Funções auxiliares para Fonte de Luz e Equipamentos ────────────────────
function fmtQty(n: number): string {
  // Arredondar para cima com 1 decimal para módulos LED (podem ser fracionários)
  const rounded = Math.ceil(n * 10) / 10;
  const s = rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1);
  return s.padStart(s.includes(".") ? 5 : 2, "0");
}

/**
 * Retorna true se o item é um LED BAR U (tem dados específicos de cortes).
 */
function isLedBar(item: CartItemData): boolean {
  return item.category === "LED BAR" && item.ledBarNCortes !== undefined;
}

/**
 * Gera o texto de FONTE DE LUZ / Módulo LED para exibição na tela de pedido.
 * Replica a lógica do orderExcelGenerator.ts.
 */
function buildFonteLuzText(item: CartItemData, descMap?: Map<string, string>): string {
  if (item.isSpecialItem) return "";
  if (isLedBar(item)) {
    const nCortes = item.ledBarNCortes ?? 1;
    const mm = item.ledBarComprimentoPorTrechoMm ?? item.ledBarComprimentoTotalMm ?? 0;
    const modulo = item.moduloLed ?? "";
    const linhas: string[] = [];
    if (modulo) linhas.push(`Módulo: ${modulo}`);
    if (nCortes > 1) {
      linhas.push(`Trechos: ${nCortes}x de ${mm}mm`);
    } else {
      linhas.push(`Comprimento: ${mm}mm`);
    }
    return linhas.join("\n");
  }
  if (!item.profileSegments || item.profileSegments.length === 0) {
    return item.moduloLed ?? [item.power, item.cct].filter(Boolean).join(" | ") ?? "";
  }
  const itemQty = item.qty ?? 1;

  // Agrupar por código EQ do módulo e somar quantidades totais
  const totals = new Map<string, { qty: number; eqCode: string | null; name: string }>();
  for (const seg of item.profileSegments) {
    const eqCode = seg.ledModuleCode ?? null;
    // Preferência: descrição canônica da API pelo código EQ; fallback: item.moduloLed ou eqCode
    const apiDesc = eqCode ? descMap?.get(eqCode) : undefined;
    const barName = apiDesc ?? item.moduloLed ?? eqCode ?? "Módulo LED";
    const mapKey = eqCode ?? barName;
    const totalBars = seg.qty * seg.barsPerPiece * itemQty;
    const existing = totals.get(mapKey);
    if (existing) {
      totals.set(mapKey, { qty: existing.qty + totalBars, eqCode, name: barName });
    } else {
      totals.set(mapKey, { qty: totalBars, eqCode, name: barName });
    }
  }

  return Array.from(totals.values())
    .map(({ qty, eqCode, name }) => {
      const eqSuffix = eqCode ? ` (${eqCode})` : "";
      return `${fmtQty(qty)} x ${name}${eqSuffix}`;
    })
    .join("\n");
}

/**
 * Gera o texto de EQUIPAMENTOS / Drivers para exibição na tela de pedido.
 * Replica a lógica do orderExcelGenerator.ts.
 */
function buildEquipamentosText(item: CartItemData): string {
  if (item.isSpecialItem) return "";
  if (isLedBar(item)) {
    const nCortes = item.ledBarNCortes ?? 1;
    const model = item.ledBarDriverModel ?? "";
    const code = item.ledBarDriverCode ?? "";
    if (!model) return item.drivers ?? "";
    const codeSuffix = code ? ` (${code})` : "";
    return `${nCortes}x ${model}${codeSuffix}`;
  }
  if (!item.profileSegments || item.profileSegments.length === 0) {
    // Luminária com driverLines desmembradas
    if (item.driverLines && item.driverLines.length > 0) {
      return item.driverLines.map(dl => {
        const codeSuffix = dl.driverCode ? ` (${dl.driverCode})` : "";
        const linha = `${dl.driverQty}x ${dl.driverModel}${codeSuffix}`;
        if (dl.corrente && !dl.driverModel.toUpperCase().includes("FONTE 24V")) {
          return `${linha}\nPROGRAMAÇÃO: ${dl.corrente}`;
        }
        return linha;
      }).join("\n");
    }
    return item.drivers ?? "";
  }
  const itemQtyEq = item.qty ?? 1;

  // Agrupar por modelo+código e somar quantidades totais
  const driverTotals = new Map<string, { model: string; code: string; qty: number }>();

  for (const seg of item.profileSegments) {
    if (seg.driverModel.includes(" + ")) {
      const comboKey = seg.driverModel;
      const totalQty = seg.qty * itemQtyEq;
      const existing = driverTotals.get(comboKey);
      if (existing) {
        driverTotals.set(comboKey, { ...existing, qty: existing.qty + totalQty });
      } else {
        driverTotals.set(comboKey, { model: seg.driverModel, code: "", qty: totalQty });
      }
      continue;
    }
    const codeSuffix = seg.driverCode && seg.driverCode !== "ERRO"
      ? ` (${seg.driverCode})`
      : "";
    const key = `${seg.driverModel}${codeSuffix}`;
    const totalQty = seg.qty * seg.driverQtyPerPiece * itemQtyEq;
    const existing = driverTotals.get(key);
    if (existing) {
      driverTotals.set(key, { ...existing, qty: existing.qty + totalQty });
    } else {
      driverTotals.set(key, { model: seg.driverModel, code: codeSuffix, qty: totalQty });
    }
  }

  // Coletar corrente (igual para todos os segmentos do mesmo perfil)
  const correnteSegmento = item.profileSegments
    .map(s => s.corrente)
    .find(c => c && c.trim());

  const linhas = Array.from(driverTotals.entries())
    .map(([key, entry]) => {
      if (!entry.code) return `${String(entry.qty).padStart(2, "0")} x ${key}`;
      return `${String(entry.qty).padStart(2, "0")} x ${entry.model}${entry.code}`;
    });

  // Adicionar linha de programação se houver corrente e não for fonte 24V
  if (correnteSegmento) {
    const isDriverFonte = Array.from(driverTotals.values()).every(e =>
      e.model.toUpperCase().includes("FONTE 24V")
    );
    if (!isDriverFonte) {
      linhas.push(`PROGRAMAÇÃO: ${correnteSegmento}`);
    }
  }

  return linhas.join("\n");
}

/**
 * Verifica se um item tem equipamentos/drivers definidos (para warnings).
 * Considera driverLines, profileSegments, ledBarDriverModel e drivers.
 */
function hasEquipamentoDefined(item: CartItemData): boolean {
  if (item.isSpecialItem) {
    return (item.specialEquipments ?? []).length > 0;
  }
  if (isLedBar(item)) {
    return !!(item.ledBarDriverModel || item.drivers);
  }
  if (item.profileSegments && item.profileSegments.length > 0) return true;
  if (item.driverLines && item.driverLines.length > 0) return true;
  return !!(item.drivers && item.drivers.trim() !== "");
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: <Clock className="w-3 h-3" /> },
  sent: { label: "Enviado", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: <Truck className="w-3 h-3" /> },
  in_production: { label: "Em Produção", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", icon: <Factory className="w-3 h-3" /> },
  completed: { label: "Concluído", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: <CheckCircle className="w-3 h-3" /> },
};

// ─── Componente de item editável ─────────────────────────────────────────────
interface EditableItemProps {
  item: { id: number; itemNumber: number; itemData: string };
  drivers: Array<{ code: string; model: string; inputVoltage: string; available: boolean }>;
  priceMap?: Map<string, number>;
  productSkuMap?: Map<string, ApiProductDriverInfo>;
  acessorios: Array<{ codigo: string | null; produto: string | null; familia: string | null; dimensao: string | null; precoVenda: number | null; fotoUrl: string | null }>;
  onUpdate: (itemId: number, newData: CartItemData) => void;
  onRemove: (itemId: number) => void;
    /** Mapa código EQ -> descrição canônica da API (para normalizar módulos LED) */
  descMap?: Map<string, string>;
  /** Mapa código EQ -> corrente de programação (para Migração 6) */
  correnteMap?: Map<string, string | null>;
  /** Mapa descrição UPPER -> código EQ (para Migração 7) */
  reverseDescMap?: Map<string, string>;
}
function EditableItem({ item, drivers, acessorios, onUpdate, onRemove, descMap, priceMap, productSkuMap, correnteMap, reverseDescMap }: EditableItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAcessorioModal, setShowAcessorioModal] = useState(false);
  const [acessorioSearch, setAcessorioSearch] = useState("");
  const [acessorioFamilia, setAcessorioFamilia] = useState<string>("Todos");
  const [acQty, setAcQty] = useState<number>(1);

  const parsed = useMemo(() => {
    const raw = parseCartItemData(item.itemData);
    if (!raw || !priceMap || !productSkuMap) return raw;
    return migrateItemDrivers(raw, priceMap, descMap ?? new Map(), productSkuMap, correnteMap, reverseDescMap);
  }, [item.itemData, priceMap, productSkuMap, descMap, correnteMap, reverseDescMap]);
  if (!parsed) return null;

  const update = (fields: Partial<CartItemData>) => {
    onUpdate(item.id, { ...parsed, ...fields });
  };

  // Famílias de acessórios disponíveis
  const familias = useMemo(() => {
    const fams = new Set(acessorios.map(a => a.familia ?? "Outros").filter(Boolean));
    return ["Todos", ...Array.from(fams).sort()];
  }, [acessorios]);

  const filteredAcessorios = useMemo(() => {
    return acessorios.filter(a => {
      const matchFamilia = acessorioFamilia === "Todos" || a.familia === acessorioFamilia;
      const term = acessorioSearch.toLowerCase();
      const matchSearch = !term ||
        (a.codigo ?? "").toLowerCase().includes(term) ||
        (a.produto ?? "").toLowerCase().includes(term) ||
        (a.familia ?? "").toLowerCase().includes(term);
      return matchFamilia && matchSearch;
    });
  }, [acessorios, acessorioSearch, acessorioFamilia]);

  const handleAddAcessorio = (ac: typeof acessorios[0]) => {
    const qty = Math.max(1, acQty || 1);
    const newAcc: LinkedAccessory = {
      codigo: ac.codigo ?? "",
      descricao: ac.produto ?? "",
      qty,
      unitPrice: ac.precoVenda,
      fotoUrl: ac.fotoUrl,
      familia: ac.familia ?? undefined,
      dimensao: ac.dimensao ?? undefined,
    };
    const existing = parsed.accessories ?? [];
    update({ accessories: [...existing, newAcc] });
    setShowAcessorioModal(false);
    setAcessorioSearch("");
    setAcQty(1);
    toast.success(`Acessório ${ac.codigo} (${qty}×) vinculado`);
  };

  const handleRemoveAcessorio = (idx: number) => {
    const accs = (parsed.accessories ?? []).filter((_, i) => i !== idx);
    update({ accessories: accs });
  };

  const handleAcessorioQty = (idx: number, qty: number) => {
    const accs = (parsed.accessories ?? []).map((a, i) => i === idx ? { ...a, qty } : a);
    update({ accessories: accs });
  };

  const isSpecial = parsed.isSpecialItem;

  // Valor seguro para o Select de driver — nunca string vazia
  const driverValue = parsed.drivers && parsed.drivers.trim() !== "" ? parsed.drivers : "__none__";

  return (
    <Card className="border-border">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
            #{item.itemNumber}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{parsed.sku || parsed.description}</p>
            {parsed.sku && parsed.description !== parsed.sku && (
              <p className="text-xs text-muted-foreground truncate">{parsed.description}</p>
            )}
          </div>
          {(parsed.accessories?.length ?? 0) > 0 && (
            <Badge variant="outline" className="text-cyan-600 border-cyan-400 gap-1 text-xs">
              <Wrench className="w-3 h-3" />
              {parsed.accessories!.length}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          {/* Campos básicos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Quantidade */}
            <div>
              <Label className="text-xs">Quantidade</Label>
              <Input
                type="number"
                min={1}
                value={parsed.qty}
                onChange={e => update({ qty: Math.max(1, parseInt(e.target.value) || 1) })}
                className="mt-1 h-8 text-sm"
              />
            </div>

            {/* Cor da Peça */}
            <div>
              <Label className="text-xs">Cor da Peça</Label>
              <Select
                value={parsed.corPeca && parsed.corPeca.trim() !== "" ? parsed.corPeca : "A Definir"}
                onValueChange={v => update({ corPeca: v === "A Definir" ? "" : v })}
              >
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A Definir">A Definir</SelectItem>
                  {CORES_PECA.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Temperatura de Cor */}
            <CctSelector
              value={parsed.cct ?? ""}
              availableCCTs={isSpecial ? undefined : (parsed.availableCCTs ?? [])}
              onChange={v => update({ cct: v })}
            />

            {/* Item em Planta */}
            <div>
              <Label className="text-xs">Item em Planta</Label>
              <Input
                value={parsed.itemEmPlanta ?? ""}
                onChange={e => update({ itemEmPlanta: e.target.value })}
                placeholder="Ex: L1, EF2"
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>

          {/* Módulo LED / Fonte de Luz e Equipamentos (apenas para itens não-especiais) */}
          {!isSpecial && (() => {
            const fonteLuzText = buildFonteLuzText(parsed, descMap);
            const equipText = buildEquipamentosText(parsed);
            const hasRichData = !!(parsed.profileSegments?.length || parsed.driverLines?.length || parsed.ledBarDriverModel || parsed.moduloLed);
            return (
              <div className="space-y-3">
                {/* Fonte de Luz / Módulo LED — somente leitura quando vem do orçamento */}
                {fonteLuzText && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Módulo LED / Fonte de Luz</Label>
                    <div className="mt-1 rounded border border-border bg-muted/40 px-3 py-2">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground leading-relaxed">{fonteLuzText}</pre>
                    </div>
                  </div>
                )}

                {/* Equipamentos / Drivers — somente leitura quando vem do orçamento */}
                {equipText && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Equipamentos / Drivers</Label>
                    <div className="mt-1 rounded border border-border bg-muted/40 px-3 py-2">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground leading-relaxed">{equipText}</pre>
                    </div>
                  </div>
                )}

                {/* Campo de override manual — aparece sempre para itens sem dados ricos, ou como campo adicional */}
                {!hasRichData && (
                  <div>
                    <Label className="text-xs">Driver / Equipamento (manual)</Label>
                    <div className="flex gap-2 mt-1">
                      <Select
                        value={driverValue}
                        onValueChange={v => update({ drivers: v === "__none__" ? "" : v })}
                      >
                        <SelectTrigger className="h-8 text-sm flex-1">
                          <SelectValue placeholder="Selecionar driver da API..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          <SelectItem value="__none__">— Sem driver —</SelectItem>
                          {drivers.filter(d => d.available).map(d => (
                            <SelectItem key={d.code} value={`${d.code} — ${d.model} ${d.inputVoltage}`}>
                              {d.code} — {d.model} ({d.inputVoltage})
                            </SelectItem>
                          ))}
                          {drivers.filter(d => !d.available).length > 0 && (
                            <>
                              <Separator className="my-1" />
                              <div className="px-2 py-1 text-xs text-muted-foreground">Indisponíveis</div>
                              {drivers.filter(d => !d.available).map(d => (
                                <SelectItem key={d.code} value={`${d.code} — ${d.model} ${d.inputVoltage}`} className="opacity-50">
                                  {d.code} — {d.model} ({d.inputVoltage})
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      {parsed.drivers && parsed.drivers.trim() !== "" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => update({ drivers: "" })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <Input
                      value={parsed.drivers ?? ""}
                      onChange={e => update({ drivers: e.target.value })}
                      placeholder="Ou digitar driver manualmente..."
                      className="mt-2 h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })()}

          {/* Descrição / SKU (editável) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">SKU / Código</Label>
              <Input
                value={parsed.sku ?? ""}
                onChange={e => update({ sku: e.target.value })}
                className="mt-1 h-8 text-sm font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input
                value={parsed.description ?? ""}
                onChange={e => update({ description: e.target.value })}
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>

          {/* Equipamentos do Item Especial */}
          {isSpecial && (
            <div>
              <SpecialEquipmentsEditor
                value={parsed.specialEquipments ?? []}
                onChange={(equips: SpecialEquipment[]) => update({ specialEquipments: equips })}
              />
            </div>
          )}

          {/* Acessórios vinculados */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Acessórios Vinculados</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-cyan-400 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
                onClick={() => { setShowAcessorioModal(true); setAcQty(parsed.qty || 1); }}
              >
                <Plus className="w-3 h-3" />
                Adicionar Acessório
              </Button>
            </div>
            {(parsed.accessories ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum acessório vinculado</p>
            ) : (
              <div className="space-y-1">
                {parsed.accessories!.map((acc, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800 rounded px-3 py-2">
                    <Wrench className="w-3 h-3 text-cyan-600 shrink-0" />
                    <span className="text-xs font-mono text-cyan-700 dark:text-cyan-300 shrink-0">{acc.codigo}</span>
                    <span className="text-xs text-muted-foreground flex-1 truncate">{acc.descricao}</span>
                    <Input
                      type="number"
                      min={1}
                      value={acc.qty}
                      onChange={e => handleAcessorioQty(idx, Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 h-6 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">un</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveAcessorio(idx)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Modal de seleção de acessório */}
      <Dialog open={showAcessorioModal} onOpenChange={(open) => { setShowAcessorioModal(open); if (!open) { setAcessorioSearch(""); setAcQty(1); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Adicionar Acessório</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar acessório..."
                value={acessorioSearch}
                onChange={e => setAcessorioSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
                autoFocus
              />
            </div>
            <Select value={acessorioFamilia} onValueChange={setAcessorioFamilia}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {familias.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 mt-2">
            {filteredAcessorios.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum acessório encontrado</p>
            ) : (
              filteredAcessorios.map((ac, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-muted text-left"
                  onClick={() => handleAddAcessorio(ac)}
                >
                  {ac.fotoUrl ? (
                    <img src={ac.fotoUrl} alt={ac.codigo ?? ""} className="w-10 h-10 object-contain rounded border bg-white shrink-0" />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold">{ac.codigo}</p>
                    <p className="text-xs text-muted-foreground break-words">{ac.produto}</p>
                    {ac.dimensao && <p className="text-xs text-muted-foreground">{ac.dimensao}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {ac.familia && <Badge variant="outline" className="text-xs mb-1">{ac.familia}</Badge>}
                    {ac.precoVenda != null && (
                      <p className="text-xs font-semibold">{formatBRL(ac.precoVenda)}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          {/* Quantidade + botões */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Quantidade:</Label>
              <Input
                type="number"
                min={1}
                value={acQty}
                onChange={e => setAcQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 h-8 text-sm text-center"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAcessorioModal(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Seletor de CCT ─────────────────────────────────────────────────────────
const STANDARD_CCTS = ["2700K", "3000K", "4000K", "5000K"];

function CctSelector({ value, availableCCTs, onChange }: {
  value: string;
  availableCCTs: string[] | undefined; // undefined = especial (todas as opções); [] = sem restrição da API
  onChange: (v: string) => void;
}) {
  // Opções a mostrar no dropdown
  // - Se availableCCTs tem itens: usar apenas essas + "Outra"
  // - Se availableCCTs é undefined (especial) ou []: mostrar todas as padrão + "Outra"
  const options = (availableCCTs && availableCCTs.length > 0)
    ? availableCCTs
    : STANDARD_CCTS;

  const isOther = value !== "" && !options.includes(value);
  // Mapear valor para o que o Select entende (nunca string vazia)
  const selectValue = isOther ? "__outra__" : (value || "__a_definir__");

  return (
    <div>
      <Label className="text-xs">Temperatura de Cor</Label>
      <Select
        value={selectValue}
        onValueChange={v => {
          if (v === "__a_definir__") {
            onChange("");
          } else if (v === "__outra__") {
            // Manter o valor atual se já era "outra", senão limpar para o usuário digitar
            if (!isOther) onChange("");
          } else {
            onChange(v);
          }
        }}
      >
        <SelectTrigger className="mt-1 h-8 text-sm">
          <SelectValue placeholder="Selecionar CCT..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__a_definir__">— A Definir —</SelectItem>
          {options.map(c => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
          <Separator className="my-1" />
          <SelectItem value="__outra__">Outra...</SelectItem>
        </SelectContent>
      </Select>
      {(selectValue === "__outra__" || isOther) && (
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Ex: 2200K, Tunable White..."
          className="mt-1.5 h-8 text-sm"
          autoFocus
        />
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function FactoryOrderDetail() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [newOrderEmpresa, setNewOrderEmpresa] = useState<"ALFALUX" | "LUMINEW">("ALFALUX");

  const [notesEdit, setNotesEdit] = useState("");
  const [showNotesEdit, setShowNotesEdit] = useState(false);
  // Número do pedido de fábrica (editável manualmente)
  const [orderNumberEdit, setOrderNumberEdit] = useState("");
  const [editingOrderNumber, setEditingOrderNumber] = useState(false);
  // Rastrear se há alterações não publicadas (desde o último Excel gerado ou criação do pedido)
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  // Snapshot dos itens no momento do último Excel gerado (para detectar alterações)
  const lastPublishedSnapshotRef = useRef<string | null>(null);
  // Dialog de aviso antes de gerar Excel
  const [showExcelWarningDialog, setShowExcelWarningDialog] = useState(false);
  const [pendingExcelWarnings, setPendingExcelWarnings] = useState<string[]>([]);
  // Pré-visualização do pedido de fábrica
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewForm, setPreviewForm] = useState<(OrderFormData & { prazoStr?: string }) | null>(null);
  const [previewItems, setPreviewItems] = useState<CartItemData[]>([]);

  // Dados do orçamento
  const { data: quoteData, isLoading: quoteLoading } = trpc.quotes.getById.useQuery({ id: Number(quoteId) });

  // Lista de pedidos de fábrica deste orçamento
  const { data: orders = [], isLoading: ordersLoading } = trpc.factoryOrders.list.useQuery({ quoteId: Number(quoteId) });

  // Pedido selecionado (com itens)
  const effectiveOrderId = selectedOrderId ?? orders[0]?.id ?? null;
  const { data: currentOrder, isLoading: orderLoading } = trpc.factoryOrders.getById.useQuery(
    { id: effectiveOrderId! },
    { enabled: effectiveOrderId !== null }
  );

  // Histórico de Excels gerados para o pedido selecionado
  const { data: excelHistory = [] } = trpc.factoryOrders.listExcels.useQuery(
    { factoryOrderId: effectiveOrderId! },
    { enabled: effectiveOrderId !== null }
  );

  // Sincronizar orderNumberEdit quando o pedido carrega
  useEffect(() => {
    if (currentOrder) {
      setOrderNumberEdit(currentOrder.orderNumber ?? "");
    }
  }, [currentOrder?.id, currentOrder?.orderNumber]);

  // Detectar alterações não publicadas: comparar snapshot atual com o último publicado
  useEffect(() => {
    if (!currentOrder) return;
    const currentSnapshot = JSON.stringify(
      currentOrder.items.map(i => ({ id: i.itemNumber, data: i.itemData }))
    );
    // Se ainda não temos snapshot (primeiro carregamento), inicializar sem alterações pendentes
    if (lastPublishedSnapshotRef.current === null) {
      lastPublishedSnapshotRef.current = currentSnapshot;
      setHasUnpublishedChanges(false);
      return;
    }
    setHasUnpublishedChanges(currentSnapshot !== lastPublishedSnapshotRef.current);
  }, [currentOrder?.items, excelHistory.length]);

  // Resetar snapshot quando muda de revisão
  useEffect(() => {
    lastPublishedSnapshotRef.current = null;
    setHasUnpublishedChanges(false);
  }, [effectiveOrderId]);

  // Drivers da API
  const { data: driversData = [] } = trpc.led.drivers.useQuery();

  // Acessórios
  const { data: acessoriosData = [] } = trpc.alfalux.acessoriosProducts.useQuery();
  /** Mapa código EQ -> descrição canônica da API (para normalizar driverModel) */
  const { data: componentesData } = trpc.alfalux.componentes.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const componenteDescMapFO = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of componentesData?.items ?? []) {
      if (c.codigo && c.descricao) map.set(c.codigo, c.descricao);
    }
    return map;
  }, [componentesData]);
  /** Preços de componentes (EQ code → preço de venda = custoDriver × mkpPadrao) */
  const componentePriceMapFO = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of componentesData?.items ?? []) {
      if (!c.codigo) continue;
      const custo = (c as unknown as { custoDriver?: number | null }).custoDriver ?? null;
      if (custo != null && custo > 0) {
        const mkp = (c as unknown as { mkpPadrao?: number | null }).mkpPadrao ?? 3;
        map.set(c.codigo, Math.round(custo * mkp * 100) / 100);
      }
    }
    return map;
  }, [componentesData]);
  /** Corrente de programação de componentes (EQ code → corrente, ex: "350MA") */
  const componenteCorrenteMapFO = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const c of componentesData?.items ?? []) {
      if (c.codigo) map.set(c.codigo, (c as unknown as { corrente?: string | null }).corrente ?? null);
    }
    return map;
  }, [componentesData]);
  /** Mapa descrição (UPPER) -> código EQ — busca reversa para Migração 7 */
  const componenteReverseDescMapFO = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of componentesData?.items ?? []) {
      if (c.codigo && c.descricao) map.set(c.descricao.toUpperCase().trim(), c.codigo);
    }
    return map;
  }, [componentesData]);
  /** Produtos da API para fallback de driver (SKU → driver info) e resolução de ledModuleCode (Migração 4) */
  const { data: allProductsFO } = trpc.alfalux.products.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const productSkuMapFO = useMemo(() => {
    const map = new Map<string, ApiProductDriverInfo>();
    for (const p of (allProductsFO ?? []) as Array<{ sku: string; name?: string; categoria?: string; driver220?: { model: string; code: string | null } | null; driverBivolt?: { model: string; code: string | null } | null; driverQtd220?: number | null; driverQtdBivolt?: number | null; ledModuleEq2700?: string | null; ledModuleEq3000?: string | null; ledModuleEq4000?: string | null; ledModuleEq5000?: string | null; ledModuleEq?: string | null }>) {
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
      if (!map.has(p.sku)) map.set(p.sku, entry);
      // Indexar por sku|powerLabel para perfis com múltiplas potências
      if ((p.categoria ?? "").toUpperCase() === "PERFIS" && p.name) {
        const powerLabel = extractPowerLabelFromName(p.name);
        map.set(`${p.sku}|${powerLabel}`, entry);
        // Indexar LED BAR por sku|potenciaW/m (ex: "LED BAR U DA|5W/M")
        const potMatch = (p.name ?? "").match(/(\d+)\s*W\/M/i);
        if (potMatch) {
          map.set(`${p.sku}|${potMatch[1]}W/m`, entry);
        }
      }
    }
    return map;
  }, [allProductsFO]);

  // Mutations
  const createOrderMutation = trpc.factoryOrders.create.useMutation({
    onSuccess: (result) => {
      utils.factoryOrders.list.invalidate({ quoteId: Number(quoteId) });
      setSelectedOrderId(result.id);
      setShowNewOrderDialog(false);
      toast.success("Pedido de fábrica criado!");
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const updateOrderMutation = trpc.factoryOrders.update.useMutation({
    onSuccess: () => {
      utils.factoryOrders.getById.invalidate({ id: effectiveOrderId! });
      utils.factoryOrders.list.invalidate({ quoteId: Number(quoteId) });
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const updateItemMutation = trpc.factoryOrders.updateItem.useMutation({
    onSuccess: () => {
      utils.factoryOrders.getById.invalidate({ id: effectiveOrderId! });
    },
    onError: (err) => toast.error(`Erro ao salvar item: ${err.message}`),
  });

  const removeItemMutation = trpc.factoryOrders.removeItem.useMutation({
    onSuccess: () => {
      utils.factoryOrders.getById.invalidate({ id: effectiveOrderId! });
      toast.success("Item removido");
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const addItemMutation = trpc.factoryOrders.addItem.useMutation({
    onSuccess: () => {
      utils.factoryOrders.getById.invalidate({ id: effectiveOrderId! });
      toast.success("Item adicionado");
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const saveExcelMutation = trpc.factoryOrders.saveExcel.useMutation({
    onSuccess: () => {
      utils.factoryOrders.listExcels.invalidate({ factoryOrderId: effectiveOrderId! });
    },
    onError: (err) => toast.error(`Erro ao salvar histórico do Excel: ${err.message}`),
  });

  const createRevisionMutation = trpc.factoryOrders.createRevision.useMutation({
    onSuccess: (result) => {
      utils.factoryOrders.list.invalidate({ quoteId: Number(quoteId) });
      setSelectedOrderId(result.id);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const handleCreateOrder = useCallback(() => {
    if (!quoteData) return;
    const { quote, versions, items } = quoteData;
    // Pegar a versão mais recente do orçamento
    const sortedVersions = [...versions].sort((a, b) => b.version - a.version);
    const currentVersionId = sortedVersions[0]?.id;
    const currentItems = items.filter(i => i.quoteVersionId === currentVersionId);
    createOrderMutation.mutate({
      quoteId: Number(quoteId),
      empresa: newOrderEmpresa,
      deliveryDays: quote.deliveryDays ?? 19,
      items: currentItems.map((item, idx) => ({
        itemNumber: idx + 1,
        itemData: item.itemData,
      })),
    });
  }, [quoteData, quoteId, newOrderEmpresa, createOrderMutation]);

  const handleUpdateItem = useCallback((itemId: number, newData: CartItemData) => {
    updateItemMutation.mutate({ itemId, itemData: JSON.stringify(newData) });
    setHasUnpublishedChanges(true);
  }, [updateItemMutation]);

  const handleRemoveItem = useCallback((itemId: number) => {
    removeItemMutation.mutate({ itemId });
    setHasUnpublishedChanges(true);
  }, [removeItemMutation]);

  const handleAddBlankItem = useCallback(() => {
    if (!effectiveOrderId) return;
    setHasUnpublishedChanges(true);
    const maxNum = (currentOrder?.items ?? []).reduce((m, i) => Math.max(m, i.itemNumber), 0);
    const blankItem: CartItemData = {
      category: "especial",
      sku: "NOVO-ITEM",
      description: "Novo item",
      qty: 1,
      unitPrice: null,
      totalPrice: null,
      photoUrl: null,
      isSpecialItem: true,
    };
    addItemMutation.mutate({
      factoryOrderId: effectiveOrderId,
      itemNumber: maxNum + 1,
      itemData: JSON.stringify(blankItem),
    });
  }, [effectiveOrderId, currentOrder, addItemMutation]);

  const handleSaveOrderNumber = useCallback(() => {
    if (!effectiveOrderId) return;
    updateOrderMutation.mutate({ id: effectiveOrderId, orderNumber: orderNumberEdit.trim() });
    setEditingOrderNumber(false);
    toast.success("Número do pedido salvo");
  }, [effectiveOrderId, orderNumberEdit, updateOrderMutation]);

  // Verifica pendências nos itens e retorna lista de avisos
  const checkPendingWarnings = useCallback((items: Array<{ id: number; itemNumber: number; itemData: string }>): string[] => {
    if (!items) return [];
    const warnings: string[] = [];
    let semEquipamento = 0;
    let semCor = 0;
    let semCct = 0;
    for (const item of items) {
      const d = parseCartItemData(item.itemData);
      if (!d) continue;
      // Verificar equipamentos pendentes usando a função que considera driverLines, profileSegments, ledBarDriverModel etc.
      if (!hasEquipamentoDefined(d)) semEquipamento++;
      // Verificar cor da peça
      if (!d.corPeca || d.corPeca.trim() === "" || d.corPeca === "A Definir") semCor++;
      // Verificar CCT
      if (!d.cct || d.cct.trim() === "") semCct++;
    }
    if (semEquipamento > 0) warnings.push(`${semEquipamento} item(ns) sem equipamento/driver definido`);
    if (semCor > 0) warnings.push(`${semCor} item(ns) com cor da peça "A Definir" ou em branco`);
    if (semCct > 0) warnings.push(`${semCct} item(ns) sem temperatura de cor (CCT) definida`);
    return warnings;
  }, []);

  // Executa a geração do Excel de fato (após confirmação de avisos)
  const doGenerateExcel = useCallback(async (orderToUse: NonNullable<typeof currentOrder>) => {
    if (!quoteData) return;
    const orderNum = orderToUse.orderNumber ?? "";
    setIsGenerating(true);
    try {
      const { quote } = quoteData;
      const deliveryDays = orderToUse.deliveryDays ?? 19;
      const approvedAtIso = quote.approvedAt
        ? new Date(quote.approvedAt).toISOString()
        : new Date().toISOString();
      const { displayDays, deliveryDateStr } = await calcDeliveryDate(approvedAtIso, deliveryDays);
      const itemsData = orderToUse.items
        .map(i => parseCartItemData(i.itemData))
        .filter((d): d is CartItemData => d !== null)
        .map(d => migrateItemDrivers(d, componentePriceMapFO, componenteDescMapFO, productSkuMapFO, componenteCorrenteMapFO, componenteReverseDescMapFO));
      const fileName = `PEDIDO-FABRICA-${orderNum}-${quote.clientName.replace(/\s+/g, "_")}.xlsx`;
      const buffer = await generateOrderExcel(itemsData, {
        clientName: quote.clientName,
        projectName: quote.projectName ?? "",
        quoteNumber: `${quote.quoteNumber} Rev.${orderToUse.revision}`,
        orderNumber: orderNum,
        vendorName: quote.vendorName ?? "",
        date: toBrasiliaDate(new Date()),
        empresa: orderToUse.empresa as "ALFALUX" | "LUMINEW",
        deliveryDays,
        approvedAt: approvedAtIso,
        precomputedDisplayDays: displayDays,
        precomputedDeliveryDate: deliveryDateStr,
      });
      toast.success(`Excel Rev. ${orderToUse.revision} gerado com sucesso!`);
      // Atualizar snapshot — a partir daqui não há mais alterações pendentes
      lastPublishedSnapshotRef.current = JSON.stringify(
        orderToUse.items.map(i => ({ id: i.itemNumber, data: i.itemData }))
      );
      setHasUnpublishedChanges(false);
      // Salvar no S3 e registrar no histórico
      try {
        const uint8 = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
        const base64 = btoa(binary);
        saveExcelMutation.mutate({
          factoryOrderId: orderToUse.id,
          orderNumber: orderNum,
          revision: orderToUse.revision,
          excelBase64: base64,
          fileName,
        });
      } catch {
        // Falha silenciosa no histórico não impede o download
      }
    } catch (err) {
      toast.error("Erro ao gerar Excel.");
    } finally {
      setIsGenerating(false);
    }
  }, [quoteData, saveExcelMutation]);

  const handleGenerateExcel = useCallback(async () => {
    if (!currentOrder || !quoteData) return;
    // Validar número do pedido: exatamente 6 dígitos numéricos
    const orderNum = currentOrder.orderNumber ?? "";
    if (!/^\d{6}$/.test(orderNum)) {
      toast.error("Informe o número do pedido (6 dígitos numéricos) antes de gerar o Excel.");
      setEditingOrderNumber(true);
      return;
    }
    // Verificar pendências nos itens
    const warnings = checkPendingWarnings(currentOrder.items);
    if (warnings.length > 0) {
      setPendingExcelWarnings(warnings);
      setShowExcelWarningDialog(true);
      return;
    }
    // Sem pendências: verificar se precisa criar nova revisão
    if (hasUnpublishedChanges && excelHistory.length > 0) {
      // Há alterações e já foi publicado antes — criar nova revisão automaticamente
      setIsGenerating(true);
      try {
        const newId = await new Promise<number>((resolve, reject) => {
          createRevisionMutation.mutate(
            { sourceOrderId: currentOrder.id },
            {
              onSuccess: (r) => resolve(r.id),
              onError: (e) => reject(e),
            }
          );
        });
        // Aguardar a nova revisão carregar e gerar o Excel dela
        // A invalidação do cache vai atualizar currentOrder via useEffect
        setSelectedOrderId(newId);
        toast.info("Nova revisão criada automaticamente com as alterações.");
        // O Excel será gerado após o currentOrder atualizar — usamos um flag
        setPendingAutoGenerate(true);
      } catch {
        toast.error("Erro ao criar nova revisão.");
        setIsGenerating(false);
      }
      return;
    }
    // Sem alterações pendentes ou primeira geração: gerar diretamente
    await doGenerateExcel(currentOrder);
  }, [currentOrder, quoteData, hasUnpublishedChanges, excelHistory.length, checkPendingWarnings, doGenerateExcel, createRevisionMutation]);

  // Flag para gerar Excel automaticamente após criar nova revisão
  const [pendingAutoGenerate, setPendingAutoGenerate] = useState(false);

  // Quando currentOrder muda e há pendingAutoGenerate, gerar o Excel
  useEffect(() => {
    if (pendingAutoGenerate && currentOrder && !isGenerating) {
      setPendingAutoGenerate(false);
      doGenerateExcel(currentOrder);
    }
  }, [pendingAutoGenerate, currentOrder, isGenerating, doGenerateExcel]);

  // Confirmar geração do Excel mesmo com pendências
  const handleConfirmExcelWithWarnings = useCallback(async () => {
    setShowExcelWarningDialog(false);
    if (!currentOrder) return;
    // Verificar se precisa criar nova revisão
    if (hasUnpublishedChanges && excelHistory.length > 0) {
      setIsGenerating(true);
      try {
        const newId = await new Promise<number>((resolve, reject) => {
          createRevisionMutation.mutate(
            { sourceOrderId: currentOrder.id },
            {
              onSuccess: (r) => resolve(r.id),
              onError: (e) => reject(e),
            }
          );
        });
        setSelectedOrderId(newId);
        toast.info("Nova revisão criada automaticamente com as alterações.");
        setPendingAutoGenerate(true);
      } catch {
        toast.error("Erro ao criar nova revisão.");
        setIsGenerating(false);
      }
      return;
    }
    await doGenerateExcel(currentOrder);
  }, [currentOrder, hasUnpublishedChanges, excelHistory.length, doGenerateExcel, createRevisionMutation]);

  const handleSaveNotes = useCallback(() => {
    if (!effectiveOrderId) return;
    updateOrderMutation.mutate({ id: effectiveOrderId, notes: notesEdit });
    setShowNotesEdit(false);
    toast.success("Observações salvas");
  }, [effectiveOrderId, notesEdit, updateOrderMutation]);

  // Loading states
  if (quoteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!quoteData) {
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

  const { quote } = quoteData;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link href={`/orcamentos/${quoteId}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Orçamento
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Factory className="w-5 h-5 text-orange-500 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate flex items-center gap-2">
                Pedido de Fábrica — Orç. {quote.quoteNumber}
                {currentOrder?.orderNumber && /^\d{6}$/.test(currentOrder.orderNumber) && (
                  <span className="text-xs font-mono bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-800 shrink-0">
                    Ped. {currentOrder.orderNumber}
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground truncate">{quote.clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {currentOrder && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={async () => {
                    if (!quoteData) return;
                    const { quote } = quoteData;
                    const deliveryDays = currentOrder.deliveryDays ?? 19;
                    const approvedAtIso = quote.approvedAt
                      ? new Date(quote.approvedAt).toISOString()
                      : new Date().toISOString();
                    const { displayDays, deliveryDateStr } = await calcDeliveryDate(approvedAtIso, deliveryDays);
                    const items = currentOrder.items
                      .map(i => parseCartItemData(i.itemData))
                      .filter((d): d is CartItemData => d !== null)
                      .map(d => migrateItemDrivers(d, componentePriceMapFO, componenteDescMapFO, productSkuMapFO, componenteCorrenteMapFO, componenteReverseDescMapFO));
                    setPreviewItems(items);
                    setPreviewForm({
                      clientName: quote.clientName,
                      projectName: quote.projectName ?? "",
                      quoteNumber: `${quote.quoteNumber} Rev.${currentOrder.revision}`,
                      orderNumber: currentOrder.orderNumber ?? "",
                      vendorName: quote.vendorName ?? "",
                      date: toBrasiliaDate(new Date()),
                      empresa: currentOrder.empresa as "ALFALUX" | "LUMINEW",
                      deliveryDays,
                      approvedAt: approvedAtIso,
                      precomputedDisplayDays: displayDays,
                      precomputedDeliveryDate: deliveryDateStr,
                      prazoStr: `${displayDays} dias úteis → ${deliveryDateStr}`,
                    });
                    setPreviewOpen(true);
                  }}
                  disabled={isGenerating}
                >
                  <Eye className="w-4 h-4" />
                  Pré-visualizar
                </Button>
                <Button
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleGenerateExcel}
                  disabled={isGenerating}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {isGenerating ? "Gerando..." : hasUnpublishedChanges ? "Gerar Excel (com alterações)" : "Gerar Excel"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Sem pedidos ainda */}
        {!ordersLoading && orders.length === 0 && (
          <Card className="text-center py-12">
            <Factory className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Nenhum pedido de fábrica criado</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Crie o primeiro pedido de fábrica a partir dos itens do orçamento aprovado.
            </p>
            <Button
              className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => setShowNewOrderDialog(true)}
            >
              <Plus className="w-4 h-4" />
              Criar Pedido de Fábrica
            </Button>
          </Card>
        )}

        {/* Lista de revisões + conteúdo */}
        {orders.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar de revisões */}
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Revisões</h3>
              </div>
              {orders.map(order => {
                const st = STATUS_LABELS[order.status] ?? STATUS_LABELS.draft;
                const isActive = order.id === effectiveOrderId;
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      isActive
                        ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
                        : "border-border hover:border-orange-300 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">Rev. {order.revision}</span>
                      <Badge className={`text-xs gap-1 ${st.color}`}>
                        {st.icon}
                        {st.label}
                      </Badge>
                    </div>
                    {order.orderNumber && (
                      <p className="text-xs font-mono text-orange-700 dark:text-orange-400 mt-0.5">
                        Ped. {order.orderNumber}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{order.empresa}</p>
                    <p className="text-xs text-muted-foreground">
                      {toBrasiliaDate(order.createdAt)}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Conteúdo do pedido selecionado */}
            <div className="lg:col-span-3 space-y-4">
              {orderLoading && (
                <div className="text-center py-12 text-muted-foreground">Carregando pedido...</div>
              )}

              {currentOrder && (
                <>
                  {/* Cabeçalho do pedido */}
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {/* Número do Pedido de Fábrica (manual) */}
                        <div className="sm:col-span-3">
                          <Label className="text-xs">Número do Pedido de Fábrica</Label>
                          <p className="text-xs text-muted-foreground mb-1">
                            Número interno da fábrica com exatamente <strong>6 dígitos numéricos</strong> (ex: 250042). Obrigatório para gerar o Excel.
                          </p>
                          {editingOrderNumber ? (
                            <div className="flex gap-2 mt-1">
                              <Input
                                value={orderNumberEdit}
                                onChange={e => setOrderNumberEdit(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Ex: 250042"
                                maxLength={6}
                                className={`h-8 text-sm font-mono flex-1 ${orderNumberEdit && !/^\d{6}$/.test(orderNumberEdit) ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                                autoFocus
                                onKeyDown={e => { if (e.key === "Enter") handleSaveOrderNumber(); if (e.key === "Escape") setEditingOrderNumber(false); }}
                              />
                              <Button size="sm" className="h-8 gap-1 bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSaveOrderNumber}>
                                <Save className="w-3.5 h-3.5" />
                                Salvar
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingOrderNumber(false)}>
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-1">
                              {currentOrder.orderNumber ? (
                                <span className="text-sm font-mono font-semibold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded px-2 py-1">
                                  {currentOrder.orderNumber}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">Não informado</span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => { setOrderNumberEdit(currentOrder.orderNumber ?? ""); setEditingOrderNumber(true); }}
                              >
                                <Edit2 className="w-3 h-3" />
                                {currentOrder.orderNumber ? "Editar" : "Informar"}
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Empresa */}
                        <div>
                          <Label className="text-xs">Empresa</Label>
                          <Select
                            value={currentOrder.empresa}
                            onValueChange={v => updateOrderMutation.mutate({ id: currentOrder.id, empresa: v as "ALFALUX" | "LUMINEW" })}
                          >
                            <SelectTrigger className="mt-1 h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALFALUX">ALFALUX</SelectItem>
                              <SelectItem value="LUMINEW">LUMINEW</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Status */}
                        <div>
                          <Label className="text-xs">Status</Label>
                          <Select
                            value={currentOrder.status}
                            onValueChange={v => updateOrderMutation.mutate({ id: currentOrder.id, status: v as "draft" | "sent" | "in_production" | "completed" })}
                          >
                            <SelectTrigger className="mt-1 h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Rascunho</SelectItem>
                              <SelectItem value="sent">Enviado</SelectItem>
                              <SelectItem value="in_production">Em Produção</SelectItem>
                              <SelectItem value="completed">Concluído</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Prazo */}
                        <div>
                          <Label className="text-xs">Prazo (dias úteis)</Label>
                          <Input
                            type="number"
                            min={1}
                            value={currentOrder.deliveryDays ?? 19}
                            onChange={e => updateOrderMutation.mutate({ id: currentOrder.id, deliveryDays: Math.max(1, parseInt(e.target.value) || 19) })}
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* Revisão */}
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline" className="text-sm font-semibold">
                          Rev. {currentOrder.revision}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Criado em {toBrasiliaDate(currentOrder.createdAt)}
                        </span>
                      </div>

                      {/* Histórico de Excels Gerados */}
                      {excelHistory.length > 0 && (
                        <div className="mt-4 border-t pt-3">
                          <Label className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                            Histórico de Excels Gerados
                          </Label>
                          <div className="space-y-1.5">
                            {excelHistory.map((ex: any) => (
                              <div key={ex.id} className="flex items-center justify-between gap-2 bg-muted/40 rounded px-2.5 py-1.5 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono font-semibold text-orange-700 dark:text-orange-400">{ex.orderNumber}</span>
                                  <span className="text-muted-foreground">Rev. {ex.revision}</span>
                                  <span className="text-muted-foreground truncate">{new Date(ex.generatedAt).toLocaleString('pt-BR')}</span>
                                </div>
                                <a
                                  href={ex.excelUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-green-700 dark:text-green-400 hover:underline font-medium"
                                >
                                  Baixar
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Observações */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs">Observações</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => {
                              setNotesEdit(currentOrder.notes ?? "");
                              setShowNotesEdit(true);
                            }}
                          >
                            Editar
                          </Button>
                        </div>
                        {currentOrder.notes ? (
                          <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">{currentOrder.notes}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Sem observações</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lista de itens */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">
                        Itens ({currentOrder.items.length})
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={handleAddBlankItem}
                      >
                        <Plus className="w-3 h-3" />
                        Adicionar Item
                      </Button>
                    </div>

                    {currentOrder.items.length === 0 ? (
                      <Card className="text-center py-8">
                        <p className="text-sm text-muted-foreground">Nenhum item neste pedido</p>
                      </Card>
                    ) : (
                      currentOrder.items.map(item => (
                        <EditableItem
                          key={item.id}
                          item={item}
                          drivers={driversData}
                          acessorios={acessoriosData}
                          onUpdate={handleUpdateItem}
                          onRemove={handleRemoveItem}
                          descMap={componenteDescMapFO}
                          priceMap={componentePriceMapFO}
                          productSkuMap={productSkuMapFO}
                          correnteMap={componenteCorrenteMapFO}
                          reverseDescMap={componenteReverseDescMapFO}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialog: Criar novo pedido */}
      <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar Pedido de Fábrica</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O pedido será criado com os itens da versão atual do orçamento <strong>{quote.quoteNumber}</strong>. Você poderá editá-los livremente.
          </p>
          <div className="space-y-3 py-2">
            <Label className="text-sm font-medium">Empresa Fabricante</Label>
            <div className="flex flex-col gap-2">
              {(["ALFALUX", "LUMINEW"] as const).map(emp => (
                <button
                  key={emp}
                  onClick={() => setNewOrderEmpresa(emp)}
                  className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                    newOrderEmpresa === emp
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                      : "border-border hover:border-orange-300"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    newOrderEmpresa === emp ? "border-orange-500" : "border-muted-foreground"
                  }`}>
                    {newOrderEmpresa === emp && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                  </span>
                  <span className="font-semibold text-sm">{emp}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowNewOrderDialog(false)}>Cancelar</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleCreateOrder}
              disabled={createOrderMutation.isPending}
            >
              <Factory className="w-4 h-4 mr-2" />
              {createOrderMutation.isPending ? "Criando..." : "Criar Pedido"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Aviso antes de gerar Excel */}
      <Dialog open={showExcelWarningDialog} onOpenChange={setShowExcelWarningDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Atenção antes de gerar o Excel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Foram encontrados itens com informações pendentes. Você pode gerar o Excel mesmo assim, mas revise com atenção:
            </p>
            <ul className="space-y-1.5">
              {pendingExcelWarnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground border-t pt-2">
              Verifique se não há equipamentos, cor da peça ou temperatura de cor a definir antes de enviar à fábrica.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowExcelWarningDialog(false)}>Revisar itens</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleConfirmExcelWithWarnings}
              disabled={isGenerating}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Gerar mesmo assim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Pré-visualização do Pedido de Fábrica */}
      {previewForm && (
        <OrderPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          items={previewItems}
          form={previewForm}
          descMap={componenteDescMapFO}
        />
      )}

      {/* Dialog: Editar observações */}
      <Dialog open={showNotesEdit} onOpenChange={setShowNotesEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Observações do Pedido</DialogTitle>
          </DialogHeader>
          <Textarea
            value={notesEdit}
            onChange={e => setNotesEdit(e.target.value)}
            placeholder="Observações internas sobre este pedido..."
            rows={4}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowNotesEdit(false)}>Cancelar</Button>
            <Button onClick={handleSaveNotes}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
