/**
 * profileApiAdapter.ts
 *
 * Converte os produtos da categoria PERFIS retornados pela API Alfalux
 * para o formato `Record<string, ProfileVariant>` compatível com LED_CATALOG.
 *
 * Estratégia:
 *   - Cada produto da API representa UM módulo (SKU) de um perfil.
 *   - Os módulos são agrupados por código de perfil (ex: "LLA-5945") e tipo (IN/IF/ML).
 *   - As propriedades de negócio (allowD1, allowD2, allowD1D2, hasDiffuser,
 *     requiresRemoteDriver) são inferidas a partir do código de perfil usando
 *     a tabela PROFILE_RULES — a mesma lógica que existe no LED_CATALOG estático.
 *   - Se a API não retornar nenhum produto PERFIS, o chamador deve usar LED_CATALOG.
 */

import type { ApiProduct as AlfaluxProduct } from "./alfaluxApiAdapter";
import type { ProfileVariant, InstallType, ModuleData, ProfileModules } from "./ledCatalog";

// ── Regras de negócio por código de perfil ──────────────────────────────────
// Estas regras são estáticas e refletem as restrições de aplicação de cada perfil.
// Quando um novo perfil for adicionado à API, adicionar aqui também.
interface ProfileRule {
  name: string;
  allowD1: boolean;
  allowD2: boolean;
  allowD1D2: boolean;
  hasDiffuser?: boolean;
  requiresRemoteDriver?: boolean;
}

const PROFILE_RULES: Record<string, ProfileRule> = {
  // EASY PRIME
  "LLE-2580": { name: "EASY PRIME",   allowD1: true,  allowD2: false, allowD1D2: false },
  // SKYLINE
  "LLP-4536": { name: "SKYLINE",      allowD1: true,  allowD2: true,  allowD1D2: false },
  "LLE-2052": { name: "SKYLINE",      allowD1: true,  allowD2: false, allowD1D2: false },
  // BLAZE
  "LLS-3945": { name: "BLAZE",        allowD1: true,  allowD2: false, allowD1D2: false },
  "LLA-5945": { name: "BLAZE",        allowD1: true,  allowD2: true,  allowD1D2: false },
  "LLE-2810": { name: "BLAZE",        allowD1: true,  allowD2: true,  allowD1D2: false, hasDiffuser: false },
  // BLAZE H
  "LLP-6060": { name: "BLAZE H",      allowD1: true,  allowD2: true,  allowD1D2: true  },
  // MINI BLAZE
  "LLP-3336": { name: "MINI BLAZE",   allowD1: true,  allowD2: false, allowD1D2: false },
  "LLS-3336": { name: "MINI BLAZE",   allowD1: true,  allowD2: false, allowD1D2: false },
  // HIT
  "LLP-4251": { name: "HIT",          allowD1: true,  allowD2: true,  allowD1D2: true  },
  "LLA-3395": { name: "HIT",          allowD1: true,  allowD2: true,  allowD1D2: true  },
  // EASY H PLUS
  "LLP-4450": { name: "EASY H PLUS",  allowD1: true,  allowD2: true,  allowD1D2: true  },
  "LLA-4450": { name: "EASY H PLUS",  allowD1: true,  allowD2: true,  allowD1D2: true  },
  // SHARP
  "LLP-4451": { name: "SHARP",        allowD1: true,  allowD2: true,  allowD1D2: true,  hasDiffuser: true },
  "LLA-4451": { name: "SHARP",        allowD1: true,  allowD2: true,  allowD1D2: true,  hasDiffuser: true },
  // FLOW
  "LLP-4825": { name: "FLOW",         allowD1: false, allowD2: true,  allowD1D2: false },
  // SOFT
  "LLP-4452": { name: "SOFT",         allowD1: true,  allowD2: false, allowD1D2: false },
  // SMART MINI
  "LLP-3435": { name: "SMART MINI",   allowD1: true,  allowD2: true,  allowD1D2: false },
  "LLS-3400": { name: "SMART MINI",   allowD1: true,  allowD2: false, allowD1D2: false },
  "LLA-5010": { name: "SMART MINI",   allowD1: true,  allowD2: true,  allowD1D2: false },
};

// ── Mapeamento de tipo de instalação ─────────────────────────────────────────
const INSTALL_MAP: Record<string, InstallType> = {
  PENDENTE: "PENDENTE",
  SOBREPOR: "SOBREPOR",
  EMBUTIR:  "EMBUTIR",
  ARANDELA: "ARANDELA",
};

