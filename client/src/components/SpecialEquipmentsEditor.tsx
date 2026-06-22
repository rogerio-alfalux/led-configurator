/**
 * SpecialEquipmentsEditor
 * Componente reutilizável para definir os equipamentos (drivers, módulos LED, etc.)
 * de um Item Especial. Usado no FactoryOrderDetail, Cart e QuoteDetail.
 *
 * Os dados são buscados de trpc.alfalux.componentes (API /api/componentes/all).
 * Quando a API retornar, os tipos disponíveis são exibidos como abas de filtro.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Package, Search, ChevronDown, ChevronUp } from "lucide-react";
import type { SpecialEquipment } from "@/lib/cartTypes";

// Mapeamento de tipo técnico → rótulo amigável
const TIPO_LABELS: Record<string, string> = {
  DRIVER_ONOFF_220: "Driver ON/OFF 220V",
  DRIVER_ONOFF_BIVOLT: "Driver ON/OFF Bivolt",
  DRIVER_DIM_110V: "Driver DIM 1-10V",
  DRIVER_DIM_DALI: "Driver DIM DALI",
  DRIVER_DIM_TRIAC_110V: "Driver DIM TRIAC 110V",
  DRIVER_DIM_TRIAC_220V: "Driver DIM TRIAC 220V",
  MODULO_LED: "Módulo LED",
  OTICA: "Óptica",
  HOLDER: "Holder",
  DISSIPADOR: "Dissipador",
};

interface ComponenteItem {
  codigo: string;
  descricao: string;
  tipo: string;
  familia: string | null;
  potencia: string | null;
  tensaoEntrada: string | null;
  corrente: string | null;
  precoVenda: number | null;
  fotoUrl: string | null;
  observacoes: string | null;
  disponivel: boolean;
}

interface Props {
  /** Lista atual de equipamentos do item especial */
  value: SpecialEquipment[];
  /** Callback chamado quando a lista muda */
  onChange: (equipamentos: SpecialEquipment[]) => void;
  /** Se true, o editor é somente leitura */
  readOnly?: boolean;
}

export function SpecialEquipmentsEditor({ value, onChange, readOnly = false }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("Todos");
  const [addQty, setAddQty] = useState(1);
  const [listExpanded, setListExpanded] = useState(true);

  const { data: componentesData, isLoading } = trpc.alfalux.componentes.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const allItems: ComponenteItem[] = componentesData?.items ?? [];
  const tipos: string[] = componentesData?.tipos ?? [];

  // Filtro por tipo e busca
  const filtered = useMemo(() => {
    return allItems.filter(item => {
      const matchTipo = tipoFiltro === "Todos" || item.tipo === tipoFiltro;
      const term = search.toLowerCase();
      const matchSearch = !term ||
        item.codigo.toLowerCase().includes(term) ||
        item.descricao.toLowerCase().includes(term) ||
        (item.familia ?? "").toLowerCase().includes(term) ||
        (item.observacoes ?? "").toLowerCase().includes(term);
      return matchTipo && matchSearch;
    });
  }, [allItems, tipoFiltro, search]);

  const handleAdd = (item: ComponenteItem) => {
    const qty = Math.max(1, addQty || 1);
    const novo: SpecialEquipment = {
      codigo: item.codigo,
      descricao: item.descricao,
      qty,
      unitPrice: item.precoVenda,
      familia: item.familia ?? undefined,
      fotoUrl: item.fotoUrl,
      observacoes: item.observacoes,
    };
    onChange([...value, novo]);
    setAddQty(1);
    setOpen(false);
  };

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleQtyChange = (idx: number, qty: number) => {
    onChange(value.map((eq, i) => i === idx ? { ...eq, qty: Math.max(1, qty) } : eq));
  };

  const totalEquip = value.length;

  return (
    <div className="space-y-2">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          onClick={() => setListExpanded(e => !e)}
        >
          <Package className="w-4 h-4 text-primary" />
          <span>Equipamentos</span>
          {totalEquip > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {totalEquip}
            </Badge>
          )}
          {listExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </button>

        {!readOnly && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Selecionar Componente
                </DialogTitle>
              </DialogHeader>

              {/* Filtros */}
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código, descrição..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger className="h-9 w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos os tipos</SelectItem>
                    {tipos.map(t => (
                      <SelectItem key={t} value={t}>
                        {TIPO_LABELS[t] ?? t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</Label>
                  <Input
                    type="number"
                    min={1}
                    value={addQty}
                    onChange={e => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-9 w-16 text-sm"
                  />
                </div>
              </div>

              {/* Lista de componentes */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  Carregando componentes...
                </div>
              ) : (
                <ScrollArea className="h-[380px] rounded-md border">
                  <div className="p-1">
                    {filtered.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                        Nenhum componente encontrado
                      </div>
                    ) : (
                      filtered.map((item, idx) => (
                        <button
                          key={`${item.codigo}-${idx}`}
                          type="button"
                          className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent transition-colors flex items-start gap-3 group"
                          onClick={() => handleAdd(item)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.codigo && (
                                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                  {item.codigo}
                                </span>
                              )}
                              <Badge variant="outline" className="text-xs px-1.5 py-0 border-primary/30 text-primary">
                                {TIPO_LABELS[item.tipo] ?? item.tipo}
                              </Badge>
                              {item.potencia && (
                                <span className="text-xs text-muted-foreground">{item.potencia}</span>
                              )}
                              {item.tensaoEntrada && (
                                <span className="text-xs text-muted-foreground">{item.tensaoEntrada}</span>
                              )}
                              {item.corrente && (
                                <span className="text-xs text-muted-foreground">{item.corrente}</span>
                              )}
                            </div>
                            <p className="text-sm mt-0.5 font-medium leading-snug">{item.descricao}</p>
                            {item.observacoes && item.observacoes !== "-" && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.observacoes}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {item.precoVenda != null ? (
                              <span className="text-xs font-medium text-green-600">
                                R$ {item.precoVenda.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">A definir</span>
                            )}
                            <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Badge className="text-xs bg-primary text-primary-foreground">
                                <Plus className="w-2.5 h-2.5 mr-0.5" /> Adicionar
                              </Badge>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}

              <p className="text-xs text-muted-foreground">
                {filtered.length} componente{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
                {tipoFiltro !== "Todos" && ` em "${TIPO_LABELS[tipoFiltro] ?? tipoFiltro}"`}
              </p>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Lista de equipamentos adicionados */}
      {listExpanded && (
        <div className="space-y-1.5">
          {value.length === 0 ? (
            <p className="text-xs text-muted-foreground italic pl-1">
              {readOnly ? "Nenhum equipamento definido." : "Nenhum equipamento adicionado. Clique em \"Adicionar\" para selecionar da API."}
            </p>
          ) : (
            value.map((eq, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-muted/40 rounded-md px-3 py-2 border border-border/50"
              >
                {eq.codigo && (
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{eq.codigo}</span>
                )}
                <span className="text-xs flex-1 min-w-0 truncate font-medium">{eq.descricao}</span>
                {eq.familia && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0 border-primary/30 text-primary">
                    {eq.familia}
                  </Badge>
                )}
                {!readOnly ? (
                  <>
                    <Input
                      type="number"
                      min={1}
                      value={eq.qty}
                      onChange={e => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                      className="h-6 w-14 text-xs text-center p-1"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">un</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleRemove(idx)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground shrink-0">{eq.qty}×</span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Separador visual quando há equipamentos */}
      {value.length > 0 && <Separator className="opacity-50" />}
    </div>
  );
}
