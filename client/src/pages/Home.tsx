import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Moon, Sun, Zap, Settings, AlertTriangle, CheckCircle2, Info, MapPin, RefreshCw, Copy, ClipboardCheck, Layers, Lightbulb, Grid2X2, Focus, Lamp, TreePine, Navigation, Sparkles, ShoppingCart, PackagePlus, Upload, X as XIcon, Image as ImageIcon, ShoppingBag, ArrowLeft, FileCheck, Wrench, Briefcase, Star, Package2, Search as SearchIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/_core/hooks/useAuth";
import type { CartItemData, LinkedAccessory, ProfileSegment } from "@/lib/cartTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import {
  LED_CATALOG,
  MODULE_TYPE_LABELS,
} from "@/lib/ledCatalog";
import { adaptProfileProducts } from "@/lib/profileApiAdapter";
import type { InstallType } from "@/lib/ledCatalog";
import { calculateComposition, getStripflexName, getStriplineName } from "@/lib/ledEngine";
import { profileSupportsLShape, calculateLShape, calculateSquare, calculateRectangle, calculateUShape, type ShapeDriverParams } from "@/lib/lEngine";
import type { ProfileShape, ShapeResult, ShapePiece } from "@/lib/lCatalog";
import { generateProductionTemplate } from "@/lib/productionTemplate";
import { generateOrderSummary } from "@/lib/orderSummary";
import { generateQuoteSummary } from "@/lib/quoteSummary";
// import { calculateTotalPrice } from "@/lib/priceCatalog"; // Oculto temporariamente
import { getStaticPricePerMeter, calcModulePrice, usesModulePricing, toModuleControlType } from "@/lib/profilePriceCatalog";
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
  PERFIL_FLEXIVEL_MAX_LENGTH_MM,
  getAvailableVoltages,
  calculateLedBar,
  calcLedBarPrice,
  calcLedBarPriceDetail,
} from "@/lib/ledBarCatalog";
import type { LedBarProduct, LedBarPotencia, LedBarDifusor, LedBarControle, LedBarVoltage, LedBarResult } from "@/lib/ledBarCatalog";
import {
  BAGEO_CATALOG,
  getBageoAvailableInstalacoes,
  getBageoProductsByInstalacao,
  getBageoAvailableControles,
  calculateBageo,
  formatBRL,
} from "@/lib/bageoCatalog";
import type { BageoProduct, BageoInstalacao, BageoControle, BageoResult } from "@/lib/bageoCatalog";
import { ProductSearch } from "@/components/ProductSearch";
import {
  calculateSpaceR,
  calculateSpaceQ,
  getSpaceCartDescription,
  SPACE_FORMAT_LABELS,
  type SpaceFormat,
  type SpacePotencia,
  type SpaceCalculationResult,
} from "@/lib/spaceCalculator";
import type { SearchSuggestion, ProductSearchCatalogs } from "@/components/ProductSearch";
import ColorPickerModal from "@/components/ColorPickerModal";
import type { CorPeca } from "@/components/ColorPickerModal";
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
  { value: "A definir", label: "A definir" },
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
  | "Decorativas"
  | "Item Especial"
  | "Revenda"
  | "Acessórios"
  | "Serviços"
  | "Customizados";

const PRODUCT_CATEGORIES: { value: ProductCategory; label: string; icon: React.ElementType; image?: string; available: boolean }[] = [
  { value: "Perfis",       label: "Perfis",        icon: Layers,      image: "/manus-storage/PERFIS_e65318d1.png",      available: true  },
  { value: "Downlights",   label: "Downlights",    icon: Lightbulb,   image: "/manus-storage/DOWNLIGHTS_938e9ef2.png",  available: true  },
  { value: "Painéis",      label: "Painéis",       icon: Grid2X2,     image: "/manus-storage/PAINEIS_34c70c2f.png",     available: true },
  { value: "Spots",        label: "Spots",         icon: Focus,       image: "/manus-storage/spots-nobg_a12052bc.png",   available: true },
  { value: "Arandelas",    label: "Arandelas",     icon: Lamp,        image: "/manus-storage/ARANDELAS_324ddfb0.webp",  available: true },
  { value: "Área Externa", label: "Área Externa",  icon: TreePine,    image: "/manus-storage/AREAEXTERNA_5811f7cb.png", available: true },
  { value: "Balizadores",  label: "Balizadores",   icon: Navigation,  image: "/manus-storage/BALIZADORES_482d54f1.png", available: true },
  { value: "Decorativas",  label: "Decorativas",   icon: Sparkles,    image: "/manus-storage/DECORATIVAS_4ee44c0e.png", available: true },
  { value: "Item Especial", label: "Item Especial",  icon: PackagePlus, image: "/manus-storage/item-especial-icon_c570c491.png", available: true  },
  { value: "Revenda",       label: "Revenda",        icon: ShoppingBag, image: "/manus-storage/revenda-icon-nobg_245d52aa.png", available: true  },
  { value: "Acessórios",    label: "Acessórios",     icon: Wrench,      image: "/manus-storage/trilho_nobg_cf2a6de2.png", available: true  },
  { value: "Serviços",       label: "Serviços",        icon: Briefcase,   available: true  },
];

// Categoria Customizados — exibida separadamente como faixa horizontal
const CUSTOMIZADOS_CATEGORY = { value: "Customizados" as ProductCategory, label: "Customizados", icon: Star };

// ─── Auxiliar: quantidade de drivers por produto/controle/tensão ─────────────
function driverQtyFor(
  product: { driverQtd220?: number | null; driverQtdBivolt?: number | null; driverQtdDim110v?: number | null; driverQtdDimDali?: number | null; driverQtdDimTriac110v?: number | null; driverQtdDimTriac220v?: number | null },
  controle: string,
  tensao: string
): number {
  if (controle === 'DIM DALI') return product.driverQtdDimDali ?? 1;
  if (controle === 'DIM 1-10V') return product.driverQtdDim110v ?? 1;
  if (controle === 'DIM TRIAC 110V') return product.driverQtdDimTriac110v ?? 1;
  if (controle === 'DIM TRIAC 220V') return product.driverQtdDimTriac220v ?? 1;
  if (tensao === 'Bivolt') return product.driverQtdBivolt ?? 1;
  return product.driverQtd220 ?? 1;
}

/**
 * Retorna o preço unitário do produto para o controle/tensão selecionados.
 * Retorna null se o preço não estiver cadastrado.
 */
function getPrecoForControle(
  product: {
    precoOnOff220?: number | null; precoOnOffBivolt?: number | null;
    precoDim110v?: number | null; precoDimDali?: number | null;
    precoDimTriac110v?: number | null; precoDimTriac220v?: number | null;
    // Campos de custo+markup para calcular preço quando precoOnOff220 etc. são null
    custoCorpoOnoff220v?: number | null; custoCorpoOnoffBivolt?: number | null;
    custoCorpoDim110v?: number | null; custoCorpoDimDali?: number | null;
    custoCorpoDimTriac110v?: number | null; custoCorpoDimTriac220v?: number | null;
    markupPadraoOnoff220v?: number | null; markupPadraoOnoffBivolt?: number | null;
    markupPadraoDim110v?: number | null; markupPadraoDimDali?: number | null;
    markupPadraoDimTriac110v?: number | null; markupPadraoDimTriac220v?: number | null;
  },
  controle: string,
  tensao: string
): number | null {
  // Helper: calcula custo * markup se preco direto for null
  function calcPreco(preco: number | null | undefined, custo: number | null | undefined, markup: number | null | undefined): number | null {
    if (preco != null && preco > 0) return preco;
    if (custo != null && custo > 0 && markup != null && markup > 0) {
      return Math.round(custo * markup * 100) / 100;
    }
    return null;
  }
  if (controle === 'DIM DALI') return calcPreco(product.precoDimDali, product.custoCorpoDimDali, product.markupPadraoDimDali);
  if (controle === 'DIM 1-10V') return calcPreco(product.precoDim110v, product.custoCorpoDim110v, product.markupPadraoDim110v);
  if (controle === 'DIM TRIAC 110V') return calcPreco(product.precoDimTriac110v, product.custoCorpoDimTriac110v, product.markupPadraoDimTriac110v);
  if (controle === 'DIM TRIAC 220V') return calcPreco(product.precoDimTriac220v, product.custoCorpoDimTriac220v, product.markupPadraoDimTriac220v);
  if (tensao === 'Bivolt') return calcPreco(product.precoOnOffBivolt, product.custoCorpoOnoffBivolt, product.markupPadraoOnoffBivolt);
  return calcPreco(product.precoOnOff220, product.custoCorpoOnoff220v, product.markupPadraoOnoff220v);
}


/** Extrai custo base e markup padrão para um produto de Perfis/Balizadores conforme controle/tensão */
function getCustoForControle(
  product: {
    custoCorpoOnoff220v?: number | null; custoCorpoOnoffBivolt?: number | null;
    custoCorpoDim110v?: number | null; custoCorpoDimDali?: number | null;
    custoCorpoDimTriac110v?: number | null; custoCorpoDimTriac220v?: number | null;
    markupPadraoOnoff220v?: number | null; markupPadraoOnoffBivolt?: number | null;
    markupPadraoDim110v?: number | null; markupPadraoDimDali?: number | null;
    markupPadraoDimTriac110v?: number | null; markupPadraoDimTriac220v?: number | null;
    markupMinimoOnoff220v?: number | null; markupMinimoOnoffBivolt?: number | null;
    markupMinimoDim110v?: number | null; markupMinimoDimDali?: number | null;
    markupMinimoDimTriac110v?: number | null; markupMinimoDimTriac220v?: number | null;
  },
  controle: string,
  tensao: string
): { custoCorpoBase: number | null; markupPadraoApi: number | null; markupMinimoApi: number | null } {
  if (controle === 'DIM DALI') return { custoCorpoBase: product.custoCorpoDimDali ?? null, markupPadraoApi: product.markupPadraoDimDali ?? null, markupMinimoApi: product.markupMinimoDimDali ?? null };
  if (controle === 'DIM 1-10V') return { custoCorpoBase: product.custoCorpoDim110v ?? null, markupPadraoApi: product.markupPadraoDim110v ?? null, markupMinimoApi: product.markupMinimoDim110v ?? null };
  if (controle === 'DIM TRIAC 110V') return { custoCorpoBase: product.custoCorpoDimTriac110v ?? null, markupPadraoApi: product.markupPadraoDimTriac110v ?? null, markupMinimoApi: product.markupMinimoDimTriac110v ?? null };
  if (controle === 'DIM TRIAC 220V') return { custoCorpoBase: product.custoCorpoDimTriac220v ?? null, markupPadraoApi: product.markupPadraoDimTriac220v ?? null, markupMinimoApi: product.markupMinimoDimTriac220v ?? null };
  if (tensao === 'Bivolt') return { custoCorpoBase: product.custoCorpoOnoffBivolt ?? null, markupPadraoApi: product.markupPadraoOnoffBivolt ?? null, markupMinimoApi: product.markupMinimoOnoffBivolt ?? null };
  return { custoCorpoBase: product.custoCorpoOnoff220v ?? null, markupPadraoApi: product.markupPadraoOnoff220v ?? null, markupMinimoApi: product.markupMinimoOnoff220v ?? null };
}

/**
 * Calcula as linhas de driver desmembradas e o preço sem driver para luminárias.
 * Retorna null se não houver dados de custo/markup na API para o produto.
 * Usado apenas para itens novos (a partir desta versão).
 */
function buildLumDriverLines(
  sku: string,
  controle: string,
  tensao: string,
  itemQty: number,
  driverModel: string,
  driverCode: string,
  lumPriceMap: Record<string, {
    custoCorpoOnoff220v: number | null; custoCorpoOnoffBivolt: number | null;
    custoCorpoDim110v: number | null; custoCorpoDimDali: number | null;
    custoCorpoDimTriac110v: number | null; custoCorpoDimTriac220v: number | null;
    custoDriver220: number | null; custoDriverBivolt: number | null;
    custoDriverDim110v: number | null; custoDriverDimDali: number | null;
    custoDriverDimTriac110v: number | null; custoDriverDimTriac220v: number | null;
    markupPadraoOnoff220v: number | null; markupPadraoOnoffBivolt: number | null;
    markupPadraoDim110v: number | null; markupPadraoDimDali: number | null;
    markupPadraoDimTriac110v: number | null; markupPadraoDimTriac220v: number | null;
    markupPadraoDriverOnoff220v: number | null; markupPadraoDriverOnoffBivolt: number | null;
    markupPadraoDriverDim110v: number | null; markupPadraoDriverDimDali: number | null;
    markupPadraoDriverDimTriac110v: number | null; markupPadraoDriverDimTriac220v: number | null;
    markupMinimoOnoff220v?: number | null; markupMinimoOnoffBivolt?: number | null;
    markupMinimoDim110v?: number | null; markupMinimoDimDali?: number | null;
    markupMinimoDimTriac110v?: number | null; markupMinimoDimTriac220v?: number | null;
    markupMinimoDriver: number | null;
    driverQtd220: number | null; driverQtdBivolt: number | null;
    driverQtdDim110v: number | null; driverQtdDimDali: number | null;
    driverQtdDimTriac110v: number | null; driverQtdDimTriac220v: number | null;
  }>,
  /** Nome do produto — usado para desambiguar SKUs duplicados na API */
  productName?: string,
  /** Corrente de programação do driver (ex: "350MA"). Exibida apenas na ficha de produção. */
  driverCorrente?: string | null
): { driverLines: import("@/lib/cartTypes").DriverLine[]; priceWithoutDriver: number | null; unitPriceLuminaria: number | null; unitPriceDriver: number | null; luminariaHasApiPrice: boolean; custoCorpoBase: number | null; custoDriverBase: number | null; markupPadraoApi: number | null; markupMinimoApi: number | null; markupMinimoDriverApi: number | null; drvQtyPerUnit: number } | null {
  // Usar chave composta sku||name para evitar colisão com SKUs duplicados na API
  const compositeKey = productName ? `${sku}||${productName}` : sku;
  const entry = lumPriceMap[compositeKey] ?? lumPriceMap[sku];
  if (!entry) return null;

  // Selecionar custo do corpo e custo do driver pelo controle/tensão
  let custoCorpo: number | null = null;
  let custoDriver: number | null = null;
  let markupCorpo: number | null = null;
  let markupDriver: number | null = null;
  let drvQtyPerUnit: number = 1;

  if (controle === 'DIM DALI') {
    custoCorpo = entry.custoCorpoDimDali; custoDriver = entry.custoDriverDimDali;
    markupCorpo = entry.markupPadraoDimDali; markupDriver = entry.markupPadraoDriverDimDali;
    drvQtyPerUnit = entry.driverQtdDimDali ?? 1;
  } else if (controle === 'DIM 1-10V') {
    custoCorpo = entry.custoCorpoDim110v; custoDriver = entry.custoDriverDim110v;
    markupCorpo = entry.markupPadraoDim110v; markupDriver = entry.markupPadraoDriverDim110v;
    drvQtyPerUnit = entry.driverQtdDim110v ?? 1;
  } else if (controle === 'DIM TRIAC 110V') {
    custoCorpo = entry.custoCorpoDimTriac110v; custoDriver = entry.custoDriverDimTriac110v;
    markupCorpo = entry.markupPadraoDimTriac110v; markupDriver = entry.markupPadraoDriverDimTriac110v;
    drvQtyPerUnit = entry.driverQtdDimTriac110v ?? 1;
  } else if (controle === 'DIM TRIAC 220V') {
    custoCorpo = entry.custoCorpoDimTriac220v; custoDriver = entry.custoDriverDimTriac220v;
    markupCorpo = entry.markupPadraoDimTriac220v; markupDriver = entry.markupPadraoDriverDimTriac220v;
    drvQtyPerUnit = entry.driverQtdDimTriac220v ?? 1;
  } else if (tensao === 'Bivolt') {
    custoCorpo = entry.custoCorpoOnoffBivolt; custoDriver = entry.custoDriverBivolt;
    markupCorpo = entry.markupPadraoOnoffBivolt; markupDriver = entry.markupPadraoDriverOnoffBivolt;
    drvQtyPerUnit = entry.driverQtdBivolt ?? 1;
  } else {
    custoCorpo = entry.custoCorpoOnoff220v; custoDriver = entry.custoDriver220;
    markupCorpo = entry.markupPadraoOnoff220v; markupDriver = entry.markupPadraoDriverOnoff220v;
    drvQtyPerUnit = entry.driverQtd220 ?? 1;
  }

  // Se não há custo do driver, não é possível desmembrar
  if (custoDriver == null || custoDriver === 0) return null;

  const mkDriver = markupDriver ?? entry.markupMinimoDriver ?? 3;
  const totalDrvQty = drvQtyPerUnit * itemQty;
  const driverUnitPrice = Math.round(custoDriver * mkDriver * 100) / 100;
  const driverTotalPrice = Math.round(driverUnitPrice * totalDrvQty * 100) / 100;

  // Preço sem driver = preço do corpo × markup do corpo × qty
  // Se custoCorpo é null, o usuário deverá informar manualmente
  const luminariaHasApiPrice = custoCorpo != null && markupCorpo != null;
  let priceWithoutDriver: number | null = null;
  let unitPriceLuminaria: number | null = null;
  if (luminariaHasApiPrice && custoCorpo != null && markupCorpo != null) {
    unitPriceLuminaria = Math.round(custoCorpo * markupCorpo * 100) / 100;
    priceWithoutDriver = Math.round(unitPriceLuminaria * itemQty * 100) / 100;
  }

  const unitPriceDriver = driverUnitPrice;

  const driverLines: import("@/lib/cartTypes").DriverLine[] = [{
    driverModel,
    driverCode,
    driverQty: totalDrvQty,
    driverUnitPrice,
    driverTotalPrice,
    corrente: driverCorrente ?? null,
  }];

  const markupMinimoCorpo: number | null = (() => {
    if (controle === 'DIM DALI') return entry.markupMinimoDimDali ?? null;
    if (controle === 'DIM 1-10V') return entry.markupMinimoDim110v ?? null;
    if (controle === 'DIM TRIAC 110V') return entry.markupMinimoDimTriac110v ?? null;
    if (controle === 'DIM TRIAC 220V') return entry.markupMinimoDimTriac220v ?? null;
    if (tensao === 'Bivolt') return entry.markupMinimoOnoffBivolt ?? null;
    return entry.markupMinimoOnoff220v ?? null;
  })();
  return { driverLines, priceWithoutDriver, unitPriceLuminaria, unitPriceDriver, luminariaHasApiPrice, custoCorpoBase: custoCorpo, custoDriverBase: custoDriver, markupPadraoApi: markupCorpo, markupMinimoApi: markupMinimoCorpo, markupMinimoDriverApi: entry.markupMinimoDriver, drvQtyPerUnit };
}

// ─── Componente de Breakdown de Preço ────────────────────────────────────────────────────────────────────
/**
 * Exibe o breakdown de preço (luminária + driver) calculado via API.
 * Mostra luminária e driver como linhas separadas com destaque visual.
 */
function PriceBreakdownBlock({
  sku,
  controle,
  tensao,
  qty,
  driverModel: drvModel,
  driverCode: drvCode,
  lumPriceMap,
  staticPreco,
  productName,
}: {
  sku: string;
  controle: string;
  tensao: string;
  qty: number;
  driverModel: string;
  driverCode: string;
  lumPriceMap: Parameters<typeof buildLumDriverLines>[6];
  /** Preço de venda pronto da API (campo precoOnOff220 etc.) — fallback quando custo/markup não disponíveis */
  staticPreco?: number | null;
  /** Nome do produto — usado para desambiguar SKUs duplicados na API */
  productName?: string;
}) {
  const drvLines = buildLumDriverLines(sku, controle, tensao, qty, drvModel, drvCode, lumPriceMap, productName);

  if (drvLines) {
    const totalDriver = drvLines.driverLines.reduce((s, d) => s + (d.driverTotalPrice ?? 0), 0);
    const totalLuminaria = drvLines.priceWithoutDriver ?? null;
    const total = totalLuminaria != null ? Math.round((totalLuminaria + totalDriver) * 100) / 100 : null;
    const unitLum = drvLines.unitPriceLuminaria;
    const unitDrv = drvLines.unitPriceDriver;
    const drvQtyTotal = drvLines.driverLines.reduce((s, d) => s + (d.driverQty ?? 0), 0);

    return (
      <div className="mt-3 rounded-xl border border-border overflow-hidden">
        {/* Linha luminária */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-500/8 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-sm font-medium text-foreground">
              Luminária{qty > 1 ? ` × ${qty}` : ""}
            </span>
            {unitLum != null && qty > 1 && (
              <span className="text-xs text-muted-foreground">({formatBRL(unitLum)} cada)</span>
            )}
          </div>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
            {totalLuminaria != null ? formatBRL(totalLuminaria) : <span className="text-muted-foreground font-normal text-xs">A definir</span>}
          </span>
        </div>
        {/* Linha driver */}
        {totalDriver > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-blue-500/8 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-sm font-medium text-foreground">
                Driver{drvQtyTotal > 1 ? ` × ${drvQtyTotal}` : ""}
              </span>
              {unitDrv != null && drvQtyTotal > 1 && (
                <span className="text-xs text-muted-foreground">({formatBRL(unitDrv)} cada)</span>
              )}
            </div>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatBRL(totalDriver)}</span>
          </div>
        )}
        {/* Total */}
        {total != null && (
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/10">
            <span className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Total</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatBRL(total)}</span>
          </div>
        )}
        {total == null && totalLuminaria == null && (
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
            <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Total</span>
            <span className="text-sm text-muted-foreground">Luminária a definir</span>
          </div>
        )}
      </div>
    );
  }

  // Fallback: preço de venda pronto (campo precoOnOff220 etc.)
  if (staticPreco != null) {
    return (
      <div className="mt-3 rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-blue-500/10">
          <span className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">Preço Total</span>
          <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatBRL(staticPreco * qty)}</span>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Componentes Auxiliares ──────────────────────────────────────────────────────────────────────────────
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

// ─── ShapeResultCard: Card de resultado para formatos EM L ──────────────────────
function ShapeResultCard({
  shapeResult,
  skuPriceMap,
  onAddToQuote,
  globalQty = 1,
  setGlobalQty,
  onOpenAccessoryModal,
  pendingAccessoriesCount,
  globalPavimento,
}: {
  shapeResult: ShapeResult;
  skuPriceMap?: SkuPriceMap;
  onAddToQuote?: (item: CartItemData) => void;
  globalQty?: number;
  setGlobalQty?: (v: number) => void;
  onOpenAccessoryModal?: () => void;
  pendingAccessoriesCount?: number;
  globalPavimento?: string;
}) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addItem, isAdding: isAddingToCart } = useCart();
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<CartItemData | null>(null);
  const [manualPreco, setManualPreco] = useState<string>("");

  const profileCode = shapeResult.profileCode ?? "";
  const profileEntry = LED_CATALOG[profileCode];
  const profilePhoto = profileCode ? getProfilePhoto(profileCode, undefined, undefined) : null;

  // Barra Stripflex/Stripline
  const stripBarName = useMemo(() => {
    if (!shapeResult.cct) return null;
    const cct = shapeResult.cct as import("@/lib/ledEngine").CCT;
    if (shapeResult.stripMethod === "STRIPLINE") return getStriplineName(cct);
    return getStripflexName(cct);
  }, [shapeResult.cct, shapeResult.stripMethod]);

  // Calcular preço total somando custo × markup de cada peça (API) ou fallback estático
  const { precoTotal, precoFromApi } = useMemo(() => {
    // Método 1: preço por SKU individual via API (inclui cantos EM L)
    if (skuPriceMap && shapeResult.pieces.length > 0) {
      // Para composições em L, a tensão é sempre ON/OFF 220V (sem controle dim)
      let total = 0;
      let allHavePrice = true;
      for (const piece of shapeResult.pieces) {
        const entry = skuPriceMap[piece.sku];
        if (!entry) { allHavePrice = false; break; }
        const custo = entry.custoOnoff220;
        const markup = entry.markupPadraoOnoff220v;
        if (custo == null || markup == null) { allHavePrice = false; break; }
        const precoUnit = Math.round(custo * markup * 100) / 100;
        total += precoUnit * piece.quantity;
      }
      if (allHavePrice) {
        return { precoTotal: Math.round(total * 100) / 100, precoFromApi: true };
      }
    }
    // Método 2: fallback — preço por metro linear via catálogo estático
    const power = shapeResult.power;
    const totalMm = shapeResult.totalLengthMm;
    if (!profileCode || !power || !totalMm) return { precoTotal: null, precoFromApi: false };
    const pricePerMeter = getStaticPricePerMeter(profileCode, power, "onoff", false);
    if (pricePerMeter == null) return { precoTotal: null, precoFromApi: false };
    return { precoTotal: Math.round(pricePerMeter * (totalMm / 1000) * 100) / 100, precoFromApi: false };
  }, [skuPriceMap, shapeResult.pieces, profileCode, shapeResult.power, shapeResult.totalLengthMm]);

  // Preço efetivo: API > catálogo > manual
  const manualPrecoNum = manualPreco !== "" ? parseFloat(manualPreco.replace(",", ".")) : null;
  const precoEfetivo = precoTotal ?? (manualPrecoNum != null && !isNaN(manualPrecoNum) && manualPrecoNum > 0 ? manualPrecoNum : null);
  const precoEfetivoFromApi = precoEfetivo === precoTotal ? precoFromApi : false;

  const shapeLabel =
    shapeResult.shape === "L_SHAPE" ? "Formato L" :
    shapeResult.shape === "SQUARE" ? "Quadrado" :
    shapeResult.shape === "U_SHAPE" ? "Formato U" :
    "Retangular";

  const dimensionLabel =
    shapeResult.shape === "SQUARE"
      ? `${shapeResult.dimensions[0]}mm × ${shapeResult.dimensions[0]}mm`
      : shapeResult.shape === "U_SHAPE"
        ? `Base ${shapeResult.dimensions[0]}mm × Prof. ${shapeResult.dimensions[1]}mm`
        : `${shapeResult.dimensions[0]}mm × ${shapeResult.dimensions[1]}mm`;

  // Consolidar drivers por SKU (agrupando peças com mesmo SKU e mesmo driver)
  const driversBySku: Array<{ sku: string; quantity: number; driver: NonNullable<ShapePiece["driver"]>; bars: number }> = useMemo(() => {
    const map = new Map<string, { sku: string; quantity: number; driver: NonNullable<ShapePiece["driver"]>; bars: number }>();
    for (const piece of shapeResult.pieces) {
      if (!piece.driver) continue;
      const existing = map.get(piece.sku);
      if (existing) {
        existing.quantity += piece.quantity;
      } else {
        map.set(piece.sku, { sku: piece.sku, quantity: piece.quantity, driver: piece.driver, bars: piece.bars ?? 0 });
      }
    }
    return Array.from(map.values());
  }, [shapeResult.pieces]);

  // Resumo consolidado de drivers (modelo → quantidade total)
  const driverSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of driversBySku) {
      if (entry.driver.combo && entry.driver.combo.length > 0) {
        for (const c of entry.driver.combo) {
          map.set(c.model, (map.get(c.model) ?? 0) + entry.quantity * c.quantity);
        }
      } else {
        const qty = entry.driver.quantity ?? 1;
        map.set(entry.driver.model, (map.get(entry.driver.model) ?? 0) + entry.quantity * qty);
      }
    }
    return Array.from(map.entries());
  }, [driversBySku]);

  // Gerar texto de resumo para cópia
  const summaryText = useMemo(() => {
    const lines: string[] = [];
    const pName = shapeResult.profileName ?? "Perfil";
    const pw = shapeResult.power ? `${shapeResult.power}W` : "";
    const cctStr = shapeResult.cct ?? "";
    const voltStr = shapeResult.voltage ?? "";
    lines.push(`${pName} ${pw} ${cctStr} ${voltStr} — ${shapeLabel} ${dimensionLabel}`.trim());
    if (shapeResult.totalLengthMm) {
      lines.push(`Comprimento linear total: ${shapeResult.totalLengthMm}mm = ${(shapeResult.totalLengthMm / 1000).toFixed(3)}m`);
    }
    if (stripBarName) {
      const eqSuffix = shapeResult.stripflexEq ? ` (${shapeResult.stripflexEq})` : "";
      lines.push(`Barra: ${stripBarName}${eqSuffix}`);
    }
    lines.push("");
    for (const piece of shapeResult.pieces) {
      const driverStr = piece.driver
        ? piece.driver.combo && piece.driver.combo.length > 0
          ? piece.driver.combo.map(c => `${c.quantity}× ${c.model.toUpperCase()}${c.code ? ` (${c.code})` : ""}`).join(" + ")
          : `${piece.driver.quantity ?? 1}× ${piece.driver.model.toUpperCase()}${piece.driver.code ? ` (${piece.driver.code})` : ""}`
        : "";
      const barsStr = piece.bars !== undefined ? ` — ${piece.bars} barras` : "";
      const lenStr = piece.length ? ` (${piece.length}mm)` : "";
      lines.push(`${piece.quantity}× ${piece.sku}${lenStr}${barsStr}`);
      if (driverStr) lines.push(`   Driver por peça: ${driverStr}`);
    }
    if (precoEfetivo !== null) {
      lines.push("");
      lines.push(`PREÇO ESTIMADO: ${formatBRL(precoEfetivo)} (ON/OFF 220V)`);
    }
    return lines.join("\n");
  }, [shapeResult, shapeLabel, dimensionLabel, stripBarName, precoEfetivo]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
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

  const handleAddToCart = () => {
    const profileSegments: ProfileSegment[] = shapeResult.pieces.map((piece) => {
      let driverQtyPerPiece = 1;
      let driverModel = "";
      let driverCode = "";

      if (piece.driver) {
        if (piece.driver.combo && piece.driver.combo.length > 0) {
          const totalComboQty = piece.driver.combo.reduce((s, c) => s + c.quantity, 0);
          driverQtyPerPiece = totalComboQty;
          driverModel = piece.driver.combo
            .map(c => `${c.quantity} x ${c.model.toUpperCase()}${c.code ? ` (${c.code})` : ""}`)
            .join(" + ");
          driverCode = "";
        } else {
          driverQtyPerPiece = piece.driver.quantity ?? 1;
          driverModel = piece.driver.model.toUpperCase();
          driverCode = piece.driver.code ?? "";
        }
      }

      return {
        sku: piece.sku,
        qty: piece.quantity,
        lengthMm: piece.length ?? 0,
        barsPerPiece: piece.bars ?? 0,
        driverQtyPerPiece,
        driverModel,
        driverCode,
      };
    });

    const pName = shapeResult.profileName ?? "Perfil";
    const pw = shapeResult.power ? `${shapeResult.power}W` : "";
    const cctStr = shapeResult.cct ?? "";
    const voltStr = shapeResult.voltage ?? "";
    const description = `${pName} ${pw} ${cctStr} ${voltStr} — ${shapeLabel} ${dimensionLabel}`.trim();
    const photo = profileCode ? getProfilePhoto(profileCode, undefined, undefined) : null;

    const item: CartItemData = {
      category: "Perfis",
      sku: profileCode || (shapeResult.pieces[0]?.sku.split(".")[0] ?? ""),
      description,
      power: pw || undefined,
      cct: cctStr || undefined,
      qty: globalQty,
      unitPrice: precoEfetivo ?? null,
      totalPrice: precoEfetivo != null ? precoEfetivo * globalQty : null,
      priceFromApi: precoEfetivoFromApi,
      photoUrl: photo ?? null,
      orderSummary: summaryText,
      quoteSummary: summaryText,
      profileSegments,
      stripMethod: shapeResult.stripMethod,
      availableCCTs: ["2700K", "3000K", "4000K", "5000K", "A definir"],
      shapeTotalLengthMm: shapeResult.totalLengthMm,
      ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}),
    };

    if (onAddToQuote) {
      onAddToQuote(item);
      if (setGlobalQty) setGlobalQty(1);
    } else {
      setPendingItem(item);
      setColorModalOpen(true);
    }
  };

  return (
    <>
    <div className="space-y-4">

    {/* Card principal: Resumo da Configuração */}
    <Card className="shadow-sm border-blue-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Resumo — {shapeLabel}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {setGlobalQty && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                <Input
                  type="number"
                  className="h-7 text-xs w-16"
                  min={1}
                  placeholder="1"
                  value={globalQty}
                  onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            )}
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
            <Button
              size="sm"
              className="gap-1.5 text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isAddingToCart}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {onAddToQuote ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
            </Button>
            {onOpenAccessoryModal && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-7 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                onClick={onOpenAccessoryModal}
              >
                <Wrench className="w-3.5 h-3.5" />
                Incluir Acessório
                {pendingAccessoriesCount != null && pendingAccessoriesCount > 0 && (
                  <span className="ml-1 bg-cyan-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{pendingAccessoriesCount}</span>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Layout com foto */}
        {profilePhoto ? (
          <div className="flex gap-3 items-stretch">
            <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 flex items-center justify-center">
              <img src={profilePhoto} alt={shapeResult.profileName ?? profileCode} className="w-full h-full object-contain p-2" loading="lazy" />
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1">
              <div className="rounded-lg bg-muted/40 p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Perfil</p>
                <p className="text-sm font-bold text-foreground font-display">{shapeResult.profileName ?? profileCode}</p>
                <p className="text-xs text-muted-foreground font-mono">{profileCode}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Instalação</p>
                <p className="text-sm font-bold text-foreground font-display">
                  {profileEntry?.installType ? INSTALL_LABELS[profileEntry.installType] : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Potência · CCT · Tensão</p>
                <p className="text-sm font-bold text-foreground font-display">
                  {shapeResult.power ? `${shapeResult.power}W` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{shapeResult.cct} · {shapeResult.voltage}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Dimensões</p>
                <p className="text-sm font-bold text-foreground font-display">{dimensionLabel}</p>
                {shapeResult.totalLengthMm && (
                  <p className="text-xs text-muted-foreground">
                    Linear: {(shapeResult.totalLengthMm / 1000).toFixed(3).replace(".", ",")}m
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/40 p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Perfil</p>
              <p className="text-sm font-bold text-foreground font-display">{shapeResult.profileName ?? profileCode}</p>
              <p className="text-xs text-muted-foreground font-mono">{profileCode}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Instalação</p>
              <p className="text-sm font-bold text-foreground font-display">
                {profileEntry?.installType ? INSTALL_LABELS[profileEntry.installType] : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Potência · CCT</p>
              <p className="text-sm font-bold text-foreground font-display">
                {shapeResult.power ? `${shapeResult.power}W` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{shapeResult.cct} · {shapeResult.voltage}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Dimensões</p>
              <p className="text-sm font-bold text-foreground font-display">{dimensionLabel}</p>
              {shapeResult.totalLengthMm && (
                <p className="text-xs text-muted-foreground">
                  Linear: {(shapeResult.totalLengthMm / 1000).toFixed(3).replace(".", ",")}m
                </p>
              )}
            </div>
          </div>
        )}

        {/* Barra Stripflex/Stripline */}
        {stripBarName && (
          <div className="rounded-lg bg-muted/30 border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {shapeResult.stripMethod === "STRIPLINE" ? "Barra Stripline" : "Barra Stripflex"}
            </p>
            <p className="text-sm font-medium text-foreground font-mono">
              {stripBarName}
              {shapeResult.stripflexEq && (
                <span className="ml-2 text-xs text-muted-foreground font-mono">({shapeResult.stripflexEq})</span>
              )}
            </p>
          </div>
        )}

        {/* Preço estimado ou entrada manual */}
        {precoTotal !== null ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Preço estimado:</span>
            <span className="text-lg font-bold text-blue-400">{formatBRL(precoTotal)}</span>
            <span className="text-xs text-muted-foreground">(ON/OFF 220V{precoFromApi ? " · via API" : " · catálogo"})</span>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">⚠️ API sem custo — informe o preço manualmente:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">R$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={manualPreco}
                onChange={(e) => setManualPreco(e.target.value)}
                className="h-8 w-36 text-sm"
              />
              {precoEfetivo !== null && (
                <span className="text-sm font-bold text-blue-400">{formatBRL(precoEfetivo)}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Este preço será usado no orçamento (ON/OFF 220V).</p>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Composição de Módulos */}
    {shapeResult.pieces.length > 0 && (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Composição de Módulos
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
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Barras</th>
                </tr>
              </thead>
              <tbody>
                {shapeResult.pieces.map((piece, idx) => (
                  <tr key={idx} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 font-mono text-primary font-medium">{piece.sku}</td>
                    <td className="px-3 py-2 text-foreground">
                      <span className="inline-flex items-center gap-1">
                        <span className="font-semibold">
                          {piece.type === "CORNER" ? "Canto" : piece.type === "STRAIGHT_ML" ? "ML" : "IF"}
                        </span>
                        <span className="text-muted-foreground hidden sm:inline">
                          — {piece.type === "CORNER" ? "Canto EM L" : piece.type === "STRAIGHT_ML" ? "Meio de Linha" : "Início/Final de Linha"}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {piece.length ? `${piece.length}mm` : (piece.type === "CORNER" ? `${shapeResult.dimensions[0] > 0 ? "—" : "—"}` : "—")}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground font-semibold">{piece.quantity}</td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {piece.bars !== undefined ? (Number.isInteger(piece.bars) ? piece.bars : piece.bars.toFixed(1)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-3 py-2 font-semibold text-foreground" colSpan={3}>Total</td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">
                    {shapeResult.pieces.reduce((s, p) => s + p.quantity, 0)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">
                    {(() => {
                      const t = shapeResult.pieces.reduce((s, p) => s + (p.bars ?? 0) * p.quantity, 0);
                      return Number.isInteger(t) ? t : t.toFixed(1);
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * Barras {shapeResult.stripMethod === "STRIPLINE" ? "Stripline (562,5mm cada, 75V)" : "Stripflex (562,5mm cada, 25V)"}.
          </p>
        </CardContent>
      </Card>
    )}

    {/* Drivers por SKU */}
    {driversBySku.length > 0 && (
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
          <SkuDriverList
            entries={driversBySku.map(e => ({
              sku: e.sku,
              quantity: e.quantity,
              barsPerPiece: e.bars,
              driver: {
                code: e.driver.code,
                model: e.driver.model,
                power: 0,
                current: "",
                quantity: e.driver.quantity ?? 1,
                combo: e.driver.combo,
              } as import("@/lib/ledEngine").DriverSpec,
            }))}
            label={`${shapeResult.power ? `${shapeResult.power}W` : ""} · ${shapeResult.voltage ?? ""}`}
          />

          {/* Resumo total de drivers */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              Resumo de Drivers
            </p>
            <div className="flex flex-wrap gap-2">
              {driverSummary.map(([model, qty], idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border bg-primary/10 text-primary border-primary/20"
                >
                  <Zap className="w-3 h-3" />
                  {qty}× {model}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )}

    {/* Resumo copiável */}
    <Card className="shadow-sm">
      <CardContent className="pt-4 space-y-2">
        <textarea
          ref={textareaRef}
          readOnly
          value={summaryText}
          className="w-full font-mono text-xs bg-muted/40 border border-border rounded-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-foreground leading-relaxed"
          rows={Math.max(summaryText.split("\n").length + 1, 4)}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
        <p className="text-xs text-muted-foreground">
          Clique no texto para selecionar ou use o botão "Copiar Resumo" para copiar diretamente.
        </p>
      </CardContent>
    </Card>

    </div>
    {pendingItem && (
      <ColorPickerModal
        open={colorModalOpen}
      onClose={() => { setColorModalOpen(false); setPendingItem(null); }}
      onConfirm={(cor: CorPeca) => {
          if (pendingItem) addItem({ ...pendingItem, corPeca: cor, ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}) });
          setColorModalOpen(false);
          setPendingItem(null);
          if (setGlobalQty) setGlobalQty(1);
        }}
        isAdding={isAddingToCart}
        productName={shapeResult.profileName ?? "Perfil EM L"}
      />
    )}
    </>
  );
}

type ProfilePriceMap = Record<string, {
  onoff220: number | null;
  onoffBivolt: number | null;
  dim110v: number | null;
  dimDali: number | null;
  // Campos D1+D2 (quando a configuração é D1+D2)
  onoff220D1D2: number | null;
  onoffBivoltD1D2: number | null;
  dim110vD1D2: number | null;
  dimDaliD1D2: number | null;
}>;

type SkuPriceMap = Record<string, {
  custoOnoff220: number|null; custoOnoffBivolt: number|null; custoDim110v: number|null; custoDimDali: number|null; custoDimTriac110v: number|null; custoDimTriac220v: number|null;
  custoOnoff220D1D2: number|null; custoOnoffBivoltD1D2: number|null; custoDim110vD1D2: number|null; custoDimDaliD1D2: number|null; custoDimTriac110vD1D2: number|null; custoDimTriac220vD1D2: number|null;
  markupPadraoOnoff220v: number|null; markupPadraoOnoffBivolt: number|null; markupPadraoDim110v: number|null; markupPadraoDimDali: number|null; markupPadraoDimTriac110v: number|null; markupPadraoDimTriac220v: number|null;
  markupMinimoOnoff220v: number|null; markupMinimoOnoffBivolt: number|null; markupMinimoDim110v: number|null; markupMinimoDimDali: number|null; markupMinimoDimTriac110v: number|null; markupMinimoDimTriac220v: number|null;
  custoDriver220: number|null; custoDriverBivolt: number|null; custoDriverDim110v: number|null; custoDriverDimDali: number|null; custoDriverDimTriac110v: number|null; custoDriverDimTriac220v: number|null;
  markupMinimoDriver: number|null;
}>;

function ResultBlock({ result, profilePriceMap, profileVariant, skuPriceMap, onAddToQuote, itemEmPlanta, setItemEmPlanta, globalQty, setGlobalQty, onOpenAccessoryModal, pendingAccessoriesCount, globalPavimento }: { result: CompositionResult; profilePriceMap?: ProfilePriceMap; profileVariant?: import("@/lib/ledCatalog").ProfileVariant; skuPriceMap?: SkuPriceMap; onAddToQuote?: (item: CartItemData) => void; itemEmPlanta?: string; setItemEmPlanta?: (v: string) => void; globalQty?: number; setGlobalQty?: (v: number) => void; onOpenAccessoryModal?: () => void; pendingAccessoriesCount?: number; globalPavimento?: string }) {
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
            <p className="text-sm font-medium text-foreground font-mono">
              {result.stripflexName}
              {result.stripflexEq && (
                <span className="ml-2 text-xs text-muted-foreground font-mono">({result.stripflexEq})</span>
              )}
            </p>
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
      <QuoteSummaryCard result={result} profilePriceMap={profilePriceMap} profileVariant={profileVariant} skuPriceMap={skuPriceMap} onAddToQuote={onAddToQuote} itemEmPlanta={itemEmPlanta} setItemEmPlanta={setItemEmPlanta} globalQty={globalQty} setGlobalQty={setGlobalQty} onOpenAccessoryModal={onOpenAccessoryModal} pendingAccessoriesCount={pendingAccessoriesCount} globalPavimento={globalPavimento} />
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
function QuoteSummaryCard({ result, profilePriceMap, profileVariant, skuPriceMap, onAddToQuote, itemEmPlanta, setItemEmPlanta, globalQty = 1, setGlobalQty, onOpenAccessoryModal, pendingAccessoriesCount, globalPavimento }: { result: CompositionResult; profilePriceMap?: ProfilePriceMap; profileVariant?: import("@/lib/ledCatalog").ProfileVariant; skuPriceMap?: SkuPriceMap; onAddToQuote?: (item: CartItemData) => void; itemEmPlanta?: string; setItemEmPlanta?: (v: string) => void; globalQty?: number; setGlobalQty?: (v: number) => void; onOpenAccessoryModal?: () => void; pendingAccessoriesCount?: number; globalPavimento?: string }) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addItem, isAdding: isAddingToCart } = useCart();
  const { user } = useAuth();
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<CartItemData | null>(null);
  const [manualPreco, setManualPreco] = useState<string>("");

  // Emails autorizados a editar markup
  const MARKUP_EDITORS = ["vivian@grupoalfalux.com.br", "dennis@grupoalfalux.com.br"];
  const canEditMarkup = MARKUP_EDITORS.includes((user?.email ?? "").toLowerCase());

  // Estado do markup editável (apenas para Dennis e Vivian)
  const [markupLuminariaOverride, setMarkupLuminariaOverride] = useState<number | null>(null);

  // ── Novo método: preço por SKU individual × quantidade (BLAZE H e futuros) ──────
  const isD1D2 = result.application === 'D1+D2';
  const nModules = result.composition.reduce((sum, item) => sum + item.quantity, 0);

  // Função auxiliar: calcula preço de venda = custoCorpo × markupPadrao para o controle/aplicação selecionados
  function getSkuPreco(sku: string, markupOverride?: number | null): number | null {
    const entry = skuPriceMap?.[sku];
    if (!entry) return null;

    // Selecionar custo bruto e markup padrão conforme controle e aplicação
    let custo: number | null = null;
    let markupPadrao: number | null = null;

    if (isD1D2) {
      if (result.controlType === 'dimDali') { custo = entry.custoDimDaliD1D2; markupPadrao = entry.markupPadraoDimDali; }
      else if (result.controlType === 'dim110v') { custo = entry.custoDim110vD1D2; markupPadrao = entry.markupPadraoDim110v; }
      else if (result.controlType === 'dimTriac110v') { custo = entry.custoDimTriac110vD1D2; markupPadrao = entry.markupPadraoDimTriac110v; }
      else if (result.controlType === 'dimTriac220v') { custo = entry.custoDimTriac220vD1D2; markupPadrao = entry.markupPadraoDimTriac220v; }
      else if (/bivolt/i.test(result.voltage)) { custo = entry.custoOnoffBivoltD1D2; markupPadrao = entry.markupPadraoOnoffBivolt; }
      else { custo = entry.custoOnoff220D1D2; markupPadrao = entry.markupPadraoOnoff220v; }
    } else {
      if (result.controlType === 'dimDali') { custo = entry.custoDimDali; markupPadrao = entry.markupPadraoDimDali; }
      else if (result.controlType === 'dim110v') { custo = entry.custoDim110v; markupPadrao = entry.markupPadraoDim110v; }
      else if (result.controlType === 'dimTriac110v') { custo = entry.custoDimTriac110v; markupPadrao = entry.markupPadraoDimTriac110v; }
      else if (result.controlType === 'dimTriac220v') { custo = entry.custoDimTriac220v; markupPadrao = entry.markupPadraoDimTriac220v; }
      else if (/bivolt/i.test(result.voltage)) { custo = entry.custoOnoffBivolt; markupPadrao = entry.markupPadraoOnoffBivolt; }
      else { custo = entry.custoOnoff220; markupPadrao = entry.markupPadraoOnoff220v; }
    }

    if (custo == null) return null;
    const mk = markupOverride ?? markupPadrao ?? 1;
    // Fator de correção de potência: API fornece custo base para 18W;
    // 26W recebe +5% e 36W recebe +10% sobre o custo antes do markup
    const powerW = result.powerD1 ?? 18;
    const powerFactor = powerW === 26 ? 1.05 : powerW === 36 ? 1.10 : 1.0;
    return Math.round(custo * powerFactor * mk * 100) / 100;
  }

  // Calcular preço total somando preço de cada SKU × quantidade
  // Só usa o novo método se TODOS os SKUs da composição tiverem preço no mapa
  const modulePriceResult = (() => {
    if (!skuPriceMap || result.composition.length === 0) return null;
    // Verificar se algum SKU da composição tem preço no mapa
    const hasAnySkuPrice = result.composition.some(item => skuPriceMap[item.sku] != null);
    if (!hasAnySkuPrice) return null;

    // Extrair markup padrão/mínimo do primeiro SKU com dados
    const firstSkuEntry = skuPriceMap[result.composition[0]?.sku];
    let markupPadrao = 2;
    let markupMinimo = 1;
    if (firstSkuEntry) {
      if (result.controlType === 'dimDali') {
        markupPadrao = firstSkuEntry.markupPadraoDimDali ?? 3;
        markupMinimo = firstSkuEntry.markupMinimoDimDali ?? 2;
      } else if (result.controlType === 'dim110v') {
        markupPadrao = firstSkuEntry.markupPadraoDim110v ?? 3;
        markupMinimo = firstSkuEntry.markupMinimoDim110v ?? 2;
      } else if (result.controlType === 'dimTriac110v' || result.controlType === 'dimTriac220v') {
        markupPadrao = firstSkuEntry.markupPadraoDimTriac110v ?? firstSkuEntry.markupPadraoDimTriac220v ?? 3;
        markupMinimo = firstSkuEntry.markupMinimoDimTriac110v ?? firstSkuEntry.markupMinimoDimTriac220v ?? 2;
      } else if (/bivolt/i.test(result.voltage)) {
        markupPadrao = firstSkuEntry.markupPadraoOnoffBivolt ?? 2;
        markupMinimo = firstSkuEntry.markupMinimoOnoffBivolt ?? 1;
      } else {
        markupPadrao = firstSkuEntry.markupPadraoOnoff220v ?? 2;
        markupMinimo = firstSkuEntry.markupMinimoOnoff220v ?? 1;
      }
    }

    const mkOverride = markupLuminariaOverride;
    let totalLuminaria = 0;
    let allHavePrice = true;
    const breakdown: Array<{ sku: string; quantity: number; precoUnit: number; subtotal: number }> = [];

    for (const item of result.composition) {
      const precoUnit = getSkuPreco(item.sku, mkOverride);
      if (precoUnit == null) { allHavePrice = false; break; }
      const subtotal = Math.round(precoUnit * item.quantity * 100) / 100;
      totalLuminaria += subtotal;
      breakdown.push({ sku: item.sku, quantity: item.quantity, precoUnit, subtotal });
    }

    if (!allHavePrice) return null;

    totalLuminaria = Math.round(totalLuminaria * 100) / 100;

    // Custo do driver (quando disponibilizado pela API)
    let precoDriverTotal = 0;
    if (firstSkuEntry) {
      let custoDriver: number | null = null;
      if (result.controlType === 'dimDali') custoDriver = firstSkuEntry.custoDriverDimDali;
      else if (result.controlType === 'dim110v') custoDriver = firstSkuEntry.custoDriverDim110v;
      else if (result.controlType === 'dimTriac110v') custoDriver = firstSkuEntry.custoDriverDimTriac110v;
      else if (result.controlType === 'dimTriac220v') custoDriver = firstSkuEntry.custoDriverDimTriac220v;
      else if (/bivolt/i.test(result.voltage)) custoDriver = firstSkuEntry.custoDriverBivolt;
      else custoDriver = firstSkuEntry.custoDriver220;
      const mkDriver = firstSkuEntry.markupMinimoDriver ?? 3;
      if (custoDriver != null) precoDriverTotal = Math.round(custoDriver * nModules * mkDriver * 100) / 100;
    }

    return {
      precoLuminariaTotal: totalLuminaria,
      precoDriverTotal,
      total: Math.round((totalLuminaria + precoDriverTotal) * 100) / 100,
      markupLuminariaAplicado: mkOverride ?? markupPadrao,
      markupPadrao,
      markupMinimo,
      markupDriverAplicado: firstSkuEntry?.markupMinimoDriver ?? 3,
      breakdown,
      fromApi: true,
    };
  })();

  // ── Método antigo: preço por metro (catálogo estático) ─────────────────────
  const precoTotalStatico = (() => {
    if (modulePriceResult) return null; // novo método tem prioridade
    const ctStatic: 'onoff' | 'dimDali' | 'dim110v' =
      result.controlType === 'dimDali' ? 'dimDali'
      : result.controlType === 'dim110v' ? 'dim110v'
      : 'onoff';
    const powerW = result.powerD1 ?? 18;
    const precoPerMeter = getStaticPricePerMeter(result.profileCode, powerW, ctStatic, isD1D2);
    if (precoPerMeter == null) return null;
    return Math.round(precoPerMeter * (result.realizedLength / 1000) * 100) / 100;
  })();

  const precoTotal = modulePriceResult ? modulePriceResult.total : precoTotalStatico;

  // Preço efetivo: API/catálogo > manual
  const manualPrecoNum = manualPreco !== "" ? parseFloat(manualPreco.replace(",", ".")) : null;
  const precoEfetivo = precoTotal ?? (manualPrecoNum != null && !isNaN(manualPrecoNum) && manualPrecoNum > 0 ? manualPrecoNum : null);

  const summary = generateQuoteSummary(result, precoEfetivo);

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
    <>
    <Card className="shadow-sm border-blue-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-blue-500" />
            Resumo Para Orçamento
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {setItemEmPlanta && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                <Input
                  className="h-7 text-xs w-28"
                  placeholder="ex: L1, P2..."
                  value={itemEmPlanta ?? ""}
                  onChange={(e) => setItemEmPlanta(e.target.value)}
                />
              </div>
            )}
            {setItemEmPlanta && setGlobalQty && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                <Input
                  type="number"
                  className="h-7 text-xs w-16"
                  min={1}
                  placeholder="1"
                  value={globalQty}
                  onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            )}
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
            <Button
              size="sm"
              className="gap-1.5 text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isAddingToCart}
              onClick={() => {
                const photo = getProfilePhoto(result.profileCode, result.diffuserD1, result.diffuserD2);

                // Construir segmentos da composição para a Ficha Técnica de Produção
                const isDual = result.application === 'D1+D2';
                const isIndependent = isDual && (result.independentLighting || result.forcedIndependent);
                const driverEntriesD1 =
                  isDual && !isIndependent && result.combinedDrivers
                    ? result.combinedDrivers
                    : result.driversD1;

                // Mapa de SKUs únicos preservando a ordem da composição
                const skuOrder: string[] = [];
                const skuMap = new Map<string, { length: number; quantity: number; barsPerModule: number }>();
                for (const compItem of result.composition) {
                  if (!skuMap.has(compItem.sku)) {
                    skuOrder.push(compItem.sku);
                    skuMap.set(compItem.sku, {
                      length: compItem.length,
                      quantity: compItem.quantity,
                      barsPerModule: compItem.barsPerModule,
                    });
                  }
                }

                const profileSegments: ProfileSegment[] = skuOrder.map((sku) => {
                  const info = skuMap.get(sku)!;
                  const d1Entry = driverEntriesD1.find((e) => e.sku === sku);
                  const barsPerPiece = d1Entry ? d1Entry.barsPerPiece : info.barsPerModule;

                  // Calcular quantidade de drivers por peça
                  let driverQtyPerPiece = 1;
                  let driverModel = "";
                  let driverCode = "";

                  if (d1Entry) {
                    if (d1Entry.driver.combo && d1Entry.driver.combo.length > 0) {
                      // Para combos, usar o primeiro driver do combo como referência
                      // e somar as quantidades
                      const totalComboQty = d1Entry.driver.combo.reduce((s, c) => s + c.quantity, 0);
                      driverQtyPerPiece = totalComboQty;
                      driverModel = d1Entry.driver.combo.map(c => `${c.quantity} x ${c.model.toUpperCase()}${c.code ? ` (${c.code})` : ''}`).join(' + ');
                      driverCode = "";
                    } else {
                      driverQtyPerPiece = d1Entry.driver.quantity ?? 1;
                      driverModel = d1Entry.driver.model.toUpperCase();
                      driverCode = d1Entry.driver.code ?? "";
                    }
                  }

                  return {
                    sku,
                    qty: info.quantity,
                    lengthMm: info.length,
                    barsPerPiece,
                    driverQtyPerPiece,
                    driverModel,
                    driverCode,
                  };
                });

                // Separar driver quando modulePriceResult tem custo de driver
                const perfilDrvLines: import("@/lib/cartTypes").DriverLine[] | undefined =
                  modulePriceResult && modulePriceResult.precoDriverTotal > 0
                    ? [{
                        driverModel: profileSegments[0]?.driverModel || "Driver",
                        driverCode: profileSegments[0]?.driverCode || "",
                        driverQty: nModules * globalQty,
                        driverUnitPrice: Math.round(modulePriceResult.precoDriverTotal / nModules * 100) / 100,
                        driverTotalPrice: Math.round(modulePriceResult.precoDriverTotal * globalQty * 100) / 100,
                      }]
                    : undefined;
                const perfilPrecoSemDriver = modulePriceResult && modulePriceResult.precoDriverTotal > 0
                  ? Math.round(modulePriceResult.precoLuminariaTotal * globalQty * 100) / 100
                  : null;
                const item: CartItemData = {
                  category: "Perfis",
                  sku: result.profileCode,
                  description: `${result.profileName} ${INSTALL_LABELS[result.installType]} ${result.application !== 'D1' ? result.application + ' ' : ''}${result.powerD1}W ${result.cct} ${result.controlType === 'dimDali' ? 'DIM DALI' : result.controlType === 'dim110v' ? 'DIM 1-10V' : 'ON/OFF'} ${result.voltage} ${result.realizedLength}mm`,
                  power: `${result.powerD1}W`,
                  cct: result.cct,
                  qty: globalQty,
                  unitPrice: precoEfetivo ?? null,
                  totalPrice: precoEfetivo != null ? precoEfetivo * globalQty : null,
                  priceFromApi: modulePriceResult != null && precoTotal != null,
                  photoUrl: photo ?? "",
                  moduloLed: `Stripflex 562,5 x 10mm 36L ${result.cct}`,
                  drivers: "",
                  orderSummary: generateOrderSummary(result),
                  quoteSummary: summary,
                  profileSegments,
                  stripMethod: result.stripMethod,
                  availableCCTs: ["2700K", "3000K", "4000K", "5000K", "A definir"],
                  itemEmPlanta: itemEmPlanta || "",
                  ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}),
                  ...(perfilDrvLines ? {
                    driverLines: perfilDrvLines,
                    priceWithoutDriver: perfilPrecoSemDriver,
                    unitPriceLuminaria: modulePriceResult ? Math.round(modulePriceResult.precoLuminariaTotal * 100) / 100 : null,
                    unitPriceDriver: perfilDrvLines[0]?.driverUnitPrice ?? null,
                    luminariaHasApiPrice: true,
                  } : {}),
                };
                if (onAddToQuote) {
                  onAddToQuote(item);
                } else {
                  setPendingItem(item);
                  setColorModalOpen(true);
                }
              }}
            >
              <ShoppingCart className="w-3.5 h-3.5" /> {onAddToQuote ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
            </Button>
            {onOpenAccessoryModal && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-7 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                onClick={onOpenAccessoryModal}
              >
                <Wrench className="w-3.5 h-3.5" />
                Incluir Acessório
                {pendingAccessoriesCount != null && pendingAccessoriesCount > 0 && (
                  <span className="ml-1 bg-cyan-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{pendingAccessoriesCount}</span>
                )}
              </Button>
            )}
          </div>
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
        {/* Detalhamento: novo método por SKU (BLAZE H e futuros) — com destaque visual amber/blue/green */}
        {/* Controle de markup (apenas para Dennis e Vivian) */}
        {canEditMarkup && modulePriceResult && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium whitespace-nowrap">
              Markup: {modulePriceResult.markupMinimo.toFixed(2)}× mín — {modulePriceResult.markupPadrao?.toFixed(2) ?? '?'}× padrão
            </span>
            <input
              type="number"
              step="0.01"
              min={modulePriceResult.markupMinimo}
              max={99}
              value={markupLuminariaOverride ?? modulePriceResult.markupLuminariaAplicado ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setMarkupLuminariaOverride(isNaN(v) ? null : v);
              }}
              className="h-7 w-20 text-xs border border-amber-400/50 rounded px-2 bg-background text-foreground"
              placeholder="markup"
            />
            <span className="text-xs text-muted-foreground">×</span>
            {markupLuminariaOverride !== null && (
              <button
                onClick={() => setMarkupLuminariaOverride(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
                title="Restaurar markup padrão"
              >Reset</button>
            )}
          </div>
        )}
        {modulePriceResult && (
          <div className="mt-3 rounded-xl border border-border overflow-hidden">
            {/* Linha luminária (amber) */}
            <div className="flex flex-col px-4 py-2.5 bg-amber-500/8 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-sm font-medium text-foreground">Luminária</span>
                </div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatBRL(modulePriceResult.precoLuminariaTotal)}</span>
              </div>
              {/* Detalhamento por SKU */}
              <div className="mt-1.5 space-y-0.5 pl-4">
                {modulePriceResult.breakdown.map((b, i) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground">
                    <span>{b.quantity} × {b.sku} ({formatBRL(b.precoUnit)} cada)</span>
                    <span className="font-mono">{formatBRL(b.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Linha driver (blue) */}
            {modulePriceResult.precoDriverTotal > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-blue-500/8 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    Driver × {nModules}
                  </span>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatBRL(modulePriceResult.precoDriverTotal)}</span>
              </div>
            )}
            {/* Total (green) */}
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/10">
              <span className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Total</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatBRL(modulePriceResult.total)}</span>
            </div>
          </div>
        )}
        {/* Preço total — método antigo (catálogo estático) */}
        {!modulePriceResult && precoTotal !== null && precoTotal !== undefined && (
          <div className="flex items-center justify-between rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-3">
            <span className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Preço Total</span>
            <span className="text-lg font-bold text-blue-300">{formatBRL(precoTotal)}</span>
          </div>
        )}
        {/* Campo de preço manual quando API e catálogo não retornam custo */}
        {!modulePriceResult && precoTotal == null && (
          <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-50/30 dark:bg-amber-900/10 px-3 py-2">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">⚠️ API sem custo — informe o preço manualmente:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">R$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={manualPreco}
                onChange={(e) => setManualPreco(e.target.value)}
                className="h-8 w-36 text-sm"
              />
              {precoEfetivo !== null && (
                <span className="text-sm font-bold text-blue-400">{formatBRL(precoEfetivo)}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Este preço será usado no orçamento.</p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Clique no texto para selecionar ou use o botão "Copiar Resumo" para copiar diretamente.
        </p>
      </CardContent>
    </Card>
    <ColorPickerModal
      open={colorModalOpen}
      onClose={() => { setColorModalOpen(false); setPendingItem(null); }}
      onConfirm={(cor: CorPeca) => {
        if (pendingItem) addItem({ ...pendingItem, corPeca: cor, ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}) });
        setColorModalOpen(false);
        setPendingItem(null);
        if (setGlobalQty) setGlobalQty(1);
      }}
      isAdding={isAddingToCart}
      productName={result.profileName}
    />
    </>
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
  const { user } = useAuth();
  const { addItem, count: cartCount, isAdding: isAddingToCart } = useCart();
  const [pendingCartItem, setPendingCartItem] = useState<CartItemData | null>(null);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [, navigate] = useLocation();

  // ── Modo "Adicionar ao Orçamento" ─────────────────────────────────────────
  // Detecta ?appendToQuote=ID na URL e ativa o modo de adição direta ao orçamento
  const appendToQuoteId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("appendToQuote");
    return v ? parseInt(v, 10) : null;
  }, []);
  const [pendingQuoteItems, setPendingQuoteItems] = useState<CartItemData[]>([]);
  // Acessórios pendentes a serem vinculados ao próximo item enviado ao carrinho
  const [pendingAccessories, setPendingAccessories] = useState<LinkedAccessory[]>([]);
  // Campo "item em planta" global — sincronizado com o carrinho
  const [globalItemEmPlanta, setGlobalItemEmPlanta] = useState("");
  // Quantidade global — sincronizada com o carrinho (espelhada)
  const [globalQty, setGlobalQty] = useState(1);
  // Pavimento global — aplicado a todos os itens adicionados ao carrinho
  const [globalPavimento, setGlobalPavimento] = useState("");
  // Ambiente global — aplicado a todos os itens adicionados ao carrinho
  const [globalAmbiente, setGlobalAmbiente] = useState("");
  const appendItemsMutation = trpc.quotes.appendItems.useMutation({
    onSuccess: (data) => {
      toast.success(`Item adicionado ao orçamento ${data.quoteNumber}!`);
      setGlobalItemEmPlanta(""); // limpa após envio
    },
    onError: (err) => {
      toast.error(`Erro ao adicionar itens: ${err.message}`);
    },
  });

  // Função central: adiciona ao orçamento ou ao carrinho dependendo do modo
  // Sempre abre o modal de cor antes de enviar (seja ao carrinho ou ao orçamento)
  const handleAddItemOrToQuote = useCallback((item: CartItemData) => {
    // Abre o modal de seleção de cor — o onConfirm abaixo decide o destino
    setPendingCartItem(item);
    setColorModalOpen(true);
  }, []);

  const handleConfirmAddToQuote = useCallback(() => {
    if (!appendToQuoteId || pendingQuoteItems.length === 0) return;
    appendItemsMutation.mutate({
      quoteId: appendToQuoteId,
      newItems: pendingQuoteItems.map((it, idx) => ({
        itemNumber: idx + 1,
        itemData: JSON.stringify(it),
      })),
      versionNotes: `+${pendingQuoteItems.length} item(s) adicionado(s) via configurador`,
    });
  }, [appendToQuoteId, pendingQuoteItems, appendItemsMutation]);
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
  const activeGlowCatalog = adaptedCatalogs?.glowProducts ?? [];
  const activeTubeLightCatalog = adaptedCatalogs?.tubeLights ?? [];
  const activePerfisFixes = adaptedCatalogs?.perfisFixes ?? [];
  const activeDecorativasCatalog = adaptedCatalogs?.decorativas ?? [];
  const activeAreaExternaCatalog = adaptedCatalogs?.areaExterna ?? [];
  const activeBalizadoresCatalog = adaptedCatalogs?.balizadores ?? [];

  // Resolve foto de painel: API primeiro, depois dicionário estático
  const resolvePainelPhoto = useCallback((familia: string | null, produto: string): string | null => {
    if (!familia) return null;
    return adaptedCatalogs?.painelFotos?.[familia] ?? getPainelPhoto(familia, produto);
  }, [adaptedCatalogs]);

  // Resolve foto de downlight: API primeiro, depois dicionário estático
  const resolveDownlightPhoto = useCallback((familia: string | null, produto: string): string | null => {
    if (!familia) return null;
    return adaptedCatalogs?.downlightFotos?.[`${familia}|${produto}`] ?? getDownlightPhoto(familia, produto);
  }, [adaptedCatalogs]);

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

  // Mapa de custo+markup por SKU individual (extraído dos produtos PERFIS da API)
  // Armazena custoCorpo (bruto) e markups por tipo de controle
  // Preço de venda = custoCorpo[controle] × markupPadrao[controle]
  const skuPriceMap = useMemo(() => {
    if (!alfaluxApiProducts || alfaluxApiProducts.length === 0) return {};
    const map: Record<string, {
      // Custos brutos por controle (D1 simples)
      custoOnoff220: number | null;
      custoOnoffBivolt: number | null;
      custoDim110v: number | null;
      custoDimDali: number | null;
      custoDimTriac110v: number | null;
      custoDimTriac220v: number | null;
      // Custos brutos por controle (D1+D2)
      custoOnoff220D1D2: number | null;
      custoOnoffBivoltD1D2: number | null;
      custoDim110vD1D2: number | null;
      custoDimDaliD1D2: number | null;
      custoDimTriac110vD1D2: number | null;
      custoDimTriac220vD1D2: number | null;
      // Markups padrão por controle
      markupPadraoOnoff220v: number | null;
      markupPadraoOnoffBivolt: number | null;
      markupPadraoDim110v: number | null;
      markupPadraoDimDali: number | null;
      markupPadraoDimTriac110v: number | null;
      markupPadraoDimTriac220v: number | null;
      // Markups mínimos por controle
      markupMinimoOnoff220v: number | null;
      markupMinimoOnoffBivolt: number | null;
      markupMinimoDim110v: number | null;
      markupMinimoDimDali: number | null;
      markupMinimoDimTriac110v: number | null;
      markupMinimoDimTriac220v: number | null;
      // Custo do driver por controle
      custoDriver220: number | null;
      custoDriverBivolt: number | null;
      custoDriverDim110v: number | null;
      custoDriverDimDali: number | null;
      custoDriverDimTriac110v: number | null;
      custoDriverDimTriac220v: number | null;
      markupMinimoDriver: number | null;
    }> = {};
    for (const p of alfaluxApiProducts) {
      const cat = (p.categoria ?? "").toUpperCase();
      if (cat !== "PERFIS") continue;
      const sku = p.sku ?? "";
      if (!sku) continue;
      map[sku] = {
        custoOnoff220: p.custoCorpoOnoff220v ?? null,
        custoOnoffBivolt: p.custoCorpoOnoffBivolt ?? null,
        custoDim110v: p.custoCorpoDim110v ?? null,
        custoDimDali: p.custoCorpoDimDali ?? null,
        custoDimTriac110v: p.custoCorpoDimTriac110v ?? null,
        custoDimTriac220v: p.custoCorpoDimTriac220v ?? null,
        custoOnoff220D1D2: p.custoCorpoOnoff220vD1D2 ?? null,
        custoOnoffBivoltD1D2: p.custoCorpoOnoffBivoltD1D2 ?? null,
        custoDim110vD1D2: p.custoCorpoDim110vD1D2 ?? null,
        custoDimDaliD1D2: p.custoCorpoDimDaliD1D2 ?? null,
        custoDimTriac110vD1D2: p.custoCorpoDimTriac110vD1D2 ?? null,
        custoDimTriac220vD1D2: p.custoCorpoDimTriac220vD1D2 ?? null,
        markupPadraoOnoff220v: p.markupPadraoOnoff220v ?? null,
        markupPadraoOnoffBivolt: p.markupPadraoOnoffBivolt ?? null,
        markupPadraoDim110v: p.markupPadraoDim110v ?? null,
        markupPadraoDimDali: p.markupPadraoDimDali ?? null,
        markupPadraoDimTriac110v: p.markupPadraoDimTriac110v ?? null,
        markupPadraoDimTriac220v: p.markupPadraoDimTriac220v ?? null,
        markupMinimoOnoff220v: p.markupMinimoOnoff220v ?? null,
        markupMinimoOnoffBivolt: p.markupMinimoOnoffBivolt ?? null,
        markupMinimoDim110v: p.markupMinimoDim110v ?? null,
        markupMinimoDimDali: p.markupMinimoDimDali ?? null,
        markupMinimoDimTriac110v: p.markupMinimoDimTriac110v ?? null,
        markupMinimoDimTriac220v: p.markupMinimoDimTriac220v ?? null,
        custoDriver220: p.custoDriver220 ?? null,
        custoDriverBivolt: p.custoDriverBivolt ?? null,
        custoDriverDim110v: p.custoDriverDim110v ?? null,
        custoDriverDimDali: p.custoDriverDimDali ?? null,
        custoDriverDimTriac110v: p.custoDriverDimTriac110v ?? null,
        custoDriverDimTriac220v: p.custoDriverDimTriac220v ?? null,
        markupMinimoDriver: p.markupMinimoDriver ?? null,
      };
    }
    return map;
  }, [alfaluxApiProducts]);

  // Mapa de preços por metro por profileCode (extraído dos produtos PERFIS da API)
  // Estrutura: { [profileCode]: { onoff220: number|null, onoffBivolt: number|null, dim110v: number|null, dimDali: number|null } }
  const profilePriceMap = useMemo(() => {
    if (!alfaluxApiProducts || alfaluxApiProducts.length === 0) return {};
    const map: ProfilePriceMap = {};
    for (const p of alfaluxApiProducts) {
      const cat = (p.categoria ?? "").toUpperCase();
      if (cat !== "PERFIS") continue;
      const code = (p.sku ?? "").split(".")[0];
      if (!code) continue;
      if (!map[code]) {
        map[code] = {
          onoff220: p.precoOnOff220 ?? null,
          onoffBivolt: p.precoOnOffBivolt ?? null,
          dim110v: p.precoDim110v ?? null,
          dimDali: p.precoDimDali ?? null,
          onoff220D1D2: p.precoOnOff220D1D2 ?? null,
          onoffBivoltD1D2: p.precoOnOffBivoltD1D2 ?? null,
          dim110vD1D2: p.precoDim110vD1D2 ?? null,
          dimDaliD1D2: p.precoDimDaliD1D2 ?? null,
        };
      } else {
        // Preencher campos D1D2 se ainda não preenchidos (o primeiro produto com valor vence)
        if (map[code].onoff220D1D2 == null && p.precoOnOff220D1D2 != null) map[code].onoff220D1D2 = p.precoOnOff220D1D2;
        if (map[code].onoffBivoltD1D2 == null && p.precoOnOffBivoltD1D2 != null) map[code].onoffBivoltD1D2 = p.precoOnOffBivoltD1D2;
        if (map[code].dim110vD1D2 == null && p.precoDim110vD1D2 != null) map[code].dim110vD1D2 = p.precoDim110vD1D2;
        if (map[code].dimDaliD1D2 == null && p.precoDimDaliD1D2 != null) map[code].dimDaliD1D2 = p.precoDimDaliD1D2;
      }
    }
    return map;
  }, [alfaluxApiProducts]);

  // Mapa de custo+markup por SKU para luminárias (Downlights, Spots, Painéis, Arandelas, Área Externa, Balizadores, Decorativas, Glow)
  // Usado para calcular driverLines e priceWithoutDriver ao criar itens novos
  const lumPriceMap = useMemo(() => {
    if (!alfaluxApiProducts || alfaluxApiProducts.length === 0) return {};
    const map: Record<string, {
      custoCorpoOnoff220v: number | null;
      custoCorpoOnoffBivolt: number | null;
      custoCorpoDim110v: number | null;
      custoCorpoDimDali: number | null;
      custoCorpoDimTriac110v: number | null;
      custoCorpoDimTriac220v: number | null;
      custoDriver220: number | null;
      custoDriverBivolt: number | null;
      custoDriverDim110v: number | null;
      custoDriverDimDali: number | null;
      custoDriverDimTriac110v: number | null;
      custoDriverDimTriac220v: number | null;
      markupPadraoOnoff220v: number | null;
      markupPadraoOnoffBivolt: number | null;
      markupPadraoDim110v: number | null;
      markupPadraoDimDali: number | null;
      markupPadraoDimTriac110v: number | null;
      markupPadraoDimTriac220v: number | null;
      markupPadraoDriverOnoff220v: number | null;
      markupPadraoDriverOnoffBivolt: number | null;
      markupPadraoDriverDim110v: number | null;
      markupPadraoDriverDimDali: number | null;
      markupPadraoDriverDimTriac110v: number | null;
      markupPadraoDriverDimTriac220v: number | null;
      markupMinimoOnoff220v: number | null;
      markupMinimoOnoffBivolt: number | null;
      markupMinimoDim110v: number | null;
      markupMinimoDimDali: number | null;
      markupMinimoDimTriac110v: number | null;
      markupMinimoDimTriac220v: number | null;
      markupMinimoDriver: number | null;
      driverQtd220: number | null;
      driverQtdBivolt: number | null;
      driverQtdDim110v: number | null;
      driverQtdDimDali: number | null;
      driverQtdDimTriac110v: number | null;
      driverQtdDimTriac220v: number | null;
    }> = {};
    const NON_PROFILE_CATS = ["DOWNLIGHTS", "SPOTS", "PAINÉIS", "PAINEIS", "ARANDELAS", "ÁREA EXTERNA", "AREA EXTERNA", "BALIZADORES", "DECORATIVAS"];
    // Famílias de perfis fixos (categoria PERFIS) que também precisam de preço
    const FAMILIA_PRICE_INCLUDE = ["GLOW", "TUBE LIGHT"];
    for (const p of alfaluxApiProducts) {
      const cat = (p.categoria ?? "").toUpperCase();
      const fam = (p.familia ?? "").toUpperCase();
      const inCat = NON_PROFILE_CATS.includes(cat);
      const inFam = FAMILIA_PRICE_INCLUDE.includes(fam);
      if (!inCat && !inFam) continue;
      const sku = p.sku ?? "";
      if (!sku) continue;
      const name = p.name ?? "";
      // Usar chave composta sku||name para evitar colisão com SKUs duplicados na API.
      // O fallback para sku simples é mantido em buildLumDriverLines para compatibilidade.
      const compositeKey = name ? `${sku}||${name}` : sku;
      const entryData = {
        custoCorpoOnoff220v: p.custoCorpoOnoff220v ?? null,
        custoCorpoOnoffBivolt: p.custoCorpoOnoffBivolt ?? null,
        custoCorpoDim110v: p.custoCorpoDim110v ?? null,
        custoCorpoDimDali: p.custoCorpoDimDali ?? null,
        custoCorpoDimTriac110v: p.custoCorpoDimTriac110v ?? null,
        custoCorpoDimTriac220v: p.custoCorpoDimTriac220v ?? null,
        custoDriver220: p.custoDriver220 ?? null,
        custoDriverBivolt: p.custoDriverBivolt ?? null,
        custoDriverDim110v: p.custoDriverDim110v ?? null,
        custoDriverDimDali: p.custoDriverDimDali ?? null,
        custoDriverDimTriac110v: p.custoDriverDimTriac110v ?? null,
        custoDriverDimTriac220v: p.custoDriverDimTriac220v ?? null,
        markupPadraoOnoff220v: p.markupPadraoOnoff220v ?? null,
        markupPadraoOnoffBivolt: p.markupPadraoOnoffBivolt ?? null,
        markupPadraoDim110v: p.markupPadraoDim110v ?? null,
        markupPadraoDimDali: p.markupPadraoDimDali ?? null,
        markupPadraoDimTriac110v: p.markupPadraoDimTriac110v ?? null,
        markupPadraoDimTriac220v: p.markupPadraoDimTriac220v ?? null,
        markupPadraoDriverOnoff220v: p.markupPadraoDriverOnoff220v ?? null,
        markupPadraoDriverOnoffBivolt: p.markupPadraoDriverOnoffBivolt ?? null,
        markupPadraoDriverDim110v: p.markupPadraoDriverDim110v ?? null,
        markupPadraoDriverDimDali: p.markupPadraoDriverDimDali ?? null,
        markupPadraoDriverDimTriac110v: p.markupPadraoDriverDimTriac110v ?? null,
        markupPadraoDriverDimTriac220v: p.markupPadraoDriverDimTriac220v ?? null,
        markupMinimoOnoff220v: p.markupMinimoOnoff220v ?? null,
        markupMinimoOnoffBivolt: p.markupMinimoOnoffBivolt ?? null,
        markupMinimoDim110v: p.markupMinimoDim110v ?? null,
        markupMinimoDimDali: p.markupMinimoDimDali ?? null,
        markupMinimoDimTriac110v: p.markupMinimoDimTriac110v ?? null,
        markupMinimoDimTriac220v: p.markupMinimoDimTriac220v ?? null,
        markupMinimoDriver: p.markupMinimoDriver ?? null,
        driverQtd220: p.driverQtd220 ?? null,
        driverQtdBivolt: p.driverQtdBivolt ?? null,
        driverQtdDim110v: p.driverQtdDim110v ?? null,
        driverQtdDimDali: p.driverQtdDimDali ?? null,
        driverQtdDimTriac110v: p.driverQtdDimTriac110v ?? null,
        driverQtdDimTriac220v: p.driverQtdDimTriac220v ?? null,
      };
      // Registrar com chave composta (preferência) e chave simples (fallback)
      map[compositeKey] = entryData;
      // Só registrar chave simples se ainda não existir (evita sobrescrever com produto errado)
      if (!map[sku]) map[sku] = entryData;
    }
    return map;
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
  const [dlShape, setDlShape] = useState<'R' | 'Q' | null>(null);
  const [dlInstalacao, setDlInstalacao] = useState<string | null>(null);
  const [dlFamilia, setDlFamilia] = useState<string | null>(null);
  const [dlProductKey, setDlProductKey] = useState<string | null>(null);
  const [dlVoltage, setDlVoltage] = useState<"220V" | "Bivolt" | null>(null);
  const [dlCCT, setDlCCT] = useState<string>("3000K");
  const [dlControle, setDlControle] = useState<ControleType>("ON/OFF");
  const [dlResult, setDlResult] = useState<DownlightResult | null>(null);
  // Estados de Área Externa (PROOF) — mesmo fluxo dos Downlights
  const [aeInstalacao, setAeInstalacao] = useState<string | null>(null);
  const [aeFamilia, setAeFamilia] = useState<string | null>(null);
  const [aeProductKey, setAeProductKey] = useState<string | null>(null);
  const [aeVoltage, setAeVoltage] = useState<"220V" | "Bivolt" | null>(null);
  const [aeCCT, setAeCCT] = useState<string>("3000K");
  const [aeControle, setAeControle] = useState<ControleType>("ON/OFF");
  const [aeResult, setAeResult] = useState<DownlightResult | null>(null);
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
  const [lbInstalacao, setLbInstalacao] = useState<"EMBUTIR" | "SOBREPOR" | null>(null);
  const [lbPotencia, setLbPotencia] = useState<LedBarPotencia | null>(null);
  const [lbDifusor, setLbDifusor] = useState<LedBarDifusor | null>(null);
  const [lbControle, setLbControle] = useState<LedBarControle>("ON/OFF");
  const [lbVoltage, setLbVoltage] = useState<LedBarVoltage>("220V");
  const [lbCCT, setLbCCT] = useState<string>("3000K");
  const [lbComprimento, setLbComprimento] = useState<string>("");
  const [lbNCortes, setLbNCortes] = useState<string>("1");
  const [lbResult, setLbResult] = useState<LedBarResult | null>(null);
  // ── Estados de SPACE Genérico ─────────────────────────────────────────────────
  /** Formato selecionado: R=Redondo, Q=Quadrado, Ret=Retangular */
  const [spaceFormat, setSpaceFormat] = useState<SpaceFormat>("R");
  /** Diâmetro em mm (Space R) */
  const [spaceDiametro, setSpaceDiametro] = useState<string>("1000");
  /** Largura em mm (Space Q / Space Ret) */
  const [spaceLargura, setSpaceLargura] = useState<string>("1000");
  /** Comprimento em mm (Space Ret) */
  const [spaceComprimento, setSpaceComprimento] = useState<string>("1000");
  /** Potência da fita: 5W/m ou 10W/m */
  const [spacePotencia, setSpacePotencia] = useState<SpacePotencia>("5W/m");
  /** CCT selecionado para o SPACE genérico */
  const [spaceCCT, setSpaceCCT] = useState<string>("3000K");
  /** Resultado do cálculo SPACE */
  const [spaceResult, setSpaceResult] = useState<SpaceCalculationResult | null>(null);
  // ── Estados de BAGEO ─────────────────────────────────────────────────────────
  const [bgMode, setBgMode] = useState<"sinuosa" | "fixo" | false>(false); // modo BAGEO selecionado no dropdown
  // ── Estados de BAGEO fixo (tamanhos fixos, fluxo igual a Downlights) ─────────
  const [bfInstalacao, setBfInstalacao] = useState<string | null>(null);
  const [bfFamilia, setBfFamilia] = useState<string | null>(null);
  const [bfProductKey, setBfProductKey] = useState<string | null>(null);
  const [bfVoltage, setBfVoltage] = useState<"220V" | "Bivolt" | null>(null);
  const [bfCCT, setBfCCT] = useState<string>("3000K");
  const [bfControle, setBfControle] = useState<ControleType>("ON/OFF");
  const [bfResult, setBfResult] = useState<DownlightResult | null>(null);
  const [bgInstalacao, setBgInstalacao] = useState<BageoInstalacao | null>(null);
  const [bgProduct, setBgProduct] = useState<BageoProduct | null>(null);
  const [bgComprimento, setBgComprimento] = useState<string>("1000");
  const [bgControle, setBgControle] = useState<BageoControle>("ON/OFF 220V");
  const [bgCCT, setBgCCT] = useState<string>("3000K");
  const [bgResult, setBgResult] = useState<BageoResult | null>(null);
  const [bgManualPreco, setBgManualPreco] = useState<string>("");  // ── Estados de GLOW (perfis fixos) ───────────────────────────────────────────
  const [glowMode, setGlowMode] = useState<boolean>(false);
  const [glowProductKey, setGlowProductKey] = useState<string | null>(null);
  const [glowVoltage, setGlowVoltage] = useState<"220V" | "Bivolt" | null>(null);
  const [glowCCT, setGlowCCT] = useState<string>("3000K");
  const [glowResult, setGlowResult] = useState<DownlightResult | null>(null);
  // ── Estados de TUBE LIGHT (perfil fixo, sem composição) ────────────────────────────
  const [tubeLightMode, setTubeLightMode] = useState<boolean>(false);
  const [tubeLightProductKey, setTubeLightProductKey] = useState<string | null>(null);
  const [tubeLightVoltage, setTubeLightVoltage] = useState<"220V" | "Bivolt" | null>(null);
  const [tubeLightCCT, setTubeLightCCT] = useState<string>("3000K");
  const [tubeLightResult, setTubeLightResult] = useState<DownlightResult | null>(null);  // ──  // ── Estados de Decorativas ────────────────────────────────────────────
  const [decFamilia, setDecFamilia] = useState<string | null>(null);
  const [decProductKey, setDecProductKey] = useState<string | null>(null);
  const [decCCT, setDecCCT] = useState<string>("3000K");
  const [decVoltage, setDecVoltage] = useState<"220V" | "Bivolt">("Bivolt");
  // ── Estados de Balizadores ───────────────────────────────────────────
  const [balFamilia, setBalFamilia] = useState<string | null>(null);
  const [balProductKey, setBalProductKey] = useState<string | null>(null);
  const [balCCT, setBalCCT] = useState<string>("3000K");
  // ── Estados de Item Especial ──────────────────────────────────────────────
  const [spDescription, setSpDescription] = useState<string>("");
  const [spDimensions, setSpDimensions] = useState<string>("");
  const [spPower, setSpPower] = useState<string>("");
  const [spDim, setSpDim] = useState<string>("");
  const [spVoltage, setSpVoltage] = useState<string>("");
  const [spColor, setSpColor] = useState<string>("");
  const [spColorTemp, setSpColorTemp] = useState<string>("");
  const [spUnitPrice, setSpUnitPrice] = useState<string>("");
  const [spPriceMode, setSpPriceMode] = useState<"unit" | "meter">("unit");
  const [spLength, setSpLength] = useState<string>(""); // comprimento em metros (modo por metro)
  const [spInternalNotes, setSpInternalNotes] = useState<string>("");
  const [spPhotoUrl, setSpPhotoUrl] = useState<string>("");
  const [spPhotoPreview, setSpPhotoPreview] = useState<string>("");
  const [spIsUploading, setSpIsUploading] = useState(false);

  //  // ── Estados de Serviços ──────────────────────────────────────────────
  const [svDescription, setSvDescription] = useState<string>("");
  const [svQty, setSvQty] = useState<string>("1");
  const [svUnitPrice, setSvUnitPrice] = useState<string>("");
  const [svNotes, setSvNotes] = useState<string>("");

  // ── Estados de Revenda ──────────────────────────────────────────────────────────────────
  const [rvSelectedSku, setRvSelectedSku] = useState<string>("");
  const [rvFornecedor, setRvFornecedor] = useState<string>("");
  const [rvSearch, setRvSearch] = useState<string>("");

  const revendaProductsQuery = trpc.alfalux.revendaProducts.useQuery();
  const revendaProducts = revendaProductsQuery.data ?? [];

  // ── Estados de Customizados ──────────────────────────────────────────────────────
  const [czSelectedSku, setCzSelectedSku] = useState<string>("");
  const [czSearch, setCzSearch] = useState<string>("");
  const [czQty, setCzQty] = useState<string>("1");
  const [czUnitPrice, setCzUnitPrice] = useState<string>("");
  const [czNotes, setCzNotes] = useState<string>("");

  const customizadosQuery = trpc.alfalux.customizadosProducts.useQuery();
  const customizadosProducts = customizadosQuery.data ?? [];

  // Regras de agrupamento de fornecedores
  const FORNECEDOR_IGNORE: string[] = []; // Nenhum fornecedor ignorado — exibir todos
  const FORNECEDOR_MAP: Record<string, string> = {
    "ADILSON": "DIVERSOS",
    "MARIA": "DIVERSOS",
    "MERC. LIVRE": "DIVERSOS",
    "MERCADO LIVRE": "DIVERSOS",
    "ROBERTET": "DIVERSOS",
    "S. GROUND": "STELLA",
    "S.GROUND": "STELLA",
    "SOLAR GROUND": "STELLA",
    "BACKLIT LUMIGRID": "DIVERSOS", // antes ignorado, agora agrupado em DIVERSOS
  };
  const normalizeFornecedor = (f: string | null | undefined): string => {
    if (!f) return "SEM FORNECEDOR";
    const upper = f.toUpperCase().trim();
    if (FORNECEDOR_IGNORE.includes(upper)) return "DIVERSOS";
    return FORNECEDOR_MAP[upper] ?? f.trim();
  };

  // Fornecedores únicos para os chips de filtro (após agrupamento)
  const revendaFornecedores = useMemo(() => {
    const set = new Set<string>();
    revendaProducts.forEach(p => {
      set.add(normalizeFornecedor(p.fornecedor));
    });
    return Array.from(set).sort();
  }, [revendaProducts]);
  // Produtos filtrados por fornecedor + busca textual (com agrupamento)
  const filteredRevendaProducts = useMemo(() => {
    // Todos os 216 produtos são exibidos — sem filtro de exclusão por fornecedor
    let list = [...revendaProducts];
    if (rvFornecedor) {
      list = list.filter(p => normalizeFornecedor(p.fornecedor) === rvFornecedor);
    }
    if (rvSearch.trim()) {
      const q = rvSearch.toLowerCase();
      list = list.filter(p =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.referencia ?? "").toLowerCase().includes(q) ||
        normalizeFornecedor(p.fornecedor).toLowerCase().includes(q)
      );
    }
    return list;
  }, [revendaProducts, rvFornecedor, rvSearch]);;

  const handleAddRevendaItem = useCallback((sku?: string) => {
    const targetSku = sku ?? rvSelectedSku;
    if (!targetSku) {
      toast.error("Selecione um produto.");
      return;
    }
    const product = revendaProducts.find(p => p.sku === targetSku);
    if (!product) return;
    // Montar nota automática: "Fabricante ref: XXXX"
    const fabricante = product.fornecedor ? normalizeFornecedor(product.fornecedor) : null;
    const autoNote = [fabricante, product.referencia ? `ref: ${product.referencia}` : null]
      .filter(Boolean).join(" ");
    const precoVenda = product.precoVenda ?? 0;
    const item: CartItemData = {
      category: "Revenda",
      sku: product.sku,
      description: product.name,
      photoUrl: product.fotoUrl ?? "",
      qty: 1,
      unitPrice: precoVenda,
      totalPrice: precoVenda,
      priceFromApi: false, // Revenda: preço pré-preenchido mas sempre editável
      power: "",
      cct: "",
      orderSummary: `${product.name} (${product.sku})`,
      quoteSummary: `${product.name} (${product.sku})`,
      specialInternalNotes: undefined,
      corPeca: "",
      itemNote: autoNote || undefined,
      itemEmPlanta: globalItemEmPlanta,
    };
    if (appendToQuoteId) {
      handleAddItemOrToQuote(item);
    } else {
      const itemWithFloor: CartItemData = {
        ...item,
        ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}),
        ...(globalAmbiente ? { ambiente: globalAmbiente } : {}),
      };
      const itemWithAcc: CartItemData = pendingAccessories.length > 0
        ? { ...itemWithFloor, accessories: [...pendingAccessories] }
        : itemWithFloor;
      if (pendingAccessories.length > 0) setPendingAccessories([]);
      addItem(itemWithAcc);
      if (precoVenda > 0) {
        toast.success(`"${product.name}" adicionado com preço R$ ${precoVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`);
      } else {
        toast.success(`"${product.name}" adicionado! Defina o preço no carrinho.`);
      }
    }
    setRvSelectedSku("");
  }, [rvSelectedSku, revendaProducts, addItem, appendToQuoteId, handleAddItemOrToQuote, pendingAccessories]);

  const handleAddCustomizadoItem = useCallback(() => {
    // Modo API: produto selecionado da lista
    if (czSelectedSku && customizadosProducts.length > 0) {
      const product = customizadosProducts.find(p => p.sku === czSelectedSku);
      if (!product) return;
      const qty = parseInt(czQty) || 1;
      const unitPrice = czUnitPrice ? parseFloat(czUnitPrice) : (product.precoVenda ?? 0);
      const total = qty * unitPrice;
      const item: CartItemData = {
        category: "Customizados",
        sku: product.sku,
        description: product.name,
        photoUrl: product.fotoUrl ?? "",
        qty,
        unitPrice,
        totalPrice: total,
        priceFromApi: false,
        power: "",
        cct: "",
        orderSummary: `${product.name} (${product.sku})`,
        quoteSummary: `${product.name} (${product.sku})`,
        specialInternalNotes: undefined,
        corPeca: "",
        itemNote: czNotes || undefined,
        itemEmPlanta: globalItemEmPlanta,
      };
      if (appendToQuoteId) {
        handleAddItemOrToQuote(item);
      } else {
        const itemWithFloor: CartItemData = {
          ...item,
          ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}),
          ...(globalAmbiente ? { ambiente: globalAmbiente } : {}),
        };
        const itemWithAcc = pendingAccessories.length > 0
          ? { ...itemWithFloor, accessories: [...pendingAccessories] }
          : itemWithFloor;
        if (pendingAccessories.length > 0) setPendingAccessories([]);
        addItem(itemWithAcc);
        toast.success(`"${product.name}" adicionado!`);
      }
      setCzSelectedSku("");
      setCzQty("1");
      setCzUnitPrice("");
      setCzNotes("");
      return;
    }
    // Modo manual: sem produtos da API
    if (!czSearch.trim()) {
      toast.error("Informe a descrição do produto.");
      return;
    }
    const qty = parseInt(czQty) || 1;
    const unitPrice = parseFloat(czUnitPrice) || 0;
    const total = qty * unitPrice;
    const item: CartItemData = {
      category: "Customizados",
      sku: `CZ-${Date.now()}`,
      description: czSearch.trim(),
      photoUrl: "",
      qty,
      unitPrice,
      totalPrice: total,
      priceFromApi: false,
      power: "",
      cct: "",
      orderSummary: czSearch.trim(),
      quoteSummary: czSearch.trim(),
      specialInternalNotes: undefined,
      corPeca: "",
      itemNote: czNotes || undefined,
      itemEmPlanta: globalItemEmPlanta,
    };
    if (appendToQuoteId) {
      handleAddItemOrToQuote(item);
    } else {
      const itemWithFloor: CartItemData = {
        ...item,
        ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}),
        ...(globalAmbiente ? { ambiente: globalAmbiente } : {}),
      };
      const itemWithAcc = pendingAccessories.length > 0
        ? { ...itemWithFloor, accessories: [...pendingAccessories] }
        : itemWithFloor;
      if (pendingAccessories.length > 0) setPendingAccessories([]);
      addItem(itemWithAcc);
      toast.success(`"${czSearch.trim()}" adicionado ao carrinho!`);
    }
    setCzSearch("");
    setCzQty("1");
    setCzUnitPrice("");
    setCzNotes("");
  }, [czSelectedSku, czSearch, czQty, czUnitPrice, czNotes, customizadosProducts, addItem, appendToQuoteId, handleAddItemOrToQuote, pendingAccessories, globalItemEmPlanta, globalPavimento, globalAmbiente]);

  // ── Estados de Acessórios ──────────────────────────────────────────────
  const [acSelectedId, setAcSelectedId] = useState<number | null>(null);
  const [acFamilia, setAcFamilia] = useState<string>("");
  const [acSearch, setAcSearch] = useState<string>("");
  // Subcategoria: 'driver' = Drivers & Fontes, 'accessories' = Acessórios Físicos, '' = todos
  const [acSubcat, setAcSubcat] = useState<'driver' | 'accessories' | ''>('');
  // Modal de inclusão de acessório a partir do painel de resultados
  const [addAcModalOpen, setAddAcModalOpen] = useState(false);
  const [addAcModalFamilia, setAddAcModalFamilia] = useState<string>("");
  const [addAcModalSearch, setAddAcModalSearch] = useState<string>("");
  const [addAcModalSelectedId, setAddAcModalSelectedId] = useState<number | null>(null);
  const [addAcModalQty, setAddAcModalQty] = useState<number>(1);

  const acessoriosQuery = trpc.alfalux.acessoriosProducts.useQuery();
  const acessoriosProducts = acessoriosQuery.data ?? [];

  // Famílias únicas para os chips de filtro (filtradas pela subcategoria ativa)
  const acessoriosFamilias = useMemo(() => {
    const set = new Set<string>();
    let base = acessoriosProducts;
    if (acSubcat) base = base.filter(p => (p.source ?? 'accessories') === acSubcat);
    base.forEach(p => { if (p.familia) set.add(p.familia); });
    return Array.from(set).sort();
  }, [acessoriosProducts, acSubcat]);

  // Produtos filtrados por subcategoria + família + busca textual
  const filteredAcessorios = useMemo(() => {
    let list = acessoriosProducts;
    if (acSubcat) list = list.filter(p => (p.source ?? 'accessories') === acSubcat);
    if (acFamilia) list = list.filter(p => p.familia === acFamilia);
    if (acSearch.trim()) {
      const q = acSearch.toLowerCase();
      list = list.filter(p =>
        (p.produto ?? "").toLowerCase().includes(q) ||
        (p.codigo ?? "").toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.dimensao ?? "").toLowerCase().includes(q) ||
        (p.observacoes ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [acessoriosProducts, acSubcat, acFamilia, acSearch]);

  // Filtro para o modal de inclusão de acessório no painel de resultados
  const filteredAcessoriosModal = useMemo(() => {
    let list = acessoriosProducts;
    if (addAcModalFamilia) list = list.filter(p => p.familia === addAcModalFamilia);
    if (addAcModalSearch.trim()) {
      const q = addAcModalSearch.toLowerCase();
      list = list.filter(p =>
        (p.produto ?? "").toLowerCase().includes(q) ||
        (p.codigo ?? "").toLowerCase().includes(q) ||
        (p.dimensao ?? "").toLowerCase().includes(q) ||
        (p.familia ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [acessoriosProducts, addAcModalFamilia, addAcModalSearch]);

  const handleAddAcessorioFromModal = useCallback(() => {
    if (!addAcModalSelectedId) { toast.error("Selecione um acessório."); return; }
    const product = acessoriosProducts.find(p => p.id === addAcModalSelectedId);
    if (!product) return;
    const precoVenda = product.precoVenda ?? 0;
    const descricao = product.produto ?? product.codigo ?? `Acessório #${product.id}`;
    // Acumula o acessório como pendente para ser vinculado ao próximo item enviado ao carrinho
    const qty = Math.max(1, addAcModalQty || 1);
    const linked: LinkedAccessory = {
      codigo: product.codigo ?? product.sku ?? `AC${product.id}`,
      descricao,
      qty,
      unitPrice: precoVenda > 0 ? precoVenda : null,
      fotoUrl: product.fotoUrl ?? null,
      familia: product.familia ?? undefined,
      dimensao: product.dimensao ?? undefined,
    };
    setPendingAccessories(prev => {
      // Evita duplicata pelo código
      const exists = prev.some(a => a.codigo === linked.codigo);
      if (exists) {
        toast.info(`"${descricao}" já está na lista de acessórios pendentes.`);
        return prev;
      }
      toast.success(`Acessório "${descricao}" (${qty}×) incluído ao produto! Será enviado junto ao carrinho.`);
      return [...prev, linked];
    });
    setAddAcModalOpen(false);
    setAddAcModalSelectedId(null);
    setAddAcModalSearch("");
    setAddAcModalFamilia("");
    setAddAcModalQty(1);
  }, [addAcModalSelectedId, addAcModalQty, acessoriosProducts]);

  const handleAddAcessorioItem = useCallback((id?: number) => {
    const targetId = id ?? acSelectedId;
    if (!targetId) { toast.error("Selecione um acessório."); return; }
    const product = acessoriosProducts.find(p => p.id === targetId);
    if (!product) return;
    const precoVenda = product.precoVenda ?? 0;
    const descricao = product.produto ?? product.codigo ?? `Acessório #${product.id}`;

    // Verifica se há um produto configurado em qualquer categoria
    // Nota: result e shapeResult são declarados depois deste callback, por isso são verificados via productCategory
    const hasConfiguredProduct = !!(dlResult || aeResult || spotResult || arandelaResult || panelResult || lbResult || bgResult || bfResult || rvSelectedSku ||
      (productCategory === "Perfis") || (productCategory === "Spots") || (productCategory === "Downlights") ||
      (productCategory === "Área Externa") || (productCategory === "Painéis") || (productCategory === "Arandelas") || (productCategory === "Revenda") ||
      (productCategory === "Item Especial"));

    if (hasConfiguredProduct) {
      // Vincula o acessório ao produto pai como sub-item
      const linked: LinkedAccessory = {
        codigo: product.codigo ?? product.sku ?? `AC${product.id}`,
        descricao,
        qty: 1,
        unitPrice: precoVenda > 0 ? precoVenda : null,
        fotoUrl: product.fotoUrl ?? null,
        familia: product.familia ?? undefined,
        dimensao: product.dimensao ?? undefined,
      };
      setPendingAccessories(prev => {
        const exists = prev.some(a => a.codigo === linked.codigo);
        if (exists) {
          toast.info(`"${descricao}" já está vinculado ao produto.`);
          return prev;
        }
        toast.success(`Acessório "${descricao}" vinculado! Será incluído junto com o produto no carrinho.`);
        return [...prev, linked];
      });
      setAcSelectedId(null);
      return;
    }

    // Sem produto configurado: adiciona como item independente
    const item: CartItemData = {
      category: "Acessórios",
      sku: product.codigo ?? product.sku ?? `AC${product.id}`,
      description: descricao,
      photoUrl: product.fotoUrl ?? "",
      qty: 1,
      unitPrice: precoVenda,
      totalPrice: precoVenda,
      priceFromApi: false,
      power: "",
      cct: "",
      orderSummary: `${descricao}${product.dimensao ? ` (${product.dimensao})` : ""}`,
      quoteSummary: `${descricao}${product.dimensao ? ` (${product.dimensao})` : ""}`,
      corPeca: "",
      itemNote: product.familia ?? undefined,
      itemEmPlanta: globalItemEmPlanta,
    };
    if (appendToQuoteId) {
      handleAddItemOrToQuote(item);
    } else {
      const itemWithFloor: CartItemData = {
        ...item,
        ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}),
        ...(globalAmbiente ? { ambiente: globalAmbiente } : {}),
      };
      addItem(itemWithFloor);
      if (precoVenda > 0) {
        toast.success(`"${descricao}" adicionado com preço R$ ${precoVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`);
      } else {
        toast.success(`"${descricao}" adicionado! Defina o preço no carrinho.`);
      }
    }
    setAcSelectedId(null);
  }, [acSelectedId, acessoriosProducts, addItem, appendToQuoteId, handleAddItemOrToQuote, dlResult, spotResult, arandelaResult, panelResult, lbResult, bgResult, rvSelectedSku, productCategory, setPendingAccessories, globalItemEmPlanta]);

  const uploadSpecialPhotoMutation = trpc.upload.specialItemPhoto.useMutation({
    onSuccess: (data) => {
      setSpPhotoUrl(data.url);
      toast.success("Foto enviada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao enviar foto. Tente novamente.");
    },
    onSettled: () => setSpIsUploading(false),
  });

  const handleSpPhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Foto muito grande. Máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setSpPhotoPreview(dataUrl);
      // Extrair base64 puro (sem prefixo data:...;base64,)
      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";
      setSpIsUploading(true);
      uploadSpecialPhotoMutation.mutate({ base64, mimeType, fileName: file.name });
    };
    reader.readAsDataURL(file);
  }, [uploadSpecialPhotoMutation]);

  const handleAddSpecialItem = useCallback(() => {
    if (!spDescription.trim()) {
      toast.error("Informe a descrição do item especial.");
      return;
    }
    // Aviso não-bloqueante quando não há foto
    if (!spPhotoUrl) {
      toast("Item adicionado sem foto. Você pode adicionar a foto depois editando o item no carrinho.", {
        icon: "📷",
        duration: 5000,
      });
    }
    const rawPrice = parseFloat(spUnitPrice.replace(",", ".")) || 0;
    const lengthMeters = parseFloat(spLength.replace(",", ".")) || 1;
    // No modo "por metro", o unitPrice é o preço por metro; o total = preço/m × comprimento
    const unitPrice = spPriceMode === "meter" ? rawPrice * lengthMeters : rawPrice;
    const item: CartItemData = {
      category: "Item Especial",
      sku: "ESPECIAL",
      description: spDescription.trim(),
      qty: 1,
      unitPrice,
      totalPrice: unitPrice,
      photoUrl: spPhotoUrl || "",
      isSpecialItem: true,
      specialDescription: spDescription.trim(),
      specialDimensions: spDimensions.trim() || undefined,
      specialPower: spPower.trim() || undefined,
      specialDim: spDim.trim() || undefined,
      specialVoltage: spVoltage.trim() || undefined,
      specialColor: spColor.trim() || undefined,
      specialColorTemp: spColorTemp.trim() || undefined,
      specialUnitPrice: unitPrice || undefined,
      specialPhotoUrl: spPhotoUrl || undefined,
      specialInternalNotes: spInternalNotes.trim() || undefined,
      itemEmPlanta: globalItemEmPlanta,
    };
    if (appendToQuoteId) {
      handleAddItemOrToQuote(item);
    } else {
      // Item Especial vai direto ao carrinho — cor já está no formulário, não precisa do seletor de cor
      const effectiveQty = globalQty > 0 ? globalQty : 1;
      const finalItem: CartItemData = {
        ...item,
        qty: effectiveQty,
        totalPrice: unitPrice * effectiveQty,
        itemEmPlanta: globalItemEmPlanta,
        ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}),
        ...(globalAmbiente ? { ambiente: globalAmbiente } : {}),
      };
      const itemWithAcc: CartItemData = pendingAccessories.length > 0
        ? { ...finalItem, accessories: [...pendingAccessories] }
        : finalItem;
      if (pendingAccessories.length > 0) setPendingAccessories([]);
      addItem(itemWithAcc);
      setGlobalItemEmPlanta("");
      setGlobalQty(1);
    }
  }, [spDescription, spDimensions, spPower, spDim, spVoltage, spColor, spColorTemp, spUnitPrice, spPhotoUrl, spInternalNotes, appendToQuoteId, handleAddItemOrToQuote, globalItemEmPlanta, globalQty, pendingAccessories, addItem]);

  const handleAddService = useCallback(() => {
    if (!svDescription.trim()) {
      toast.error("Informe a descrição do serviço.");
      return;
    }
    const qty = parseInt(svQty) || 1;
    const unitPrice = parseFloat(svUnitPrice.replace(",", ".")) || 0;
    const item: CartItemData = {
      category: "Serviços",
      sku: "SERVICO",
      description: svDescription.trim(),
      qty,
      unitPrice,
      totalPrice: unitPrice * qty,
      photoUrl: null,
      itemNote: svNotes.trim() || undefined,
    };
    handleAddItemOrToQuote(item);
    setSvDescription("");
    setSvQty("1");
    setSvUnitPrice("");
    setSvNotes("");
    toast.success("Serviço adicionado ao carrinho!");
  }, [svDescription, svQty, svUnitPrice, svNotes, handleAddItemOrToQuote]);

  // Catálogo ativo de LED BAR (API ou fallback estático))
  const activeLedBarCatalog = useMemo(() => {
    const apiLedBars = adaptedCatalogs?.ledBars;
    return apiLedBars && apiLedBars.length > 0 ? apiLedBars : LED_BAR_CATALOG;
  }, [adaptedCatalogs]);

  // Famílias LED BAR disponíveis
  const lbFamilias = useMemo(() =>
    Array.from(new Set(activeLedBarCatalog.map(p => p.familia))).sort(),
    [activeLedBarCatalog]
  );

  // Famílias que não têm seleção de difusor (MILANO, MEIA LUA — difusor fixo NF)
  const lbIsNoDifusorFamily = useMemo(() =>
    lbFamilia ? /^(MILANO|MEIA LUA|PERFIL FLEXIVEL|LED BAR WW|FLOOR)/i.test(lbFamilia) : false,
    [lbFamilia]
  );

  // Produto LED BAR selecionado (potência + difusor + instalação para Perfil Flexível)
  const lbIsPerfilFlexivel = useMemo(() =>
    lbFamilia ? /^PERFIL FLEXIVEL/i.test(lbFamilia) : false,
    [lbFamilia]
  );
  const lbSelectedProduct = useMemo<LedBarProduct | null>(() => {
    if (!lbFamilia || !lbPotencia) return null;
    // Perfil Flexível requer seleção de instalação antes de selecionar produto
    if (lbIsPerfilFlexivel && !lbInstalacao) return null;
    // Para famílias sem difusor (NF), usa difusor NF diretamente
    const difusorEfetivo = lbIsNoDifusorFamily ? "NF" : lbDifusor;
    if (!difusorEfetivo) return null;
    return activeLedBarCatalog.find(
      p => p.familia === lbFamilia && p.potencia === lbPotencia && p.difusor === difusorEfetivo
        && (!lbIsPerfilFlexivel || p.instalacao === lbInstalacao)
    ) ?? null;
  }, [lbFamilia, lbPotencia, lbDifusor, lbIsNoDifusorFamily, lbInstalacao, lbIsPerfilFlexivel, activeLedBarCatalog]);

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

  // Limite máximo por trecho segundo a família selecionada
  const lbMaxLengthMm = useMemo(() =>
    lbFamilia && /^PERFIL FLEXIVEL/i.test(lbFamilia)
      ? PERFIL_FLEXIVEL_MAX_LENGTH_MM
      : LED_BAR_MAX_LENGTH_MM,
    [lbFamilia]
  );

  // Requer cortes obrigatórios (comprimento > limite da família)
  const lbRequiresCuts = lbComprimentoNum > lbMaxLengthMm;

  // Comprimento por trecho com os cortes atuais
  const lbNCortesNum = Math.max(1, parseInt(lbNCortes) || 1);
  const lbTrechoMm = lbComprimentoNum > 0 ? Math.ceil(lbComprimentoNum / lbNCortesNum) : 0;
  // Trecho excede o limite mesmo com cortes definidos
  const lbTrechoExcede = lbTrechoMm > lbMaxLengthMm;
  // Quantidade mínima de cortes para que nenhum trecho ultrapasse o limite
  const lbMinCortesNecessarios = lbComprimentoNum > 0 ? Math.ceil(lbComprimentoNum / lbMaxLengthMm) : 1;

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
      toast.error(lbIsNoDifusorFamily ? "Selecione família e potência." : "Selecione família, potência e difusor.");
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
      maxLengthMm: lbMaxLengthMm,
    });
    if (res.errors.length > 0) {
      toast.error(res.errors[0]);
      return;
    }
    setLbResult(res);
  }, [lbSelectedProduct, lbComprimentoNum, lbRequiresCuts, lbNCortes, lbControle, lbVoltage, lbCCT]);
  // Catálogo ativo de BAGEO (API ou fallback estático)
  const activeBageoCatalog = useMemo(() => {
    const apiBageos = adaptedCatalogs?.bageos;
    return apiBageos && apiBageos.length > 0 ? apiBageos : BAGEO_CATALOG;
  }, [adaptedCatalogs]);
  // Instalações disponíveis no catálogo BAGEO
  const bgInstalacoes = useMemo(() => getBageoAvailableInstalacoes(activeBageoCatalog), [activeBageoCatalog]);
  // Produtos BAGEO filtrados pela instalação selecionada
  const bgProductsByInstalacao = useMemo(() => {
    if (!bgInstalacao) return [];
    return getBageoProductsByInstalacao(activeBageoCatalog, bgInstalacao);
  }, [bgInstalacao, activeBageoCatalog]);
  // Controles disponíveis para o produto selecionado
  const bgControles = useMemo(() => {
    if (!bgProduct) return ["ON/OFF 220V", "ON/OFF Bivolt", "DIM 1-10V", "DIM DALI"] as BageoControle[];
    return getBageoAvailableControles(bgProduct);
  }, [bgProduct]);
  // CCTs disponíveis para o produto selecionado
  const bgAvailableCCTs = useMemo(() => {
    return bgProduct?.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
  }, [bgProduct]);
  // Reset controle quando muda produto
  useEffect(() => {
    if (!bgControles.includes(bgControle)) {
      setBgControle(bgControles[0] ?? "ON/OFF 220V");
    }
  }, [bgControles, bgControle]);
  // Reset CCT quando muda produto
  useEffect(() => {
    if (!bgAvailableCCTs.includes(bgCCT)) {
      setBgCCT(bgAvailableCCTs[0] ?? "3000K");
    }
  }, [bgAvailableCCTs, bgCCT]);
  const handleCalculateBageo = useCallback(() => {
    if (!bgProduct) {
      toast.error("Selecione o produto BAGEO.");
      return;
    }
    const comprMm = parseInt(bgComprimento);
    if (isNaN(comprMm) || comprMm < 100) {
      toast.error("Informe um comprimento válido (mínimo 100mm).");
      return;
    }
    const res = calculateBageo(activeBageoCatalog, {
      product: bgProduct,
      controle: bgControle,
      cct: bgCCT,
      comprimento: comprMm,
    });
    if (!res) {
      toast.error("Não foi possível calcular. Verifique as opções selecionadas.");
      return;
    }
    setBgResult(res);
  }, [bgProduct, activeBageoCatalog, bgControle, bgCCT, bgComprimento]);

  // Catalógo ativo de BAGEO fixo (API ou vazio)
  const activeBageoFixoCatalog = useMemo(() => {
    return adaptedCatalogs?.bageosFixos ?? [];
  }, [adaptedCatalogs]);
  // Instalações disponíveis para BAGEO fixo
  const bfInstalacoes = useMemo(() => {
    const set = new Set(activeBageoFixoCatalog.map(p => p.instalacao ?? ""));
    return Array.from(set).filter(Boolean);
  }, [activeBageoFixoCatalog]);
  // Famílias de BAGEO fixo filtradas pela instalação selecionada
  const bfFamilias = useMemo(() => {
    if (!bfInstalacao) return [];
    const set = new Set(
      activeBageoFixoCatalog
        .filter(p => p.instalacao === bfInstalacao)
        .map(p => p.familia)
    );
    return Array.from(set).filter(Boolean) as string[];
  }, [bfInstalacao, activeBageoFixoCatalog]);
  // Produtos BAGEO fixo filtrados pela instalação e família selecionadas
  const bfProductsByFamilia = useMemo(() => {
    if (!bfInstalacao || !bfFamilia) return [];
    return activeBageoFixoCatalog
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.instalacao === bfInstalacao && p.familia === bfFamilia);
  }, [bfInstalacao, bfFamilia, activeBageoFixoCatalog]);
  // Handler de cálculo para BAGEO fixo (igual a Downlights)
  const handleCalculateBageoFixo = useCallback(() => {
    if (!bfProductKey) {
      toast.error("Selecione o produto BAGEO.");
      return;
    }
    const [bfSku, ...bfNameParts] = bfProductKey.split("::");
    const bfName = bfNameParts.join("::");
    const bfSelProd = activeBageoFixoCatalog.find(p => p.sku === bfSku && p.name === bfName);
    if (!bfSelProd) {
      toast.error("Produto BAGEO não encontrado.");
      return;
    }
    const res = calculateDownlight({ productSku: bfSelProd.sku ?? "", productName: bfSelProd.name, cct: bfCCT ?? "3000K", controle: (bfControle ?? "On/Off") as ControleType, tensao: (bfVoltage ?? "Bivolt") as "220V" | "Bivolt" }, activeBageoFixoCatalog);
    if (!res) {
      toast.error("Não foi possível calcular. Verifique as opções selecionadas.");
      return;
    }
    setBfResult(res);
  }, [bfProductKey, activeBageoFixoCatalog, bfCCT, bfControle, bfVoltage]);

  // ─── Busca rápida ────────────────────────────────────────────────────────────────────────────
  const searchCatalogs: ProductSearchCatalogs = useMemo(() => ({
    profiles: activeProfileCatalog,
    ledBars: activeLedBarCatalog,
    bageos: activeBageoCatalog,
    downlights: activeDlCatalog,
    paineis: activePanelCatalog,
    spots: activeSpotCatalog,
    arandelas: activeArandelaCatalog,
    revenda: revendaProducts,
    acessorios: acessoriosProducts,
  }), [activeProfileCatalog, activeLedBarCatalog, activeBageoCatalog, activeDlCatalog, activePanelCatalog, activeSpotCatalog, activeArandelaCatalog, revendaProducts, acessoriosProducts]);

  const handleSearchSelect = useCallback((suggestion: SearchSuggestion) => {
    const cat = suggestion.category;
    if (cat === "Perfis") {
      setProductCategory("Perfis");
      setBgMode(false);
      setBfInstalacao(null); setBfFamilia(null); setBfProductKey(null); setBfResult(null);
      setLbFamilia(null);
      setProfileName(suggestion.familia);
      // Pré-selecionar instalação se houver apenas uma opção para este perfil
      const installTypes = activeGetInstallTypesForProfile(suggestion.familia);
      if (installTypes.length === 1) {
        setInstallType(installTypes[0] as InstallType);
      } else if (suggestion.instalacao) {
        setInstallType(suggestion.instalacao as InstallType);
      } else {
        setInstallType("");
      }
    } else if (cat === "LED BAR") {
      setProductCategory("Perfis");
      setBgMode(false);
      setBfInstalacao(null); setBfFamilia(null); setBfProductKey(null); setBfResult(null);
      setLbFamilia(suggestion.familia);
      setProfileName("");
    } else if (cat === "BAGEO") {
      setProductCategory("Perfis");
      setBgMode("sinuosa");
      setLbFamilia(null);
      setProfileName("");
      // Pré-selecionar produto BAGEO pelo código
      if (suggestion.code) {
        const bgProd = activeBageoCatalog.find(p => p.sku === suggestion.code || p.familia === suggestion.familia);
        if (bgProd) {
          setBgInstalacao(bgProd.instalacao);
          setBgProduct(bgProd);
        }
      }
    } else if (cat === "Downlights") {
      setProductCategory("Downlights");
      // Pré-selecionar instalação e produto
      const dlProd = activeDlCatalog.find(p => p.sku === suggestion.code || p.familia === suggestion.familia);
      if (dlProd) {
        setDlInstalacao(dlProd.instalacao);
        setDlFamilia(dlProd.familia);
        const key = `${dlProd.sku ?? ""}::${dlProd.name}`;
        setDlProductKey(key);
        const availCCTs = dlProd.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
        setDlCCT(availCCTs[0] ?? "3000K");
      } else {
        setDlInstalacao(suggestion.instalacao ?? null);
        setDlFamilia(suggestion.familia);
        setDlProductKey(null);
      }
      setDlVoltage(null);
      setDlResult(null);
    } else if (cat === "Painéis") {
      setProductCategory("Painéis");
      const panelProd = activePanelCatalog.find(p => p.sku === suggestion.code || p.familia === suggestion.familia);
      if (panelProd) {
        setPanelInstalacao(panelProd.instalacao);
        setPanelFamilia(panelProd.familia);
        const key = `${panelProd.sku ?? ""}::${panelProd.name}`;
        setPanelProductKey(key);
        const availCCTs = panelProd.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
        setPanelCCT(availCCTs[0] ?? "3000K");
      } else {
        setPanelInstalacao(suggestion.instalacao ?? null);
        setPanelFamilia(suggestion.familia);
        setPanelProductKey(null);
      }
      setPanelVoltage(null);
      setPanelResult(null);
    } else if (cat === "Spots") {
      setProductCategory("Spots");
      const spotProd = activeSpotCatalog.find(p => p.sku === suggestion.code || p.familia === suggestion.familia);
      if (spotProd) {
        setSpotInstalacao(spotProd.instalacao);
        setSpotFamilia(spotProd.familia);
        const key = `${spotProd.sku ?? ""}::${spotProd.name}`;
        setSpotProductKey(key);
        const availCCTs = spotProd.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
        setSpotCCT(availCCTs[0] ?? "3000K");
      } else {
        setSpotInstalacao(suggestion.instalacao ?? null);
        setSpotFamilia(suggestion.familia);
        setSpotProductKey(null);
      }
      setSpotVoltage(null);
      setSpotResult(null);
    } else if (cat === "Arandelas") {
      setProductCategory("Arandelas");
      const arandelaProd = activeArandelaCatalog.find(p => p.sku === suggestion.code || p.familia === suggestion.familia);
      if (arandelaProd) {
        setArandelaInstalacao(arandelaProd.instalacao);
        setArandelaFamilia(arandelaProd.familia);
        const key = `${arandelaProd.sku ?? ""}::${arandelaProd.name}`;
        setArandelaProductKey(key);
        const availCCTs = arandelaProd.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
        setArandelaCCT(availCCTs[0] ?? "3000K");
      } else {
        setArandelaInstalacao(suggestion.instalacao ?? null);
        setArandelaFamilia(suggestion.familia);
        setArandelaProductKey(null);
      }
      setArandelaVoltage(null);
      setArandelaResult(null);
    } else if (cat === "Revenda") {
      setProductCategory("Revenda");
      if (suggestion.code) {
        setRvSelectedSku(suggestion.code);
      }
    } else if (cat === "Acessórios") {
      setProductCategory("Acessórios");
      const found = acessoriosProducts.find(
        (p) => (p.codigo ?? p.sku) === suggestion.code
      );
      if (found) {
        setAcSelectedId(found.id);
      }
    }
    // Scroll suave até o configurador
    setTimeout(() => {
      document.getElementById("configurador-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [activeGetInstallTypesForProfile, activeBageoCatalog, activeDlCatalog, activePanelCatalog, activeSpotCatalog, activeArandelaCatalog, acessoriosProducts]);

  // Listas derivadas para filtros de Downlights (usando catálogo dinâmico da API ou fallback estático)
  // Detecta se um produto tem formato R ou Q no nome
  const dlShapeFilter = useCallback((name: string, shape: 'R' | 'Q') => {
    const upper = name.toUpperCase();
    if (shape === 'Q') return /\bQ[A-Z]?\b/.test(upper);
    if (shape === 'R') return /\bR[A-Z]?\b/.test(upper);
    return true;
  }, []);
  const dlInstalacoes = useMemo(() => Array.from(new Set(activeDlCatalog.map(p => p.instalacao))).sort(), [activeDlCatalog]);
  const dlFamilias = useMemo(() =>
    dlInstalacao ? Array.from(new Set(activeDlCatalog.filter(p => p.instalacao === dlInstalacao).map(p => p.familia))).sort() : [],
    [dlInstalacao, activeDlCatalog]
  );
  // Verifica se a família atual tem produtos com ambos os formatos R e Q
  const dlFamiliaHasFormats = useMemo(() => {
    if (!dlInstalacao || !dlFamilia) return false;
    const prods = activeDlCatalog.filter(p => p.instalacao === dlInstalacao && p.familia === dlFamilia);
    const hasR = prods.some(p => dlShapeFilter(p.name, 'R'));
    const hasQ = prods.some(p => dlShapeFilter(p.name, 'Q'));
    return hasR && hasQ;
  }, [dlInstalacao, dlFamilia, activeDlCatalog, dlShapeFilter]);
  const dlProdutosFiltrados = useMemo(() => {
    if (!dlInstalacao || !dlFamilia) return [];
    const base = activeDlCatalog
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.instalacao === dlInstalacao && p.familia === dlFamilia);
    // Só aplica filtro de formato se a família tem formatos E o usuário selecionou um
    if (dlFamiliaHasFormats && dlShape) {
      return base.filter(({ p }) => dlShapeFilter(p.name, dlShape));
    }
    return base;
  }, [dlInstalacao, dlFamilia, activeDlCatalog, dlFamiliaHasFormats, dlShape, dlShapeFilter]);
  // dlCatalogFiltered mantido por compatibilidade (não usado no render, mas pode ser referenciado)
  const dlCatalogFiltered = activeDlCatalog;
  // Listas derivadas para filtros de Área Externa
  const aeInstalacoes = useMemo(() => Array.from(new Set(activeAreaExternaCatalog.map(p => p.instalacao))).sort(), [activeAreaExternaCatalog]);
  const aeFamilias = useMemo(() =>
    aeInstalacao ? Array.from(new Set(activeAreaExternaCatalog.filter(p => p.instalacao === aeInstalacao).map(p => p.familia))).sort() : [],
    [aeInstalacao, activeAreaExternaCatalog]
  );
  const aeProdutosFiltrados = useMemo(() =>
    aeInstalacao && aeFamilia
      ? activeAreaExternaCatalog.map((p, i) => ({ p, i })).filter(({ p }) => p.instalacao === aeInstalacao && p.familia === aeFamilia)
      : [],
    [aeInstalacao, aeFamilia, activeAreaExternaCatalog]
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
  // Formato de perfil (reto, L, quadrado, retangular)
  const [profileShape, setProfileShape] = useState<ProfileShape>("STRAIGHT");
  // Medidas para formatos EM L
  const [shapeWidth, setShapeWidth] = useState<string>("2000");
  const [shapeHeight, setShapeHeight] = useState<string>("1200");
  const [shapeSide, setShapeSide] = useState<string>("1200");
  const [shapeSideH, setShapeSideH] = useState<string>("2000");
  const [shapeSideV, setShapeSideV] = useState<string>("1200");
  const [shapeResult, setShapeResult] = useState<ShapeResult | null>(null);
  // Result state
  const [result, setResult] = useState<CompositionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ── Produto configurado (habilita botão Incluir Acessório) ───────
  // Verdadeiro quando há um resultado calculado em qualquer categoria,
  // ou quando um produto de Revenda/Acessório/Item Especial está selecionado.
  const hasResult = !!(result || shapeResult || dlResult || aeResult || panelResult || spotResult || arandelaResult || lbResult || bgResult || bfResult || rvSelectedSku || acSelectedId || czSelectedSku || productCategory === "Item Especial");
  // ── Dados derivados ──────────────────────────────────────────────
  // Usa funções do catálogo ativo (API ou estático)
  const profileNames = activeGetProfileNames();
  // Tipos de instalação disponíveis para o perfil selecionado
  const availableInstallTypes = profileName ? activeGetInstallTypesForProfile(profileName) : [];
  // Variante selecionada
  const selectedVariant = (profileName && installType)
    ? activeGetVariant(profileName, installType as InstallType) ?? null
    : null;

  // Auto-selecionar a primeira CCT disponível quando a variante muda
  useEffect(() => {
    if (!selectedVariant) return;
    const stripMethod = selectedVariant.stripMethod ?? "STRIPFLEX";
    const isStripline = stripMethod === "STRIPLINE";
    const hasCCT = (cctVal: string) => {
      if (cctVal === "A definir") return true;
      const key = `ledModule${isStripline ? "Stripline" : "Stripflex"}${cctVal.replace("K", "")}` as keyof typeof selectedVariant;
      const val = selectedVariant[key];
      return typeof val === "string" && val.trim().length > 0;
    };
    const cctValues = ["2700K", "3000K", "4000K", "5000K"] as CCT[];
    if (!hasCCT(cct)) {
      const firstAvailable = cctValues.find(hasCCT);
      if (firstAvailable) setCct(firstAvailable);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariant?.code]);

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
    setProfileShape("STRAIGHT");
    setShapeResult(null);
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
      ledModuleStripflex: selectedVariant?.ledModuleStripflex ?? null,
      ledModuleStripline: selectedVariant?.ledModuleStripline ?? null,
      ledModuleStripflex2700: selectedVariant?.ledModuleStripflex2700 ?? null,
      ledModuleStripflex3000: selectedVariant?.ledModuleStripflex3000 ?? null,
      ledModuleStripflex4000: selectedVariant?.ledModuleStripflex4000 ?? null,
      ledModuleStripflex5000: selectedVariant?.ledModuleStripflex5000 ?? null,
      ledModuleStripline2700: selectedVariant?.ledModuleStripline2700 ?? null,
      ledModuleStripline3000: selectedVariant?.ledModuleStripline3000 ?? null,
      ledModuleStripline4000: selectedVariant?.ledModuleStripline4000 ?? null,
      ledModuleStripline5000: selectedVariant?.ledModuleStripline5000 ?? null,
      ledModuleStripflexEq2700: selectedVariant?.ledModuleStripflexEq2700 ?? null,
      ledModuleStripflexEq3000: selectedVariant?.ledModuleStripflexEq3000 ?? null,
      ledModuleStripflexEq4000: selectedVariant?.ledModuleStripflexEq4000 ?? null,
      ledModuleStripflexEq5000: selectedVariant?.ledModuleStripflexEq5000 ?? null,
      ledModuleStriplineEq2700: selectedVariant?.ledModuleStriplineEq2700 ?? null,
      ledModuleStriplineEq3000: selectedVariant?.ledModuleStriplineEq3000 ?? null,
      ledModuleStriplineEq4000: selectedVariant?.ledModuleStriplineEq4000 ?? null,
      ledModuleStriplineEq5000: selectedVariant?.ledModuleStriplineEq5000 ?? null,
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
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
              <img src="/manus-storage/alfalux-icon-192_36cf164c.png" alt="Alfalux" className="w-8 h-8 object-cover" />
            </div>
            <div>
              <h1 className="text-base font-bold font-display text-sidebar-foreground leading-none">
                Sistema Luna
              </h1>
              <p className="text-xs text-sidebar-foreground/60 leading-none mt-0.5">
                Alfalux Iluminação
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-sidebar-foreground/50 font-mono">
              v{__APP_VERSION__} · {Object.keys(activeProfileCatalog).length} variantes
              {profileCatalogIsFromApi && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  online
                </span>
              )}
            </span>
            <Link href="/carrinho">
              <Button
                variant="ghost"
                size="icon"
                title="Carrinho de orçamento"
                className="relative text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Button>
            </Link>
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
        {/* ── Banner: Modo Adicionar ao Orçamento ──────────────────────────── */}
        {appendToQuoteId && (
          <div className="mb-6 rounded-xl border border-blue-500/40 bg-blue-500/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Modo: Adicionar Itens ao Orçamento #{appendToQuoteId}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure o produto e clique em <strong>"Enviar ao Orçamento"</strong>. O item será salvo imediatamente ao orçamento.
                {appendItemsMutation.isPending && (
                  <span className="ml-2 inline-flex items-center gap-1 text-blue-400 font-semibold">
                    · Salvando...
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 bg-transparent"
                onClick={() => navigate(`/orcamentos/${appendToQuoteId}`)}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao Orçamento
              </Button>
            </div>
          </div>
        )}
        {/* ── Busca rápida de produtos ────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="max-w-xl">
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">Busca rápida de produto</p>
            <ProductSearch catalogs={searchCatalogs} onSelect={handleSearchSelect} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-8 items-start">
          {/* ── Painel de Configuração ──────────────────────────────────────────────────── */}
          <div className="space-y-4" id="configurador-panel">
            <div>
              <h2 className="text-xl font-bold font-display text-foreground">Configuração</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Preencha os parâmetros para calcular a composição ideal.
              </p>
            </div>    <Card className="shadow-sm">
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
                          // Reset GLOW
                          setGlowMode(false); setGlowProductKey(null); setGlowVoltage(null); setGlowResult(null);
                          // Reset Decorativas
                          setDecFamilia(null); setDecProductKey(null); setDecCCT("3000K"); setDecVoltage("Bivolt");
                          // Reset Balizadores
                          setBalFamilia(null); setBalProductKey(null); setBalCCT("3000K");
                          // Reset Acessórios
                          setAcSubcat(''); setAcFamilia(''); setAcSearch(''); setAcSelectedId(null);
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

                {/* ── Faixa horizontal: Customizados ── */}
                <div>
                  <button
                    onClick={() => {
                      setProductCategory(productCategory === "Customizados" ? "Perfis" : "Customizados");
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                      productCategory === "Customizados"
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500 shadow-sm ring-1 ring-purple-500/30"
                        : "bg-background text-foreground border-border hover:border-purple-400/60 hover:bg-purple-50/50 dark:hover:bg-purple-900/10"
                    }`}
                  >
                    <Package2 className={`w-5 h-5 shrink-0 ${
                      productCategory === "Customizados" ? "text-purple-500" : "text-muted-foreground"
                    }`} />
                    <div className="flex-1 text-left">
                      <span className="font-semibold">Customizados</span>
                      <span className="ml-2 text-xs text-muted-foreground font-normal">Produtos não-catálogo para clientes específicos</span>
                    </div>
                    {customizadosProducts.length > 0 && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                        {customizadosProducts.length} produto{customizadosProducts.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {customizadosProducts.length === 0 && !customizadosQuery.isLoading && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                        Indisponível
                      </span>
                    )}
                    <span className={`text-muted-foreground transition-transform ${
                      productCategory === "Customizados" ? "rotate-90" : ""
                    }`}>›</span>
                  </button>
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
                      {Object.keys(activeProfileCatalog).length} variantes • Dados online
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
                    value={bgMode === "sinuosa" ? "__BAGEO_SINUOSA__" : bgMode === "fixo" ? "__BAGEO_FIXO__" : glowMode ? "__GLOW__" : tubeLightMode ? "__TUBE_LIGHT__" : lbFamilia ? `__LEDBAR__${lbFamilia}` : profileName}
                    onValueChange={(v) => {
                      if (v === "__BAGEO_SINUOSA__") {
                        setBgMode("sinuosa");
                        setBgInstalacao(null); setBgProduct(null); setBgResult(null);
                        setBfInstalacao(null); setBfFamilia(null); setBfProductKey(null); setBfResult(null);
                        setLbFamilia(null); setLbPotencia(null); setLbDifusor(null); setLbResult(null);
                        setGlowMode(false); setGlowProductKey(null); setGlowVoltage(null); setGlowResult(null);
                        setProfileName(""); setInstallType(""); setResult(null); setError(null);
                      } else if (v === "__BAGEO_FIXO__") {
                        setBgMode("fixo");
                        setBgInstalacao(null); setBgProduct(null); setBgResult(null);
                        setBfInstalacao(null); setBfFamilia(null); setBfProductKey(null); setBfResult(null);
                        setLbFamilia(null); setLbPotencia(null); setLbDifusor(null); setLbResult(null);
                        setGlowMode(false); setGlowProductKey(null); setGlowVoltage(null); setGlowResult(null);
                        setProfileName(""); setInstallType(""); setResult(null); setError(null);
                      } else if (v === "__GLOW__") {
                        setGlowMode(true);
                        setGlowProductKey(null); setGlowVoltage(null); setGlowResult(null);
                        setTubeLightMode(false); setTubeLightProductKey(null); setTubeLightVoltage(null); setTubeLightResult(null);
                        setBgMode(false); setBgInstalacao(null); setBgProduct(null); setBgResult(null);
                        setBfInstalacao(null); setBfFamilia(null); setBfProductKey(null); setBfResult(null);
                        setLbFamilia(null); setLbPotencia(null); setLbDifusor(null); setLbResult(null);
                        setProfileName(""); setInstallType(""); setResult(null); setError(null);
                      } else if (v === "__TUBE_LIGHT__") {
                        setTubeLightMode(true);
                        setTubeLightProductKey(null); setTubeLightVoltage(null); setTubeLightResult(null);
                        setGlowMode(false); setGlowProductKey(null); setGlowVoltage(null); setGlowResult(null);
                        setBgMode(false); setBgInstalacao(null); setBgProduct(null); setBgResult(null);
                        setBfInstalacao(null); setBfFamilia(null); setBfProductKey(null); setBfResult(null);
                        setLbFamilia(null); setLbPotencia(null); setLbDifusor(null); setLbResult(null);
                        setProfileName(""); setInstallType(""); setResult(null); setError(null);
                      } else if (v.startsWith("__LEDBAR__")) {
                        const fam = v.replace("__LEDBAR__", "");
                        setLbFamilia(fam);
                        setLbInstalacao(null);
                        setLbPotencia(null);
                        setLbDifusor(null);
                        setLbResult(null);
                        setBgMode(false); setBgInstalacao(null); setBgProduct(null); setBgResult(null);
                        setBfInstalacao(null); setBfFamilia(null); setBfProductKey(null); setBfResult(null);
                        setGlowMode(false); setGlowProductKey(null); setGlowVoltage(null); setGlowResult(null);
                        setProfileName("");
                        setInstallType("");
                        setResult(null);
                        setError(null);
                      } else {
                        handleProfileChange(v);
                        setLbFamilia(null);
                        setLbResult(null);
                        setBgMode(false); setBgInstalacao(null); setBgProduct(null); setBgResult(null);
                        setBfInstalacao(null); setBfFamilia(null); setBfProductKey(null); setBfResult(null);
                        setGlowMode(false); setGlowProductKey(null); setGlowVoltage(null); setGlowResult(null);
                        setTubeLightMode(false); setTubeLightProductKey(null); setTubeLightVoltage(null); setTubeLightResult(null);
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
                      {lbFamilias.filter(f => /^LED BAR/i.test(f)).length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">LED BAR</div>
                          {lbFamilias.filter(f => /^LED BAR/i.test(f)).map((fam) => (
                            <SelectItem key={`__LEDBAR__${fam}`} value={`__LEDBAR__${fam}`}>{fam}</SelectItem>
                          ))}
                        </>
                      )}
                      {lbFamilias.filter(f => /^(MILANO|MEIA LUA)/i.test(f)).length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">MILANO / MEIA LUA</div>
                          {lbFamilias.filter(f => /^(MILANO|MEIA LUA)/i.test(f)).map((fam) => (
                            <SelectItem key={`__LEDBAR__${fam}`} value={`__LEDBAR__${fam}`}>{fam}</SelectItem>
                          ))}
                        </>
                      )}
                      {lbFamilias.filter(f => /^PERFIL FLEXIVEL/i.test(f)).length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">PERFIL FLEXÍVEL</div>
                          {lbFamilias.filter(f => /^PERFIL FLEXIVEL/i.test(f)).map((fam) => (
                            <SelectItem key={`__LEDBAR__${fam}`} value={`__LEDBAR__${fam}`}>{fam}</SelectItem>
                          ))}
                        </>
                      )}
                      {activeBageoCatalog.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">BAGEO</div>
                          <SelectItem value="__BAGEO_FIXO__">BAGEO</SelectItem>
                          <SelectItem value="__BAGEO_SINUOSA__">BAGEO Sinuosa</SelectItem>
                        </>
                      )}
                      {activeGlowCatalog.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">GLOW</div>
                          <SelectItem value="__GLOW__">GLOW</SelectItem>
                        </>
                      )}
                      {activeTubeLightCatalog.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">TUBE LIGHT</div>
                          <SelectItem value="__TUBE_LIGHT__">TUBE LIGHT</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>                 {/* ── Fluxo BAGEO fixo (tamanhos fixos) ────────────────────────────────────────────────────────────────────────────────── */}
                {bgMode === "fixo" && (
                  <div className="space-y-4">
                    {/* Tipo de Instalação */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de Instalação</Label>
                      <Select
                        value={bfInstalacao ?? ""}
                        onValueChange={(v) => { setBfInstalacao(v); setBfFamilia(null); setBfProductKey(null); setBfVoltage(null); setBfResult(null); }}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione o tipo de instalação..." />
                        </SelectTrigger>
                        <SelectContent>
                          {bfInstalacoes.map((inst) => (
                            <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Família */}
                    {bfInstalacao && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Família</Label>
                        <Select
                          value={bfFamilia ?? ""}
                          onValueChange={(v) => { setBfFamilia(v); setBfProductKey(null); setBfVoltage(null); setBfResult(null); }}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione a família..." />
                          </SelectTrigger>
                          <SelectContent>
                            {bfFamilias.map((fam) => (
                              <SelectItem key={fam} value={fam}>{fam}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Produto */}
                    {bfFamilia && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</Label>
                        <Select
                          value={bfProductKey ?? ""}
                          onValueChange={(v) => {
                            setBfProductKey(v);
                            setBfVoltage(null);
                            setBfResult(null);
                            const [s, ...np] = v.split('::');
                            const newProd = activeBageoFixoCatalog.find(p => p.sku === s && p.name === np.join('::'));
                            const availCCTs = newProd?.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
                            if (!availCCTs.includes(bfCCT)) setBfCCT(availCCTs[0] ?? "3000K");
                          }}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione o produto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {bfProductsByFamilia.map(({ p }, idx) => {
                              const key = `${p.sku ?? ""}::${p.name}`;
                              return <SelectItem key={`${key}-${idx}`} value={key}>{p.name}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Controle */}
                    {bfProductKey !== null && (() => {
                      const [_bfSku, ..._bfNP] = (bfProductKey ?? '::').split('::');
                      const bfSelProdCtrl = activeBageoFixoCatalog.find(p => p.sku === _bfSku && p.name === _bfNP.join('::'));
                      const hasDim110v = bfSelProdCtrl?.driverDim110v != null;
                      const hasDimDali = bfSelProdCtrl?.driverDimDali != null;
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
                                  onClick={() => { if (!isAvailable) return; setBfControle(ctrl); setBfResult(null); }}
                                  title={!isAvailable ? "Driver não cadastrado para este produto" : undefined}
                                  className={[
                                    "flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                                    bfControle === ctrl && isAvailable
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
                      );
                    })()}
                    {/* Tensão */}
                    {bfProductKey !== null && (() => {
                      const [_bfVSku, ..._bfVNP] = (bfProductKey ?? '::').split('::');
                      const bfSelProdV = activeBageoFixoCatalog.find(p => p.sku === _bfVSku && p.name === _bfVNP.join('::'));
                      const bfDimDrv = bfControle === 'DIM DALI' ? bfSelProdV?.driverDimDali : bfControle === 'DIM 1-10V' ? bfSelProdV?.driverDim110v : null;
                      const bfDimBivolt = bfDimDrv != null && /bivolt/i.test(bfDimDrv.model);
                      const hasBivoltBf = bfControle !== 'ON/OFF' ? bfDimBivolt : (bfSelProdV?.driverBivolt != null);
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tensão</Label>
                          <div className="flex gap-2">
                            {(["220V", "Bivolt"] as ("220V" | "Bivolt")[]).map((v) => {
                              const disabled = v === "Bivolt" && !hasBivoltBf;
                              return (
                                <button
                                  key={v}
                                  disabled={disabled}
                                  onClick={() => { setBfVoltage(v); setBfResult(null); }}
                                  className={[
                                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                                    bfVoltage === v && !disabled
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
                      );
                    })()}
                    {/* CCT */}
                    {bfProductKey !== null && (() => {
                      const bfSelProd = activeBageoFixoCatalog.find(p => { const [s, ...np] = (bfProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); });
                      const bfAvailCCTs = bfSelProd?.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                          <select
                            value={bfCCT}
                            onChange={(e) => { setBfCCT(e.target.value); setBfResult(null); }}
                            className="h-9 rounded-md border border-border bg-background text-foreground text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                          >
                            {[...bfAvailCCTs, "A definir"].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                    {/* Botão Calcular */}
                    {bfProductKey !== null && (
                    <Button
                      variant="default"
                      className="w-full h-12 text-base font-semibold"
                      onClick={handleCalculateBageoFixo}
                      disabled={!bfProductKey}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Calcular BAGEO
                    </Button>
                    )}
                  </div>
                )}
                {/* ── Fluxo BAGEO Sinuosa ── */}
                {bgMode === "sinuosa" && (<div className="space-y-4">
                  {/* Instalação — sempre visível após BAGEO ser selecionado */}
                  <div>
                    <FieldLabel>Instalação</FieldLabel>
                    <Select
                      value={bgInstalacao ?? ""}
                      onValueChange={(v) => {
                        setBgInstalacao(v as BageoInstalacao);
                        setBgProduct(null);
                        setBgResult(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de instalação..." />
                      </SelectTrigger>
                      <SelectContent>
                        {bgInstalacoes.map((inst) => (
                          <SelectItem key={inst} value={inst}>
                            {inst.charAt(0) + inst.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Modelo — só após instalação selecionada */}
                  {bgInstalacao && (
                  <div>
                    <FieldLabel>Modelo</FieldLabel>
                    <Select
                      value={bgProduct ? `${bgProduct.sku}__${bgProduct.aplicacao}` : ""}
                      onValueChange={(v) => {
                        const [sku, ap] = v.split("__");
                        const found = bgProductsByInstalacao.find(p => p.sku === sku && p.aplicacao === ap);
                        setBgProduct(found ?? null);
                        setBgResult(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o modelo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {bgProductsByInstalacao.map((p, i) => (
                          <SelectItem key={`${p.sku}__${p.aplicacao}__${i}`} value={`${p.sku}__${p.aplicacao}`}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  )}
                  {/* Comprimento */}
                  {bgInstalacao && (
                  <div>
                    <FieldLabel>Comprimento (mm)</FieldLabel>
                    <input
                      type="number"
                      min={100}
                      step={100}
                      value={bgComprimento}
                      onChange={(e) => { setBgComprimento(e.target.value); setBgResult(null); }}
                      placeholder="Ex: 2500"
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    {bgComprimento && parseInt(bgComprimento) >= 100 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(parseInt(bgComprimento) / 1000).toFixed(3).replace(".", ",")} m
                      </p>
                    )}
                  </div>
                  )}
                  {/* Controle — grid 2×2 para caber na caixa */}
                  {bgInstalacao && (
                  <div>
                    <FieldLabel>Controle</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {bgControles.map((ctrl) => (
                        <button
                          key={ctrl}
                          onClick={() => { setBgControle(ctrl); setBgResult(null); }}
                          className={`px-3 py-2 rounded-md text-sm font-medium border transition-all text-center ${
                            bgControle === ctrl
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          {ctrl}
                        </button>
                      ))}
                    </div>
                  </div>
                  )}
                  {/* CCT */}
                  {bgInstalacao && (
                  <div>
                    <FieldLabel>CCT</FieldLabel>
                    <select
                      value={bgCCT}
                      onChange={(e) => { setBgCCT(e.target.value); setBgResult(null); }}
                      className="h-9 rounded-md border border-border bg-background text-foreground text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                    >
                      {[...bgAvailableCCTs, "A definir"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  )}
                  {/* Botão Calcular */}
                  {bgInstalacao && (
                  <Button
                    className="w-full h-12 text-base font-semibold"
                    onClick={handleCalculateBageo}
                    disabled={!bgProduct}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Calcular BAGEO
                  </Button>
                  )}
                </div>)}
                {/* ── Fluxo GLOW (produto fixo, sem seleção de tamanho pelo usuário) ── */}
                {activeGlowCatalog.length > 0 && glowMode && !bgMode && !lbFamilia && !profileName && (
                  <div className="space-y-4">
                    {/* Produto GLOW */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</Label>
                      <Select
                        value={glowProductKey ?? ""}
                        onValueChange={(v) => {
                          setGlowProductKey(v);
                          setGlowVoltage(null);
                          setGlowResult(null);
                          const [s, ...np] = v.split('::');
                          const prod = activeGlowCatalog.find(p => p.sku === s && p.name === np.join('::'));
                          const availCCTs = prod?.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
                          if (!availCCTs.includes(glowCCT)) setGlowCCT(availCCTs[0] ?? "3000K");
                        }}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione o produto GLOW..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activeGlowCatalog.map((p, idx) => {
                            const key = `${p.sku ?? ""}::${p.name}`;
                            return <SelectItem key={`${key}-${idx}`} value={key}>{p.name}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Tensão */}
                    {glowProductKey !== null && (() => {
                      const [_gSku, ..._gNP] = (glowProductKey ?? '::').split('::');
                      const gSelProd = activeGlowCatalog.find(p => p.sku === _gSku && p.name === _gNP.join('::'));
                      const hasBivolt = gSelProd?.driverBivolt != null;
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tensão</Label>
                          <div className="flex gap-2">
                            {(["220V", "Bivolt"] as ("220V" | "Bivolt")[]).map((v) => {
                              const disabled = v === "Bivolt" && !hasBivolt;
                              return (
                                <button
                                  key={v}
                                  disabled={disabled}
                                  onClick={() => { setGlowVoltage(v); setGlowResult(null); }}
                                  className={[
                                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                                    glowVoltage === v && !disabled
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
                      );
                    })()}
                    {/* CCT */}
                    {glowProductKey !== null && (() => {
                      const [_gSku2, ..._gNP2] = (glowProductKey ?? '::').split('::');
                      const gSelProd2 = activeGlowCatalog.find(p => p.sku === _gSku2 && p.name === _gNP2.join('::'));
                      const gAvailCCTs = gSelProd2?.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                          <select
                            value={glowCCT}
                            onChange={(e) => { setGlowCCT(e.target.value); setGlowResult(null); }}
                            className="h-9 rounded-md border border-border bg-background text-foreground text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                          >
                            {[...gAvailCCTs, "A definir"].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                    {/* Botão Calcular GLOW */}
                    {glowProductKey !== null && (
                      <Button
                        variant="default"
                        className="w-full h-12 text-base font-semibold"
                        disabled={!glowProductKey || !glowVoltage}
                        onClick={() => {
                          if (!glowProductKey || !glowVoltage) { toast.error("Selecione o produto e a tensão."); return; }
                          const [gSku, ...gNP] = glowProductKey.split('::');
                          const gName = gNP.join('::');
                          const gProd = activeGlowCatalog.find(p => p.sku === gSku && p.name === gName);
                          if (!gProd) { toast.error("Produto GLOW não encontrado."); return; }
                          const res = calculateDownlight({ productSku: gProd.sku ?? "", productName: gProd.name, cct: glowCCT, controle: "ON/OFF", tensao: glowVoltage }, activeGlowCatalog);
                          if (!res) { toast.error("Não foi possível calcular. Verifique as opções."); return; }
                          setGlowResult(res);
                        }}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Calcular GLOW
                      </Button>
                    )}
                  </div>
                )}
                {/* ── Fluxo TUBE LIGHT (produto fixo, sem composição) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */}
                {activeTubeLightCatalog.length > 0 && tubeLightMode && !bgMode && !lbFamilia && !profileName && !glowMode && (
                  <div className="space-y-4">
                    {/* Produto TUBE LIGHT */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</Label>
                      <Select
                        value={tubeLightProductKey ?? ""}
                        onValueChange={(v) => {
                          setTubeLightProductKey(v);
                          setTubeLightVoltage(null);
                          setTubeLightResult(null);
                          const [s, ...np] = v.split('::');
                          const prod = activeTubeLightCatalog.find(p => p.sku === s && p.name === np.join('::'));
                          const availCCTs = prod?.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
                          if (!availCCTs.includes(tubeLightCCT)) setTubeLightCCT(availCCTs[0] ?? "3000K");
                        }}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione o produto TUBE LIGHT..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activeTubeLightCatalog.map((p, idx) => {
                            const key = `${p.sku ?? ""}::${p.name}`;
                            return <SelectItem key={`${key}-${idx}`} value={key}>{p.name}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Tensão */}
                    {tubeLightProductKey !== null && (() => {
                      const [_tSku, ..._tNP] = (tubeLightProductKey ?? '::').split('::');
                      const tSelProd = activeTubeLightCatalog.find(p => p.sku === _tSku && p.name === _tNP.join('::'));
                      const has220 = tSelProd?.driver220 != null;
                      const hasBivolt = tSelProd?.driverBivolt != null;
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tensão</Label>
                          <div className="flex gap-2">
                            {(["220V", "Bivolt"] as ("220V" | "Bivolt")[]).map((v) => {
                              const disabled = (v === "220V" && !has220) || (v === "Bivolt" && !hasBivolt);
                              return (
                                <button
                                  key={v}
                                  disabled={disabled}
                                  onClick={() => { if (!disabled) { setTubeLightVoltage(v); setTubeLightResult(null); } }}
                                  className={[
                                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                                    tubeLightVoltage === v && !disabled
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
                      );
                    })()}
                    {/* CCT */}
                    {tubeLightProductKey !== null && (() => {
                      const [_tSku2, ..._tNP2] = (tubeLightProductKey ?? '::').split('::');
                      const tSelProd2 = activeTubeLightCatalog.find(p => p.sku === _tSku2 && p.name === _tNP2.join('::'));
                      const tAvailCCTs = tSelProd2?.ccts ?? ["2700K", "3000K", "4000K", "5000K"];
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                          <select
                            value={tubeLightCCT}
                            onChange={(e) => { setTubeLightCCT(e.target.value); setTubeLightResult(null); }}
                            className="h-9 rounded-md border border-border bg-background text-foreground text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                          >
                            {[...tAvailCCTs, "A definir"].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                    {/* Botão Calcular TUBE LIGHT */}
                    {tubeLightProductKey !== null && (
                      <Button
                        variant="default"
                        className="w-full h-12 text-base font-semibold"
                        disabled={!tubeLightProductKey || !tubeLightVoltage}
                        onClick={() => {
                          if (!tubeLightProductKey || !tubeLightVoltage) { toast.error("Selecione o produto e a tensão."); return; }
                          const [tSku, ...tNP] = tubeLightProductKey.split('::');
                          const tName = tNP.join('::');
                          const tProd = activeTubeLightCatalog.find(p => p.sku === tSku && p.name === tName);
                          if (!tProd) { toast.error("Produto TUBE LIGHT não encontrado."); return; }
                          const res = calculateDownlight({ productSku: tProd.sku ?? "", productName: tProd.name, cct: tubeLightCCT, controle: "ON/OFF", tensao: tubeLightVoltage }, activeTubeLightCatalog);
                          if (!res) { toast.error("Não foi possível calcular. Verifique as opções."); return; }
                          setTubeLightResult(res);
                        }}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Calcular TUBE LIGHT
                      </Button>
                    )}
                  </div>
                )}
                {/* ── Fluxo LED BAR ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */}          {lbFamilia && (<div className="space-y-4">
                  {/* Instalação (somente para Perfil Flexível) */}
                  {lbIsPerfilFlexivel && (
                  <div>
                    <FieldLabel>Instalação</FieldLabel>
                    <div className="flex gap-2">
                      {(["EMBUTIR", "SOBREPOR"] as const).map((tipo) => (
                        <button
                          key={tipo}
                          onClick={() => { setLbInstalacao(tipo); setLbPotencia(null); setLbResult(null); }}
                          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-all ${
                            lbInstalacao === tipo
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          {tipo === "EMBUTIR" ? "Embutir" : "Sobrepor"}
                        </button>
                      ))}
                    </div>
                  </div>
                  )}
                  {/* Potência */}            <div>
                    <FieldLabel>Potência</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {LED_BAR_POTENCIA_OPTIONS.filter((opt) => {
                        // 20 W/m exclusivo da família MEIA LUA
                        if (opt.value === 20 && !(/^MEIA LUA/i.test(lbFamilia ?? ""))) return false;
                        // Para famílias sem difusor (PERFIL FLEXIVEL, MILANO, MEIA LUA),
                        // ocultar potências que não existem no catálogo para essa família
                        if (lbIsNoDifusorFamily) {
                          return activeLedBarCatalog.some(p =>
                            p.familia === lbFamilia && p.potencia === opt.value &&
                            (!lbIsPerfilFlexivel || !lbInstalacao || p.instalacao === lbInstalacao)
                          );
                        }
                        return true;
                      }).map((opt) => {
                        const exists = activeLedBarCatalog.some(
                          p => p.familia === lbFamilia && p.potencia === opt.value &&
                            (!lbIsPerfilFlexivel || !lbInstalacao || p.instalacao === lbInstalacao)
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

                  {/* Difusor — oculto para famílias NF (MILANO, MEIA LUA) */}
                  {lbPotencia && !lbIsNoDifusorFamily && (
                  <div>
                    <FieldLabel>Difusor</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {LED_BAR_DIFUSOR_OPTIONS.filter(o => o.value !== "NF").map((opt) => {
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
                  {(lbDifusor || (lbIsNoDifusorFamily && lbPotencia)) && (
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
                        Comprimento acima de {lbMaxLengthMm}mm — informe a quantidade de cortes.
                      </p>
                    )}
                  </div>
                  )}

                  {/* Quantidade de Trechos */}
                  {(lbDifusor || (lbIsNoDifusorFamily && lbPotencia)) && (
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
                          Com {lbNCortesNum} corte{lbNCortesNum !== 1 ? "s" : ""}, cada trecho ficaria com {lbTrechoMm}mm — acima do limite de {lbMaxLengthMm}mm.
                          {" "}Mínimo necessário: <strong>{lbMinCortesNecessarios} cortes</strong>.
                        </span>
                      </p>
                    )}
                  </div>
                  )}

                  {/* Controle */}
                  {(lbDifusor || (lbIsNoDifusorFamily && lbPotencia)) && (
                  <div>
                    <FieldLabel>Controle</FieldLabel>
                    <div className="flex gap-2">
                      {LED_BAR_CONTROLE_OPTIONS.map((opt) => {
                        const prod = lbSelectedProduct;
                        const isAvail = opt.value === "ON/OFF"
                          || (opt.value === "DIM 0-10V" && prod?.driverDim010v != null)
                          || (opt.value === "DIM DALI" && prod?.driverDimDali != null)
                          || (opt.value === "DIM TRIAC" && (prod?.driverDimTriac110v != null || prod?.driverDimTriac220v != null));
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              if (isAvail) {
                                setLbControle(opt.value as import("@/lib/ledBarCatalog").LedBarControle);
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
                      <p className="mt-1.5 text-xs text-muted-foreground">DIM 0-10V, DIM DALI e DIM TRIAC serão habilitados quando o produto estiver selecionado.</p>
                    )}
                  </div>
                  )}

                  {/* Tensão */}
                  {(lbDifusor || (lbIsNoDifusorFamily && lbPotencia)) && (
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
                        Fonte DIM 0-10V é monovolt 220V.
                      </p>
                    )}
                    {lbControle === "DIM TRIAC" && (
                      <p className="mt-1.5 text-xs text-amber-500 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Fonte DIM TRIAC é monovolt: escolha a tensão conforme disponível.
                      </p>
                    )}
                  </div>
                  )}

                  {/* CCT */}
                  {(lbDifusor || (lbIsNoDifusorFamily && lbPotencia)) && (
                  <div>
                    <FieldLabel>CCT</FieldLabel>
                    <select
                      value={lbCCT}
                      onChange={(e) => { setLbCCT(e.target.value); setLbResult(null); }}
                      className="h-9 rounded-md border border-border bg-background text-foreground text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                    >
                      {[...lbAvailableCCTs, "A definir"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  )}

                  {/* Botão Calcular */}
                  {(lbDifusor || (lbIsNoDifusorFamily && lbPotencia)) && (
                  <Button
                    className="w-full h-12 text-base font-semibold"
                    onClick={handleCalculateLedBar}
                    disabled={!lbSelectedProduct || lbComprimentoNum <= 0 || (lbRequiresCuts && lbNCortesNum < 2) || lbTrechoExcede}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Calcular {lbFamilia ?? "LED BAR"}
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

                {/* 2b. Formato do Perfil (apenas para perfis que suportam EM L) */}
                {selectedVariant && profileSupportsLShape(profileCode) && (
                  <div>
                    <FieldLabel>Formato</FieldLabel>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { value: "STRAIGHT" as ProfileShape, label: "Reto", icon: (
                          <svg viewBox="0 0 40 20" className="w-8 h-4" fill="none">
                            <rect x="2" y="8" width="36" height="4" rx="1" fill="currentColor" opacity="0.9" />
                          </svg>
                        )},
                        { value: "L_SHAPE" as ProfileShape, label: "Em L", icon: (
                          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                            <path d="M4 4 L4 20 L20 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                        )},
                        { value: "SQUARE" as ProfileShape, label: "Quadrado", icon: (
                          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                            <rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" strokeWidth="3" fill="none" />
                          </svg>
                        )},
                        { value: "RECTANGLE" as ProfileShape, label: "Retangular", icon: (
                          <svg viewBox="0 0 32 20" className="w-8 h-5" fill="none">
                            <rect x="2" y="2" width="28" height="16" rx="1" stroke="currentColor" strokeWidth="2.5" fill="none" />
                          </svg>
                        )},
                        { value: "U_SHAPE" as ProfileShape, label: "Em U", icon: (
                          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                            <path d="M4 4 L4 20 L20 20 L20 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                        )},
                      ]).map(({ value, label, icon }) => (
                        <button
                          key={value}
                          onClick={() => { setProfileShape(value); setShapeResult(null); setResult(null); setError(null); }}
                          className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-md text-xs font-medium border transition-all ${
                            profileShape === value
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          {icon}
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                    {profileShape !== "STRAIGHT" && (
                      <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Composição com cantos EM L + módulos retos
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
                      {(() => {
                        // Filtrar CCTs disponíveis com base nos módulos da variante selecionada
                        const stripMethod = selectedVariant.stripMethod ?? "STRIPFLEX";
                        const isStripline = stripMethod === "STRIPLINE";
                        const hasCCT = (cctVal: string) => {
                          if (cctVal === "A definir") return true;
                          const key = `ledModule${isStripline ? "Stripline" : "Stripflex"}${cctVal.replace("K", "")}` as keyof typeof selectedVariant;
                          const val = selectedVariant[key];
                          return typeof val === "string" && val.trim().length > 0;
                        };
                        const filteredCCTs = CCT_OPTIONS.filter((opt) => hasCCT(opt.value));
                        return (
                          <Select value={cct} onValueChange={(v) => setCct(v as CCT)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredCCTs.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}
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
                {/* 7. Comprimento Total / Dimensões */}
                {selectedVariant && profileShape === "STRAIGHT" && (
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
                {/* 7b. Dimensões para formato EM L */}
                {selectedVariant && profileShape === "L_SHAPE" && (
                  <div className="space-y-3">
                    <FieldLabel>Dimensões do L</FieldLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Lado Horizontal (mm)</p>
                        <div className="relative">
                          <input type="number" value={shapeSideH} onChange={(e) => { setShapeSideH(e.target.value); setShapeResult(null); }} min={100} max={20000} step={1}
                            className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="ex: 2000" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Lado Vertical (mm)</p>
                        <div className="relative">
                          <input type="number" value={shapeSideV} onChange={(e) => { setShapeSideV(e.target.value); setShapeResult(null); }} min={100} max={20000} step={1}
                            className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="ex: 1200" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* 7c. Dimensões para formato Quadrado */}
                {selectedVariant && profileShape === "SQUARE" && (
                  <div>
                    <FieldLabel>Lado do Quadrado (mm)</FieldLabel>
                    <div className="relative">
                      <input type="number" value={shapeSide} onChange={(e) => { setShapeSide(e.target.value); setShapeResult(null); }} min={100} max={20000} step={1}
                        className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="ex: 1200" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">4 lados iguais</p>
                  </div>
                )}
                {/* 7d. Dimensões para formato Retangular */}
                {selectedVariant && profileShape === "RECTANGLE" && (
                  <div className="space-y-3">
                    <FieldLabel>Dimensões do Retângulo</FieldLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Largura / Lado Longo (mm)</p>
                        <div className="relative">
                          <input type="number" value={shapeWidth} onChange={(e) => { setShapeWidth(e.target.value); setShapeResult(null); }} min={100} max={20000} step={1}
                            className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="ex: 2000" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Altura / Lado Curto (mm)</p>
                        <div className="relative">
                          <input type="number" value={shapeHeight} onChange={(e) => { setShapeHeight(e.target.value); setShapeResult(null); }} min={100} max={20000} step={1}
                            className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="ex: 1200" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* 7e. Dimensões para formato em U */}
                {selectedVariant && profileShape === "U_SHAPE" && (
                  <div className="space-y-3">
                    <FieldLabel>Dimensões do U</FieldLabel>
                    <p className="text-xs text-muted-foreground">2 cantos EM L + módulos retos nos 3 lados</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Base (largura) (mm)</p>
                        <div className="relative">
                          <input type="number" value={shapeWidth} onChange={(e) => { setShapeWidth(e.target.value); setShapeResult(null); }} min={100} max={20000} step={1}
                            className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="ex: 2000" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Profundidade (lados) (mm)</p>
                        <div className="relative">
                          <input type="number" value={shapeHeight} onChange={(e) => { setShapeHeight(e.target.value); setShapeResult(null); }} min={100} max={20000} step={1}
                            className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="ex: 1200" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">⬆ Base conecta os dois cantos. Profundidade = cada lado paralelo.</p>
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
                    {/* Ajustar para Medida Maior — apenas para retos */}
                    {profileShape === "STRAIGHT" && (
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
                    )}
                    {/* Otimizar com IFs Diferentes — apenas para retos */}
                    {profileShape === "STRAIGHT" && (
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
                    )}
                  </div>
                )}


                </React.Fragment>
                  )} {/* fim productCategory === Perfis */}
                    {/* ── Balizadores ───────────────────────────────────────────────────── */}
                {productCategory === "Balizadores" && (
                  <div className="space-y-4">
                    {/* Família */}
                    {(() => {
                      const balFamilias = Array.from(new Set(activeBalizadoresCatalog.map(p => p.familia))).sort();
                      return balFamilias.length > 0 ? (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Família</Label>
                          <Select
                            value={balFamilia ?? ""}
                            onValueChange={(v) => { setBalFamilia(v || null); setBalProductKey(null); }}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Selecione a família..." />
                            </SelectTrigger>
                            <SelectContent>
                              {balFamilias.map((fam) => (
                                <SelectItem key={fam} value={fam}>{fam}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : activeBalizadoresCatalog.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum produto Balizador encontrado na API.</p>
                      ) : null;
                    })()}
                    {/* Produto */}
                    {balFamilia && (() => {
                      const balProds = activeBalizadoresCatalog.filter(p => p.familia === balFamilia);
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</Label>
                          <Select
                            value={balProductKey ?? ""}
                            onValueChange={(v) => {
                              setBalProductKey(v);
                              const [s, ...np] = v.split('::');
                              const prod = activeBalizadoresCatalog.find(p => p.sku === s && p.name === np.join('::'));
                              const availCCTs = prod?.ccts ?? ["2700K", "3000K", "4000K"];
                              if (!availCCTs.includes(balCCT)) setBalCCT(availCCTs[0] ?? "3000K");
                            }}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Selecione o produto..." />
                            </SelectTrigger>
                            <SelectContent>
                              {balProds.map((p, idx) => {
                                const key = `${p.sku ?? ""}::${p.name}`;
                                return <SelectItem key={`${key}-${idx}`} value={key}>{p.name}</SelectItem>;
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })()}
                    {/* CCT */}
                    {balProductKey && (() => {
                      const [_bSku, ..._bNP] = (balProductKey ?? '::').split('::');
                      const bProd = activeBalizadoresCatalog.find(p => p.sku === _bSku && p.name === _bNP.join('::'));
                      const bAvailCCTs = bProd?.ccts ?? ["2700K", "3000K", "4000K"];
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                          <select
                            value={balCCT}
                            onChange={(e) => setBalCCT(e.target.value)}
                            className="h-9 rounded-md border border-border bg-background text-foreground text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                          >
                            {[...bAvailCCTs, "A definir"].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {/* ── Decorativas ───────────────────────────────────────────────────── */}
                {productCategory === "Decorativas" && (
                  <div className="space-y-4">
                    {/* Família */}
                    {(() => {
                      const decFamilias = Array.from(new Set(activeDecorativasCatalog.map(p => p.familia))).sort();
                      return decFamilias.length > 0 ? (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Família</Label>
                          <Select
                            value={decFamilia ?? ""}
                            onValueChange={(v) => { setDecFamilia(v || null); setDecProductKey(null); }}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Selecione a família..." />
                            </SelectTrigger>
                            <SelectContent>
                              {decFamilias.map((fam) => (
                                <SelectItem key={fam} value={fam}>{fam}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null;
                    })()}
                    {/* Produto */}
                    {decFamilia && (() => {
                      const decProds = activeDecorativasCatalog.filter(p => p.familia === decFamilia);
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</Label>
                          <Select
                            value={decProductKey ?? ""}
                            onValueChange={(v) => {
                              setDecProductKey(v);
                              const [s, ...np] = v.split('::');
                              const prod = activeDecorativasCatalog.find(p => p.sku === s && p.name === np.join('::'));
                              const availCCTs = prod?.ccts ?? ["2700K", "3000K", "4000K"];
                              if (!availCCTs.includes(decCCT)) setDecCCT(availCCTs[0] ?? "3000K");
                              // Auto-selecionar tensão com base no que está disponível
                              const hasBivolt = !!(prod?.driverBivolt?.model);
                              const has220 = !!(prod?.driver220?.model);
                              if (hasBivolt) setDecVoltage("Bivolt");
                              else if (has220) setDecVoltage("220V");
                            }}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Selecione o produto..." />
                            </SelectTrigger>
                            <SelectContent>
                              {decProds.map((p, idx) => {
                                const key = `${p.sku ?? ""}::${p.name}`;
                                return <SelectItem key={`${key}-${idx}`} value={key}>{p.name}</SelectItem>;
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })()}
                    {/* Tensão */}
                    {decProductKey && (() => {
                      const [_dSku2, ..._dNP2] = (decProductKey ?? '::').split('::');
                      const dProd2 = activeDecorativasCatalog.find(p => p.sku === _dSku2 && p.name === _dNP2.join('::'));
                      const has220 = !!(dProd2?.driver220?.model);
                      const hasBivolt = !!(dProd2?.driverBivolt?.model);
                      // Se só tem um tipo, selecionar automaticamente
                      const voltages: Array<"220V" | "Bivolt"> = ["220V", "Bivolt"];
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tensão</Label>
                          <div className="flex gap-2">
                            {voltages.map((v) => {
                              const disabled = v === "220V" ? !has220 : !hasBivolt;
                              return (
                                <button
                                  key={v}
                                  disabled={disabled}
                                  onClick={() => { if (!disabled) setDecVoltage(v); }}
                                  className={[
                                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                                    decVoltage === v && !disabled
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
                      );
                    })()}
                    {/* CCT */}
                    {decProductKey && (() => {
                      const [_dSku, ..._dNP] = (decProductKey ?? '::').split('::');
                      const dProd = activeDecorativasCatalog.find(p => p.sku === _dSku && p.name === _dNP.join('::'));
                      const dAvailCCTs = dProd?.ccts ?? ["2700K", "3000K", "4000K"];
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                          <select
                            value={decCCT}
                            onChange={(e) => setDecCCT(e.target.value)}
                            className="h-9 rounded-md border border-border bg-background text-foreground text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                          >
                            {[...dAvailCCTs, "A definir"].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {/* ── Downlights ───────────────────────────────────────────────────────── */}
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
                          {activeDlCatalog.length} produtos • Dados online
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
                        onValueChange={(v) => { setDlInstalacao(v); setDlFamilia(null); setDlShape(null); setDlProductKey(null); setDlVoltage(null); setDlResult(null); }}
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
                          onValueChange={(v) => { setDlFamilia(v); setDlShape(null); setDlProductKey(null); setDlVoltage(null); setDlResult(null); }}
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

                    {/* Seletor de Formato: Redondo / Quadrado — só aparece quando a família tem produtos com R/Q no nome */}
                    {dlFamilia && dlFamiliaHasFormats && (() => {
                      return (
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formato</Label>
                          <div className="grid grid-cols-2 gap-2 mt-1.5">
                            {([
                              { value: 'R' as const, label: 'Redondo', icon: (
                                <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" />
                                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
                                </svg>
                              )},
                              { value: 'Q' as const, label: 'Quadrado', icon: (
                                <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2.5" fill="none" />
                                  <rect x="8" y="8" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
                                </svg>
                              )},
                            ]).map(({ value, label, icon }) => (
                              <button
                                key={value}
                                onClick={() => {
                                  setDlShape(prev => prev === value ? null : value);
                                  setDlProductKey(null);
                                  setDlVoltage(null);
                                  setDlResult(null);
                                }}
                                className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-md text-xs font-medium border transition-all ${
                                  dlShape === value
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                                }`}
                              >
                                {icon}
                                <span>{label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Produto — aparece quando não há formatos (sem R/Q) OU quando formato já foi selecionado */}
                    {dlFamilia && (!dlFamiliaHasFormats || dlShape) && (() => {
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</Label>
                          <Select
                            value={dlProductKey ?? ""}
                            onValueChange={(v) => {
                              setDlProductKey(v);
                              setDlResult(null);
                              // Reset CCT para primeiro valor disponível do produto
                              const [s, ...np] = v.split('::');
                              const newProd = activeDlCatalog.find(p => p.sku === s && p.name === np.join('::'));
                              // Auto-selecionar tensão quando só há uma opção disponível
                              const newHas220Dl = newProd?.driver220 != null;
                              const newHasBivoltDl = newProd?.driverBivolt != null;
                              if (!newHas220Dl && newHasBivoltDl) setDlVoltage("Bivolt");
                              else if (newHas220Dl && !newHasBivoltDl) setDlVoltage("220V");
                              else setDlVoltage(null);
                              if (newProd?.isRgbw) { setDlCCT("RGBW"); }
                              else if (newProd?.isLamp) { /* sem CCT */ }
                              else {
                                const availCCTs = newProd?.ccts?.length ? newProd.ccts : ["2700K", "3000K", "4000K", "5000K"];
                                if (!availCCTs.includes(dlCCT)) setDlCCT(availCCTs[0] ?? "3000K");
                              }
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
                      );
                    })()}
                    {/* Controle */}
                    {dlProductKey !== null && (() => {
                      const [_dlCtrlSku, ..._dlCtrlNameParts] = (dlProductKey ?? '::').split('::');
                      const _dlCtrlName = _dlCtrlNameParts.join('::');
                      const dlSelProdCtrl = activeDlCatalog.find(p => p.sku === _dlCtrlSku && p.name === _dlCtrlName);
                      const hasDim110v = dlSelProdCtrl?.driverDim110v != null;
                      const hasDimDali = dlSelProdCtrl?.driverDimDali != null;
                      const hasDimTriac110v = (dlSelProdCtrl as any)?.driverDimTriac110v != null;
                      const hasDimTriac220v = (dlSelProdCtrl as any)?.driverDimTriac220v != null;
                      const allControles: ControleType[] = ["ON/OFF", "DIM 1-10V", "DIM DALI", ...(hasDimTriac110v ? ["DIM TRIAC 110V" as ControleType] : []), ...(hasDimTriac220v ? ["DIM TRIAC 220V" as ControleType] : [])];
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Controle</Label>
                          <div className="flex flex-wrap gap-2">
                            {allControles.map((ctrl) => {
                              const isAvailable = ctrl === "ON/OFF" || (ctrl === "DIM 1-10V" && hasDim110v) || (ctrl === "DIM DALI" && hasDimDali) || (ctrl === "DIM TRIAC 110V" && hasDimTriac110v) || (ctrl === "DIM TRIAC 220V" && hasDimTriac220v);
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
                                      const dimDrv = ctrl === 'DIM DALI' ? dlSelProdCtrl?.driverDimDali
                                        : ctrl === 'DIM 1-10V' ? dlSelProdCtrl?.driverDim110v
                                        : ctrl === 'DIM TRIAC 110V' ? (dlSelProdCtrl as any)?.driverDimTriac110v
                                        : (dlSelProdCtrl as any)?.driverDimTriac220v;
                                      const dimBivolt = dimDrv != null && /bivolt/i.test(dimDrv.model);
                                      if (!dimBivolt && dlVoltage === 'Bivolt') setDlVoltage('220V');
                                    }
                                  }}
                                  title={!isAvailable ? "Driver não cadastrado para este produto" : undefined}
                                  className={[
                                    "flex-1 min-w-[80px] py-2 rounded-lg text-xs font-medium border transition-all",
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
                          {!hasDim110v && !hasDimDali && !hasDimTriac110v && !hasDimTriac220v && (
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
                      const has220Dl = dlControle !== 'ON/OFF' ? (dlDimDrv != null && !/bivolt/i.test(dlDimDrv.model)) : (dlSelProdV?.driver220 != null);
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tensão</Label>
                          <div className="flex gap-2">
                            {(["220V", "Bivolt"] as ("220V" | "Bivolt")[]).map((v) => {
                              const disabled = (v === "Bivolt" && !hasBivoltDl) || (v === "220V" && !has220Dl);
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
                      // Produto com lâmpada: sem seleção de CCT
                      if (dlSelProd?.isLamp) return null;
                      // Produto RGBW: mostrar apenas opção RGBW
                      const dlAvailCCTs = dlSelProd?.isRgbw ? ["RGBW"] : (dlSelProd?.ccts?.length ? dlSelProd.ccts : ["2700K", "3000K", "4000K", "5000K"]);
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                          {dlSelProd?.isRgbw ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/40 text-sm font-medium text-foreground">
                              <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-red-400 via-green-400 to-blue-400" />
                              RGBW
                            </div>
                          ) : (
                            <select
                              value={dlCCT}
                              onChange={(e) => { setDlCCT(e.target.value); setDlResult(null); }}
                              className="h-9 rounded-md border border-border bg-background text-foreground text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                            >
                              {[...dlAvailCCTs, "A definir"].map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {/* ── Área Externa (PROOF) ────────────────────────────────────────────────────────────────────────── */}
                {productCategory === "Área Externa" && (
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
                          {activeAreaExternaCatalog.length} produtos • Dados online
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
                        value={aeInstalacao ?? ""}
                        onValueChange={(v) => { setAeInstalacao(v); setAeFamilia(null); setAeProductKey(null); setAeVoltage(null); setAeResult(null); }}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione o tipo de instalação..." />
                        </SelectTrigger>
                        <SelectContent>
                          {aeInstalacoes.map((inst) => (
                            <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Família */}
                    {aeInstalacao && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Família</Label>
                        <Select
                          value={aeFamilia ?? ""}
                          onValueChange={(v) => { setAeFamilia(v); setAeProductKey(null); setAeVoltage(null); setAeResult(null); }}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione a família..." />
                          </SelectTrigger>
                          <SelectContent>
                            {aeFamilias.map((fam) => (
                              <SelectItem key={fam} value={fam}>{fam}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Produto */}
                    {aeFamilia && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</Label>
                        <Select
                          value={aeProductKey ?? ""}
                          onValueChange={(v) => {
                            setAeProductKey(v);
                            setAeResult(null);
                            const [s, ...np] = v.split('::');
                            const newProd = activeAreaExternaCatalog.find(p => p.sku === s && p.name === np.join('::'));
                            // Auto-selecionar tensão quando só há uma opção disponível
                            const newHas220 = newProd?.driver220 != null;
                            const newHasBivolt = newProd?.driverBivolt != null;
                            if (!newHas220 && newHasBivolt) setAeVoltage("Bivolt");
                            else if (newHas220 && !newHasBivolt) setAeVoltage("220V");
                            else setAeVoltage(null);
                            if (newProd?.isRgbw) { setAeCCT("RGBW"); }
                            else if (newProd?.isLamp) { /* sem CCT */ }
                            else {
                              const availCCTs = newProd?.ccts?.length ? newProd.ccts : ["2700K", "3000K", "4000K", "5000K"];
                              if (!availCCTs.includes(aeCCT)) setAeCCT(availCCTs[0] ?? "3000K");
                            }
                          }}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione o produto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {aeProdutosFiltrados.map(({ p }, idx) => {
                              const key = `${p.sku ?? ""}::${p.name}`;
                              return <SelectItem key={`${key}-${idx}`} value={key}>{p.name}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Controle */}
                    {aeProductKey !== null && (() => {
                      const [_sku, ..._np] = (aeProductKey ?? '::').split('::');
                      const _name = _np.join('::');
                      const aeSelProd = activeAreaExternaCatalog.find(p => p.sku === _sku && p.name === _name);
                      const hasDim110v = aeSelProd?.driverDim110v != null;
                      const hasDimDali = aeSelProd?.driverDimDali != null;
                      const allControles: ControleType[] = ["ON/OFF", "DIM 1-10V", "DIM DALI"];
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Controle</Label>
                          <div className="flex flex-wrap gap-2">
                            {allControles.map((ctrl) => {
                              const isAvailable = ctrl === "ON/OFF" || (ctrl === "DIM 1-10V" && hasDim110v) || (ctrl === "DIM DALI" && hasDimDali);
                              return (
                                <button
                                  key={ctrl}
                                  disabled={!isAvailable}
                                  onClick={() => {
                                    if (!isAvailable) return;
                                    setAeControle(ctrl);
                                    setAeResult(null);
                                    if (ctrl !== 'ON/OFF') {
                                      const dimDrv = ctrl === 'DIM DALI' ? aeSelProd?.driverDimDali : aeSelProd?.driverDim110v;
                                      const dimBivolt = dimDrv != null && /bivolt/i.test(dimDrv.model);
                                      if (!dimBivolt && aeVoltage === 'Bivolt') setAeVoltage('220V');
                                    }
                                  }}
                                  title={!isAvailable ? "Driver não cadastrado para este produto" : undefined}
                                  className={[
                                    "flex-1 min-w-[80px] py-2 rounded-lg text-xs font-medium border transition-all",
                                    aeControle === ctrl && isAvailable
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
                      );
                    })()}
                    {/* Tensão */}
                    {aeProductKey !== null && (() => {
                      const [_sku, ..._np] = (aeProductKey ?? '::').split('::');
                      const _name = _np.join('::');
                      const aeSelProdV = activeAreaExternaCatalog.find(p => p.sku === _sku && p.name === _name);
                      const aeDimDrv = aeControle === 'DIM DALI' ? aeSelProdV?.driverDimDali : aeControle === 'DIM 1-10V' ? aeSelProdV?.driverDim110v : null;
                      const aeDimBivolt = aeDimDrv != null && /bivolt/i.test(aeDimDrv.model);
                      const hasBivoltAe = aeControle !== 'ON/OFF' ? aeDimBivolt : (aeSelProdV?.driverBivolt != null);
                      const has220Ae = aeControle !== 'ON/OFF' ? (aeDimDrv != null && !/bivolt/i.test(aeDimDrv.model)) : (aeSelProdV?.driver220 != null);
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tensão</Label>
                          <div className="flex gap-2">
                            {(["220V", "Bivolt"] as ("220V" | "Bivolt")[]).map((v) => {
                              const disabled = (v === "Bivolt" && !hasBivoltAe) || (v === "220V" && !has220Ae);
                              return (
                                <button
                                  key={v}
                                  disabled={disabled}
                                  onClick={() => { setAeVoltage(v); setAeResult(null); }}
                                  className={[
                                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                                    aeVoltage === v && !disabled
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
                      );
                    })()}
                    {/* CCT */}
                    {aeProductKey !== null && (() => {
                      const [_s, ..._np] = (aeProductKey ?? '::').split('::');
                      const aeSelProd = activeAreaExternaCatalog.find(p => p.sku === _s && p.name === _np.join('::'));
                      // Produto com lâmpada: sem seleção de CCT
                      if (aeSelProd?.isLamp) return null;
                      const aeAvailCCTs = aeSelProd?.isRgbw ? ["RGBW"] : (aeSelProd?.ccts?.length ? aeSelProd.ccts : ["2700K", "3000K", "4000K", "5000K"]);
                      return (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                          {aeSelProd?.isRgbw ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/40 text-sm font-medium text-foreground">
                              <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-red-400 via-green-400 to-blue-400" />
                              RGBW
                            </div>
                          ) : (
                          <select
                            value={aeCCT}
                            onChange={(e) => { setAeCCT(e.target.value); setAeResult(null); }}
                            className="h-9 rounded-md border border-border bg-background text-foreground text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                          >
                            {[...aeAvailCCTs, "A definir"].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── Painéis ────────────────────────────────────────────────────────────────────────────────────── */}
                {productCategory === "Painéis" && (() => {
                  const panelInstalacoes = Array.from(new Set(activePanelCatalog.map(p => p.instalacao))).sort();
                  const panelFamilias = panelInstalacao
                    ? Array.from(new Set(activePanelCatalog.filter(p => p.instalacao === panelInstalacao).map(p => p.familia))).sort()
                    : [];
                  const panelProdutos = panelInstalacao && panelFamilia
                    ? activePanelCatalog.map((p, i) => ({ p, i })).filter(({ p }) => p.instalacao === panelInstalacao && p.familia === panelFamilia && !(p.familia === 'SPACE' && p.name?.toUpperCase().includes('GENÉRICA')))
                    : [];
                  const isSpaceFamily = panelFamilia === 'SPACE';
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
                            {activePanelCatalog.length} produtos • Dados online
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
                              {isSpaceFamily && (
                                <SelectItem value="SPACE_CUSTOMIZADA">✦ SPACE Customizada</SelectItem>
                              )}
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
                          {(() => {
                              const [_pSku, ..._pNameParts] = (panelProductKey ?? '::').split('::'); const _pName = _pNameParts.join('::'); const selProd = panelProductKey !== null ? activePanelCatalog.find(p => p.sku === _pSku && p.name === _pName) : null;
                              const hasDimTriac110v = (selProd as any)?.driverDimTriac110v != null;
                              const hasDimTriac220v = (selProd as any)?.driverDimTriac220v != null;
                              const panelControles: ControleType[] = ["ON/OFF", "DIM 1-10V", "DIM DALI", ...(hasDimTriac110v ? ["DIM TRIAC 110V" as ControleType] : []), ...(hasDimTriac220v ? ["DIM TRIAC 220V" as ControleType] : [])];
                              return (
                                <div className="flex flex-wrap gap-2">
                                  {panelControles.map((ctrl) => {
                                    const isAvailable =
                                      ctrl === "ON/OFF" ||
                                      (ctrl === "DIM 1-10V" && selProd?.driverDim110v != null) ||
                                      (ctrl === "DIM DALI" && selProd?.driverDimDali != null) ||
                                      (ctrl === "DIM TRIAC 110V" && hasDimTriac110v) ||
                                      (ctrl === "DIM TRIAC 220V" && hasDimTriac220v);
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
                                              const dimDrv = ctrl === 'DIM DALI' ? selProd?.driverDimDali
                                                : ctrl === 'DIM 1-10V' ? selProd?.driverDim110v
                                                : ctrl === 'DIM TRIAC 110V' ? (selProd as any)?.driverDimTriac110v
                                                : (selProd as any)?.driverDimTriac220v;
                                              const dimBivolt = dimDrv != null && /bivolt/i.test(dimDrv.model);
                                              if (!dimBivolt) setPanelVoltage('220V');
                                            }
                                          }
                                        }}
                                        title={!isAvailable ? "Não disponível para este produto" : undefined}
                                        className={[
                                          "flex-1 min-w-[80px] py-2 rounded-lg text-xs font-medium border transition-all",
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
                              );
                            })()}
                        </div>
                      )}
                      {/* Tensão */}
                      {panelProductKey !== null && (() => {
                        const [_vSku, ..._vNameParts] = (panelProductKey ?? '::').split('::');
                        const _vName = _vNameParts.join('::');
                        const selProdV = activePanelCatalog.find(p => p.sku === _vSku && p.name === _vName);
                        // Driver DIM selecionado (DALI, 1-10V ou TRIAC)
                        const dimDriver = panelControle === 'DIM DALI' ? selProdV?.driverDimDali
                          : panelControle === 'DIM 1-10V' ? selProdV?.driverDim110v
                          : panelControle === 'DIM TRIAC 110V' ? (selProdV as any)?.driverDimTriac110v
                          : panelControle === 'DIM TRIAC 220V' ? (selProdV as any)?.driverDimTriac220v
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
                            <select
                              value={panelCCT}
                              onChange={(e) => { setPanelCCT(e.target.value); setPanelResult(null); }}
                              className="h-9 rounded-md border border-border bg-background text-foreground text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                            >
                              {[...panelAvailCCTs, "A definir"].map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}

                      {/* ── Configurador SPACE Genérico ─────────────────────────────────────── */}
                      {(() => {
                        // Detectar se o produto selecionado é SPACE Customizada ou genérico legado
                        const isSpaceCustomizada = panelProductKey === 'SPACE_CUSTOMIZADA';
                        const [_spSku, ..._spNP] = (panelProductKey ?? '::').split('::');
                        const _spProd = (!isSpaceCustomizada && panelProductKey) ? activePanelCatalog.find(p => p.sku === _spSku && p.name === _spNP.join('::')) : null;
                        const isSpaceGeneric = isSpaceCustomizada || (_spProd?.familia === 'SPACE' && _spProd?.name?.toUpperCase().includes('GENÉRICA'));
                        if (!isSpaceGeneric) return null;
                        return (
                          <div className="space-y-4 mt-2 p-3 rounded-lg border border-teal-500/30 bg-teal-50/20 dark:bg-teal-900/10">
                            <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide flex items-center gap-1.5">
                              <Grid2X2 className="w-3.5 h-3.5" />
                              Configurador SPACE — Dimensões Personalizadas
                            </p>
                            {/* Formato */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formato</Label>
                              <div className="flex gap-2">
                                {(["R", "Q", "Ret"] as SpaceFormat[]).map((fmt) => (
                                  <button
                                    key={fmt}
                                    onClick={() => { setSpaceFormat(fmt); setSpaceResult(null); }}
                                    className={[
                                      "flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                                      spaceFormat === fmt
                                        ? "bg-teal-600 text-white border-teal-600"
                                        : "bg-background text-foreground border-border hover:border-teal-500/50",
                                    ].join(" ")}
                                  >
                                    {SPACE_FORMAT_LABELS[fmt]}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {/* Dimensões */}
                            {spaceFormat === "R" ? (
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Diâmetro (mm)</Label>
                                <Input
                                  type="number"
                                  min={51}
                                  step={10}
                                  value={spaceDiametro}
                                  onChange={(e) => { setSpaceDiametro(e.target.value); setSpaceResult(null); }}
                                  className="h-10 max-w-xs"
                                  placeholder="Ex: 1000"
                                />
                                <p className="text-xs text-muted-foreground">Diâmetro externo do painel em milímetros (mín. 51mm)</p>
                              </div>
                            ) : spaceFormat === "Q" ? (
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lado (mm)</Label>
                                <Input
                                  type="number"
                                  min={51}
                                  step={10}
                                  value={spaceLargura}
                                  onChange={(e) => { setSpaceLargura(e.target.value); setSpaceComprimento(e.target.value); setSpaceResult(null); }}
                                  className="h-10 max-w-xs"
                                  placeholder="Ex: 1000"
                                />
                                <p className="text-xs text-muted-foreground">Lado do painel quadrado em milímetros (mín. 51mm)</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Largura (mm)</Label>
                                  <Input
                                    type="number"
                                    min={51}
                                    step={10}
                                    value={spaceLargura}
                                    onChange={(e) => { setSpaceLargura(e.target.value); setSpaceResult(null); }}
                                    className="h-10"
                                    placeholder="Ex: 600"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comprimento (mm)</Label>
                                  <Input
                                    type="number"
                                    min={51}
                                    step={10}
                                    value={spaceComprimento}
                                    onChange={(e) => { setSpaceComprimento(e.target.value); setSpaceResult(null); }}
                                    className="h-10"
                                    placeholder="Ex: 1200"
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground col-span-2">Dimensões externas do painel retangular em milímetros (mín. 51mm cada)</p>
                              </div>
                            )}
                            {/* Potência da fita */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Potência da Fita</Label>
                              <div className="flex gap-2">
                                {(["5W/m", "10W/m"] as SpacePotencia[]).map((pot) => (
                                  <button
                                    key={pot}
                                    onClick={() => { setSpacePotencia(pot); setSpaceResult(null); }}
                                    className={[
                                      "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                                      spacePotencia === pot
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-foreground border-border hover:border-primary/50",
                                    ].join(" ")}
                                  >
                                    {pot}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {/* CCT do SPACE genérico */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                              <select
                                value={spaceCCT}
                                onChange={(e) => { setSpaceCCT(e.target.value); setSpaceResult(null); }}
                                className="h-9 rounded-md border border-border bg-background text-foreground text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                              >
                                {(_spProd?.ccts?.length ? _spProd.ccts.map(c => String(c).endsWith('K') ? String(c) : `${c}K`) : ["2700K", "3000K", "4000K", "5000K"]).concat(["A definir"]).map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
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
                        {activeSpotCatalog.length} produtos • Dados online
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
                          setSpotResult(null);
                          // Reset CCT para primeiro valor disponível do produto
                          const [s, ...np] = v.split('::');
                          const newProd = activeSpotCatalog.find(p => p.sku === s && p.name === np.join('::'));
                          // Auto-selecionar tensão quando só há uma opção disponível
                          const newHas220Sp = newProd?.driver220 != null;
                          const newHasBivoltSp = newProd?.driverBivolt != null;
                          if (!newHas220Sp && newHasBivoltSp) setSpotVoltage("Bivolt");
                          else if (newHas220Sp && !newHasBivoltSp) setSpotVoltage("220V");
                          else setSpotVoltage(null);
                          if (newProd?.isRgbw) { setSpotCCT("RGBW"); }
                          else if (newProd?.isLamp) { /* sem CCT */ }
                          else {
                            const availCCTs = newProd?.ccts?.length ? newProd.ccts : ["2700K", "3000K", "4000K", "5000K"];
                            if (!availCCTs.includes(spotCCT)) setSpotCCT(availCCTs[0] ?? "3000K");
                          }
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
                          const [_sSku, ..._sNameParts] = (spotProductKey ?? '::').split('::'); const _sName = _sNameParts.join('::'); const _sProd = activeSpotCatalog.find(p => p.sku === _sSku && p.name === _sName); const hasBivolt = _sProd?.driverBivolt !== null; const has220Spot = _sProd?.driver220 !== null;
                          const disabled = (v === "Bivolt" && !hasBivolt) || (v === "220V" && !has220Spot);
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
                  {spotProductKey !== null && (() => {
                    const spotSelProd = activeSpotCatalog.find(p => { const [s, ...np] = (spotProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); });
                    // Produto com lâmpada: sem seleção de CCT
                    if (spotSelProd?.isLamp) return null;
                    // Produto RGBW: mostrar apenas opção RGBW
                    const spotAvailCCTs = spotSelProd?.isRgbw ? ["RGBW"] : (spotSelProd?.ccts?.length ? spotSelProd.ccts : ["2700K", "3000K", "4000K", "5000K"]);
                    return (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                        {spotSelProd?.isRgbw ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/40 text-sm font-medium text-foreground">
                            <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-red-400 via-green-400 to-blue-400" />
                            RGBW
                          </div>
                        ) : (
                          <select
                            value={spotCCT}
                            onChange={(e) => { setSpotCCT(e.target.value); setSpotResult(null); }}
                            className="h-9 rounded-md border border-border bg-background text-foreground text-sm px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                          >
                            {[...spotAvailCCTs, "A definir"].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })()}
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
                        {activeArandelaCatalog.length} produto{activeArandelaCatalog.length !== 1 ? "s" : ""} • Dados online
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
                            // Auto-selecionar tensão quando só há uma opção disponível
                            const newHas220Ar = newProd.driver220 != null;
                            const newHasBivoltAr = newProd.driverBivolt != null;
                            if (!newHas220Ar && newHasBivoltAr) setArandelaVoltage("Bivolt");
                            else if (newHas220Ar && !newHasBivoltAr) setArandelaVoltage("220V");
                            else setArandelaVoltage(null);
                            if (newProd.isRgbw) { setArandelaCCT("RGBW"); }
                            else if (!newProd.isLamp) {
                              const availCCTs = newProd.ccts?.length ? newProd.ccts : ["2700K", "3000K", "4000K", "5000K"];
                              const defaultCCT = availCCTs.includes("3000K") ? "3000K" : availCCTs[0];
                              setArandelaCCT(defaultCCT ?? "3000K");
                            }
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
                          const [_aSku, ..._aNameParts] = (arandelaProductKey ?? '::').split('::'); const _aName = _aNameParts.join('::'); const _aProd = activeArandelaCatalog.find(p => p.sku === _aSku && p.name === _aName); const hasBivolt = _aProd?.driverBivolt !== null; const has220Arandela = _aProd?.driver220 !== null;
                          const disabled = (v === "Bivolt" && !hasBivolt) || (v === "220V" && !has220Arandela);
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
                  {arandelaProductKey !== null && (() => {
                    const arandelaSelProd = activeArandelaCatalog.find(p => { const [s, ...np] = (arandelaProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); });
                    // Produto com lâmpada: sem seleção de CCT
                    if (arandelaSelProd?.isLamp) return null;
                    // Produto RGBW: mostrar apenas opção RGBW
                    const arandelaAvailCCTs = arandelaSelProd?.isRgbw ? ["RGBW"] : (arandelaSelProd?.ccts?.length ? arandelaSelProd.ccts : ["2700K", "3000K", "4000K", "5000K"]);
                    return (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CCT</Label>
                        {arandelaSelProd?.isRgbw ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/40 text-sm font-medium text-foreground">
                            <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-red-400 via-green-400 to-blue-400" />
                            RGBW
                          </div>
                        ) : (
                          <div className="flex gap-2 flex-wrap">
                            {arandelaAvailCCTs.map((c) => (
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
                        )}
                      </div>
                    );
                  })()}
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
                {arandelaProductKey !== null && !arandelaVoltage && (() => {
                  const arSelProdBtn = activeArandelaCatalog.find(p => { const [s, ...np] = (arandelaProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); });
                  if (arSelProdBtn?.isLamp) return null;
                  return (
                    <p className="text-xs text-amber-500 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Selecione a tensão antes de calcular.
                    </p>
                  );
                })()}
                <Button
                  disabled={arandelaProductKey === null || (() => {
                    const arSelProdBtn2 = activeArandelaCatalog.find(p => { const [s, ...np] = (arandelaProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); });
                    return !arSelProdBtn2?.isLamp && !arandelaVoltage;
                  })()}
                  onClick={() => {
                    if (arandelaProductKey === null) return;
                    const [arandelaSku, ...arandelaNameParts] = (arandelaProductKey ?? '::').split('::');
                    const arandelaName = arandelaNameParts.join('::');
                    const arSelProdBtn3 = activeArandelaCatalog.find(p => p.sku === arandelaSku && p.name === arandelaName);
                    const arTensaoToUse = (arSelProdBtn3?.isLamp ? "220V" : arandelaVoltage) as "220V" | "Bivolt";
                    if (!arTensaoToUse) return;
                    setArandelaResult(calculateArandela(activeArandelaCatalog, { productSku: arandelaSku, productName: arandelaName, tensao: arTensaoToUse, cct: arandelaCCT, controle: arandelaControle }));
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
                {spotProductKey !== null && !spotVoltage && (() => {
                  const spotSelProdBtn = activeSpotCatalog.find(p => { const [s, ...np] = (spotProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); });
                  if (spotSelProdBtn?.isLamp) return null;
                  return (
                    <p className="text-xs text-amber-500 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Selecione a tensão antes de calcular.
                    </p>
                  );
                })()}
                <Button
                  disabled={spotProductKey === null || (() => {
                    const spotSelProdBtn2 = activeSpotCatalog.find(p => { const [s, ...np] = (spotProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); });
                    return !spotSelProdBtn2?.isLamp && !spotVoltage;
                  })()}
                  onClick={() => {
                    if (spotProductKey === null) return;
                    const [spotSku, ...spotNameParts] = (spotProductKey ?? '::').split('::');
                    const spotName = spotNameParts.join('::');
                    const spotSelProdBtn3 = activeSpotCatalog.find(p => p.sku === spotSku && p.name === spotName);
                    const spotTensaoToUse = (spotSelProdBtn3?.isLamp ? "220V" : spotVoltage) as "220V" | "Bivolt";
                    if (!spotTensaoToUse) return;
                    setSpotResult(calculateSpot(activeSpotCatalog, { productSku: spotSku, productName: spotName, tensao: spotTensaoToUse, cct: spotCCT, controle: spotControle }));
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
            {productCategory === "Painéis" && (() => {
              // Detectar se o produto selecionado é SPACE Customizada ou genérico legado
              const _isSpaceCustomizadaBtn = panelProductKey === 'SPACE_CUSTOMIZADA';
              const [_btnSpSku, ..._btnSpNP] = (panelProductKey ?? '::').split('::');
              const _btnSpProd = (!_isSpaceCustomizadaBtn && panelProductKey) ? activePanelCatalog.find(p => p.sku === _btnSpSku && p.name === _btnSpNP.join('::')) : null;
              const _isSpaceGenericBtn = _isSpaceCustomizadaBtn || (_btnSpProd?.familia === 'SPACE' && _btnSpProd?.name?.toUpperCase().includes('GENÉRICA'));
              return (
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
                  {panelProductKey !== null && !_isSpaceGenericBtn && !panelVoltage && (
                    <p className="text-xs text-amber-500 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Selecione a tensão antes de calcular.
                    </p>
                  )}
                  {_isSpaceGenericBtn ? (
                    // Botão para SPACE genérico
                    <Button
                      disabled={panelProductKey === null}
                      onClick={() => {
                        if (!panelProductKey) return;
                        const diametro = parseInt(spaceDiametro) || 0;
                        const largura = parseInt(spaceLargura) || 0;
                        const comprimento = parseInt(spaceComprimento) || 0;
                        let result: SpaceCalculationResult;
                        if (spaceFormat === 'R') {
                          result = calculateSpaceR({ diametro });
                        } else {
                          result = calculateSpaceQ({ largura, comprimento: spaceFormat === 'Q' ? largura : comprimento });
                        }
                        setSpaceResult(result);
                        setPanelResult(null);
                        if (!result.valido) {
                          toast.error('Dimensões inválidas. Verifique os valores informados.');
                        }
                      }}
                      className="w-full h-12 text-base font-semibold font-display bg-teal-600 hover:bg-teal-700 text-white"
                      size="lg"
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      Calcular SPACE
                    </Button>
                  ) : (
                    // Botão para painel normal
                    <Button
                      disabled={panelProductKey === null || !panelVoltage}
                      onClick={() => {
                        if (panelProductKey === null || !panelVoltage) return;
                        const [panelSku, ...panelNameParts] = (panelProductKey ?? '::').split('::');
                        const panelName = panelNameParts.join('::');
                        const selPainel = activePanelCatalog.find(p => p.sku === panelSku && p.name === panelName);
                        if (!selPainel) return;
                        setSpaceResult(null);
                        setPanelResult(calculatePainel({ productSku: panelSku, productName: panelName, tensao: panelVoltage, cct: panelCCT, controle: panelControle }, activePanelCatalog));
                      }}
                      className="w-full h-12 text-base font-semibold font-display"
                      size="lg"
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      Calcular Painél
                    </Button>
                  )}
                </div>
              );
            })()}

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
                {dlProductKey !== null && !dlVoltage && (() => {
                  const dlSelProd2 = activeDlCatalog.find(p => { const [s, ...np] = (dlProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); });
                  if (dlSelProd2?.isLamp) return null;
                  return (
                    <p className="text-xs text-amber-500 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Selecione a tensão antes de calcular.
                    </p>
                  );
                })()}
                <Button
                  disabled={dlProductKey === null || (() => {
                    const dlSelProd3 = activeDlCatalog.find(p => { const [s, ...np] = (dlProductKey ?? '::').split('::'); return p.sku === s && p.name === np.join('::'); });
                    return !dlSelProd3?.isLamp && !dlVoltage;
                  })()}
                  onClick={() => {
                    if (dlProductKey === null) return;
                    const [dlSku, ...dlNameParts] = (dlProductKey ?? '::').split('::');
                    const dlName = dlNameParts.join('::');
                    const dlSelProd4 = activeDlCatalog.find(p => p.sku === dlSku && p.name === dlName);
                    const tensaoToUse = (dlSelProd4?.isLamp ? "220V" : dlVoltage) as "220V" | "Bivolt";
                    if (!tensaoToUse) return;
                    setDlResult(calculateDownlight({ productSku: dlSku, productName: dlName, tensao: tensaoToUse, cct: dlCCT, controle: dlControle }, activeDlCatalog));
                  }}
                  className="w-full h-12 text-base font-semibold font-display"
                  size="lg"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Calcular Downlight
                </Button>
              </div>
            )}

            {/* ── Botão Calcular Área Externa ── */}
            {productCategory === "Área Externa" && (
              <div className="space-y-2">
                {!aeInstalacao && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione o tipo de instalação antes de calcular.
                  </p>
                )}
                {aeInstalacao && !aeFamilia && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione a família antes de calcular.
                  </p>
                )}
                {aeFamilia && aeProductKey === null && (
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Selecione o produto antes de calcular.
                  </p>
                )}
                {aeProductKey !== null && !aeVoltage && (() => {
                  const [_aeSku2, ..._aeNP2] = (aeProductKey ?? '::').split('::');
                  const _aeProd2 = activeAreaExternaCatalog.find(p => p.sku === _aeSku2 && p.name === _aeNP2.join('::'));
                  if (_aeProd2?.isLamp) return null;
                  return (
                    <p className="text-xs text-amber-500 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Selecione a tensão antes de calcular.
                    </p>
                  );
                })()}
                <Button
                  disabled={aeProductKey === null || (() => {
                    const [_aeSku3, ..._aeNP3] = (aeProductKey ?? '::').split('::');
                    const _aeProd3 = activeAreaExternaCatalog.find(p => p.sku === _aeSku3 && p.name === _aeNP3.join('::'));
                    return !_aeProd3?.isLamp && !aeVoltage;
                  })()}
                  onClick={() => {
                    const [aeSku, ...aeNameParts] = (aeProductKey ?? '::').split('::');
                    const aeName = aeNameParts.join('::');
                    const _aeProdCalc = activeAreaExternaCatalog.find(p => p.sku === aeSku && p.name === aeName);
                    const tensaoToUse = _aeProdCalc?.isLamp ? "220V" : aeVoltage!;
                    if (aeProductKey === null || (!_aeProdCalc?.isLamp && !aeVoltage)) return;
                    setAeResult(calculateDownlight({ productSku: aeSku, productName: aeName, tensao: tensaoToUse, cct: aeCCT, controle: aeControle }, activeAreaExternaCatalog));
                  }}
                  className="w-full h-12 text-base font-semibold font-display"
                  size="lg"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Calcular Área Externa
                </Button>
              </div>
            )}

            {/* ── Formulário de Item Especial ── */}
            {productCategory === "Item Especial" && (
              <div className="space-y-4">
                {/* Descrição */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Descrição <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={spDescription}
                    onChange={(e) => setSpDescription(e.target.value)}
                    placeholder="Ex: Luminária linear pendente sob medida..."
                    className="h-10"
                  />
                </div>
                {/* Dimensões */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dimensões</Label>
                  <Input
                    value={spDimensions}
                    onChange={(e) => setSpDimensions(e.target.value)}
                    placeholder="Ex: 1200 x 80 x 50mm"
                    className="h-10"
                  />
                </div>
                {/* Potência / DIM / Tensão em linha */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Potência</Label>
                    <Input value={spPower} onChange={(e) => setSpPower(e.target.value)} placeholder="Ex: 36W" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">DIM</Label>
                    <Input value={spDim} onChange={(e) => setSpDim(e.target.value)} placeholder="Ex: 1-10V" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tensão</Label>
                    <Input value={spVoltage} onChange={(e) => setSpVoltage(e.target.value)} placeholder="Ex: 220V" className="h-10" />
                  </div>
                </div>

                {/* Cor */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cor / Acabamento</Label>
                  <Input
                    value={spColor}
                    onChange={(e) => setSpColor(e.target.value)}
                    placeholder="Ex: Branco Fosco, Preto Texturizado..."
                    className="h-10"
                  />
                </div>
                {/* Temperatura de Cor */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Temperatura de Cor</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {["", "2700K", "3000K", "3500K", "4000K", "5000K", "6500K"].map((ct) => (
                      <button
                        key={ct || "none"}
                        type="button"
                        onClick={() => setSpColorTemp(ct)}
                        className={[
                          "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                          spColorTemp === ct
                            ? "bg-amber-600 border-amber-600 text-white"
                            : "border-border bg-muted/20 text-muted-foreground hover:border-amber-500/50 hover:bg-amber-50/10",
                        ].join(" ")}
                      >
                        {ct || "N/A"}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Modo de preço: unitário ou por metro */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de Preço</Label>
                  <div className="flex gap-2">
                    {(["unit", "meter"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => { setSpPriceMode(mode); }}
                        className={[
                          "flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-all",
                          spPriceMode === mode
                            ? "bg-amber-600 border-amber-600 text-white shadow-sm"
                            : "bg-background text-foreground border-border hover:border-amber-500/50 hover:bg-muted/50",
                        ].join(" ")}
                      >
                        {mode === "unit" ? "Preço Unitário" : "Preço por Metro"}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Valor do preço */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {spPriceMode === "meter" ? "Preço por Metro (R$/m)" : "Valor Unitário (R$)"}
                  </Label>
                  <Input
                    value={spUnitPrice}
                    onChange={(e) => setSpUnitPrice(e.target.value)}
                    placeholder={spPriceMode === "meter" ? "Ex: 350,00" : "Ex: 1250,00"}
                    className="h-10"
                    inputMode="decimal"
                  />
                </div>
                {/* Comprimento (somente no modo por metro) */}
                {spPriceMode === "meter" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comprimento (metros)</Label>
                    <Input
                      value={spLength}
                      onChange={(e) => setSpLength(e.target.value)}
                      placeholder="Ex: 3,5"
                      className="h-10"
                      inputMode="decimal"
                    />
                    {spUnitPrice && spLength && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                        Total: R$ {((parseFloat(spUnitPrice.replace(",","."))||0) * (parseFloat(spLength.replace(",","."))||0)).toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </p>
                    )}
                  </div>
                )}
                {/* Foto */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Foto do Produto</Label>
                  <div className="flex gap-2">
                    <label
                      htmlFor="sp-photo-input"
                      className={[
                        "flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-dashed cursor-pointer text-xs font-medium transition-colors",
                        spIsUploading
                          ? "border-primary/50 bg-primary/5 text-primary cursor-wait"
                          : "border-border bg-muted/20 text-muted-foreground hover:border-primary/50 hover:bg-muted/40",
                      ].join(" ")}
                    >
                      {spIsUploading ? (
                        <><div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Enviando...</>
                      ) : (
                        <><Upload className="w-3.5 h-3.5" /> {spPhotoPreview ? "Trocar foto" : "Adicionar foto"}</>
                      )}
                    </label>
                    {spPhotoPreview && (
                      <button
                        onClick={() => { setSpPhotoPreview(""); setSpPhotoUrl(""); }}
                        className="h-10 w-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
                        title="Remover foto"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    id="sp-photo-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleSpPhotoChange}
                    disabled={spIsUploading}
                  />
                </div>
                {/* Observações Internas */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Observações Internas
                    <span className="ml-1.5 text-[10px] font-normal text-muted-foreground/60 normal-case">(não aparece no orçamento)</span>
                  </Label>
                  <Textarea
                    value={spInternalNotes}
                    onChange={(e) => setSpInternalNotes(e.target.value)}
                    placeholder="Anotações internas sobre o item..."
                    className="min-h-[72px] text-sm"
                  />
                </div>
                {/* Item em planta */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item em Planta</Label>
                  <Input
                    value={globalItemEmPlanta}
                    onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                    placeholder="ex: L1, P2..."
                    className="h-9"
                  />
                </div>
                {/* Botão adicionar */}
                <Button
                  onClick={handleAddSpecialItem}
                  disabled={!spDescription.trim() || spIsUploading}
                  className="w-full h-12 text-base font-semibold font-display bg-amber-600 hover:bg-amber-700 text-white"
                  size="lg"
                >
                  <PackagePlus className="w-5 h-5 mr-2" />
                  Adicionar ao Carrinho
                </Button>
              </div>
            )}

            {/* ── Formulário de Serviços ───────────────────────────────────────── */}
            {productCategory === "Serviços" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Descrição do Serviço <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={svDescription}
                    onChange={(e) => setSvDescription(e.target.value)}
                    placeholder="Ex: Instalação elétrica, Projeto luminotécnico..."
                    className="h-10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quantidade</Label>
                    <Input
                      type="number" min="1"
                      value={svQty}
                      onChange={(e) => setSvQty(e.target.value)}
                      placeholder="1"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor Unitário (R$)</Label>
                    <Input
                      value={svUnitPrice}
                      onChange={(e) => setSvUnitPrice(e.target.value)}
                      placeholder="Ex: 500,00"
                      className="h-10"
                      inputMode="decimal"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</Label>
                  <Textarea
                    value={svNotes}
                    onChange={(e) => setSvNotes(e.target.value)}
                    placeholder="Detalhes do serviço..."
                    className="min-h-[64px] text-sm"
                  />
                </div>
                <Button
                  onClick={handleAddService}
                  disabled={!svDescription.trim()}
                  className="w-full h-12 text-base font-semibold font-display bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  <Briefcase className="w-5 h-5 mr-2" />
                  Adicionar Serviço
                </Button>
              </div>
            )}

            {/* ── Formulário de Revenda ────────────────────────────────────────────── */}
            {productCategory === "Revenda" && (
              <div className="space-y-4">
                {revendaProductsQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">Carregando produtos...</div>
                ) : revendaProducts.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Nenhum produto de revenda disponível na API no momento.
                  </div>
                ) : (
                  <>
                    {/* Passo 1: Seleção de Fornecedor */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Fornecedor</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => { setRvFornecedor(""); setRvSelectedSku(""); setRvSearch(""); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            !rvFornecedor
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border hover:border-primary/50 text-foreground"
                          }`}
                        >
                          Todos
                        </button>
                        {revendaFornecedores.map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => { setRvFornecedor(f); setRvSelectedSku(""); setRvSearch(""); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              rvFornecedor === f
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:border-primary/50 text-foreground"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Passo 2: Busca textual */}
                    <div className="relative">
                      <Input
                        placeholder={rvFornecedor ? `Buscar em ${rvFornecedor}...` : "Buscar por nome, código ou referência..."}
                        value={rvSearch}
                        onChange={e => { setRvSearch(e.target.value); setRvSelectedSku(""); }}
                        className="pr-8"
                      />
                      {rvSearch && (
                        <button
                          type="button"
                          onClick={() => setRvSearch("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Passo 3: Lista de produtos */}
                    {(rvFornecedor || rvSearch.trim()) && (
                      <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
                        {filteredRevendaProducts.length === 0 ? (
                          <div className="text-sm text-muted-foreground p-4 text-center">Nenhum produto encontrado.</div>
                        ) : filteredRevendaProducts.map((p, idx) => (
                          <div
                            key={`${p.sku}-${idx}`}
                            onClick={() => setRvSelectedSku(prev => prev === p.sku ? "" : p.sku)}
                            className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                              rvSelectedSku === p.sku
                                ? "bg-emerald-50 dark:bg-emerald-900/20 border-l-2 border-emerald-500"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            {/* Miniatura da foto */}
                            <div className="shrink-0 w-9 h-9 rounded border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                              {p.fotoUrl ? (
                                <img src={p.fotoUrl} alt={p.name} className="w-full h-full object-contain p-0.5" loading="lazy" />
                              ) : (
                                <ShoppingBag className="w-4 h-4 text-muted-foreground/40" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{p.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {p.sku}{p.referencia ? ` · Ref: ${p.referencia}` : ""}
                                {p.precoVenda != null && p.precoVenda > 0 && (
                                  <span className="ml-2 text-emerald-700 dark:text-emerald-400 font-medium">
                                    R$ {p.precoVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dica quando nada está selecionado */}
                    {!rvFornecedor && !rvSearch.trim() && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Selecione um fornecedor ou busque pelo nome do produto.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Formulário de Customizados ────────────────────────────────────────────── */}
            {productCategory === "Customizados" && (
              <div className="space-y-4">
                {customizadosQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">Carregando produtos customizados...</div>
                ) : customizadosProducts.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">
                    Nenhum produto customizado disponível no momento.
                  </div>
                ) : (
                  <>
                    {/* Busca textual */}
                    <div className="relative">
                      <Input
                        placeholder="Buscar por nome, código ou referência..."
                        value={czSearch}
                        onChange={e => { setCzSearch(e.target.value); setCzSelectedSku(""); }}
                        className="pr-8"
                      />
                      {czSearch && (
                        <button
                          type="button"
                          onClick={() => setCzSearch("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Lista de produtos */}
                    <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
                      {customizadosProducts
                        .filter(p => !czSearch.trim() || p.name.toLowerCase().includes(czSearch.toLowerCase()) || p.sku.toLowerCase().includes(czSearch.toLowerCase()))
                        .length === 0 ? (
                        <div className="text-sm text-muted-foreground p-4 text-center">Nenhum produto encontrado.</div>
                      ) : customizadosProducts
                        .filter(p => !czSearch.trim() || p.name.toLowerCase().includes(czSearch.toLowerCase()) || p.sku.toLowerCase().includes(czSearch.toLowerCase()))
                        .map((p, idx) => (
                          <div
                            key={`${p.sku}-${idx}`}
                            onClick={() => setCzSelectedSku(prev => prev === p.sku ? "" : p.sku)}
                            className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                              czSelectedSku === p.sku
                                ? "bg-purple-50 dark:bg-purple-900/20 border-l-2 border-purple-500"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="shrink-0 w-9 h-9 rounded border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                              {p.fotoUrl ? (
                                <img src={p.fotoUrl} alt={p.name} className="w-full h-full object-contain p-0.5" loading="lazy" />
                              ) : (
                                <Package2 className="w-4 h-4 text-muted-foreground/40" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{p.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {p.sku}
                                {p.precoVenda != null && p.precoVenda > 0 && (
                                  <span className="ml-2 text-purple-700 dark:text-purple-400 font-medium">
                                    R$ {p.precoVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                            </div>
                            {czSelectedSku === p.sku && (
                              <div className="shrink-0">
                                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>

                    {/* Campos de quantidade e preço para produto selecionado */}
                    {czSelectedSku && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Qtd *</label>
                          <Input
                            type="number" min="1"
                            placeholder="1"
                            value={czQty}
                            onChange={e => setCzQty(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Preço unitário (R$)</label>
                          <Input
                            type="number" min="0" step="0.01"
                            placeholder="0,00"
                            value={czUnitPrice}
                            onChange={e => setCzUnitPrice(e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-sm font-medium">Observações</label>
                          <Input
                            placeholder="Especificações, cliente, etc."
                            value={czNotes}
                            onChange={e => setCzNotes(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Formulário de Acessórios ────────────────────────────────────────────────── */}
            {productCategory === "Acessórios" && (       <div className="space-y-4">
                {acessoriosQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">Carregando acessórios...</div>
                ) : acessoriosProducts.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Nenhum acessório disponível na API no momento.
                  </div>
                ) : (
                  <>
                    {/* Seletor de subcategoria */}
                    <div className="flex gap-2">
                      {([
                        { value: '' as const, label: 'Todos', count: acessoriosProducts.length },
                        { value: 'driver' as const, label: '⚡ Drivers & Fontes', count: acessoriosProducts.filter(p => (p.source ?? 'accessories') === 'driver').length },
                        { value: 'accessories' as const, label: '🔧 Acessórios Físicos', count: acessoriosProducts.filter(p => (p.source ?? 'accessories') === 'accessories').length },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setAcSubcat(opt.value); setAcFamilia(''); setAcSelectedId(null); setAcSearch(''); }}
                          className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium border transition-all text-center ${
                            acSubcat === opt.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:border-primary/50 text-foreground'
                          }`}
                        >
                          {opt.label}
                          <span className="ml-1 opacity-60">({opt.count})</span>
                        </button>
                      ))}
                    </div>

                    {/* Filtro por família */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Família</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => { setAcFamilia(""); setAcSelectedId(null); setAcSearch(""); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            !acFamilia
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border hover:border-primary/50 text-foreground"
                          }`}
                        >
                          Todos
                        </button>
                        {acessoriosFamilias.map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => { setAcFamilia(f); setAcSelectedId(null); setAcSearch(""); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              acFamilia === f
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:border-primary/50 text-foreground"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Busca textual */}
                    <div className="relative">
                      <Input
                        placeholder={acFamilia ? `Buscar em ${acFamilia}...` : "Buscar por nome, código ou dimensão..."}
                        value={acSearch}
                        onChange={e => { setAcSearch(e.target.value); setAcSelectedId(null); }}
                        className="pr-8"
                      />
                      {acSearch && (
                        <button
                          type="button"
                          onClick={() => setAcSearch("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Lista de acessórios */}
                    {(acFamilia || acSearch.trim()) && (
                      <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
                        {filteredAcessorios.length === 0 ? (
                          <div className="text-sm text-muted-foreground p-4 text-center">Nenhum acessório encontrado.</div>
                        ) : filteredAcessorios.map(p => (
                          <div
                            key={p.id}
                            onClick={() => setAcSelectedId(prev => prev === p.id ? null : p.id)}
                            className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                              acSelectedId === p.id
                                ? "bg-emerald-50 dark:bg-emerald-900/20 border-l-2 border-emerald-500"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            {/* Miniatura da foto */}
                            <div className="shrink-0 w-9 h-9 rounded border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                              {p.fotoUrl ? (
                                <img src={p.fotoUrl} alt={p.produto ?? ""} className="w-full h-full object-contain p-0.5" loading="lazy" />
                              ) : (
                                <Wrench className="w-4 h-4 text-muted-foreground/40" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{p.produto ?? p.codigo}</div>
                              <div className="text-xs text-muted-foreground">
                                <span className="font-mono">{p.sku ?? p.codigo}</span>
                                {p.dimensao ? ` · ${p.dimensao}` : ""}
                                {p.precoVenda != null && p.precoVenda > 0 && (
                                  <span className="ml-2 text-emerald-700 dark:text-emerald-400 font-medium">
                                    R$ {p.precoVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                              {p.observacoes && p.observacoes.trim() && p.observacoes.trim() !== '-' && (
                                <div className="text-xs text-muted-foreground/70 truncate mt-0.5">{p.observacoes}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dica quando nada está selecionado */}
                    {!acFamilia && !acSearch.trim() && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Selecione uma família ou busque pelo nome do acessório.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Campo global: Pavimento */}
            <div className="border border-border/50 rounded-lg p-3 bg-muted/20 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Localização do Item</p>
              <div>
                  <label className="text-xs text-muted-foreground">Pavimento</label>
                  <Input
                    className="h-8 text-sm mt-1"
                    placeholder="ex: Térreo, 1º Andar..."
                    value={globalPavimento}
                    onChange={(e) => setGlobalPavimento(e.target.value)}
                    list="pavimento-suggestions"
                  />
                  <datalist id="pavimento-suggestions">
                    <option value="Térreo" />
                    <option value="1º Andar" />
                    <option value="2º Andar" />
                    <option value="3º Andar" />
                    <option value="Cobertura" />
                    <option value="Subsolo" />
                    <option value="Mezanino" />
                  </datalist>
              </div>
            </div>

            {/* Botão Calcular — Perfis */}
            {selectedVariant && productCategory === "Perfis" && profileShape === "STRAIGHT" && (
              <Button
                onClick={handleCalculate}
                className="w-full h-12 text-base font-semibold font-display"
                size="lg"
              >
                <Zap className="w-5 h-5 mr-2" />
                Calcular Composição
              </Button>
            )}
            {selectedVariant && productCategory === "Perfis" && profileShape !== "STRAIGHT" && (
              <Button
                onClick={() => {
                  const code = profileCode;
                  let sr: ShapeResult | null = null;
                  const effectiveStripMethod = powerD1 === 36 ? stripMethod : "STRIPFLEX";
                  // Derivar nome e EQ da barra para a CCT selecionada
                  const cctSuffix = cct === "2700K" ? "2700" : cct === "3000K" ? "3000" : cct === "4000K" ? "4000" : "5000";
                  const sfNameKey = `ledModuleStripflex${cctSuffix}` as keyof typeof selectedVariant;
                  const slNameKey = `ledModuleStripline${cctSuffix}` as keyof typeof selectedVariant;
                  const sfEqKey = `ledModuleStripflexEq${cctSuffix}` as keyof typeof selectedVariant;
                  const slEqKey = `ledModuleStriplineEq${cctSuffix}` as keyof typeof selectedVariant;
                  const shapeStripflexName = effectiveStripMethod === "STRIPLINE"
                    ? (selectedVariant?.[slNameKey] as string | null | undefined) ?? null
                    : (selectedVariant?.[sfNameKey] as string | null | undefined) ?? null;
                  const shapeStripflexEq = effectiveStripMethod === "STRIPLINE"
                    ? (selectedVariant?.[slEqKey] as string | null | undefined) ?? null
                    : (selectedVariant?.[sfEqKey] as string | null | undefined) ?? null;
                  const dp: ShapeDriverParams = {
                    power: powerD1,
                    voltage,
                    stripMethod: effectiveStripMethod,
                    allowLongModules,
                    allowFractionalBars: allowFractional,
                    cct,
                    profileName,
                    stripflexName: shapeStripflexName,
                    stripflexEq: shapeStripflexEq,
                  };
                  if (profileShape === "L_SHAPE") {
                    sr = calculateLShape(code, parseInt(shapeSideH) || 2000, parseInt(shapeSideV) || 1200, dp);
                  } else if (profileShape === "SQUARE") {
                    sr = calculateSquare(code, parseInt(shapeSide) || 1200, dp);
                  } else if (profileShape === "RECTANGLE") {
                    sr = calculateRectangle(code, parseInt(shapeWidth) || 2000, parseInt(shapeHeight) || 1200, dp);
                  } else if (profileShape === "U_SHAPE") {
                    sr = calculateUShape(code, parseInt(shapeHeight) || 1200, parseInt(shapeWidth) || 2000, dp);
                  }
                  if (sr) {
                    setShapeResult(sr);
                    setResult(null);
                    setError(null);
                  } else {
                    setError("Não foi possível calcular a composição para este formato. Verifique as dimensões informadas.");
                  }
                }}
                className="w-full h-12 text-base font-semibold font-display"
                size="lg"
              >
                <Zap className="w-5 h-5 mr-2" />
                {profileShape === "U_SHAPE" ? "Calcular Formato EM U" : "Calcular Formato EM L"}
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold font-display text-foreground">Resultado</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Composição calculada com base nos parâmetros informados.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
              </div>
            </div>

            {productCategory === "Perfis" && !lbFamilia && !bgInstalacao && bgMode !== "fixo" && !glowMode && !tubeLightMode && !tubeLightResult && profileShape === "STRAIGHT" && (!result ? (
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
              <ResultBlock result={result} profilePriceMap={profilePriceMap} profileVariant={activeProfileCatalog[result.profileCode]} skuPriceMap={skuPriceMap} onAddToQuote={appendToQuoteId ? handleAddItemOrToQuote : undefined} itemEmPlanta={globalItemEmPlanta} setItemEmPlanta={setGlobalItemEmPlanta} globalQty={globalQty} setGlobalQty={setGlobalQty} onOpenAccessoryModal={() => { setAddAcModalOpen(true); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }} pendingAccessoriesCount={pendingAccessories.length} globalPavimento={globalPavimento} />
            ))}
            {/* Resultado EM L */}
            {productCategory === "Perfis" && !lbFamilia && !bgInstalacao && bgMode !== "fixo" && !glowMode && !tubeLightMode && !tubeLightResult && profileShape !== "STRAIGHT" && (
              !shapeResult ? (
                <Card className="shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <svg viewBox="0 0 24 24" className="w-8 h-8 text-muted-foreground" fill="none">
                        <path d="M4 4 L4 20 L20 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-base font-semibold text-foreground font-display">Nenhum cálculo realizado</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                      Informe as dimensões e clique em "Calcular Formato EM L".
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ShapeResultCard
                  shapeResult={shapeResult}
                  skuPriceMap={skuPriceMap}
                  onAddToQuote={appendToQuoteId ? handleAddItemOrToQuote : undefined}
                  globalQty={globalQty}
                  setGlobalQty={setGlobalQty}
                  onOpenAccessoryModal={() => { setAddAcModalOpen(true); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }}
                  pendingAccessoriesCount={pendingAccessories.length}
                  globalPavimento={globalPavimento}
                />
              )
            )}

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
                      Selecione potência{lbIsNoDifusorFamily ? "" : ", difusor"}, comprimento e clique em "Calcular".
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
                        Resultado — {lbResult.product.familia}
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
                            <p className="text-sm text-muted-foreground mt-1">{lbResult.product.familia} · {lbResult.product.difusor !== "NF" ? `${lbResult.product.difusor} · ` : ""}{lbResult.product.potencia}W/m</p>
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
                    // Preço = (R$/m × comprimento_total_m) + driver selecionado por potência do trecho
                    // Famílias sem tabela de preço retornam null — usuário preenche manualmente no carrinho
                    // Selecionar custo do driver da API conforme controle selecionado
                    const lbCustoDriver = (() => {
                      const p = r.product;
                      const ct = r.controle;
                      if (ct === 'DIM DALI') return p.custoDriverDimDali ?? null;
                      if (ct === 'DIM 0-10V') return p.custoDriverDim010v ?? null;
                      if (ct === 'DIM TRIAC') return p.custoDriverDimTriac220v ?? p.custoDriverDimTriac110v ?? null;
                      if (/bivolt/i.test(r.voltage)) return p.custoDriverBivolt ?? null;
                      return p.custoDriver220 ?? null;
                    })();
                    const lbMarkupDriver = r.product.markupMinimoDriver ?? 3;
                    const lbPreco = calcLedBarPrice(r.product.potencia, r.comprimentoTotalMm, nT, r.product.familia, r.product.precoMetro, lbCustoDriver, lbMarkupDriver);
                    const lbDetail = calcLedBarPriceDetail(r.product.potencia, r.comprimentoTotalMm, nT, r.product.familia, r.product.precoMetro, lbCustoDriver, lbMarkupDriver);
                    const isPerfilFlex = /^PERFIL FLEXIVEL/i.test(r.product.familia ?? "");
                    const orcamentoLines = [
                      [`${r.product.name} ${r.cct} ${r.voltage}`, nT > 1 ? `${nT} TRECHOS DE ${mm}MM` : `${mm}MM`].join(" "),
                      lbPreco !== null
                        ? isPerfilFlex
                          ? `PREÇO PERFIL: ${formatBRL(lbPreco)} (drivers não incluídos)`
                          : `PREÇO: ${formatBRL(lbPreco)}`
                        : null,
                    ].filter(Boolean);
                    const orcamento = orcamentoLines.join("\n");
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
                            {/* Detalhamento do preço (apenas para famílias com tabela de preço) */}
                            {lbDetail !== null && (
                            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 mb-3 space-y-0.5">
                              {lbDetail.perfilFlexivel ? (
                                // PERFIL FLEXÍVEL: preço temporário — apenas perfil, sem drivers
                                <>
                                  <div className="flex justify-between">
                                    <span>Perfil Flexível × {(r.comprimentoTotalMm/1000).toFixed(3)}m</span>
                                    <span className="font-mono">{formatBRL(lbDetail.precoPerfil)}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                                    <span>Total (somente perfil)</span>
                                    <span className="font-mono text-primary">{formatBRL(lbDetail.total)}</span>
                                  </div>
                                  <p className="text-[10px] text-amber-500 mt-1">⚠️ Preço somente do perfil (R$ {r.product.precoMetro?.toFixed(2).replace('.', ',')}/m). Drivers/fontes não incluídos — serão adicionados separadamente.</p>
                                </>
                              ) : (
                                // LED BAR padrão: perfil + drivers
                                <>
                                  <div className="flex justify-between">
                                    <span>Perfil ({r.product.potencia}W/m × {(r.comprimentoTotalMm/1000).toFixed(3)}m)</span>
                                    <span className="font-mono">{formatBRL(lbDetail.precoPerfil)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>
                                      Driver {lbDetail.driverFromApi ? '' : `${lbDetail.wattsDriver}W `}× {nT} corte{nT > 1 ? "s" : ""}
                                      {!lbDetail.driverFromApi && lbDetail.wattsDriver === 100 && (
                                        <span className="ml-1 text-amber-500 font-medium">(potência {lbDetail.potenciaTrecho.toFixed(1)}W — driver 60W insuficiente)</span>
                                      )}
                                    </span>
                                    <span className="font-mono">{formatBRL(lbDetail.totalDrivers)}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                                    <span>Total</span>
                                    <span className="font-mono text-primary">{formatBRL(lbDetail.total)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            )}
                            {lbPreco === null && (
                              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 mb-3">
                                <span className="text-amber-400 text-xs font-medium">⚠️ Preço não cadastrado — preencha manualmente no carrinho ou no orçamento.</span>
                              </div>
                            )}
                            <div
                              className="font-mono text-sm bg-muted/50 rounded-lg p-4 cursor-text select-all whitespace-pre-wrap"
                              onClick={(e) => { const sel = window.getSelection(); sel?.selectAllChildren(e.currentTarget); }}
                            >
                              {orcamento}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão para copiar.</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <div className="flex items-center gap-1.5">
                                <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                                <Input
                                  className="h-7 text-xs w-28"
                                  placeholder="ex: L1, P2..."
                                  value={globalItemEmPlanta}
                                  onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                                <Input
                                  type="number"
                                  className="h-7 text-xs w-16"
                                  min={1}
                                  placeholder="1"
                                  value={globalQty}
                                  onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { navigator.clipboard.writeText(orcamento); toast.success("Resumo copiado!"); }}
                              >
                                <Copy className="w-3 h-3 mr-1" /> Copiar Resumo
                              </Button>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={isAddingToCart}
                                onClick={() => {
                                  const lbDriverInfo = r.trechos[0]?.driver;
                                  const lbDriverCode = lbDriverInfo?.code ?? "";
                                  const lbDriverModel = lbDriverInfo?.model ?? "";
                                  // Construir driverLines para separar driver no orçamento
                                  // LED BAR: nCortes drivers por unidade (cada trecho tem 1 driver)
                                  const isPerfilFlexLb = /^PERFIL FLEXIVEL/i.test(r.product.familia ?? "");
                                  const lbDrvLines: import("@/lib/cartTypes").DriverLine[] | undefined =
                                    !isPerfilFlexLb && lbDriverModel && lbDetail !== null && lbDetail.precoDriverPorCorte > 0
                                      ? [{
                                          driverModel: lbDriverModel,
                                          driverCode: lbDriverCode,
                                          driverQty: r.nCortes * globalQty,
                                          driverUnitPrice: lbDetail.precoDriverPorCorte,
                                          driverTotalPrice: Math.round(lbDetail.precoDriverPorCorte * r.nCortes * globalQty * 100) / 100,
                                        }]
                                      : undefined;
                                  const lbPrecoSemDriver = lbDrvLines && lbDetail
                                    ? Math.round(lbDetail.precoPerfil * globalQty * 100) / 100
                                    : null;
                                  const lbUnitPriceLuminaria = lbDrvLines && lbDetail
                                    ? lbDetail.precoPerfil
                                    : null;
                                  const lbUnitPriceDriver = lbDrvLines
                                    ? lbDetail?.precoDriverPorCorte ?? null
                                    : null;
                                  const item: CartItemData = {
                                    category: "LED BAR",
                                    sku: r.product.sku ?? "",
                                    description: `${r.product.name} ${r.cct} ${r.controle} ${r.voltage} ${r.comprimentoTotalMm}MM`,
                                    power: `${r.product.potencia}W/m`,
                                    cct: r.cct,
                                    qty: globalQty,
                                    unitPrice: lbPreco ?? null,
                                    totalPrice: lbPreco !== null ? lbPreco * globalQty : null,
                                    photoUrl: r.product.fotoUrl ?? "",
                                    orderSummary: pedido,
                                    quoteSummary: orcamento,
                                    moduloLed: r.ledModuleWithCCT ?? r.product.ledModule ?? "",
                                    drivers: lbDriverCode ? `${r.nCortes}x ${lbDriverModel} (${lbDriverCode})` : `${r.nCortes}x ${lbDriverModel}`,
                                    ledBarNCortes: r.nCortes,
                                    ledBarComprimentoPorTrechoMm: r.comprimentoPorTrechoMm,
                                    ledBarComprimentoTotalMm: r.comprimentoTotalMm,
                                    ledBarDriverModel: lbDriverModel,
                                    ledBarDriverCode: lbDriverCode,
                                    availableCCTs: r.product.ccts,
                                    itemEmPlanta: globalItemEmPlanta,
                                    ...(lbDrvLines ? {
                                      driverLines: lbDrvLines,
                                      priceWithoutDriver: lbPrecoSemDriver,
                                      unitPriceLuminaria: lbUnitPriceLuminaria,
                                      unitPriceDriver: lbUnitPriceDriver,
                                      luminariaHasApiPrice: lbPreco !== null,
                                    } : {}),
                                  };
                                  if (appendToQuoteId) {
                                    handleAddItemOrToQuote(item);
                                  } else {
                                    setPendingCartItem(item);
                                    setColorModalOpen(true);
                                  }
                                }}
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" /> {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                              </Button>
                            </div>
                            {/* Botão Incluir Acessório — logo abaixo do Enviar ao Carrinho */}
                            <div className="mt-2 flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1.5 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                                onClick={() => { setAddAcModalOpen(true); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }}
                              >
                                <Wrench className="w-3.5 h-3.5" />
                                Incluir Acessório
                              </Button>
                              {pendingAccessories.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-300 dark:border-cyan-700 rounded-full px-2 py-0.5">
                                  <Wrench className="w-3 h-3" />
                                  {pendingAccessories.length} acessório{pendingAccessories.length > 1 ? "s" : ""} vinculado{pendingAccessories.length > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
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

            {/* ── Resultado BAGEO ───────────────────────────────────────────────────────────────────────── */}
            {productCategory === "Perfis" && bgInstalacao && bgResult && (
              <div className="space-y-4">
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Resultado — BAGEO
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Layout padrão: foto pequena à esquerda + grid de métricas */}
                    {bgResult.product.fotoUrl ? (
                      <div className="flex gap-3 items-stretch">
                        <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 flex items-center justify-center">
                          <img src={bgResult.product.fotoUrl} alt={bgResult.product.name} className="w-full h-full object-contain p-2" loading="lazy" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 flex-1">
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                            <p className="text-sm font-mono font-semibold text-primary">{bgResult.product.sku}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                            <p className="text-sm font-semibold">{bgResult.product.name}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                            <p className="text-sm font-semibold">{bgResult.cct}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Controle</p>
                            <p className="text-sm font-semibold">{bgResult.controle}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Comprimento</p>
                            <p className="text-sm font-semibold">{bgResult.comprimento}mm ({bgResult.comprimentoMetros.toFixed(3).replace(".",",")} m)</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Instalação</p>
                            <p className="text-sm font-semibold">{bgResult.product.instalacao}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                          <p className="text-sm font-mono font-semibold text-primary">{bgResult.product.sku}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                          <p className="text-sm font-semibold">{bgResult.product.name}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                          <p className="text-sm font-semibold">{bgResult.cct}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Controle</p>
                          <p className="text-sm font-semibold">{bgResult.controle}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Comprimento</p>
                          <p className="text-sm font-semibold">{bgResult.comprimento}mm ({bgResult.comprimentoMetros.toFixed(3).replace(".",",")} m)</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Instalação</p>
                          <p className="text-sm font-semibold">{bgResult.product.instalacao}</p>
                        </div>
                      </div>
                    )}
                    {/* Fita LED */}
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Fita LED ({bgResult.ledModuleQtd}x por metro → {bgResult.fitaMetros.toFixed(1).replace(".",",")} m total)</p>
                      <p className="text-sm font-semibold">{bgResult.ledModuleWithCCT}</p>
                    </div>
                    {/* Driver */}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Fonte de Tensão (1 a cada 2300mm → {bgResult.driverQtd}x)</p>
                      <p className="text-sm font-semibold">{bgResult.driver.model}</p>
                      {bgResult.driver.code && (
                        <a
                          href={`https://alfaluxprod-c8zmg2fn.manus.space/products/${bgResult.driver.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline font-mono mt-0.5 block"
                        >
                          {bgResult.driver.code}
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {/* Resumos */}
                {(() => {
                  const r = bgResult;
                  const comprStr = `${r.comprimento}MM`;
                  const precoLine = r.precoTotal !== null ? `PREÇO: ${formatBRL(r.precoTotal)}` : null;
                  const orcamento = [
                    `${r.product.name} ${r.cct} ${r.controle} ${comprStr}`,
                    precoLine,
                  ].filter(Boolean).join("\n");
                  // Monta a linha de fita com "voltas"
                  // D1 (20W/m): 2x voltas de comprimento mm cada
                  // D1+D2 (40W/m): 4x voltas de comprimento mm cada (2 por lado × 2 lados)
                  const aplicacao = r.product.aplicacao;
                  // Remove prefixo de quantidade do nome do módulo (ex: "2x FITA LED..." → "FITA LED...")
                  // para evitar duplicação com o "Nx VOLTAS" que construímos aqui
                  const ledModuleRaw = r.ledModuleWithCCT.toUpperCase();
                  const ledModuleName = ledModuleRaw.replace(/^\d+[Xx]\s+/, "");
                  let fitaLine: string;
                  let drvLine: string;
                  if (aplicacao === "D1+D2") {
                    // D1+D2: dois circuitos independentes (D1 e D2), cada um com 2 voltas
                    const voltasPorLado = 2;
                    const fitaD1 = `D1: ${voltasPorLado}x VOLTAS DE ${r.comprimento}MM DE FITA LED ${ledModuleName}`;
                    const fitaD2 = `D2: ${voltasPorLado}x VOLTAS DE ${r.comprimento}MM DE FITA LED ${ledModuleName}`;
                    const drvModel = r.driver.model.toUpperCase();
                    const drvCode = r.driver.code ? ` (${r.driver.code})` : "";
                    const drvD1 = `D1: ${r.driverQtd}x FONTE DE TENSÃO ${drvModel}${drvCode}`;
                    const drvD2 = `D2: ${r.driverQtd}x FONTE DE TENSÃO ${drvModel}${drvCode}`;
                    fitaLine = `${fitaD1} | ${fitaD2}`;
                    drvLine = `${drvD1} | ${drvD2}`;
                  } else {
                    // D1 (20W/m): ledModuleQtd voltas (2 para D1)
                    const voltas = r.ledModuleQtd;
                    const drvModel = r.driver.model.toUpperCase();
                    const drvCode = r.driver.code ? ` (${r.driver.code})` : "";
                    fitaLine = `${voltas}x VOLTAS DE ${r.comprimento}MM DE FITA LED ${ledModuleName}`;
                    drvLine = `${r.driverQtd}x FONTE DE TENSÃO ${drvModel}${drvCode}`;
                  }
                  const pedido = [
                    `CÓDIGO: ${r.product.sku}`,
                    `${r.product.name} ${r.cct} ${r.controle} ${comprStr}`,
                    `COMPOSIÇÃO: ${fitaLine} + ${drvLine}`,
                  ].filter(Boolean).join("\n");
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
                          {r.precoTotal !== null && r.precoTotal !== undefined ? (
                            <div className="flex items-center justify-between rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-3 mt-3">
                              <span className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Preço Total</span>
                              <span className="text-lg font-bold text-blue-300">{formatBRL(r.precoTotal)}</span>
                            </div>
                          ) : (
                            <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-50/30 dark:bg-amber-900/10 px-3 py-2 mt-3">
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">⚠️ API sem custo — informe o preço manualmente:</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">R$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0,00"
                                  value={bgManualPreco}
                                  onChange={(e) => setBgManualPreco(e.target.value)}
                                  className="h-8 w-36 text-sm"
                                />
                                {(() => { const n = bgManualPreco !== "" ? parseFloat(bgManualPreco.replace(",",".")) : null; return n != null && !isNaN(n) && n > 0 ? <span className="text-sm font-bold text-blue-400">{formatBRL(n)}</span> : null; })()}
                              </div>
                              <p className="text-xs text-muted-foreground">Este preço será usado no orçamento.</p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão para copiar.</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <div className="flex items-center gap-1.5">
                              <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                              <Input
                                className="h-7 text-xs w-28"
                                placeholder="ex: L1, P2..."
                                value={globalItemEmPlanta}
                                onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                              <Input
                                type="number"
                                className="h-7 text-xs w-16"
                                min={1}
                                placeholder="1"
                                value={globalQty}
                                onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                              />
                            </div>
                            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(orcamento); toast.success("Resumo copiado!"); }}>
                              <Copy className="w-3 h-3 mr-1" /> Copiar Resumo
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={isAddingToCart}
                              onClick={() => {
                                const bgManualNum = bgManualPreco !== "" ? parseFloat(bgManualPreco.replace(",", ".")) : null;
                                const bgPrecoEfetivo = r.precoTotal ?? (bgManualNum != null && !isNaN(bgManualNum) && bgManualNum > 0 ? bgManualNum : null);
                                const item: CartItemData = {
                                  category: "BAGEO",
                                  sku: r.product.sku ?? "",
                                  description: `${r.product.name} ${r.product.aplicacao !== 'D1' ? r.product.aplicacao + ' ' : ''}${r.cct} ${r.controle} ${r.comprimento}MM`,
                                  power: "",
                                  cct: r.cct,
                                  qty: 1,
                                  unitPrice: bgPrecoEfetivo ?? null,
                                  totalPrice: bgPrecoEfetivo ?? null,
                                  priceFromApi: false, // BAGEO sempre permite edição manual de preço
                                  photoUrl: r.product.fotoUrl ?? "",
                                  orderSummary: pedido,
                                  quoteSummary: orcamento,
                                  moduloLed: r.product.ledModule ?? "",
                                  drivers: r.product.driver220?.model ?? r.product.driverBivolt?.model ?? "",
                                  availableCCTs: r.product.ccts,
                                  itemEmPlanta: globalItemEmPlanta,
                                };
                                  if (appendToQuoteId) {
                                    handleAddItemOrToQuote(item);
                                  } else {
                                    setPendingCartItem(item);
                                    setColorModalOpen(true);
                                  }
                                }}
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" /> {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                              </Button>
                            </div>
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
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => { navigator.clipboard.writeText(pedido); toast.success("Pedido copiado!"); }}>
                            <Copy className="w-3 h-3 mr-1" /> Copiar Pedido
                          </Button>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>
            )}
            {/* ── Resultado BAGEO fixo ── */}
            {productCategory === "Perfis" && bgMode === "fixo" && bfResult && (
              <div className="space-y-4">
                <Card className="shadow-sm border-amber-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Resultado — BAGEO
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const bfPhoto = bfResult.product.sku ? adaptedCatalogs?.bageosFixosFotos?.[bfResult.product.sku] ?? null : null;
                      return bfPhoto ? (
                        <div className="flex gap-3 items-stretch">
                          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 flex items-center justify-center">
                            <img src={bfPhoto} alt={bfResult.product.name} className="w-full h-full object-contain p-2" loading="lazy" />
                          </div>
                          <div className="grid grid-cols-2 gap-2 flex-1">
                            {bfResult.product.sku && (
                              <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                                <p className="text-sm font-mono font-semibold text-primary">{bfResult.product.sku}</p>
                              </div>
                            )}
                            <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                              <p className="text-sm font-semibold">{bfResult.product.name}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                              <p className="text-sm font-semibold">{bfResult.cct}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p>
                              <p className="text-sm font-semibold">{bfResult.tensao}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                              <p className="text-sm font-semibold">{bfResult.driver.model} <span className="font-mono text-primary">({bfResult.driver.code})</span></p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {bfResult.product.sku && (
                            <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                              <p className="text-sm font-mono font-semibold text-primary">{bfResult.product.sku}</p>
                            </div>
                          )}
                          <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                            <p className="text-sm font-semibold">{bfResult.product.name}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                            <p className="text-sm font-semibold">{bfResult.cct}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p>
                            <p className="text-sm font-semibold">{bfResult.tensao}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                            <p className="text-sm font-semibold">{bfResult.driver.model} <span className="font-mono text-primary">({bfResult.driver.code})</span></p>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
                {/* Resumo para Orçamento */}
                <Card className="shadow-sm border-blue-500/30">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      Resumo Para Orçamento
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                        <Input
                          className="h-7 text-xs w-28"
                          placeholder="ex: L1, P2..."
                          value={globalItemEmPlanta}
                          onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                        <Input
                          type="number"
                          className="h-7 text-xs w-16"
                          min={1}
                          placeholder="1"
                          value={globalQty}
                          onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          const preco = getPrecoForControle(bfResult.product, bfResult.controle, bfResult.tensao);
                          const lines = [`${bfResult.product.name} ${bfResult.cct} ${bfResult.tensao}`.toUpperCase()];
                          if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                          navigator.clipboard.writeText(lines.join("\n"));
                          toast.success("Copiado!");
                        }}
                      >
                        <Copy className="w-3 h-3" /> Copiar Resumo
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isAddingToCart}
                        onClick={() => {
                          const preco = getPrecoForControle(bfResult.product, bfResult.controle, bfResult.tensao);
                          const item: CartItemData = {
                            category: "Perfis",
                            sku: bfResult.product.sku ?? "",
                            description: `${bfResult.product.name} ${bfResult.cct} ${bfResult.controle} ${bfResult.tensao}`,
                            power: "",
                            cct: bfResult.cct,
                            qty: 1,
                            unitPrice: preco ?? null,
                            totalPrice: preco ?? null,
                            priceFromApi: preco != null,
                            photoUrl: "",
                            orderSummary: `CÓDIGO: ${bfResult.product.sku}\n${bfResult.product.name.toUpperCase()} ${bfResult.cct} ${bfResult.controle.toUpperCase()} ${bfResult.tensao} COM DRIVER ${bfResult.driver.model.toUpperCase()} (${bfResult.driver.code})`,
                            quoteSummary: `${bfResult.product.name} ${bfResult.cct} ${bfResult.controle} ${bfResult.tensao}`.toUpperCase(),
                            moduloLed: bfResult.ledModuleWithCCT ?? "",
                            drivers: `DRIVER ${bfResult.driver.model.toUpperCase()} (${bfResult.driver.code})`,
                            availableCCTs: bfResult.product.ccts,
                            itemEmPlanta: globalItemEmPlanta,
                            ...getCustoForControle(bfResult.product, bfResult.controle, bfResult.tensao),
                          };
                          if (appendToQuoteId) {
                            handleAddItemOrToQuote(item);
                          } else {
                            setPendingCartItem(item);
                            setColorModalOpen(true);
                          }
                        }}
                      >
                        <ShoppingCart className="w-3 h-3" /> {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                        onClick={() => { setAddAcModalOpen(true); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }}
                      >
                        <Wrench className="w-3 h-3" />
                        Incluir Acessório
                        {pendingAccessories.length > 0 && (
                          <span className="ml-1 bg-cyan-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{pendingAccessories.length}</span>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                      onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                    >
                      {(() => {
                        const preco = getPrecoForControle(bfResult.product, bfResult.controle, bfResult.tensao);
                        const drvLines = buildLumDriverLines(bfResult.product.sku ?? "", bfResult.controle, bfResult.tensao, globalQty, bfResult.driver.model, bfResult.driver.code, lumPriceMap, bfResult.product.name ?? undefined, bfResult.driver.corrente ?? null);
                        const lines = [`${bfResult.product.name} ${bfResult.cct} ${bfResult.tensao}`.toUpperCase()];
                        if (drvLines) {
                          if (drvLines.luminariaHasApiPrice && drvLines.priceWithoutDriver != null) {
                            lines.push(`LUMINÁRIAS: ${formatBRL(drvLines.priceWithoutDriver)}`);
                          } else {
                            lines.push(`LUMINÁRIAS: A DEFINIR`);
                          }
                          const totalDrv = drvLines.driverLines.reduce((s, d) => s + (d.driverTotalPrice ?? 0), 0);
                          if (totalDrv > 0) lines.push(`DRIVERS: ${formatBRL(totalDrv)}`);
                          if (preco !== null) lines.push(`TOTAL: ${formatBRL(preco * globalQty)}`);
                        } else if (preco !== null) {
                          lines.push(`PREÇO: ${formatBRL(preco * globalQty)}`);
                        }
                        return lines.join("\n");
                      })()}
                    </div>
                    <PriceBreakdownBlock
                      sku={bfResult.product.sku ?? ""}
                      controle={bfResult.controle}
                      tensao={bfResult.tensao}
                      qty={globalQty}
                      driverModel={bfResult.driver.model}
                      driverCode={bfResult.driver.code}
                      lumPriceMap={lumPriceMap}
                      staticPreco={getPrecoForControle(bfResult.product, bfResult.controle, bfResult.tensao)}
                      productName={bfResult.product.name ?? undefined}
                    />
                    <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão "Copiar Resumo" para copiar diretamente.</p>
                  </CardContent>
                </Card>
              </div>
            )}
            {/* Estado vazio BAGEO fixo */}
            {productCategory === "Perfis" && bgMode === "fixo" && !bfResult && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">Nenhum cálculo realizado</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">Selecione instalação, família, produto, tensão e CCT, depois clique em "Calcular BAGEO".</p>
                </CardContent>
              </Card>
            )}
            {/* Resultado GLOW */}
            {productCategory === "Perfis" && glowResult && (
              <div className="space-y-4">
                <Card className="shadow-sm border-amber-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Resultado — GLOW
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const gPhoto = glowResult.product.sku ? adaptedCatalogs?.glowFotos?.[glowResult.product.sku] ?? null : null;
                      return (
                        <div className={gPhoto ? "flex gap-3 items-stretch" : "grid grid-cols-2 gap-2"}>
                          {gPhoto && (
                            <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 h-36 flex items-center justify-center">
                              <img src={gPhoto} alt={glowResult.product.name} className="w-full h-full object-contain p-2" loading="lazy" />
                            </div>
                          )}
                          <div className={gPhoto ? "grid grid-cols-2 gap-2 flex-1" : "contents"}>
                            {glowResult.product.sku && (
                              <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                                <p className="text-sm font-mono font-semibold text-primary">{glowResult.product.sku}</p>
                              </div>
                            )}
                            <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                              <p className="text-sm font-semibold">{glowResult.product.name}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                              <p className="text-sm font-semibold">{glowResult.cct}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p>
                              <p className="text-sm font-semibold">{glowResult.tensao}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                              <p className="text-sm font-semibold">
                                {glowResult.driver.model}
                                {glowResult.driver.code && (
                                  <> <a href={`https://alfaluxprod-c8zmg2fn.manus.space/products/${glowResult.driver.code}`} target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">({glowResult.driver.code})</a></>
                                )}
                              </p>
                            </div>
                            {glowResult.ledModuleWithCCT && (
                              <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Módulo LED</p>
                                <p className="text-sm font-semibold">{glowResult.ledModuleWithCCT}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
                {/* Resumo para Orçamento */}
                <Card className="shadow-sm border-blue-500/30">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      Resumo Para Orçamento
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                        <Input
                          className="h-7 text-xs w-28"
                          placeholder="ex: L1, P2..."
                          value={globalItemEmPlanta}
                          onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                        <Input
                          type="number"
                          className="h-7 text-xs w-16"
                          min={1}
                          placeholder="1"
                          value={globalQty}
                          onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          const preco = getPrecoForControle(glowResult.product, glowResult.controle, glowResult.tensao);
                          const lines = [`${glowResult.product.name} ${glowResult.cct} ${glowResult.tensao}`.toUpperCase()];
                          if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                          navigator.clipboard.writeText(lines.join("\n"));
                          toast.success("Copiado!");
                        }}
                      >
                        <Copy className="w-3 h-3" /> Copiar Resumo
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isAddingToCart}
                        onClick={() => {
                          const preco = getPrecoForControle(glowResult.product, glowResult.controle, glowResult.tensao);
                          const item: CartItemData = {
                            category: "Perfis",
                            sku: glowResult.product.sku ?? "",
                            description: `${glowResult.product.name} ${glowResult.cct} ${glowResult.tensao}`,
                            power: "",
                            cct: glowResult.cct,
                            qty: 1,
                            unitPrice: preco ?? null,
                            totalPrice: preco ?? null,
                            priceFromApi: preco != null,
                            photoUrl: adaptedCatalogs?.glowFotos?.[glowResult.product.sku ?? ""] ?? "",
                            orderSummary: `CÓDIGO: ${glowResult.product.sku}\n${glowResult.product.name.toUpperCase()} ${glowResult.cct} ${glowResult.tensao} COM DRIVER ${glowResult.driver.model.toUpperCase()} (${glowResult.driver.code})`,
                            quoteSummary: `${glowResult.product.name} ${glowResult.cct} ${glowResult.tensao}`.toUpperCase(),
                            moduloLed: glowResult.ledModuleWithCCT ?? "",
                            drivers: `DRIVER ${glowResult.driver.model.toUpperCase()} (${glowResult.driver.code})`,
                            availableCCTs: glowResult.product.ccts,
                            itemEmPlanta: globalItemEmPlanta,
                            ...getCustoForControle(glowResult.product, glowResult.controle, glowResult.tensao),
                          };
                          if (appendToQuoteId) {
                            handleAddItemOrToQuote(item);
                          } else {
                            // GLOW só existe em BRANCO — pular modal de cor
                            addItem({ ...item, corPeca: "BRANCO", ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}) });
                            if (setGlobalQty) setGlobalQty(1);
                          }
                        }}
                      >
                        <ShoppingCart className="w-3 h-3" /> {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                        onClick={() => { setAddAcModalOpen(true); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }}
                      >
                        <Wrench className="w-3 h-3" />
                        Incluir Acessório
                        {pendingAccessories.length > 0 && (
                          <span className="ml-1 bg-cyan-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{pendingAccessories.length}</span>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                      onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                    >
                      {(() => {
                        const preco = getPrecoForControle(glowResult.product, glowResult.controle, glowResult.tensao);
                        const drvLines = buildLumDriverLines(glowResult.product.sku ?? "", glowResult.controle, glowResult.tensao, globalQty, glowResult.driver.model, glowResult.driver.code, lumPriceMap, glowResult.product.name ?? undefined, glowResult.driver.corrente ?? null);
                        const lines = [`${glowResult.product.name} ${glowResult.cct} ${glowResult.tensao}`.toUpperCase()];
                        if (drvLines) {
                          if (drvLines.luminariaHasApiPrice && drvLines.priceWithoutDriver != null) {
                            lines.push(`LUMINÁRIAS: ${formatBRL(drvLines.priceWithoutDriver)}`);
                          } else {
                            lines.push(`LUMINÁRIAS: A DEFINIR`);
                          }
                          const totalDrv = drvLines.driverLines.reduce((s, d) => s + (d.driverTotalPrice ?? 0), 0);
                          if (totalDrv > 0) lines.push(`DRIVERS: ${formatBRL(totalDrv)}`);
                          if (preco !== null) lines.push(`TOTAL: ${formatBRL(preco * globalQty)}`);
                        } else if (preco !== null) {
                          lines.push(`PREÇO: ${formatBRL(preco * globalQty)}`);
                        }
                        return lines.join("\n");
                      })()}
                    </div>
                    <PriceBreakdownBlock
                      sku={glowResult.product.sku ?? ""}
                      controle={glowResult.controle}
                      tensao={glowResult.tensao}
                      qty={globalQty}
                      driverModel={glowResult.driver.model}
                      driverCode={glowResult.driver.code}
                      lumPriceMap={lumPriceMap}
                      staticPreco={getPrecoForControle(glowResult.product, glowResult.controle, glowResult.tensao)}
                      productName={glowResult.product.name ?? undefined}
                    />
                    <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão "Copiar Resumo" para copiar diretamente.</p>
                  </CardContent>
                </Card>
              </div>
            )}
            {/* Estado vazio GLOW */}
            {productCategory === "Perfis" && glowMode && !glowResult && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">Nenhum cálculo realizado</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">Selecione o produto GLOW, tensão e CCT, depois clique em "Calcular GLOW".</p>
                </CardContent>
              </Card>
            )}
            {/* Resultado TUBE LIGHT */}
            {productCategory === "Perfis" && tubeLightResult && (
              <div className="space-y-4">
                <Card className="shadow-sm border-sky-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <Zap className="w-4 h-4 text-sky-500" />
                      Resultado — TUBE LIGHT
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const tPhoto = tubeLightResult.product.sku ? adaptedCatalogs?.tubeLightFotos?.[tubeLightResult.product.sku] ?? null : null;
                      return (
                        <div className={tPhoto ? "flex gap-3 items-stretch" : "grid grid-cols-2 gap-2"}>
                          {tPhoto && (
                            <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 h-36 flex items-center justify-center">
                              <img src={tPhoto} alt={tubeLightResult.product.name} className="w-full h-full object-contain p-2" loading="lazy" />
                            </div>
                          )}
                          <div className={tPhoto ? "grid grid-cols-2 gap-2 flex-1" : "contents"}>
                            {tubeLightResult.product.sku && (
                              <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                                <p className="text-sm font-mono font-semibold text-primary">{tubeLightResult.product.sku}</p>
                              </div>
                            )}
                            <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                              <p className="text-sm font-semibold">{tubeLightResult.product.name}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                              <p className="text-sm font-semibold">{tubeLightResult.cct}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p>
                              <p className="text-sm font-semibold">{tubeLightResult.tensao}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                              <p className="text-sm font-semibold">
                                {tubeLightResult.driver.model}
                                {tubeLightResult.driver.code && (
                                  <> <a href={`https://alfaluxprod-c8zmg2fn.manus.space/products/${tubeLightResult.driver.code}`} target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">({tubeLightResult.driver.code})</a></>
                                )}
                              </p>
                            </div>
                            {tubeLightResult.ledModuleWithCCT && (
                              <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Módulo LED</p>
                                <p className="text-sm font-semibold">{tubeLightResult.ledModuleWithCCT}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
                {/* Resumo para Orçamento TUBE LIGHT */}
                <Card className="shadow-sm border-blue-500/30">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      Resumo Para Orçamento
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                        <Input
                          className="h-7 text-xs w-28"
                          placeholder="ex: L1, P2..."
                          value={globalItemEmPlanta}
                          onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                        <Input
                          type="number"
                          className="h-7 text-xs w-16"
                          min={1}
                          placeholder="1"
                          value={globalQty}
                          onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          const preco = getPrecoForControle(tubeLightResult.product, tubeLightResult.controle, tubeLightResult.tensao);
                          const lines = [`${tubeLightResult.product.name} ${tubeLightResult.cct} ${tubeLightResult.tensao}`.toUpperCase()];
                          if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                          navigator.clipboard.writeText(lines.join("\n"));
                          toast.success("Copiado!");
                        }}
                      >
                        <Copy className="w-3 h-3" /> Copiar Resumo
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isAddingToCart}
                        onClick={() => {
                          const preco = getPrecoForControle(tubeLightResult.product, tubeLightResult.controle, tubeLightResult.tensao);
                          const item: CartItemData = {
                            category: "Perfis",
                            sku: tubeLightResult.product.sku ?? "",
                            description: `${tubeLightResult.product.name} ${tubeLightResult.cct} ${tubeLightResult.tensao}`,
                            power: "",
                            cct: tubeLightResult.cct,
                            qty: 1,
                            unitPrice: preco ?? null,
                            totalPrice: preco ?? null,
                            priceFromApi: preco != null,
                            photoUrl: adaptedCatalogs?.tubeLightFotos?.[tubeLightResult.product.sku ?? ""] ?? "",
                            orderSummary: `CÓDIGO: ${tubeLightResult.product.sku}\n${tubeLightResult.product.name.toUpperCase()} ${tubeLightResult.cct} ${tubeLightResult.tensao} COM DRIVER ${tubeLightResult.driver.model.toUpperCase()} (${tubeLightResult.driver.code})`,
                            quoteSummary: `${tubeLightResult.product.name} ${tubeLightResult.cct} ${tubeLightResult.tensao}`.toUpperCase(),
                            moduloLed: tubeLightResult.ledModuleWithCCT ?? "",
                            drivers: `DRIVER ${tubeLightResult.driver.model.toUpperCase()} (${tubeLightResult.driver.code})`,
                            availableCCTs: tubeLightResult.product.ccts,
                            itemEmPlanta: globalItemEmPlanta,
                            ...getCustoForControle(tubeLightResult.product, tubeLightResult.controle, tubeLightResult.tensao),
                          };
                          if (appendToQuoteId) {
                            handleAddItemOrToQuote(item);
                          } else {
                            // TUBE LIGHT só existe em BRANCO — pular modal de cor
                            addItem({ ...item, corPeca: "BRANCO", ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}) });
                            if (setGlobalQty) setGlobalQty(1);
                          }
                        }}
                      >
                        <ShoppingCart className="w-3 h-3" /> {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                        onClick={() => { setAddAcModalOpen(true); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }}
                      >
                        <Wrench className="w-3 h-3" />
                        Incluir Acessório
                        {pendingAccessories.length > 0 && (
                          <span className="ml-1 bg-cyan-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{pendingAccessories.length}</span>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                      onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                    >
                      {(() => {
                        const preco = getPrecoForControle(tubeLightResult.product, tubeLightResult.controle, tubeLightResult.tensao);
                        const drvLines = buildLumDriverLines(tubeLightResult.product.sku ?? "", tubeLightResult.controle, tubeLightResult.tensao, globalQty, tubeLightResult.driver.model, tubeLightResult.driver.code, lumPriceMap, tubeLightResult.product.name ?? undefined, tubeLightResult.driver.corrente ?? null);
                        const lines = [`${tubeLightResult.product.name} ${tubeLightResult.cct} ${tubeLightResult.tensao}`.toUpperCase()];
                        if (drvLines) {
                          if (drvLines.luminariaHasApiPrice && drvLines.priceWithoutDriver != null) {
                            lines.push(`LUMINÁRIAS: ${formatBRL(drvLines.priceWithoutDriver)}`);
                          } else {
                            lines.push(`LUMINÁRIAS: A DEFINIR`);
                          }
                          const totalDrv = drvLines.driverLines.reduce((s, d) => s + (d.driverTotalPrice ?? 0), 0);
                          if (totalDrv > 0) lines.push(`DRIVERS: ${formatBRL(totalDrv)}`);
                          if (preco !== null) lines.push(`TOTAL: ${formatBRL(preco * globalQty)}`);
                        } else if (preco !== null) {
                          lines.push(`PREÇO: ${formatBRL(preco * globalQty)}`);
                        }
                        return lines.join("\n");
                      })()}
                    </div>
                    <PriceBreakdownBlock
                      sku={tubeLightResult.product.sku ?? ""}
                      controle={tubeLightResult.controle}
                      tensao={tubeLightResult.tensao}
                      qty={globalQty}
                      driverModel={tubeLightResult.driver.model}
                      driverCode={tubeLightResult.driver.code}
                      lumPriceMap={lumPriceMap}
                      staticPreco={getPrecoForControle(tubeLightResult.product, tubeLightResult.controle, tubeLightResult.tensao)}
                      productName={tubeLightResult.product.name ?? undefined}
                    />
                    <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão "Copiar Resumo" para copiar diretamente.</p>
                  </CardContent>
                </Card>
              </div>
            )}
            {/* Estado vazio TUBE LIGHT */}
            {productCategory === "Perfis" && tubeLightMode && !tubeLightResult && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">Nenhum cálculo realizado</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">Selecione o produto TUBE LIGHT, tensão e CCT, depois clique em "Calcular TUBE LIGHT".</p>
                </CardContent>
              </Card>
            )}
            {/* Resultado Decorativas */}
            {productCategory === "Decorativas" && decProductKey && (() => {
              const [_dSku, ..._dNP] = (decProductKey ?? '::').split('::');
              const dProd = activeDecorativasCatalog.find(p => p.sku === _dSku && p.name === _dNP.join('::'));
              if (!dProd) return null;
              const dPhoto = dProd.sku ? adaptedCatalogs?.decorativasFotos?.[dProd.sku] ?? null : null;
              const dPreco = dProd.precoOnOff220 ?? null;
              // Driver baseado na tensão selecionada pelo usuário
              const dDriverInfo = dProd.semDriver ? null
                : (decVoltage === "Bivolt" && dProd.driverBivolt?.model ? dProd.driverBivolt
                  : (dProd.driver220?.model ? dProd.driver220
                    : (dProd.driverBivolt?.model ? dProd.driverBivolt : null)));
              const dTensaoEfetiva: "220V" | "Bivolt" = (decVoltage === "Bivolt" && dProd.driverBivolt?.model) ? "Bivolt" : "220V";
              const dDriverStr = dDriverInfo?.model
                ? (dDriverInfo.code ? `${dDriverInfo.model} (${dDriverInfo.code})` : dDriverInfo.model)
                : null;
              return (
                <div className="space-y-4">
                  <Card className="shadow-sm border-amber-500/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        Resultado — Decorativa
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className={dPhoto ? "flex gap-3 items-stretch" : "grid grid-cols-2 gap-2"}>
                        {dPhoto && (
                          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 flex items-center justify-center">
                            <img src={dPhoto} alt={dProd.name} className="w-full h-full object-contain p-2" loading="lazy" />
                          </div>
                        )}
                        <div className={dPhoto ? "grid grid-cols-2 gap-2 flex-1" : "contents"}>
                          {dProd.sku && (
                            <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                              <p className="text-sm font-mono font-semibold text-primary">{dProd.sku}</p>
                            </div>
                          )}
                          <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                            <p className="text-sm font-semibold">{dProd.name}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                            <p className="text-sm font-semibold">{decCCT}</p>
                          </div>
                          {!dProd.semDriver && (dProd.driver220?.model || dProd.driverBivolt?.model) && (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p>
                            <p className="text-sm font-semibold">{dTensaoEfetiva}</p>
                          </div>
                          )}
                          {dDriverInfo && (
                            <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                              <p className="text-sm font-semibold">
                                {dDriverInfo.model}
                                {dDriverInfo.code && (
                                  <> <span className="font-mono text-primary">({dDriverInfo.code})</span></>
                                )}
                              </p>
                            </div>
                          )}
                          {dPreco !== null && (
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Preço Unitário</p>
                              <p className="text-sm font-semibold text-emerald-600">{formatBRL(dPreco)}</p>
                            </div>
                          )}
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
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                          <Input
                            className="h-7 text-xs w-28"
                            placeholder="ex: L1, P2..."
                            value={globalItemEmPlanta}
                            onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                          <Input
                            type="number"
                            className="h-7 text-xs w-16"
                            min={1}
                            placeholder="1"
                            value={globalQty}
                            onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => {
                            const lines = [`${dProd.name} ${decCCT}`.toUpperCase()];
                            if (dDriverStr) lines.push(`DRIVER: ${dDriverStr.toUpperCase()}`);
                            if (dPreco !== null) lines.push(`PREÇO: ${formatBRL(dPreco)}`);
                            navigator.clipboard.writeText(lines.join("\n"));
                            toast.success("Copiado!");
                          }}
                        >
                          <Copy className="w-3 h-3" /> Copiar Resumo
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={isAddingToCart}
                          onClick={() => {
                            const dDrvLines = dDriverInfo ? buildLumDriverLines(dProd.sku ?? "", 'ON/OFF', dTensaoEfetiva, globalQty, dDriverInfo.model, dDriverInfo.code ?? "", lumPriceMap, dProd.name ?? undefined, dDriverInfo.corrente ?? null) : null;
                            const item: CartItemData = {
                              category: "Decorativas",
                              sku: dProd.sku ?? "",
                              description: `${dProd.name} ${decCCT}`,
                              power: "",
                              cct: decCCT,
                              qty: globalQty,
                              unitPrice: dPreco ?? null,
                              totalPrice: dPreco != null ? dPreco * globalQty : null,
                              priceFromApi: dPreco != null,
                              photoUrl: dPhoto ?? "",
                              orderSummary: `${dProd.sku ? `CÓDIGO: ${dProd.sku}\n` : ""}${dProd.name.toUpperCase()} ${decCCT}${dDriverStr ? `\nDRIVER: ${dDriverStr.toUpperCase()}` : ""}`,
                              quoteSummary: `${dProd.name} ${decCCT}`.toUpperCase(),
                              moduloLed: dProd.ledModule ?? "",
                              drivers: dDriverStr ? `DRIVER ${dDriverStr.toUpperCase()}` : "",
                              availableCCTs: dProd.ccts,
                              itemEmPlanta: globalItemEmPlanta,
                              floorName: globalPavimento || undefined,
                              ambiente: globalAmbiente || undefined,
                              ...(dDrvLines ? { driverLines: dDrvLines.driverLines, priceWithoutDriver: dDrvLines.priceWithoutDriver, unitPriceLuminaria: dDrvLines.unitPriceLuminaria, unitPriceDriver: dDrvLines.unitPriceDriver, luminariaHasApiPrice: dDrvLines.luminariaHasApiPrice, custoCorpoBase: dDrvLines.custoCorpoBase, custoDriverBase: dDrvLines.custoDriverBase, markupPadraoApi: dDrvLines.markupPadraoApi, markupMinimoApi: dDrvLines.markupMinimoApi, markupMinimoDriverApi: dDrvLines.markupMinimoDriverApi, driverQtyPerUnit: dDrvLines.drvQtyPerUnit } : {}),
                            };
                            if (appendToQuoteId) {
                              handleAddItemOrToQuote(item);
                            } else {
                              setPendingCartItem(item);
                              setColorModalOpen(true);
                            }
                          }}
                        >
                          <ShoppingCart className="w-3 h-3" /> {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                          onClick={() => { setAddAcModalOpen(true); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }}
                        >
                          <Wrench className="w-3 h-3" />
                          Incluir Acessório
                          {pendingAccessories.length > 0 && (
                            <span className="ml-1 bg-cyan-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{pendingAccessories.length}</span>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                        onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                      >
                        {(() => {
                          const lines = [`${dProd.name} ${decCCT}`.toUpperCase()];
                          if (dDriverStr) lines.push(`DRIVER: ${dDriverStr.toUpperCase()}`);
                          if (dPreco !== null) lines.push(`PREÇO: ${formatBRL(dPreco)}`);
                          return lines.join("\n");
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão "Copiar Resumo" para copiar diretamente.</p>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
            {/* Estado vazio Decorativas */}
            {productCategory === "Decorativas" && activeDecorativasCatalog.length > 0 && !decProductKey && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">Nenhum produto selecionado</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">Selecione a família, o produto e a CCT desejada para adicionar ao carrinho.</p>
                </CardContent>
              </Card>
            )}
            {/* Resultado Balizadores */}
            {productCategory === "Balizadores" && balProductKey && (() => {
              const [_bSku, ..._bNP] = (balProductKey ?? '::').split('::');
              const bProd = activeBalizadoresCatalog.find(p => p.sku === _bSku && p.name === _bNP.join('::'));
              if (!bProd) return null;
              const bPhoto = bProd.sku ? adaptedCatalogs?.balizadoresFotos?.[bProd.sku] ?? null : null;
              const bPreco = bProd.precoOnOff220 ?? null;
              // Driver por produto: bivolt se disponível, senão 220V, senão null (sem driver)
              const bDriverInfo = bProd.semDriver ? null
                : (bProd.driverBivolt?.model ? bProd.driverBivolt
                  : (bProd.driver220?.model ? bProd.driver220 : null));
              const bDriverStr = bDriverInfo?.model
                ? (bDriverInfo.code ? `${bDriverInfo.model} (${bDriverInfo.code})` : bDriverInfo.model)
                : null;
              return (
                <div className="space-y-4">
                  <Card className="shadow-sm border-blue-500/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-blue-500" />
                        Resultado — Balizador
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className={bPhoto ? "flex gap-3 items-stretch" : "grid grid-cols-2 gap-2"}>
                        {bPhoto && (
                          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 flex items-center justify-center">
                            <img src={bPhoto} alt={bProd.name} className="w-full h-full object-contain p-2" loading="lazy" />
                          </div>
                        )}
                        <div className={bPhoto ? "grid grid-cols-2 gap-2 flex-1" : "contents"}>
                          {bProd.sku && (
                            <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p>
                              <p className="text-sm font-mono font-semibold text-primary">{bProd.sku}</p>
                            </div>
                          )}
                          <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                            <p className="text-sm font-semibold">{bProd.name}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p>
                            <p className="text-sm font-semibold">{balCCT}</p>
                          </div>
                          {/* Informação de tensão embutida (apenas produtos sem driver) */}
                          {bProd.semDriver && (
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Alimentação</p>
                              <p className="text-sm font-semibold text-blue-600">
                                {bProd.tensaoEmbutida ? `${bProd.tensaoEmbutida} — Rede` : "Tensão de Rede"}
                              </p>
                            </div>
                          )}
                          {/* Driver (apenas produtos com driver) */}
                          {bDriverInfo && (
                            <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                              <p className="text-sm font-semibold">
                                {bDriverInfo.model}
                                {bDriverInfo.code && (
                                  <> <span className="font-mono text-primary">({bDriverInfo.code})</span></>
                                )}
                              </p>
                            </div>
                          )}
                          {bPreco !== null && (
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Preço Unitário</p>
                              <p className="text-sm font-semibold text-emerald-600">{formatBRL(bPreco)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {bProd.semDriver && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                          <span className="text-xs text-blue-600 font-medium">⚡ Produto sem driver — sempre ON/OFF, liga direto na tensão de rede</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {/* Resumo para Orçamento */}
                  <Card className="shadow-sm border-blue-500/30">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                        Resumo Para Orçamento
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                          <Input
                            className="h-7 text-xs w-28"
                            placeholder="ex: L1, P2..."
                            value={globalItemEmPlanta}
                            onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                          <Input
                            type="number"
                            className="h-7 text-xs w-16"
                            min={1}
                            placeholder="1"
                            value={globalQty}
                            onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => {
                            const lines = [`${bProd.name} ${balCCT}`.toUpperCase()];
                            if (bDriverStr) lines.push(`DRIVER: ${bDriverStr.toUpperCase()}`);
                            if (bPreco !== null) lines.push(`PREÇO: ${formatBRL(bPreco)}`);
                            navigator.clipboard.writeText(lines.join("\n"));
                            toast.success("Copiado!");
                          }}
                        >
                          <Copy className="w-3 h-3" /> Copiar Resumo
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={isAddingToCart}
                          onClick={() => {
                            const bTensao = bProd.driverBivolt?.model ? 'Bivolt' : '220V';
                            const bDrvLines = bDriverInfo ? buildLumDriverLines(bProd.sku ?? "", 'ON/OFF', bTensao, globalQty, bDriverInfo.model, bDriverInfo.code ?? "", lumPriceMap, bProd.name ?? undefined, bDriverInfo.corrente ?? null) : null;
                            const item: CartItemData = {
                              category: "Balizadores",
                              sku: bProd.sku ?? "",
                              description: `${bProd.name} ${balCCT}`,
                              power: "",
                              cct: balCCT,
                              qty: globalQty,
                              unitPrice: bPreco ?? null,
                              totalPrice: bPreco != null ? bPreco * globalQty : null,
                              priceFromApi: bPreco != null,
                              photoUrl: bPhoto ?? "",
                              orderSummary: `${bProd.sku ? `CÓDIGO: ${bProd.sku}\n` : ""}${bProd.name.toUpperCase()} ${balCCT}${bDriverStr ? `\nDRIVER: ${bDriverStr.toUpperCase()}` : ""}`,
                              quoteSummary: `${bProd.name} ${balCCT}`.toUpperCase(),
                              moduloLed: bProd.ledModule ?? "",
                              drivers: bDriverStr ? `DRIVER ${bDriverStr.toUpperCase()}` : "",
                              availableCCTs: bProd.ccts,
                              itemEmPlanta: globalItemEmPlanta,
                              floorName: globalPavimento || undefined,
                              ambiente: globalAmbiente || undefined,
                              ...(bDrvLines ? { driverLines: bDrvLines.driverLines, priceWithoutDriver: bDrvLines.priceWithoutDriver, unitPriceLuminaria: bDrvLines.unitPriceLuminaria, unitPriceDriver: bDrvLines.unitPriceDriver, luminariaHasApiPrice: bDrvLines.luminariaHasApiPrice, custoCorpoBase: bDrvLines.custoCorpoBase, markupPadraoApi: bDrvLines.markupPadraoApi, markupMinimoApi: bDrvLines.markupMinimoApi } : {}),
                            };
                            if (appendToQuoteId) {
                              handleAddItemOrToQuote(item);
                            } else {
                              setPendingCartItem(item);
                              setColorModalOpen(true);
                            }
                          }}
                        >
                          <ShoppingCart className="w-3 h-3" /> {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                          onClick={() => { setAddAcModalOpen(true); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }}
                        >
                          <Wrench className="w-3 h-3" />
                          Incluir Acessório
                          {pendingAccessories.length > 0 && (
                            <span className="ml-1 bg-cyan-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{pendingAccessories.length}</span>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                        onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                      >
                        {(() => {
                          const lines = [`${bProd.name} ${balCCT}`.toUpperCase()];
                          if (bDriverStr) lines.push(`DRIVER: ${bDriverStr.toUpperCase()}`);
                          if (bPreco !== null) lines.push(`PREÇO: ${formatBRL(bPreco)}`);
                          return lines.join("\n");
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão "Copiar Resumo" para copiar diretamente.</p>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
            {/* Estado vazio Balizadores */}
            {productCategory === "Balizadores" && activeBalizadoresCatalog.length > 0 && !balProductKey && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Navigation className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">Nenhum produto selecionado</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">Selecione a família, o produto e a CCT desejada para adicionar ao carrinho.</p>
                </CardContent>
              </Card>
            )}
            {/* Estado vazio Balizadores sem produtos na API */}
            {productCategory === "Balizadores" && activeBalizadoresCatalog.length === 0 && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Navigation className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">Aguardando catálogo</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">Nenhum produto Balizador encontrado na API. Verifique se a categoria está cadastrada no sistema.</p>
                </CardContent>
              </Card>
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
                      const dlPhoto = dlFamilia && dlResult ? resolveDownlightPhoto(dlFamilia, dlResult.product.name) : null;
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
                      {!dlFamilia || !resolveDownlightPhoto(dlFamilia, dlResult.product.name) ? (
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
                      {!dlResult.product.isLamp && (
                      <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Módulo LED</p>
                        <p className="text-sm font-semibold">{dlResult.ledModuleWithCCT}{dlResult.ledModuleEq ? <span className="ml-2 text-xs font-mono text-muted-foreground">({dlResult.ledModuleEq})</span> : null}</p>
                      </div>
                      )}
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
                      {!dlResult.product.isLamp && dlResult.driver.model && (
                      <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                        <p className="text-sm font-semibold">{dlResult.driver.model} <span className="font-mono text-primary">({dlResult.driver.code})</span></p>
                      </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Aviso de acessórios obrigatórios para produtos RGBW */}
                {dlResult.product.isRgbw && (
                  <div className="rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-900/20 p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Acessórios obrigatórios para produto RGBW</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">Adicione obrigatoriamente os seguintes acessórios ao orçamento:</p>
                      <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside space-y-0.5">
                        <li><span className="font-mono font-semibold">EQ00825</span> — LED DRIVER 6 CANAIS 30V/6A POR CANAL RDM <span className="opacity-70">(alimenta até 6 peças)</span></li>
                        <li><span className="font-mono font-semibold">EQ00791</span> — CONTROLADOR LUMIKIT ARQ 2 COM ROTEADOR WIFI 190X115X60MM 1500V BIV</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Resumo para Orçamento */}
                <Card className="shadow-sm border-blue-500/30">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      Resumo Para Orçamento
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                        <Input
                          className="h-7 text-xs w-28"
                          placeholder="ex: L1, P2..."
                          value={globalItemEmPlanta}
                          onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                        <Input
                          type="number"
                          className="h-7 text-xs w-16"
                          min={1}
                          placeholder="1"
                          value={globalQty}
                          onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          const preco = getPrecoForControle(dlResult.product, dlResult.controle, dlResult.tensao);
                          const lines = [`${dlResult.product.name} ${dlResult.cct} ${dlResult.tensao}`.toUpperCase()];
                          if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                          const txt = lines.join("\n");
                          navigator.clipboard.writeText(txt);
                          toast.success("Copiado!");
                        }}
                      >
                        <Copy className="w-3 h-3" /> Copiar Resumo
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isAddingToCart}
                        onClick={() => {
                          const preco = getPrecoForControle(dlResult.product, dlResult.controle, dlResult.tensao);
                          // Usar resolveDownlightPhoto (API primeiro) em vez de getDownlightPhoto (estático)
                          const dlPhoto = resolveDownlightPhoto(dlFamilia, dlResult.product.name);
                          const dlDrvLines = buildLumDriverLines(dlResult.product.sku ?? "", dlResult.controle, dlResult.tensao, 1, dlResult.driver.model, dlResult.driver.code, lumPriceMap, dlResult.product.name ?? undefined, dlResult.driver.corrente ?? null);
                          const item: CartItemData = {
                            category: "Downlights",
                            sku: dlResult.product.sku ?? "",
                            description: `${dlResult.product.name} ${dlResult.cct} ${dlResult.controle} ${dlResult.tensao}`,
                            power: "",
                            cct: dlResult.cct,
                            qty: 1,
                            unitPrice: preco ?? null,
                            totalPrice: preco ?? null,
                            priceFromApi: preco != null,
                            photoUrl: dlPhoto ?? "",
                             orderSummary: (() => { const modEqSuffix = dlResult.ledModuleEq ? ` (${dlResult.ledModuleEq})` : ""; const modName = dlResult.ledModuleWithCCT.toUpperCase().replace(/[^A-Z0-9 ]/g, '').startsWith("MODULO LED") || dlResult.ledModuleWithCCT.toUpperCase().startsWith("ÉDULO LED") ? dlResult.ledModuleWithCCT.toUpperCase() : `MÓDULO LED ${dlResult.ledModuleWithCCT.toUpperCase()}`; const parts: string[] = [`${modName}${modEqSuffix}`]; if (dlResult.product.oticaPrimaria) { parts.push(dlResult.product.oticaPrimaria.toUpperCase()); if (dlResult.product.oticaSecundaria) parts.push(dlResult.product.oticaSecundaria.toUpperCase()); } else if (dlResult.product.otica) { parts.push(dlResult.product.otica.toUpperCase()); } if (dlResult.product.holder) parts.push(dlResult.product.holder.toUpperCase()); if (dlResult.product.dissipador) parts.push(dlResult.product.dissipador.toUpperCase()); const eqSuffix = dlResult.driver.code ? ` (${dlResult.driver.code})` : ""; const drvQty = driverQtyFor(dlResult.product, dlResult.controle, dlResult.tensao); parts.push(`${drvQty}x DRIVER ${dlResult.driver.model.toUpperCase()}${eqSuffix}`); return (`CÓDIGO: ${dlResult.product.sku}\n${dlResult.product.name.toUpperCase()} ${dlResult.cct} ${dlResult.controle.toUpperCase()} ${dlResult.tensao} MONTADA COM ${parts.join(" + ")}`).replace(/\s*-\s*$/, '').trim(); })(),
                            quoteSummary: `${dlResult.product.name} ${dlResult.cct} ${dlResult.controle} ${dlResult.tensao}`.toUpperCase(),
                            moduloLed: (() => { const modEq = dlResult.ledModuleEq ? ` (${dlResult.ledModuleEq})` : ""; const modName = dlResult.ledModuleWithCCT.toUpperCase().replace(/[^A-Z0-9 ]/g, '').startsWith("MODULO LED") ? dlResult.ledModuleWithCCT.toUpperCase() : `MÓDULO LED ${dlResult.ledModuleWithCCT.toUpperCase()}`; const parts: string[] = [`${modName}${modEq}`]; if (dlResult.product.oticaPrimaria) { parts.push(dlResult.product.oticaPrimaria.toUpperCase()); if (dlResult.product.oticaSecundaria) parts.push(dlResult.product.oticaSecundaria.toUpperCase()); } else if (dlResult.product.otica) { parts.push(dlResult.product.otica.toUpperCase()); } if (dlResult.product.holder) parts.push(dlResult.product.holder.toUpperCase()); if (dlResult.product.dissipador) parts.push(dlResult.product.dissipador.toUpperCase()); return parts.join(" + "); })(),
                            drivers: (() => { const eqSuffix = dlResult.driver.code ? ` (${dlResult.driver.code})` : ""; const drvQty = driverQtyFor(dlResult.product, dlResult.controle, dlResult.tensao); return `${drvQty}x DRIVER ${dlResult.driver.model.toUpperCase()}${eqSuffix}`; })(),
                            availableCCTs: dlResult.product.ccts,
                            itemEmPlanta: globalItemEmPlanta,
                            ...(dlDrvLines ? { driverLines: dlDrvLines.driverLines, priceWithoutDriver: dlDrvLines.priceWithoutDriver, unitPriceLuminaria: dlDrvLines.unitPriceLuminaria, unitPriceDriver: dlDrvLines.unitPriceDriver, luminariaHasApiPrice: dlDrvLines.luminariaHasApiPrice, custoCorpoBase: dlDrvLines.custoCorpoBase, custoDriverBase: dlDrvLines.custoDriverBase, markupPadraoApi: dlDrvLines.markupPadraoApi, markupMinimoApi: dlDrvLines.markupMinimoApi, markupMinimoDriverApi: dlDrvLines.markupMinimoDriverApi, driverQtyPerUnit: dlDrvLines.drvQtyPerUnit } : {}),
                          };
                          if (appendToQuoteId) {
                            handleAddItemOrToQuote(item);
                          } else {
                            setPendingCartItem(item);
                            setColorModalOpen(true);
                          }
                        }}
                      >
                        <ShoppingCart className="w-3 h-3" /> {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                        onClick={() => { setAddAcModalOpen(true); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }}
                      >
                        <Wrench className="w-3 h-3" />
                        Incluir Acessório
                        {pendingAccessories.length > 0 && (
                          <span className="ml-1 bg-cyan-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{pendingAccessories.length}</span>
                        )}
                      </Button>
                    </div>
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
                          const preco = getPrecoForControle(dlResult.product, dlResult.controle, dlResult.tensao);
                          const drvLines = buildLumDriverLines(dlResult.product.sku ?? "", dlResult.controle, dlResult.tensao, globalQty, dlResult.driver.model, dlResult.driver.code, lumPriceMap, dlResult.product.name ?? undefined, dlResult.driver.corrente ?? null);
                          const lines = [`${dlResult.product.name} ${dlResult.cct} ${dlResult.tensao}`.toUpperCase()];
                          if (drvLines) {
                            if (drvLines.luminariaHasApiPrice && drvLines.priceWithoutDriver != null) {
                              lines.push(`LUMINÁRIAS: ${formatBRL(drvLines.priceWithoutDriver)}`);
                            } else {
                              lines.push(`LUMINÁRIAS: A DEFINIR`);
                            }
                            const totalDrv = drvLines.driverLines.reduce((s, d) => s + (d.driverTotalPrice ?? 0), 0);
                            if (totalDrv > 0) lines.push(`DRIVERS: ${formatBRL(totalDrv)}`);
                            if (preco !== null) lines.push(`TOTAL: ${formatBRL(preco * globalQty)}`);
                          } else if (preco !== null) {
                            lines.push(`PREÇO: ${formatBRL(preco * globalQty)}`);
                          }
                          return lines.join("\n");
                        })()}
                    </div>
                    <PriceBreakdownBlock
                      sku={dlResult.product.sku ?? ""}
                      controle={dlResult.controle}
                      tensao={dlResult.tensao}
                      qty={globalQty}
                      driverModel={dlResult.driver.model}
                      driverCode={dlResult.driver.code}
                      lumPriceMap={lumPriceMap}
                      staticPreco={getPrecoForControle(dlResult.product, dlResult.controle, dlResult.tensao)}
                      productName={dlResult.product.name ?? undefined}
                    />
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
                          const modEqSuffix = dlResult.ledModuleEq ? ` (${dlResult.ledModuleEq})` : "";
                          const modName = dlResult.ledModuleWithCCT.toUpperCase().replace(/[^A-Z0-9 ]/g, '').startsWith("MODULO LED") ? dlResult.ledModuleWithCCT.toUpperCase() : `MÓDULO LED ${dlResult.ledModuleWithCCT.toUpperCase()}`;
                          const parts: string[] = [`${modName}${modEqSuffix}`];
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
                          const txt = (`CÓDIGO: ${dlResult.product.sku}\n${dlResult.product.name.toUpperCase()} ${dlResult.cct} ${dlResult.controle.toUpperCase()} ${dlResult.tensao} MONTADA COM ${parts.join(" + ")}`).replace(/\s*-\s*$/, '').trim();
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
                          const modEqSuffix2 = dlResult.ledModuleEq ? ` (${dlResult.ledModuleEq})` : "";
                          const modName2 = dlResult.ledModuleWithCCT.toUpperCase().replace(/[^A-Z0-9 ]/g, '').startsWith("MODULO LED") ? dlResult.ledModuleWithCCT.toUpperCase() : `MÓDULO LED ${dlResult.ledModuleWithCCT.toUpperCase()}`;
                          const parts: string[] = [`${modName2}${modEqSuffix2}`];
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
                          return (`CÓDIGO: ${dlResult.product.sku}\n${dlResult.product.name.toUpperCase()} ${dlResult.cct} ${dlResult.controle.toUpperCase()} ${dlResult.tensao} MONTADA COM ${parts.join(" + ")}`).replace(/\s*-\s*$/, '').trim();
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

            {/* Resultado Área Externa (PROOF) */}
            {productCategory === "Área Externa" && aeResult && (
              <div className="space-y-4">
                <Card className="shadow-sm border-green-700/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <TreePine className="w-4 h-4 text-green-600" />
                      Resultado — Área Externa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Foto do produto */}
                    {(() => {
                      const aePhoto = aeFamilia && aeResult ? (adaptedCatalogs?.areaExternaFotos?.[aeResult.product.sku ?? ""] ?? null) : null;
                      return aePhoto ? (
                        <div className="flex gap-3 items-stretch">
                          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 flex items-center justify-center">
                            <img src={aePhoto} alt={aeResult.product.name} className="w-full h-full object-contain p-2" loading="lazy" />
                          </div>
                          <div className="grid grid-cols-2 gap-2 flex-1">
                            <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p><p className="text-sm font-mono font-semibold text-primary">{aeResult.product.sku}</p></div>
                            <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p><p className="text-sm font-semibold">{aeResult.product.name}</p></div>
                            <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p><p className="text-sm font-semibold">{aeResult.tensao}</p></div>
                            <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p><p className="text-sm font-semibold">{aeResult.cct}</p></div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SKU</p><p className="text-sm font-mono font-semibold text-primary">{aeResult.product.sku}</p></div>
                          <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p><p className="text-sm font-semibold">{aeResult.product.name}</p></div>
                          <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tensão</p><p className="text-sm font-semibold">{aeResult.tensao}</p></div>
                          <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CCT</p><p className="text-sm font-semibold">{aeResult.cct}</p></div>
                        </div>
                      );
                    })()}
                    {/* Módulo LED */}
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Módulo LED</p>
                      <p className="text-sm font-semibold">{aeResult.ledModuleWithCCT}{aeResult.ledModuleEq ? <span className="ml-2 text-xs font-mono text-muted-foreground">({aeResult.ledModuleEq})</span> : null}</p>
                    </div>
                    {/* Ótica */}
                    {(aeResult.product.oticaPrimaria || aeResult.product.otica) && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        {aeResult.product.oticaPrimaria ? (
                          <><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ótica</p><p className="text-sm font-semibold">{aeResult.product.oticaPrimaria}</p>{aeResult.product.oticaSecundaria && <p className="text-sm font-semibold">{aeResult.product.oticaSecundaria}</p>}</>
                        ) : (
                          <><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ótica</p><p className="text-sm font-semibold">{aeResult.product.otica}</p></>
                        )}
                      </div>
                    )}
                    {/* Driver */}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver ({driverQtyFor(aeResult.product, aeResult.controle, aeResult.tensao)}x)</p>
                      <p className="text-sm font-semibold">{aeResult.driver.model}{aeResult.driver.code && <span className="font-mono text-primary"> ({aeResult.driver.code})</span>}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Aviso de acessórios obrigatórios para produtos RGBW */}
                {aeResult.product.isRgbw && (
                  <div className="rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-900/20 p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Acessórios obrigatórios para produto RGBW</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">Adicione obrigatoriamente os seguintes acessórios ao orçamento:</p>
                      <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside space-y-0.5">
                        <li><span className="font-mono font-semibold">EQ00825</span> — LED DRIVER 6 CANAIS 30V/6A POR CANAL RDM <span className="opacity-70">(alimenta até 6 peças)</span></li>
                        <li><span className="font-mono font-semibold">EQ00791</span> — CONTROLADOR LUMIKIT ARQ 2 COM ROTEADOR WIFI 190X115X60MM 1500V BIV</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* QuoteSummaryCard Área Externa */}
                {/* Resumo para Orçamento */}
                <Card className="shadow-sm border-blue-500/30">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      Resumo Para Orçamento
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                        <Input
                          className="h-7 text-xs w-28"
                          placeholder="ex: L1, P2..."
                          value={globalItemEmPlanta}
                          onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                        <Input
                          type="number"
                          className="h-7 text-xs w-16"
                          min={1}
                          placeholder="1"
                          value={globalQty}
                          onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          const preco = getPrecoForControle(aeResult.product, aeResult.controle, aeResult.tensao);
                          const lines = [`${aeResult.product.name} ${aeResult.cct} ${aeResult.tensao}`.toUpperCase()];
                          if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                          navigator.clipboard.writeText(lines.join("\n"));
                          toast.success("Copiado!");
                        }}
                      >
                        <Copy className="w-3 h-3" /> Copiar Resumo
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isAddingToCart}
                        onClick={() => {
                          const preco = getPrecoForControle(aeResult.product, aeResult.controle, aeResult.tensao);
                          const aePhoto = aeFamilia ? (adaptedCatalogs?.areaExternaFotos?.[aeResult.product.sku ?? ""] ?? null) : null;
                          const aeDrvLines = buildLumDriverLines(aeResult.product.sku ?? "", aeResult.controle, aeResult.tensao, 1, aeResult.driver.model, aeResult.driver.code, lumPriceMap, aeResult.product.name ?? undefined, aeResult.driver.corrente ?? null);
                          const item: CartItemData = {
                            category: "Área Externa",
                            sku: aeResult.product.sku ?? "",
                            description: `${aeResult.product.name} ${aeResult.cct} ${aeResult.controle} ${aeResult.tensao}`,
                            power: "",
                            cct: aeResult.cct,
                            qty: 1,
                            unitPrice: preco ?? null,
                            totalPrice: preco ?? null,
                            priceFromApi: preco != null,
                            photoUrl: aePhoto ?? "",
                            orderSummary: (() => { const aeModEq = aeResult.ledModuleEq ? ` (${aeResult.ledModuleEq})` : ""; const aeModName = aeResult.ledModuleWithCCT.toUpperCase().replace(/[^A-Z0-9 ]/g, '').startsWith("MODULO LED") ? aeResult.ledModuleWithCCT.toUpperCase() : `MÓDULO LED ${aeResult.ledModuleWithCCT.toUpperCase()}`; const parts: string[] = [`${aeModName}${aeModEq}`]; if (aeResult.product.oticaPrimaria) { parts.push(aeResult.product.oticaPrimaria.toUpperCase()); if (aeResult.product.oticaSecundaria) parts.push(aeResult.product.oticaSecundaria.toUpperCase()); } else if (aeResult.product.otica) { parts.push(aeResult.product.otica.toUpperCase()); } if (aeResult.product.holder) parts.push(aeResult.product.holder.toUpperCase()); if (aeResult.product.dissipador) parts.push(aeResult.product.dissipador.toUpperCase()); const eqSuffix = aeResult.driver.code ? ` (${aeResult.driver.code})` : ""; const drvQty = driverQtyFor(aeResult.product, aeResult.controle, aeResult.tensao); parts.push(`${drvQty}x DRIVER ${aeResult.driver.model.toUpperCase()}${eqSuffix}`); return (`CÓDIGO: ${aeResult.product.sku}\n${aeResult.product.name.toUpperCase()} ${aeResult.cct} ${aeResult.controle.toUpperCase()} ${aeResult.tensao} MONTADA COM ${parts.join(" + ")}`).replace(/\s*-\s*$/, '').trim(); })(),
                            quoteSummary: `${aeResult.product.name} ${aeResult.cct} ${aeResult.controle} ${aeResult.tensao}`.toUpperCase(),
                            moduloLed: (() => { const modEq = aeResult.ledModuleEq ? ` (${aeResult.ledModuleEq})` : ""; const modName = aeResult.ledModuleWithCCT.toUpperCase().replace(/[^A-Z0-9 ]/g, '').startsWith("MODULO LED") ? aeResult.ledModuleWithCCT.toUpperCase() : `MÓDULO LED ${aeResult.ledModuleWithCCT.toUpperCase()}`; const parts: string[] = [`${modName}${modEq}`]; if (aeResult.product.oticaPrimaria) { parts.push(aeResult.product.oticaPrimaria.toUpperCase()); if (aeResult.product.oticaSecundaria) parts.push(aeResult.product.oticaSecundaria.toUpperCase()); } else if (aeResult.product.otica) { parts.push(aeResult.product.otica.toUpperCase()); } if (aeResult.product.holder) parts.push(aeResult.product.holder.toUpperCase()); if (aeResult.product.dissipador) parts.push(aeResult.product.dissipador.toUpperCase()); return parts.join(" + "); })(),
                            drivers: (() => { const eqSuffix = aeResult.driver.code ? ` (${aeResult.driver.code})` : ""; const drvQty = driverQtyFor(aeResult.product, aeResult.controle, aeResult.tensao); return `${drvQty}x DRIVER ${aeResult.driver.model.toUpperCase()}${eqSuffix}`; })(),
                            availableCCTs: aeResult.product.ccts,
                            itemEmPlanta: globalItemEmPlanta,
                            ...(aeDrvLines ? { driverLines: aeDrvLines.driverLines, priceWithoutDriver: aeDrvLines.priceWithoutDriver, unitPriceLuminaria: aeDrvLines.unitPriceLuminaria, unitPriceDriver: aeDrvLines.unitPriceDriver, luminariaHasApiPrice: aeDrvLines.luminariaHasApiPrice, custoCorpoBase: aeDrvLines.custoCorpoBase, custoDriverBase: aeDrvLines.custoDriverBase, markupPadraoApi: aeDrvLines.markupPadraoApi, markupMinimoApi: aeDrvLines.markupMinimoApi, markupMinimoDriverApi: aeDrvLines.markupMinimoDriverApi, driverQtyPerUnit: aeDrvLines.drvQtyPerUnit } : {}),
                          };
                          if (appendToQuoteId) {
                            handleAddItemOrToQuote(item);
                          } else {
                            setPendingCartItem(item);
                            setColorModalOpen(true);
                          }
                        }}
                      >
                        <ShoppingCart className="w-3 h-3" /> {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                        onClick={() => { setAddAcModalOpen(true); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }}
                      >
                        <Wrench className="w-3 h-3" />
                        Incluir Acessório
                        {pendingAccessories.length > 0 && (
                          <span className="ml-1 bg-cyan-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{pendingAccessories.length}</span>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                      onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                    >
                      {(() => {
                          const preco = getPrecoForControle(aeResult.product, aeResult.controle, aeResult.tensao);
                          const drvLines = buildLumDriverLines(aeResult.product.sku ?? "", aeResult.controle, aeResult.tensao, globalQty, aeResult.driver.model, aeResult.driver.code, lumPriceMap, aeResult.product.name ?? undefined, aeResult.driver.corrente ?? null);
                          const lines = [`${aeResult.product.name} ${aeResult.cct} ${aeResult.tensao}`.toUpperCase()];
                          if (drvLines) {
                            if (drvLines.luminariaHasApiPrice && drvLines.priceWithoutDriver != null) {
                              lines.push(`LUMINÁRIAS: ${formatBRL(drvLines.priceWithoutDriver)}`);
                            } else {
                              lines.push(`LUMINÁRIAS: A DEFINIR`);
                            }
                            const totalDrv = drvLines.driverLines.reduce((s, d) => s + (d.driverTotalPrice ?? 0), 0);
                            if (totalDrv > 0) lines.push(`DRIVERS: ${formatBRL(totalDrv)}`);
                            if (preco !== null) lines.push(`TOTAL: ${formatBRL(preco * globalQty)}`);
                          } else if (preco !== null) {
                            lines.push(`PREÇO: ${formatBRL(preco * globalQty)}`);
                          }
                        return lines.join("\n");
                      })()}
                    </div>
                    <PriceBreakdownBlock
                      sku={aeResult.product.sku ?? ""}
                      controle={aeResult.controle}
                      tensao={aeResult.tensao}
                      qty={globalQty}
                      driverModel={aeResult.driver.model}
                      driverCode={aeResult.driver.code}
                      lumPriceMap={lumPriceMap}
                      staticPreco={getPrecoForControle(aeResult.product, aeResult.controle, aeResult.tensao)}
                      productName={aeResult.product.name ?? undefined}
                    />
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
                        const aeModEq2 = aeResult.ledModuleEq ? ` (${aeResult.ledModuleEq})` : "";
                        const aeModName2 = aeResult.ledModuleWithCCT.toUpperCase().replace(/[^A-Z0-9 ]/g, '').startsWith("MODULO LED") ? aeResult.ledModuleWithCCT.toUpperCase() : `MÓDULO LED ${aeResult.ledModuleWithCCT.toUpperCase()}`;
                        const parts: string[] = [`${aeModName2}${aeModEq2}`];
                        if (aeResult.product.oticaPrimaria) { parts.push(aeResult.product.oticaPrimaria.toUpperCase()); if (aeResult.product.oticaSecundaria) parts.push(aeResult.product.oticaSecundaria.toUpperCase()); } else if (aeResult.product.otica) { parts.push(aeResult.product.otica.toUpperCase()); }
                        if (aeResult.product.holder) parts.push(aeResult.product.holder.toUpperCase());
                        if (aeResult.product.dissipador) parts.push(aeResult.product.dissipador.toUpperCase());
                        const eqSuffix = aeResult.driver.code ? ` (${aeResult.driver.code})` : "";
                        const drvQty = driverQtyFor(aeResult.product, aeResult.controle, aeResult.tensao);
                        parts.push(`${drvQty}x DRIVER ${aeResult.driver.model.toUpperCase()}${eqSuffix}`);
                        const txt = (`CÓDIGO: ${aeResult.product.sku}\n${aeResult.product.name.toUpperCase()} ${aeResult.cct} ${aeResult.controle.toUpperCase()} ${aeResult.tensao} MONTADA COM ${parts.join(" + ")}`).replace(/\s*-\s*$/, '').trim();
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
                        const aeModEq3 = aeResult.ledModuleEq ? ` (${aeResult.ledModuleEq})` : "";
                        const aeModName3 = aeResult.ledModuleWithCCT.toUpperCase().replace(/[^A-Z0-9 ]/g, '').startsWith("MODULO LED") ? aeResult.ledModuleWithCCT.toUpperCase() : `MÓDULO LED ${aeResult.ledModuleWithCCT.toUpperCase()}`;
                        const parts: string[] = [`${aeModName3}${aeModEq3}`];
                        if (aeResult.product.oticaPrimaria) { parts.push(aeResult.product.oticaPrimaria.toUpperCase()); if (aeResult.product.oticaSecundaria) parts.push(aeResult.product.oticaSecundaria.toUpperCase()); } else if (aeResult.product.otica) { parts.push(aeResult.product.otica.toUpperCase()); }
                        if (aeResult.product.holder) parts.push(aeResult.product.holder.toUpperCase());
                        if (aeResult.product.dissipador) parts.push(aeResult.product.dissipador.toUpperCase());
                        const eqSuffix = aeResult.driver.code ? ` (${aeResult.driver.code})` : "";
                        const drvQty = driverQtyFor(aeResult.product, aeResult.controle, aeResult.tensao);
                        parts.push(`${drvQty}x DRIVER ${aeResult.driver.model.toUpperCase()}${eqSuffix}`);
                        return (`CÓDIGO: ${aeResult.product.sku}\n${aeResult.product.name.toUpperCase()} ${aeResult.cct} ${aeResult.controle.toUpperCase()} ${aeResult.tensao} MONTADA COM ${parts.join(" + ")}`).replace(/\s*-\s*$/, '').trim();
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão "Copiar Pedido" para copiar diretamente.</p>
                  </CardContent>
                </Card>
              </div>
            )}
            {/* Estado vazio Área Externa */}
            {productCategory === "Área Externa" && !aeResult && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <TreePine className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">Nenhum cálculo realizado</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">Selecione o tipo de instalação, família, produto, tensão e CCT, depois clique em "Calcular Área Externa".</p>
                </CardContent>
              </Card>
            )}

            {/* Resultado SPACE Genérico */}
            {productCategory === "Painéis" && spaceResult && (() => {
              // Quando SPACE_CUSTOMIZADA: buscar produto base pelo SKU correto (R→LDS-6078, Q/Ret→LDS-6079)
              let _srProd: typeof activePanelCatalog[0] | null | undefined = null;
              if (panelProductKey === 'SPACE_CUSTOMIZADA') {
                // EMBUTIR usa LDE-60xx, PENDENTE e SOBREPOR usam LDS-60xx
                const skuPrefix = panelInstalacao === 'EMBUTIR' ? 'LDE' : 'LDS';
                const baseSku = spaceFormat === 'R' ? `${skuPrefix}-6078` : `${skuPrefix}-6079`;
                _srProd = activePanelCatalog.find(p => p.sku === baseSku && p.instalacao === panelInstalacao) ?? activePanelCatalog.find(p => p.sku === baseSku) ?? null;
              } else {
                const [_srSku, ..._srNP] = (panelProductKey ?? '::').split('::');
                _srProd = panelProductKey ? activePanelCatalog.find(p => p.sku === _srSku && p.name === _srNP.join('::')) : null;
              }
              const potAtiva = spacePotencia;
              const potTotal = potAtiva === '5W/m' ? spaceResult.potencia5w : spaceResult.potencia10w;
              const fluxoAtivo = potAtiva === '5W/m' ? spaceResult.fluxoUtil5w : spaceResult.fluxoUtil10w;
              const dimLabel = spaceFormat === 'R'
                ? `Ø${spaceDiametro}mm`
                : spaceFormat === 'Q'
                  ? `${spaceLargura}x${spaceLargura}mm`
                  : `${spaceLargura}x${spaceComprimento}mm`;
              const spaceInstLabel = panelInstalacao === 'SOBREPOR' ? 'S' : panelInstalacao === 'EMBUTIR' ? 'E' : 'P';
              const spaceLabel = `SPACE ${spaceInstLabel} ${spaceFormat === 'R' ? 'R' : spaceFormat === 'Q' ? 'Q' : 'RET'} ${dimLabel}`;
              const driverInfo = _srProd?.driverBivolt;
              // Foto correta por formato e instalação
              const spacePhotoUrl = (() => {
                const skuPrefix = panelInstalacao === 'EMBUTIR' ? 'LDE' : 'LDS';
                if (spaceFormat === 'R') {
                  const rProd = activePanelCatalog.find(p => p.sku === `${skuPrefix}-6078`);
                  return rProd?.fotoUrl ?? _srProd?.fotoUrl ?? '';
                } else {
                  const qProd = activePanelCatalog.find(p => p.sku === `${skuPrefix}-6079`);
                  return qProd?.fotoUrl ?? _srProd?.fotoUrl ?? '';
                }
              })();
              // Quantidade de fontes calculada pela metragem de fita:
              // ≤ 5000mm → 1 fonte (ligação padrão)
              // ≤ 10000mm → 1 fonte (alimentação diferenciada, até 10m por fonte)
              // > 10000mm → Math.ceil(metragemMm / 10000) fontes
              const metragemMm = Math.round(spaceResult.metragem * 1000);
              const driverQty = metragemMm <= 10000 ? 1 : Math.ceil(metragemMm / 10000);
              const driverAlimentacaoDiferenciada = metragemMm > 5000 && metragemMm <= 10000;
              // PriceBreakdownBlock para SPACE
              const spaceDrvLines = (driverInfo && _srProd) ? buildLumDriverLines(
                _srProd.sku ?? '',
                'ON/OFF',
                'Bivolt',
                driverQty,
                driverInfo.model,
                driverInfo.code ?? '',
                lumPriceMap,
                _srProd.name ?? undefined,
                (driverInfo as any).corrente ?? null
              ) : null;
              const orderText = [
                `${spaceLabel} ${potAtiva} ${spaceCCT}`.toUpperCase(),
                `METRAGEM: ${metragemMm}mm de fita LED`,
                `POTÊNCIA TOTAL: ${potTotal}W`,
                `FLUXO ÚTIL: ${fluxoAtivo}lm`,
                `ÁREA DA TELA: ${spaceResult.areaTela.toFixed(2)}m²`,
                driverInfo ? `DRIVER: ${driverQty}x ${driverInfo.model} (${driverInfo.code})${driverAlimentacaoDiferenciada ? ' — alimentação diferenciada' : ''}` : '',
                _srProd?.sku ? `CÓDIGO BASE: ${_srProd.sku}` : '',
              ].filter(Boolean).join('\n');
              return (
                <div className="space-y-4">
                  <Card className="shadow-sm border-teal-500/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                        <Grid2X2 className="w-4 h-4 text-teal-500" />
                        Resultado — SPACE {panelInstalacao === 'SOBREPOR' ? 'Sobrepor' : panelInstalacao === 'EMBUTIR' ? 'Embutir' : 'Pendente'} {spaceFormat === 'R' ? 'Redondo' : spaceFormat === 'Q' ? 'Quadrado' : 'Retangular'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Layout: foto à esquerda + dados à direita (igual downlights) */}
                      <div className="flex gap-3 items-start">
                        {/* Foto quadrada */}
                        {spacePhotoUrl && (
                          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-36 h-36 flex items-center justify-center">
                            <img src={spacePhotoUrl} alt={spaceLabel} className="w-full h-full object-contain p-2" loading="lazy" />
                          </div>
                        )}
                        {/* Dados principais à direita */}
                        <div className="grid grid-cols-2 gap-2 flex-1">
                          <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                            <p className="text-sm font-semibold">{spaceLabel} {potAtiva} {spaceCCT}</p>
                            {_srProd?.sku && <p className="text-xs font-mono text-primary mt-0.5">{_srProd.sku}</p>}
                          </div>
                          <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-500/30">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Metragem de Fita</p>
                            <p className="text-lg font-bold text-teal-700 dark:text-teal-400">{metragemMm}mm</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Área da Tela</p>
                            <p className="text-lg font-bold">{spaceResult.areaTela.toFixed(2)}m²</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Potência Total ({potAtiva})</p>
                            <p className="text-sm font-semibold">{potTotal}W</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Fluxo ÚTIL</p>
                            <p className="text-sm font-semibold">{fluxoAtivo.toLocaleString('pt-BR')} lm</p>
                          </div>
                        </div>
                      </div>
                      {/* Driver e preços abaixo */}
                      <div className="grid grid-cols-2 gap-3">
                        {driverInfo && (
                          <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver{driverQty > 1 ? ` (${driverQty}x)` : ''}</p>
                            <p className="text-sm font-semibold">{driverInfo.model} <span className="font-mono text-primary">({driverInfo.code})</span></p>
                            {driverAlimentacaoDiferenciada && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚡ Alimentação diferenciada — até 10.000mm por fonte</p>
                            )}
                          </div>
                        )}
                        {spaceDrvLines && (
                          <div className="col-span-2">
                            <PriceBreakdownBlock
                              sku={_srProd?.sku ?? ''}
                              controle="ON/OFF"
                              tensao="Bivolt"
                              qty={globalQty}
                              drvModel={driverInfo?.model ?? ''}
                              drvCode={driverInfo?.code ?? ''}
                              lumPriceMap={lumPriceMap}
                              productName={_srProd?.name}
                            />
                          </div>
                        )}
                        <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Potência Comparativa</p>
                          <p className="text-xs text-muted-foreground">Com fita 5W/m: <span className="font-semibold text-foreground">{spaceResult.potencia5w}W</span> ({spaceResult.fluxoUtil5w.toLocaleString('pt-BR')} lm) &nbsp;|&nbsp; Com fita 10W/m: <span className="font-semibold text-foreground">{spaceResult.potencia10w}W</span> ({spaceResult.fluxoUtil10w.toLocaleString('pt-BR')} lm)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resumo para Orçamento SPACE */}
                  <Card className="shadow-sm border-blue-500/30">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                        Resumo Para Orçamento
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                          <Input
                            className="h-7 text-xs w-28"
                            placeholder="ex: L1, P2..."
                            value={globalItemEmPlanta}
                            onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                          <Input
                            type="number"
                            className="h-7 text-xs w-16"
                            min={1}
                            placeholder="1"
                            value={globalQty}
                            onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        </div>
                        <Button
                          variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                          onClick={() => {
                            navigator.clipboard.writeText(`${spaceLabel} ${potAtiva} ${spaceCCT}`.toUpperCase());
                            toast.success('Copiado!');
                          }}
                        >
                          <Copy className="w-3 h-3" /> Copiar Resumo
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={isAddingToCart}
                          onClick={() => {
                            const desc = getSpaceCartDescription(
                              spaceFormat,
                              { diametro: parseInt(spaceDiametro), largura: parseInt(spaceLargura), comprimento: parseInt(spaceComprimento) },
                              potAtiva,
                              spaceCCT
                            );
                            const item: CartItemData = {
                              category: 'Painéis',
                              sku: _srProd?.sku ?? '',
                              description: desc,
                              power: `${potTotal}W`,
                              cct: spaceCCT,
                              qty: globalQty,
                              unitPrice: null,
                              totalPrice: null,
                              priceFromApi: false,
                              photoUrl: spacePhotoUrl ?? _srProd?.fotoUrl ?? '',
                              orderSummary: orderText,
                              quoteSummary: `${spaceLabel} ${potAtiva} ${spaceCCT}`.toUpperCase(),
                              moduloLed: '',
                              drivers: driverInfo ? `${driverQty}x DRIVER ${driverInfo.model} (${driverInfo.code})` : '',
                              availableCCTs: _srProd?.ccts,
                              itemEmPlanta: globalItemEmPlanta,
                              ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}),
                              ...(globalAmbiente ? { ambiente: globalAmbiente } : {}),
                            };
                            if (appendToQuoteId) {
                              handleAddItemOrToQuote(item);
                            } else {
                              setPendingCartItem(item);
                              setColorModalOpen(true);
                            }
                          }}
                        >
                          <ShoppingCart className="w-3 h-3" /> {appendToQuoteId ? 'Enviar ao Orçamento' : 'Enviar ao Carrinho'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                        onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                      >
                        {`${spaceLabel} ${potAtiva} ${spaceCCT}`.toUpperCase()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão para copiar.</p>
                    </CardContent>
                  </Card>

                  {/* Resumo para Pedido SPACE */}
                  <Card className="shadow-sm border-green-500/30">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4 text-green-500" />
                        Resumo Para Pedido
                      </CardTitle>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                        onClick={() => { navigator.clipboard.writeText(orderText); toast.success('Copiado!'); }}
                      >
                        <Copy className="w-3 h-3" /> Copiar Pedido
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                        onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                      >
                        {orderText}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Clique no texto para selecionar ou use o botão para copiar.</p>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

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
                      const pPhoto = panelFamilia && panelResult ? resolvePainelPhoto(panelFamilia, panelResult.product.name) : null;
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
                      {(!panelFamilia || !resolvePainelPhoto(panelFamilia, panelResult.product.name)) && (
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
                          <p className="text-sm font-semibold">{panelResult.ledModuleWithCCT}{panelResult.ledModuleEq ? <span className="ml-2 text-xs font-mono text-muted-foreground">({panelResult.ledModuleEq})</span> : null}</p>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                        <Input
                          className="h-7 text-xs w-28"
                          placeholder="ex: L1, P2..."
                          value={globalItemEmPlanta}
                          onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                        <Input
                          type="number"
                          className="h-7 text-xs w-16"
                          min={1}
                          placeholder="1"
                          value={globalQty}
                          onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          const preco = getPrecoForControle(panelResult.product, panelResult.controle, panelResult.tensao);
                          const lines = [`${panelResult.product.name} ${panelResult.cct} ${panelResult.tensao}`.toUpperCase()];
                          if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                          const txt = lines.join("\n");
                          navigator.clipboard.writeText(txt);
                          toast.success("Copiado!");
                        }}
                      >
                        <Copy className="w-3 h-3" /> Copiar Resumo
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isAddingToCart}
                        onClick={() => {
                          const preco = getPrecoForControle(panelResult.product, panelResult.controle, panelResult.tensao);
                          const pPhoto = panelFamilia ? resolvePainelPhoto(panelFamilia, panelResult.product.name) : null;
                          const panelDrvLines = buildLumDriverLines(panelResult.product.sku ?? "", panelResult.controle, panelResult.tensao, 1, panelResult.driver.model, panelResult.driver.code, lumPriceMap, panelResult.product.name ?? undefined, panelResult.driver.corrente ?? null);
                          const panelDriverTotal = panelDrvLines
                            ? panelDrvLines.driverLines.reduce((sum, line) => sum + (line.driverTotalPrice ?? 0), 0)
                            : 0;
                          const panelTotalPrice = panelDrvLines
                            ? (panelDrvLines.priceWithoutDriver != null || panelDriverTotal > 0
                                ? Math.round(((panelDrvLines.priceWithoutDriver ?? (preco ?? 0)) + panelDriverTotal) * 100) / 100
                                : preco ?? null)
                            : (preco ?? null);
                          const item: CartItemData = {
                            category: "Painéis",
                            sku: panelResult.product.sku ?? "",
                            description: `${panelResult.product.name} ${panelResult.cct} ${panelResult.controle} ${panelResult.tensao}`,
                            power: "",
                            cct: panelResult.cct,
                            qty: 1,
                            unitPrice: preco ?? null,
                            totalPrice: panelTotalPrice,
                            priceFromApi: preco != null || !!panelDrvLines,
                            photoUrl: pPhoto ?? panelResult.product.fotoUrl ?? "",
                            orderSummary: (() => { const parts: string[] = []; if (panelResult.ledModuleWithCCT) { const pModEq = panelResult.ledModuleEq ? ` (${panelResult.ledModuleEq})` : ""; parts.push(`${panelResult.ledModuleWithCCT.toUpperCase()}${pModEq}`); } const eqSuffix = panelResult.driver.code ? ` (${panelResult.driver.code})` : ""; const drvQty = driverQtyFor(panelResult.product, panelResult.controle, panelResult.tensao); parts.push(`${drvQty}x DRIVER ${panelResult.driver.model.toUpperCase()}${eqSuffix}`); const skuLine = panelResult.product.sku ? `CÓDIGO: ${panelResult.product.sku}\n` : ""; const isOrbit = panelResult.product.familia.toUpperCase().startsWith("ORBIT"); const orbitObs = isOrbit ? "\nOBS: programar driver em 200mA" : ""; return `${skuLine}${panelResult.product.name.toUpperCase()} ${panelResult.cct} ${panelResult.controle.toUpperCase()} ${panelResult.tensao} MONTADA COM ${parts.join(" + ")}${orbitObs}`; })(),
                            quoteSummary: `${panelResult.product.name} ${panelResult.cct} ${panelResult.controle} ${panelResult.tensao}`.toUpperCase(),
                            moduloLed: panelResult.ledModuleWithCCT ?? "",
                            drivers: (() => { const eqSuffix = panelResult.driver.code ? ` (${panelResult.driver.code})` : ""; const drvQty = driverQtyFor(panelResult.product, panelResult.controle, panelResult.tensao); return `${drvQty}x DRIVER ${panelResult.driver.model.toUpperCase()}${eqSuffix}`; })(),
                            availableCCTs: panelResult.product.ccts,
                            itemEmPlanta: globalItemEmPlanta,
                            ...(panelDrvLines ? { driverLines: panelDrvLines.driverLines, priceWithoutDriver: panelDrvLines.priceWithoutDriver, unitPriceLuminaria: panelDrvLines.unitPriceLuminaria, unitPriceDriver: panelDrvLines.unitPriceDriver, luminariaHasApiPrice: panelDrvLines.luminariaHasApiPrice, custoCorpoBase: panelDrvLines.custoCorpoBase, custoDriverBase: panelDrvLines.custoDriverBase, markupPadraoApi: panelDrvLines.markupPadraoApi, markupMinimoApi: panelDrvLines.markupMinimoApi, markupMinimoDriverApi: panelDrvLines.markupMinimoDriverApi, driverQtyPerUnit: panelDrvLines.drvQtyPerUnit } : {}),
                          };
                          if (appendToQuoteId) {
                            handleAddItemOrToQuote(item);
                          } else if (panelResult.product.corUnica) {
                            // Produto só existe em uma cor: pular modal e adicionar diretamente
                            addItem({ ...item, corPeca: panelResult.product.corUnica, ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}), ...(globalAmbiente ? { ambiente: globalAmbiente } : {}) });
                          } else {
                            setPendingCartItem(item);
                            setColorModalOpen(true);
                          }
                        }}
                      >
                        <ShoppingCart className="w-3 h-3" /> {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                        onClick={() => { setAddAcModalOpen(true); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }}
                      >
                        <Wrench className="w-3 h-3" />
                        Incluir Acessório
                        {pendingAccessories.length > 0 && (
                          <span className="ml-1 bg-cyan-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{pendingAccessories.length}</span>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                      onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                    >
                      {(() => {
                          const preco = getPrecoForControle(panelResult.product, panelResult.controle, panelResult.tensao);
                          const drvLines = buildLumDriverLines(panelResult.product.sku ?? "", panelResult.controle, panelResult.tensao, globalQty, panelResult.driver.model, panelResult.driver.code, lumPriceMap, panelResult.product.name ?? undefined, panelResult.driver.corrente ?? null);
                          const lines = [`${panelResult.product.name} ${panelResult.cct} ${panelResult.tensao}`.toUpperCase()];
                          if (drvLines) {
                            if (drvLines.luminariaHasApiPrice && drvLines.priceWithoutDriver != null) {
                              lines.push(`LUMINÁRIAS: ${formatBRL(drvLines.priceWithoutDriver)}`);
                            } else {
                              lines.push(`LUMINÁRIAS: A DEFINIR`);
                            }
                            const totalDrv = drvLines.driverLines.reduce((s, d) => s + (d.driverTotalPrice ?? 0), 0);
                            if (totalDrv > 0) lines.push(`DRIVERS: ${formatBRL(totalDrv)}`);
                            if (preco !== null) lines.push(`TOTAL: ${formatBRL(preco * globalQty)}`);
                          } else if (preco !== null) {
                            lines.push(`PREÇO: ${formatBRL(preco * globalQty)}`);
                          }
                          return lines.join("\n");
                        })()
                      }</div>
                    <PriceBreakdownBlock
                      sku={panelResult.product.sku ?? ""}
                      controle={panelResult.controle}
                      tensao={panelResult.tensao}
                      qty={globalQty}
                      driverModel={panelResult.driver.model}
                      driverCode={panelResult.driver.code}
                      lumPriceMap={lumPriceMap}
                      staticPreco={getPrecoForControle(panelResult.product, panelResult.controle, panelResult.tensao)}
                      productName={panelResult.product.name ?? undefined}
                    />
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
                        if (panelResult.ledModuleWithCCT) { const pEq = panelResult.ledModuleEq ? ` (${panelResult.ledModuleEq})` : ""; parts.push(`${panelResult.ledModuleWithCCT.toUpperCase()}${pEq}`); }
                        { const eqSuffix = panelResult.driver.code ? ` (${panelResult.driver.code})` : ""; const drvQty = driverQtyFor(panelResult.product, panelResult.controle, panelResult.tensao); parts.push(`${drvQty}x DRIVER ${panelResult.driver.model.toUpperCase()}${eqSuffix}`); }
                        const skuLine = panelResult.product.sku ? `CÓDIGO: ${panelResult.product.sku}\n` : "";
                        const isOrbitFamily = panelResult.product.familia.toUpperCase().startsWith("ORBIT");
                        const orbitObs = isOrbitFamily ? "\nOBS: programar driver em 200mA" : "";
                        const txt = `${skuLine}${panelResult.product.name.toUpperCase()} ${panelResult.cct} ${panelResult.controle.toUpperCase()} ${panelResult.tensao} MONTADA COM ${parts.join(" + ")}${orbitObs}`;
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
                        if (panelResult.ledModuleWithCCT) { const pEq2 = panelResult.ledModuleEq ? ` (${panelResult.ledModuleEq})` : ""; parts.push(`${panelResult.ledModuleWithCCT.toUpperCase()}${pEq2}`); }
                        { const eqSuffix = panelResult.driver.code ? ` (${panelResult.driver.code})` : ""; const drvQty = driverQtyFor(panelResult.product, panelResult.controle, panelResult.tensao); parts.push(`${drvQty}x DRIVER ${panelResult.driver.model.toUpperCase()}${eqSuffix}`); }
                        const skuLine = panelResult.product.sku ? `CÓDIGO: ${panelResult.product.sku}\n` : "";
                        const isOrbitFamily = panelResult.product.familia.toUpperCase().startsWith("ORBIT");
                        const orbitObs = isOrbitFamily ? "\nOBS: programar driver em 200mA" : "";
                        return `${skuLine}${panelResult.product.name.toUpperCase()} ${panelResult.cct} ${panelResult.controle.toUpperCase()} ${panelResult.tensao} MONTADA COM ${parts.join(" + ")}${orbitObs}`;
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
                    {arandelaResult.ledModuleWithCCT && !arandelaResult.product.isLamp && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Módulo LED</p>
                        <p className="text-sm font-semibold">{arandelaResult.ledModuleWithCCT}{arandelaResult.ledModuleEq ? <span className="ml-2 text-xs font-mono text-muted-foreground">({arandelaResult.ledModuleEq})</span> : null}</p>
                      </div>
                    )}
                    {/* Driver */}
                    {!arandelaResult.product.isLamp && arandelaResult.driver.model && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                      <p className="text-sm font-bold">{arandelaResult.driver.model} <span className="font-mono text-primary">({arandelaResult.driver.code})</span></p>
                    </div>
                    )}
                  </CardContent>
                </Card>
                {/* Aviso de acessórios obrigatórios para produtos RGBW */}
                {arandelaResult.product.isRgbw && (
                  <div className="rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-900/20 p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Acessórios obrigatórios para produto RGBW</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">Adicione obrigatoriamente os seguintes acessórios ao orçamento:</p>
                      <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside space-y-0.5">
                        <li><span className="font-mono font-semibold">EQ00825</span> — LED DRIVER 6 CANAIS 30V/6A POR CANAL RDM <span className="opacity-70">(alimenta até 6 peças)</span></li>
                        <li><span className="font-mono font-semibold">EQ00791</span> — CONTROLADOR LUMIKIT ARQ 2 COM ROTEADOR WIFI 190X115X60MM 1500V BIV</li>
                      </ul>
                    </div>
                  </div>
                )}
                {/* Resumo para Orçamento */}
                <Card className="shadow-sm border-blue-500/30">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      Resumo Para Orçamento
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                        <Input
                          className="h-7 text-xs w-28"
                          placeholder="ex: L1, P2..."
                          value={globalItemEmPlanta}
                          onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                        <Input
                          type="number"
                          className="h-7 text-xs w-16"
                          min={1}
                          placeholder="1"
                          value={globalQty}
                          onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          const preco = getPrecoForControle(arandelaResult.product, arandelaResult.controle, arandelaResult.tensao);
                          const lines = [`${arandelaResult.product.name} ${arandelaResult.cct} ${arandelaResult.tensao}`.toUpperCase()];
                          if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                          const txt = lines.join("\n");
                          navigator.clipboard.writeText(txt);
                          toast.success("Copiado!");
                        }}
                      >
                        <Copy className="w-3 h-3" /> Copiar Orçamento
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isAddingToCart}
                        onClick={() => {
                          const preco = getPrecoForControle(arandelaResult.product, arandelaResult.controle, arandelaResult.tensao);
                          const arandelaDrvLines = buildLumDriverLines(arandelaResult.product.sku ?? "", arandelaResult.controle, arandelaResult.tensao, 1, arandelaResult.driver.model, arandelaResult.driver.code, lumPriceMap, arandelaResult.product.name ?? undefined, arandelaResult.driver.corrente ?? null);
                          const item: CartItemData = {
                            category: "Arandelas",
                            sku: arandelaResult.product.sku ?? "",
                            description: `${arandelaResult.product.name} ${arandelaResult.cct} ${arandelaResult.controle} ${arandelaResult.tensao}`,
                            power: "",
                            cct: arandelaResult.cct,
                            qty: 1,
                            unitPrice: preco ?? null,
                            totalPrice: preco ?? null,
                            priceFromApi: preco != null,
                            photoUrl: arandelaResult.product.fotoUrl ?? "",
                            orderSummary: (() => { const parts: string[] = []; if (arandelaResult.ledModuleWithCCT) { const mQtd = arandelaResult.product.ledModuleQtd; const mPrefix = mQtd != null ? `${mQtd}x ` : ""; const arModEq = arandelaResult.ledModuleEq ? ` (${arandelaResult.ledModuleEq})` : ""; parts.push(`${mPrefix}${arandelaResult.ledModuleWithCCT.toUpperCase()}${arModEq}`); } const eqSuffix = arandelaResult.driver.code ? ` (${arandelaResult.driver.code})` : ""; const drvQty = driverQtyFor(arandelaResult.product, arandelaResult.controle, arandelaResult.tensao); parts.push(`${drvQty}x DRIVER ${arandelaResult.driver.model.toUpperCase()}${eqSuffix}`); const skuLine = arandelaResult.product.sku ? `CÓDIGO: ${arandelaResult.product.sku}\n` : ""; return `${skuLine}${arandelaResult.product.name.toUpperCase()} ${arandelaResult.cct} ${arandelaResult.controle.toUpperCase()} ${arandelaResult.tensao} MONTADA COM ${parts.join(" + ")}`; })(),
                            quoteSummary: `${arandelaResult.product.name} ${arandelaResult.cct} ${arandelaResult.controle} ${arandelaResult.tensao}`.toUpperCase(),
                            moduloLed: (() => { const mQtd = arandelaResult.product.ledModuleQtd; const mPrefix = mQtd != null ? `${mQtd}x ` : ""; const arModEq = arandelaResult.ledModuleEq ? ` (${arandelaResult.ledModuleEq})` : ""; const parts: string[] = [`${mPrefix}${arandelaResult.ledModuleWithCCT?.toUpperCase() ?? ""}${arModEq}`]; if (arandelaResult.product.otica) parts.push(arandelaResult.product.otica.toUpperCase()); return parts.filter(Boolean).join(" + ") || (arandelaResult.ledModuleWithCCT ?? ""); })(),
                            drivers: (() => { const eqSuffix = arandelaResult.driver.code ? ` (${arandelaResult.driver.code})` : ""; const drvQty = driverQtyFor(arandelaResult.product, arandelaResult.controle, arandelaResult.tensao); return `${drvQty}x DRIVER ${arandelaResult.driver.model.toUpperCase()}${eqSuffix}`; })(),
                            availableCCTs: arandelaResult.product.ccts,
                            itemEmPlanta: globalItemEmPlanta,
                            ...(arandelaDrvLines ? { driverLines: arandelaDrvLines.driverLines, priceWithoutDriver: arandelaDrvLines.priceWithoutDriver, unitPriceLuminaria: arandelaDrvLines.unitPriceLuminaria, unitPriceDriver: arandelaDrvLines.unitPriceDriver, luminariaHasApiPrice: arandelaDrvLines.luminariaHasApiPrice, custoCorpoBase: arandelaDrvLines.custoCorpoBase, custoDriverBase: arandelaDrvLines.custoDriverBase, markupPadraoApi: arandelaDrvLines.markupPadraoApi, markupMinimoApi: arandelaDrvLines.markupMinimoApi, markupMinimoDriverApi: arandelaDrvLines.markupMinimoDriverApi, driverQtyPerUnit: arandelaDrvLines.drvQtyPerUnit } : {}),
                          };
                          if (appendToQuoteId) {
                            handleAddItemOrToQuote(item);
                          } else {
                            setPendingCartItem(item);
                            setColorModalOpen(true);
                          }
                        }}
                      >
                        <ShoppingCart className="w-3 h-3" /> {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                        onClick={() => { setAddAcModalOpen(true); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }}
                      >
                        <Wrench className="w-3 h-3" />
                        Incluir Acessório
                        {pendingAccessories.length > 0 && (
                          <span className="ml-1 bg-cyan-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{pendingAccessories.length}</span>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                      onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                    >
                      {(() => {
                          const preco = getPrecoForControle(arandelaResult.product, arandelaResult.controle, arandelaResult.tensao);
                          const drvLines = buildLumDriverLines(arandelaResult.product.sku ?? "", arandelaResult.controle, arandelaResult.tensao, globalQty, arandelaResult.driver.model, arandelaResult.driver.code, lumPriceMap, arandelaResult.product.name ?? undefined, arandelaResult.driver.corrente ?? null);
                          const lines = [`${arandelaResult.product.name} ${arandelaResult.cct} ${arandelaResult.tensao}`.toUpperCase()];
                          if (drvLines) {
                            if (drvLines.luminariaHasApiPrice && drvLines.priceWithoutDriver != null) {
                              lines.push(`LUMINÁRIAS: ${formatBRL(drvLines.priceWithoutDriver)}`);
                            } else {
                              lines.push(`LUMINÁRIAS: A DEFINIR`);
                            }
                            const totalDrv = drvLines.driverLines.reduce((s, d) => s + (d.driverTotalPrice ?? 0), 0);
                            if (totalDrv > 0) lines.push(`DRIVERS: ${formatBRL(totalDrv)}`);
                            if (preco !== null) lines.push(`TOTAL: ${formatBRL(preco * globalQty)}`);
                          } else if (preco !== null) {
                            lines.push(`PREÇO: ${formatBRL(preco * globalQty)}`);
                          }
                          return lines.join("\n");
                        })()}
                    </div>
                    <PriceBreakdownBlock
                      sku={arandelaResult.product.sku ?? ""}
                      controle={arandelaResult.controle}
                      tensao={arandelaResult.tensao}
                      qty={globalQty}
                      driverModel={arandelaResult.driver.model}
                      driverCode={arandelaResult.driver.code}
                      lumPriceMap={lumPriceMap}
                      staticPreco={getPrecoForControle(arandelaResult.product, arandelaResult.controle, arandelaResult.tensao)}
                      productName={arandelaResult.product.name ?? undefined}
                    />
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
                        if (arandelaResult.ledModuleWithCCT) { const mQtd = arandelaResult.product.ledModuleQtd; const mPrefix = mQtd != null ? `${mQtd}x ` : ""; const arEq = arandelaResult.ledModuleEq ? ` (${arandelaResult.ledModuleEq})` : ""; parts.push(`${mPrefix}${arandelaResult.ledModuleWithCCT.toUpperCase()}${arEq}`); }
                        { const eqSuffix = arandelaResult.driver.code ? ` (${arandelaResult.driver.code})` : ""; const drvQty = driverQtyFor(arandelaResult.product, arandelaResult.controle, arandelaResult.tensao); parts.push(`${drvQty}x DRIVER ${arandelaResult.driver.model.toUpperCase()}${eqSuffix}`); }
                        const skuLine = arandelaResult.product.sku ? `CÓDIGO: ${arandelaResult.product.sku}\n` : "";
                        const txt = `${skuLine}${arandelaResult.product.name.toUpperCase()} ${arandelaResult.cct} ${arandelaResult.controle.toUpperCase()} ${arandelaResult.tensao} MONTADA COM ${parts.join(" + ")}`;
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
                        if (arandelaResult.ledModuleWithCCT) { const mQtd = arandelaResult.product.ledModuleQtd; const mPrefix = mQtd != null ? `${mQtd}x ` : ""; const arEq2 = arandelaResult.ledModuleEq ? ` (${arandelaResult.ledModuleEq})` : ""; parts.push(`${mPrefix}${arandelaResult.ledModuleWithCCT.toUpperCase()}${arEq2}`); }
                        { const eqSuffix = arandelaResult.driver.code ? ` (${arandelaResult.driver.code})` : ""; const drvQty = driverQtyFor(arandelaResult.product, arandelaResult.controle, arandelaResult.tensao); parts.push(`${drvQty}x DRIVER ${arandelaResult.driver.model.toUpperCase()}${eqSuffix}`); }
                        const skuLine = arandelaResult.product.sku ? `CÓDIGO: ${arandelaResult.product.sku}\n` : "";
                        return `${skuLine}${arandelaResult.product.name.toUpperCase()} ${arandelaResult.cct} ${arandelaResult.controle.toUpperCase()} ${arandelaResult.tensao} MONTADA COM ${parts.join(" + ")}`;
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
                    {spotResult.ledModuleWithCCT && !spotResult.product.isLamp && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Módulo LED</p>
                        <p className="text-sm font-semibold">{spotResult.ledModuleWithCCT}{spotResult.ledModuleEq ? <span className="ml-2 text-xs font-mono text-muted-foreground">({spotResult.ledModuleEq})</span> : null}</p>
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
                    {!spotResult.product.isLamp && spotResult.driver.model && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Driver</p>
                      <p className="text-sm font-bold">{spotResult.driver.model} <span className="font-mono text-primary">({spotResult.driver.code})</span></p>
                    </div>
                    )}
                  </CardContent>
                </Card>
                {/* Aviso de acessórios obrigatórios para produtos RGBW */}
                {spotResult.product.isRgbw && (
                  <div className="rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-900/20 p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Acessórios obrigatórios para produto RGBW</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">Adicione obrigatoriamente os seguintes acessórios ao orçamento:</p>
                      <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside space-y-0.5">
                        <li><span className="font-mono font-semibold">EQ00825</span> — LED DRIVER 6 CANAIS 30V/6A POR CANAL RDM <span className="opacity-70">(alimenta até 6 peças)</span></li>
                        <li><span className="font-mono font-semibold">EQ00791</span> — CONTROLADOR LUMIKIT ARQ 2 COM ROTEADOR WIFI 190X115X60MM 1500V BIV</li>
                      </ul>
                    </div>
                  </div>
                )}
                {/* Resumo para Orçamento */}
                <Card className="shadow-sm border-blue-500/30">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      Resumo Para Orçamento
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                        <Input
                          className="h-7 text-xs w-28"
                          placeholder="ex: L1, P2..."
                          value={globalItemEmPlanta}
                          onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                        <Input
                          type="number"
                          className="h-7 text-xs w-16"
                          min={1}
                          placeholder="1"
                          value={globalQty}
                          onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          const preco = getPrecoForControle(spotResult.product, spotResult.controle, spotResult.tensao);
                          const lines = [`${spotResult.product.name} ${spotResult.cct} ${spotResult.tensao}`.toUpperCase()];
                          if (preco !== null) lines.push(`PREÇO: ${formatBRL(preco)}`);
                          const txt = lines.join("\n");
                          navigator.clipboard.writeText(txt);
                          toast.success("Copiado!");
                        }}
                      >
                        <Copy className="w-3 h-3" /> Copiar Resumo
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isAddingToCart}
                        onClick={() => {
                          const preco = getPrecoForControle(spotResult.product, spotResult.controle, spotResult.tensao);
                          const spotDrvLines = buildLumDriverLines(spotResult.product.sku ?? "", spotResult.controle, spotResult.tensao, 1, spotResult.driver.model, spotResult.driver.code, lumPriceMap, spotResult.product.name ?? undefined, spotResult.driver.corrente ?? null);
                          const item: CartItemData = {
                            category: "Spots",
                            sku: spotResult.product.sku ?? "",
                            description: `${spotResult.product.name} ${spotResult.cct} ${spotResult.controle} ${spotResult.tensao}`,
                            power: "",
                            cct: spotResult.cct,
                            qty: 1,
                            unitPrice: preco ?? null,
                            totalPrice: preco ?? null,
                            priceFromApi: preco != null,
                            photoUrl: spotResult.product.fotoUrl ?? "",
                            orderSummary: (() => { const parts: string[] = []; if (spotResult.ledModuleWithCCT) { const spModEq = spotResult.ledModuleEq ? ` (${spotResult.ledModuleEq})` : ""; parts.push(`${spotResult.ledModuleWithCCT.toUpperCase()}${spModEq}`); } if (spotResult.product.oticaPrimaria) { parts.push(spotResult.product.oticaPrimaria.toUpperCase()); if (spotResult.product.oticaSecundaria) parts.push(spotResult.product.oticaSecundaria.toUpperCase()); } else if (spotResult.product.otica) { parts.push(spotResult.product.otica.toUpperCase()); } if (spotResult.product.holder) parts.push(spotResult.product.holder.toUpperCase()); const eqSuffix = spotResult.driver.code ? ` (${spotResult.driver.code})` : ""; const drvQty = driverQtyFor(spotResult.product, spotResult.controle, spotResult.tensao); parts.push(`${drvQty}x DRIVER ${spotResult.driver.model.toUpperCase()}${eqSuffix}`); const skuLine = spotResult.product.sku ? `CÓDIGO: ${spotResult.product.sku}\n` : ""; return `${skuLine}${spotResult.product.name.toUpperCase()} ${spotResult.cct} ${spotResult.controle.toUpperCase()} ${spotResult.tensao} MONTADA COM ${parts.join(" + ")}`; })(),
                            quoteSummary: `${spotResult.product.name} ${spotResult.cct} ${spotResult.controle} ${spotResult.tensao}`.toUpperCase(),
                            moduloLed: (() => { const parts: string[] = []; if (spotResult.ledModuleWithCCT) { const spModEq = spotResult.ledModuleEq ? ` (${spotResult.ledModuleEq})` : ""; parts.push(`${spotResult.ledModuleWithCCT.toUpperCase()}${spModEq}`); } if (spotResult.product.oticaPrimaria) { parts.push(spotResult.product.oticaPrimaria.toUpperCase()); if (spotResult.product.oticaSecundaria) parts.push(spotResult.product.oticaSecundaria.toUpperCase()); } else if (spotResult.product.otica) { parts.push(spotResult.product.otica.toUpperCase()); } if (spotResult.product.holder) parts.push(spotResult.product.holder.toUpperCase()); if (spotResult.product.dissipador) parts.push(spotResult.product.dissipador.toUpperCase()); return parts.join(" + ") || (spotResult.ledModuleWithCCT ?? ""); })(),
                            drivers: (() => { const eqSuffix = spotResult.driver.code ? ` (${spotResult.driver.code})` : ""; const drvQty = driverQtyFor(spotResult.product, spotResult.controle, spotResult.tensao); return `${drvQty}x DRIVER ${spotResult.driver.model.toUpperCase()}${eqSuffix}`; })(),
                            availableCCTs: spotResult.product.ccts,
                            itemEmPlanta: globalItemEmPlanta,
                            ...(spotDrvLines ? { driverLines: spotDrvLines.driverLines, priceWithoutDriver: spotDrvLines.priceWithoutDriver, unitPriceLuminaria: spotDrvLines.unitPriceLuminaria, unitPriceDriver: spotDrvLines.unitPriceDriver, luminariaHasApiPrice: spotDrvLines.luminariaHasApiPrice, custoCorpoBase: spotDrvLines.custoCorpoBase, custoDriverBase: spotDrvLines.custoDriverBase, markupPadraoApi: spotDrvLines.markupPadraoApi, markupMinimoApi: spotDrvLines.markupMinimoApi, markupMinimoDriverApi: spotDrvLines.markupMinimoDriverApi, driverQtyPerUnit: spotDrvLines.drvQtyPerUnit } : {}),
                          };
                          if (appendToQuoteId) {
                            handleAddItemOrToQuote(item);
                          } else {
                            setPendingCartItem(item);
                            setColorModalOpen(true);
                          }
                        }}
                      >
                        <ShoppingCart className="w-3 h-3" /> {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                        onClick={() => { setAddAcModalOpen(true); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }}
                      >
                        <Wrench className="w-3 h-3" />
                        Incluir Acessório
                        {pendingAccessories.length > 0 && (
                          <span className="ml-1 bg-cyan-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{pendingAccessories.length}</span>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="text-sm font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap cursor-text select-all"
                      onClick={(e) => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(e.currentTarget); sel?.removeAllRanges(); sel?.addRange(range); }}
                    >
                      {(() => {
                          const preco = getPrecoForControle(spotResult.product, spotResult.controle, spotResult.tensao);
                          const drvLines = buildLumDriverLines(spotResult.product.sku ?? "", spotResult.controle, spotResult.tensao, globalQty, spotResult.driver.model, spotResult.driver.code, lumPriceMap, spotResult.product.name ?? undefined, spotResult.driver.corrente ?? null);
                          const lines = [`${spotResult.product.name} ${spotResult.cct} ${spotResult.tensao}`.toUpperCase()];
                          if (drvLines) {
                            if (drvLines.luminariaHasApiPrice && drvLines.priceWithoutDriver != null) {
                              lines.push(`LUMINÁRIAS: ${formatBRL(drvLines.priceWithoutDriver)}`);
                            } else {
                              lines.push(`LUMINÁRIAS: A DEFINIR`);
                            }
                            const totalDrv = drvLines.driverLines.reduce((s, d) => s + (d.driverTotalPrice ?? 0), 0);
                            if (totalDrv > 0) lines.push(`DRIVERS: ${formatBRL(totalDrv)}`);
                            if (preco !== null) lines.push(`TOTAL: ${formatBRL(preco * globalQty)}`);
                          } else if (preco !== null) {
                            lines.push(`PREÇO: ${formatBRL(preco * globalQty)}`);
                          }
                          return lines.join("\n");
                        })()}
                    </div>
                    <PriceBreakdownBlock
                      sku={spotResult.product.sku ?? ""}
                      controle={spotResult.controle}
                      tensao={spotResult.tensao}
                      qty={globalQty}
                      driverModel={spotResult.driver.model}
                      driverCode={spotResult.driver.code}
                      lumPriceMap={lumPriceMap}
                      staticPreco={getPrecoForControle(spotResult.product, spotResult.controle, spotResult.tensao)}
                      productName={spotResult.product.name ?? undefined}
                    />
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
                         if (spotResult.ledModuleWithCCT) { const spEq = spotResult.ledModuleEq ? ` (${spotResult.ledModuleEq})` : ""; parts.push(`${spotResult.ledModuleWithCCT.toUpperCase()}${spEq}`); }
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
                        const txt = `${skuLine}${spotResult.product.name.toUpperCase()} ${spotResult.cct} ${spotResult.controle.toUpperCase()} ${spotResult.tensao} MONTADA COM ${parts.join(" + ")}`;
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
                         if (spotResult.ledModuleWithCCT) { const spEq2 = spotResult.ledModuleEq ? ` (${spotResult.ledModuleEq})` : ""; parts.push(`${spotResult.ledModuleWithCCT.toUpperCase()}${spEq2}`); }
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
                         
                        return `${skuLine}${spotResult.product.name.toUpperCase()} ${spotResult.cct} ${spotResult.controle.toUpperCase()} ${spotResult.tensao} MONTADA COM ${parts.join(" + ")}`;
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
            {productCategory === "Painéis" && !panelResult && !spaceResult && (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Grid2X2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-semibold text-foreground font-display">Nenhum cálculo realizado</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">Selecione a instalação, família e produto. Para SPACE genérico, informe as dimensões e clique em "Calcular SPACE". Para outros painéis, selecione tensão e CCT e clique em "Calcular Painél".</p>
                </CardContent>
              </Card>
            )}

            {/* ── Revenda: painel de resumo do produto selecionado ── */}
            {productCategory === "Revenda" && (() => {
              const rvProduct = rvSelectedSku
                ? revendaProducts.find(p => p.sku === rvSelectedSku)
                : null;
              return (
                <Card className="shadow-sm border-emerald-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-emerald-500" />
                      {rvProduct ? "Produto Selecionado" : "Revenda"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {rvProduct ? (
                      <div className="space-y-3">
                        {/* Foto pequena + dados principais lado a lado (como downlights) */}
                        <div className="flex gap-3 items-stretch">
                          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-28 flex items-center justify-center">
                            {rvProduct.fotoUrl ? (
                              <img src={rvProduct.fotoUrl} alt={rvProduct.name} className="w-full h-full object-contain p-2" loading="lazy" />
                            ) : (
                              <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-2 flex-1">
                            {/* Código */}
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Código</p>
                              <p className="text-sm font-mono font-semibold text-primary">{rvProduct.sku}</p>
                            </div>
                            {/* Fornecedor */}
                            {rvProduct.fornecedor && (
                              <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Fornecedor</p>
                                <p className="text-sm font-semibold">{rvProduct.fornecedor}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Descrição */}
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Descrição</p>
                          <p className="text-sm font-semibold leading-snug">{rvProduct.name}</p>
                        </div>
                        {/* Referência */}
                        {rvProduct.referencia && (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Referência</p>
                            <p className="text-sm font-semibold">{rvProduct.referencia}</p>
                          </div>
                        )}
                        {/* Preço de venda */}
                        {rvProduct.precoVenda != null && rvProduct.precoVenda > 0 && (
                          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40">
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">Preço de Venda</p>
                            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                              R$ {rvProduct.precoVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}

                        {/* Botão adicionar */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-1">
                            <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                            <Input
                              className="h-7 text-xs flex-1"
                              placeholder="ex: L1, P2..."
                              value={globalItemEmPlanta}
                              onChange={(e) => setGlobalItemEmPlanta(e.target.value)}
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</label>
                            <Input
                              type="number"
                              className="h-7 text-xs w-16"
                              min={1}
                              placeholder="1"
                              value={globalQty}
                              onChange={(e) => setGlobalQty(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                          </div>
                        </div>
                        <Button
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleAddRevendaItem(rvProduct.sku)}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                          <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-base font-semibold text-foreground font-display">Nenhum produto selecionado</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs">Selecione um fornecedor, busque pelo nome e clique no produto para ver o resumo.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
            {/* ── Customizados: painel de resumo do item selecionado ── */}
            {productCategory === "Customizados" && (() => {
              const czProduct = czSelectedSku
                ? customizadosProducts.find(p => p.sku === czSelectedSku)
                : null;
              const isManualMode = customizadosProducts.length === 0;
              const canAdd = isManualMode
                ? czSearch.trim().length > 0
                : czSelectedSku.length > 0;
              return (
                <Card className="shadow-sm border-purple-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <Package2 className="w-4 h-4 text-purple-500" />
                      {czProduct ? "Produto Customizado" : isManualMode ? "Customizados (Manual)" : "Customizados"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {czProduct ? (
                      <div className="space-y-3">
                        <div className="flex gap-3 items-stretch">
                          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-28 flex items-center justify-center">
                            {czProduct.fotoUrl ? (
                              <img src={czProduct.fotoUrl} alt={czProduct.name} className="w-full h-full object-contain p-2" loading="lazy" />
                            ) : (
                              <Package2 className="w-8 h-8 text-muted-foreground/30" />
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-2 flex-1">
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Código</p>
                              <p className="text-sm font-mono font-semibold text-primary">{czProduct.sku}</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Descrição</p>
                          <p className="text-sm font-semibold leading-snug">{czProduct.name}</p>
                        </div>
                        {czProduct.precoVenda != null && czProduct.precoVenda > 0 && (
                          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/40">
                            <p className="text-xs text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-1">Preço de Venda</p>
                            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
                              R$ {czProduct.precoVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Qtd</label>
                            <Input type="number" min="1" className="h-7 text-xs" value={czQty} onChange={e => setCzQty(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Preço unitário (R$)</label>
                            <Input type="number" min="0" step="0.01" className="h-7 text-xs" placeholder={czProduct.precoVenda?.toFixed(2) ?? "0,00"} value={czUnitPrice} onChange={e => setCzUnitPrice(e.target.value)} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                          <Input className="h-7 text-xs flex-1" placeholder="ex: L1, P2..." value={globalItemEmPlanta} onChange={(e) => setGlobalItemEmPlanta(e.target.value)} />
                        </div>
                        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={handleAddCustomizadoItem}>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                        </Button>
                      </div>
                    ) : isManualMode && czSearch.trim() ? (
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Produto</p>
                          <p className="text-sm font-semibold">{czSearch.trim()}</p>
                        </div>
                        {czUnitPrice && (
                          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/40">
                            <p className="text-xs text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-1">Total</p>
                            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
                              R$ {(parseFloat(czQty || "1") * parseFloat(czUnitPrice || "0")).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-muted-foreground whitespace-nowrap">Item em planta:</label>
                          <Input className="h-7 text-xs flex-1" placeholder="ex: L1, P2..." value={globalItemEmPlanta} onChange={(e) => setGlobalItemEmPlanta(e.target.value)} />
                        </div>
                        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={handleAddCustomizadoItem}>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {appendToQuoteId ? "Enviar ao Orçamento" : "Enviar ao Carrinho"}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                          <Package2 className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-base font-semibold text-foreground font-display">Nenhum produto selecionado</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                          {isManualMode ? "Preencha a descrição do produto no formulário ao lado." : "Busque e selecione um produto customizado."}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* ── Acessórios: painel de resumo do item selecionado ── */}
            {productCategory === "Acessórios" && (() => {
              const acProduct = acSelectedId
                ? acessoriosProducts.find(p => p.id === acSelectedId)
                : null;
              return (
                <Card className="shadow-sm border-emerald-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-emerald-500" />
                      {acProduct ? "Acessório Selecionado" : "Acessórios"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {acProduct ? (
                      <div className="space-y-3">
                        {/* Foto pequena + dados principais lado a lado */}
                        <div className="flex gap-3 items-stretch">
                          <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shrink-0 w-28 flex items-center justify-center">
                            {acProduct.fotoUrl ? (
                              <img src={acProduct.fotoUrl} alt={acProduct.produto ?? ""} className="w-full h-full object-contain p-2" loading="lazy" />
                            ) : (
                              <Wrench className="w-8 h-8 text-muted-foreground/30" />
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-2 flex-1">
                            {/* Código */}
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Código</p>
                              <p className="text-sm font-mono font-semibold text-primary">{acProduct.codigo ?? acProduct.sku ?? "—"}</p>
                            </div>
                            {/* Família */}
                            {acProduct.familia && (
                              <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Família</p>
                                <p className="text-sm font-semibold">{acProduct.familia}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Descrição */}
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Descrição</p>
                          <p className="text-sm font-semibold leading-snug">{acProduct.produto ?? acProduct.codigo}</p>
                        </div>
                        {/* Dimensão */}
                        {acProduct.dimensao && (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Dimensão</p>
                            <p className="text-sm font-semibold">{acProduct.dimensao}</p>
                          </div>
                        )}
                        {/* Preço de venda */}
                        {acProduct.precoVenda != null && acProduct.precoVenda > 0 && (
                          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40">
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">Preço de Venda</p>
                            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                              R$ {acProduct.precoVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                        {/* Botão adicionar — sempre envia ao carrinho como item independente */}
                        <Button
                          className="w-full text-white bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleAddAcessorioItem()}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {appendToQuoteId ? "Enviar ao Orçamento" : "Adicionar ao Carrinho"}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                          <Wrench className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-base font-semibold text-foreground font-display">Nenhum acessório selecionado</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs">Selecione uma família, busque pelo nome e clique no item para ver o resumo.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* ── Item Especial: painel de resultado / pré-visualização ── */}
            {productCategory === "Item Especial" && (
              <Card className="shadow-sm border-amber-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <PackagePlus className="w-4 h-4 text-amber-500" />
                    Item Especial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {spPhotoPreview ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border bg-muted/30">
                      <img src={spPhotoPreview} alt="Preview" className="w-full h-full object-contain" />
                      {spIsUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-muted-foreground">Enviando foto...</span>
                          </div>
                        </div>
                      )}
                      {!spIsUploading && spPhotoUrl && (
                        <div className="absolute top-2 right-2">
                          <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-semibold">Foto salva</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 rounded-lg border-2 border-dashed border-border bg-muted/20 text-center">
                      <ImageIcon className="w-10 h-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma foto adicionada</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">Preencha o formulário ao lado e adicione uma foto</p>
                    </div>
                  )}
                  {spDescription && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">{spDescription}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {spDimensions && <span><span className="font-medium text-foreground">Dimensões:</span> {spDimensions}</span>}
                        {spPower && <span><span className="font-medium text-foreground">Potência:</span> {spPower}</span>}
                        {spDim && <span><span className="font-medium text-foreground">DIM:</span> {spDim}</span>}
                        {spVoltage && <span><span className="font-medium text-foreground">Tensão:</span> {spVoltage}</span>}
                        {spColor && <span><span className="font-medium text-foreground">Cor:</span> {spColor}</span>}
                        {spUnitPrice && <span><span className="font-medium text-foreground">Valor unit.:</span> {formatBRL(parseFloat(spUnitPrice.replace(",",".")) || 0)}</span>}
                      </div>
                      {spInternalNotes && (
                        <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-3 py-2">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Obs. Interna (não aparece no orçamento)</p>
                          <p className="text-xs text-amber-700/80 dark:text-amber-400/80">{spInternalNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {!spDescription && (
                    <p className="text-sm text-muted-foreground text-center py-4">Preencha os campos do formulário para visualizar o item.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border mt-16 py-6">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© 2026 Alfalux Iluminação · Configurador Alfalux</span>
          <span className="font-mono">
            {Object.keys(activeProfileCatalog).length} variantes{profileCatalogIsFromApi ? " (API)" : " (local)"} · Regra de Ouro aplicada
          </span>
        </div>
      </footer>
      {/* Modal de inclusão de acessório a partir do painel de resultados */}
      <Dialog open={addAcModalOpen} onOpenChange={(open) => { setAddAcModalOpen(open); if (!open) { setAddAcModalSelectedId(null); setAddAcModalSearch(""); setAddAcModalFamilia(""); setAddAcModalQty(1); } }}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Wrench className="w-4 h-4 text-cyan-500" />
              Incluir Acessório
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Busca textual */}
            <div className="relative">
              <Input
                placeholder="Buscar por nome, código, dimensão ou família..."
                value={addAcModalSearch}
                onChange={e => { setAddAcModalSearch(e.target.value); setAddAcModalSelectedId(null); }}
                className="pr-8"
                autoFocus
              />
              {addAcModalSearch && (
                <button
                  type="button"
                  onClick={() => setAddAcModalSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
            {/* Chips de família */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => { setAddAcModalFamilia(""); setAddAcModalSelectedId(null); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  !addAcModalFamilia
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/50 text-foreground"
                }`}
              >
                Todos
              </button>
              {acessoriosFamilias.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setAddAcModalFamilia(f); setAddAcModalSelectedId(null); }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    addAcModalFamilia === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary/50 text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            {/* Lista de acessórios */}
            <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
              {acessoriosQuery.isLoading ? (
                <div className="text-sm text-muted-foreground p-4 text-center">Carregando acessórios...</div>
              ) : filteredAcessoriosModal.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 text-center">
                  {addAcModalSearch || addAcModalFamilia ? "Nenhum acessório encontrado." : "Digite para buscar ou selecione uma família."}
                </div>
              ) : filteredAcessoriosModal.map(p => (
                <div
                  key={p.id}
                  onClick={() => setAddAcModalSelectedId(prev => prev === p.id ? null : p.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                    addAcModalSelectedId === p.id
                      ? "bg-cyan-50 dark:bg-cyan-900/20 border-l-2 border-cyan-500"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="shrink-0 w-10 h-10 rounded border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                    {p.fotoUrl ? (
                      <img src={p.fotoUrl} alt={p.produto ?? ""} className="w-full h-full object-contain p-0.5" loading="lazy" />
                    ) : (
                      <Wrench className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-snug break-words">{p.produto ?? p.codigo}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5">
                      <span className="font-mono">{p.codigo}</span>
                      {p.dimensao && <span>· {p.dimensao}</span>}
                      {p.familia && <span>· {p.familia}</span>}
                      {p.precoVenda != null && p.precoVenda > 0 && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          R$ {p.precoVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                  {addAcModalSelectedId === p.id && (
                    <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
            {/* Quantidade + Botões de ação */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Quantidade:</Label>
                <Input
                  type="number"
                  min={1}
                  value={addAcModalQty}
                  onChange={e => setAddAcModalQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 h-8 text-sm text-center"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAddAcModalOpen(false)}>Cancelar</Button>
                <Button
                  size="sm"
                  disabled={!addAcModalSelectedId}
                  onClick={handleAddAcessorioFromModal}
                  className="gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Incluir ao Produto
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de seleção de cor da peça */}
      <ColorPickerModal
        open={colorModalOpen}
        onClose={() => { setColorModalOpen(false); setPendingCartItem(null); }}
        onConfirm={(cor: CorPeca) => {
          if (pendingCartItem) {
            // Injeta acessórios pendentes, globalQty, globalItemEmPlanta, pavimento e ambiente no item antes de enviar
            const effectiveQty = globalQty > 0 ? globalQty : 1;
            // Recalcular driverLines com a nova quantidade (driverQty e driverTotalPrice para effectiveQty)
            const scaledDriverLines = pendingCartItem.driverLines && pendingCartItem.driverLines.length > 0
              ? pendingCartItem.driverLines.map((dl) => {
                  const newDrvQty = Math.round((dl.driverQty ?? 1) * effectiveQty);
                  const newDrvTotal = dl.driverUnitPrice != null ? Math.round(dl.driverUnitPrice * newDrvQty * 100) / 100 : null;
                  return { ...dl, driverQty: newDrvQty, driverTotalPrice: newDrvTotal };
                })
              : pendingCartItem.driverLines;
            // Recalcular priceWithoutDriver (unitPriceLuminaria × effectiveQty)
            const scaledPriceWithoutDriver = pendingCartItem.unitPriceLuminaria != null
              ? Math.round(pendingCartItem.unitPriceLuminaria * effectiveQty * 100) / 100
              : pendingCartItem.priceWithoutDriver ?? null;
            // Recalcular totalPrice: se tem driverLines, soma luminária + drivers; senão usa unitPrice × qty
            let scaledTotalPrice: number | null;
            if (scaledDriverLines && scaledDriverLines.length > 0 && scaledPriceWithoutDriver != null) {
              const drvSum = scaledDriverLines.reduce((s, dl) => s + (dl.driverTotalPrice ?? 0), 0);
              scaledTotalPrice = Math.round((scaledPriceWithoutDriver + drvSum) * 100) / 100;
            } else {
              scaledTotalPrice = pendingCartItem.unitPrice != null ? pendingCartItem.unitPrice * effectiveQty : (pendingCartItem.totalPrice ?? 0);
            }
            const baseItem: CartItemData = {
              ...pendingCartItem,
              corPeca: cor,
              qty: effectiveQty,
              totalPrice: scaledTotalPrice,
              priceWithoutDriver: scaledPriceWithoutDriver,
              driverLines: scaledDriverLines,
              itemEmPlanta: globalItemEmPlanta || pendingCartItem.itemEmPlanta || "",
              ...(globalPavimento ? { floorId: globalPavimento, floorName: globalPavimento } : {}),
              ...(globalAmbiente ? { ambiente: globalAmbiente } : {}),
            };
            const itemWithAcc: CartItemData = pendingAccessories.length > 0
              ? { ...baseItem, accessories: [...pendingAccessories] }
              : baseItem;
            if (pendingAccessories.length > 0) setPendingAccessories([]);
            if (appendToQuoteId) {
              // Modo append: envia diretamente ao orçamento após selecionar cor
              appendItemsMutation.mutate({
                quoteId: appendToQuoteId,
                newItems: [{ itemNumber: 1, itemData: JSON.stringify(itemWithAcc) }],
                versionNotes: `+1 item adicionado via configurador`,
              });
              setGlobalItemEmPlanta("");
              setGlobalQty(1);
            } else {
              addItem(itemWithAcc);
              setGlobalItemEmPlanta("");
              setGlobalQty(1);
            }
          }
          setColorModalOpen(false);
          setPendingCartItem(null);
        }}
        isAdding={appendToQuoteId ? appendItemsMutation.isPending : isAddingToCart}
        productName={pendingCartItem?.sku ?? ""}
      />
    </div>
  );
}