// ── Parser do campo "name" do produto ────────────────────────────────────────
// Exemplos:
//   "BLAZE A IF 1B 575MM"        → tipo=IF, barras=1,   comp=575
//   "EASY PRIME E ML 2.8B 1630MM"→ tipo=ML, barras=2.8, comp=1630
//   "FLOW P IN 2.6B 1510MM"      → tipo=IN, barras=2.6, comp=1510
const NAME_PATTERN = /\b(IF|ML|IN)\s+([\d.]+)B\s+(\d+)MM\b/i;

interface ParsedModule {
  type: "IN" | "IF" | "ML";
  bars: number;
  length: number;
}

function parseModuleName(name: string): ParsedModule | null {
  const m = NAME_PATTERN.exec(name);
  if (!m) return null;
  return {
    type: m[1].toUpperCase() as "IN" | "IF" | "ML",
    bars: parseFloat(m[2]),
    length: parseInt(m[3], 10),
  };
}

// ── Extrai o código de perfil base do SKU ────────────────────────────────────
// Ex: "LLA-5945.1IF.39F" → "LLA-5945"
function extractProfileCode(sku: string): string {
  return sku.split(".")[0] ?? sku;
}

// ── Adaptador principal ──────────────────────────────────────────────────────

/**
 * Converte os produtos PERFIS da API em um Record<string, ProfileVariant>
 * compatível com LED_CATALOG.
 *
 * Retorna `null` se nenhum produto PERFIS for encontrado (sinal para usar fallback).
 */
