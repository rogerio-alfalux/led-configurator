import type { CartItemData } from "@/lib/cartTypes";

export type ApiComponentKind = "MODULO_LED" | "OTICA" | "HOLDER" | "DISSIPADOR" | "COMPONENTE";

export interface ApiComponentOption {
  codigo: string;
  descricao: string;
  tipo: string;
  disponivel: boolean;
}

export interface ApiComponentSlot {
  partIndex: number;
  code: string;
  description: string;
  kind: ApiComponentKind;
  label: string;
  qty: number;
  tipo: string;
}

const OFFICIAL_COMPONENT_CODE = /\b((?:EQ|CP|PT)\d+)\b/i;
const QUANTITY_PREFIX = /^(\d+(?:[.,]\d+)?)\s*[xX]\s+(.+)$/;

const KIND_LABELS: Record<ApiComponentKind, string> = {
  MODULO_LED: "Módulo LED",
  OTICA: "Óptica",
  HOLDER: "Holder",
  DISSIPADOR: "Dissipador",
  COMPONENTE: "Componente técnico",
};

function getOfficialCode(value: string, fallback?: string | null): string {
  const found = value.match(OFFICIAL_COMPONENT_CODE)?.[1];
  if (found) return found.toUpperCase();
  return fallback && OFFICIAL_COMPONENT_CODE.test(fallback) ? fallback.toUpperCase() : "";
}

function getKind(description: string, option?: ApiComponentOption): ApiComponentKind {
  const type = option?.tipo ?? "";
  if (type === "MODULO_LED") return "MODULO_LED";
  if (type === "OTICA") return "OTICA";
  if (type === "HOLDER") return "HOLDER";
  if (type === "DISSIPADOR") return "DISSIPADOR";

  const normalized = description.toUpperCase();
  if (/M[ÓO]DULO|STRIPLINE|STRIPFLEX|FITA LED/.test(normalized)) return "MODULO_LED";
  if (/OTICA|ÓTICA|LENTE/.test(normalized)) return "OTICA";
  if (/HOLDER|SUPORTE/.test(normalized)) return "HOLDER";
  if (/DISSIPADOR/.test(normalized)) return "DISSIPADOR";
  return "COMPONENTE";
}

function withoutCodes(value: string): string {
  return value
    .replace(/\s*\((?:EQ|CP|PT|P)\d+\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove somente o rótulo genérico acrescentado antes da descrição oficial. */
function withoutGenericModuleLabel(value: string, kind: ApiComponentKind): string {
  if (kind !== "MODULO_LED") return value;
  return value.replace(/^M[ÓO]DULO\s+LED\s+/i, "").trim();
}

/**
 * Decompõe a composição concatenada retornada pela API em campos editáveis.
 * Só expõe partes com código oficial de material (EQ, CP ou PT), nunca um
 * identificador interno P isolado.
 */
export function getApiModuleComponentSlots(
  item: Pick<CartItemData, "moduloLed" | "moduloLedCode">,
  options: ApiComponentOption[],
): ApiComponentSlot[] {
  const rawParts = (item.moduloLed ?? "")
    .split(/\s+\+\s+/)
    .map(part => part.trim())
    .filter(Boolean);
  const optionByCode = new Map(options.map(option => [option.codigo.toUpperCase(), option]));
  const labelCounts = new Map<ApiComponentKind, number>();

  return rawParts.flatMap((rawPart, partIndex) => {
    const quantityMatch = rawPart.match(QUANTITY_PREFIX);
    const qty = quantityMatch ? Number(quantityMatch[1].replace(",", ".")) : 1;
    const partWithoutQuantity = quantityMatch ? quantityMatch[2] : rawPart;
    const code = getOfficialCode(partWithoutQuantity, partIndex === 0 ? item.moduloLedCode : null);
    if (!code) return [];

    const option = optionByCode.get(code);
    const kind = getKind(partWithoutQuantity, option);
    const count = (labelCounts.get(kind) ?? 0) + 1;
    labelCounts.set(kind, count);
    return [{
      partIndex,
      code,
      description: withoutGenericModuleLabel(option?.descricao ?? withoutCodes(partWithoutQuantity), kind),
      kind,
      label: `${KIND_LABELS[kind]}${count > 1 ? ` ${count}` : ""}`,
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      tipo: option?.tipo ?? kind,
    }];
  });
}

export function formatApiComponentSlot(slot: Pick<ApiComponentSlot, "description" | "code">): string {
  return `${slot.description} (${slot.code})`;
}

/** Atualiza somente uma parte da composição concatenada, preservando as demais. */
export function replaceApiModuleComponentSlot(
  moduloLed: string | undefined,
  slot: Pick<ApiComponentSlot, "partIndex">,
  description: string,
  code: string,
  qty: number,
): string {
  const parts = (moduloLed ?? "").split(/\s+\+\s+/).map(part => part.trim()).filter(Boolean);
  if (slot.partIndex < 0 || slot.partIndex >= parts.length) return moduloLed ?? "";
  const normalizedQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
  const prefix = normalizedQty === 1 ? "" : `${normalizedQty}x `;
  parts[slot.partIndex] = description ? `${prefix}${description}${code ? ` (${code})` : ""}` : "";
  return parts.filter(Boolean).join(" + ");
}
