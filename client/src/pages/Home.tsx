import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Moon, Sun, Zap, Settings, AlertTriangle, CheckCircle2, Info, MapPin, RefreshCw, Copy, ClipboardCheck, Layers, Lightbulb, Grid2X2, Focus, Lamp, TreePine, Navigation, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import {
  LED_CATALOG,
  getProfileNames,
  getInstallTypesForProfile,
  getVariant,
  MODULE_TYPE_LABELS,
} from "@/lib/ledCatalog";
import type { InstallType } from "@/lib/ledCatalog";
import { calculateComposition } from "@/lib/ledEngine";
import { generateProductionTemplate } from "@/lib/productionTemplate";
import { generateOrderSummary } from "@/lib/orderSummary";
import { generateQuoteSummary } from "@/lib/quoteSummary";
import { getProfilePhoto } from "@/lib/profilePhotos";
import {
  DOWNLIGHT_CATALOG,
  DOWNLIGHT_CCTS,
  calculateDownlight,
} from "@/lib/downlightCatalog";
import type { DownlightConfig, DownlightResult, DownlightCCT, DownlightVoltage } from "@/lib/downlightCatalog";
import type {
  CompositionResult,
  ConfigInput,
  Power,
  Application,
  CCT,
  Voltage,
  DiffuserType,
  StripMethod,
  SkuDriverEntry,
} from "@/lib/ledEngine";

// ─── Constantes ────────────────────────────────────────────────────────────────

const POWER_OPTIONS: { value: Power; label: string }[] = [
  { value: 18, label: "18W" },
  { value: 26, label: "26W" },
  { value: 36, label: "36W" },
];

const CCT_OPTIONS: { value: CCT; label: string }[] = [
  { value: "2700K", label: "2700K (Branco Extra Quente)" },
  { value: "3000K", label: "3000K (Branco Quente)" },
  { value: "4000K", label: "4000K (Branco Neutro)" },
  { value: "5000K", label: "5000K (Branco Frio)" },
];

const INSTALL_LABELS: Record<InstallType, string> = {
  PENDENTE: "Pendente",
  SOBREPOR: "Sobrepor",
  EMBUTIR: "Embutir",
  ARANDELA: "Arandela",
};

const DIFFUSER_OPTIONS: { value: DiffuserType; label: string; desc: string }[] = [
  { value: "DA", label: "DA", desc: "Difusor Alto" },
  { value: "DB", label: "DB", desc: "Difusor Baixo" },
  { value: "DC", label: "DC", desc: "Difusor Curvo" },
];

// ─── Categorias de Produto ────────────────────────────────────────────────────

type ProductCategory =
  | "Perfis"
  | "Downlights"
  | "Painéis"
  | "Spots"
  | "Arandelas"
  | "Área Externa"
  | "Balizadores"
  | "Decorativas";

const PRODUCT_CATEGORIES: { value: ProductCategory; label: string; icon: React.ElementType; available: boolean }[] = [
  { value: "Perfis",       label: "Perfis",        icon: Layers,      available: true  },
  { value: "Downlights",   label: "Downlights",    icon: Lightbulb,   available: true  },
  { value: "Painéis",      label: "Painéis",       icon: Grid2X2,     available: false },
  { value: "Spots",        label: "Spots",         icon: Focus,       available: false },
  { value: "Arandelas",    label: "Arandelas",     icon: Lamp,        available: false },
  { value: "Área Externa", label: "Área Externa",  icon: TreePine,    available: false },
  { value: "Balizadores",  label: "Balizadores",   icon: Navigation,  available: false },
  { value: "Decorativas",  label: "Decorativas",   icon: Sparkles,    available: false },
];

// ─── Componentes Auxiliares ────────────────────────────────────────────────────

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-sm font-medium text-foreground">{children}</span>
      {hint && <span className="text-xs text-muted-foreground">({hint})</span>}
    </div>
  );
}