export function adaptProfileProducts(
  products: AlfaluxProduct[]
): Record<string, ProfileVariant> | null {
  const perfisProducts = products.filter(
    (p) => (p.categoria ?? "").toUpperCase() === "PERFIS"
  );

  if (perfisProducts.length === 0) return null;

  // Acumula módulos por código de perfil
  const variantMap: Record<
    string,
    {
      rule: ProfileRule;
      installType: InstallType;
      modules: ProfileModules;
      driver220: { model: string; code: string | null } | null;
      driverBivolt: { model: string; code: string | null } | null;
      driverDimDali: { model: string; code: string | null } | null;
      driverDim110v: { model: string; code: string | null } | null;
      ledModuleStripflex: string | null;
      ledModuleStripline: string | null;
      ledModuleStripflex2700: string | null;
      ledModuleStripflex3000: string | null;
      ledModuleStripflex4000: string | null;
      ledModuleStripflex5000: string | null;
      ledModuleStripline2700: string | null;
      ledModuleStripline3000: string | null;
      ledModuleStripline4000: string | null;
      ledModuleStripline5000: string | null;
      ledModuleStripflexEq2700: string | null;
      ledModuleStripflexEq3000: string | null;
      ledModuleStripflexEq4000: string | null;
      ledModuleStripflexEq5000: string | null;
      ledModuleStriplineEq2700: string | null;
      ledModuleStriplineEq3000: string | null;
      ledModuleStriplineEq4000: string | null;
      ledModuleStriplineEq5000: string | null;
      // Campos de custo e markup por controle (novo método — BLAZE H e futuros)
      custoCorpoOnoff220v: number | null;
      custoCorpoOnoffBivolt: number | null;
      custoCorpoDim110v: number | null;
      custoCorpoDimDali: number | null;
      custoCorpoDimTriac110v: number | null;
      custoCorpoDimTriac220v: number | null;
      custoCorpoOnoff220vD1D2: number | null;
      custoCorpoOnoffBivoltD1D2: number | null;
      custoCorpoDim110vD1D2: number | null;
      custoCorpoDimDaliD1D2: number | null;
      custoCorpoDimTriac110vD1D2: number | null;
      custoCorpoDimTriac220vD1D2: number | null;
      markupPadraoOnoff220v: number | null;
      markupMinimoOnoff220v: number | null;
      markupPadraoOnoffBivolt: number | null;
      markupMinimoOnoffBivolt: number | null;
      markupPadraoDim110v: number | null;
      markupMinimoDim110v: number | null;
      markupPadraoDimDali: number | null;
      markupMinimoDimDali: number | null;
      markupPadraoDimTriac110v: number | null;
      markupMinimoDimTriac110v: number | null;
      markupPadraoDimTriac220v: number | null;
      markupMinimoDimTriac220v: number | null;
      markupMinimoDriver: number | null;
    }
  > = {};

  for (const p of perfisProducts) {
    const profileCode = extractProfileCode(p.sku);
    const rule = PROFILE_RULES[profileCode];

    // Se não há regra para este código, pular (perfil desconhecido)
    if (!rule) continue;

    const installType = INSTALL_MAP[(p.instalacao ?? "").toUpperCase()];
    if (!installType) continue;

    const parsed = parseModuleName(p.name);
    if (!parsed) continue;

      const pa = p as any;
      if (!variantMap[profileCode]) {
      variantMap[profileCode] = {
        rule,
        installType,
        modules: { IN: {}, IF: {}, ML: {} },
        driver220: p.driver220 ?? null,
        driverBivolt: p.driverBivolt ?? null,
        driverDimDali: p.driverDimDali ?? null,
        driverDim110v: p.driverDim110v ?? null,
        ledModuleStripflex: null,
        ledModuleStripline: null,
        ledModuleStripflex2700: null,
        ledModuleStripflex3000: null,
        ledModuleStripflex4000: null,
        ledModuleStripflex5000: null,
        ledModuleStripline2700: null,
        ledModuleStripline3000: null,
        ledModuleStripline4000: null,
        ledModuleStripline5000: null,
        ledModuleStripflexEq2700: null,
        ledModuleStripflexEq3000: null,
        ledModuleStripflexEq4000: null,
        ledModuleStripflexEq5000: null,
        ledModuleStriplineEq2700: null,
        ledModuleStriplineEq3000: null,
        ledModuleStriplineEq4000: null,
        ledModuleStriplineEq5000: null,
        // Custo e markup — usar o primeiro produto que tiver valor preenchido
        custoCorpoOnoff220v: pa.custoCorpoOnoff220v ?? null,
        custoCorpoOnoffBivolt: pa.custoCorpoOnoffBivolt ?? null,
        custoCorpoDim110v: pa.custoCorpoDim110v ?? null,
        custoCorpoDimDali: pa.custoCorpoDimDali ?? null,
        custoCorpoDimTriac110v: pa.custoCorpoDimTriac110v ?? null,
        custoCorpoDimTriac220v: pa.custoCorpoDimTriac220v ?? null,
        custoCorpoOnoff220vD1D2: pa.custoCorpoOnoff220vD1D2 ?? null,
        custoCorpoOnoffBivoltD1D2: pa.custoCorpoOnoffBivoltD1D2 ?? null,
        custoCorpoDim110vD1D2: pa.custoCorpoDim110vD1D2 ?? null,
        custoCorpoDimDaliD1D2: pa.custoCorpoDimDaliD1D2 ?? null,
        custoCorpoDimTriac110vD1D2: pa.custoCorpoDimTriac110vD1D2 ?? null,
        custoCorpoDimTriac220vD1D2: pa.custoCorpoDimTriac220vD1D2 ?? null,
        markupPadraoOnoff220v: pa.markupPadraoOnoff220v ?? null,
        markupMinimoOnoff220v: pa.markupMinimoOnoff220v ?? null,
        markupPadraoOnoffBivolt: pa.markupPadraoOnoffBivolt ?? null,
        markupMinimoOnoffBivolt: pa.markupMinimoOnoffBivolt ?? null,
        markupPadraoDim110v: pa.markupPadraoDim110v ?? null,
        markupMinimoDim110v: pa.markupMinimoDim110v ?? null,
        markupPadraoDimDali: pa.markupPadraoDimDali ?? null,
        markupMinimoDimDali: pa.markupMinimoDimDali ?? null,
        markupPadraoDimTriac110v: pa.markupPadraoDimTriac110v ?? null,
        markupMinimoDimTriac110v: pa.markupMinimoDimTriac110v ?? null,
        markupPadraoDimTriac220v: pa.markupPadraoDimTriac220v ?? null,
        markupMinimoDimTriac220v: pa.markupMinimoDimTriac220v ?? null,
        markupMinimoDriver: pa.markupMinimoDriver ?? null,
      };
    } else {
      // Atualizar drivers se ainda não preenchidos (usar o primeiro produto que tiver)
      if (!variantMap[profileCode].driver220 && p.driver220) {
        variantMap[profileCode].driver220 = p.driver220;
      }
      if (!variantMap[profileCode].driverBivolt && p.driverBivolt) {
        variantMap[profileCode].driverBivolt = p.driverBivolt;
      }
      if (!variantMap[profileCode].driverDimDali && p.driverDimDali) {
        variantMap[profileCode].driverDimDali = p.driverDimDali;
      }
      if (!variantMap[profileCode].driverDim110v && p.driverDim110v) {
        variantMap[profileCode].driverDim110v = p.driverDim110v;
      }
    }
    // Atualizar ledModule por tipo (Stripflex vs Stripline) — independente de ser novo ou existente
    const pa2 = p as any;
    if (p.ledModule) {
      const lmClean = p.ledModule.replace(/\[CCT\]/gi, "").trim();
      const isStripline = lmClean.toUpperCase().includes("STRIPLINE");
      const isStripflex = lmClean.toUpperCase().includes("STRIPFLEX");
      if (isStripline) {
        if (!variantMap[profileCode].ledModuleStripline) variantMap[profileCode].ledModuleStripline = lmClean;
        if (pa2.ledModule2700 && !variantMap[profileCode].ledModuleStripline2700) variantMap[profileCode].ledModuleStripline2700 = pa2.ledModule2700;
        if (pa2.ledModule3000 && !variantMap[profileCode].ledModuleStripline3000) variantMap[profileCode].ledModuleStripline3000 = pa2.ledModule3000;
        if (pa2.ledModule4000 && !variantMap[profileCode].ledModuleStripline4000) variantMap[profileCode].ledModuleStripline4000 = pa2.ledModule4000;
        if (pa2.ledModule5000 && !variantMap[profileCode].ledModuleStripline5000) variantMap[profileCode].ledModuleStripline5000 = pa2.ledModule5000;
        if (pa2.ledModuleEq2700 && !variantMap[profileCode].ledModuleStriplineEq2700) variantMap[profileCode].ledModuleStriplineEq2700 = pa2.ledModuleEq2700;
        if (pa2.ledModuleEq3000 && !variantMap[profileCode].ledModuleStriplineEq3000) variantMap[profileCode].ledModuleStriplineEq3000 = pa2.ledModuleEq3000;
        if (pa2.ledModuleEq4000 && !variantMap[profileCode].ledModuleStriplineEq4000) variantMap[profileCode].ledModuleStriplineEq4000 = pa2.ledModuleEq4000;
        if (pa2.ledModuleEq5000 && !variantMap[profileCode].ledModuleStriplineEq5000) variantMap[profileCode].ledModuleStriplineEq5000 = pa2.ledModuleEq5000;
      } else if (isStripflex) {
        if (!variantMap[profileCode].ledModuleStripflex) variantMap[profileCode].ledModuleStripflex = lmClean;
        if (pa2.ledModule2700 && !variantMap[profileCode].ledModuleStripflex2700) variantMap[profileCode].ledModuleStripflex2700 = pa2.ledModule2700;
        if (pa2.ledModule3000 && !variantMap[profileCode].ledModuleStripflex3000) variantMap[profileCode].ledModuleStripflex3000 = pa2.ledModule3000;
        if (pa2.ledModule4000 && !variantMap[profileCode].ledModuleStripflex4000) variantMap[profileCode].ledModuleStripflex4000 = pa2.ledModule4000;
        if (pa2.ledModule5000 && !variantMap[profileCode].ledModuleStripflex5000) variantMap[profileCode].ledModuleStripflex5000 = pa2.ledModule5000;
        if (pa2.ledModuleEq2700 && !variantMap[profileCode].ledModuleStripflexEq2700) variantMap[profileCode].ledModuleStripflexEq2700 = pa2.ledModuleEq2700;
        if (pa2.ledModuleEq3000 && !variantMap[profileCode].ledModuleStripflexEq3000) variantMap[profileCode].ledModuleStripflexEq3000 = pa2.ledModuleEq3000;
        if (pa2.ledModuleEq4000 && !variantMap[profileCode].ledModuleStripflexEq4000) variantMap[profileCode].ledModuleStripflexEq4000 = pa2.ledModuleEq4000;
        if (pa2.ledModuleEq5000 && !variantMap[profileCode].ledModuleStripflexEq5000) variantMap[profileCode].ledModuleStripflexEq5000 = pa2.ledModuleEq5000;
      }
    }
    

    const entry = variantMap[profileCode];
    const moduleData: ModuleData = { length: parsed.length, sku: p.sku };
    const barsKey = String(parsed.bars);

    entry.modules[parsed.type][barsKey] = moduleData;
  }

  if (Object.keys(variantMap).length === 0) return null;

  // Monta o Record<string, ProfileVariant> final
  const catalog: Record<string, ProfileVariant> = {};
  for (const [code, entry] of Object.entries(variantMap)) {
    const { rule, installType, modules, driver220, driverBivolt, driverDimDali, driverDim110v, ledModuleStripflex, ledModuleStripline } = entry;
    catalog[code] = {
      name: rule.name,
      code,
      installType,
      allowD1: rule.allowD1,
      allowD2: rule.allowD2,
      allowD1D2: rule.allowD1D2,
      ...(rule.hasDiffuser !== undefined ? { hasDiffuser: rule.hasDiffuser } : {}),
      ...(rule.requiresRemoteDriver ? { requiresRemoteDriver: true } : {}),
      driver220: driver220 ?? null,
      driverBivolt: driverBivolt ?? null,
      driverDimDali: driverDimDali ?? null,
      driverDim110v: driverDim110v ?? null,
      ledModuleStripflex: ledModuleStripflex ?? null,
      ledModuleStripline: ledModuleStripline ?? null,
      ledModuleStripflex2700: entry.ledModuleStripflex2700,
      ledModuleStripflex3000: entry.ledModuleStripflex3000,
      ledModuleStripflex4000: entry.ledModuleStripflex4000,
      ledModuleStripflex5000: entry.ledModuleStripflex5000,
      ledModuleStripline2700: entry.ledModuleStripline2700,
      ledModuleStripline3000: entry.ledModuleStripline3000,
      ledModuleStripline4000: entry.ledModuleStripline4000,
      ledModuleStripline5000: entry.ledModuleStripline5000,
      ledModuleStripflexEq2700: entry.ledModuleStripflexEq2700,
      ledModuleStripflexEq3000: entry.ledModuleStripflexEq3000,
      ledModuleStripflexEq4000: entry.ledModuleStripflexEq4000,
      ledModuleStripflexEq5000: entry.ledModuleStripflexEq5000,
      ledModuleStriplineEq2700: entry.ledModuleStriplineEq2700,
      ledModuleStriplineEq3000: entry.ledModuleStriplineEq3000,
      ledModuleStriplineEq4000: entry.ledModuleStriplineEq4000,
      ledModuleStriplineEq5000: entry.ledModuleStriplineEq5000,
      modules,
      // Custo e markup por controle
      custoCorpoOnoff220v: entry.custoCorpoOnoff220v,
      custoCorpoOnoffBivolt: entry.custoCorpoOnoffBivolt,
      custoCorpoDim110v: entry.custoCorpoDim110v,
      custoCorpoDimDali: entry.custoCorpoDimDali,
      custoCorpoDimTriac110v: entry.custoCorpoDimTriac110v,
      custoCorpoDimTriac220v: entry.custoCorpoDimTriac220v,
      custoCorpoOnoff220vD1D2: entry.custoCorpoOnoff220vD1D2,
      custoCorpoOnoffBivoltD1D2: entry.custoCorpoOnoffBivoltD1D2,
      custoCorpoDim110vD1D2: entry.custoCorpoDim110vD1D2,
      custoCorpoDimDaliD1D2: entry.custoCorpoDimDaliD1D2,
      custoCorpoDimTriac110vD1D2: entry.custoCorpoDimTriac110vD1D2,
      custoCorpoDimTriac220vD1D2: entry.custoCorpoDimTriac220vD1D2,
      markupPadraoOnoff220v: entry.markupPadraoOnoff220v,
      markupMinimoOnoff220v: entry.markupMinimoOnoff220v,
      markupPadraoOnoffBivolt: entry.markupPadraoOnoffBivolt,
      markupMinimoOnoffBivolt: entry.markupMinimoOnoffBivolt,
      markupPadraoDim110v: entry.markupPadraoDim110v,
      markupMinimoDim110v: entry.markupMinimoDim110v,
      markupPadraoDimDali: entry.markupPadraoDimDali,
      markupMinimoDimDali: entry.markupMinimoDimDali,
      markupPadraoDimTriac110v: entry.markupPadraoDimTriac110v,
      markupMinimoDimTriac110v: entry.markupMinimoDimTriac110v,
      markupPadraoDimTriac220v: entry.markupPadraoDimTriac220v,
      markupMinimoDimTriac220v: entry.markupMinimoDimTriac220v,
      markupMinimoDriver: entry.markupMinimoDriver,
    };
  }

  return catalog;
}

/**
 * Retorna estatísticas do catálogo adaptado para debug/badge.
 */
export function getProfileCatalogStats(catalog: Record<string, ProfileVariant>): {
  totalVariants: number;
  totalModules: number;
  families: string[];
} {
  const families = new Set<string>();
  let totalModules = 0;
  for (const v of Object.values(catalog)) {
    families.add(v.name);
    totalModules +=
      Object.keys(v.modules.IN).length +
      Object.keys(v.modules.IF).length +
      Object.keys(v.modules.ML).length;
  }
  return {
    totalVariants: Object.keys(catalog).length,
    totalModules,
    families: Array.from(families).sort(),
  };
}
