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
  MODULE_TYPE_LABELS,
} from "@/lib/ledCatalog";
import { adaptProfileProducts } from "@/lib/profileApiAdapter";
import type { InstallType } from "@/lib/ledCatalog";
import { calculateComposition } from "@/lib/ledEngine";
import { generateProductionTemplate } from "@/lib/productionTemplate";
import { generateOrderSummary } from "@/lib/orderSummary";
import { generateQuoteSummary } from "@/lib/quoteSummary";
// import { calculateTotalPrice } from "@/lib/priceCatalog"; // Oculto temporariamente
import { getProfilePhoto, getDownlightPhoto, getPainelPhoto } from "@/lib/profilePhotos";
import {
  DOWNLIGHT_CATALOG,
  calculateDownlight,
} from "@/lib/downlightCatalog";
import type { DownlightResult, ControleType } from "@/lib/downlightCatalog";
import {
  PAINEL_CATALOG,
  calculatePainel,
} from "@/lib/painelCatalog";
import type { PainelResult } from "@/lib/painelCatalog";
import { SPOT_CATALOG, calculateSpot } from "@/lib/spotCatalog";
import type { SpotProduct, SpotResult } from "@/lib/spotCatalog";
import { ARANDELA_CATALOG, calculateArandela } from "@/lib/arandelaCatalog";
import type { ArandelaProduct, ArandelaResult } from "@/lib/arandelaCatalog";
import { adaptAlfaluxProducts } from "@/lib/alfaluxApiAdapter";
import { useAlfaluxProducts } from "@/hooks/useAlfaluxProducts";
import {
  LED_BAR_CATALOG,
  LED_BAR_POTENCIA_OPTIONS,
  LED_BAR_DIFUSOR_OPTIONS,
  LED_BAR_CONTROLE_OPTIONS,
  LED_BAR_MAX_LENGTH_MM,
  getAvailableVoltages,
  calculateLedBar,
} from "@/lib/ledBarCatalog";
import type { LedBarProduct, LedBarPotencia, LedBarDifusor, LedBarControle, LedBarVoltage, LedBarResult } from "@/lib/ledBarCatalog";
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

const PRODUCT_CATEGORIES: { value: ProductCategory; label: string; icon: React.ElementType; image?: string; available: boolean }[] = [
  { value: "Perfis",       label: "Perfis",        icon: Layers,      image: "/manus-storage/PERFIS_e65318d1.png",      available: true  },
  { value: "Downlights",   label: "Downlights",    icon: Lightbulb,   image: "/manus-storage/DOWNLIGHTS_938e9ef2.png",  available: true  },
  { value: "Painéis",      label: "Painéis",       icon: Grid2X2,     image: "/manus-storage/PAINEIS_34c70c2f.png",     available: true },
  { value: "Spots",        label: "Spots",         icon: Focus,       image: "/manus-storage/SPOTS_dfc5ecee.jpg",       available: true },
  { value: "Arandelas",    label: "Arandelas",     icon: Lamp,        image: "/manus-storage/ARANDELAS_324ddfb0.webp",  available: true },
  { value: "Área Externa", label: "Área Externa",  icon: TreePine,    image: "/manus-storage/AREAEXTERNA_5811f7cb.png", available: false },
  { value: "Balizadores",  label: "Balizadores",   icon: Navigation,  image: "/manus-storage/BALIZADORES_482d54f1.png", available: false },
  { value: "Decorativas",  label: "Decorativas",   icon: Sparkles,    image: "/manus-storage/DECORATIVAS_4ee44c0e.png", available: false },
];

