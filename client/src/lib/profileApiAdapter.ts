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
    { rule: ProfileRule; installType: InstallType; modules: ProfileModules }
  > = {};

  for (const p of perfisProducts) {
    const profileCode = extractProfileCode(p.sku);
    const rule = PROFILE_RULES[profileCode];

    // Se não há regra para este código, pular (perfil desconhecido)
    if (!rule) continue;

    const installType = INSTALL_MAP[(p.instalacao ?? "").toUpperCase()];
    if (!installType) continue;

    const parsed = parseModuleName(p.produto);
    if (!parsed) continue;

    if (!variantMap[profileCode]) {
      variantMap[profileCode] = {
        rule,
        installType,
        modules: { IN: {}, IF: {}, ML: {} },
      };
    }

    const entry = variantMap[profileCode];
    const moduleData: ModuleData = { length: parsed.length, sku: p.sku };
    const barsKey = String(parsed.bars);

    entry.modules[parsed.type][barsKey] = moduleData;
  }

  if (Object.keys(variantMap).length === 0) return null;

  // Monta o Record<string, ProfileVariant> final
  const catalog: Record<string, ProfileVariant> = {};
  for (const [code, { rule, installType, modules }] of Object.entries(variantMap)) {
    catalog[code] = {
      name: rule.name,
      code,
      installType,
      allowD1: rule.allowD1,
      allowD2: rule.allowD2,
      allowD1D2: rule.allowD1D2,
      ...(rule.hasDiffuser !== undefined ? { hasDiffuser: rule.hasDiffuser } : {}),
      ...(rule.requiresRemoteDriver ? { requiresRemoteDriver: true } : {}),
      modules,
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
