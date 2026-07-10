/**
 * DriverPriceEditor.tsx
 * Painel de edição de custo de drivers — visível apenas para vivian@grupoalfalux.com.br.
 * Permite sobrescrever o custo unitário de qualquer driver por código EQ.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Plus, Check, X, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface DriverInfo {
  code: string;
  model: string;
}

interface DriverPriceEditorProps {
  /** Lista de drivers conhecidos extraída dos produtos da API */
  knownDrivers: DriverInfo[];
}

export function DriverPriceEditor({ knownDrivers }: DriverPriceEditorProps) {
  const utils = trpc.useUtils();

  // Buscar overrides existentes
  const { data: overrides = [], isLoading } = trpc.driverPriceOverrides.list.useQuery(undefined, {
    staleTime: 30 * 1000,
  });

  // Mutations
  const upsertMutation = trpc.driverPriceOverrides.upsert.useMutation({
    onSuccess: () => {
      utils.driverPriceOverrides.list.invalidate();
      utils.driverPriceOverrides.getMap.invalidate();
      toast.success("Custo do driver atualizado com sucesso");
    },
    onError: (err) => toast.error(`Erro ao salvar: ${err.message}`),
  });

  const deleteMutation = trpc.driverPriceOverrides.delete.useMutation({
    onSuccess: () => {
      utils.driverPriceOverrides.list.invalidate();
      utils.driverPriceOverrides.getMap.invalidate();
      toast.success("Override removido — voltará ao custo da API");
    },
    onError: (err) => toast.error(`Erro ao remover: ${err.message}`),
  });

  // Estado de edição inline
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Estado para adicionar novo override manual
  const [addingNew, setAddingNew] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newCusto, setNewCusto] = useState("");

  // Mapa de overrides por código EQ
  const overrideMap = useMemo(() => {
    const m: Record<string, { customCusto: number; driverModel: string | null }> = {};
    for (const o of overrides) {
      m[o.driverCode] = {
        customCusto: parseFloat(String(o.customCusto)),
        driverModel: o.driverModel ?? null,
      };
    }
    return m;
  }, [overrides]);

  // Drivers únicos (da API + overrides manuais não presentes na API)
  const allDrivers = useMemo(() => {
    const seen = new Set<string>();
    const list: DriverInfo[] = [];
    for (const d of knownDrivers) {
      if (d.code && !seen.has(d.code)) {
        seen.add(d.code);
        list.push(d);
      }
    }
    // Adicionar overrides que não estão na lista de drivers conhecidos
    for (const o of overrides) {
      if (!seen.has(o.driverCode)) {
        seen.add(o.driverCode);
        list.push({ code: o.driverCode, model: o.driverModel ?? o.driverCode });
      }
    }
    return list.sort((a, b) => a.code.localeCompare(b.code));
  }, [knownDrivers, overrides]);

  function startEdit(code: string, currentCusto: number) {
    setEditingCode(code);
    setEditValue(String(currentCusto));
  }

  function cancelEdit() {
    setEditingCode(null);
    setEditValue("");
  }

  function saveEdit(code: string, model: string) {
    const custo = parseFloat(editValue.replace(",", "."));
    if (isNaN(custo) || custo < 0) {
      toast.error("Valor inválido. Use um número positivo (ex: 18.50)");
      return;
    }
    upsertMutation.mutate({ driverCode: code, driverModel: model, customCusto: custo });
    setEditingCode(null);
    setEditValue("");
  }

  function saveNew() {
    const code = newCode.trim().toUpperCase();
    const custo = parseFloat(newCusto.replace(",", "."));
    if (!code) { toast.error("Informe o código EQ do driver"); return; }
    if (isNaN(custo) || custo < 0) { toast.error("Valor inválido"); return; }
    upsertMutation.mutate({ driverCode: code, driverModel: newModel.trim() || null, customCusto: custo });
    setAddingNew(false);
    setNewCode(""); setNewModel(""); setNewCusto("");
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-base">
          <AlertCircle className="w-4 h-4" />
          Edição Temporária de Custo de Drivers
          <Badge variant="outline" className="ml-auto text-xs border-amber-400 text-amber-700 dark:text-amber-300">
            Apenas Vivian
          </Badge>
        </CardTitle>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
          Os valores abaixo substituem o custo da API para cálculo de preço de venda dos drivers.
          Remova o override quando o bug for corrigido na API.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <RefreshCw className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="space-y-1">
            {/* Cabeçalho */}
            <div className="grid grid-cols-[120px_1fr_100px_80px] gap-2 text-xs font-medium text-muted-foreground px-2 pb-1 border-b">
              <span>Código EQ</span>
              <span>Modelo</span>
              <span>Custo (R$)</span>
              <span>Ações</span>
            </div>

            {allDrivers.map((driver) => {
              const override = overrideMap[driver.code];
              const isEditing = editingCode === driver.code;
              const hasOverride = !!override;

              return (
                <div
                  key={driver.code}
                  className={`grid grid-cols-[120px_1fr_100px_80px] gap-2 items-center px-2 py-1.5 rounded text-sm ${
                    hasOverride ? "bg-amber-100 dark:bg-amber-900/30" : "hover:bg-muted/40"
                  }`}
                >
                  <span className="font-mono text-xs font-semibold">{driver.code}</span>
                  <span className="text-xs text-muted-foreground truncate" title={driver.model}>
                    {driver.model}
                  </span>

                  {/* Custo */}
                  {isEditing ? (
                    <Input
                      className="h-7 text-xs px-2"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(driver.code, driver.model);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className={`text-xs font-medium ${hasOverride ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>
                      {hasOverride ? `R$ ${override.customCusto.toFixed(2)}` : "—"}
                    </span>
                  )}

                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6 text-green-600"
                          onClick={() => saveEdit(driver.code, driver.model)}
                          disabled={upsertMutation.isPending}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground"
                          onClick={cancelEdit}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6"
                          onClick={() => startEdit(driver.code, override?.customCusto ?? 0)}
                          title="Editar custo"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        {hasOverride && (
                          <Button
                            size="icon" variant="ghost" className="h-6 w-6 text-red-500"
                            onClick={() => deleteMutation.mutate({ driverCode: driver.code })}
                            disabled={deleteMutation.isPending}
                            title="Remover override (volta ao custo da API)"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Adicionar novo override manual */}
            {addingNew ? (
              <div className="grid grid-cols-[120px_1fr_100px_80px] gap-2 items-center px-2 py-1.5 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800 mt-2">
                <Input
                  className="h-7 text-xs px-2 font-mono"
                  placeholder="EQ00000"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                />
                <Input
                  className="h-7 text-xs px-2"
                  placeholder="Modelo do driver"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                />
                <Input
                  className="h-7 text-xs px-2"
                  placeholder="0.00"
                  value={newCusto}
                  onChange={(e) => setNewCusto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveNew(); if (e.key === "Escape") setAddingNew(false); }}
                />
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={saveNew}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setAddingNew(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline" size="sm"
                className="mt-2 text-xs h-7 border-dashed"
                onClick={() => setAddingNew(true)}
              >
                <Plus className="w-3 h-3 mr-1" /> Adicionar driver manualmente
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