// ─── Auxiliar: quantidade de drivers por produto/controle/tensão ─────────────
function driverQtyFor(
  product: { driverQtd220?: number | null; driverQtdBivolt?: number | null; driverQtdDim110v?: number | null; driverQtdDimDali?: number | null },
  controle: string,
  tensao: string
): number {
  if (controle === 'DIM DALI') return product.driverQtdDimDali ?? 1;
  if (controle === 'DIM 1-10V') return product.driverQtdDim110v ?? 1;
  if (tensao === 'Bivolt') return product.driverQtdBivolt ?? 1;
  return product.driverQtd220 ?? 1;
}

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
          {entries.map((entry, idx) => {
            // Se o driver tem combo, expandir em múltiplas linhas (uma por driver do combo)
            const comboItems = entry.driver.combo && entry.driver.combo.length > 0
              ? entry.driver.combo
              : [{ code: entry.driver.code, model: entry.driver.model, quantity: entry.driver.quantity ?? 1 }];
            return comboItems.map((item, comboIdx) => (
              <tr key={`${idx}-${comboIdx}`} className="border-t border-border hover:bg-muted/20 transition-colors">
                {/* SKU e Qtd só na primeira linha do combo */}
                {comboIdx === 0 ? (
                  <>
                    <td className="px-3 py-2 font-mono text-primary font-medium" rowSpan={comboItems.length}>{entry.sku}</td>
                    <td className="px-3 py-2 text-right text-foreground font-semibold" rowSpan={comboItems.length}>{entry.quantity}</td>
                  </>
                ) : null}
                <td className="px-3 py-2 text-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Zap className="w-3 h-3 text-primary shrink-0" />
                    {item.quantity > 1 ? (
                      <><span className="font-bold text-primary">{item.quantity}×</span> {item.model}</>
                    ) : item.model}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {item.code ? (
                    <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {item.code}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              </tr>
            ));
          })}
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
  const profilePhoto = getProfilePhoto(result.profileCode, result.diffuserD1, result.diffuserD2);
  return (
    <div className="space-y-4">

      {/* Aviso: Medida Ajustada para Maior */}
      {result.adjustedToLarger && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700/50">
          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-orange-700 dark:text-orange-400">Medida Ajustada para Maior</p>
            <p className="text-xs text-orange-700/80 dark:text-orange-400/80 mt-0.5">
              A medida solicitada ({result.originalRequestedLength}mm) foi ajustada para {result.realizedLength}mm — o menor módulo disponível acima da medida desejada.
              Verifique no projeto se o espaço comporta esse ajuste e se não há risco de colisão com paredes ou outros elementos.
            </p>
          </div>
        </div>
      )}

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
              {result.controlType !== "onoff" && (
                <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  {result.controlType === "dimDali" ? "DIM DALI" : "DIM 1-10V"}
                </span>
              )}
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
                const allEntries = (isDual && !result.independentLighting && result.combinedDrivers)
                  ? result.combinedDrivers
                  : [...result.driversD1, ...result.driversD2];
                const driverMap = new Map<string, number>();
                for (const e of allEntries) {
                  if (e.driver.combo && e.driver.combo.length > 0) {
                    // Driver composto: somar cada item do combo
                    for (const item of e.driver.combo) {
                      const key = item.model;
                      driverMap.set(key, (driverMap.get(key) ?? 0) + e.quantity * item.quantity);
                    }
                  } else {
                    const key = e.driver.model;
                    driverMap.set(key, (driverMap.get(key) ?? 0) + e.quantity * (e.driver.quantity ?? 1));
                  }
                }
                return (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(driverMap.entries()).map(([model, qty], idx) => (
                      <span
                        key={idx}
                        className={[
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border",
                          result.controlType !== "onoff"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                            : "bg-primary/10 text-primary border-primary/20"
                        ].join(" ")}
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

  // Preço temporariamente oculto — reativar quando necessário
  // const totalPrice = calculateTotalPrice(...);

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
      <CardContent className="space-y-3">
        <textarea
          ref={textareaRef}
          readOnly
          value={summary}
          className="w-full font-mono text-xs bg-muted/40 border border-border rounded-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-foreground leading-relaxed"
          rows={Math.max(summary.split('\n').length + 1, 3)}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
        {/* Preço total temporariamente oculto — reativar quando necessário:
        {totalPrice !== null && (
          <div className="flex items-center justify-between rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-3">
            <span className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Preço Total</span>
            <span className="text-lg font-bold text-blue-300">{formatBRL(totalPrice)}</span>
          </div>
        )}
        */}
        <p className="text-xs text-muted-foreground">
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

  // Buscar produtos da API Alfalux diretamente no browser (client-side)
  // Isso evita restrições de rede do servidor sandbox e garante dados sempre frescos
  const { products: alfaluxApiProducts, isLoading: alfaluxLoading, refetch: refetchAlfaluxProducts } = useAlfaluxProducts();
  // Adaptar produtos da API para os tipos internos (fallback para catálogos estáticos)
  const adaptedCatalogs = useMemo(() => {
    if (alfaluxApiProducts && alfaluxApiProducts.length > 0) {
      return adaptAlfaluxProducts(alfaluxApiProducts);
    }
    return null;
  }, [alfaluxApiProducts]);
  const activeDlCatalog = adaptedCatalogs?.downlights ?? DOWNLIGHT_CATALOG;
  const activePanelCatalog = adaptedCatalogs?.paineis ?? PAINEL_CATALOG;
  const activeSpotCatalog = adaptedCatalogs?.spots ?? SPOT_CATALOG;
  const activeArandelaCatalog = adaptedCatalogs?.arandelas ?? ARANDELA_CATALOG;

  // ── Catálogo de perfis via API (com fallback para LED_CATALOG estático) ──────
  const activeProfileCatalog = useMemo(() => {
    if (!alfaluxApiProducts || alfaluxApiProducts.length === 0) return LED_CATALOG;
    const apiCatalog = adaptProfileProducts(alfaluxApiProducts);
    return apiCatalog ?? LED_CATALOG;
  }, [alfaluxApiProducts]);

  const profileCatalogIsFromApi = useMemo(() => {
    if (!alfaluxApiProducts || alfaluxApiProducts.length === 0) return false;
    const apiCatalog = adaptProfileProducts(alfaluxApiProducts);
    return apiCatalog !== null && Object.keys(apiCatalog).length > 0;
  }, [alfaluxApiProducts]);

  // Funções de acesso ao catálogo ativo de perfis
  const activeGetProfileNames = useCallback(() => {
    const names = new Set(Object.values(activeProfileCatalog).map((v) => v.name));
    return Array.from(names);
  }, [activeProfileCatalog]);

  const activeGetInstallTypesForProfile = useCallback(
    (profileName: string) => {
      const variants = Object.values(activeProfileCatalog).filter((v) => v.name === profileName);
      const types = new Set(variants.map((v) => v.installType));
      return Array.from(types);
    },
    [activeProfileCatalog]
  );

  const activeGetVariant = useCallback(
    (profileName: string, installType: InstallType) => {
      return Object.values(activeProfileCatalog).find(
        (v) => v.name === profileName && v.installType === installType
      );
    },
    [activeProfileCatalog]
  );

   // Categoria de produto
  const [productCategory, setProductCategory] = useState<ProductCategory>("Perfis");
  // Estados de Downlights
  const [dlInstalacao, setDlInstalacao] = useState<string | null>(null);
  const [dlFamilia, setDlFamilia] = useState<string | null>(null);
  const [dlProductKey, setDlProductKey] = useState<string | null>(null);
  const [dlVoltage, setDlVoltage] = useState<"220V" | "Bivolt" | null>(null);
  const [dlCCT, setDlCCT] = useState<string>("3000K");
  const [dlControle, setDlControle] = useState<ControleType>("ON/OFF");
  const [dlResult, setDlResult] = useState<DownlightResult | null>(null);
  // Estados de Painéis
  const [panelInstalacao, setPanelInstalacao] = useState<string | null>(null);
  const [panelFamilia, setPanelFamilia] = useState<string | null>(null);
  const [panelProductKey, setPanelProductKey] = useState<string | null>(null);
  const [panelVoltage, setPanelVoltage] = useState<"220V" | "Bivolt" | null>(null);
  const [panelCCT, setPanelCCT] = useState<string>("3000K");
  const [panelControle, setPanelControle] = useState<ControleType>("ON/OFF");
  const [panelResult, setPanelResult] = useState<PainelResult | null>(null);
  // Estados de Spots
  const [spotInstalacao, setSpotInstalacao] = useState<string | null>(null);
  const [spotFamilia, setSpotFamilia] = useState<string | null>(null);
  const [spotProductKey, setSpotProductKey] = useState<string | null>(null);
  const [spotVoltage, setSpotVoltage] = useState<"220V" | "Bivolt" | null>(null);
  const [spotCCT, setSpotCCT] = useState<string>("3000K");
  const [spotControle, setSpotControle] = useState<ControleType>("ON/OFF");
   const [spotResult, setSpotResult] = useState<SpotResult | null>(null);
  // Estados de Arandelas
  const [arandelaInstalacao, setArandelaInstalacao] = useState<string | null>(null);
  const [arandelaFamilia, setArandelaFamilia] = useState<string | null>(null);
  const [arandelaProductKey, setArandelaProductKey] = useState<string | null>(null);
  const [arandelaVoltage, setArandelaVoltage] = useState<"220V" | "Bivolt" | null>(null);
  const [arandelaCCT, setArandelaCCT] = useState<string>("3000K");
  const [arandelaControle, setArandelaControle] = useState<ControleType>("ON/OFF");
  const [arandelaResult, setArandelaResult] = useState<ArandelaResult | null>(null);
  // ── Estados de LED BAR ───────────────────────────────────────────────────────
  const [lbFamilia, setLbFamilia] = useState<string | null>(null);
  const [lbPotencia, setLbPotencia] = useState<LedBarPotencia | null>(null);
  const [lbDifusor, setLbDifusor] = useState<LedBarDifusor | null>(null);
  const [lbControle, setLbControle] = useState<LedBarControle>("ON/OFF");
  const [lbVoltage, setLbVoltage] = useState<LedBarVoltage>("220V");
  const [lbCCT, setLbCCT] = useState<string>("3000K");
  const [lbComprimento, setLbComprimento] = useState<string>("");
  const [lbNCortes, setLbNCortes] = useState<string>("1");
  const [lbResult, setLbResult] = useState<LedBarResult | null>(null);

  // Catálogo ativo de LED BAR (API ou fallback estático)
  const activeLedBarCatalog = useMemo(() => {
    const apiLedBars = adaptedCatalogs?.ledBars;
    return apiLedBars && apiLedBars.length > 0 ? apiLedBars : LED_BAR_CATALOG;
  }, [adaptedCatalogs]);

  // Famílias LED BAR disponíveis
  const lbFamilias = useMemo(() =>
    Array.from(new Set(activeLedBarCatalog.map(p => p.familia))).sort(),
    [activeLedBarCatalog]
  );

  // Produto LED BAR selecionado (potência + difusor)
  const lbSelectedProduct = useMemo<LedBarProduct | null>(() => {
    if (!lbFamilia || !lbPotencia || !lbDifusor) return null;
    return activeLedBarCatalog.find(
      p => p.familia === lbFamilia && p.potencia === lbPotencia && p.difusor === lbDifusor
    ) ?? null;
  }, [lbFamilia, lbPotencia, lbDifusor, activeLedBarCatalog]);

  // Tensões disponíveis para o produto e controle selecionados
  const lbAvailableVoltages = useMemo<LedBarVoltage[]>(() => {
    if (!lbSelectedProduct) return ["220V"];
    return getAvailableVoltages(lbSelectedProduct, lbControle);
  }, [lbSelectedProduct, lbControle]);

  // CCTs disponíveis para o produto selecionado
  const lbAvailableCCTs = useMemo(() => {
    return lbSelectedProduct?.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
  }, [lbSelectedProduct]);

  // Comprimento em mm (número)
  const lbComprimentoNum = useMemo(() => {
    const v = parseInt(lbComprimento);
    return isNaN(v) ? 0 : v;
  }, [lbComprimento]);

  // Requer cortes obrigatórios (comprimento > 3000mm)
  const lbRequiresCuts = lbComprimentoNum > LED_BAR_MAX_LENGTH_MM;

  // Comprimento por trecho com os cortes atuais
  const lbNCortesNum = Math.max(1, parseInt(lbNCortes) || 1);
  const lbTrechoMm = lbComprimentoNum > 0 ? Math.ceil(lbComprimentoNum / lbNCortesNum) : 0;
  // Trecho excede 3000mm mesmo com cortes definidos
  const lbTrechoExcede = lbTrechoMm > LED_BAR_MAX_LENGTH_MM;
  // Quantidade mínima de cortes para que nenhum trecho ultrapasse 3000mm
  const lbMinCortesNecessarios = lbComprimentoNum > 0 ? Math.ceil(lbComprimentoNum / LED_BAR_MAX_LENGTH_MM) : 1;

  // Reset tensão quando muda controle ou produto
  useEffect(() => {
    if (!lbAvailableVoltages.includes(lbVoltage)) {
      setLbVoltage(lbAvailableVoltages[0] ?? "220V");
    }
  }, [lbAvailableVoltages, lbVoltage]);

  // Reset CCT quando muda produto
  useEffect(() => {
    if (!lbAvailableCCTs.includes(lbCCT)) {
      setLbCCT(lbAvailableCCTs[0] ?? "3000K");
    }
  }, [lbAvailableCCTs, lbCCT]);

  const handleCalculateLedBar = useCallback(() => {
    if (!lbSelectedProduct) {
      toast.error("Selecione família, potência e difusor.");
      return;
    }
    const comprMm = lbComprimentoNum;
    if (comprMm <= 0) {
      toast.error("Informe um comprimento válido.");
      return;
    }
    const nCortes = lbRequiresCuts ? Math.max(2, parseInt(lbNCortes) || 2) : 1;
    const res = calculateLedBar({
      product: lbSelectedProduct,
      comprimentoMm: comprMm,
      nCortes,
      controle: lbControle,
      voltage: lbVoltage,
      cct: lbCCT,
    });
    if (res.errors.length > 0) {
      toast.error(res.errors[0]);
      return;
    }
    setLbResult(res);
  }, [lbSelectedProduct, lbComprimentoNum, lbRequiresCuts, lbNCortes, lbControle, lbVoltage, lbCCT]);

  // Listas derivadas para filtros de Downlights (usando catálogo dinâmico da API ou fallback estático)
  const dlInstalacoes = useMemo(() => Array.from(new Set(activeDlCatalog.map(p => p.instalacao))).sort(), [activeDlCatalog]);
  const dlFamilias = useMemo(() =>
    dlInstalacao ? Array.from(new Set(activeDlCatalog.filter(p => p.instalacao === dlInstalacao).map(p => p.familia))).sort() : [],
    [dlInstalacao, activeDlCatalog]
  );
  const dlProdutosFiltrados = useMemo(() =>
    dlInstalacao && dlFamilia
      ? activeDlCatalog.map((p, i) => ({ p, i })).filter(({ p }) => p.instalacao === dlInstalacao && p.familia === dlFamilia)
      : [],
    [dlInstalacao, dlFamilia, activeDlCatalog]
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
  const [controlType, setControlType] = useState<import("@/lib/ledEngine").ControlType>("onoff");
  // Toggles
  const [allowLongModules, setAllowLongModules] = useState(false);
  const [allowFractional, setAllowFractional] = useState(false);
  const [adjustToLarger, setAdjustToLarger] = useState(false);
  const [allowMixedIF, setAllowMixedIF] = useState(false);
  const [independentLighting, setIndependentLighting] = useState(false);
  // SHARP difusor
  const [diffuserD1, setDiffuserD1] = useState<DiffuserType | undefined>(undefined);
  const [diffuserD2, setDiffuserD2] = useState<DiffuserType | undefined>(undefined);

  // Result state
  const [result, setResult] = useState<CompositionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Dados derivados ─────────────────────────────────────────────
  // Usa funções do catálogo ativo (API ou estático)
  const profileNames = activeGetProfileNames();
  // Tipos de instalação disponíveis para o perfil selecionado
  const availableInstallTypes = profileName ? activeGetInstallTypesForProfile(profileName) : [];
  // Variante selecionada
  const selectedVariant = (profileName && installType)
    ? activeGetVariant(profileName, installType as InstallType) ?? null
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
      adjustToLarger,
      allowMixedIF,
      independentLighting: effectiveIndependent,
      diffuserD1: hasDiffuser ? diffuserD1 : undefined,
      diffuserD2: hasDiffuser && isDual ? diffuserD2 : undefined,
      sheetDrivers: sheetDrivers ?? [],
      controlType,
      driverDimDali: selectedVariant?.driverDimDali ?? null,
      driverDim110v: selectedVariant?.driverDim110v ?? null,
    };

    try {
      const res = calculateComposition(input);
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao calcular composição.";
      setError(msg);
    }
  }, [profileCode, effectiveApplication, powerD1, powerD2, cct, voltage, stripMethod, totalLength, allowLongModules, allowFractional, adjustToLarger, allowMixedIF, effectiveIndependent, isDual, hasDiffuser, diffuserD1, diffuserD2, controlType, selectedVariant]);

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
              v2.1 · {Object.keys(activeProfileCatalog).length} variantes
              {profileCatalogIsFromApi && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  ao vivo
                </span>
              )}
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
                    {PRODUCT_CATEGORIES.map(({ value, label, icon: Icon, image, available }) => (
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
                        className={`relative flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                          productCategory === value
                            ? "bg-primary/10 text-primary border-primary shadow-sm ring-1 ring-primary/30"
                            : available
                              ? "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                              : "bg-muted/30 text-muted-foreground border-border/50 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <div className="w-full aspect-[4/3] rounded overflow-hidden flex items-center justify-center bg-muted/20">
                          {image ? (
                            <img
                              src={image}
                              alt={label}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <Icon className="w-5 h-5 shrink-0 text-muted-foreground" />
                          )}
                        </div>
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
                {/* Status do catálogo de perfis */}
                <div>
                  {alfaluxLoading ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                      Carregando catálogo...
                    </span>
                  ) : profileCatalogIsFromApi ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                      {Object.keys(activeProfileCatalog).length} variantes • Dados ao vivo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground" />
                      {Object.keys(activeProfileCatalog).length} variantes • Catálogo local
                    </span>
                  )}
                </div>
                {/* 1. Perfil / Família */}
                <div>
                  <FieldLabel>Perfil</FieldLabel>
                  <Select
                    value={lbFamilia ? `__LEDBAR__${lbFamilia}` : profileName}
                    onValueChange={(v) => {
                      if (v.startsWith("__LEDBAR__")) {
                        const fam = v.replace("__LEDBAR__", "");
                        setLbFamilia(fam);
                        setLbPotencia(null);
                        setLbDifusor(null);
                        setLbResult(null);
                        // Limpar seleção de perfil modular
                        setProfileName("");
                        setInstallType("");
                        setResult(null);
                        setError(null);
                      } else {
                        handleProfileChange(v);
                        setLbFamilia(null);
                        setLbResult(null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profileNames.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Perfis Modulares</div>
                          {profileNames.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </>
                      )}
                      {lbFamilias.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">LED BAR</div>
                          {lbFamilias.map((fam) => (
                            <SelectItem key={`__LEDBAR__${fam}`} value={`__LEDBAR__${fam}`}>{fam}</SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* ── Fluxo LED BAR ────────────────────────────────────────────────────────── */}
                {lbFamilia && (
                <div className="space-y-4">

                  {/* Potência */}
                  <div>
                    <FieldLabel>Potência</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {LED_BAR_POTENCIA_OPTIONS.map((opt) => {
                        const exists = activeLedBarCatalog.some(
                          p => p.familia === lbFamilia && p.potencia === opt.value
                        );
                        return (
                          <button
                            key={opt.value}
                            onClick={() => { if (exists) { setLbPotencia(opt.value); setLbDifusor(null); setLbResult(null); } }}
                            disabled={!exists}
                            className={`px-3 py-2 rounded-md text-sm font-medium border transition-all ${
                              !exists
                                ? "opacity-30 cursor-not-allowed bg-muted text-muted-foreground border-border"
                                : lbPotencia === opt.value
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Difusor */}
                  {lbPotencia && (
                  <div>
                    <FieldLabel>Difusor</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {LED_BAR_DIFUSOR_OPTIONS.map((opt) => {
                        const exists = activeLedBarCatalog.some(
                          p => p.familia === lbFamilia && p.potencia === lbPotencia && p.difusor === opt.value
                        );
                        return (
                          <button
                            key={opt.value}
                            onClick={() => { if (exists) { setLbDifusor(opt.value); setLbResult(null); } }}
                            disabled={!exists}
                            className={`px-3 py-2.5 rounded-md text-sm font-medium border transition-all text-left ${
                              !exists
                                ? "opacity-30 cursor-not-allowed bg-muted text-muted-foreground border-border"
                                : lbDifusor === opt.value
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                          >
                            <span className="block font-bold text-base leading-tight">{opt.value}</span>
                            <span className="block text-[10px] mt-0.5 opacity-80">{opt.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  )}

                  {/* Comprimento */}
                  {lbDifusor && (
                  <div>
                    <FieldLabel>Comprimento (mm)</FieldLabel>
                    <input
                      type="number"
                      min={1}
                      max={99999}
                      value={lbComprimento}
                      onChange={(e) => { setLbComprimento(e.target.value); setLbResult(null); }}
                      placeholder="Ex: 2500"
                      className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    {lbRequiresCuts && (
                      <p className="mt-1.5 text-xs text-amber-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Comprimento acima de {LED_BAR_MAX_LENGTH_MM}mm — informe a quantidade de cortes.
                      </p>
                    )}
                  </div>
                  )}

                  {/* Quantidade de Trechos */}
                  {lbDifusor && (
                  <div>
                    <FieldLabel hint={lbRequiresCuts ? "obrigatório" : "opcional"}>Quantidade de Cortes</FieldLabel>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={lbNCortes}
                      onChange={(e) => { setLbNCortes(e.target.value); setLbResult(null); }}
                      placeholder="1"
                      className={`w-full h-10 px-3 rounded-md border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        lbRequiresCuts ? "border-amber-500" : "border-border"
                      }`}
                    />
                    {lbComprimentoNum > 0 && lbNCortesNum >= 2 && !lbTrechoExcede && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {lbNCortesNum} cortes → {lbNCortesNum} trechos de {Math.round(lbComprimentoNum / lbNCortesNum)}mm cada
                      </p>
                    )}
                    {lbTrechoExcede && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>
                          Com {lbNCortesNum} corte{lbNCortesNum !== 1 ? "s" : ""}, cada trecho ficaria com {lbTrechoMm}mm — acima do limite de {LED_BAR_MAX_LENGTH_MM}mm.
                          {" "}Mínimo necessário: <strong>{lbMinCortesNecessarios} cortes</strong>.
                        </span>
                      </p>
                    )}
                  </div>
                  )}

                  {/* Controle */}
                  {lbDifusor && (
                  <div>
                    <FieldLabel>Controle</FieldLabel>
                    <div className="flex gap-2">
                      {LED_BAR_CONTROLE_OPTIONS.map((opt) => {
                        const prod = lbSelectedProduct;
                        const isAvail = opt.value === "ON/OFF"
                          || (opt.value === "DIM 0-10V" && prod?.driverDim010v != null)
                          || (opt.value === "DIM DALI" && prod?.driverDimDali != null);
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              if (isAvail) {
                                setLbControle(opt.value);
                                setLbResult(null);
                              }
                            }}
                            disabled={!isAvail}
                            title={!isAvail ? "Não disponível para este produto" : undefined}
                            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-all ${
                              !isAvail
                                ? "opacity-30 cursor-not-allowed bg-muted text-muted-foreground border-border"
                                : lbControle === opt.value
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    {!lbSelectedProduct && (
                      <p className="mt-1.5 text-xs text-muted-foreground">DIM 0-10V e DIM DALI serão habilitados quando o produto estiver selecionado.</p>
                    )}
                  </div>
                  )}

                  {/* Tensão */}
                  {lbDifusor && (
                  <div>
                    <FieldLabel>Tensão</FieldLabel>
                    <div className="flex gap-2">
                      {(["110V", "220V", "Bivolt"] as LedBarVoltage[]).map((v) => {
                        const avail = lbAvailableVoltages.includes(v);
                        return (
                          <button
                            key={v}
                            onClick={() => { if (avail) { setLbVoltage(v); setLbResult(null); } }}
                            disabled={!avail}
                            title={!avail ? "Não disponível para o controle selecionado" : undefined}
                            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-all ${
                              !avail
                                ? "opacity-30 cursor-not-allowed bg-muted text-muted-foreground border-border"
                                : lbVoltage === v
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                    {lbControle === "DIM 0-10V" && (
                      <p className="mt-1.5 text-xs text-amber-500 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Fonte DIM 0-10V é monovolt: escolha 110V ou 220V.
                      </p>
                    )}
                  </div>
                  )}

                  {/* CCT */}
                  {lbDifusor && (
                  <div>
                    <FieldLabel>CCT</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {lbAvailableCCTs.map((c) => (
                        <button
                          key={c}
                          onClick={() => { setLbCCT(c); setLbResult(null); }}
                          className={`px-4 py-2 rounded-md text-sm font-medium border transition-all ${
                            lbCCT === c
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Botão Calcular */}
                  {lbDifusor && (
                  <Button
                    className="w-full h-12 text-base font-semibold"
                    onClick={handleCalculateLedBar}
                    disabled={!lbSelectedProduct || lbComprimentoNum <= 0 || (lbRequiresCuts && lbNCortesNum < 2) || lbTrechoExcede}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Calcular LED BAR
                  </Button>
                  )}

                </div>
                )}
                {/* fim fluxo LED BAR */}

                {/* 2. Instalação */}
                {profileName && availableInstallTypes.length > 0 && (
                  <div>
                    <FieldLabel>Instalação</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {availableInstallTypes.map((type) => {
                        const variant = activeGetVariant(profileName, type);
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
                    {/* Tipo de Controle — exibir apenas se a API retornar drivers DIM */}
                    {(selectedVariant?.driverDimDali || selectedVariant?.driverDim110v) && (
                      <div>
                        <FieldLabel>Tipo de Controle</FieldLabel>
                        <div className="flex flex-wrap gap-1.5">
                          {(["onoff", ...(selectedVariant?.driverDimDali ? ["dimDali"] : []), ...(selectedVariant?.driverDim110v ? ["dim110v"] : [])] as import("@/lib/ledEngine").ControlType[]).map((ct) => (
                            <button
                              key={ct}
                              onClick={() => setControlType(ct)}
                              className={[
                                "px-2 py-2 rounded-md text-xs font-semibold border transition-all",
                                controlType === ct
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50",
                              ].join(" ")}
                            >
                              {ct === "onoff" ? "ON/OFF" : ct === "dimDali" ? "DIM DALI" : "DIM 1-10V"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
                    {/* Ajustar para Medida Maior */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="adjusttolarger" className="text-sm font-medium cursor-pointer">
                          Ajustar para Medida Maior
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Se não couber na medida exata, ajusta para o próximo módulo acima
                        </p>
                      </div>
                      <Switch
                        id="adjusttolarger"
                        checked={adjustToLarger}
                        onCheckedChange={setAdjustToLarger}
                      />
                    </div>
                    {/* Otimizar com IFs Diferentes */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="allowmixedif" className="text-sm font-medium cursor-pointer">
                          Otimizar com IFs Diferentes
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Permite IFs de tamanhos distintos nas pontas para melhor aproveitamento
                        </p>
                        {allowMixedIF && (
                          <p className="text-xs text-amber-500 mt-0.5">
                            ⚠️ Estética menos uniforme — pontas com módulos de tamanhos diferentes
                          </p>
                        )}
                      </div>
                      <Switch
                        id="allowmixedif"
                        checked={allowMixedIF}
                        onCheckedChange={setAllowMixedIF}
                      />
                    </div>
                  </div>
                )}


                </React.Fragment>
                  )} {/* fim productCategory === Perfis */}                {/* ── Downlights ─────────────────────────────────────────── */}
                {productCategory === "Downlights" && (
                  <div className="space-y-4">
                    {/* Badge de status da API */}
                    <div className="flex items-center gap-2">
                      {alfaluxLoading ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                          Carregando catálogo...
                        </span>
                      ) : adaptedCatalogs ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                          {activeDlCatalog.length} produtos • Dados ao vivo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground" />
                          Catálogo local
                        </span>
                      )}
                    </div>
                    {/* Tipo de Instalação */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de Instalação</Label>
                      <Select
                        value={dlInstalacao ?? ""}
                        onValueChange={(v) => { setDlInstalacao(v); setDlFamilia(null); setDlProductKey(null); setDlVoltage(null); setDlResult(null); }}
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
                          onValueChange={(v) => { setDlFamilia(v); setDlProductKey(null); setDlVoltage(null); setDlResult(null); }}
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
                          value={dlProductKey ?? ""}
                          onValueChange={(v) => {
                            setDlProductKey(v);
                            setDlVoltage(null);
                            setDlResult(null);
                            // Reset CCT para primeiro valor disponível do produto
                            const [s, ...np] = v.split('::');
                            const newProd = activeDlCatalog.find(p => p.sku === s && p.name === np.join('::'));
                            const availCCTs = newProd?.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
                            if (!availCCTs.includes(dlCCT)) setDlCCT(availCCTs[0] ?? "3000K");
                          }}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione o produto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {dlProdutosFiltrados.map(({ p }, idx) => {
                              const key = `${p.sku ?? ""}::${p.name}`;
                              return <SelectItem key={`${key}-${idx}`} value={key}>{p.name}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Controle */}
                    {dlProductKey !== null && (() => {
                      const [_dlCtrlSku, ..._dlCtrlNameParts] = (dlProductKey ?? '::').split('::');
                      const _dlCtrlName = _dlCtrlNameParts.join('::');
                      const dlSelProdCtrl = activeDlCatalog.find(p => p.sku === _dlCtrlSku && p.name === _dlCtrlName);
                      const hasDim110v = dlSelProdCtrl?.driverDim110v != null;
                      const hasDimDali = dlSelProdCtrl?.driverDimDali != null;
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Controle</Label>
                          <div className="flex gap-2">
                            {(["ON/OFF", "DIM 1-10V", "DIM DALI"] as ControleType[]).map((ctrl) => {
                              const isAvailable = ctrl === "ON/OFF" || (ctrl === "DIM 1-10V" && hasDim110v) || (ctrl === "DIM DALI" && hasDimDali);
                              return (
                                <button
                                  key={ctrl}
                                  disabled={!isAvailable}
                                  onClick={() => {
                                    if (!isAvailable) return;
                                    setDlControle(ctrl);
                                    setDlResult(null);
                                    // Se DIM selecionado e driver não suporta bivolt, resetar para 220V
                                    if (ctrl !== 'ON/OFF') {
                                      const dimDrv = ctrl === 'DIM DALI' ? dlSelProdCtrl?.driverDimDali : dlSelProdCtrl?.driverDim110v;
                                      const dimBivolt = dimDrv != null && /bivolt/i.test(dimDrv.model);
                                      if (!dimBivolt && dlVoltage === 'Bivolt') setDlVoltage('220V');
                                    }
                                  }}
                                  title={!isAvailable ? "Driver não cadastrado para este produto" : undefined}
                                  className={[
                                    "flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                                    dlControle === ctrl && isAvailable
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-background text-foreground border-border hover:border-primary/50",
                                    !isAvailable ? "opacity-40 cursor-not-allowed" : "",
                                  ].join(" ")}
                                >
                                  {ctrl}
                                </button>
                              );
                            })}
                          </div>
                          {!hasDim110v && !hasDimDali && (
                            <p className="text-xs text-muted-foreground">DIM 1-10V e DIM DALI serão habilitados quando os dados estiverem disponíveis.</p>
                          )}
                        </div>
                      );
                    })()}
                    {/* Tensão */}
                    {dlProductKey !== null && (() => {
                      const [_dlVSku, ..._dlVNameParts] = (dlProductKey ?? '::').split('::');
                      const _dlVName = _dlVNameParts.join('::');
                      const dlSelProdV = activeDlCatalog.find(p => p.sku === _dlVSku && p.name === _dlVName);
                      // Verificar se o driver DIM selecionado suporta bivolt
                      const dlDimDrv = dlControle === 'DIM DALI' ? dlSelProdV?.driverDimDali : dlControle === 'DIM 1-10V' ? dlSelProdV?.driverDim110v : null;
                      const dlDimBivolt = dlDimDrv != null && /bivolt/i.test(dlDimDrv.model);
                      const hasBivoltDl = dlControle !== 'ON/OFF' ? dlDimBivolt : (dlSelProdV?.driverBivolt != null);
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tensão</Label>
                          <div className="flex gap-2">
                            {(["220V", "Bivolt"] as ("220V" | "Bivolt")[]).map((v) => {
                              const disabled = v === "Bivolt" && !hasBivoltDl;
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
                          {dlControle !== 'ON/OFF' && !dlDimBivolt && (
                            <p className="text-xs text-muted-foreground">Driver DIM selecionado é somente 220V.</p>
                          )}
                          {dlControle === 'ON/OFF' && dlVoltage === "Bivolt" && !dlSelProdV?.driverBivolt && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Este produto não possui opção Bivolt.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                    {/* CCT */}
                    {dlProductKey !== null && (() => {
                      const dlSelProd = activeDlCatalog.find(p => { const [s, ...np] = (dlProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); });
                      const dlAvailCCTs = dlSelProd?.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                          <div className="flex gap-2 flex-wrap">
                            {dlAvailCCTs.map((c) => (
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
                      );
                    })()}
                  </div>
                )}

                {/* ── Painéis ───────────────────────────────────────────────────────────────────────────────────── */}
                {productCategory === "Painéis" && (() => {
                  const panelInstalacoes = Array.from(new Set(activePanelCatalog.map(p => p.instalacao))).sort();
                  const panelFamilias = panelInstalacao
                    ? Array.from(new Set(activePanelCatalog.filter(p => p.instalacao === panelInstalacao).map(p => p.familia))).sort()
                    : [];
                  const panelProdutos = panelInstalacao && panelFamilia
                    ? activePanelCatalog.map((p, i) => ({ p, i })).filter(({ p }) => p.instalacao === panelInstalacao && p.familia === panelFamilia)
                    : [];
                  return (
                    <div className="space-y-4">
                      {/* Badge de status da API */}
                      <div className="flex items-center gap-2">
                        {alfaluxLoading ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                            Carregando catálogo...
                          </span>
                        ) : adaptedCatalogs ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                            {activePanelCatalog.length} produtos • Dados ao vivo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground" />
                            Catálogo local
                          </span>
                        )}
                        <button
                          onClick={() => refetchAlfaluxProducts()}
                          disabled={alfaluxLoading}
                          title="Atualizar dados da API"
                          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                        >
                          <RefreshCw className={`w-3 h-3 ${alfaluxLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                      {/* Tipo de Instalação */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de Instalação</Label>
                        <Select
                          value={panelInstalacao ?? ""}
                          onValueChange={(v) => { setPanelInstalacao(v); setPanelFamilia(null); setPanelProductKey(null); setPanelVoltage(null); setPanelResult(null); }}
                        >
                          <SelectTrigger className="h-10"><SelectValue placeholder="Selecione o tipo de instalação..." /></SelectTrigger>
                          <SelectContent>
                            {panelInstalacoes.map((inst) => (
                              <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Família */}
                      {panelInstalacao && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Família</Label>
                          <Select
                            value={panelFamilia ?? ""}
                            onValueChange={(v) => { setPanelFamilia(v); setPanelProductKey(null); setPanelVoltage(null); setPanelResult(null); }}
                          >
                            <SelectTrigger className="h-10"><SelectValue placeholder="Selecione a família..." /></SelectTrigger>
                            <SelectContent>
                              {panelFamilias.map((fam) => (
                                <SelectItem key={fam} value={fam}>{fam}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {/* Produto */}
                      {panelFamilia && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</Label>
                          <Select
                            value={panelProductKey ?? ""}
                            onValueChange={(v) => {
                              setPanelProductKey(v);
                              setPanelVoltage(null);
                              setPanelControle("ON/OFF");
                              setPanelResult(null);
                              // Reset CCT para primeiro valor disponível do produto
                              const [s, ...np] = v.split('::');
                              const newProd = activePanelCatalog.find(p => p.sku === s && p.name === np.join('::'));
                              const availCCTs = newProd?.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
                              if (!availCCTs.includes(panelCCT)) setPanelCCT(availCCTs[0] ?? "3000K");
                            }}
                          >
                            <SelectTrigger className="h-10"><SelectValue placeholder="Selecione o produto..." /></SelectTrigger>
                            <SelectContent>
                              {panelProdutos.map(({ p, i }) => {
                                const key = `${p.sku ?? ''}::${p.name}`;
                                return <SelectItem key={`${key}-${i}`} value={key}>{p.name}</SelectItem>;
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {/* Controle */}
                      {panelProductKey !== null && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Controle</Label>
                          <div className="flex gap-2">
                            {(["ON/OFF", "DIM 1-10V", "DIM DALI"] as ControleType[]).map((ctrl) => {
                              const [_pSku, ..._pNameParts] = (panelProductKey ?? '::').split('::'); const _pName = _pNameParts.join('::'); const selProd = panelProductKey !== null ? activePanelCatalog.find(p => p.sku === _pSku && p.name === _pName) : null;
                              const isAvailable =
                                ctrl === "ON/OFF" ||
                                (ctrl === "DIM 1-10V" && selProd?.driverDim110v != null) ||
                                (ctrl === "DIM DALI" && selProd?.driverDimDali != null);
                              return (
                                <button
                                  key={ctrl}
                                  disabled={!isAvailable}
                                  onClick={() => {
                                    if (isAvailable) {
                                      setPanelControle(ctrl);
                                      setPanelResult(null);
                                      // Se o novo controle for DIM e o driver não suportar bivolt, forçar 220V
                                      if (ctrl !== 'ON/OFF') {
                                        const dimDrv = ctrl === 'DIM DALI' ? selProd?.driverDimDali : selProd?.driverDim110v;
                                        const dimBivolt = dimDrv != null && /bivolt/i.test(dimDrv.model);
                                        if (!dimBivolt) setPanelVoltage('220V');
                                      }
                                    }
                                  }}
                                  title={!isAvailable ? "Não disponível para este produto" : undefined}
                                  className={[
                                    "flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                                    panelControle === ctrl && isAvailable
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-background text-foreground border-border hover:border-primary/50",
                                    !isAvailable ? "opacity-40 cursor-not-allowed" : "",
                                  ].join(" ")}
                                >
                                  {ctrl}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {/* Tensão */}
                      {panelProductKey !== null && (() => {
                        const [_vSku, ..._vNameParts] = (panelProductKey ?? '::').split('::');
                        const _vName = _vNameParts.join('::');
                        const selProdV = activePanelCatalog.find(p => p.sku === _vSku && p.name === _vName);
                        // Driver DIM selecionado (DALI ou 1-10V)
                        const dimDriver = panelControle === 'DIM DALI' ? selProdV?.driverDimDali
                          : panelControle === 'DIM 1-10V' ? selProdV?.driverDim110v
                          : null;
                        // Bivolt permitido no modo DIM apenas se o modelo do driver contiver "bivolt" (case-insensitive)
                        const dimSupportsBivolt = dimDriver != null && /bivolt/i.test(dimDriver.model);
                        // Bivolt permitido no modo ON/OFF se o produto tiver driverBivolt
                        const hasBivoltOnOff = selProdV?.driverBivolt != null;
                        const bivoltAllowed = panelControle === 'ON/OFF' ? hasBivoltOnOff : dimSupportsBivolt;
                        return (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tensão</Label>
                            <div className="flex gap-2">
                              {(["220V", "Bivolt"] as ("220V" | "Bivolt")[]).map((v) => {
                                const disabled = v === "Bivolt" && !bivoltAllowed;
                                return (
                                  <button
                                    key={v}
                                    disabled={disabled}
                                    onClick={() => { if (!disabled) { setPanelVoltage(v); setPanelResult(null); } }}
                                    className={[
                                      "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                                      panelVoltage === v && !disabled
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
                            {panelVoltage === "Bivolt" && !bivoltAllowed && (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {panelControle !== 'ON/OFF'
                                  ? 'Driver DIM selecionado é somente 220V.'
                                  : 'Este produto não possui opção Bivolt.'}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                      {/* CCT */}
                      {panelProductKey !== null && (() => {
                        const panelSelProd = activePanelCatalog.find(p => { const [s, ...np] = (panelProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); });
                        const panelAvailCCTs = panelSelProd?.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
                        return (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                            <div className="flex gap-2 flex-wrap">
                              {panelAvailCCTs.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => { setPanelCCT(c); setPanelResult(null); }}
                                  className={[
                                    "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                                    panelCCT === c
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-background text-foreground border-border hover:border-primary/50",
                                  ].join(" ")}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

              </CardContent>
            </Card>

            {/* Bloco de seleção — Spots */}
            {productCategory === "Spots" && (() => {
              const spotInstalacoes = Array.from(new Set(activeSpotCatalog.map(p => p.instalacao))).sort();
              const spotFamilias = spotInstalacao
                ? Array.from(new Set(activeSpotCatalog.filter(p => p.instalacao === spotInstalacao).map(p => p.familia))).sort()
                : [];
              const spotProdutos = spotInstalacao && spotFamilia
                ? activeSpotCatalog.map((p, i) => ({ p, i })).filter(({ p }) => p.instalacao === spotInstalacao && p.familia === spotFamilia)
                : [];
              return (
                <div className="space-y-4">
                  {/* Badge de status da API */}
                  <div className="flex items-center gap-2">
                    {alfaluxLoading ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                        Carregando catálogo...
                      </span>
                    ) : adaptedCatalogs ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                        {activeSpotCatalog.length} produtos • Dados ao vivo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground" />
                        Catálogo local
                      </span>
                    )}
                  </div>
                  {/* Tipo de Instalação */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de Instalação</Label>
                    <Select
                      value={spotInstalacao ?? ""}
                      onValueChange={(v) => { setSpotInstalacao(v); setSpotFamilia(null); setSpotProductKey(null); setSpotVoltage(null); setSpotResult(null); }}
                    >
                      <SelectTrigger className="h-10"><SelectValue placeholder="Selecione o tipo de instalação..." /></SelectTrigger>
                      <SelectContent>
                        {spotInstalacoes.map((inst) => (
                          <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Família */}
                  {spotInstalacao && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Família</Label>
                      <Select
                        value={spotFamilia ?? ""}
                        onValueChange={(v) => { setSpotFamilia(v); setSpotProductKey(null); setSpotVoltage(null); setSpotResult(null); }}
                      >
                        <SelectTrigger className="h-10"><SelectValue placeholder="Selecione a família..." /></SelectTrigger>
                        <SelectContent>
                          {spotFamilias.map((fam) => (
                            <SelectItem key={fam} value={fam}>{fam}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* Produto */}
                  {spotFamilia && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</Label>
                      <Select
                        value={spotProductKey ?? ""}
                        onValueChange={(v) => {
                          setSpotProductKey(v);
                          setSpotVoltage(null);
                          setSpotResult(null);
                          // Reset CCT para primeiro valor disponível do produto
                          const [s, ...np] = v.split('::');
                          const newProd = activeSpotCatalog.find(p => p.sku === s && p.name === np.join('::'));
                          const availCCTs = newProd?.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
                          if (!availCCTs.includes(spotCCT)) setSpotCCT(availCCTs[0] ?? "3000K");
                        }}
                      >
                        <SelectTrigger className="h-10"><SelectValue placeholder="Selecione o produto..." /></SelectTrigger>
                        <SelectContent>
                          {spotProdutos.map(({ p }, idx) => {
                            const key = `${p.sku ?? ""}::${p.name}`;
                            return <SelectItem key={`${key}-${idx}`} value={key}>{p.name}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* Controle */}
                  {spotProductKey !== null && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Controle</Label>
                      <div className="flex gap-2">
                        {(["ON/OFF", "DIM 1-10V", "DIM DALI"] as ControleType[]).map((ctrl) => {
                          const isAvailable = ctrl === "ON/OFF";
                          return (
                            <button
                              key={ctrl}
                              disabled={!isAvailable}
                              onClick={() => { if (isAvailable) { setSpotControle(ctrl); setSpotResult(null); } }}
                              title={!isAvailable ? "Opção ainda não disponível" : undefined}
                              className={[
                                "flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                                spotControle === ctrl && isAvailable
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-border hover:border-primary/50",
                                !isAvailable ? "opacity-40 cursor-not-allowed" : "",
                              ].join(" ")}
                            >
                              {ctrl}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">DIM 1-10V e DIM DALI serão habilitados quando os dados estiverem disponíveis.</p>
                    </div>
                  )}
                  {/* Tensão */}
                  {spotProductKey !== null && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tensão</Label>
                      <div className="flex gap-2">
                        {(["220V", "Bivolt"] as ("220V" | "Bivolt")[]).map((v) => {
                          const [_sSku, ..._sNameParts] = (spotProductKey ?? '::').split('::'); const _sName = _sNameParts.join('::'); const hasBivolt = activeSpotCatalog.find(p => p.sku === _sSku && p.name === _sName)?.driverBivolt !== null;
                          const disabled = v === "Bivolt" && !hasBivolt;
                          return (
                            <button
                              key={v}
                              disabled={disabled}
                              onClick={() => { setSpotVoltage(v); setSpotResult(null); }}
                              className={[
                                "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                                spotVoltage === v && !disabled
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
                      {spotVoltage === "Bivolt" && activeSpotCatalog.find(p => { const [s, ...np] = (spotProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); })?.driverBivolt === null && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Este produto não possui opção Bivolt.
                        </p>
                      )}
                    </div>
                  )}
                  {/* CCT */}
                  {spotProductKey !== null && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                      <div className="flex gap-2 flex-wrap">
                        {(activeSpotCatalog.find(p => { const [s, ...np] = (spotProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); })?.ccts ?? ["2700K", "3000K", "4000K", "5000K"]).map((c) => (
                          <button
                            key={c}
                            onClick={() => { setSpotCCT(c); setSpotResult(null); }}
                            className={[
                              "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                              spotCCT === c
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
              );
            })()}

            {/* Bloco de seleção — Arandelas */}
            {productCategory === "Arandelas" && (() => {
              const arandelaInstalacoes = Array.from(new Set(activeArandelaCatalog.map(p => p.instalacao))).sort();
              const arandelaFamilias = arandelaInstalacao
                ? Array.from(new Set(activeArandelaCatalog.filter(p => p.instalacao === arandelaInstalacao).map(p => p.familia))).sort()
                : [];
              const arandelaProdutos = arandelaInstalacao && arandelaFamilia
                ? activeArandelaCatalog.filter(p => p.instalacao === arandelaInstalacao && p.familia === arandelaFamilia)
                : [];
              return (
                <div className="space-y-4">
                  {/* Badge de status da API */}
                  <div className="flex items-center gap-2">
                    {alfaluxLoading ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                        Carregando catálogo...
                      </span>
                    ) : adaptedCatalogs ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                        {activeArandelaCatalog.length} produto{activeArandelaCatalog.length !== 1 ? "s" : ""} • Dados ao vivo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground" />
                        Catálogo local
                      </span>
                    )}
                  </div>
                  {/* Tipo de Instalação */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de Instalação</Label>
                    <Select
                      value={arandelaInstalacao ?? ""}
                      onValueChange={(v) => { setArandelaInstalacao(v); setArandelaFamilia(null); setArandelaProductKey(null); setArandelaVoltage(null); setArandelaResult(null); }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione a instalação..." />
                      </SelectTrigger>
                      <SelectContent>
                        {arandelaInstalacoes.map(ins => (
                          <SelectItem key={ins} value={ins}>{ins}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Família */}
                  {arandelaInstalacao && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Família</Label>
                      <Select
                        value={arandelaFamilia ?? ""}
                        onValueChange={(v) => { setArandelaFamilia(v); setArandelaProductKey(null); setArandelaVoltage(null); setArandelaResult(null); }}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione a família..." />
                        </SelectTrigger>
                        <SelectContent>
                          {arandelaFamilias.map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* Produto */}
                  {arandelaFamilia && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</Label>
                      <Select
                        value={arandelaProductKey ?? ""}
                        onValueChange={(v) => {
                          setArandelaProductKey(v);
                          const [newSku, ...newNameParts] = v.split('::');
                          const newName = newNameParts.join('::');
                          const newProd = activeArandelaCatalog.find(p => p.sku === newSku && p.name === newName);
                          if (newProd) {
                            setArandelaVoltage(null);
                            const defaultCCT = newProd.ccts.includes("3000K") ? "3000K" : newProd.ccts[0];
                            setArandelaCCT(defaultCCT);
                          }
                          setArandelaResult(null);
                        }}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione o produto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {arandelaProdutos.map((p) => {
                            const key = `${p.sku}::${p.name}`;
                            return (
                              <SelectItem key={key} value={key}>{p.name}</SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* Controle */}
                  {arandelaProductKey !== null && (() => {
                    const [_aSku, ..._aNameParts] = (arandelaProductKey ?? '::').split('::');
                    const _aName = _aNameParts.join('::');
                    const _aProd = activeArandelaCatalog.find(p => p.sku === _aSku && p.name === _aName);
                    const availableControles: ControleType[] = ["ON/OFF"];
                    return (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Controle</Label>
                        <div className="flex gap-2 flex-wrap">
                          {availableControles.map(ctrl => (
                            <button
                              key={ctrl}
                              onClick={() => { setArandelaControle(ctrl); setArandelaResult(null); }}
                              className={[
                                "flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                                arandelaControle === ctrl
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-border hover:border-primary/50",
                              ].join(" ")}
                            >
                              {ctrl}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {/* Tensão */}
                  {arandelaProductKey !== null && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tensão</Label>
                      <div className="flex gap-2">
                        {(["220V", "Bivolt"] as ("220V" | "Bivolt")[]).map((v) => {
                          const [_aSku, ..._aNameParts] = (arandelaProductKey ?? '::').split('::'); const _aName = _aNameParts.join('::'); const hasBivolt = activeArandelaCatalog.find(p => p.sku === _aSku && p.name === _aName)?.driverBivolt !== null;
                          const disabled = v === "Bivolt" && !hasBivolt;
                          return (
                            <button
                              key={v}
                              disabled={disabled}
                              onClick={() => { setArandelaVoltage(v); setArandelaResult(null); }}
                              className={[
                                "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                                arandelaVoltage === v && !disabled
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
                    </div>
                  )}
                  {/* CCT */}
                  {arandelaProductKey !== null && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                      <div className="flex gap-2 flex-wrap">
                        {(activeArandelaCatalog.find(p => { const [s, ...np] = (arandelaProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); })?.ccts ?? ["2700K", "3000K", "4000K", "5000K"]).map((c) => (
                          <button
                            key={c}
                            onClick={() => { setArandelaCCT(c); setArandelaResult(null); }}
                            className={[
                              "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                              arandelaCCT === c
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
              );
            })()}
            {/* Botão Calcular — Arandelas */}
            {productCategory === "Arandelas" && (
              <div className="space-y-2">
                {!arandelaInstalacao && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione o tipo de instalação antes de calcular.
                  </p>
                )}
                {arandelaInstalacao && !arandelaFamilia && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione a família antes de calcular.
                  </p>
                )}
                {arandelaFamilia && arandelaProductKey === null && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione o produto antes de calcular.
                  </p>
                )}
                {arandelaProductKey !== null && !arandelaVoltage && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione a tensão antes de calcular.
                  </p>
                )}
                <Button
                  disabled={arandelaProductKey === null || !arandelaVoltage}
                  onClick={() => {
                    if (arandelaProductKey === null || !arandelaVoltage) return;
                    const [arandelaSku, ...arandelaNameParts] = (arandelaProductKey ?? '::').split('::');
                    const arandelaName = arandelaNameParts.join('::');
                    setArandelaResult(calculateArandela(activeArandelaCatalog, { productSku: arandelaSku, productName: arandelaName, tensao: arandelaVoltage, cct: arandelaCCT, controle: arandelaControle }));
                  }}
                  className="w-full h-12 text-base font-semibold font-display"
                  size="lg"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Calcular Arandela
                </Button>
              </div>
            )}
            {/* Botão Calcular — Spots */}
            {productCategory === "Spots" && (
              <div className="space-y-2">
                {!spotInstalacao && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione o tipo de instalação antes de calcular.
                  </p>
                )}
                {spotInstalacao && !spotFamilia && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione a família antes de calcular.
                  </p>
                )}
                {spotFamilia && spotProductKey === null && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione o produto antes de calcular.
                  </p>
                )}
                {spotProductKey !== null && !spotVoltage && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione a tensão antes de calcular.
                  </p>
                )}
                <Button
                  disabled={spotProductKey === null || !spotVoltage}
                  onClick={() => {
                    if (spotProductKey === null || !spotVoltage) return;
                    const [spotSku, ...spotNameParts] = (spotProductKey ?? '::').split('::');
                    const spotName = spotNameParts.join('::');
                    setSpotResult(calculateSpot(activeSpotCatalog, { productSku: spotSku, productName: spotName, tensao: spotVoltage, cct: spotCCT, controle: spotControle }));
                  }}
                  className="w-full h-12 text-base font-semibold font-display"
                  size="lg"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Calcular Spot
                </Button>
              </div>
            )}

            {/* Botão Calcular — Painéis */}
            {productCategory === "Painéis" && (
              <div className="space-y-2">
                {!panelInstalacao && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione o tipo de instalação antes de calcular.
                  </p>
                )}
                {panelInstalacao && !panelFamilia && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione a família antes de calcular.
                  </p>
                )}
                {panelFamilia && panelProductKey === null && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione o produto antes de calcular.
                  </p>
                )}
                {panelProductKey !== null && !panelVoltage && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione a tensão antes de calcular.
                  </p>
                )}
                <Button
                  disabled={panelProductKey === null || !panelVoltage}
                  onClick={() => {
                    if (panelProductKey === null || !panelVoltage) return;
                    const [panelSku, ...panelNameParts] = (panelProductKey ?? '::').split('::');
                    const panelName = panelNameParts.join('::');
                    const selPainel = activePanelCatalog.find(p => p.sku === panelSku && p.name === panelName);
                    if (!selPainel) return;
                    setPanelResult(calculatePainel({ productSku: panelSku, productName: panelName, tensao: panelVoltage, cct: panelCCT, controle: panelControle }, activePanelCatalog));
                  }}
                  className="w-full h-12 text-base font-semibold font-display"
                  size="lg"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Calcular Painél
                </Button>
              </div>
            )}

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
                {dlFamilia && dlProductKey === null && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione o produto antes de calcular.
                  </p>
                )}
                {dlProductKey !== null && !dlVoltage && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione a tensão antes de calcular.
                  </p>
                )}
                <Button
                  disabled={dlProductKey === null || !dlVoltage}
                  onClick={() => {
                    if (dlProductKey === null || !dlVoltage) return;
                    const [dlSku, ...dlNameParts] = (dlProductKey ?? '::').split('::');
                    const dlName = dlNameParts.join('::');
                    setDlResult(calculateDownlight({ productSku: dlSku, productName: dlName, tensao: dlVoltage, cct: dlCCT, controle: dlControle }, activeDlCatalog));
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

            {productCategory === "Perfis" && !lbFamilia && (!result ? (
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

            {/* ── Resultado LED BAR ─────────────────────────────────────────────────── */}
            {productCategory === "Perfis" && lbFamilia && (
              !lbResult ? (
                <Card className="shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <Zap className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-base font-semibold text-foreground font-display">Nenhum cálculo realizado</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                      Selecione potência, difusor, comprimento e clique em "Calcular LED BAR".
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Card principal */}
                  <Card className="shadow-sm border-emerald-500/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        Resultado — LED BAR
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Foto do produto LED BAR */}
                      {lbResult.product.fotoUrl && (
                        <div className="flex gap-3 items-stretch">
                          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 flex items-center justify-center">
                            <img src={lbResult.product.fotoUrl} alt={lbResult.product.name} className="w-full h-full object-contain p-2" loading="lazy" />
                          </div>
                          <div className="flex-1 min-w-0 p-3 rounded-lg bg-muted/50 flex flex-col justify-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                            <p className="text-sm font-semibold">{lbResult.product.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{lbResult.product.familia} · {lbResult.product.difusor} · {lbResult.product.potencia}W/m</p>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {!lbResult.product.fotoUrl && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                          <p className="text-sm font-semibold">{lbResult.product.name}</p>
                        </div>
                        )}
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Comprimento Total</p>
                          <p className="text-sm font-semibold">{lbResult.comprimentoTotalMm} mm</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Trechos</p>
                          <p className="text-sm font-semibold">{lbResult.nCortes}x de {lbResult.comprimentoPorTrechoMm} mm</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                          <p className="text-sm font-semibold">{lbResult.cct}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Controle</p>
                          <p className="text-sm font-semibold">{lbResult.controle}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p>
                          <p className="text-sm font-semibold">{lbResult.voltage}</p>
                        </div>
                      </div>

                      {/* Módulo LED */}
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Módulo LED</p>
                        <p className="text-sm font-semibold">{lbResult.ledModuleWithCCT} {lbResult.cct}</p>
                      </div>

                      {/* Fonte (total) */}
                      {(() => {
                        const t0 = lbResult.trechos[0];
                        if (!t0) return null;
                        return (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Fonte</p>
                            <p className="text-sm font-semibold">{lbResult.nCortes}x {t0.driver.model}</p>
                            {t0.driver.code && (
                              <a
                                href={`https://alfaluxprod-c8zmg2fn.manus.space/products/${t0.driver.code}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline font-mono mt-0.5 block"
                              >
                                {t0.driver.code}
                              </a>
                            )}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* Resumo para Orçamento */}
                  {(() => {
                    const r = lbResult;
                    const nT = r.nCortes;
                    const mm = r.comprimentoPorTrechoMm;
                    const driverLine = `${r.trechos[0]?.driver.model}${r.trechos[0]?.driver.code ? ` (${r.trechos[0].driver.code})` : ""}`;
                    const orcamento = [
                      `${r.product.name} ${r.cct} ${r.voltage}`,
                      nT > 1 ? `${nT} TRECHOS DE ${mm}MM` : `${mm}MM`,
                    ].join(" ");
                    const cortesInfo = nT > 1 ? ` COM ${nT} CORTES` : "";
                    const pedido = [
                      `CÓDIGO: ${r.product.sku}`,
                      `${r.product.name} ${r.cct} ${r.voltage} ${r.comprimentoTotalMm}MM${cortesInfo}${nT > 1 ? ` (${nT}x ${mm}MM)` : ""} MONTADO COM ${r.ledModuleWithCCT} ${r.cct} + ${nT}x ${driverLine}`,
                    ].join("\n");
                    return (
                      <>
                        <Card className="shadow-sm">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                              Resumo para Orçamento
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div
                              className="font-mono text-sm bg-muted/50 rounded-lg p-4 cursor-text select-all whitespace-pre-wrap"
                              onClick={(e) => { const sel = window.getSelection(); sel?.selectAllChildren(e.currentTarget); }}
                            >
                              {orcamento}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão para copiar.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => { navigator.clipboard.writeText(orcamento); toast.success("Resumo copiado!"); }}
                            >
                              <Copy className="w-3 h-3 mr-1" /> Copiar Resumo
                            </Button>
                          </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                              <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                              Resumo para Pedido
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div
                              className="font-mono text-sm bg-muted/50 rounded-lg p-4 cursor-text select-all whitespace-pre-wrap"
                              onClick={(e) => { const sel = window.getSelection(); sel?.selectAllChildren(e.currentTarget); }}
                            >
                              {pedido}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão para copiar.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => { navigator.clipboard.writeText(pedido); toast.success("Pedido copiado!"); }}
                            >
                              <Copy className="w-3 h-3 mr-1" /> Copiar Pedido
                            </Button>
                          </CardContent>
                        </Card>
                      </>
                    );
                  })()}
                </div>
              )
            )}

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
                    {/* Foto do produto Downlight */}
                    {(() => {
                      const dlPhoto = dlFamilia && dlResult ? getDownlightPhoto(dlFamilia, dlResult.product.name) : null;
                      return dlPhoto ? (
                        <div className="flex gap-3 items-stretch">
                          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 flex items-center justify-center">
                            <img src={dlPhoto} alt={dlResult.product.name} className="w-full h-full object-contain p-2" loading="lazy" />
                          </div>
                          <div className="grid grid-cols-2 gap-2 flex-1">
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
                              <p className="text-sm font-semibold">{dlResult.tensao}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                              <p className="text-sm font-semibold">{dlResult.cct}</p>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()
                    }
                    <div className="grid grid-cols-2 gap-3">
                      {!dlFamilia || !getDownlightPhoto(dlFamilia, dlResult.product.name) ? (
                        <>
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
                            <p className="text-sm font-semibold">{dlResult.tensao}</p>                 </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                            <p className="text-sm font-semibold">{dlResult.cct}</p>
                          </div>
                        </>
                      ) : null}
                      <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Módulo LED</p>
                        <p className="text-sm font-semibold">{dlResult.ledModuleWithCCT}</p>
                      </div>
                      {/* Ótica: exibir primária/secundária separadas quando disponíveis, senão legado */}
                      {(dlResult.product.oticaPrimaria || dlResult.product.otica) && (
                        <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                          {dlResult.product.oticaPrimaria ? (
                            <>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ótica Primária</p>
                              <p className="text-sm font-semibold">{dlResult.product.oticaPrimaria}</p>
                              {dlResult.product.oticaSecundaria && (
                                <>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-2 mb-1">Ótica Secundária</p>
                                  <p className="text-sm font-semibold">{dlResult.product.oticaSecundaria}</p>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ótica</p>
                              <p className="text-sm font-semibold">{dlResult.product.otica}</p>
                            </>
                          )}
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
                        const txt = `${dlResult.product.name} ${dlResult.cct} ${dlResult.tensao}`.toUpperCase();
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
                      {`${dlResult.product.name} ${dlResult.cct} ${dlResult.tensao}`.toUpperCase()}
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
                            // Ótica: usar primária+secundária separadas se disponíveis, senão legado
                            if (dlResult.product.oticaPrimaria) {
                              parts.push(dlResult.product.oticaPrimaria.toUpperCase());
                              if (dlResult.product.oticaSecundaria) parts.push(dlResult.product.oticaSecundaria.toUpperCase());
                            } else if (dlResult.product.otica) {
                              parts.push(dlResult.product.otica.toUpperCase());
                            }
                            if (dlResult.product.holder) parts.push(dlResult.product.holder.toUpperCase());
                            if (dlResult.product.dissipador) parts.push(dlResult.product.dissipador.toUpperCase());
                            { const eqSuffix = dlResult.driver.code ? ` (${dlResult.driver.code})` : ""; const drvQty = driverQtyFor(dlResult.product, dlResult.controle, dlResult.tensao); parts.push(`${drvQty}x DRIVER ${dlResult.driver.model.toUpperCase()}${eqSuffix}`); }
                          const txt = (`CÓDIGO: ${dlResult.product.sku}\n${dlResult.product.name.toUpperCase()} ${dlResult.cct} ${dlResult.tensao} MONTADA COM ${parts.join(" + ")}`).replace(/\s*-\s*$/, '').trim();
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
                          // Ótica: usar primária+secundária separadas se disponíveis, senão legado
                          if (dlResult.product.oticaPrimaria) {
                            parts.push(dlResult.product.oticaPrimaria.toUpperCase());
                            if (dlResult.product.oticaSecundaria) parts.push(dlResult.product.oticaSecundaria.toUpperCase());
                          } else if (dlResult.product.otica) {
                            parts.push(dlResult.product.otica.toUpperCase());
                          }
                          if (dlResult.product.holder) parts.push(dlResult.product.holder.toUpperCase());
                          if (dlResult.product.dissipador) parts.push(dlResult.product.dissipador.toUpperCase());
                          { const eqSuffix = dlResult.driver.code ? ` (${dlResult.driver.code})` : ""; const drvQty = driverQtyFor(dlResult.product, dlResult.controle, dlResult.tensao); parts.push(`${drvQty}x DRIVER ${dlResult.driver.model.toUpperCase()}${eqSuffix}`); }
                          return (`CÓDIGO: ${dlResult.product.sku}\n${dlResult.product.name.toUpperCase()} ${dlResult.cct} ${dlResult.tensao} MONTADA COM ${parts.join(" + ")}`).replace(/\s*-\s*$/, '').trim();
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

            {/* Resultado Painéis */}
            {productCategory === "Painéis" && panelResult && (
              <div className="space-y-4">
                <Card className="shadow-sm border-teal-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <Grid2X2 className="w-4 h-4 text-teal-500" />
                      Resultado — Painél
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Foto do produto Painél */}
                    {(() => {
                      const pPhoto = panelFamilia && panelResult ? getPainelPhoto(panelFamilia, panelResult.product.name) : null;
                      return pPhoto ? (
                        <div className="flex gap-3 items-stretch">
                          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 flex items-center justify-center">
                            <img src={pPhoto} alt={panelResult.product.name} className="w-full h-full object-contain p-2" loading="lazy" />
                          </div>
                          <div className="grid grid-cols-2 gap-2 flex-1">
                            {panelResult.product.sku && (
                              <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                                <p className="text-sm font-mono font-semibold text-primary">{panelResult.product.sku}</p>
                              </div>
                            )}
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p>
                              <p className="text-sm font-semibold">{panelResult.tensao}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                              <p className="text-sm font-semibold">{panelResult.cct}</p>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}
                    <div className="grid grid-cols-2 gap-3">
                      {(!panelFamilia || !getPainelPhoto(panelFamilia, panelResult.product.name)) && (
                        <>
                          {panelResult.product.sku && (
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                              <p className="text-sm font-mono font-semibold text-primary">{panelResult.product.sku}</p>
                            </div>
                          )}
                          <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                            <p className="text-sm font-semibold">{panelResult.product.name}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p>
                            <p className="text-sm font-semibold">{panelResult.tensao}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                            <p className="text-sm font-semibold">{panelResult.cct}</p>
                          </div>
                        </>
                      )}
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Controle</p>
                        <p className="text-sm font-semibold">{panelResult.controle}</p>
                      </div>
                      {panelResult.ledModuleWithCCT && (
                        <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Módulo LED</p>
                          <p className="text-sm font-semibold">{panelResult.ledModuleWithCCT}</p>
                        </div>
                      )}
                      <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                        <p className="text-sm font-semibold">{panelResult.driver.model} <span className="font-mono text-primary">({panelResult.driver.code})</span></p>
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
                      variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                      onClick={() => {
                        const txt = `${panelResult.product.name} ${panelResult.cct} ${panelResult.tensao}`.toUpperCase();
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
                      onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                    >
                      {`${panelResult.product.name} ${panelResult.cct} ${panelResult.tensao}`.toUpperCase()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão para copiar.</p>
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
                      variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                      onClick={() => {
                        const parts: string[] = [];
                        if (panelResult.ledModuleWithCCT) parts.push(panelResult.ledModuleWithCCT.toUpperCase());
                        { const eqSuffix = panelResult.driver.code ? ` (${panelResult.driver.code})` : ""; const drvQty = driverQtyFor(panelResult.product, panelResult.controle, panelResult.tensao); parts.push(`${drvQty}x DRIVER ${panelResult.driver.model.toUpperCase()}${eqSuffix}`); }
                        const skuLine = panelResult.product.sku ? `CÓDIGO: ${panelResult.product.sku}\n` : "";
                        const isOrbitFamily = panelResult.product.familia.toUpperCase().startsWith("ORBIT");
                        const orbitObs = isOrbitFamily ? "\nOBS: programar driver em 200mA" : "";
                        const txt = `${skuLine}${panelResult.product.name.toUpperCase()} ${panelResult.cct} ${panelResult.tensao} MONTADA COM ${parts.join(" + ")}${orbitObs}`;
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
                      onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                    >
                      {(() => {
                        const parts: string[] = [];
                        if (panelResult.ledModuleWithCCT) parts.push(panelResult.ledModuleWithCCT.toUpperCase());
                        { const eqSuffix = panelResult.driver.code ? ` (${panelResult.driver.code})` : ""; const drvQty = driverQtyFor(panelResult.product, panelResult.controle, panelResult.tensao); parts.push(`${drvQty}x DRIVER ${panelResult.driver.model.toUpperCase()}${eqSuffix}`); }
                        const skuLine = panelResult.product.sku ? `CÓDIGO: ${panelResult.product.sku}\n` : "";
                        const isOrbitFamily = panelResult.product.familia.toUpperCase().startsWith("ORBIT");
                        const orbitObs = isOrbitFamily ? "\nOBS: programar driver em 200mA" : "";
                        return `${skuLine}${panelResult.product.name.toUpperCase()} ${panelResult.cct} ${panelResult.tensao} MONTADA COM ${parts.join(" + ")}${orbitObs}`;
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão para copiar.</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Resultado — Arandelas */}
            {productCategory === "Arandelas" && arandelaResult && (
              <div className="space-y-4">
                <Card className="shadow-sm border-amber-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <Lamp className="w-4 h-4 text-amber-500" />
                      Resultado — Arandela
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Foto do produto */}
                    {(() => {
                      const aPhoto = arandelaResult.product.fotoUrl;
                      return aPhoto ? (
                        <div className="flex gap-3 items-stretch">
                          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 flex items-center justify-center">
                            <img src={aPhoto} alt={arandelaResult.product.name} className="w-full h-full object-contain p-2" loading="lazy" />
                          </div>
                          <div className="grid grid-cols-2 gap-2 flex-1">
                            {arandelaResult.product.sku && (
                              <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                                <p className="text-sm font-mono font-semibold text-primary">{arandelaResult.product.sku}</p>
                              </div>
                            )}
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p>
                              <p className="text-sm font-semibold">{arandelaResult.tensao}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                              <p className="text-sm font-semibold">{arandelaResult.cct}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {arandelaResult.product.sku && (
                            <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                              <p className="text-sm font-mono font-semibold text-primary">{arandelaResult.product.sku}</p>
                            </div>
                          )}
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p>
                            <p className="text-sm font-semibold">{arandelaResult.tensao}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                            <p className="text-sm font-semibold">{arandelaResult.cct}</p>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Módulo LED */}
                    {arandelaResult.ledModuleWithCCT && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Módulo LED</p>
                        <p className="text-sm font-semibold">{arandelaResult.ledModuleWithCCT}</p>
                      </div>
                    )}
                    {/* Driver */}
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                      <p className="text-sm font-bold">{arandelaResult.driver.model} <span className="font-mono text-primary">({arandelaResult.driver.code})</span></p>
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
                      variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                      onClick={() => {
                        const txt = `${arandelaResult.product.name} ${arandelaResult.cct} ${arandelaResult.tensao}`.toUpperCase();
                        navigator.clipboard.writeText(txt);
                        toast.success("Copiado!");
                      }}
                    >
                      <Copy className="w-3 h-3" /> Copiar Orçamento
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                      onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                    >
                      {`${arandelaResult.product.name} ${arandelaResult.cct} ${arandelaResult.tensao}`.toUpperCase()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão para copiar.</p>
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
                      variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                      onClick={() => {
                        const parts: string[] = [];
                        if (arandelaResult.ledModuleWithCCT) parts.push(arandelaResult.ledModuleWithCCT.toUpperCase());
                        { const eqSuffix = arandelaResult.driver.code ? ` (${arandelaResult.driver.code})` : ""; const drvQty = driverQtyFor(arandelaResult.product, arandelaResult.controle, arandelaResult.tensao); parts.push(`${drvQty}x DRIVER ${arandelaResult.driver.model.toUpperCase()}${eqSuffix}`); }
                        const skuLine = arandelaResult.product.sku ? `CÓDIGO: ${arandelaResult.product.sku}\n` : "";
                        const txt = `${skuLine}${arandelaResult.product.name.toUpperCase()} ${arandelaResult.cct} ${arandelaResult.tensao} MONTADA COM ${parts.join(" + ")}`;
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
                      onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                    >
                      {(() => {
                        const parts: string[] = [];
                        if (arandelaResult.ledModuleWithCCT) parts.push(arandelaResult.ledModuleWithCCT.toUpperCase());
                        { const eqSuffix = arandelaResult.driver.code ? ` (${arandelaResult.driver.code})` : ""; const drvQty = driverQtyFor(arandelaResult.product, arandelaResult.controle, arandelaResult.tensao); parts.push(`${drvQty}x DRIVER ${arandelaResult.driver.model.toUpperCase()}${eqSuffix}`); }
                        const skuLine = arandelaResult.product.sku ? `CÓDIGO: ${arandelaResult.product.sku}\n` : "";
                        return `${skuLine}${arandelaResult.product.name.toUpperCase()} ${arandelaResult.cct} ${arandelaResult.tensao} MONTADA COM ${parts.join(" + ")}`;
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão para copiar.</p>
                  </CardContent>
                </Card>
              </div>
            )}
            {/* Estado vazio Arandelas */}
            {productCategory === "Arandelas" && !arandelaResult && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Lamp className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">Nenhum cálculo realizado</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">Selecione a instalação, família, produto, tensão e CCT, depois clique em "Calcular Arandela".</p>
                </CardContent>
              </Card>
            )}
            {productCategory === "Spots" && spotResult && (
              <div className="space-y-4">
                <Card className="shadow-sm border-orange-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <Focus className="w-4 h-4 text-orange-500" />
                      Resultado — Spot
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Foto do produto Spot */}
                    {(() => {
                      const sPhoto = spotResult.product.fotoUrl;
                      return sPhoto ? (
                        <div className="flex gap-3 items-stretch">
                          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 flex items-center justify-center">
                            <img src={sPhoto} alt={spotResult.product.name} className="w-full h-full object-contain p-2" loading="lazy" />
                          </div>
                          <div className="grid grid-cols-2 gap-2 flex-1">
                            {spotResult.product.sku && (
                              <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                                <p className="text-sm font-mono font-semibold text-primary">{spotResult.product.sku}</p>
                              </div>
                            )}
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p>
                              <p className="text-sm font-semibold">{spotResult.tensao}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                              <p className="text-sm font-semibold">{spotResult.cct}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {spotResult.product.sku && (
                            <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                              <p className="text-sm font-mono font-semibold text-primary">{spotResult.product.sku}</p>
                            </div>
                          )}
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p>
                            <p className="text-sm font-semibold">{spotResult.tensao}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                            <p className="text-sm font-semibold">{spotResult.cct}</p>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Módulo LED */}
                    {spotResult.ledModuleWithCCT && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Módulo LED</p>
                        <p className="text-sm font-semibold">{spotResult.ledModuleWithCCT}</p>
                      </div>
                    )}
                    {/* Ótica: exibir primária/secundária separadas quando disponíveis, senão legado */}
                    {(spotResult.product.oticaPrimaria || spotResult.product.otica) && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        {spotResult.product.oticaPrimaria ? (
                          <>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ótica Primária</p>
                            <p className="text-sm font-semibold">{spotResult.product.oticaPrimaria}</p>
                            {spotResult.product.oticaSecundaria && (
                              <>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-2 mb-1">Ótica Secundária</p>
                                <p className="text-sm font-semibold">{spotResult.product.oticaSecundaria}</p>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ótica</p>
                            <p className="text-sm font-semibold">{spotResult.product.otica}</p>
                          </>
                        )}
                      </div>
                    )}
                    {/* Holder */}
                    {spotResult.product.holder && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Holder</p>
                        <p className="text-sm font-semibold">{spotResult.product.holder}</p>
                      </div>
                    )}
                    {/* Driver */}
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                      <p className="text-sm font-bold">{spotResult.driver.model} <span className="font-mono text-primary">({spotResult.driver.code})</span></p>
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
                      variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                      onClick={() => {
                        const txt = `${spotResult.product.name} ${spotResult.cct} ${spotResult.tensao}`.toUpperCase();
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
                      onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                    >
                      {`${spotResult.product.name} ${spotResult.cct} ${spotResult.tensao}`.toUpperCase()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão para copiar.</p>
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
                      variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                      onClick={() => {
                        const parts: string[] = [];
                         if (spotResult.ledModuleWithCCT) parts.push(spotResult.ledModuleWithCCT.toUpperCase());
                         // Ótica: usar primária+secundária separadas se disponíveis, senão legado
                         if (spotResult.product.oticaPrimaria) {
                           parts.push(spotResult.product.oticaPrimaria.toUpperCase());
                           if (spotResult.product.oticaSecundaria) parts.push(spotResult.product.oticaSecundaria.toUpperCase());
                         } else if (spotResult.product.otica) {
                           parts.push(spotResult.product.otica.toUpperCase());
                         }
                         if (spotResult.product.holder) parts.push(spotResult.product.holder.toUpperCase());
                         { const eqSuffix = spotResult.driver.code ? ` (${spotResult.driver.code})` : ""; const drvQty = driverQtyFor(spotResult.product, spotResult.controle, spotResult.tensao); parts.push(`${drvQty}x DRIVER ${spotResult.driver.model.toUpperCase()}${eqSuffix}`); }
                         const skuLine = spotResult.product.sku ? `CÓDIGO: ${spotResult.product.sku}\n` : "";
                        const txt = `${skuLine}${spotResult.product.name.toUpperCase()} ${spotResult.cct} ${spotResult.tensao} MONTADA COM ${parts.join(" + ")}`;
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
                      onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                    >
                      {(() => {
                        const parts: string[] = [];
                         if (spotResult.ledModuleWithCCT) parts.push(spotResult.ledModuleWithCCT.toUpperCase());
                         // Ótica: usar primária+secundária separadas se disponíveis, senão legado
                         if (spotResult.product.oticaPrimaria) {
                           parts.push(spotResult.product.oticaPrimaria.toUpperCase());
                           if (spotResult.product.oticaSecundaria) parts.push(spotResult.product.oticaSecundaria.toUpperCase());
                         } else if (spotResult.product.otica) {
                           parts.push(spotResult.product.otica.toUpperCase());
                         }
                         if (spotResult.product.holder) parts.push(spotResult.product.holder.toUpperCase());
                         { const eqSuffix = spotResult.driver.code ? ` (${spotResult.driver.code})` : ""; const drvQty = driverQtyFor(spotResult.product, spotResult.controle, spotResult.tensao); parts.push(`${drvQty}x DRIVER ${spotResult.driver.model.toUpperCase()}${eqSuffix}`); }
                         const skuLine = spotResult.product.sku ? `CÓDIGO: ${spotResult.product.sku}\n` : "";
                         
                        return `${skuLine}${spotResult.product.name.toUpperCase()} ${spotResult.cct} ${spotResult.tensao} MONTADA COM ${parts.join(" + ")}`;
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão para copiar.</p>
                  </CardContent>
                </Card>
              </div>
            )}
            {/* Estado vazio Spots */}
            {productCategory === "Spots" && !spotResult && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Focus className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">Nenhum cálculo realizado</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">Selecione a instalação, família, produto, tensão e CCT, depois clique em "Calcular Spot".</p>
                </CardContent>
              </Card>
            )}

            {/* Estado vazio Painéis */}
            {productCategory === "Painéis" && !panelResult && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Grid2X2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">Nenhum cálculo realizado</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">Selecione a instalação, família, produto, tensão e CCT, depois clique em "Calcular Painél".</p>
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
            {Object.keys(activeProfileCatalog).length} variantes{profileCatalogIsFromApi ? " (API)" : " (local)"} · Regra de Ouro aplicada
          </span>
        </div>
      </footer>
    </div>
  );
}