function PowerBadge({ power, stripMethod }: { power: Power; stripMethod?: StripMethod }) {
  const colors: Record<Power, string> = {
    18: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    26: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    36: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  };
  const getLabel = (p: Power): string => {
    if (p === 18) return "Fileira Simples · 350mA";
    if (p === 26) return "Fileira Simples · 500mA";
    if (p === 36) {
      return stripMethod === "STRIPLINE"
        ? "Stripline Única · 250mA · 75V"
        : "Barra Dupla · 350mA · 25V";
    }
    return "";
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colors[power]}`}>
      {power}W · {getLabel(power)}
    </span>
  );
}

function SkuDriverList({ entries, label }: { entries: SkuDriverEntry[]; label?: string }) {
  if (entries.length === 0) return null;
  return (
    <div className="rounded-md border border-border overflow-hidden">
      {label && (
        <div className="px-3 py-1.5 bg-muted/50 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
      )}
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/30">
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">SKU do Módulo</th>
            <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Qtd</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Driver por Peça</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Cód. EQ</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr key={idx} className="border-t border-border hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2 font-mono text-primary font-medium">{entry.sku}</td>
              <td className="px-3 py-2 text-right text-foreground font-semibold">{entry.quantity}</td>
              <td className="px-3 py-2 text-foreground">
                <span className="inline-flex items-center gap-1">
                  <Zap className="w-3 h-3 text-primary shrink-0" />
                  {entry.driver.quantity > 1 ? (
                    <><span className="font-bold text-primary">{entry.driver.quantity}×</span> {entry.driver.model}</>
                  ) : entry.driver.model}
                </span>
              </td>
              <td className="px-3 py-2">
                {entry.driver.code ? (
                  <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    {entry.driver.code}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiffuserSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DiffuserType | undefined;
  onChange: (v: DiffuserType) => void;
}) {
  return (
    <div>
      <FieldLabel hint={label}>Difusor</FieldLabel>
      <div className="grid grid-cols-3 gap-2">
        {DIFFUSER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-2 py-2 rounded-md text-xs font-semibold border transition-all flex flex-col items-center gap-0.5 ${
              value === opt.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            <span className="font-bold">{opt.label}</span>
            <span className={`text-[10px] ${value === opt.value ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {opt.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultBlock({ result }: { result: CompositionResult }) {
  const efficiency = result.requestedLength > 0
    ? Math.round((result.realizedLength / result.requestedLength) * 100)
    : 0;
  const isDual = result.application === "D1+D2";
  const profilePhoto = getProfilePhoto(result.profileCode);
  return (
    <div className="space-y-4">

      {/* Alerta Driver Remoto */}
      {result.isRemoteDriver && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50">
          <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Driver Remoto Obrigatório</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              {result.profileName} ({INSTALL_LABELS[result.installType]}) exige instalação do driver em ponto remoto — externo ao perfil.
            </p>
          </div>
        </div>
      )}

      {/* Resumo Geral */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Resumo da Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Layout com foto: imagem à esquerda + métricas 2×2 à direita */}
          {profilePhoto ? (
            <div className="flex gap-3 items-stretch">
              {/* Foto */}
              <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-40 flex items-center justify-center">
                <img
                  src={profilePhoto}
                  alt={result.profileName}
                  className="w-full h-full object-contain p-2"
                  loading="lazy"
                />
              </div>
              {/* Métricas 2×2 */}
              <div className="grid grid-cols-2 gap-2 flex-1">
                <div className="rounded-lg bg-muted/40 p-3 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Perfil</p>
                  <p className="text-sm font-bold text-foreground font-display">{result.profileName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{result.profileCode}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Instalação / Aplicação</p>
                  <p className="text-sm font-bold text-foreground font-display">
                    {INSTALL_LABELS[result.installType]} · {result.application}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isDual && result.independentLighting
                      ? result.forcedIndependent ? "Independente (forçado)" : "Independente"
                      : isDual ? "Conjunto" : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">
                    {isDual ? "Potência D1 / D2" : "Potência"}
                  </p>
                  <p className="text-sm font-bold text-foreground font-display">
                    {isDual ? `${result.powerD1}W / ${result.powerD2}W` : `${result.powerD1}W`}
                  </p>
                  <p className="text-xs text-muted-foreground">{result.cct} · {result.voltage}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Comprimento</p>
                  <p className={`text-sm font-bold font-display ${
                    efficiency === 100 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"
                  }`}>
                    {result.realizedLength}mm
                  </p>
                  <p className="text-xs text-muted-foreground">
                    de {result.requestedLength}mm · {efficiency}%
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Layout sem foto: grid 2×4 original */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted/40 p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Perfil</p>
                <p className="text-sm font-bold text-foreground font-display">{result.profileName}</p>
                <p className="text-xs text-muted-foreground font-mono">{result.profileCode}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Instalação / Aplicação</p>
                <p className="text-sm font-bold text-foreground font-display">
                  {INSTALL_LABELS[result.installType]} · {result.application}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isDual && result.independentLighting
                    ? result.forcedIndependent ? "Independente (forçado)" : "Independente"
                    : isDual ? "Conjunto" : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  {isDual ? "Potência D1 / D2" : "Potência"}
                </p>
                <p className="text-sm font-bold text-foreground font-display">
                  {isDual ? `${result.powerD1}W / ${result.powerD2}W` : `${result.powerD1}W`}
                </p>
                <p className="text-xs text-muted-foreground">{result.cct} · {result.voltage}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Comprimento</p>
                <p className={`text-sm font-bold font-display ${
                  efficiency === 100 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"
                }`}>
                  {result.realizedLength}mm
                </p>
                <p className="text-xs text-muted-foreground">
                  de {result.requestedLength}mm · {efficiency}%
                </p>
              </div>
            </div>
          )}

          {/* Barra Stripflex/Stripline */}
          <div className="rounded-lg bg-muted/30 border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {result.stripMethod === "STRIPLINE" ? "Barra Stripline" : "Barra Stripflex"}
            </p>
            <p className="text-sm font-medium text-foreground font-mono">{result.stripflexName}</p>
          </div>

          {/* Difusor SHARP */}
          {(result.diffuserD1 || result.diffuserD2) && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 p-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                Difusor SHARP
              </p>
              <div className="flex gap-4">
                {result.diffuserD1 && (
                  <span className="text-sm text-foreground">
                    <span className="font-semibold">D1:</span> {result.diffuserD1} — {DIFFUSER_OPTIONS.find(d => d.value === result.diffuserD1)?.desc}
                  </span>
                )}
                {result.diffuserD2 && (
                  <span className="text-sm text-foreground">
                    <span className="font-semibold">D2:</span> {result.diffuserD2} — {DIFFUSER_OPTIONS.find(d => d.value === result.diffuserD2)?.desc}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo Para Orçamento — Resumo para o cliente */}
      <QuoteSummaryCard result={result} />
      {/* Resumo para Pedido — Ficha Comercial */}
      <OrderSummaryCard result={result} />
      {/* Composição de Módulos — bloco unificado */}
      {result.composition.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Composição de Módulos
              {isDual && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  (D1 e D2 — mesmo perfil físico)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">SKU</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Tipo</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Compr.</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Qtd</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Barras *</th>
                  </tr>
                </thead>
                <tbody>
                  {result.composition.map((item, idx) => (
                    <tr key={idx} className="border-t border-border hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 font-mono text-primary font-medium">{item.sku}</td>
                      <td className="px-3 py-2 text-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span className="font-semibold">{item.moduleType}</span>
                          <span className="text-muted-foreground hidden sm:inline">
                            — {MODULE_TYPE_LABELS[item.moduleType]}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">{item.length}mm</td>
                      <td className="px-3 py-2 text-right text-foreground font-semibold">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-foreground">
                        {(() => { const b = isDual ? item.barsTotal * 2 : item.barsTotal; return Number.isInteger(b) ? b : b.toFixed(1); })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td className="px-3 py-2 font-semibold text-foreground" colSpan={2}>Total</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">{result.realizedLength}mm</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">
                      {result.composition.reduce((s, i) => s + i.quantity, 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">
                      {(() => {
                        const t = result.composition.reduce((s, i) => s + i.barsTotal, 0) * (isDual ? 2 : 1);
                        return Number.isInteger(t) ? t : t.toFixed(1);
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * Barras {result.stripMethod === "STRIPLINE" ? "Stripline (562,5mm cada, 75V)" : "Stripflex (562,5mm cada, 25V)"}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Drivers por SKU */}
      {(result.driversD1.length > 0 || result.driversD2.length > 0) && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Drivers por SKU
              <span className="text-xs font-normal text-muted-foreground ml-1">
                (1 driver por módulo — nunca compartilhado)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDual && result.independentLighting ? (
              <div className="space-y-4">
                <SkuDriverList
                  entries={result.driversD1}
                  label={`D1 · ${result.powerD1}W · ${result.voltage}`}
                />
                <SkuDriverList
                  entries={result.driversD2}
                  label={`D2 · ${result.powerD2}W · ${result.voltage}`}
                />
              </div>
            ) : isDual && !result.independentLighting ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Acendimento Conjunto — os mesmos drivers atendem D1 e D2 por SKU
                </p>
                <SkuDriverList
                  entries={result.combinedDrivers ?? result.driversD1}
                  label={`D1+D2 · ${result.powerD1}W · ${result.voltage}`}
                />
              </div>
            ) : (
              <SkuDriverList
                entries={result.driversD1}
                label={`${result.application} · ${result.powerD1}W · ${result.voltage}`}
              />
            )}

            {/* Resumo total de drivers */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                Resumo de Drivers
              </p>
              {(() => {
                // Para D1+D2 conjunto, usar combinedDrivers (barras × 2); caso contrário driversD1 + driversD2
                const allEntries = (isDual && !result.independentLighting && result.combinedDrivers)
                  ? result.combinedDrivers
                  : [...result.driversD1, ...result.driversD2];
                const driverMap = new Map<string, number>();
                for (const e of allEntries) {
                  const key = e.driver.model;
                  // Multiplica qty de SKUs pela qty de drivers por SKU (ex: 26W CERTADRIVE pode ser 2x ou 3x)
                  driverMap.set(key, (driverMap.get(key) ?? 0) + e.quantity * (e.driver.quantity ?? 1));
                }
                return (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(driverMap.entries()).map(([model, qty], idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        <Zap className="w-3 h-3" />
                        {qty}× {model}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notas de Engenharia */}
      {result.engineeringNotes.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4" />
              Notas de Engenharia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.engineeringNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Pedido de Produção — Template para cópia */}
      <ProductionTemplateCard result={result} />
    </div>
  );
}

//// ─── Resumo Para Orçamento (Resumo para o cliente) ──────────────────────────
function QuoteSummaryCard({ result }: { result: CompositionResult }) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const summary = generateQuoteSummary(result);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };
  return (
    <Card className="shadow-sm border-blue-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-blue-500" />
            Resumo Para Orçamento
          </CardTitle>
          <Button
            size="sm"
            variant={copied ? "default" : "outline"}
            onClick={handleCopy}
            className="gap-1.5 text-xs h-7"
          >
            {copied ? (
              <><ClipboardCheck className="w-3.5 h-3.5" /> Copiado!</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copiar Resumo</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <textarea
          ref={textareaRef}
          readOnly
          value={summary}
          className="w-full font-mono text-xs bg-muted/40 border border-border rounded-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-foreground leading-relaxed"
          rows={Math.max(summary.split('\n').length + 1, 3)}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Clique no texto para selecionar ou use o botão "Copiar Resumo" para copiar diretamente.
        </p>
      </CardContent>
    </Card>
  );
}

//// ─── Resumo para Pedido (Ficha Comercial) ─────────────────────────────────
function OrderSummaryCard({ result }: { result: CompositionResult }) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const summary = generateOrderSummary(result);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  return (
    <Card className="shadow-sm border-green-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-green-500" />
            Resumo para Pedido
          </CardTitle>
          <Button
            size="sm"
            variant={copied ? "default" : "outline"}
            onClick={handleCopy}
            className="gap-1.5 text-xs h-7"
          >
            {copied ? (
              <><ClipboardCheck className="w-3.5 h-3.5" /> Copiado!</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copiar Resumo</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <textarea
          ref={textareaRef}
          readOnly
          value={summary}
          className="w-full font-mono text-xs bg-muted/40 border border-border rounded-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-green-500/50 text-foreground leading-relaxed"
          rows={Math.max(summary.split('\n').length + 1, 3)}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Clique no texto para selecionar ou use o botão "Copiar Resumo" para copiar diretamente.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Template de Produção ───────────────────────────────────────────────────
function ProductionTemplateCard({ result }: { result: CompositionResult }) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const template = generateProductionTemplate(result);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback para browsers sem clipboard API
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  return (
    <Card className="shadow-sm border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Pedido de Produção
          </CardTitle>
          <Button
            size="sm"
            variant={copied ? "default" : "outline"}
            onClick={handleCopy}
            className="gap-1.5 text-xs h-7"
          >
            {copied ? (
              <><ClipboardCheck className="w-3.5 h-3.5" /> Copiado!</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copiar Tudo</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <textarea
          ref={textareaRef}
          readOnly
          value={template}
          className="w-full font-mono text-xs bg-muted/40 border border-border rounded-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground leading-relaxed"
          rows={Math.min(template.split('\n').length + 1, 30)}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Clique no texto para selecionar ou use o botão “Copiar Tudo” para copiar diretamente para a área de transferência.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  // Buscar drivers do Google Sheets (cache de 1h via React Query)
  const utils = trpc.useUtils();
  const { data: sheetDrivers } = trpc.led.drivers.useQuery(undefined, {
    staleTime: 60 * 60 * 1000, // 1 hora
    refetchOnWindowFocus: false,
  });

  // Mutation para forçar atualização do cache de drivers no servidor
  const refreshDriversMutation = trpc.led.refreshDrivers.useMutation({
    onSuccess: (data) => {
      utils.led.drivers.invalidate();
      console.log(`[Drivers] Atualizado: ${data.available} disponíveis de ${data.count} total`);
    },
  });

   // Categoria de produto
  const [productCategory, setProductCategory] = useState<ProductCategory>("Perfis");
  // Estados de Downlights
  const [dlInstalacao, setDlInstalacao] = useState<string | null>(null);
  const [dlFamilia, setDlFamilia] = useState<string | null>(null);
  const [dlProductIndex, setDlProductIndex] = useState<number | null>(null);
  const [dlVoltage, setDlVoltage] = useState<DownlightVoltage | null>(null);
  const [dlCCT, setDlCCT] = useState<DownlightCCT>("3000K");
  const [dlResult, setDlResult] = useState<DownlightResult | null>(null);

  // Listas derivadas para filtros de Downlights
  const dlInstalacoes = useMemo(() => Array.from(new Set(DOWNLIGHT_CATALOG.map(p => p.instalacao))).sort(), []);
  const dlFamilias = useMemo(() =>
    dlInstalacao ? Array.from(new Set(DOWNLIGHT_CATALOG.filter(p => p.instalacao === dlInstalacao).map(p => p.familia))).sort() : [],
    [dlInstalacao]
  );
  const dlProdutosFiltrados = useMemo(() =>
    dlInstalacao && dlFamilia
      ? DOWNLIGHT_CATALOG.map((p, i) => ({ p, i })).filter(({ p }) => p.instalacao === dlInstalacao && p.familia === dlFamilia)
      : [],
    [dlInstalacao, dlFamilia]
  );
  // Step 1: Perfil
  const [profileName, setProfileName] = useState<string>("");
  // Step 2: Instalação
  const [installType, setInstallType] = useState<InstallType | "">("");
  // Step 3: Aplicação (oculto para embutir)
  const [application, setApplication] = useState<Application>("D1");
  // Step 4: Potências
  const [powerD1, setPowerD1] = useState<Power>(18);
  const [powerD2, setPowerD2] = useState<Power>(18);
  // Step 4b: Método de barra para 36W
  const [stripMethod, setStripMethod] = useState<StripMethod>("STRIPFLEX");
  // Step 5: CCT, Tensão, Comprimento
  const [cct, setCct] = useState<CCT>("3000K");
  const [totalLength, setTotalLength] = useState<string>("2000");
  const [voltage, setVoltage] = useState<Voltage>("220Vac");
  // Toggles
  const [allowLongModules, setAllowLongModules] = useState(false);
  const [allowFractional, setAllowFractional] = useState(false);
  const [independentLighting, setIndependentLighting] = useState(false);
  // SHARP difusor
  const [diffuserD1, setDiffuserD1] = useState<DiffuserType | undefined>(undefined);
  const [diffuserD2, setDiffuserD2] = useState<DiffuserType | undefined>(undefined);

  // Result state
  const [result, setResult] = useState<CompositionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Dados derivados ──────────────────────────────────────────────────────────

  const profileNames = getProfileNames();

  // Tipos de instalação disponíveis para o perfil selecionado
  const availableInstallTypes = profileName ? getInstallTypesForProfile(profileName) : [];

  // Variante selecionada
  const selectedVariant = (profileName && installType)
    ? getVariant(profileName, installType as InstallType)
    : null;

  const profileCode = selectedVariant?.code ?? "";

  // Embutir: sempre D1, sem aplicação visível, sem acendimento independente
  const isEmbutir = installType === "EMBUTIR";

  // Aplicações permitidas para esta variante
  const allowD1 = selectedVariant?.allowD1 ?? true;
  const allowD2 = selectedVariant?.allowD2 ?? true;
  const allowD1D2 = selectedVariant?.allowD1D2 ?? false;
  const hasDiffuser = selectedVariant?.hasDiffuser ?? false;

  const effectiveApplication: Application = isEmbutir ? "D1" : application;
  const isDual = effectiveApplication === "D1+D2";
  const forcedIndependent = isDual && powerD1 !== powerD2;
  const effectiveIndependent = !isEmbutir && (forcedIndependent || (isDual && independentLighting));

  // Reset ao trocar perfil
  const handleProfileChange = (name: string) => {
    setProfileName(name);
    setInstallType("");
    setApplication("D1");
    setResult(null);
    setError(null);
  };

  // Reset ao trocar instalação
  const handleInstallChange = (type: InstallType) => {
    setInstallType(type);
    setApplication("D1");
    setResult(null);
    setError(null);
  };

  // Forcar 220Vac quando 26W selecionado (sem opcao Bivolt para 26W - logica v01)
  useEffect(() => {
    if (powerD1 === 26 && voltage === "Bivolt") {
      setVoltage("220Vac");
    }
  }, [powerD1, voltage]);

  // Reset ao trocar aplicação
  const handleApplicationChange = (app: Application) => {
    setApplication(app);
    if (app !== "D1+D2") setIndependentLighting(false);
    setResult(null);
    setError(null);
  };

  const handleCalculate = useCallback(() => {
    setError(null);

    if (!profileCode) {
      setError("Selecione o perfil e o tipo de instalação para continuar.");
      return;
    }

    const len = parseInt(totalLength);
    if (isNaN(len) || len <= 0) {
      setError("Informe um comprimento total válido.");
      return;
    }

    if (hasDiffuser) {
      if ((effectiveApplication === "D1" || effectiveApplication === "D1+D2") && !diffuserD1) {
        setError("Selecione o tipo de difusor para D1 (SHARP).");
        return;
      }
      if ((effectiveApplication === "D2" || effectiveApplication === "D1+D2") && !diffuserD2) {
        setError("Selecione o tipo de difusor para D2 (SHARP).");
        return;
      }
    }

    const input: ConfigInput = {
      profileCode,
      application: effectiveApplication,
      powerD1,
      powerD2: isDual ? powerD2 : undefined,
      cct,
      voltage,
      stripMethod: powerD1 === 36 ? stripMethod : "STRIPFLEX",
      totalLength: len,
      allowLongModules,
      allowFractional,
      independentLighting: effectiveIndependent,
      diffuserD1: hasDiffuser ? diffuserD1 : undefined,
      diffuserD2: hasDiffuser && isDual ? diffuserD2 : undefined,
      sheetDrivers: sheetDrivers ?? [],
    };

    try {
      const res = calculateComposition(input);
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao calcular composição.";
      setError(msg);
    }
  }, [profileCode, effectiveApplication, powerD1, powerD2, cct, voltage, stripMethod, totalLength, allowLongModules, allowFractional, effectiveIndependent, isDual, hasDiffuser, diffuserD1, diffuserD2]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-sidebar text-sidebar-foreground shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold font-display text-sidebar-foreground leading-none">
                Configurador de Produtos (versão beta)
              </h1>
              <p className="text-xs text-sidebar-foreground/60 leading-none mt-0.5">
                Alfalux Iluminação
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-sidebar-foreground/50 font-mono">
              v2.1 · {Object.keys(LED_CATALOG).length} variantes
            </span>
            <Button
              variant="ghost"
              size="icon"
              title="Atualizar banco de drivers"
              onClick={() => refreshDriversMutation.mutate()}
              disabled={refreshDriversMutation.isPending}
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <RefreshCw className={`w-4 h-4 ${refreshDriversMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="container py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-8 items-start">

          {/* ── Painel de Configuração ──────────────────────────────────────── */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">Configuração</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Preencha os parâmetros para calcular a composição ideal.
              </p>
            </div>

            <Card className="shadow-sm">
              <CardContent className="pt-6 space-y-5">

                {/* 0. Categoria de Produto */}
                <div>
                  <FieldLabel>Categoria de Produto</FieldLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {PRODUCT_CATEGORIES.map(({ value, label, icon: Icon, available }) => (
                      <button
                        key={value}
                        onClick={() => {
                          if (!available) {
                            toast.info(`${label} em breve`, {
                              description: "Esta categoria ainda não possui produtos cadastrados.",
                              duration: 3000,
                            });
                            return;
                          }
                          setProductCategory(value);
                          setProfileName("");
                          setInstallType("");
                          setResult(null);
                          setError(null);
                        }}
                        className={`relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border text-xs font-medium transition-all ${
                          productCategory === value
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : available
                              ? "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                              : "bg-muted/30 text-muted-foreground border-border/50 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="leading-tight text-center">{label}</span>
                        {!available && (
                          <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-muted text-muted-foreground border border-border rounded px-1 leading-tight">
                            em breve
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {productCategory === "Perfis" && (
                <React.Fragment>

                {/* 1. Perfil */}
                <div>
                  <FieldLabel>Perfil</FieldLabel>
                  <Select value={profileName} onValueChange={handleProfileChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profileNames.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Instalação */}
                {profileName && availableInstallTypes.length > 0 && (
                  <div>
                    <FieldLabel>Instalação</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {availableInstallTypes.map((type) => {
                        const variant = getVariant(profileName, type);
                        return (
                          <button
                            key={type}
                            onClick={() => handleInstallChange(type)}
                            className={`px-3 py-2.5 rounded-md text-sm font-medium border transition-all text-left ${
                              installType === type
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                          >
                            <span className="block font-semibold">{INSTALL_LABELS[type]}</span>
                            {variant && (
                              <span className={`text-[10px] font-mono mt-0.5 block ${
                                installType === type ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}>
                                {variant.code}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {isEmbutir && (
                      <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Embutir: sempre D1 · driver remoto obrigatório
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Aplicação (oculto para embutir) */}
                {selectedVariant && !isEmbutir && (
                  <div>
                    <FieldLabel>Aplicação</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {(["D1", "D2", "D1+D2"] as Application[]).map((app) => {
                        const disabled =
                          (app === "D1" && !allowD1) ||
                          (app === "D2" && !allowD2) ||
                          (app === "D1+D2" && !allowD1D2);
                        return (
                          <button
                            key={app}
                            onClick={() => { if (!disabled) handleApplicationChange(app); }}
                            disabled={disabled}
                            className={`px-3 py-2 rounded-md text-sm font-medium border transition-all ${
                              disabled
                                ? "opacity-30 cursor-not-allowed bg-muted text-muted-foreground border-border"
                                : application === app
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                          >
                            {app}
                          </button>
                        );
                      })}
                    </div>
                    {!allowD1D2 && (
                      <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        {profileName} não suporta D1+D2 simultâneos
                      </p>
                    )}
                  </div>
                )}

                {/* 4. Potência D1 */}
                {selectedVariant && (
                  <div>
                    <FieldLabel hint={isDual ? "D1" : undefined}>Potência</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {POWER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setPowerD1(opt.value)}
                          className={`px-3 py-2.5 rounded-md text-sm font-semibold border transition-all ${
                            powerD1 === opt.value
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <PowerBadge power={powerD1} stripMethod={powerD1 === 36 ? stripMethod : undefined} />
                    </div>

                    {/* Toggle Stripflex/Stripline para 36W */}
                    {powerD1 === 36 && (
                      <div className="mt-3 rounded-lg border border-orange-200 dark:border-orange-700/40 bg-orange-50 dark:bg-orange-900/20 p-3 space-y-2">
                        <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                          Método de Barra — 36W
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {(["STRIPFLEX", "STRIPLINE"] as StripMethod[]).map((method) => (
                            <button
                              key={method}
                              onClick={() => setStripMethod(method)}
                              className={`px-2 py-2 rounded-md text-xs font-semibold border transition-all flex flex-col items-center gap-0.5 ${
                                stripMethod === method
                                  ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                  : "bg-background text-foreground border-border hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                              }`}
                            >
                              <span className="font-bold">{method === "STRIPFLEX" ? "Stripflex Dupla" : "Stripline Única"}</span>
                              <span className={`text-[10px] ${stripMethod === method ? "text-white/70" : "text-muted-foreground"}`}>
                                {method === "STRIPFLEX" ? "2× barras · 350mA · 25V" : "1× barra · 250mA · 75V"}
                              </span>
                            </button>
                          ))}
                        </div>
                        {stripMethod === "STRIPLINE" && (
                          <p className="text-xs text-orange-700/80 dark:text-orange-400/80 flex items-start gap-1">
                            <Info className="w-3 h-3 mt-0.5 shrink-0" />
                            Stripline: apenas barras inteiras (1, 2, 3, 4 ou 5). Medidas fracionadas serão ignoradas.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 4b. Potência D2 (apenas D1+D2) */}
                {selectedVariant && isDual && (
                  <div>
                    <FieldLabel hint="D2">Potência</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {POWER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setPowerD2(opt.value)}
                          className={`px-3 py-2.5 rounded-md text-sm font-semibold border transition-all ${
                            powerD2 === opt.value
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2"><PowerBadge power={powerD2} /></div>
                    {forcedIndependent && (
                      <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Potências diferentes forçam Acendimento Independente
                      </p>
                    )}
                  </div>
                )}

                {/* 5. Difusor SHARP */}
                {selectedVariant && hasDiffuser && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-amber-500" />
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                          Tipo de Difusor — SHARP
                        </p>
                      </div>
                      {(effectiveApplication === "D1" || effectiveApplication === "D1+D2") && (
                        <DiffuserSelector
                          label={isDual ? "D1" : ""}
                          value={diffuserD1}
                          onChange={setDiffuserD1}
                        />
                      )}
                      {(effectiveApplication === "D2" || effectiveApplication === "D1+D2") && (
                        <DiffuserSelector
                          label="D2"
                          value={diffuserD2}
                          onChange={setDiffuserD2}
                        />
                      )}
                    </div>
                  </>
                )}

                {selectedVariant && <Separator />}

                {/* 6. CCT e Tensão */}
                {selectedVariant && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>CCT</FieldLabel>
                      <Select value={cct} onValueChange={(v) => setCct(v as CCT)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CCT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Tensão</FieldLabel>
                      {/* 26W não tem opção Bivolt — lógica v01 */}
                      {powerD1 === 26 ? (
                        <div className="px-3 py-2 rounded-md text-xs font-semibold border bg-primary text-primary-foreground border-primary shadow-sm text-center">
                          220Vac <span className="opacity-70 font-normal">(único para 26W)</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                          {(["220Vac", "Bivolt"] as const).map((v) => (
                            <button
                              key={v}
                              onClick={() => setVoltage(v)}
                              className={`px-2 py-2 rounded-md text-xs font-semibold border transition-all ${
                                voltage === v
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 7. Comprimento Total */}
                {selectedVariant && (
                  <div>
                    <FieldLabel>Comprimento Total</FieldLabel>
                    {isDual && (
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        D1 e D2 são instalados no mesmo perfil com o mesmo comprimento
                      </p>
                    )}
                    <div className="relative">
                      <input
                        type="number"
                        value={totalLength}
                        onChange={(e) => setTotalLength(e.target.value)}
                        min={100}
                        max={20000}
                        step={1}
                        className="w-full h-10 px-3 pr-12 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                        placeholder="ex: 2000"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                        mm
                      </span>
                    </div>
                  </div>
                )}

                {selectedVariant && <Separator />}

                {/* 8. Toggles (acendimento independente oculto para embutir) */}
                {selectedVariant && (
                  <div className="space-y-3">
                    {/* Acendimento Independente — oculto para embutir */}
                    {!isEmbutir && (
                      <div className="flex items-center justify-between">
                        <div>
                          <Label
                            htmlFor="independent"
                            className={`text-sm font-medium ${forcedIndependent ? "text-muted-foreground" : "cursor-pointer"}`}
                          >
                            Acendimento Independente
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {forcedIndependent
                              ? "Forçado — D1 e D2 com potências diferentes"
                              : "D1 e D2 com drivers separados"}
                          </p>
                        </div>
                        <Switch
                          id="independent"
                          checked={effectiveIndependent}
                          disabled={forcedIndependent || !isDual}
                          onCheckedChange={setIndependentLighting}
                        />
                      </div>
                    )}

                    {/* Módulos Longos */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="longmodules" className="text-sm font-medium cursor-pointer">
                          Permitir Módulos Longos
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Habilitar módulos &gt;2825mm (até 6 barras)
                        </p>
                      </div>
                      <Switch
                        id="longmodules"
                        checked={allowLongModules}
                        onCheckedChange={setAllowLongModules}
                      />
                    </div>
                    {/* Medidas Quebradas */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="allowfractional" className="text-sm font-medium cursor-pointer">
                          Considerar Medidas Quebradas
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Incluir módulos com barras decimais (ex: 1,1 · 3,4 · 4,2)
                        </p>
                      </div>
                      <Switch
                        id="allowfractional"
                        checked={allowFractional}
                        onCheckedChange={setAllowFractional}
                      />
                    </div>
                  </div>
                )}


                </React.Fragment>
                  )} {/* fim productCategory === Perfis */}                {/* ── Downlights ─────────────────────────────────────────── */}
                {productCategory === "Downlights" && (
                  <div className="space-y-4">
                    {/* Tipo de Instalação */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de Instalação</Label>
                      <Select
                        value={dlInstalacao ?? ""}
                        onValueChange={(v) => { setDlInstalacao(v); setDlFamilia(null); setDlProductIndex(null); setDlVoltage(null); setDlResult(null); }}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione o tipo de instalação..." />
                        </SelectTrigger>
                        <SelectContent>
                          {dlInstalacoes.map((inst) => (
                            <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Família */}
                    {dlInstalacao && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Família</Label>
                        <Select
                          value={dlFamilia ?? ""}
                          onValueChange={(v) => { setDlFamilia(v); setDlProductIndex(null); setDlVoltage(null); setDlResult(null); }}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione a família..." />
                          </SelectTrigger>
                          <SelectContent>
                            {dlFamilias.map((fam) => (
                              <SelectItem key={fam} value={fam}>{fam}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Produto */}
                    {dlFamilia && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</Label>
                        <Select
                          value={dlProductIndex !== null ? String(dlProductIndex) : ""}
                          onValueChange={(v) => { setDlProductIndex(Number(v)); setDlVoltage(null); setDlResult(null); }}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione o produto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {dlProdutosFiltrados.map(({ p, i }) => (
                              <SelectItem key={i} value={String(i)}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Tensão */}
                    {dlProductIndex !== null && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tensão</Label>
                        <div className="flex gap-2">
                          {(["220V", "Bivolt"] as DownlightVoltage[]).map((v) => {
                            const hasBivolt = DOWNLIGHT_CATALOG[dlProductIndex]?.driverBivolt !== null;
                            const disabled = v === "Bivolt" && !hasBivolt;
                            return (
                              <button
                                key={v}
                                disabled={disabled}
                                onClick={() => { setDlVoltage(v); setDlResult(null); }}
                                className={[
                                  "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                                  dlVoltage === v && !disabled
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-foreground border-border hover:border-primary/50",
                                  disabled ? "opacity-40 cursor-not-allowed" : "",
                                ].join(" ")}
                              >
                                {v}
                              </button>
                            );
                          })}
                        </div>
                        {dlVoltage === "Bivolt" && DOWNLIGHT_CATALOG[dlProductIndex]?.driverBivolt === null && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Este produto não possui opção Bivolt.
                          </p>
                        )}
                      </div>
                    )}
                    {/* CCT */}
                    {dlProductIndex !== null && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                        <div className="flex gap-2 flex-wrap">
                          {DOWNLIGHT_CCTS.map((c) => (
                            <button
                              key={c}
                              onClick={() => { setDlCCT(c); setDlResult(null); }}
                              className={[
                                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                                dlCCT === c
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-border hover:border-primary/50",
                              ].join(" ")}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}


              </CardContent>
            </Card>

            {/* Botão Calcular — Downlights */}
            {productCategory === "Downlights" && (
              <div className="space-y-2">
                {!dlInstalacao && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione o tipo de instalação antes de calcular.
                  </p>
                )}
                {dlInstalacao && !dlFamilia && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione a família antes de calcular.
                  </p>
                )}
                {dlFamilia && dlProductIndex === null && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione o produto antes de calcular.
                  </p>
                )}
                {dlProductIndex !== null && !dlVoltage && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione a tensão antes de calcular.
                  </p>
                )}
                <Button
                  disabled={dlProductIndex === null || !dlVoltage}
                  onClick={() => {
                    if (dlProductIndex === null || !dlVoltage) return;
                    const cfg: DownlightConfig = { productIndex: dlProductIndex, voltage: dlVoltage, cct: dlCCT, quantity: 1 };
                    setDlResult(calculateDownlight(cfg));
                  }}
                  className="w-full h-12 text-base font-semibold font-display"
                  size="lg"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Calcular Downlight
                </Button>
              </div>
            )}

            {/* Botão Calcular — Perfis */}
            {selectedVariant && productCategory === "Perfis" && (
              <Button
                onClick={handleCalculate}
                className="w-full h-12 text-base font-semibold font-display"
                size="lg"
              >
                <Zap className="w-5 h-5 mr-2" />
                Calcular Composição
              </Button>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* ── Painel de Resultados ────────────────────────────────────────── */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">Resultado</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Composição calculada com base nos parâmetros informados.
              </p>
            </div>

            {productCategory === "Perfis" && (!result ? (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">
                    Nenhum cálculo realizado
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    Configure os parâmetros no painel ao lado e clique em "Calcular Composição".
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ResultBlock result={result} />
            ))}

            {/* Resultado Downlights */}
            {productCategory === "Downlights" && dlResult && (
              <div className="space-y-4">
                {/* Card principal */}
                <Card className="shadow-sm border-amber-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Resultado — Downlight
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                        <p className="text-sm font-mono font-semibold text-primary">{dlResult.product.sku}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                        <p className="text-sm font-semibold">{dlResult.product.name}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p>
                        <p className="text-sm font-semibold">{dlResult.voltage}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                        <p className="text-sm font-semibold">{dlResult.cct}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Módulo LED</p>
                        <p className="text-sm font-semibold">{dlResult.ledModuleWithCCT}</p>
                      </div>
                      {dlResult.product.otica && (
                        <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ótica</p>
                          <p className="text-sm font-semibold">{dlResult.product.otica}</p>
                        </div>
                      )}
                      {dlResult.product.holder && (
                        <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Holder</p>
                          <p className="text-sm font-semibold">{dlResult.product.holder}</p>
                        </div>
                      )}
                      {dlResult.product.dissipador && (
                        <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Dissipador</p>
                          <p className="text-sm font-semibold">{dlResult.product.dissipador}</p>
                        </div>
                      )}
                      <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                        <p className="text-sm font-semibold">{dlResult.driver.model} <span className="font-mono text-primary">({dlResult.driver.code})</span></p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Resumo para Orçamento */}
                <Card className="shadow-sm border-blue-500/30">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      Resumo Para Orçamento
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => {
                        const txt = `${dlResult.product.name} ${dlResult.cct} ${dlResult.voltage}`.toUpperCase();
                        navigator.clipboard.writeText(txt);
                        toast.success("Copiado!");
                      }}
                    >
                      <Copy className="w-3 h-3" /> Copiar Resumo
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                      onClick={(e) => {
                        const sel = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(e.currentTarget);
                        sel?.removeAllRanges();
                        sel?.addRange(range);
                      }}
                    >
                      {`${dlResult.product.name} ${dlResult.cct} ${dlResult.voltage}`.toUpperCase()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão "Copiar Resumo" para copiar diretamente.</p>
                  </CardContent>
                </Card>

                {/* Resumo para Pedido */}
                <Card className="shadow-sm border-green-500/30">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-green-500" />
                      Resumo Para Pedido
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => {
                        const parts: string[] = [
                            (dlResult.ledModuleWithCCT.toUpperCase().startsWith("MÓDULO LED") ? dlResult.ledModuleWithCCT.toUpperCase() : `MÓDULO LED ${dlResult.ledModuleWithCCT.toUpperCase()}`),
                          ];
                          if (dlResult.product.otica) parts.push(dlResult.product.otica.toUpperCase());
                          if (dlResult.product.holder) parts.push(dlResult.product.holder.toUpperCase());
                          if (dlResult.product.dissipador) parts.push(dlResult.product.dissipador.toUpperCase());
                          parts.push(`1x DRIVER ${dlResult.driver.model.toUpperCase()} (${dlResult.driver.code})`);
                          const txt = (`CÓDIGO: ${dlResult.product.sku}\n${dlResult.product.name.toUpperCase()} ${dlResult.cct} ${dlResult.voltage} MONTADA COM ${parts.join(" + ")}`).replace(/\s*-\s*$/, '').trim();
                        navigator.clipboard.writeText(txt);
                        toast.success("Copiado!");
                      }}
                    >
                      <Copy className="w-3 h-3" /> Copiar Pedido
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                      onClick={(e) => {
                        const sel = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(e.currentTarget);
                        sel?.removeAllRanges();
                        sel?.addRange(range);
                      }}
                    >
                      {(() => {
                          const parts: string[] = [
                            (dlResult.ledModuleWithCCT.toUpperCase().startsWith("MÓDULO LED") ? dlResult.ledModuleWithCCT.toUpperCase() : `MÓDULO LED ${dlResult.ledModuleWithCCT.toUpperCase()}`),
                          ];
                          if (dlResult.product.otica) parts.push(dlResult.product.otica.toUpperCase());
                          if (dlResult.product.holder) parts.push(dlResult.product.holder.toUpperCase());
                          if (dlResult.product.dissipador) parts.push(dlResult.product.dissipador.toUpperCase());
                          parts.push(`1x DRIVER ${dlResult.driver.model.toUpperCase()} (${dlResult.driver.code})`);
                          return (`CÓDIGO: ${dlResult.product.sku}\n${dlResult.product.name.toUpperCase()} ${dlResult.cct} ${dlResult.voltage} MONTADA COM ${parts.join(" + ")}`).replace(/\s*-\s*$/, '').trim();
                        })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão "Copiar Pedido" para copiar diretamente.</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Estado vazio Downlights */}
            {productCategory === "Downlights" && !dlResult && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Lightbulb className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">Nenhum cálculo realizado</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">Selecione o tipo de instalação, família, produto, tensão e CCT, depois clique em "Calcular Downlight".</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border mt-16 py-6">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© 2026 Alfalux Iluminação · Configurador de Produtos</span>
          <span className="font-mono">
            {Object.keys(LED_CATALOG).length} variantes · Regra de Ouro aplicada
          </span>
        </div>
      </footer>
    </div>
  );
}
